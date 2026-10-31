// ============================================================================
// console/lib/synchro.mjs – envoyer les résultats publiés VERS LE SITE PUBLIC
// ----------------------------------------------------------------------------
// Une fois la publication faite sur le disque de la console, il faut que le site
// public (hébergé chez OVH) reçoive les nouveaux fichiers. Le chemin choisi :
//
//   Console ──(un seul commit via l'API GitHub)──► dépôt GitHub ──(webhook)──► OVH
//                                                                  déploie le site
//
// Pourquoi passer par GitHub ? Le site est DÉJÀ relié à GitHub chez OVH ; rien de
// plus à installer sur l'hébergement, et chaque publication laisse une trace
// (commit horodaté, avec auteur) qu'on peut relire ou annuler.
//
// Sécurité : le jeton GitHub vient d'une variable d'environnement, n'est JAMAIS
// écrit dans un fichier ni dans le journal, et il est masqué dans les messages
// d'erreur. Utiliser un jeton « fine-grained » limité à CE dépôt, permission
// « Contents : lecture et écriture » uniquement (voir docs/DEPLOIEMENT-CONSOLE.md).
//
// Node uniquement (fetch intégré) : aucune dépendance de plus.
// ============================================================================
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const API = 'https://api.github.com'

/** Liste récursive des fichiers d'un dossier, en chemins relatifs avec des « / ». */
function listerFichiers(dossier) {
  const sortie = []
  const parcourir = (d) => {
    for (const nom of readdirSync(d)) {
      const complet = join(d, nom)
      if (statSync(complet).isDirectory()) parcourir(complet)
      else sortie.push(relative(dossier, complet).split(sep).join('/'))
    }
  }
  if (existsSync(dossier)) parcourir(dossier)
  return sortie.sort()
}

/** Réglages lus dans l'environnement ; renvoie null si la synchronisation n'est pas configurée. */
export function synchroDepuisEnvironnement(env = process.env) {
  if (!env.GITHUB_TOKEN_PUBLICATION || !env.GITHUB_REPO) return null
  return creerSynchroGithub({
    jeton: env.GITHUB_TOKEN_PUBLICATION,
    depot: env.GITHUB_REPO, // ex. « Kalmache/natidja »
    branche: env.GITHUB_BRANCHE ?? 'main',
    dossierDepot: env.GITHUB_DOSSIER_DONNEES ?? 'data', // dossier des données DANS le dépôt
  })
}

/**
 * @param opts.jeton        jeton d'accès GitHub (secret)
 * @param opts.depot        « proprietaire/nom »
 * @param opts.branche      branche surveillée par OVH (par défaut main)
 * @param opts.dossierDepot dossier des données dans le dépôt (par défaut « data »)
 * @param opts.fetch        remplaçable pour les tests
 */
export function creerSynchroGithub({ jeton, depot, branche = 'main', dossierDepot = 'data', fetch: fetchImpl = fetch, essais = 3 }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(depot)) throw new Error('GITHUB_REPO doit ressembler à « proprietaire/nom ».')

  /** Masque le jeton partout où il pourrait apparaître (messages d'erreur, journaux). */
  const masquer = (texte) => String(texte).split(jeton).join('[jeton masqué]')

  async function appel(methode, chemin, corps) {
    const r = await fetchImpl(`${API}/repos/${depot}${chemin}`, {
      method: methode,
      headers: {
        Authorization: `Bearer ${jeton}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ndeze-natidja-console',
        ...(corps ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corps ? JSON.stringify(corps) : undefined,
    })
    const texte = await r.text()
    let json = null
    try { json = JSON.parse(texte) } catch { /* réponse non JSON */ }
    if (!r.ok) {
      const e = new Error(`GitHub ${r.status} : ${(json?.message ?? texte).slice(0, 200)}`)
      e.statutHttp = r.status
      throw e
    }
    return json
  }

  /**
   * Envoie en UN SEUL commit : les fichiers de data/<session>/ (remplacés), les fichiers
   * qui n'existent plus (supprimés) et exams.json (mis à jour).
   * @returns {{commit: string, url: string, fichiers: number, supprimes: number}}
   */
  async function synchroniser({ sessionId, dossierDonnees, message }) {
    const dossierSession = join(dossierDonnees, sessionId)
    const nouveaux = listerFichiers(dossierSession).map((f) => ({ chemin: `${dossierDepot}/${sessionId}/${f}`, contenu: readFileSync(join(dossierSession, f), 'utf8') }))
    if (nouveaux.length === 0) throw new Error('Aucun fichier à envoyer pour cette session.')
    nouveaux.push({ chemin: `${dossierDepot}/exams.json`, contenu: readFileSync(join(dossierDonnees, 'exams.json'), 'utf8') })

    let derniereErreur
    for (let essai = 1; essai <= essais; essai++) {
      try {
        // 1. Où en est la branche ?
        const ref = await appel('GET', `/git/ref/heads/${encodeURIComponent(branche)}`)
        const parent = ref.object.sha
        const commitParent = await appel('GET', `/git/commits/${parent}`)
        // 2. Quels fichiers de cette session existent déjà (pour supprimer ceux qui disparaissent) ?
        const arbre = await appel('GET', `/git/trees/${commitParent.tree.sha}?recursive=1`)
        if (arbre.truncated) throw new Error('Le dépôt est trop volumineux pour être analysé par l’API.')
        const prefixe = `${dossierDepot}/${sessionId}/`
        const aGarder = new Set(nouveaux.map((n) => n.chemin))
        const supprimes = arbre.tree.filter((e) => e.type === 'blob' && e.path.startsWith(prefixe) && !aGarder.has(e.path)).map((e) => e.path)
        // 3. Un seul arbre, des fichiers texte envoyés directement, sans blobs séparés.
        const entrees = [
          ...nouveaux.map((n) => ({ path: n.chemin, mode: '100644', type: 'blob', content: n.contenu })),
          ...supprimes.map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null })),
        ]
        const nouvelArbre = await appel('POST', '/git/trees', { base_tree: commitParent.tree.sha, tree: entrees })
        // 4. Le commit, puis on avance la branche (sans forcer : si quelqu'un d'autre a poussé entre-temps, on recommence).
        const commit = await appel('POST', '/git/commits', { message, tree: nouvelArbre.sha, parents: [parent] })
        await appel('PATCH', `/git/refs/heads/${encodeURIComponent(branche)}`, { sha: commit.sha, force: false })
        return { commit: commit.sha, url: `https://github.com/${depot}/commit/${commit.sha}`, fichiers: nouveaux.length, supprimes: supprimes.length }
      } catch (e) {
        derniereErreur = e
        // 409 / 422 = la branche a bougé : on relit et on recommence. Autre erreur : inutile d'insister.
        if (![409, 422].includes(e.statutHttp)) break
      }
    }
    throw new Error(masquer(derniereErreur?.message ?? 'Échec de la mise en ligne.'))
  }

  return { mode: 'github', depot, branche, synchroniser }
}

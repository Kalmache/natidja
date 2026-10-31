// ============================================================================
// Tests de la mise en ligne vers GitHub (console/lib/synchro.mjs).
// On remplace GitHub par un FAUX GitHub en mémoire qui obéit aux mêmes règles que
// l'API réelle (arbre, commit, avance de branche sans forcer). Aucun accès réseau.
// ============================================================================
import { beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { creerSynchroGithub } from '../console/lib/synchro.mjs'

const JETON = 'github_pat_SECRET_A_NE_JAMAIS_AFFICHER'

/** Faux GitHub : un dépôt = { chemin → contenu }, une branche = un numéro de commit. */
function fauxGithub(depart) {
  const etat = { commits: [{ sha: 'c0', tree: 't0', fichiers: { ...depart } }], arbres: { t0: { ...depart } }, appels: [], echecsPatch: 0, erreurApi: null, compteur: 0 }
  const rep = (statut, corps) => ({ ok: statut < 400, status: statut, text: async () => JSON.stringify(corps) })
  const fetchFaux = async (url, options = {}) => {
    const u = new URL(url)
    const chemin = u.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, '')
    const methode = options.method ?? 'GET'
    const corps = options.body ? JSON.parse(options.body) : null
    etat.appels.push({ methode, chemin, auth: options.headers?.Authorization, corps })
    if (etat.erreurApi) return rep(etat.erreurApi.statut, { message: etat.erreurApi.message })
    const dernier = etat.commits.at(-1)
    if (methode === 'GET' && chemin.startsWith('/git/ref/heads/')) return rep(200, { object: { sha: dernier.sha } })
    if (methode === 'GET' && chemin.startsWith('/git/commits/')) return rep(200, { tree: { sha: etat.commits.find((c) => c.sha === chemin.split('/').pop()).tree } })
    if (methode === 'GET' && chemin.startsWith('/git/trees/')) return rep(200, { truncated: false, tree: Object.keys(etat.arbres[chemin.split('/').pop()]).map((p) => ({ path: p, type: 'blob' })) })
    if (methode === 'POST' && chemin === '/git/trees') {
      const base = { ...etat.arbres[corps.base_tree] }
      for (const e of corps.tree) (e.sha === null ? delete base[e.path] : (base[e.path] = e.content))
      const sha = `t${++etat.compteur}`
      etat.arbres[sha] = base
      return rep(201, { sha })
    }
    if (methode === 'POST' && chemin === '/git/commits') {
      const sha = `c${++etat.compteur}`
      etat.commits.push({ sha, tree: corps.tree, parents: corps.parents, message: corps.message, fichiers: etat.arbres[corps.tree] })
      etat.enAttente = sha
      return rep(201, { sha })
    }
    if (methode === 'PATCH' && chemin.startsWith('/git/refs/heads/')) {
      if (etat.echecsPatch > 0) { etat.echecsPatch--; etat.commits.pop(); return rep(422, { message: 'Update is not a fast forward' }) }
      return rep(200, { object: { sha: corps.sha } })
    }
    return rep(404, { message: 'Not Found' })
  }
  return { etat, fetchFaux }
}

let dossierDonnees
beforeEach(() => {
  dossierDonnees = mkdtempSync(join(tmpdir(), 'synchro-'))
  mkdirSync(join(dossierDonnees, 'bac-2026', 'numeros'), { recursive: true })
  writeFileSync(join(dossierDonnees, 'bac-2026', 'initial.json'), '[{"id":"nouveau"}]')
  writeFileSync(join(dossierDonnees, 'bac-2026', 'stats.json'), '{"total":1}')
  writeFileSync(join(dossierDonnees, 'bac-2026', 'numeros', '000.json'), '[1]')
  writeFileSync(join(dossierDonnees, 'exams.json'), '{"updatedAt":"2"}')
})

const depotDeDepart = () => ({
  'index.html': '<html>',
  'data/exams.json': '{"updatedAt":"1"}',
  'data/bac-2026/initial.json': '[{"id":"ancien"}]',
  'data/bac-2026/numeros/000.json': '[0]',
  'data/bac-2026/numeros/099.json': '[99]', // n'existe plus dans la nouvelle version
  'data/bepc-2026/initial.json': '[{"id":"bepc"}]', // autre session : ne doit JAMAIS être touchée
})

describe('mise en ligne vers GitHub', () => {
  it('envoie la session et exams.json en UN commit, supprime les fichiers disparus, ne touche à rien d’autre', async () => {
    const { etat, fetchFaux } = fauxGithub(depotDeDepart())
    const s = creerSynchroGithub({ jeton: JETON, depot: 'Kalmache/natidja', fetch: fetchFaux })
    const r = await s.synchroniser({ sessionId: 'bac-2026', dossierDonnees, message: 'Résultats bac-2026 : publication X' })

    expect(r.fichiers).toBe(4) // 3 fichiers de la session + exams.json
    expect(r.supprimes).toBe(1) // numeros/099.json
    const apres = etat.commits.at(-1).fichiers
    expect(apres['data/bac-2026/initial.json']).toBe('[{"id":"nouveau"}]')
    expect(apres['data/bac-2026/stats.json']).toBe('{"total":1}')
    expect(apres['data/exams.json']).toBe('{"updatedAt":"2"}')
    expect(apres['data/bac-2026/numeros/099.json']).toBeUndefined() // supprimé
    expect(apres['data/bepc-2026/initial.json']).toBe('[{"id":"bepc"}]') // intact
    expect(apres['index.html']).toBe('<html>') // le reste du site est intact
    expect(etat.commits.at(-1).message).toBe('Résultats bac-2026 : publication X')
    expect(etat.commits).toHaveLength(2) // un seul nouveau commit
  })

  it('n’avance la branche QUE sans forcer, et authentifie chaque appel', async () => {
    const { etat, fetchFaux } = fauxGithub(depotDeDepart())
    await creerSynchroGithub({ jeton: JETON, depot: 'Kalmache/natidja', fetch: fetchFaux }).synchroniser({ sessionId: 'bac-2026', dossierDonnees, message: 'm' })
    const patch = etat.appels.find((a) => a.methode === 'PATCH')
    expect(patch.corps.force).toBe(false)
    expect(etat.appels.every((a) => a.auth === `Bearer ${JETON}`)).toBe(true)
  })

  it('si quelqu’un a poussé entre-temps (422), il relit la branche et recommence', async () => {
    const { etat, fetchFaux } = fauxGithub(depotDeDepart())
    etat.echecsPatch = 1
    const r = await creerSynchroGithub({ jeton: JETON, depot: 'Kalmache/natidja', fetch: fetchFaux }).synchroniser({ sessionId: 'bac-2026', dossierDonnees, message: 'm' })
    expect(r.commit).toBeTruthy()
    expect(etat.appels.filter((a) => a.methode === 'PATCH')).toHaveLength(2)
  })

  it('abandonne après plusieurs conflits de suite', async () => {
    const { etat, fetchFaux } = fauxGithub(depotDeDepart())
    etat.echecsPatch = 10
    await expect(creerSynchroGithub({ jeton: JETON, depot: 'Kalmache/natidja', fetch: fetchFaux, essais: 3 }).synchroniser({ sessionId: 'bac-2026', dossierDonnees, message: 'm' })).rejects.toThrow(/422/)
    expect(etat.appels.filter((a) => a.methode === 'PATCH')).toHaveLength(3)
  })

  it('un jeton refusé (401) n’est pas réessayé, et le jeton n’apparaît JAMAIS dans l’erreur', async () => {
    const { etat, fetchFaux } = fauxGithub(depotDeDepart())
    etat.erreurApi = { statut: 401, message: `Bad credentials for ${JETON}` } // même si l'API le répète
    let erreur
    try {
      await creerSynchroGithub({ jeton: JETON, depot: 'Kalmache/natidja', fetch: fetchFaux }).synchroniser({ sessionId: 'bac-2026', dossierDonnees, message: 'm' })
    } catch (e) { erreur = e }
    expect(erreur.message).toMatch(/401/)
    expect(erreur.message).not.toContain(JETON)
    expect(etat.appels).toHaveLength(1) // pas d'insistance
  })

  it('refuse d’envoyer une session vide et un nom de dépôt invalide', async () => {
    const { fetchFaux } = fauxGithub(depotDeDepart())
    const s = creerSynchroGithub({ jeton: JETON, depot: 'Kalmache/natidja', fetch: fetchFaux })
    await expect(s.synchroniser({ sessionId: 'inexistante', dossierDonnees, message: 'm' })).rejects.toThrow(/Aucun fichier/)
    expect(() => creerSynchroGithub({ jeton: JETON, depot: '../../etc', fetch: fetchFaux })).toThrow(/proprietaire/)
  })
})

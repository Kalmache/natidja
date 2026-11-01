// ============================================================================
// console/lib/publication.mjs – analyser un fichier déposé, puis publier
// ----------------------------------------------------------------------------
// Réutilise EXACTEMENT les mêmes briques que l'outil en ligne de commande
// (scripts/lib/resultats.mjs) : mêmes vérifications, mêmes fichiers produits.
// ============================================================================
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { construireFichiers, lireTableau, majConfig, resumer, transformer } from '../../scripts/lib/resultats.mjs'
import { ecrireSession } from '../../scripts/lib/ecriture.mjs'
import { calculerStats } from '../../scripts/lib/stats.mjs'

export const erreurHttp = (statut, message, extra = {}) => Object.assign(new Error(message), { statut, ...extra })

/** Lit et vérifie un fichier Excel/CSV déposé. Ne garde rien sur le disque après. */
export async function analyserFichier(octets, nomFichier, session, config) {
  const ext = (String(nomFichier).match(/\.(xlsx|csv)$/i)?.[1] ?? '').toLowerCase()
  if (!ext) throw erreurHttp(400, 'Format non pris en charge : utilisez un fichier .xlsx ou .csv.')
  // On contrôle le CONTENU réel, pas seulement l'extension annoncée.
  if (ext === 'xlsx' && !(octets[0] === 0x50 && octets[1] === 0x4b)) throw erreurHttp(400, 'Ce fichier n’est pas un véritable fichier Excel (.xlsx).')
  if (ext === 'csv' && octets.includes(0)) throw erreurHttp(400, 'Ce fichier n’est pas un fichier CSV (texte).')
  const dossier = mkdtempSync(join(tmpdir(), 'ndeze-import-'))
  try {
    const chemin = join(dossier, `import.${ext}`)
    writeFileSync(chemin, octets, { mode: 0o600 })
    return transformer(await lireTableau(chemin), session, config)
  } catch (e) {
    throw erreurHttp(400, `Fichier illisible : ${String(e.message).slice(0, 160)}`)
  } finally {
    rmSync(dossier, { recursive: true, force: true })
  }
}

/** Lit les candidats actuellement publiés (fichiers « numeros/*.json » de la session). Liste vide si aucun. */
export function lireCandidatsPublies(dossierDonnees, sessionId) {
  const dossier = join(dossierDonnees, sessionId, 'numeros')
  if (!existsSync(dossier)) return []
  return readdirSync(dossier).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(join(dossier, f), 'utf8')))
}

const LIGNES_MAX = 200 // on n'enregistre/affiche que les 200 premières lignes modifiées (le total reste exact)

/**
 * Compare, candidat par candidat (clé : n° de table), la version publiée et la proposition.
 * Résultat : les totaux (ajoutés / supprimés / modifiés) + le détail « champ : avant → après ».
 */
export function differences(avant, apres) {
  const ancien = new Map(avant.map((c) => [c.tableNumber, c]))
  const nouveau = new Map(apres.map((c) => [c.tableNumber, c]))
  const nom = (c) => `${c.lastName} ${c.firstName}`
  const lignes = []
  let ajoutes = 0, supprimes = 0, modifies = 0
  const garder = (l) => { if (lignes.length < LIGNES_MAX) lignes.push(l) }

  for (const [numero, n] of nouveau) {
    const a = ancien.get(numero)
    if (!a) { ajoutes++; garder({ tableNumber: numero, nom: nom(n), type: 'ajoute', champs: [] }); continue }
    const champs = []
    for (const champ of new Set([...Object.keys(a), ...Object.keys(n)])) {
      if (champ === 'id') continue
      if (champ === 'grades') {
        // Notes : on compare matière par matière pour dire laquelle a changé.
        const m = (g) => new Map((g ?? []).map((x) => [x.subject, x.score ?? x.grade ?? JSON.stringify(x)]))
        const ma = m(a.grades), mn = m(n.grades)
        for (const matiere of new Set([...ma.keys(), ...mn.keys()])) {
          if (JSON.stringify(ma.get(matiere)) !== JSON.stringify(mn.get(matiere))) champs.push({ champ: `note:${matiere}`, avant: ma.get(matiere) ?? null, apres: mn.get(matiere) ?? null })
        }
      } else if (JSON.stringify(a[champ]) !== JSON.stringify(n[champ])) {
        champs.push({ champ, avant: a[champ] ?? null, apres: n[champ] ?? null })
      }
    }
    if (champs.length) { modifies++; garder({ tableNumber: numero, nom: nom(n), type: 'modifie', champs }) }
  }
  for (const [numero, a] of ancien) {
    if (!nouveau.has(numero)) { supprimes++; garder({ tableNumber: numero, nom: nom(a), type: 'supprime', champs: [] }) }
  }
  return { ajoutes, supprimes, modifies, lignes, tronque: ajoutes + supprimes + modifies > lignes.length }
}

/** Compare la proposition à ce qui est actuellement publié. */
export function comparer(candidats, session, publies = []) {
  const r = resumer(candidats)
  const avant = session.stats ?? { total: 0, admitted: 0, oralSecondGroup: 0, successRate: '0%' }
  const variation = avant.total ? (r.total - avant.total) / avant.total : 0
  return {
    apres: { total: r.total, admis: r.admis, second: r.second, ajournes: r.ajournes, taux: r.taux, parIle: r.parIle },
    avant: { total: avant.total, admis: avant.admitted, second: avant.oralSecondGroup, ajournes: avant.total - avant.admitted - avant.oralSecondGroup, taux: avant.successRate },
    modifications: differences(publies, candidats),
    alertes: Math.abs(variation) > 0.2 ? [`Le nombre de candidats varie de ${Math.round(variation * 100)} % par rapport à la version publiée : à vérifier.`] : [],
  }
}

/** Écrit les nouveaux fichiers (avec sauvegarde de l'ancienne version) dans le dossier de données. */
export function publier(meta, candidats, config, { dossierDonnees, dossierSauvegardes }) {
  const session = config.sessions.find((s) => s.id === meta.session)
  const fichiers = construireFichiers(candidats, config.shardKeys)
  fichiers.set('stats.json', JSON.stringify(calculerStats(candidats, session)))
  return ecrireSession(meta.session, fichiers, majConfig(config, meta.session, candidats, new Date()), {
    dataDir: dossierDonnees,
    backupDir: dossierSauvegardes,
  })
}

// ============================================================================
// console/lib/publication.mjs – analyser un fichier déposé, puis publier
// ----------------------------------------------------------------------------
// Réutilise EXACTEMENT les mêmes briques que l'outil en ligne de commande
// (scripts/lib/resultats.mjs) : mêmes vérifications, mêmes fichiers produits.
// ============================================================================
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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

/** Compare la proposition à ce qui est actuellement publié. */
export function comparer(candidats, session) {
  const r = resumer(candidats)
  const avant = session.stats ?? { total: 0, admitted: 0, oralSecondGroup: 0, successRate: '0%' }
  const variation = avant.total ? (r.total - avant.total) / avant.total : 0
  return {
    apres: { total: r.total, admis: r.admis, second: r.second, ajournes: r.ajournes, taux: r.taux, parIle: r.parIle },
    avant: { total: avant.total, admis: avant.admitted, second: avant.oralSecondGroup, ajournes: avant.total - avant.admitted - avant.oralSecondGroup, taux: avant.successRate },
    alertes: Math.abs(variation) > 0.2 ? [`Le nombre de candidats varie de ${Math.round(variation * 100)} % par rapport à la version publiée : à vérifier.`] : [],
  }
}

/** Écrit les nouveaux fichiers (avec sauvegarde de l'ancienne version) dans le dossier de données. */
export function publier(meta, candidats, config, { dossierDonnees, dossierSauvegardes }) {
  const session = config.sessions.find((s) => s.id === meta.session)
  const fichiers = construireFichiers(candidats, config.shardKeys)
  fichiers.set('stats.json', JSON.stringify(calculerStats(candidats, session, config.shardKeys?.numberDigits ?? 3)))
  return ecrireSession(meta.session, fichiers, majConfig(config, meta.session, candidats, new Date()), {
    dataDir: dossierDonnees,
    backupDir: dossierSauvegardes,
  })
}

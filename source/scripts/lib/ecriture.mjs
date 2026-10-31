// ============================================================================
// scripts/lib/ecriture.mjs – écrit les nouveaux fichiers de résultats, EN SÉCURITÉ
// ----------------------------------------------------------------------------
// Principe : on n'abîme jamais l'existant.
//   1. on écrit tout dans un dossier temporaire ;
//   2. l'ancien dossier de la session est DÉPLACÉ dans source/backups/ (sauvegarde) ;
//   3. le dossier temporaire prend sa place.
// Si quelque chose échoue avant l'étape 2, rien n'a changé. Pour revenir en
// arrière : remettre le dossier sauvegardé à la place (voir le guide).
// ============================================================================
import { copyFileSync, mkdirSync, renameSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { DATA, SOURCE } from './cli.mjs'

/**
 * @param opts.dataDir   dossier des données (par défaut : data/ du dépôt)
 * @param opts.backupDir dossier des sauvegardes (par défaut : source/backups)
 */
export function ecrireSession(sessionId, fichiers, nouvelleConfig, opts = {}) {
  const dossierData = opts.dataDir ?? DATA
  const dossierSauvegardes = opts.backupDir ?? join(SOURCE, 'backups')
  // Horodatage au millième de seconde + suffixe aléatoire : deux publications très rapprochées
  // ne peuvent jamais écraser la sauvegarde de l'autre.
  const horodatage = `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23)}-${randomBytes(2).toString('hex')}`
  const tmp = join(dossierData, `.import-${sessionId}-${horodatage}`)
  const cible = join(dossierData, sessionId)
  const sauvegarde = join(dossierSauvegardes, `${sessionId}-${horodatage}`)

  // 1. écriture dans un dossier temporaire
  for (const [chemin, contenu] of fichiers) {
    const f = join(tmp, chemin)
    mkdirSync(dirname(f), { recursive: true })
    writeFileSync(f, contenu, 'utf8')
  }
  // 2. sauvegarde de l'ancien dossier
  if (existsSync(cible)) {
    mkdirSync(dirname(sauvegarde), { recursive: true })
    renameSync(cible, sauvegarde)
    // On garde aussi une copie de exams.json (ses chiffres) à côté de la sauvegarde.
    copyFileSync(join(dossierData, 'exams.json'), `${sauvegarde}.exams.json`)
  }
  // 3. mise en place
  try {
    renameSync(tmp, cible)
  } catch (e) {
    if (existsSync(sauvegarde)) renameSync(sauvegarde, cible) // on remet l'ancien
    rmSync(tmp, { recursive: true, force: true })
    throw e
  }
  writeFileSync(join(dossierData, 'exams.json'), JSON.stringify(nouvelleConfig), 'utf8')
  return { sauvegarde: existsSync(sauvegarde) ? sauvegarde : null }
}

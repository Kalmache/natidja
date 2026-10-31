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
import { dirname, join } from 'node:path'
import { DATA, SOURCE } from './cli.mjs'

export function ecrireSession(sessionId, fichiers, nouvelleConfig) {
  const horodatage = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const tmp = join(DATA, `.import-${sessionId}-${horodatage}`)
  const cible = join(DATA, sessionId)
  const sauvegarde = join(SOURCE, 'backups', `${sessionId}-${horodatage}`)

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
    copyFileSync(join(DATA, 'exams.json'), `${sauvegarde}.exams.json`)
  }
  // 3. mise en place
  try {
    renameSync(tmp, cible)
  } catch (e) {
    if (existsSync(sauvegarde)) renameSync(sauvegarde, cible) // on remet l'ancien
    rmSync(tmp, { recursive: true, force: true })
    throw e
  }
  writeFileSync(join(DATA, 'exams.json'), JSON.stringify(nouvelleConfig), 'utf8')
  return { sauvegarde: existsSync(sauvegarde) ? sauvegarde : null }
}

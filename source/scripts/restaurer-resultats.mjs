// ============================================================================
// scripts/restaurer-resultats.mjs – REVIENT À UNE VERSION PRÉCÉDENTE des résultats
//   npm run restaurer -- --session bac-2026                      (liste les sauvegardes)
//   npm run restaurer -- --session bac-2026 --depuis <nom>       (restaure celle-là)
// La version actuelle est elle-même sauvegardée avant d'être remplacée : on peut
// donc toujours « annuler l'annulation ».
// ============================================================================
import { cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { DATA, SOURCE, lireArguments, lireConfig, choisirSession } from './lib/cli.mjs'

const args = lireArguments()
const session = choisirSession(lireConfig(), args.session)
const dossierSauvegardes = join(SOURCE, 'backups')
const disponibles = existsSync(dossierSauvegardes)
  ? readdirSync(dossierSauvegardes).filter((n) => n.startsWith(session.id + '-') && !n.endsWith('.json') && statSync(join(dossierSauvegardes, n)).isDirectory()).sort().reverse()
  : []

if (!args.depuis) {
  console.log(`\nSauvegardes disponibles pour ${session.id} (la plus récente d'abord) :`)
  if (!disponibles.length) console.log('   (aucune)')
  disponibles.forEach((n) => console.log(`   ${n}`))
  console.log(`\nPour restaurer :  npm run restaurer -- --session ${session.id} --depuis <nom>\n`)
  process.exit(0)
}

const choisie = join(dossierSauvegardes, String(args.depuis))
if (!disponibles.includes(String(args.depuis))) {
  console.error(`\n✖ Sauvegarde introuvable : « ${args.depuis} ». Lancez la commande sans --depuis pour voir la liste.\n`)
  process.exit(1)
}

// 1. on met la version actuelle de côté
const horodatage = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const miseDeCote = join(dossierSauvegardes, `${session.id}-avant-restauration-${horodatage}`)
mkdirSync(dossierSauvegardes, { recursive: true })
renameSync(join(DATA, session.id), miseDeCote)
copyFileSync(join(DATA, 'exams.json'), `${miseDeCote}.exams.json`)
// 2. on remet la version choisie (copie : la sauvegarde reste disponible)
cpSync(choisie, join(DATA, session.id), { recursive: true })
if (existsSync(`${choisie}.exams.json`)) copyFileSync(`${choisie}.exams.json`, join(DATA, 'exams.json'))
else console.log('⚠ Pas de copie de exams.json pour cette sauvegarde : vérifiez les chiffres affichés sur le site.')
execSync('node scripts/build-stats.mjs', { cwd: SOURCE, stdio: 'inherit' })
console.log(`\n✔ Résultats restaurés depuis « ${args.depuis} ».`)
console.log(`   La version précédente est conservée dans : ${miseDeCote}`)
console.log('\nÉtape suivante : npm run publish-site, puis envoyer les changements.\n')

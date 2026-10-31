// ============================================================================
// scripts/import-resultats.mjs – IMPORTE un fichier Excel/CSV de résultats
// ----------------------------------------------------------------------------
//   npm run import -- mon-fichier.xlsx --session bac-2026 --dry-run   (vérifie seulement)
//   npm run import -- mon-fichier.xlsx --session bac-2026             (vérifie puis publie)
// Rien n'est écrit tant qu'il reste une erreur. Les avertissements sont
// affichés mais ne bloquent pas. L'ancienne version est sauvegardée.
// ============================================================================
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { lireArguments, lireConfig, choisirSession, SOURCE } from './lib/cli.mjs'
import { construireFichiers, lireTableau, majConfig, resumer, transformer } from './lib/resultats.mjs'
import { ecrireSession } from './lib/ecriture.mjs'

const args = lireArguments()
const fichier = args._[0]
if (!fichier || !existsSync(fichier)) {
  console.error('\n✖ Indiquez le fichier à importer :  npm run import -- chemin/fichier.xlsx --session bac-2026 [--dry-run]\n')
  process.exit(1)
}
const config = lireConfig()
const session = choisirSession(config, args.session)
const maxAffiche = Number(args['max-erreurs'] ?? 40)

console.log(`\n▶ Lecture de « ${fichier} » pour la session ${session.id}…`)
let tableau
try { tableau = await lireTableau(fichier) } catch (e) { console.error(`\n✖ ${e.message}\n`); process.exit(1) }

const { candidats, erreurs, avertissements } = transformer(tableau, session, config)
const montrer = (liste, icone, titre) => {
  if (!liste.length) return
  console.log(`\n${icone} ${liste.length} ${titre} :`)
  for (const m of liste.slice(0, maxAffiche))
    console.log(`   ${m.ligne ? `ligne ${String(m.ligne).padStart(5)}` : 'fichier   '}  ${m.champ ? `[${m.champ}] ` : ''}${m.message}`)
  if (liste.length > maxAffiche) console.log(`   … et ${liste.length - maxAffiche} autres (option --max-erreurs ${liste.length} pour tout voir)`)
}
montrer(avertissements, '⚠', 'avertissement(s)')
montrer(erreurs, '✖', 'erreur(s) bloquante(s)')

if (erreurs.length) {
  console.log(`\n✖ Import ANNULÉ : corrigez le fichier puis relancez. Rien n'a été modifié.\n`)
  process.exit(1)
}

const r = resumer(candidats)
console.log(`\n✔ ${r.total} candidats valides`)
console.log(`   Admis : ${r.admis} (${r.taux}) · Second groupe : ${r.second} · Ajournés : ${r.ajournes}`)
console.log(`   Par île : ${Object.entries(r.parIle).map(([id, n]) => `${id} ${n}`).join(' · ')}`)
const avant = session.stats?.total
if (avant != null && avant !== r.total) console.log(`   (avant : ${avant} candidats ; maintenant : ${r.total})`)

if (args['dry-run']) {
  console.log('\nℹ Mode vérification (--dry-run) : aucun fichier n\'a été modifié.\n')
  process.exit(0)
}

const fichiers = construireFichiers(candidats, config.shardKeys)
const { sauvegarde } = ecrireSession(session.id, fichiers, majConfig(config, session.id, candidats))
console.log(`\n✔ ${fichiers.size} fichiers écrits dans data/${session.id}/`)
if (sauvegarde) console.log(`   Ancienne version sauvegardée dans : ${sauvegarde}`)
execSync('node scripts/build-stats.mjs', { cwd: SOURCE, stdio: 'inherit' })
console.log('\nÉtape suivante : npm run publish-site  (reconstruit le site), puis envoyer les changements.\n')

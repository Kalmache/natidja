// ============================================================================
// console/journal-audit.mjs – vérifier ou archiver le journal d'audit (à la main, sur le serveur)
//   docker compose exec console node console/journal-audit.mjs verifier
//   docker compose exec console node console/journal-audit.mjs archiver
// « archiver » ne supprime RIEN : l'ancien journal est conservé à côté et le nouveau commence par
// une ligne qui renvoie vers lui. À utiliser quand la vérification signale une chaîne rompue
// et que la cause est connue (ex. : journal créé avant la correction du double écrivain).
// ============================================================================
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Audit } from './lib/audit.mjs'

const ICI = dirname(fileURLToPath(import.meta.url))
const dossier = process.env.CONSOLE_DATA ?? join(ICI, '..', 'console-data')
const audit = new Audit(join(dossier, 'audit.jsonl'))
const [commande] = process.argv.slice(2)

if (commande === 'verifier') {
  const r = audit.verifier()
  console.log(r.ok ? `\n✔ Journal intact : ${r.lignes} ligne(s), chaîne cohérente.\n` : `\n✖ ALTÉRATION DÉTECTÉE : ${r.erreur} (${r.lignes} ligne(s)).\n`)
  process.exit(r.ok ? 0 : 1)
} else if (commande === 'archiver') {
  const r = audit.archiver('chaîne rompue : reprise du journal')
  if (!r) console.log('\nAucun journal à archiver.\n')
  else console.log(`\n✔ Ancien journal conservé : ${r.archive}\n  (état au moment de l'archivage : ${r.verification.ok ? 'intact' : r.verification.erreur})\n  Un nouveau journal vient de démarrer.\n`)
} else {
  console.log('\nCommandes : verifier · archiver\n')
}

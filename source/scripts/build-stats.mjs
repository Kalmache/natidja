// ============================================================================
// scripts/build-stats.mjs
// ----------------------------------------------------------------------------
// But : calculer UNE FOIS les statistiques (taux de réussite par île, par série,
// par mention...) et les écrire dans data/<session>/stats.json.
//
// Pourquoi ne pas les calculer dans le navigateur ? Parce que cela obligerait
// chaque visiteur à télécharger les 3 500 candidats (plusieurs Mo). Ici, le
// visiteur ne télécharge qu'un petit fichier de quelques Ko.
//
// Lancement : npm run stats   (déjà inclus dans npm run build)
// ============================================================================
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { calculerStats } from './lib/stats.mjs'

// Les données vivent à la RACINE du dépôt (dossier data/), car c'est la racine
// que l'hébergeur OVH publie. Ce script est dans source/scripts/.
const DATA = fileURLToPath(new URL('../../data', import.meta.url))
const config = JSON.parse(readFileSync(join(DATA, 'exams.json'), 'utf8'))

for (const session of config.sessions) {
  const dossier = join(DATA, session.id, 'numeros')
  const candidats = readdirSync(dossier)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(dossier, f), 'utf8')))
  const stats = calculerStats(candidats, session)
  writeFileSync(join(DATA, session.id, 'stats.json'), JSON.stringify(stats))
  console.log(`✔ ${session.id} : ${stats.total} candidats → stats.json (${Object.keys(stats.parIle).length} îles)`)
}

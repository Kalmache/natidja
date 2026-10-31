// Petits outils partagés par les commandes (lecture des options, chemins, config).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

export const RACINE = fileURLToPath(new URL('../../..', import.meta.url)) // racine du dépôt
export const DATA = join(RACINE, 'data')
export const SOURCE = join(RACINE, 'source')

/** Lit les arguments : { _: [fichiers], session: '...', 'dry-run': true } */
export function lireArguments(argv = process.argv.slice(2)) {
  const sortie = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const cle = a.slice(2)
      const suite = argv[i + 1]
      if (suite !== undefined && !suite.startsWith('--')) { sortie[cle] = suite; i++ } else sortie[cle] = true
    } else sortie._.push(a)
  }
  return sortie
}

export const lireConfig = () => JSON.parse(readFileSync(join(DATA, 'exams.json'), 'utf8'))

/** Trouve la session demandée (--session bac-2026) ou explique comment la choisir. */
export function choisirSession(config, id) {
  const ids = config.sessions.map((s) => s.id)
  const session = config.sessions.find((s) => s.id === id)
  if (!session) {
    console.error(`\n✖ Indiquez la session avec  --session  parmi : ${ids.join(', ')}\n`)
    process.exit(1)
  }
  return session
}

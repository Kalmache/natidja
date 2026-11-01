// ============================================================================
// scripts/separer-donnees.mjs – prépare la PROTECTION RÉELLE des données sensibles
// ----------------------------------------------------------------------------
// Lit les résultats publiés (data/<session>/numeros et noms) et écrit, dans un dossier à part :
//   <sortie>/public/data/…        copie des données SANS moyenne, date/lieu de naissance, mention, notes
//   <sortie>/prive/<session>.json le coffre du service d'attestation (à garder HORS du site public)
// Les données d'origine ne sont jamais modifiées.
//
// Lancement :  npm run separer                (sortie : ./separe)
//              npm run separer -- --sortie /chemin/dossier
// ============================================================================
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { separerListe } from './lib/separation.mjs'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DATA = join(RACINE, 'data')
const i = process.argv.indexOf('--sortie')
const SORTIE = i > 0 ? process.argv[i + 1] : join(RACINE, 'separe')

const ecrire = (chemin, objet) => {
  mkdirSync(dirname(chemin), { recursive: true })
  writeFileSync(chemin, JSON.stringify(objet))
}

const exams = JSON.parse(readFileSync(join(DATA, 'exams.json'), 'utf8'))
ecrire(join(SORTIE, 'public', 'data', 'exams.json'), exams)

for (const session of exams.sessions) {
  const dossier = join(DATA, session.id)
  const coffre = {}
  let fiches = 0
  for (const sous of ['numeros', 'noms']) {
    const d = join(dossier, sous)
    if (!existsSync(d)) continue
    for (const f of readdirSync(d)) {
      const { publics, coffre: partie } = separerListe(JSON.parse(readFileSync(join(d, f), 'utf8')))
      ecrire(join(SORTIE, 'public', 'data', session.id, sous, f), publics)
      if (sous === 'numeros') {
        Object.assign(coffre, partie)
        fiches += publics.length
      }
    }
  }
  const stats = join(dossier, 'stats.json')
  if (existsSync(stats)) ecrire(join(SORTIE, 'public', 'data', session.id, 'stats.json'), JSON.parse(readFileSync(stats, 'utf8')))
  ecrire(join(SORTIE, 'prive', `${session.id}.json`), coffre)
  console.log(`✔ ${session.id} : ${fiches} fiches → public (sans détails sensibles) + coffre de ${Object.keys(coffre).length} fiches`)
}
console.log(`\nSortie : ${SORTIE}\n  • public/  → à publier sur le site\n  • prive/   → à placer UNIQUEMENT sur le serveur du service d'attestation`)

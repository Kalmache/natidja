// ============================================================================
// scripts/ajouter-dates-demo.mjs – donne une date de naissance FICTIVE aux
// candidats de démonstration (et seulement à eux)
// ----------------------------------------------------------------------------
//   npm run dates-demo
// Les vraies données arrivent par le fichier Excel (colonne « Date de naissance »).
// Ici on fabrique des dates plausibles et STABLES : la même personne reçoit toujours
// la même date (calculée à partir de son numéro de table), donc relancer le script
// ne change rien. Réécrit tous les petits fichiers d'une session de façon cohérente.
// ============================================================================
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DATA } from './lib/cli.mjs'
import { construireFichiers } from './lib/resultats.mjs'
import { calculerStats } from './lib/stats.mjs'
import { ecrireSession } from './lib/ecriture.mjs'

const config = JSON.parse(readFileSync(join(DATA, 'exams.json'), 'utf8'))

/** Nombre stable entre 0 et 1 tiré du numéro de table (SHA-256 : pas de hasard, donc reproductible). */
const alea = (texte, rang) => parseInt(createHash('sha256').update(`${texte}|${rang}`).digest('hex').slice(0, 8), 16) / 0xffffffff

/** Âge typique des candidats : bac ≈ 17 à 21 ans, BEPC ≈ 14 à 17 ans. */
const AGES = { BAC: [17, 21], BEPC: [14, 17] }

function dateFictive(candidat, session) {
  const [min, max] = AGES[session.examType] ?? [16, 20]
  const age = min + Math.floor(alea(candidat.tableNumber, 1) * (max - min + 1))
  const annee = Number(session.year) - age
  const mois = 1 + Math.floor(alea(candidat.tableNumber, 2) * 12)
  const joursDuMois = new Date(Date.UTC(annee, mois, 0)).getUTCDate()
  const jour = 1 + Math.floor(alea(candidat.tableNumber, 3) * joursDuMois)
  return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
}

for (const session of config.sessions) {
  const dossier = join(DATA, session.id, 'numeros')
  const candidats = readdirSync(dossier).flatMap((f) => JSON.parse(readFileSync(join(dossier, f), 'utf8')))
  // La date vient juste après le prénom (même ordre que l'import réel : les fichiers restent identiques).
  const avec = candidats.map(({ id, tableNumber, lastName, firstName, birthDate, ...reste }) => ({
    id, tableNumber, lastName, firstName, birthDate: birthDate ?? dateFictive({ tableNumber }, session), ...reste,
  }))
  const fichiers = construireFichiers(avec, config.shardKeys)
  fichiers.set('stats.json', JSON.stringify(calculerStats(avec, session, config.shardKeys?.numberDigits ?? 3)))
  ecrireSession(session.id, fichiers, config, { dataDir: DATA, backupDir: mkdtempSync(join(tmpdir(), 'natidja-sauv-')) })
  console.log(`✔ ${session.id} : ${avec.length} candidats, dates de naissance fictives ajoutées`)
}

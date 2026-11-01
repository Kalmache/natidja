// ============================================================================
// scripts/ajouter-sexe-demo.mjs – donne un SEXE aux candidats de démonstration (et seulement à eux)
// ----------------------------------------------------------------------------
//   npm run sexe-demo
// Les vraies données arrivent par le fichier Excel (colonne « Sexe », F ou M).
// Ici, on déduit le sexe du prénom fictif (liste ci-dessous) : sert uniquement à montrer
// « admise » / « admis » dans l'attestation de démonstration. Relancer ne change rien.
// ============================================================================
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DATA } from './lib/cli.mjs'
import { construireFichiers } from './lib/resultats.mjs'
import { calculerStats } from './lib/stats.mjs'
import { ecrireSession } from './lib/ecriture.mjs'

const FEMININS = ['Moinaecha', 'Zaïnaba', 'Raïchat', 'Faïza', 'Fatima', 'Nasra', 'Samira', 'Echati', 'Mariama', 'Nadjma', 'Farida', 'Raïssa', 'Hadidja']
const sexeDe = (prenom) => (FEMININS.includes(prenom) ? 'F' : 'M')

const config = JSON.parse(readFileSync(join(DATA, 'exams.json'), 'utf8'))
for (const session of config.sessions) {
  const dossier = join(DATA, session.id, 'numeros')
  const candidats = readdirSync(dossier).flatMap((f) => JSON.parse(readFileSync(join(dossier, f), 'utf8')))
  // Le sexe se place juste après le lieu de naissance (même ordre que l'import réel).
  const avec = candidats.map((c) => {
    const { gender, ...reste } = c
    const sortie = {}
    for (const [cle, valeur] of Object.entries(reste)) {
      sortie[cle] = valeur
      if (cle === 'birthPlace') sortie.gender = gender ?? sexeDe(c.firstName)
    }
    if (!('gender' in sortie)) sortie.gender = gender ?? sexeDe(c.firstName)
    return sortie
  })
  const fichiers = construireFichiers(avec, config.shardKeys)
  fichiers.set('stats.json', JSON.stringify(calculerStats(avec, session, config.shardKeys?.numberDigits ?? 3)))
  ecrireSession(session.id, fichiers, config, { dataDir: DATA, backupDir: mkdtempSync(join(tmpdir(), 'natidja-sauv-')) })
  console.log(`✔ ${session.id} : ${avec.length} candidats, sexe fictif ajouté`)
}

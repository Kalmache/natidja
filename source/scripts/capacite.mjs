// ============================================================================
// scripts/capacite.mjs – MODÈLE DE CAPACITÉ : combien de débit pour N visiteurs ?
// ----------------------------------------------------------------------------
//   npm run capacite -- --visiteurs 100000 --minutes 30 --pic 5 --deja-installes 0.3
// Il part des poids RÉELS des fichiers du site (compressés comme le fait Apache)
// et calcule, pour un nombre de visiteurs donné : volume total, requêtes par
// seconde en moyenne et au pic, débit nécessaire.
//   --visiteurs        nombre de personnes qui consultent pendant la fenêtre
//   --minutes          durée de la fenêtre (l'affluence est concentrée au début)
//   --pic              le moment le plus chargé = pic × la moyenne (hypothèse, 5 par défaut)
//   --deja-installes   part de visiteurs qui ont déjà l'application (cache) : 0.3 = 30 %
//   --recherches       nombre moyen de recherches par visite (2 par défaut)
// ⚠️ Les hypothèses (pic, part d'installés, recherches) sont À VOUS : ce sont des paris sur
// le comportement des élèves, pas des mesures. Les POIDS, eux, sont mesurés.
// ============================================================================
import { readFileSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
import { lireArguments, lireConfig, DATA, RACINE } from './lib/cli.mjs'

const gz = (f) => gzipSync(readFileSync(f), { level: 6 }).length
const args = lireArguments()
const config = lireConfig()
const sessionId = String(args.session ?? config.defaultSessionId)

// --- Poids mesurés
const racineFichiers = ['index.html', 'registerSW.js', 'manifest.webmanifest', 'sw.js', ...readdirSync(RACINE).filter((f) => /^workbox-.*\.js$/.test(f))]
const assets = readdirSync(join(RACINE, 'assets')).map((f) => `assets/${f}`)
const application = [...racineFichiers, ...assets].reduce((s, f) => s + gz(join(RACINE, f)), 0)
const accueil = gz(join(DATA, 'exams.json')) + gz(join(DATA, sessionId, 'initial.json'))
const tailles = ['numeros', 'noms'].flatMap((d) => readdirSync(join(DATA, sessionId, d)).map((f) => gz(join(DATA, sessionId, d, f))))
const recherche = tailles.reduce((s, n) => s + n, 0) / tailles.length

const visiteurs = Number(args.visiteurs)
const minutes = Number(args.minutes ?? 30)
const pic = Number(args.pic ?? 5)
const installes = Number(args['deja-installes'] ?? 0.3)
const nbRecherches = Number(args.recherches ?? 2)
const REQ_PREMIERE = racineFichiers.length + assets.length + 2 + nbRecherches // fichiers de l'appli + accueil + recherches
const REQ_SUIVANTE = 2 + nbRecherches
const ko = (n) => `${(n / 1024).toFixed(1)} Ko`

function scenario(n) {
  const nouveaux = n * (1 - installes)
  const octets = nouveaux * (application + accueil + nbRecherches * recherche) + (n - nouveaux) * (accueil + nbRecherches * recherche)
  const requetes = nouveaux * REQ_PREMIERE + (n - nouveaux) * REQ_SUIVANTE
  const secondes = minutes * 60
  const moyReq = requetes / secondes
  return { n, go: octets / 1e9, moyReq, picReq: moyReq * pic, picMbit: ((octets / secondes) * pic * 8) / 1e6 }
}

if (!visiteurs) {
  console.log(`\nPoids mesurés (compressés) pour la session ${sessionId} :`)
  console.log(`  Application (page, scripts, style, mode hors-ligne) : ${ko(application)}  — téléchargée UNE fois par appareil`)
  console.log(`  Accueil (configuration + 120 premiers candidats)    : ${ko(accueil)}`)
  console.log(`  Une recherche (fichier moyen sur ${tailles.length})                    : ${ko(recherche)}  (la plus lourde : ${ko(Math.max(...tailles))})`)
  console.log(`  → Première visite : ${ko(application + accueil + nbRecherches * recherche)} en ≈ ${REQ_PREMIERE} requêtes · visite suivante : ${ko(accueil + nbRecherches * recherche)} en ≈ ${REQ_SUIVANTE} requêtes\n`)
  console.log('Scénarios (fenêtre de 30 min, pic = 5 × la moyenne, 30 % d’appareils déjà équipés) :')
}
const liste = visiteurs ? [visiteurs] : [10000, 50000, 100000, 300000]
console.log('\n  Visiteurs   Volume total   Requêtes/s (moyenne)   Requêtes/s (pic)   Débit au pic')
for (const n of liste) {
  const s = scenario(n)
  console.log(`  ${String(s.n).padStart(9)}   ${(s.go.toFixed(1) + ' Go').padStart(12)}   ${s.moyReq.toFixed(0).padStart(20)}   ${s.picReq.toFixed(0).padStart(16)}   ${(s.picMbit.toFixed(0) + ' Mbit/s').padStart(11)}`)
}
console.log(`\n  Hypothèses : ${minutes} min · pic ×${pic} · ${Math.round(installes * 100)} % déjà installés · ${nbRecherches} recherches/visite. Les poids sont mesurés ; le reste est à ajuster.\n`)

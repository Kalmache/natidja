// ============================================================================
// scripts/test-charge.mjs – TEST DE CHARGE : simule des centaines de visiteurs
// ----------------------------------------------------------------------------
//   npm run charge -- --url http://127.0.0.1:8080 --utilisateurs 300 --duree 20
//
// Chaque « visiteur virtuel » fait ce que fait un vrai élève :
//   1. (si nouveau visiteur) charge la page, l'application, le style, la configuration ;
//   2. affiche les premiers candidats ;
//   3. fait 1 à 3 recherches (numéro ou nom) → télécharge le bon petit fichier,
//      calculé avec LA MÊME fonction que le site (src/lib/search.js) ;
//   4. patiente 1 à 4 s entre deux actions.
// À la fin : débit, délais (médiane, 95 %, 99 %), erreurs, volume transféré.
//
// ⚠️ SÉCURITÉ : par défaut, l'outil REFUSE de viser autre chose que cet ordinateur.
// Pour tester un vrai hébergement, il faut --confirmer-url-reelle ET avoir prévenu
// l'hébergeur (un test de charge peut ressembler à une attaque et faire suspendre
// un compte). Ne jamais viser un site qui n'est pas le vôtre.
// ============================================================================
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { lireArguments, lireConfig, DATA } from './lib/cli.mjs'
import { buildQuery } from '../src/lib/search.js'

const args = lireArguments()
const url = String(args.url ?? 'http://127.0.0.1:8080').replace(/\/$/, '')
const utilisateurs = Number(args.utilisateurs ?? 100)
const duree = Number(args.duree ?? 20) // secondes de test
const montee = Number(args.montee ?? Math.min(5, duree / 4)) // secondes pour « faire monter » les visiteurs
const partNouveaux = Number(args.nouveaux ?? 0.5) // part de visiteurs qui n'ont encore rien en cache
const sessionId = String(args.session ?? 'bac-2026')

// ---- Garde-fous
const hote = new URL(url).hostname
const local = ['127.0.0.1', 'localhost', '::1'].includes(hote)
if (!local && !args['confirmer-url-reelle']) {
  console.error(`\n✖ « ${hote} » n'est pas cet ordinateur. Pour tester un vrai site, ajoutez --confirmer-url-reelle\n  (après avoir PRÉVENU l'hébergeur et vérifié que le site est bien le vôtre).\n`)
  process.exit(1)
}
if (!local && utilisateurs > 300 && !args['lever-plafond']) {
  console.error('\n✖ Plafond de sécurité : 300 visiteurs maximum sur un site réel (--lever-plafond pour dépasser).\n')
  process.exit(1)
}

// ---- Données réelles pour fabriquer des recherches réalistes
const config = lireConfig()
const session = config.sessions.find((s) => s.id === sessionId)
if (!session) { console.error(`\n✖ Session inconnue : ${sessionId}\n`); process.exit(1) }
const dossier = join(DATA, sessionId, 'numeros')
const candidats = readdirSync(dossier).flatMap((f) => JSON.parse(readFileSync(join(dossier, f), 'utf8')))
const hasard = (n) => Math.floor(Math.random() * n)
const choisir = (tab) => tab[hasard(tab.length)]
function requeteAleatoire() {
  const c = choisir(candidats)
  // moitié par numéro de table, moitié par nom (comme les vrais usages)
  const saisie = Math.random() < 0.5 ? c.tableNumber.split('-').pop() : `${c.lastName} ${c.firstName}`.split(' ').slice(0, 1 + hasard(2)).join(' ')
  const plan = buildQuery(saisie, config.shardKeys, sessionId)
  return plan.etat === 'pret' ? plan.url.replace(/^\.\//, '/') : null
}

// ---- Mesures
const mesures = [] // { type, ms, octets, ok }
async function appeler(type, chemin) {
  const t0 = performance.now()
  try {
    const r = await fetch(url + chemin, { headers: { 'Accept-Encoding': 'gzip' } })
    const corps = await r.arrayBuffer()
    mesures.push({ type, ms: performance.now() - t0, octets: Number(r.headers.get('content-length') ?? corps.byteLength), ok: r.status < 400 || (r.status === 404 && type === 'recherche') })
    return r.status === 200 ? corps : null
  } catch {
    mesures.push({ type, ms: performance.now() - t0, octets: 0, ok: false })
    return null
  }
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

async function visiteur(arret) {
  const nouveau = Math.random() < partNouveaux
  if (nouveau) {
    const page = await appeler('page', '/')
    if (page) {
      const html = Buffer.from(page).toString()
      for (const [, src] of html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+|registerSW\.js)"/g)) await appeler('application', '/' + src)
    }
    await appeler('application', '/manifest.webmanifest')
  }
  await appeler('données', '/data/exams.json')
  await appeler('données', `/data/${sessionId}/initial.json`)
  await pause(1000 + hasard(3000))
  const recherches = 1 + hasard(3)
  for (let i = 0; i < recherches && performance.now() < arret; i++) {
    const chemin = requeteAleatoire()
    if (chemin) await appeler('recherche', chemin)
    await pause(1000 + hasard(3000))
  }
}

// ---- Exécution : les visiteurs arrivent progressivement, puis se renouvellent jusqu'à la fin
console.log(`\n▶ Test de charge sur ${url}\n   ${utilisateurs} visiteurs simultanés · ${duree} s · montée en charge ${montee.toFixed(1)} s · ${Math.round(partNouveaux * 100)} % de nouveaux visiteurs\n`)
const debut = performance.now()
const arret = debut + duree * 1000
let visites = 0
async function vague(rang) {
  await pause((rang / utilisateurs) * montee * 1000)
  while (performance.now() < arret) { await visiteur(arret); visites++ }
}
await Promise.all(Array.from({ length: utilisateurs }, (_, i) => vague(i)))
const dureeReelle = (performance.now() - debut) / 1000

// ---- Rapport
const pct = (tab, p) => (tab.length ? tab[Math.min(tab.length - 1, Math.floor((p / 100) * tab.length))] : 0)
const stats = (liste) => {
  const ms = liste.map((m) => m.ms).sort((a, b) => a - b)
  return { n: liste.length, erreurs: liste.filter((m) => !m.ok).length, p50: pct(ms, 50), p95: pct(ms, 95), p99: pct(ms, 99), max: ms.at(-1) ?? 0, octets: liste.reduce((s, m) => s + m.octets, 0) }
}
const global = stats(mesures)
const parType = Object.fromEntries(['page', 'application', 'données', 'recherche'].map((t) => [t, stats(mesures.filter((m) => m.type === t))]))
const f = (x) => `${Math.round(x)} ms`
console.log('RÉSULTATS')
console.log(`  Requêtes : ${global.n} en ${dureeReelle.toFixed(1)} s  →  ${(global.n / dureeReelle).toFixed(0)} requêtes/s en moyenne`)
console.log(`  Visites complètes : ${visites}   ·   Données transférées : ${(global.octets / 1e6).toFixed(1)} Mo (${(global.octets / 1e6 / dureeReelle * 8).toFixed(1)} Mbit/s)`)
console.log(`  Erreurs : ${global.erreurs} (${((global.erreurs / global.n) * 100).toFixed(2)} %)`)
console.log(`  Délai de réponse : médiane ${f(global.p50)} · 95 % ${f(global.p95)} · 99 % ${f(global.p99)} · maximum ${f(global.max)}`)
console.log('\n  Par type de requête :')
for (const [t, s] of Object.entries(parType)) if (s.n) console.log(`    ${t.padEnd(12)} ${String(s.n).padStart(6)} req · médiane ${f(s.p50).padStart(7)} · 95 % ${f(s.p95).padStart(7)} · erreurs ${s.erreurs}`)
const verdict = global.erreurs / global.n < 0.01 && global.p95 < 1000
console.log(`\n${verdict ? '✔' : '⚠'} ${verdict ? 'Moins de 1 % d’erreurs et 95 % des réponses en moins d’une seconde.' : 'Seuil non atteint (cible : moins de 1 % d’erreurs ET 95 % des réponses en moins d’1 s).'}`)
console.log('  Rappel : ce test mesure CE SERVEUR-LÀ, avec cette machine qui génère aussi la charge.\n')
if (args.json) writeFileSync(String(args.json), JSON.stringify({ url, utilisateurs, duree: dureeReelle, global, parType, visites }, null, 2))

// ============================================================================
// attestation/serveur.mjs – le SERVICE D'ATTESTATION (protection réelle des données sensibles)
// ----------------------------------------------------------------------------
// Logique :
//   • le site public ne contient plus la moyenne ni la date de naissance (voir `npm run separer`) ;
//   • ce petit service les garde en mémoire et ne les remet que si on lui présente le BON numéro
//     de table ET la BONNE date de naissance ;
//   • il limite les essais (voir limiteur.mjs) : deviner une date devient impraticable ;
//   • il répond TOUJOURS pareil à un échec (numéro inconnu = date fausse) et prend le même
//     temps, pour ne rien révéler (on ne peut pas savoir si un numéro existe) ;
//   • s'il tombe ou ralentit, les candidats voient quand même leur résultat (site public).
//
// Réglages (variables d'environnement) :
//   ATTESTATION_DONNEES   dossier des fichiers privés (défaut : ./donnees-privees)
//   ATTESTATION_PORT      port (défaut 8790)
//   ORIGINE_AUTORISEE     adresse du site public (ex. https://natidja.mmbt.fr) : seule autorisée par CORS
//   FAIRE_CONFIANCE_PROXY « 1 » derrière Caddy : l'adresse du visiteur vient de X-Forwarded-For
//
// Aucune dépendance : uniquement les modules fournis avec Node.
// ============================================================================
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { Coffre } from './lib/coffre.mjs'
import { Limiteur } from './lib/limiteur.mjs'

const TAILLE_MAX = 2048 // une demande légitime fait quelques dizaines d'octets
const DELAI_MIN_MS = 250 // toute réponse d'identité prend au moins ce temps (anti-chronométrage)

const attendre = (ms) => new Promise((r) => setTimeout(r, ms))

export function creerServeur({ coffre, limiteur = new Limiteur(), origine = '', proxy = false, delaiMinMs = DELAI_MIN_MS } = {}) {
  const entetes = (extra = {}) => ({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', // jamais de copie en cache : ce sont des données personnelles
    'X-Content-Type-Options': 'nosniff',
    ...(origine ? { 'Access-Control-Allow-Origin': origine, Vary: 'Origin' } : {}),
    ...extra,
  })
  const repondre = (res, code, corps, extra) => {
    res.writeHead(code, entetes(extra))
    res.end(JSON.stringify(corps))
  }
  const adresse = (req) => {
    if (proxy) {
      const xff = String(req.headers['x-forwarded-for'] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
      if (xff.length) return xff.at(-1) // le dernier saut est celui ajouté par NOTRE proxy
    }
    return req.socket.remoteAddress ?? 'inconnue'
  }
  const lireCorps = (req) =>
    new Promise((resolve, reject) => {
      let total = 0
      const morceaux = []
      req.on('data', (m) => {
        total += m.length
        if (total > TAILLE_MAX) {
          reject(new Error('trop gros'))
          req.destroy()
        } else morceaux.push(m)
      })
      req.on('end', () => resolve(Buffer.concat(morceaux).toString('utf8')))
      req.on('error', reject)
    })

  const serveur = createServer(async (req, res) => {
    const chemin = (req.url ?? '').split('?')[0]
    if (req.method === 'OPTIONS') {
      res.writeHead(204, entetes({ 'Access-Control-Allow-Methods': 'POST, GET', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' }))
      return res.end()
    }
    if (req.method === 'GET' && chemin === '/sante') return repondre(res, 200, { ok: true })
    if (req.method !== 'POST' || chemin !== '/attestation') return repondre(res, 404, { ok: false })

    const debut = Date.now()
    const fin = async (code, corps, extra) => {
      const reste = delaiMinMs - (Date.now() - debut)
      if (reste > 0) await attendre(reste)
      repondre(res, code, corps, extra)
    }

    let demande
    try {
      demande = JSON.parse(await lireCorps(req))
    } catch {
      return fin(400, { ok: false })
    }
    const { session, numero, naissance } = demande ?? {}
    if (![session, numero, naissance].every((v) => typeof v === 'string' && v.length > 0 && v.length <= 60)) return fin(400, { ok: false })

    const ip = adresse(req)
    const cle = `${session}|${coffre.cle(session, numero)}`
    const permis = limiteur.verifier(cle, ip)
    if (!permis.ok) return fin(429, { ok: false, limite: true, attenteS: permis.attenteS }, { 'Retry-After': String(permis.attenteS) })

    const details = coffre.verifier(session, numero, naissance)
    if (!details) {
      limiteur.echec(cle, ip)
      return fin(401, { ok: false }) // même réponse que le numéro existe ou non
    }
    return fin(200, { ok: true, details })
  })
  return serveur
}

// Lancement direct : node attestation/serveur.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dossier = process.env.ATTESTATION_DONNEES ?? './donnees-privees'
  const coffre = Coffre.depuisDossier(dossier)
  const limiteur = new Limiteur()
  setInterval(() => limiteur.nettoyer(), 60_000).unref()
  const port = Number(process.env.ATTESTATION_PORT ?? 8790)
  creerServeur({ coffre, limiteur, origine: process.env.ORIGINE_AUTORISEE ?? '', proxy: process.env.FAIRE_CONFIANCE_PROXY === '1' }).listen(port, () => {
    console.log(`Service d'attestation prêt sur le port ${port} · ${coffre.nombre} fiches en mémoire`)
  })
}

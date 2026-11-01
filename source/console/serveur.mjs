// ============================================================================
// console/serveur.mjs – la CONSOLE DE PUBLICATION (back-office sécurisé)
// ----------------------------------------------------------------------------
// Une application SÉPARÉE du site public : le site public reste un ensemble de
// fichiers sans aucune page de connexion (donc rien à attaquer). Cette console,
// elle, est réservée aux responsables des examens :
//   1. connexion = identifiant + mot de passe + code à 6 chiffres (double authentification) ;
//   2. un PRÉPARATEUR dépose le fichier Excel/CSV : il est vérifié, rien n'est publié ;
//   3. un AUTRE responsable (APPROBATEUR) relit le résumé puis approuve ;
//      → règle des deux personnes : on ne peut jamais approuver sa propre proposition ;
//   4. publication immédiate ou programmée, avec sauvegarde de l'ancienne version ;
//   5. chaque action est inscrite dans un journal d'audit à chaîne.
//
// ⚠️ À FAIRE TOURNER DERRIÈRE UN SERVEUR HTTPS (reverse proxy) : ce programme parle en
// HTTP simple. En production, les cookies sont marqués « Secure » et ne fonctionnent
// qu'en HTTPS. Avant tout usage réel : audit de sécurité indépendant (voir docs/CONSOLE.md).
// ============================================================================
import { createServer } from 'node:http'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import qrcode from 'qrcode-generator'
import { Audit } from './lib/audit.mjs'
import { Stockage } from './lib/stockage.mjs'
import {
  egalConstant, hacherMotDePasse, jetonAleatoire, nouveauSecretTotp, uriTotp,
  verifierForceMotDePasse, verifierLeurre, verifierMotDePasse, verifierTotp,
} from './lib/securite.mjs'
import { analyserFichier, comparer, erreurHttp, lireCandidatsPublies, publier } from './lib/publication.mjs'
import { synchroDepuisEnvironnement } from './lib/synchro.mjs'
import { creerSession } from '../scripts/lib/sessions.mjs'
import { ecrireConfig } from '../scripts/lib/ecriture.mjs'

const ICI = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(ICI, 'public')

// Réglages de sécurité (modifiables par les options, utiles aux tests)
const PAR_DEFAUT = {
  inactiviteMs: 15 * 60_000, // déconnexion après 15 min sans action
  dureeMaxMs: 8 * 3_600_000, // et en tout cas après 8 h
  echecsMax: 5, // 5 erreurs de suite → verrouillage
  verrouillageMs: 15 * 60_000,
  echecsIpMax: 30,
  tailleJsonMax: 64 * 1024,
  tailleFichierMax: 20 * 1024 * 1024,
  retentionJours: 30,
}

export function creerConsole(options = {}) {
  const opt = { ...PAR_DEFAUT, ...options }
  const horloge = opt.horloge ?? (() => Date.now())
  const dev = Boolean(opt.dev)
  const stockage = new Stockage(opt.dossierConsole)
  const audit = new Audit(join(opt.dossierConsole, 'audit.jsonl'), horloge)
  const dossierDonnees = opt.dossierDonnees
  const dossierSauvegardes = opt.dossierSauvegardes ?? join(opt.dossierConsole, 'sauvegardes')
  const sessions = new Map() // identifiant de session → informations
  const tentatives = new Map() // clé « u:nom » ou « i:ip » → { echecs, depuis, bloqueJusqua }
  let verrouPublication = Promise.resolve() // une seule publication à la fois

  const config = () => JSON.parse(readFileSync(join(dossierDonnees, 'exams.json'), 'utf8'))

  // ------------------------------------------------------------------ utilitaires
  const ipDe = (req) => (opt.faireConfianceProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '') || req.socket.remoteAddress || ''
  const journal = (action, { session, utilisateur, roles, details, ip } = {}) =>
    audit.ajouter({ utilisateur: utilisateur ?? session?.nom ?? null, roles: roles ?? session?.roles ?? [], action, details, ip: ip ?? session?.ip ?? '' })

  function bloque(cle) {
    const t = tentatives.get(cle)
    return Boolean(t && t.bloqueJusqua > horloge())
  }
  function compterEchec(cle, max) {
    const t = tentatives.get(cle) ?? { echecs: 0, depuis: horloge(), bloqueJusqua: 0 }
    if (horloge() - t.depuis > opt.verrouillageMs) Object.assign(t, { echecs: 0, depuis: horloge() })
    t.echecs++
    if (t.echecs >= max) Object.assign(t, { bloqueJusqua: horloge() + opt.verrouillageMs, echecs: 0 })
    tentatives.set(cle, t)
  }
  const oublierEchecs = (cle) => tentatives.delete(cle)

  function nettoyerSessions() {
    const maintenant = horloge()
    for (const [id, s] of sessions) {
      if (maintenant - s.derniereActivite > opt.inactiviteMs || maintenant - s.creeeA > opt.dureeMaxMs) sessions.delete(id)
    }
  }

  const entetesSecurite = () => ({
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    ...(dev ? {} : { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }),
  })

  function repondre(res, statut, corps, extra = {}) {
    const json = corps !== undefined && typeof corps === 'object' && !Buffer.isBuffer(corps)
    res.writeHead(statut, {
      ...entetesSecurite(),
      ...(json ? { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } : {}),
      ...extra,
    })
    res.end(json ? JSON.stringify(corps) : corps)
  }

  function lireCorps(req, max) {
    return new Promise((resolve, reject) => {
      const morceaux = []
      let taille = 0
      let depasse = false
      req.on('data', (c) => {
        if (depasse) return // on jette la suite, sans la garder en mémoire
        taille += c.length
        if (taille > max) {
          depasse = true
          morceaux.length = 0
          reject(erreurHttp(413, 'Fichier ou requête trop volumineux.'))
        } else morceaux.push(c)
      })
      req.on('end', () => resolve(Buffer.concat(morceaux)))
      req.on('error', reject)
    })
  }
  async function lireJson(req) {
    if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) throw erreurHttp(415, 'Contenu JSON attendu.')
    const brut = await lireCorps(req, opt.tailleJsonMax)
    try {
      const v = JSON.parse(brut.toString('utf8') || '{}')
      if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error()
      return v
    } catch {
      throw erreurHttp(400, 'JSON invalide.')
    }
  }
  const lireCookie = (req, nom) => {
    for (const part of String(req.headers.cookie ?? '').split(';')) {
      const [k, ...v] = part.trim().split('=')
      if (k === nom) return v.join('=')
    }
    return null
  }
  const NOM_COOKIE = 'ndeze_console'
  const cookie = (valeur, maxAge) =>
    `${NOM_COOKIE}=${valeur}; HttpOnly; SameSite=Strict; Path=/${dev ? '' : '; Secure'}${maxAge !== undefined ? `; Max-Age=${maxAge}` : ''}`

  function ouvrirSession(utilisateur, ip, etape) {
    const id = jetonAleatoire()
    const s = {
      id, userId: utilisateur.id, nom: utilisateur.nom, roles: utilisateur.roles, etape, ip,
      csrf: jetonAleatoire(), creeeA: horloge(), derniereActivite: horloge(), echecsTotp: 0,
    }
    sessions.set(id, s)
    return s
  }

  // ------------------------------------------------------------------- les routes
  const routes = []
  /** auth: 'aucune' (publique) | 'connecte' (mot de passe validé) | 'ok' (entièrement connecté) */
  const route = (methode, chemin, auth, roles, gestionnaire) => routes.push({ methode, chemin, auth, roles, gestionnaire })

  const interdit = (message = 'Action non autorisée pour votre rôle.') => erreurHttp(403, message)

  // ---- État de la session (utilisé par l'interface au chargement)
  route('GET', '/api/etat', 'aucune', null, ({ session }) => ({
    etape: session?.etape ?? 'aucune',
    ...(session ? { csrf: session.csrf, utilisateur: { nom: session.nom, roles: session.roles } } : {}),
  }))

  // ---- Étape 1 : identifiant + mot de passe
  route('POST', '/api/connexion', 'aucune', null, async ({ req, res, corps, ip }) => {
    const nom = String(corps.nom ?? '').trim().toLowerCase().slice(0, 40)
    const motDePasse = String(corps.motDePasse ?? '')
    if (!nom || !motDePasse || motDePasse.length > 200) throw erreurHttp(400, 'Identifiant et mot de passe requis.')
    if (bloque(`u:${nom}`) || bloque(`i:${ip}`)) {
      journal('connexion_bloquee', { utilisateur: nom, ip })
      throw erreurHttp(429, 'Trop de tentatives. Réessayez dans quelques minutes.')
    }
    const u = stockage.trouver(nom)
    // Même durée de calcul que le compte existe ou non : on ne révèle pas quels comptes existent.
    const ok = u?.actif ? await verifierMotDePasse(motDePasse, u.hash) : (await verifierLeurre(motDePasse), false)
    if (!ok) {
      compterEchec(`u:${nom}`, opt.echecsMax)
      compterEchec(`i:${ip}`, opt.echecsIpMax)
      journal('connexion_echec', { utilisateur: nom, ip })
      throw erreurHttp(401, 'Identifiant ou mot de passe incorrect.')
    }
    const ancien = sessions.get(lireCookie(req, NOM_COOKIE))
    if (ancien) sessions.delete(ancien.id) // jamais de réutilisation d'une ancienne session
    const s = ouvrirSession(u, ip, 'totp')
    journal('connexion_mdp_ok', { session: s })
    return { statut: 200, corps: { etape: 'totp', csrf: s.csrf }, extra: { 'Set-Cookie': cookie(s.id) } }
  })

  // ---- Étape 2 : code à 6 chiffres de l'application d'authentification
  route('POST', '/api/totp', 'connecte', null, async ({ res, corps, session, req }) => {
    if (session.etape !== 'totp') throw erreurHttp(409, 'Cette étape n’est pas attendue.')
    const u = stockage.trouverId(session.userId)
    if (bloque(`u:${session.nom}`)) throw erreurHttp(429, 'Trop de tentatives. Réessayez dans quelques minutes.')
    const compteur = u ? verifierTotp(u.totpSecret, corps.code, { tempsMs: horloge(), dernierCompteur: u.totpDernierCompteur ?? -1 }) : null
    if (compteur === null) {
      session.echecsTotp++
      compterEchec(`u:${session.nom}`, opt.echecsMax)
      journal('totp_echec', { session })
      if (session.echecsTotp >= opt.echecsMax) {
        sessions.delete(session.id)
        throw erreurHttp(401, 'Trop d’erreurs : reconnectez-vous.')
      }
      throw erreurHttp(401, 'Code incorrect ou expiré.')
    }
    u.totpDernierCompteur = compteur // ce code ne pourra plus servir
    u.dernierLogin = new Date(horloge()).toISOString()
    stockage.sauver(u)
    oublierEchecs(`u:${session.nom}`)
    // On change l'identifiant de session à chaque montée en privilège (protège contre la fixation de session).
    sessions.delete(session.id)
    const s = ouvrirSession(u, session.ip, u.doitChangerMdp ? 'mdp' : 'ok')
    journal('connexion_ok', { session: s })
    return { statut: 200, corps: { etape: s.etape, csrf: s.csrf, utilisateur: { nom: s.nom, roles: s.roles } }, extra: { 'Set-Cookie': cookie(s.id) } }
  })

  // ---- Changement de mot de passe (obligatoire à la première connexion)
  route('POST', '/api/mot-de-passe', 'connecte', null, async ({ corps, session }) => {
    if (!['mdp', 'ok'].includes(session.etape)) throw erreurHttp(409, 'Connexion incomplète.')
    const u = stockage.trouverId(session.userId)
    if (!(await verifierMotDePasse(String(corps.ancien ?? ''), u.hash))) {
      compterEchec(`u:${session.nom}`, opt.echecsMax)
      journal('mdp_change_echec', { session })
      throw erreurHttp(401, 'Mot de passe actuel incorrect.')
    }
    const probleme = verifierForceMotDePasse(String(corps.nouveau ?? ''), session.nom)
    if (probleme) throw erreurHttp(400, probleme)
    if (corps.nouveau === corps.ancien) throw erreurHttp(400, 'Choisissez un mot de passe différent de l’ancien.')
    u.hash = await hacherMotDePasse(corps.nouveau)
    u.doitChangerMdp = false
    stockage.sauver(u)
    for (const [id, s] of sessions) if (s.userId === u.id && id !== session.id) sessions.delete(id) // coupe les autres connexions
    session.etape = 'ok'
    journal('mdp_change', { session })
    return { etape: 'ok' }
  })

  // ---- Renouvellement du secret de la double authentification
  route('POST', '/api/totp/nouveau', 'ok', null, async ({ corps, session }) => {
    const u = stockage.trouverId(session.userId)
    if (!(await verifierMotDePasse(String(corps.motDePasse ?? ''), u.hash))) throw erreurHttp(401, 'Mot de passe incorrect.')
    session.nouveauSecret = nouveauSecretTotp()
    const uri = uriTotp(session.nom, session.nouveauSecret)
    const qr = qrcode(0, 'M')
    qr.addData(uri)
    qr.make()
    const n = qr.getModuleCount()
    const modules = Array.from({ length: n }, (_, l) => Array.from({ length: n }, (_, c) => (qr.isDark(l, c) ? '1' : '0')).join(''))
    return { secret: session.nouveauSecret, uri, modules }
  })
  route('POST', '/api/totp/confirmer', 'ok', null, ({ corps, session }) => {
    if (!session.nouveauSecret) throw erreurHttp(409, 'Aucun nouveau secret en attente.')
    const u = stockage.trouverId(session.userId)
    const compteur = verifierTotp(session.nouveauSecret, corps.code, { tempsMs: horloge() })
    if (compteur === null) throw erreurHttp(401, 'Code incorrect : le secret n’a pas été changé.')
    u.totpSecret = session.nouveauSecret
    u.totpDernierCompteur = compteur
    stockage.sauver(u)
    delete session.nouveauSecret
    journal('totp_renouvele', { session })
    return { ok: true }
  })

  route('POST', '/api/deconnexion', 'connecte', null, ({ session }) => {
    journal('deconnexion', { session })
    sessions.delete(session.id)
    return { statut: 200, corps: { ok: true }, extra: { 'Set-Cookie': cookie('', 0) } }
  })

  // ---- Sessions d'examen et situation actuelle
  route('GET', '/api/examens', 'ok', null, () =>
    config().sessions.map((s) => ({ id: s.id, titre: s.title, annee: s.year, genre: s.sessionKind ?? 'PRINCIPALE', libelle: s.sessionDate, statut: s.status ?? 'PUBLISHED', series: s.series, stats: s.stats, maj: config().updatedAt })),
  )

  // Créer la session d'une nouvelle année (ex. Bac 2027). Aucune publication : la session est un BROUILLON,
  // invisible du public jusqu'à la première publication de résultats.
  route('POST', '/api/sessions', 'ok', ['preparateur', 'approbateur', 'admin'], async ({ corps, session }) => {
    const tache = verrouPublication.then(() => {
      const { config: nouvelle, session: creee } = creerSession(config(), corps)
      ecrireConfig(dossierDonnees, nouvelle)
      journal('session_creee', { session, details: { id: creee.id, series: creee.series } })
      return creee
    })
    verrouPublication = tache.catch(() => {})
    const creee = await tache
    return { statut: 201, corps: { id: creee.id, titre: creee.title, annee: creee.year, genre: creee.sessionKind, libelle: creee.sessionDate, statut: creee.status, series: creee.series } }
  })

  // ---- Propositions
  const vue = (m) => ({ id: m.id, session: m.session, statut: m.statut, auteur: m.auteur, creeLe: m.creeLe, resume: m.resume, approbation: m.approbation, refus: m.refus, annulation: m.annulation, publieLe: m.publieLe, erreurPublication: m.erreurPublication, miseEnLigne: m.miseEnLigne })

  route('POST', '/api/propositions', 'ok', ['preparateur'], async ({ req, session, url }) => {
    const cfg = config()
    const sessionExamen = cfg.sessions.find((s) => s.id === url.searchParams.get('session'))
    if (!sessionExamen) throw erreurHttp(400, 'Session d’examen inconnue.')
    if (!/^application\/octet-stream\b/i.test(req.headers['content-type'] ?? '')) throw erreurHttp(415, 'Envoyez le fichier tel quel (application/octet-stream).')
    let nomBrut = String(req.headers['x-filename'] ?? '')
    try { nomBrut = decodeURIComponent(nomBrut) } catch { /* nom mal encodé : on le garde tel quel */ }
    const nomFichier = nomBrut.replace(/[^\w.\- ()éèàùçÉ]/g, '_').slice(0, 120)
    const octets = await lireCorps(req, opt.tailleFichierMax)
    if (!octets.length) throw erreurHttp(400, 'Fichier vide.')
    const { candidats, erreurs, avertissements } = await analyserFichier(octets, nomFichier, sessionExamen, cfg)
    if (erreurs.length) {
      journal('proposition_rejetee', { session, details: { session: sessionExamen.id, erreurs: erreurs.length, fichier: nomFichier } })
      return { statut: 422, corps: { erreur: 'Le fichier contient des erreurs : corrigez-le puis déposez-le à nouveau. Rien n’a été enregistré.', total: erreurs.length, erreurs: erreurs.slice(0, 200), avertissements: avertissements.slice(0, 200) } }
    }
    const meta = {
      id: randomUUID(), session: sessionExamen.id, statut: 'proposee',
      auteur: { id: session.userId, nom: session.nom }, creeLe: new Date(horloge()).toISOString(),
      fichier: { nom: nomFichier, taille: octets.length, sha256: createHash('sha256').update(octets).digest('hex') },
      baseMajLe: cfg.updatedAt,
      resume: comparer(candidats, sessionExamen, lireCandidatsPublies(dossierDonnees, sessionExamen.id)), avertissements: avertissements.slice(0, 200),
    }
    stockage.creerProposition(meta, candidats)
    journal('proposition_creee', { session, details: { id: meta.id, session: meta.session, candidats: candidats.length, sha256: meta.fichier.sha256 } })
    return { statut: 201, corps: { id: meta.id, resume: meta.resume, avertissements: meta.avertissements } }
  })

  route('GET', '/api/propositions', 'ok', null, () => stockage.propositions().map(vue))

  route('GET', '/api/propositions/:id', 'ok', null, ({ params }) => {
    const m = stockage.proposition(params.id)
    if (!m) throw erreurHttp(404, 'Proposition introuvable.')
    const c = stockage.candidats(params.id)
    const echantillon = (c ?? []).sort((a, b) => (a.tableNumber < b.tableNumber ? -1 : 1)).slice(0, 10).map((x) => ({ tableNumber: x.tableNumber, nom: `${x.lastName} ${x.firstName}`, resultat: x.status, moyenne: x.average, ile: x.island }))
    return { ...vue(m), avertissements: m.avertissements, fichier: m.fichier, baseObsolete: config().updatedAt !== m.baseMajLe, echantillon, donneesPurgees: c === null }
  })

  /**
   * Envoie les fichiers publiés vers le site public (voir lib/synchro.mjs).
   * Ne lève JAMAIS d'erreur : la publication locale est faite quoi qu'il arrive ; un échec
   * est noté dans la proposition (avec un bouton « Réessayer ») et dans le journal d'audit.
   */
  async function mettreEnLigne(m, session) {
    const le = new Date(horloge()).toISOString()
    if (!opt.synchro) return { etat: 'non_configuree', le }
    try {
      const r = await opt.synchro.synchroniser({ sessionId: m.session, dossierDonnees, message: `Résultats ${m.session} : publication ${m.id}` })
      journal('mise_en_ligne_ok', { utilisateur: session?.nom ?? 'planificateur', roles: session?.roles, details: { id: m.id, commit: r.commit.slice(0, 7), fichiers: r.fichiers, supprimes: r.supprimes } })
      return { etat: 'ok', le, commit: r.commit.slice(0, 7), url: r.url, fichiers: r.fichiers }
    } catch (e) {
      const erreur = String(e.message).replace(/\/[^\s:'"]+/g, '[chemin]').slice(0, 300)
      journal('mise_en_ligne_echec', { utilisateur: session?.nom ?? 'planificateur', roles: session?.roles, details: { id: m.id, erreur } })
      return { etat: 'echec', le, erreur }
    }
  }

  /** Exécute la publication (une à la fois) et met à jour la proposition. */
  function lancerPublication(meta, session) {
    const tache = verrouPublication.then(async () => {
      const m = stockage.proposition(meta.id)
      const cfg = config()
      try {
        if (cfg.updatedAt !== m.baseMajLe && !m.approbation?.confirmerEcrasement)
          throw new Error('Une autre publication a eu lieu depuis le dépôt de ce fichier : déposez-le à nouveau.')
        const candidats = stockage.candidats(m.id)
        if (!candidats) throw new Error('Les données de cette proposition ont été purgées.')
        publier(m, candidats, cfg, { dossierDonnees, dossierSauvegardes })
        m.statut = 'publiee'
        m.publieLe = new Date(horloge()).toISOString()
        stockage.majProposition(m)
        journal('publication_ok', { utilisateur: session?.nom ?? 'planificateur', roles: session?.roles, ip: session?.ip, details: { id: m.id, session: m.session, candidats: candidats.length } })
        // Étape suivante : envoyer vers le site public. Son échec n'annule pas la publication locale.
        m.miseEnLigne = await mettreEnLigne(m, session)
        stockage.majProposition(m)
        return m
      } catch (e) {
        // On masque les chemins de disque éventuels dans le message (il est visible dans l'interface).
        const message = String(e.message).replace(/\/[^\s:'"]+/g, '[chemin]').slice(0, 300)
        m.statut = 'echec'
        m.erreurPublication = message
        stockage.majProposition(m)
        journal('publication_echec', { utilisateur: session?.nom ?? 'planificateur', roles: session?.roles, details: { id: m.id, erreur: message } })
        throw erreurHttp(409, message)
      }
    })
    verrouPublication = tache.catch(() => {})
    return tache
  }

  route('POST', '/api/propositions/:id/approuver', 'ok', ['approbateur'], async ({ corps, params, session }) => {
    const m = stockage.proposition(params.id)
    if (!m) throw erreurHttp(404, 'Proposition introuvable.')
    if (m.statut !== 'proposee') throw erreurHttp(409, `Cette proposition est déjà « ${m.statut} ».`)
    // RÈGLE DES DEUX PERSONNES : l'auteur ne peut jamais approuver sa propre proposition.
    if (m.auteur.id === session.userId) {
      journal('approbation_refusee_auteur', { session, details: { id: m.id } })
      throw interdit('Vous ne pouvez pas approuver votre propre proposition : un autre responsable doit le faire.')
    }
    const obsolete = config().updatedAt !== m.baseMajLe
    if (obsolete && corps.confirmerEcrasement !== true) throw erreurHttp(409, 'Une autre publication a eu lieu depuis le dépôt de ce fichier. Confirmez explicitement pour la remplacer.', { code: 'base_modifiee' })
    let publierA = null
    if (corps.publierA) {
      publierA = Date.parse(corps.publierA)
      if (!Number.isFinite(publierA)) throw erreurHttp(400, 'Date de publication invalide.')
    }
    m.approbation = { par: { id: session.userId, nom: session.nom }, le: new Date(horloge()).toISOString(), publierA: publierA ? new Date(publierA).toISOString() : null, confirmerEcrasement: corps.confirmerEcrasement === true }
    if (publierA && publierA > horloge()) {
      m.statut = 'planifiee'
      stockage.majProposition(m)
      journal('approbation', { session, details: { id: m.id, publierA: m.approbation.publierA } })
      return vue(m)
    }
    stockage.majProposition(m)
    journal('approbation', { session, details: { id: m.id, publierA: 'immediate' } })
    return vue(await lancerPublication(m, session))
  })

  // Réessayer l'envoi vers le site public (après un échec réseau, un jeton expiré...).
  route('POST', '/api/propositions/:id/mise-en-ligne', 'ok', ['approbateur', 'admin'], async ({ params, session }) => {
    const m = stockage.proposition(params.id)
    if (!m) throw erreurHttp(404, 'Proposition introuvable.')
    if (m.statut !== 'publiee') throw erreurHttp(409, 'Seule une proposition publiée peut être mise en ligne.')
    if (m.miseEnLigne?.etat === 'ok') throw erreurHttp(409, 'Cette publication est déjà en ligne.')
    // Une publication plus récente est passée entre-temps : renvoyer celle-ci écraserait la plus récente.
    const plusRecente = stockage.propositions().some((p) => p.session === m.session && p.statut === 'publiee' && p.publieLe > m.publieLe)
    if (plusRecente) throw erreurHttp(409, 'Une publication plus récente existe pour cette session : utilisez celle-là.')
    const tache = verrouPublication.then(async () => {
      m.miseEnLigne = await mettreEnLigne(m, session)
      stockage.majProposition(m)
      return m
    })
    verrouPublication = tache.catch(() => {})
    return vue(await tache)
  })

  route('POST', '/api/propositions/:id/refuser', 'ok', ['approbateur'], ({ corps, params, session }) => {
    const m = stockage.proposition(params.id)
    if (!m) throw erreurHttp(404, 'Proposition introuvable.')
    if (!['proposee', 'planifiee'].includes(m.statut)) throw erreurHttp(409, `Cette proposition est déjà « ${m.statut} ».`)
    const motif = String(corps.motif ?? '').trim()
    if (motif.length < 3 || motif.length > 500) throw erreurHttp(400, 'Indiquez un motif (3 à 500 caractères).')
    m.statut = 'refusee'
    m.refus = { par: { id: session.userId, nom: session.nom }, le: new Date(horloge()).toISOString(), motif }
    stockage.majProposition(m)
    journal('refus', { session, details: { id: m.id, motif } })
    return vue(m)
  })

  route('POST', '/api/propositions/:id/annuler', 'ok', null, ({ params, session }) => {
    const m = stockage.proposition(params.id)
    if (!m) throw erreurHttp(404, 'Proposition introuvable.')
    if (!['proposee', 'planifiee'].includes(m.statut)) throw erreurHttp(409, `Cette proposition est déjà « ${m.statut} ».`)
    if (m.auteur.id !== session.userId && !session.roles.includes('admin')) throw interdit('Seul l’auteur (ou un administrateur) peut annuler.')
    m.statut = 'annulee'
    m.annulation = { par: { id: session.userId, nom: session.nom }, le: new Date(horloge()).toISOString() }
    stockage.majProposition(m)
    journal('annulation', { session, details: { id: m.id } })
    return vue(m)
  })

  route('GET', '/api/audit', 'ok', ['admin'], () => {
    const lignes = audit.lire()
    return { verification: audit.verifier(), entrees: lignes.slice(-300).reverse() }
  })

  // ----------------------------------------------------- publication programmée
  async function executerPlanification() {
    const maintenant = horloge()
    for (const m of stockage.propositions()) {
      if (m.statut === 'planifiee' && Date.parse(m.approbation?.publierA) <= maintenant) {
        try {
          await lancerPublication(m, null)
        } catch {
          /* l'échec est déjà inscrit dans la proposition et dans le journal */
        }
      }
    }
  }
  const minuteur = opt.sansPlanificateur ? null : setInterval(() => executerPlanification(), 15_000)
  minuteur?.unref()
  const purges = stockage.purger(opt.retentionJours, horloge())
  if (purges) journal('purge_donnees', { utilisateur: 'systeme', details: { propositions: purges } })

  // ------------------------------------------------------------- service HTTP
  const FICHIERS = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] }

  const serveur = createServer(async (req, res) => {
    try {
      nettoyerSessions()
      const url = new URL(req.url, 'http://x')
      if (req.method === 'GET' && FICHIERS[url.pathname]) {
        const [f, type] = FICHIERS[url.pathname]
        return repondre(res, 200, readFileSync(join(PUBLIC, f)), { 'Content-Type': type, 'Cache-Control': 'no-store' })
      }
      if (!url.pathname.startsWith('/api/')) return repondre(res, 404, 'Introuvable', { 'Content-Type': 'text/plain; charset=utf-8' })

      // Recherche de la route
      let trouvee = null
      let params = {}
      for (const r of routes) {
        if (r.methode !== req.method) continue
        const re = new RegExp(`^${r.chemin.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`)
        const m = re.exec(url.pathname)
        if (m) { trouvee = r; params = m.groups ?? {}; break }
      }
      if (!trouvee) return repondre(res, 404, { erreur: 'Route inconnue.' })

      // Session
      const session = sessions.get(lireCookie(req, NOM_COOKIE)) ?? null
      if (session) session.derniereActivite = horloge()

      // Protection CSRF : une requête qui modifie quelque chose doit venir de NOTRE page.
      if (req.method !== 'GET') {
        const origine = req.headers.origin
        if (origine && new URL(origine).host !== req.headers.host) throw erreurHttp(403, 'Origine non autorisée.')
        if (session && !egalConstant(req.headers['x-csrf-token'] ?? '', session.csrf)) throw erreurHttp(403, 'Jeton de sécurité invalide : rechargez la page.')
      }

      // Authentification et rôles
      const ip = ipDe(req)
      if (trouvee.auth === 'connecte' && !session) throw erreurHttp(401, 'Connexion requise.')
      if (trouvee.auth === 'ok') {
        if (!session || session.etape === 'totp') throw erreurHttp(401, 'Connexion requise.')
        if (session.etape === 'mdp') throw erreurHttp(403, 'Vous devez d’abord changer votre mot de passe.')
      }
      if (trouvee.roles && !trouvee.roles.some((r) => session.roles.includes(r))) {
        journal('acces_refuse', { session, details: { route: `${req.method} ${url.pathname}`, rolesRequis: trouvee.roles } })
        throw interdit()
      }

      const corps = ['POST', 'PUT'].includes(req.method) && !/^\/api\/propositions$/.test(url.pathname) ? await lireJson(req) : {}
      let sortie = await trouvee.gestionnaire({ req, res, corps, session, params, url, ip })
      if (sortie && typeof sortie === 'object' && 'statut' in sortie && 'corps' in sortie) repondre(res, sortie.statut, sortie.corps, sortie.extra)
      else repondre(res, 200, sortie ?? { ok: true })
    } catch (e) {
      const statut = e.statut ?? 500
      if (statut === 500) console.error('Erreur interne :', e)
      repondre(res, statut, { erreur: statut === 500 ? 'Erreur interne.' : e.message, ...(e.code ? { code: e.code } : {}) }, statut === 413 ? { Connection: 'close' } : {}) // 413 : on coupe la connexion après la réponse
    }
  })

  return {
    serveur, stockage, audit, sessions, executerPlanification,
    arreter: () => { clearInterval(minuteur); return new Promise((ok) => serveur.close(ok)) },
  }
}

// -------------------------------------------------------------- lancement direct
if (import.meta.url === `file://${process.argv[1]}`) {
  const racine = join(ICI, '..', '..')
  const port = Number(process.env.CONSOLE_PORT ?? 8787)
  const dev = process.env.CONSOLE_DEV === '1'
  const synchro = synchroDepuisEnvironnement()
  const c = creerConsole({
    dossierConsole: process.env.CONSOLE_DATA ?? join(ICI, '..', 'console-data'),
    dossierDonnees: process.env.PUBLISH_DATA ?? join(racine, 'data'),
    // Mise en ligne vers le site public : active si GITHUB_TOKEN_PUBLICATION et GITHUB_REPO sont définis.
    synchro,
    dev,
    faireConfianceProxy: process.env.CONSOLE_TRUST_PROXY === '1',
  })
  c.serveur.listen(port, process.env.CONSOLE_HOST ?? '127.0.0.1', () => {
    console.log(`\n✔ Console de publication sur http://${process.env.CONSOLE_HOST ?? '127.0.0.1'}:${port}`)
    console.log(synchro ? `  Mise en ligne automatique : ${synchro.depot} (branche ${synchro.branche})` : '  Mise en ligne automatique : désactivée (voir docs/DEPLOIEMENT-CONSOLE.md)')
    console.log(dev ? '  ⚠ MODE DÉVELOPPEMENT : cookies non sécurisés (jamais en production)' : '  Mode production : les cookies exigent HTTPS (placez la console derrière un serveur HTTPS).')
    console.log('  Ctrl+C pour arrêter.\n')
  })
}

// ============================================================================
// Tests d'ATTAQUE et de bon fonctionnement de la console de publication.
// On démarre une vraie console sur un port libre, avec une fausse horloge, et on
// joue des scénarios comme le ferait un utilisateur honnête… ou un intrus.
// ============================================================================
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { creerConsole } from '../console/serveur.mjs'
import { creerUtilisateur } from '../console/utilisateurs.mjs'
import { hacherMotDePasse, totp } from '../console/lib/securite.mjs'
import { COLONNES, LIBELLES_MENTION, LIBELLES_STATUT, construireFichiers, majConfig } from '../scripts/lib/resultats.mjs'
import { calculerStats } from '../scripts/lib/stats.mjs'

const DONNEES_REELLES = new URL('../../data/', import.meta.url).pathname
const MOT_DE_PASSE = 'Phrase-Secrete-2026!'

// ----------------------------------------------------------------- fausse horloge
let maintenant = Date.UTC(2026, 9, 31, 12, 0, 0)
const avancer = (ms) => (maintenant += ms)

// ----------------------------------------------------------------- jeu de données
const configReelle = JSON.parse(readFileSync(DONNEES_REELLES + 'exams.json', 'utf8'))
const base = readdirSync(DONNEES_REELLES + 'bac-2026/numeros')
  .flatMap((f) => JSON.parse(readFileSync(DONNEES_REELLES + 'bac-2026/numeros/' + f, 'utf8')))
  .sort((a, b) => (a.tableNumber < b.tableNumber ? -1 : 1))
  .slice(0, 300)

function csvDepuis(candidats) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lignes = [COLONNES.map((c) => q(c.titre)).join(';')]
  for (const c of candidats) {
    lignes.push([c.tableNumber, c.lastName, c.firstName, c.birthDate?.split('-').reverse().join('/'), c.birthPlace, c.gender, c.series, c.center, c.school, c.island, LIBELLES_STATUT[c.status], c.mention ? LIBELLES_MENTION[c.mention] : '', String(c.average).replace('.', ',')].map(q).join(';'))
  }
  return Buffer.from(lignes.join('\r\n') + '\r\n', 'utf8')
}
/** Une proposition valide : le même fichier, avec le 1er candidat passé « Ajourné ». */
const csvModifie = () => csvDepuis(base.map((c, i) => (i === 0 ? { ...c, status: 'AJOURNE', mention: undefined, average: 5.5 } : c)))

// --------------------------------------------------------------------- client HTTP
class Client {
  constructor(url) { this.url = url; this.cookie = ''; this.csrf = '' }
  async appel(methode, chemin, corps, entetes = {}) {
    const brut = Buffer.isBuffer(corps)
    const r = await fetch(this.url + chemin, {
      method: methode, redirect: 'manual',
      headers: { ...(corps !== undefined && !brut ? { 'Content-Type': 'application/json' } : {}), ...(this.csrf ? { 'X-CSRF-Token': this.csrf } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...entetes },
      body: corps === undefined ? undefined : brut ? corps : JSON.stringify(corps),
    })
    const sc = r.headers.get('set-cookie')
    if (sc) this.cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0]
    const texte = await r.text()
    let json = null
    try { json = JSON.parse(texte) } catch { /* pas du JSON */ }
    if (json?.csrf) this.csrf = json.csrf
    return { statut: r.status, json, texte, entetes: r.headers }
  }
  televerser(csv, nom = 'resultats.csv', session = 'bac-2026') {
    return this.appel('POST', `/api/propositions?session=${session}`, csv, { 'Content-Type': 'application/octet-stream', 'X-Filename': nom })
  }
}

// ------------------------------------------------- faux envoi vers le site public
// Les tests décident s'il réussit ou échoue ; on note ce qu'il reçoit.
const synchroFausse = {
  echec: false, appels: [],
  async synchroniser(args) {
    this.appels.push(args)
    if (this.echec) throw new Error('GitHub 503 : service indisponible')
    return { commit: 'abcdef1234567', url: 'https://github.com/x/y/commit/abcdef1', fichiers: 7, supprimes: 0 }
  },
}

// --------------------------------------------------------------------- mise en place
let c, url, dossierDonnees, dossierConsole
const secrets = {}

async function creerPret(nom, roles, { mdpDejaChange = true } = {}) {
  const r = await creerUtilisateur(c.stockage, { nom, roles })
  secrets[nom] = r.secret
  if (mdpDejaChange) {
    r.utilisateur.hash = await hacherMotDePasse(MOT_DE_PASSE)
    r.utilisateur.doitChangerMdp = false
    c.stockage.sauver(r.utilisateur)
  }
  return r
}
/** Connexion complète (mot de passe + code). Chaque connexion avance l'horloge : un code TOTP ne sert qu'une fois. */
async function connecter(nom, motDePasse = MOT_DE_PASSE) {
  const cl = new Client(url)
  avancer(31_000)
  const a = await cl.appel('POST', '/api/connexion', { nom, motDePasse })
  expect(a.statut).toBe(200)
  const b = await cl.appel('POST', '/api/totp', { code: totp(secrets[nom], maintenant) })
  expect(b.statut).toBe(200)
  return { cl, etape: b.json.etape }
}

beforeAll(async () => {
  dossierDonnees = mkdtempSync(join(tmpdir(), 'pub-'))
  dossierConsole = mkdtempSync(join(tmpdir(), 'console-'))
  // données publiées de départ : 300 candidats
  const session = configReelle.sessions.find((s) => s.id === 'bac-2026')
  const fichiers = construireFichiers(base, configReelle.shardKeys)
  fichiers.set('stats.json', JSON.stringify(calculerStats(base, session)))
  for (const [chemin, contenu] of fichiers) { mkdirSync(join(dossierDonnees, 'bac-2026', chemin, '..'), { recursive: true }); writeFileSync(join(dossierDonnees, 'bac-2026', chemin), contenu) }
  writeFileSync(join(dossierDonnees, 'exams.json'), JSON.stringify(majConfig(configReelle, 'bac-2026', base, new Date(maintenant))))
  c = creerConsole({ dossierConsole, dossierDonnees, dev: true, horloge: () => maintenant, sansPlanificateur: true, tailleFichierMax: 400_000, echecsMax: 5, synchro: synchroFausse })
  await new Promise((ok) => c.serveur.listen(0, '127.0.0.1', ok))
  url = `http://127.0.0.1:${c.serveur.address().port}`
  await creerPret('amina', ['preparateur'])
  await creerPret('moussa', ['approbateur'])
  await creerPret('chef', ['preparateur', 'approbateur'])
  await creerPret('zaid', ['admin'])
}, 60_000)
afterAll(() => c.arreter())

// ======================================================================= CONNEXION
describe('connexion', () => {
  it('refuse un mauvais mot de passe sans révéler si le compte existe', async () => {
    const a = await new Client(url).appel('POST', '/api/connexion', { nom: 'amina', motDePasse: 'mauvais-mot-de-passe-1!' })
    const b = await new Client(url).appel('POST', '/api/connexion', { nom: 'inconnu', motDePasse: 'mauvais-mot-de-passe-1!' })
    expect(a.statut).toBe(401)
    expect(b.statut).toBe(401)
    expect(a.json.erreur).toBe(b.json.erreur) // même message : impossible de deviner les comptes
    expect(a.entetes.get('set-cookie')).toBeNull() // aucune session créée
  })

  it('un mot de passe correct ne suffit PAS : le code à 6 chiffres est exigé', async () => {
    const cl = new Client(url)
    const r = await cl.appel('POST', '/api/connexion', { nom: 'amina', motDePasse: MOT_DE_PASSE })
    expect(r.json.etape).toBe('totp')
    expect((await cl.appel('GET', '/api/propositions')).statut).toBe(401)
    expect((await cl.appel('GET', '/api/examens')).statut).toBe(401)
  })

  it('refuse un mauvais code et accepte le bon', async () => {
    const cl = new Client(url)
    avancer(31_000)
    await cl.appel('POST', '/api/connexion', { nom: 'amina', motDePasse: MOT_DE_PASSE })
    expect((await cl.appel('POST', '/api/totp', { code: '000000' })).statut).toBe(401)
    expect((await cl.appel('POST', '/api/totp', { code: totp(secrets.amina, maintenant) })).json.etape).toBe('ok')
  })

  it('refuse de rejouer un code déjà utilisé', async () => {
    const { cl } = await connecter('moussa')
    await cl.appel('POST', '/api/deconnexion', {})
    const cl2 = new Client(url) // même créneau de 30 s, même code
    await cl2.appel('POST', '/api/connexion', { nom: 'moussa', motDePasse: MOT_DE_PASSE })
    expect((await cl2.appel('POST', '/api/totp', { code: totp(secrets.moussa, maintenant) })).statut).toBe(401)
  })

  it('verrouille le compte après 5 échecs, même avec le bon mot de passe ensuite', async () => {
    await creerPret('victime', ['preparateur'])
    for (let i = 0; i < 5; i++) await new Client(url).appel('POST', '/api/connexion', { nom: 'victime', motDePasse: 'essai-numero-' + i + 'Zz!' })
    const r = await new Client(url).appel('POST', '/api/connexion', { nom: 'victime', motDePasse: MOT_DE_PASSE })
    expect(r.statut).toBe(429)
    avancer(16 * 60_000) // le verrouillage expire
    expect((await new Client(url).appel('POST', '/api/connexion', { nom: 'victime', motDePasse: MOT_DE_PASSE })).statut).toBe(200)
  })

  it('un compte désactivé ne peut plus se connecter', async () => {
    await creerPret('parti', ['preparateur'])
    const u = c.stockage.trouver('parti'); u.actif = false; c.stockage.sauver(u)
    expect((await new Client(url).appel('POST', '/api/connexion', { nom: 'parti', motDePasse: MOT_DE_PASSE })).statut).toBe(401)
  })

  it('première connexion : changement de mot de passe obligatoire avant tout accès', async () => {
    const r = await creerPret('nouveau', ['preparateur'], { mdpDejaChange: false })
    const cl = new Client(url)
    avancer(31_000)
    await cl.appel('POST', '/api/connexion', { nom: 'nouveau', motDePasse: r.motDePasse })
    const t = await cl.appel('POST', '/api/totp', { code: totp(r.secret, maintenant) })
    expect(t.json.etape).toBe('mdp')
    expect((await cl.appel('GET', '/api/propositions')).statut).toBe(403)
    expect((await cl.appel('POST', '/api/mot-de-passe', { ancien: r.motDePasse, nouveau: 'faible' })).statut).toBe(400)
    expect((await cl.appel('POST', '/api/mot-de-passe', { ancien: 'pas-le-bon-mot-de-passe', nouveau: MOT_DE_PASSE })).statut).toBe(401)
    expect((await cl.appel('POST', '/api/mot-de-passe', { ancien: r.motDePasse, nouveau: MOT_DE_PASSE })).json.etape).toBe('ok')
    expect((await cl.appel('GET', '/api/propositions')).statut).toBe(200)
  })

  it('la session expire après 15 minutes d’inactivité', async () => {
    const { cl } = await connecter('amina')
    expect((await cl.appel('GET', '/api/etat')).json.etape).toBe('ok')
    avancer(16 * 60_000)
    expect((await cl.appel('GET', '/api/etat')).json.etape).toBe('aucune')
    expect((await cl.appel('GET', '/api/propositions')).statut).toBe(401)
  })
})

// ======================================================================= PROTECTIONS
describe('protections du serveur', () => {
  it('refuse toute modification sans jeton CSRF valide', async () => {
    const { cl } = await connecter('moussa')
    const jeton = cl.csrf
    cl.csrf = ''
    expect((await cl.appel('POST', '/api/deconnexion', {})).statut).toBe(403)
    cl.csrf = 'jeton-falsifie'
    expect((await cl.appel('POST', '/api/deconnexion', {})).statut).toBe(403)
    cl.csrf = jeton
    expect((await cl.appel('POST', '/api/deconnexion', {})).statut).toBe(200)
  })

  it('refuse une requête venant d’un autre site (en-tête Origin)', async () => {
    const { cl } = await connecter('amina')
    const r = await cl.appel('POST', '/api/mot-de-passe', { ancien: 'x', nouveau: 'y' }, { Origin: 'https://site-pirate.example' })
    expect(r.statut).toBe(403)
  })

  it('envoie des en-têtes de sécurité stricts et ne met rien en cache', async () => {
    const page = await new Client(url).appel('GET', '/')
    expect(page.statut).toBe(200)
    expect(page.entetes.get('content-security-policy')).toContain("script-src 'self'")
    expect(page.entetes.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(page.entetes.get('x-content-type-options')).toBe('nosniff')
    expect(page.entetes.get('x-frame-options')).toBe('DENY')
    const api = await new Client(url).appel('GET', '/api/etat')
    expect(api.entetes.get('cache-control')).toBe('no-store')
    expect(api.entetes.get('x-powered-by')).toBeNull()
  })

  it('le cookie de session est HttpOnly + SameSite=Strict (et Secure en production)', async () => {
    const r = await new Client(url).appel('POST', '/api/connexion', { nom: 'zaid', motDePasse: MOT_DE_PASSE })
    const cookie = r.entetes.get('set-cookie')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
  })

  it('en production, le cookie est marqué Secure et la sécurité de transport est imposée', async () => {
    const prod = creerConsole({ dossierConsole: mkdtempSync(join(tmpdir(), 'c2-')), dossierDonnees, dev: false, horloge: () => maintenant, sansPlanificateur: true })
    await creerUtilisateur(prod.stockage, { nom: 'prod', roles: ['admin'] })
    await new Promise((ok) => prod.serveur.listen(0, '127.0.0.1', ok))
    const u = `http://127.0.0.1:${prod.serveur.address().port}`
    const r = await new Client(u).appel('POST', '/api/connexion', { nom: 'prod', motDePasse: 'mauvais' })
    const page = await new Client(u).appel('GET', '/')
    expect(page.entetes.get('strict-transport-security')).toContain('max-age=')
    const u2 = prod.stockage.trouver('prod'); u2.hash = await hacherMotDePasse(MOT_DE_PASSE); prod.stockage.sauver(u2)
    const ok = await new Client(u).appel('POST', '/api/connexion', { nom: 'prod', motDePasse: MOT_DE_PASSE })
    expect(ok.entetes.get('set-cookie')).toContain('Secure')
    expect(r.statut).toBe(401)
    await prod.arreter()
  })

  it('refuse un identifiant de proposition piégé (../)', async () => {
    const { cl } = await connecter('moussa')
    expect((await cl.appel('GET', '/api/propositions/..%2F..%2Fetc%2Fpasswd')).statut).toBe(404)
    expect((await cl.appel('GET', '/api/propositions/not-an-id')).statut).toBe(404)
  })

  it('refuse un JSON mal formé ou un mauvais type de contenu', async () => {
    const r1 = await fetch(url + '/api/connexion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{pas du json' })
    expect(r1.status).toBe(400)
    const r2 = await fetch(url + '/api/connexion', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' })
    expect(r2.status).toBe(415)
  })
})

// ======================================================================= PROPOSITIONS
describe('dépôt et vérification des fichiers', () => {
  it('un fichier avec des erreurs est refusé, avec les numéros de ligne, et rien n’est enregistré', async () => {
    const { cl } = await connecter('amina')
    const avant = (await cl.appel('GET', '/api/propositions')).json.length
    const mauvais = Buffer.from(csvDepuis(base.slice(0, 5)).toString('utf8').replace('"Admis"', '"Peut-être"').replace('"Ngazidja"', '"Madagascar"'), 'utf8')
    const r = await cl.televerser(mauvais)
    expect(r.statut).toBe(422)
    expect(r.json.total).toBeGreaterThan(0)
    expect(r.json.erreurs[0]).toHaveProperty('ligne')
    expect((await cl.appel('GET', '/api/propositions')).json.length).toBe(avant)
  })

  it('refuse un faux fichier Excel, un format inconnu et un fichier trop gros', async () => {
    const { cl } = await connecter('amina')
    expect((await cl.televerser(Buffer.from('ceci est du texte'), 'faux.xlsx')).statut).toBe(400)
    expect((await cl.televerser(Buffer.from('a;b'), 'virus.exe')).statut).toBe(400)
    expect((await cl.televerser(Buffer.alloc(900_000, 65), 'enorme.csv')).statut).toBe(413)
  })

  it('refuse une session d’examen inconnue', async () => {
    const { cl } = await connecter('amina')
    expect((await cl.televerser(csvModifie(), 'r.csv', 'inconnue')).statut).toBe(400)
  })

  it('seul un PRÉPARATEUR peut déposer un fichier', async () => {
    const { cl } = await connecter('moussa')
    expect((await cl.televerser(csvModifie())).statut).toBe(403)
  })
})

// ======================================================================= PUBLICATION
describe('approbation et publication', () => {
  const nouvelleProposition = async (nom = 'amina') => {
    const { cl } = await connecter(nom)
    const r = await cl.televerser(csvModifie())
    expect(r.statut).toBe(201)
    return { cl, id: r.json.id, resume: r.json.resume }
  }

  it('le résumé compare la proposition à la version publiée', async () => {
    const { cl, id, resume } = await nouvelleProposition()
    expect(resume.apres.total).toBe(300)
    expect(resume.avant.total).toBe(300)
    const d = await cl.appel('GET', `/api/propositions/${id}`)
    expect(d.json.statut).toBe('proposee')
    expect(d.json.echantillon).toHaveLength(10)
    await cl.appel('POST', `/api/propositions/${id}/annuler`, {})
  })

  it('un PRÉPARATEUR ne peut pas approuver', async () => {
    const { cl, id } = await nouvelleProposition()
    expect((await cl.appel('POST', `/api/propositions/${id}/approuver`, {})).statut).toBe(403)
    await cl.appel('POST', `/api/propositions/${id}/annuler`, {})
  })

  it('RÈGLE DES DEUX PERSONNES : on ne peut jamais approuver sa propre proposition', async () => {
    const { cl, id } = await nouvelleProposition('chef') // « chef » a les deux rôles
    const r = await cl.appel('POST', `/api/propositions/${id}/approuver`, {})
    expect(r.statut).toBe(403)
    expect(r.json.erreur).toMatch(/votre propre proposition/)
    expect((await cl.appel('GET', `/api/propositions/${id}`)).json.statut).toBe('proposee') // rien n'a bougé
    await cl.appel('POST', `/api/propositions/${id}/annuler`, {})
  })

  it('un autre responsable approuve : les données publiées changent, avec sauvegarde', async () => {
    const { id } = await nouvelleProposition('amina')
    const { cl: appro } = await connecter('moussa')
    const avantMaj = JSON.parse(readFileSync(join(dossierDonnees, 'exams.json'), 'utf8')).updatedAt
    const r = await appro.appel('POST', `/api/propositions/${id}/approuver`, {})
    expect(r.statut).toBe(200)
    expect(r.json.statut).toBe('publiee')
    // le candidat modifié est maintenant « ajourné » dans les fichiers publiés
    const premier = base[0]
    const fichier = join(dossierDonnees, 'bac-2026', 'numeros', `${premier.tableNumber.split('-').pop().slice(0, 3)}.json`)
    const publie = JSON.parse(readFileSync(fichier, 'utf8')).find((x) => x.tableNumber === premier.tableNumber)
    expect(publie.status).toBe('AJOURNE')
    expect(publie.average).toBe(5.5)
    expect(existsSync(join(dossierDonnees, 'bac-2026', 'stats.json'))).toBe(true)
    expect(JSON.parse(readFileSync(join(dossierDonnees, 'exams.json'), 'utf8')).updatedAt).not.toBe(avantMaj)
    // l'ancienne version est sauvegardée
    const sauvegardes = readdirSync(join(dossierConsole, 'sauvegardes')).filter((n) => n.startsWith('bac-2026-') && !n.endsWith('.json'))
    expect(sauvegardes.length).toBeGreaterThan(0)
    // on ne peut pas approuver deux fois
    expect((await appro.appel('POST', `/api/propositions/${id}/approuver`, {})).statut).toBe(409)
  })

  it('une proposition obsolète (autre publication entre-temps) demande une confirmation explicite', async () => {
    const p1 = await nouvelleProposition('amina')
    const p2 = await nouvelleProposition('amina')
    const { cl: appro } = await connecter('moussa')
    expect((await appro.appel('POST', `/api/propositions/${p1.id}/approuver`, {})).statut).toBe(200)
    const r = await appro.appel('POST', `/api/propositions/${p2.id}/approuver`, {})
    expect(r.statut).toBe(409)
    expect(r.json.code).toBe('base_modifiee')
    expect((await appro.appel('POST', `/api/propositions/${p2.id}/approuver`, { confirmerEcrasement: true })).statut).toBe(200)
  })

  it('publication PROGRAMMÉE : rien ne bouge avant l’heure, puis la publication a lieu', async () => {
    const { id } = await nouvelleProposition('amina')
    const { cl: appro } = await connecter('moussa')
    const heure = new Date(maintenant + 10 * 60_000).toISOString()
    const r = await appro.appel('POST', `/api/propositions/${id}/approuver`, { publierA: heure, confirmerEcrasement: true })
    expect(r.json.statut).toBe('planifiee')
    await c.executerPlanification()
    expect(c.stockage.proposition(id).statut).toBe('planifiee') // trop tôt
    avancer(11 * 60_000)
    await c.executerPlanification()
    expect(c.stockage.proposition(id).statut).toBe('publiee')
  })

  it('refuser exige un motif ; une proposition refusée ne peut plus être approuvée', async () => {
    const { id } = await nouvelleProposition('amina')
    const { cl: appro } = await connecter('moussa')
    expect((await appro.appel('POST', `/api/propositions/${id}/refuser`, { motif: '' })).statut).toBe(400)
    expect((await appro.appel('POST', `/api/propositions/${id}/refuser`, { motif: 'Total de candidats incohérent' })).json.statut).toBe('refusee')
    expect((await appro.appel('POST', `/api/propositions/${id}/approuver`, {})).statut).toBe(409)
  })

  it('seul l’auteur (ou un admin) peut annuler', async () => {
    const { cl, id } = await nouvelleProposition('amina')
    const { cl: autre } = await connecter('moussa')
    expect((await autre.appel('POST', `/api/propositions/${id}/annuler`, {})).statut).toBe(403)
    expect((await cl.appel('POST', `/api/propositions/${id}/annuler`, {})).json.statut).toBe('annulee')
  })
})

// ======================================================================= MISE EN LIGNE
describe('mise en ligne vers le site public', () => {
  const publier = async (opts = {}) => {
    const { cl } = await connecter('amina')
    const r = await cl.televerser(csvModifie())
    const { cl: appro } = await connecter('moussa')
    const a = await appro.appel('POST', `/api/propositions/${r.json.id}/approuver`, { confirmerEcrasement: true, ...opts })
    return { appro, cl, id: r.json.id, rep: a }
  }

  it('après une publication réussie, les fichiers sont envoyés et l’état est « ok »', async () => {
    synchroFausse.echec = false
    synchroFausse.appels.length = 0
    const { rep } = await publier()
    expect(rep.json.statut).toBe('publiee')
    expect(rep.json.miseEnLigne.etat).toBe('ok')
    expect(rep.json.miseEnLigne.commit).toBe('abcdef1')
    expect(synchroFausse.appels).toHaveLength(1)
    expect(synchroFausse.appels[0].sessionId).toBe('bac-2026')
    expect(synchroFausse.appels[0].dossierDonnees).toBe(dossierDonnees)
  })

  it('si l’envoi échoue, la publication locale reste valide, l’échec est noté, et on peut réessayer', async () => {
    synchroFausse.echec = true
    const { appro, id, rep } = await publier()
    expect(rep.statut).toBe(200) // la publication elle-même n'est PAS annulée
    expect(rep.json.statut).toBe('publiee')
    expect(rep.json.miseEnLigne.etat).toBe('echec')
    expect(rep.json.miseEnLigne.erreur).toMatch(/503/)

    // un préparateur ne peut pas relancer
    const { cl: prep } = await connecter('amina')
    expect((await prep.appel('POST', `/api/propositions/${id}/mise-en-ligne`, {})).statut).toBe(403)

    // on réessaie alors que le service est rétabli
    synchroFausse.echec = false
    const nouvelle = await appro.appel('POST', `/api/propositions/${id}/mise-en-ligne`, {})
    expect(nouvelle.statut).toBe(200)
    expect(nouvelle.json.miseEnLigne.etat).toBe('ok')
    // une fois en ligne, on ne renvoie pas une seconde fois
    expect((await appro.appel('POST', `/api/propositions/${id}/mise-en-ligne`, {})).statut).toBe(409)
  })

  it('refuse de renvoyer une ancienne publication quand une plus récente existe (elle écraserait la récente)', async () => {
    synchroFausse.echec = true
    const premiere = await publier()
    synchroFausse.echec = false
    avancer(2000)
    await publier() // une publication plus récente, elle, réussit
    const r = await premiere.appro.appel('POST', `/api/propositions/${premiere.id}/mise-en-ligne`, {})
    expect(r.statut).toBe(409)
    expect(r.json.erreur).toMatch(/plus récente/)
  })

  it('on ne peut mettre en ligne qu’une proposition publiée', async () => {
    const { cl } = await connecter('amina')
    const r = await cl.televerser(csvModifie())
    const { cl: appro } = await connecter('moussa')
    expect((await appro.appel('POST', `/api/propositions/${r.json.id}/mise-en-ligne`, {})).statut).toBe(409)
    await cl.appel('POST', `/api/propositions/${r.json.id}/annuler`, {})
  })
})

// ======================================================================= SESSIONS
describe('sessions : créer celle d’une nouvelle année', () => {
  const lireConfig = () => JSON.parse(readFileSync(join(dossierDonnees, 'exams.json'), 'utf8'))

  it('un compte connecté crée une session en BROUILLON (rien n’est publié)', async () => {
    const { cl } = await connecter('amina')
    const avant = lireConfig()
    const r = await cl.appel('POST', '/api/sessions', { examType: 'BAC', year: 2027, libelle: 'Juin 2027' })
    expect(r.statut).toBe(201)
    expect(r.json).toMatchObject({ id: 'bac-2027', statut: 'DRAFT', libelle: 'Juin 2027' })
    const apres = lireConfig()
    expect(apres.sessions.find((s) => s.id === 'bac-2027').status).toBe('DRAFT')
    expect(apres.updatedAt).toBe(avant.updatedAt) // les propositions en cours restent valables
    expect(apres.defaultSessionId).toBe(avant.defaultSessionId)
    // elle est proposée au dépôt, marquée comme brouillon
    const liste = (await cl.appel('GET', '/api/examens')).json
    expect(liste.find((s) => s.id === 'bac-2027')).toMatchObject({ statut: 'DRAFT', genre: 'PRINCIPALE' })
  })

  it('refuse un doublon, une année invalide, et une personne non connectée', async () => {
    const { cl } = await connecter('moussa')
    expect((await cl.appel('POST', '/api/sessions', { examType: 'BAC', year: 2027 })).statut).toBe(409)
    expect((await cl.appel('POST', '/api/sessions', { examType: 'BAC', year: 1800 })).statut).toBe(400)
    expect((await new Client(url).appel('POST', '/api/sessions', { examType: 'BAC', year: 2028 })).statut).toBe(401)
  })

  it('un résultat publié sur la session devient PUBLIC et session par défaut', async () => {
    const { cl } = await connecter('amina')
    const r = await cl.televerser(csvModifie(), 'bac2027.csv', 'bac-2027')
    expect(r.statut).toBe(201)
    const { cl: appro } = await connecter('moussa')
    const a = await appro.appel('POST', `/api/propositions/${r.json.id}/approuver`, {})
    expect(a.statut).toBe(200)
    const apres = lireConfig()
    const s = apres.sessions.find((x) => x.id === 'bac-2027')
    expect(s.status).toBe('PUBLISHED')
    expect(s.stats.total).toBe(300)
    expect(apres.defaultSessionId).toBe('bac-2027')
    expect(existsSync(join(dossierDonnees, 'bac-2027', 'stats.json'))).toBe(true)
    // et la mise en ligne envoie bien CETTE session
    expect(synchroFausse.appels.at(-1).sessionId).toBe('bac-2027')
  })
})

// ======================================================================= AUDIT
describe('journal d’audit', () => {
  it('seul un administrateur le consulte ; la chaîne est intacte ; les actions sensibles y figurent', async () => {
    const { cl: simple } = await connecter('moussa')
    expect((await simple.appel('GET', '/api/audit')).statut).toBe(403)
    const { cl: admin } = await connecter('zaid')
    const r = await admin.appel('GET', '/api/audit')
    expect(r.statut).toBe(200)
    expect(r.json.verification.ok).toBe(true)
    const actions = new Set(r.json.entrees.map((e) => e.action))
    for (const a of ['connexion_echec', 'connexion_ok', 'proposition_creee', 'proposition_rejetee', 'approbation', 'approbation_refusee_auteur', 'publication_ok', 'mise_en_ligne_ok', 'mise_en_ligne_echec', 'session_creee', 'refus', 'acces_refuse']) expect(actions).toContain(a)
  })

  it('les mots de passe et les secrets n’apparaissent JAMAIS dans le journal', () => {
    const brut = readFileSync(join(dossierConsole, 'audit.jsonl'), 'utf8')
    expect(brut).not.toContain(MOT_DE_PASSE)
    for (const s of Object.values(secrets)) expect(brut).not.toContain(s)
    expect(brut).not.toContain('mauvais-mot-de-passe')
  })

  it('une modification du journal est détectée', async () => {
    const f = join(dossierConsole, 'audit.jsonl')
    const original = readFileSync(f, 'utf8')
    writeFileSync(f, original.replace('"connexion_echec"', '"connexion_ok"'))
    expect(c.audit.verifier().ok).toBe(false)
    writeFileSync(f, original) // on remet
    expect(c.audit.verifier().ok).toBe(true)
  })
})

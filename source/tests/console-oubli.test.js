// ============================================================================
// Tests du « Mot de passe oublié » de la console de publication :
// le lien part par e-mail, ne sert qu'une fois, expire, et le code à 6 chiffres
// reste exigé. On vérifie aussi le petit client SMTP avec un faux serveur d'e-mail.
// ============================================================================
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { creerConsole } from '../console/serveur.mjs'
import { creerUtilisateur, definirCourriel } from '../console/utilisateurs.mjs'
import { hacherMotDePasse, totp } from '../console/lib/securite.mjs'
import { envoyerSmtp } from '../console/lib/courriel.mjs'

const DONNEES_REELLES = new URL('../../data/', import.meta.url).pathname
const ANCIEN = 'Phrase-Secrete-2026!'
const NOUVEAU = 'Mango-Mitsamiouli-2026'

let maintenant = Date.UTC(2026, 10, 11, 12, 0, 0)
const avancer = (ms) => (maintenant += ms)
const courriels = [] // ce que la console a « envoyé »
const secrets = {}
let c, url

const appel = async (chemin, corps, cookie = '') => {
  const r = await fetch(url + chemin, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(corps) })
  return { statut: r.status, json: await r.json().catch(() => null), cookie: (r.headers.get('set-cookie') ?? '').split(';')[0] }
}
const dernierJeton = () => courriels.at(-1).texte.match(/#reinit=([A-Za-z0-9_-]+)/)[1]

beforeAll(async () => {
  const dossierDonnees = mkdtempSync(join(tmpdir(), 'pub-'))
  writeFileSync(join(dossierDonnees, 'exams.json'), readFileSync(DONNEES_REELLES + 'exams.json'))
  c = creerConsole({
    dossierConsole: mkdtempSync(join(tmpdir(), 'console-')), dossierDonnees, dev: true, sansPlanificateur: true,
    horloge: () => maintenant, urlConsole: 'https://console.mmbt.fr',
    envoyerCourriel: async (m) => { courriels.push(m) },
  })
  await new Promise((ok) => c.serveur.listen(0, '127.0.0.1', ok))
  url = `http://127.0.0.1:${c.serveur.address().port}`
  for (const nom of ['amina', 'moussa']) {
    const r = await creerUtilisateur(c.stockage, { nom, roles: ['preparateur'] })
    secrets[nom] = r.secret
    r.utilisateur.hash = await hacherMotDePasse(ANCIEN)
    r.utilisateur.doitChangerMdp = false
    c.stockage.sauver(r.utilisateur)
  }
  definirCourriel(c.stockage, 'moussa', 'moussa@exemple.km')
}, 60_000)
afterAll(() => c.arreter())

describe('mot de passe oublié', () => {
  it('répond pareil que le compte existe ou non, et n’envoie rien pour un inconnu', async () => {
    const a = await appel('/api/mot-de-passe-oublie', { nom: 'inconnu' })
    const b = await appel('/api/mot-de-passe-oublie', { nom: 'amina' })
    expect(a.statut).toBe(200)
    expect(a.json).toEqual(b.json)
    expect(courriels).toHaveLength(1)
  })

  it('sans adresse enregistrée, le lien part vers la boîte du gestionnaire (bentamou@mmbt.fr)', () => {
    const m = courriels[0]
    expect(m.a).toBe('bentamou@mmbt.fr')
    expect(m.texte).toContain('« amina »')
    expect(m.texte).toMatch(/https:\/\/console\.mmbt\.fr\/#reinit=/)
  })

  it('avec une adresse enregistrée, le lien part vers celle-ci', async () => {
    await appel('/api/mot-de-passe-oublie', { nom: 'moussa' })
    expect(courriels.at(-1).a).toBe('moussa@exemple.km')
  })

  it('une seule demande toutes les 5 minutes par compte', async () => {
    const avant = courriels.length
    await appel('/api/mot-de-passe-oublie', { nom: 'moussa' })
    expect(courriels.length).toBe(avant)
  })

  it('refuse un mot de passe de moins de 12 caractères', async () => {
    const r = await appel('/api/reinitialisation', { jeton: dernierJeton(), nouveau: 'Court-1!', confirmation: 'Court-1!', code: totp(secrets.moussa, maintenant) })
    expect(r.statut).toBe(400)
    expect(r.json.erreur).toMatch(/12 caractères/)
  })

  it('le lien seul ne suffit pas : le code à 6 chiffres est exigé', async () => {
    const r = await appel('/api/reinitialisation', { jeton: dernierJeton(), nouveau: NOUVEAU, confirmation: NOUVEAU, code: '000000' })
    expect(r.statut).toBe(401)
  })

  it('lien + bon code : le mot de passe change, le lien ne resservira pas', async () => {
    avancer(31_000)
    const jeton = dernierJeton()
    const r = await appel('/api/reinitialisation', { jeton, nouveau: NOUVEAU, confirmation: NOUVEAU, code: totp(secrets.moussa, maintenant) })
    expect(r.statut).toBe(200)
    expect((await appel('/api/connexion', { nom: 'moussa', motDePasse: ANCIEN })).statut).toBe(401)
    expect((await appel('/api/connexion', { nom: 'moussa', motDePasse: NOUVEAU })).statut).toBe(200)
    avancer(31_000)
    const bis = await appel('/api/reinitialisation', { jeton, nouveau: 'Autre-Phrase-2027!', confirmation: 'Autre-Phrase-2027!', code: totp(secrets.moussa, maintenant) })
    expect(bis.statut).toBe(410)
  })

  it('le lien expire après 30 minutes', async () => {
    const jeton = courriels[0].texte.match(/#reinit=([A-Za-z0-9_-]+)/)[1] // celui d'amina
    avancer(31 * 60_000)
    const r = await appel('/api/reinitialisation', { jeton, nouveau: NOUVEAU, confirmation: NOUVEAU, code: totp(secrets.amina, maintenant) })
    expect(r.statut).toBe(410)
  })

  it('un faux lien est refusé', async () => {
    const r = await appel('/api/reinitialisation', { jeton: 'x'.repeat(43), nouveau: NOUVEAU, confirmation: NOUVEAU, code: '123456' })
    expect(r.statut).toBe(410)
  })
})

describe('client SMTP', () => {
  it('dialogue correctement avec un serveur d’e-mail et encode les accents', async () => {
    const recu = []
    const faux = createServer((prise) => {
      let donnees = false
      let tampon = ''
      prise.write('220 bonjour\r\n')
      prise.on('data', (m) => {
        tampon += m.toString()
        let i
        while ((i = tampon.indexOf('\r\n')) >= 0) {
          const ligne = tampon.slice(0, i)
          tampon = tampon.slice(i + 2)
          recu.push(ligne)
          if (donnees) { if (ligne === '.') { donnees = false; prise.write('250 ok\r\n') } continue }
          if (ligne.startsWith('EHLO')) prise.write('250-salut\r\n250 AUTH LOGIN\r\n')
          else if (ligne === 'AUTH LOGIN') prise.write('334 VXNlcm5hbWU6\r\n')
          else if (recu.at(-2) === 'AUTH LOGIN') prise.write('334 UGFzc3dvcmQ6\r\n')
          else if (recu.at(-3) === 'AUTH LOGIN') prise.write('235 ok\r\n')
          else if (ligne === 'DATA') { donnees = true; prise.write('354 allez-y\r\n') }
          else if (ligne === 'QUIT') { prise.write('221 au revoir\r\n'); prise.end() }
          else prise.write('250 ok\r\n')
        }
      })
    })
    await new Promise((ok) => faux.listen(0, '127.0.0.1', ok))
    await envoyerSmtp({ hote: '127.0.0.1', port: faux.address().port, chiffre: false, utilisateur: 'bentamou@mmbt.fr', motDePasse: 'x' }, { a: 'chef@exemple.km', sujet: 'Réinitialisation', texte: 'Bonjour,\nÉtape suivante.' })
    faux.close()
    expect(recu).toContain('MAIL FROM:<bentamou@mmbt.fr>')
    expect(recu).toContain('RCPT TO:<chef@exemple.km>')
    expect(recu.some((l) => l.startsWith('Subject: =?UTF-8?B?'))).toBe(true)
    const corps = recu.slice(recu.indexOf('') + 1, recu.indexOf('.')).join('')
    expect(Buffer.from(corps, 'base64').toString('utf8')).toBe('Bonjour,\r\nÉtape suivante.')
  })
})

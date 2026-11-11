// ============================================================================
// console/lib/courriel.mjs – envoi d'un e-mail (pour « Mot de passe oublié »)
// ----------------------------------------------------------------------------
// Un tout petit client SMTP, sans aucune bibliothèque à installer : la console
// parle directement au serveur d'envoi de la boîte mail (chez OVH : ssl0.ovh.net,
// port 465, connexion chiffrée dès le départ).
//
// Comment se déroule un envoi (le « dialogue » SMTP, ligne par ligne) :
//   1. on se connecte ; le serveur dit bonjour (code 220) ;
//   2. EHLO        → on se présente ;
//   3. AUTH LOGIN  → identifiant puis mot de passe, encodés en base64 ;
//   4. MAIL FROM / RCPT TO → expéditeur, destinataire ;
//   5. DATA        → le message lui-même, terminé par une ligne contenant « . » ;
//   6. QUIT        → on raccroche.
//
// Réglages (fichier .env de la console) :
//   CONSOLE_SMTP_HOST=ssl0.ovh.net   CONSOLE_SMTP_PORT=465
//   CONSOLE_SMTP_USER=bentamou@mmbt.fr   CONSOLE_SMTP_PASS=…   (mot de passe de la boîte)
//   CONSOLE_SMTP_FROM=bentamou@mmbt.fr   (facultatif : par défaut, l'identifiant)
// Sans réglage, aucun e-mail ne part : la console l'écrit dans son journal technique.
// ============================================================================
import { connect as connexionChiffree } from 'node:tls'
import { connect as connexionSimple } from 'node:net'
import { randomUUID } from 'node:crypto'

/** Encode un sujet contenant des accents (norme « encoded-word »). */
const sujetEncode = (s) => `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`
/** Empêche d'injecter des en-têtes via un retour à la ligne caché dans une adresse. */
const propre = (s) => String(s ?? '').replace(/[\r\n<>]/g, '').trim()

/** Fabrique le texte complet du message (en-têtes + corps), lignes terminées par \r\n. */
export function composerMessage({ de, a, sujet, texte, nomExpediteur = 'Ndeze Natidja' }) {
  const corps = Buffer.from(String(texte).replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64').replace(/.{76}/g, '$&\r\n')
  return [
    `From: ${sujetEncode(nomExpediteur)} <${propre(de)}>`,
    `To: <${propre(a)}>`,
    `Subject: ${sujetEncode(sujet)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@${propre(de).split('@')[1] || 'localhost'}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    corps,
  ].join('\r\n')
}

/**
 * Envoie un e-mail. `reglages` = { hote, port, utilisateur, motDePasse, expediteur, chiffre }.
 * Renvoie une promesse qui échoue avec un message clair si le serveur refuse.
 */
export function envoyerSmtp(reglages, { a, sujet, texte }) {
  const { hote, port = 465, utilisateur, motDePasse, chiffre = true, delaiMs = 20_000 } = reglages
  const de = reglages.expediteur || utilisateur
  return new Promise((resolve, reject) => {
    const prise = chiffre ? connexionChiffree({ host: hote, port, servername: hote }) : connexionSimple({ host: hote, port })
    prise.setTimeout(delaiMs, () => prise.destroy(new Error('Le serveur d’e-mail ne répond pas.')))
    let tampon = ''
    let attente = null // { code attendu, suite à exécuter }
    // Les étapes du dialogue : [commande à envoyer, code de réponse attendu]
    const etapes = [
      [null, 220],
      ['EHLO console.natidja', 250],
      ...(utilisateur ? [['AUTH LOGIN', 334], [Buffer.from(utilisateur).toString('base64'), 334], [Buffer.from(motDePasse ?? '').toString('base64'), 235]] : []),
      [`MAIL FROM:<${propre(de)}>`, 250],
      [`RCPT TO:<${propre(a)}>`, 250],
      ['DATA', 354],
      // Une ligne qui commence par « . » doit être doublée (sinon le serveur croirait à la fin du message).
      [`${composerMessage({ de, a, sujet, texte }).replace(/^\./gm, '..')}\r\n.`, 250],
      ['QUIT', 221],
    ]
    let i = 0
    const suivant = () => {
      if (i >= etapes.length) { prise.end(); return resolve(true) }
      const [commande, code] = etapes[i++]
      attente = code
      if (commande !== null) prise.write(`${commande}\r\n`)
    }
    prise.on('data', (morceau) => {
      tampon += morceau.toString('utf8')
      // Une réponse peut tenir sur plusieurs lignes (« 250-… ») ; la dernière est « 250 … ».
      const lignes = tampon.split('\r\n')
      tampon = lignes.pop()
      for (const ligne of lignes) {
        if (/^\d{3}-/.test(ligne)) continue
        const code = Number(ligne.slice(0, 3))
        if (code !== attente) {
          prise.destroy()
          return reject(new Error(`Le serveur d’e-mail a refusé (${ligne.slice(0, 120)}).`))
        }
        suivant()
      }
    })
    prise.on('error', reject)
    prise.on('close', () => { if (i < etapes.length) reject(new Error('Connexion au serveur d’e-mail interrompue.')) })
    suivant() // première étape : attendre le « 220 » de bienvenue
  })
}

/** Lit les réglages dans l'environnement ; renvoie une fonction d'envoi, ou null si rien n'est réglé. */
export function courrielDepuisEnvironnement(env = process.env) {
  if (!env.CONSOLE_SMTP_HOST) return null
  const reglages = {
    hote: env.CONSOLE_SMTP_HOST,
    port: Number(env.CONSOLE_SMTP_PORT ?? 465),
    utilisateur: env.CONSOLE_SMTP_USER,
    motDePasse: env.CONSOLE_SMTP_PASS,
    expediteur: env.CONSOLE_SMTP_FROM,
    chiffre: env.CONSOLE_SMTP_TLS !== '0',
  }
  return (message) => envoyerSmtp(reglages, message)
}

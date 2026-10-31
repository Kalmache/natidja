// ============================================================================
// console/lib/securite.mjs – les briques de sécurité de la console
// ----------------------------------------------------------------------------
// Tout est fait avec les fonctions de cryptographie INTÉGRÉES à Node (aucune
// bibliothèque externe de sécurité à installer ni à mettre à jour) :
//   - mots de passe : hachés avec scrypt (jamais stockés en clair) ;
//   - double authentification : codes à 6 chiffres TOTP (RFC 6238), compatibles
//     avec Google Authenticator, Microsoft Authenticator, FreeOTP, Aegis...
//   - jetons aléatoires pour les sessions et la protection CSRF.
// ============================================================================
import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

// ---------------------------------------------------------------- MOTS DE PASSE
const N = 2 ** 15 // coût de calcul (plus c'est haut, plus c'est dur à deviner par force brute)
const R = 8
const P = 1
const LONGUEUR = 64
const MEMOIRE_MAX = 128 * N * R * 2

/** Transforme un mot de passe en empreinte irréversible : « scrypt$N$r$p$sel$hash ». */
export async function hacherMotDePasse(motDePasse) {
  const sel = randomBytes(16) // un sel DIFFÉRENT par utilisateur : deux mots de passe identiques ont des empreintes différentes
  const hash = await scryptAsync(motDePasse, sel, LONGUEUR, { N, r: R, p: P, maxmem: MEMOIRE_MAX })
  return `scrypt$${N}$${R}$${P}$${sel.toString('base64')}$${hash.toString('base64')}`
}

/** Vérifie un mot de passe contre son empreinte, en temps constant. */
export async function verifierMotDePasse(motDePasse, stocke) {
  try {
    const [algo, n, r, p, sel, hash] = String(stocke).split('$')
    if (algo !== 'scrypt') return false
    const attendu = Buffer.from(hash, 'base64')
    const calcule = await scryptAsync(motDePasse, Buffer.from(sel, 'base64'), attendu.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * Number(n) * Number(r) * 2,
    })
    return calcule.length === attendu.length && timingSafeEqual(calcule, attendu)
  } catch {
    return false
  }
}

// Empreinte « leurre » : quand l'identifiant n'existe pas, on calcule quand même un hachage
// pour que la réponse prenne le même temps (sinon, on pourrait deviner quels comptes existent).
let leurre
export async function verifierLeurre(motDePasse) {
  leurre ??= await hacherMotDePasse('leurre-' + randomBytes(8).toString('hex'))
  return verifierMotDePasse(motDePasse, leurre)
}

const MOTS_DE_PASSE_FAIBLES = ['motdepasse', 'password', '123456789', 'azertyuiop', 'qwertyuiop', 'comores', 'ndezenatidja']
/** Renvoie un message d'erreur si le mot de passe est trop faible, sinon null. */
export function verifierForceMotDePasse(motDePasse, nom = '') {
  if (typeof motDePasse !== 'string' || motDePasse.length < 12) return 'Le mot de passe doit contenir au moins 12 caractères.'
  if (motDePasse.length > 200) return 'Le mot de passe est trop long (200 caractères maximum).'
  const bas = motDePasse.toLowerCase()
  if (nom && bas.includes(nom.toLowerCase())) return 'Le mot de passe ne doit pas contenir votre identifiant.'
  if (MOTS_DE_PASSE_FAIBLES.some((m) => bas.includes(m))) return 'Ce mot de passe est trop courant.'
  if (new Set(motDePasse).size < 6) return 'Le mot de passe est trop répétitif.'
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(motDePasse)).length
  if (classes < 3) return 'Mélangez au moins 3 sortes de caractères (minuscules, majuscules, chiffres, symboles).'
  return null
}

/** Mot de passe temporaire lisible (sans caractères ambigus comme 0/O ou 1/l). */
export function motDePasseTemporaire() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const tirer = (n) => Array.from({ length: n }, () => alphabet[randomInt(alphabet.length)]).join('')
  return `${tirer(5)}-${tirer(5)}-${tirer(5)}`
}

// ------------------------------------------------------------ DOUBLE AUTHENTIFICATION
const ALPHABET_B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encoder(octets) {
  let bits = ''
  for (const o of octets) bits += o.toString(2).padStart(8, '0')
  let sortie = ''
  for (let i = 0; i < bits.length; i += 5) sortie += ALPHABET_B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]
  return sortie
}
export function base32Decoder(texte) {
  let bits = ''
  for (const c of texte.replace(/=+$/, '').toUpperCase()) {
    const v = ALPHABET_B32.indexOf(c)
    if (v < 0) throw new Error('Secret invalide')
    bits += v.toString(2).padStart(5, '0')
  }
  const octets = []
  for (let i = 0; i + 8 <= bits.length; i += 8) octets.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(octets)
}

export const nouveauSecretTotp = () => base32Encoder(randomBytes(20))
export const PAS_TOTP = 30 // secondes : un code change toutes les 30 secondes

/** Code à `chiffres` chiffres pour un compteur donné (algorithme HOTP, RFC 4226). */
export function hotp(secret, compteur, chiffres = 6) {
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(compteur))
  const h = createHmac('sha1', secret).update(message).digest()
  const decalage = h[h.length - 1] & 0x0f
  const nombre = ((h[decalage] & 0x7f) << 24) | (h[decalage + 1] << 16) | (h[decalage + 2] << 8) | h[decalage + 3]
  return String(nombre % 10 ** chiffres).padStart(chiffres, '0')
}
export const compteurTotp = (tempsMs) => Math.floor(tempsMs / 1000 / PAS_TOTP)
export const totp = (secretBase32, tempsMs = Date.now(), chiffres = 6) => hotp(base32Decoder(secretBase32), compteurTotp(tempsMs), chiffres)

/**
 * Vérifie un code saisi. Tolère ±1 pas (30 s) pour les horloges légèrement décalées.
 * `dernierCompteur` = le dernier code déjà accepté : on refuse de le réutiliser
 * (sinon un code espionné pourrait servir une seconde fois dans la même minute).
 * Renvoie le compteur accepté, ou null.
 */
export function verifierTotp(secretBase32, code, { tempsMs = Date.now(), dernierCompteur = -1, fenetre = 1 } = {}) {
  if (!/^\d{6}$/.test(String(code))) return null
  const secret = base32Decoder(secretBase32)
  const courant = compteurTotp(tempsMs)
  for (let d = -fenetre; d <= fenetre; d++) {
    const compteur = courant + d
    if (compteur <= dernierCompteur) continue // déjà utilisé (ou plus ancien)
    if (egalConstant(hotp(secret, compteur), String(code))) return compteur
  }
  return null
}

/** Adresse à encoder dans le QR code de l'application d'authentification. */
export const uriTotp = (nom, secretBase32, emetteur = 'Ndeze Natidja') =>
  `otpauth://totp/${encodeURIComponent(emetteur)}:${encodeURIComponent(nom)}?secret=${secretBase32}&issuer=${encodeURIComponent(emetteur)}&algorithm=SHA1&digits=6&period=${PAS_TOTP}`

// ------------------------------------------------------------------- JETONS
export const jetonAleatoire = () => randomBytes(32).toString('base64url')
/** Compare deux textes en temps constant (empêche de deviner un jeton lettre par lettre). */
export function egalConstant(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

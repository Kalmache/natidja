// ============================================================================
// console/utilisateurs.mjs – gestion des comptes, EN LIGNE DE COMMANDE
// ----------------------------------------------------------------------------
// Les comptes ne se créent PAS depuis la page web (une page de création de comptes
// serait une cible de choix). On les crée ici, sur le serveur, par une personne de confiance.
//
//   node console/utilisateurs.mjs creer --nom amina --roles preparateur
//   node console/utilisateurs.mjs creer --nom moussa --roles approbateur,admin
//   node console/utilisateurs.mjs lister
//   node console/utilisateurs.mjs affichage --nom amina --texte "Directeur Kabir Illiassa"   (titre lisible, affichage seul)
//   node console/utilisateurs.mjs reinitialiser --nom amina     (mot de passe + double authentification)
//   node console/utilisateurs.mjs desactiver --nom amina        (ou : activer)
//
// Rôles : preparateur (dépose les fichiers) · approbateur (approuve/refuse/planifie)
//         admin (consulte le journal d'audit). Les rôles sont volontairement SÉPARÉS.
// ============================================================================
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import qrcode from 'qrcode-generator'
import { Audit } from './lib/audit.mjs'
import { Stockage, NOM_VALIDE, normaliserNom } from './lib/stockage.mjs'
import { hacherMotDePasse, motDePasseTemporaire, nouveauSecretTotp, uriTotp } from './lib/securite.mjs'
import { lireArguments } from '../scripts/lib/cli.mjs'

export const ROLES = ['preparateur', 'approbateur', 'admin']

/**
 * « Nom d'affichage » : le titre lisible montré dans la console (ex. « Directeur Kabir Illiassa »).
 * Il ne sert QU'À l'affichage : l'identifiant de connexion (preparateur1…) reste la référence
 * technique (règle des deux personnes, journal d'audit). Texte vide = on retire l'affichage.
 */
export function nettoyerAffichage(texte) {
  const t = String(texte ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if (t.length < 2 || t.length > 60) throw new Error('Le nom d’affichage doit faire de 2 à 60 caractères.')
  if (/[<>"\u0000-\u001f]/.test(t)) throw new Error('Le nom d’affichage ne peut pas contenir de caractères spéciaux (< > ").')
  return t
}

export function definirAffichage(stockage, nom, texte) {
  const u = stockage.trouver(nom)
  if (!u) throw new Error(`Compte « ${nom} » introuvable.`)
  u.affichage = nettoyerAffichage(texte) || undefined
  stockage.sauver(u)
  return u
}

/** Crée un compte et renvoie ce qu'il faut remettre à la personne (UNE seule fois). */
export async function creerUtilisateur(stockage, { nom, roles, affichage }) {
  nom = normaliserNom(nom)
  if (!NOM_VALIDE.test(nom)) throw new Error('Identifiant invalide : 3 à 40 caractères (lettres, chiffres, point, tiret).')
  if (stockage.trouver(nom)) throw new Error(`L'identifiant « ${nom} » existe déjà.`)
  roles = [...new Set(roles)]
  if (!roles.length || roles.some((r) => !ROLES.includes(r))) throw new Error(`Rôles valides : ${ROLES.join(', ')}.`)
  const motDePasse = motDePasseTemporaire()
  const secret = nouveauSecretTotp()
  const u = { id: randomUUID(), nom, roles, hash: await hacherMotDePasse(motDePasse), totpSecret: secret, totpDernierCompteur: -1, doitChangerMdp: true, actif: true, creeLe: new Date().toISOString(), affichage: nettoyerAffichage(affichage) || undefined }
  stockage.sauver(u)
  return { utilisateur: u, motDePasse, secret, uri: uriTotp(nom, secret) }
}

export async function reinitialiserUtilisateur(stockage, nom) {
  const u = stockage.trouver(nom)
  if (!u) throw new Error('Utilisateur introuvable.')
  const motDePasse = motDePasseTemporaire()
  const secret = nouveauSecretTotp()
  Object.assign(u, { hash: await hacherMotDePasse(motDePasse), totpSecret: secret, totpDernierCompteur: -1, doitChangerMdp: true })
  stockage.sauver(u)
  return { utilisateur: u, motDePasse, secret, uri: uriTotp(u.nom, secret) }
}

function afficherRemise({ utilisateur, motDePasse, secret, uri }) {
  const qr = qrcode(0, 'M')
  qr.addData(uri)
  qr.make()
  console.log(`\n✔ Compte « ${utilisateur.nom} » (${utilisateur.roles.join(', ')})\n`)
  console.log('  À REMETTRE EN MAIN PROPRE (ou par un canal sûr). Ces informations ne seront PLUS affichées.\n')
  console.log(`  Mot de passe temporaire : ${motDePasse}   (à changer à la première connexion)`)
  console.log(`  Secret d'authentification (saisie manuelle) : ${secret}`)
  console.log('  Ou scanner ce QR code avec une application d\'authentification (Google/Microsoft Authenticator, FreeOTP, Aegis) :\n')
  console.log(qr.createASCII(1, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ICI = dirname(fileURLToPath(import.meta.url))
  const dossier = process.env.CONSOLE_DATA ?? join(ICI, '..', 'console-data')
  const stockage = new Stockage(dossier)
  const audit = new Audit(join(dossier, 'audit.jsonl'))
  const args = lireArguments()
  const [commande] = args._
  try {
    if (commande === 'creer') {
      const r = await creerUtilisateur(stockage, { nom: args.nom, roles: String(args.roles ?? '').split(',').filter(Boolean), affichage: args.affichage })
      audit.ajouter({ utilisateur: 'cli', action: 'utilisateur_cree', details: { nom: r.utilisateur.nom, roles: r.utilisateur.roles } })
      afficherRemise(r)
    } else if (commande === 'reinitialiser') {
      const r = await reinitialiserUtilisateur(stockage, args.nom)
      audit.ajouter({ utilisateur: 'cli', action: 'utilisateur_reinitialise', details: { nom: r.utilisateur.nom } })
      afficherRemise(r)
    } else if (commande === 'activer' || commande === 'desactiver') {
      const u = stockage.trouver(args.nom)
      if (!u) throw new Error('Utilisateur introuvable.')
      u.actif = commande === 'activer'
      stockage.sauver(u)
      audit.ajouter({ utilisateur: 'cli', action: `utilisateur_${commande === 'activer' ? 'active' : 'desactive'}`, details: { nom: u.nom } })
      console.log(`\n✔ Compte « ${u.nom} » ${u.actif ? 'activé' : 'désactivé'}.\n`)
    } else if (commande === 'affichage') {
      const u = definirAffichage(stockage, args.nom, args.texte)
      audit.ajouter({ utilisateur: 'cli', action: 'utilisateur_affichage', details: { nom: u.nom, affichage: u.affichage ?? null } })
      console.log(`\n✔ Compte « ${u.nom} » : ${u.affichage ? `affiché comme « ${u.affichage} »` : 'nom d’affichage retiré'}.\n`)
    } else if (commande === 'lister') {
      console.log('')
      for (const u of stockage.utilisateurs()) console.log(`  ${u.actif ? '●' : '○'} ${u.nom.padEnd(16)} ${u.roles.join(', ').padEnd(24)} ${(u.affichage ?? '').padEnd(28)} dernière connexion : ${u.dernierLogin ?? 'jamais'}`)
      console.log('')
    } else {
      console.log('\nCommandes : creer --nom X --roles a,b [--affichage "Titre Nom"] · affichage --nom X --texte "Titre Nom" · lister · reinitialiser --nom X · activer|desactiver --nom X\n')
    }
  } catch (e) {
    console.error(`\n✖ ${e.message}\n`)
    process.exit(1)
  }
}

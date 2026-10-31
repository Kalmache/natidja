// ============================================================================
// console/lib/audit.mjs – journal d'audit « à chaîne » : qui a fait quoi, quand
// ----------------------------------------------------------------------------
// Chaque ligne contient l'empreinte (SHA-256) de la ligne précédente. Si quelqu'un
// modifie, supprime ou réordonne une ligne, la chaîne est rompue et verifier() le
// détecte. ⚠️ Limite honnête : cela rend la falsification VISIBLE, pas impossible
// (quelqu'un qui contrôle tout le serveur pourrait réécrire toute la chaîne). Pour
// aller plus loin : envoyer régulièrement la dernière empreinte à un tiers de confiance.
// ============================================================================
import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'

const ZERO = '0'.repeat(64)
const empreinte = (entree) => createHash('sha256').update(JSON.stringify(entree)).digest('hex')

export class Audit {
  constructor(fichier, horloge = () => Date.now()) {
    this.fichier = fichier
    this.horloge = horloge
    mkdirSync(dirname(fichier), { recursive: true, mode: 0o700 })
    const lignes = this.lire()
    this.n = lignes.length
    this.dernier = lignes.length ? lignes.at(-1).hash : ZERO
  }

  ajouter({ utilisateur = null, roles = [], action, details = {}, ip = '' }) {
    const entree = { n: this.n + 1, t: new Date(this.horloge()).toISOString(), utilisateur, roles, action, details, ip, prec: this.dernier }
    const ligne = { ...entree, hash: empreinte(entree) }
    appendFileSync(this.fichier, JSON.stringify(ligne) + '\n', { mode: 0o600 })
    this.n = ligne.n
    this.dernier = ligne.hash
    return ligne
  }

  lire() {
    if (!existsSync(this.fichier)) return []
    return readFileSync(this.fichier, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  }

  /** Vérifie toute la chaîne. Renvoie { ok, lignes, erreur? }. */
  verifier() {
    let prec = ZERO
    const lignes = this.lire()
    for (const [i, l] of lignes.entries()) {
      const { hash, ...entree } = l
      if (entree.n !== i + 1) return { ok: false, lignes: lignes.length, erreur: `Numérotation rompue à la ligne ${i + 1}` }
      if (entree.prec !== prec) return { ok: false, lignes: lignes.length, erreur: `Chaînage rompu à la ligne ${i + 1}` }
      if (empreinte(entree) !== hash) return { ok: false, lignes: lignes.length, erreur: `Contenu modifié à la ligne ${i + 1}` }
      prec = hash
    }
    return { ok: true, lignes: lignes.length, derniere: prec }
  }
}

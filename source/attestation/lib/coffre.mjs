// ============================================================================
// attestation/lib/coffre.mjs – le COFFRE : les détails sensibles, gardés côté serveur
// ----------------------------------------------------------------------------
// Format d'un fichier privé  <dossier>/<session>.json :
//   { "BAC-26-00142": { "birthDate": "2006-02-25", "birthPlace": "...", "average": 12.4,
//                       "mention": "ASSEZ_BIEN", "grades": [...] }, ... }
// Ce fichier est produit par `npm run separer` (voir scripts/separer-donnees.mjs). Il n'est
// JAMAIS dans le dossier public du site : seul ce service le lit, et le garde en mémoire.
// ============================================================================
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { normalize } from '../../src/lib/search.js'
import { identiteCorrespond } from '../../src/lib/identite.js'

const compact = (texte) => normalize(texte).replace(/ /g, '')
const fin = (numero) => (String(numero).match(/\d+/g) ?? []).at(-1) ?? ''

export class Coffre {
  constructor() {
    this.sessions = new Map() // id de session → { fiches: Map(numéro → détails), parChiffres: Map(chiffres → numéro | null) }
  }

  /** Charge tous les fichiers « <session>.json » d'un dossier. */
  static depuisDossier(dossier) {
    const coffre = new Coffre()
    if (!existsSync(dossier)) return coffre
    for (const f of readdirSync(dossier)) {
      if (!f.endsWith('.json')) continue
      coffre.ajouter(basename(f, '.json'), JSON.parse(readFileSync(join(dossier, f), 'utf8')))
    }
    return coffre
  }

  ajouter(sessionId, objet) {
    const fiches = new Map()
    const parChiffres = new Map()
    for (const [numero, details] of Object.entries(objet)) {
      fiches.set(compact(numero), { tableNumber: numero, ...details })
      const c = fin(numero)
      // Deux numéros qui finissent par les mêmes chiffres : la saisie courte devient ambiguë, on la refuse.
      parChiffres.set(c, parChiffres.has(c) ? null : compact(numero))
    }
    this.sessions.set(sessionId, { fiches, parChiffres })
  }

  get nombre() {
    return [...this.sessions.values()].reduce((s, x) => s + x.fiches.size, 0)
  }

  /** Clé normalisée du numéro saisi (sert à compter les essais, même si le numéro n'existe pas). */
  cle(sessionId, numero) {
    const saisi = compact(numero)
    const s = this.sessions.get(sessionId)
    if (!s) return saisi
    if (s.fiches.has(saisi)) return saisi
    return /^\d+$/.test(saisi) && s.parChiffres.get(saisi) ? s.parChiffres.get(saisi) : saisi
  }

  /**
   * Vérifie l'identité ; renvoie les détails si (et seulement si) numéro ET date correspondent.
   * Jamais d'indication sur ce qui était faux : numéro inconnu ou date fausse → même résultat (null).
   */
  verifier(sessionId, numero, naissance) {
    const s = this.sessions.get(sessionId)
    const fiche = s?.fiches.get(this.cle(sessionId, numero))
    if (!fiche || !identiteCorrespond(fiche, numero, naissance)) return null
    const { tableNumber, ...details } = fiche
    return details
  }
}

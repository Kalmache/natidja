// ============================================================================
// identite.js – « cette personne est-elle bien ce candidat ? »
// ----------------------------------------------------------------------------
// Avant d'afficher l'attestation (moyenne, date de naissance...), on demande le numéro de table
// ET la date de naissance. Cette fonction compare ce que la personne a tapé à la fiche.
//
// ⚠️ Elle tourne sur l'appareil : c'est une protection d'AFFICHAGE (voir docs/CONFIDENTIALITE.md).
// ============================================================================
import { normalize } from './search.js'
import { lireDate } from './dates.js'

const compact = (texte) => normalize(texte).replace(/ /g, '')

/**
 * @returns {boolean} vrai si le numéro et la date saisis correspondent à ce candidat.
 *  - le numéro complet (« BAC-26-00142 », en majuscules ou non, avec ou sans tirets) OU sa partie chiffrée (« 00142 ») ;
 *  - la date en JJ/MM/AAAA (ou toute écriture comprise par lireDate) ;
 *  - anciennes données sans date de naissance : seul le numéro est vérifié.
 */
export function identiteCorrespond(candidat, numero, naissance) {
  const saisi = compact(numero)
  if (!saisi) return false
  const attendu = compact(candidat.tableNumber)
  const fin = (String(candidat.tableNumber).match(/\d+/g) ?? []).at(-1) ?? ''
  const memeNumero = saisi === attendu || (/^\d+$/.test(saisi) && saisi === fin)
  const memeDate = !candidat.birthDate || lireDate(naissance) === candidat.birthDate
  return memeNumero && memeDate
}

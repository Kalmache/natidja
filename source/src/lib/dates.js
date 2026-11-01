// ============================================================================
// dates.js – lecture d'une date de naissance saisie à la main
// ----------------------------------------------------------------------------
// Une SEULE règle, partagée par l'import Excel (scripts/lib/resultats.mjs) et par
// l'application (vérification d'identité du candidat) : ainsi une date acceptée à
// l'import est aussi comprise quand le candidat la retape.
// ============================================================================

/**
 * Comprend les écritures usuelles et renvoie une date au format « AAAA-MM-JJ » (sans heure,
 * donc sans décalage de fuseau), ou null si ce n'est pas une vraie date.
 *   « 15/03/2007 », « 15-03-2007 », « 15.03.2007 », « 15 03 2007 »  → JOUR d'abord (usage français)
 *   « 2007-03-15 »                                                   → format international
 *   un nombre (date « brute » d'Excel, ex. 39156)                    → converti
 * Une date impossible (31/02/2007) est refusée.
 */
export function lireDate(brut) {
  let j, m, a
  if (typeof brut === 'number') {
    if (!(brut > 1 && brut < 80000)) return null
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(brut) * 86_400_000) // l'« origine » des dates Excel
    ;[a, m, j] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]
  } else {
    const t = String(brut ?? '').trim()
    let r
    if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(t))) [a, m, j] = [r[1], r[2], r[3]].map(Number)
    else if ((r = /^(\d{1,2})[\s/.\-](\d{1,2})[\s/.\-](\d{4})$/.exec(t))) [j, m, a] = [r[1], r[2], r[3]].map(Number)
    else return null
  }
  // On vérifie que la date existe vraiment (pas de 31 février).
  const d = new Date(Date.UTC(a, m - 1, j))
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null
  return `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`
}

// ============================================================================
// classement.js – calculs d'affichage du classement des établissements
// ----------------------------------------------------------------------------
// Fonctions pures (sans écran) pour qu'elles soient faciles à tester.
// ============================================================================

/** Établissements classés : au moins `minCandidats` candidats, du meilleur au moins bon taux (déjà trié par stats.json). */
export const classes = (etablissements, minCandidats = 20) => (etablissements ?? []).filter((e) => e.total >= minCandidats)

/**
 * Le meilleur établissement de CHAQUE île (parmi les établissements classés), du meilleur au moins bon taux.
 * Ne suppose PAS que la liste est déjà triée : on cherche le plus haut taux de chaque île.
 */
export function meilleursParIle(etablissements, minCandidats = 20) {
  const meilleurs = new Map()
  for (const e of classes(etablissements, minCandidats)) {
    if (!e.ile) continue
    const actuel = meilleurs.get(e.ile)
    if (!actuel || e.taux > actuel.taux || (e.taux === actuel.taux && e.total > actuel.total)) meilleurs.set(e.ile, e)
  }
  return [...meilleurs.values()].sort((a, b) => b.taux - a.taux || a.ile.localeCompare(b.ile, 'fr'))
}

/**
 * Échelle du graphique de comparaison : arrondie au multiple de 5 inférieur / supérieur, avec un peu d'air,
 * pour que les écarts se voient. `zoom` est vrai quand l'échelle ne commence pas à 0 % (on le dit à l'écran).
 */
export function echelle(taux, nationale) {
  const toutes = [...taux, nationale].filter((n) => Number.isFinite(n))
  if (!toutes.length) return { min: 0, max: 100, zoom: false, graduations: [0, 50, 100] }
  let min = Math.max(0, Math.floor((Math.min(...toutes) - 3) / 5) * 5)
  let max = Math.min(100, Math.ceil((Math.max(...toutes) + 3) / 5) * 5)
  if (max - min < 10) max = Math.min(100, min + 10)
  const milieu = Math.round((min + max) / 2 / 5) * 5
  return { min, max, zoom: min > 0, graduations: [...new Set([min, milieu, max])] }
}

/** Position (0 à 100) d'un taux sur l'échelle. */
export const position = (t, { min, max }) => Math.max(0, Math.min(100, ((t - min) / (max - min)) * 100))

/** « +9,2 » ou « −1,4 » (vrai signe moins), en points de pourcentage. */
export function ecart(taux, nationale) {
  const d = Math.round((taux - nationale) * 10) / 10
  const texte = Math.abs(d).toFixed(1).replace('.', ',')
  return d > 0 ? `+${texte}` : d < 0 ? `−${texte}` : '0,0'
}

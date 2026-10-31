// Petites fonctions d'affichage partagées par plusieurs composants.

/** "TRES_BIEN" → "Très bien" */
export const MENTIONS = {
  PASSABLE: 'Passable',
  ASSEZ_BIEN: 'Assez bien',
  BIEN: 'Bien',
  TRES_BIEN: 'Très bien',
}

/** Met la première lettre de chaque mot en majuscule : "zaïnaba" → "Zaïnaba". */
export const titleCase = (texte = '') =>
  texte.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep, lettre) => sep + lettre.toUpperCase())

/** 10.2 → "10,20" (virgule à la française) */
export const note = (n) =>
  typeof n === 'number' ? n.toFixed(2).replace('.', ',') : '—'

/** Pourcentage arrondi à 1 décimale : (47, 100) → "47,0 %" */
export const pct = (partie, total) =>
  total ? `${((partie / total) * 100).toFixed(1).replace('.', ',')} %` : '—'

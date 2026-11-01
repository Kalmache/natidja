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

/**
 * Transforme une île de stats.parIle ({ nom, total, ADMIS, SECOND_GROUPE, AJOURNE, series })
 * en « fiche » de la même forme qu'un établissement, pour réutiliser la fenêtre de détail.
 */
export function ficheIle(ile) {
  const admis = ile.ADMIS ?? 0
  const second = ile.SECOND_GROUPE ?? 0
  return {
    nom: ile.nom,
    ile: ile.nom,
    total: ile.total,
    admis,
    second,
    ajournes: ile.total - admis - second,
    taux: Math.round((admis / ile.total) * 1000) / 10,
    mentions: ile.mentions ?? {},
    series: Object.entries(ile.series ?? {})
      .map(([serie, s]) => ({ serie, total: s.total, admis: s.ADMIS ?? 0, taux: Math.round(((s.ADMIS ?? 0) / s.total) * 1000) / 10 }))
      .sort((a, b) => b.taux - a.taux || a.serie.localeCompare(b.serie)),
  }
}

/**
 * Transforme les statistiques NATIONALES d'une session (stats.json) en « fiche » comparable,
 * pour comparer deux années entre elles.
 */
export function ficheNationale(stats, nom) {
  const admis = stats.parStatut?.ADMIS ?? 0
  const second = stats.parStatut?.SECOND_GROUPE ?? 0
  return {
    nom,
    ile: '',
    total: stats.total,
    admis,
    second,
    ajournes: stats.total - admis - second,
    taux: Math.round((admis / stats.total) * 1000) / 10,
    mentions: stats.parMention ?? {},
    series: Object.entries(stats.parSerie ?? {})
      .map(([serie, s]) => ({ serie, total: s.total, admis: s.ADMIS ?? 0, taux: Math.round(((s.ADMIS ?? 0) / s.total) * 1000) / 10 }))
      .sort((a, b) => b.taux - a.taux || a.serie.localeCompare(b.serie)),
  }
}

/** Compare deux fiches : taux de chacune, écart en points, et qui est devant (null si égalité). */
export function comparer(a, b) {
  const ecartPoints = Math.round((a.taux - b.taux) * 10) / 10
  return { ecartPoints, devant: ecartPoints === 0 ? null : ecartPoints > 0 ? 'a' : 'b' }
}

const un = (n) => Math.round(n * 10) / 10
const ORDRE_MENTIONS = ['PASSABLE', 'ASSEZ_BIEN', 'BIEN', 'TRES_BIEN']

/**
 * « Où se situe cet établissement (ou ce centre) ? » : son taux comparé à la moyenne de son île et à
 * la moyenne nationale, plus sa place dans le classement. `liste` = les éléments du même type ;
 * `ilesFiches` = les îles sous forme de fiches (voir ficheIle) ; `nationale` = taux national en %.
 */
export function positionnement(fiche, ilesFiches, nationale, liste, minCandidats = 20) {
  const ile = (ilesFiches ?? []).find((i) => i.nom === fiche.ile)
  const rangs = classes(liste, minCandidats).sort((a, b) => b.taux - a.taux || b.total - a.total)
  const rang = rangs.findIndex((x) => x.nom === fiche.nom) + 1
  return {
    taux: fiche.taux,
    tauxIle: ile ? ile.taux : null,
    tauxNational: nationale,
    ecartNational: un(fiche.taux - nationale),
    ecartIle: ile ? un(fiche.taux - ile.taux) : null,
    rang: rang || null,
    total: rangs.length,
    petit: fiche.total < minCandidats,
  }
}

/**
 * Lit un tableau de mentions { PASSABLE: n, … } : total, mention la plus fréquente (et sa part en %),
 * part cumulée de « Bien » et « Très bien ». Sert à écrire la phrase sous le graphique.
 */
export function analyseMentions(valeurs) {
  const total = ORDRE_MENTIONS.reduce((s, m) => s + (valeurs?.[m] ?? 0), 0)
  if (!total) return null
  const plusFrequente = ORDRE_MENTIONS.reduce((a, m) => ((valeurs[m] ?? 0) > (valeurs[a] ?? 0) ? m : a), ORDRE_MENTIONS[0])
  return {
    total,
    plusFrequente,
    partPlusFrequente: un(((valeurs[plusFrequente] ?? 0) / total) * 100),
    partHautes: un((((valeurs.BIEN ?? 0) + (valeurs.TRES_BIEN ?? 0)) / total) * 100),
  }
}

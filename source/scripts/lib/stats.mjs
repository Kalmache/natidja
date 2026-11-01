// Calcul des statistiques d'une session (par statut, île, série, mention).
// Partagé par scripts/build-stats.mjs et par la console de publication, pour que
// les chiffres soient IDENTIQUES où qu'ils soient calculés.
const inc = (obj, key) => {
  obj[key] = (obj[key] ?? 0) + 1
}

/** « Candidat Libre », « Candidate libre »… : pas rattaché à un établissement. */
export const estCandidatLibre = (nom) => /candidat(e)?s?\s+libres?/i.test(String(nom ?? ''))

export function calculerStats(candidats, session) {
  const stats = {
    session: session.id,
    total: candidats.length,
    parStatut: {}, // { ADMIS: n, AJOURNE: n, SECOND_GROUPE: n }
    parMention: {}, // { BIEN: n, ... }
    parIle: {}, // { ngazidja: { nom, total, ADMIS, ... } }
    parSerie: {}, // { A1: { total, ADMIS, ... } }
    moyenneGenerale: 0,
    etablissements: [], // classement par taux de réussite (candidats libres exclus), voir plus bas
  }
  const parEtablissement = new Map() // nom → { total, admis, iles: { id → nombre } }
  let sommeMoyennes = 0
  let avecMoyenne = 0
  for (const c of candidats) {
    // Classement des établissements : les candidats libres n'appartiennent à aucun établissement.
    if (c.school && !estCandidatLibre(c.school)) {
      const e = parEtablissement.get(c.school) ?? { total: 0, admis: 0, second: 0, iles: {}, series: {} }
      e.total++
      if (c.status === 'ADMIS') e.admis++
      if (c.status === 'SECOND_GROUPE') e.second++
      e.iles[c.island] = (e.iles[c.island] ?? 0) + 1
      if (c.series) {
        const s = (e.series[c.series] ??= { total: 0, admis: 0 })
        s.total++
        if (c.status === 'ADMIS') s.admis++
      }
      parEtablissement.set(c.school, e)
    }
    inc(stats.parStatut, c.status)
    if (c.mention && c.mention !== 'SANS') inc(stats.parMention, c.mention)
    stats.parIle[c.islandId] ??= { nom: c.island, total: 0 }
    stats.parIle[c.islandId].total++
    inc(stats.parIle[c.islandId], c.status)
    if (c.series) {
      stats.parSerie[c.series] ??= { total: 0 }
      stats.parSerie[c.series].total++
      inc(stats.parSerie[c.series], c.status)
    }
    if (typeof c.average === 'number') {
      sommeMoyennes += c.average
      avecMoyenne++
    }
  }
  // Du meilleur au moins bon taux ; à égalité, l'établissement qui présente le plus de candidats, puis l'ordre alphabétique.
  stats.etablissements = [...parEtablissement].map(([nom, e]) => ({
    nom,
    ile: Object.entries(e.iles).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
    total: e.total,
    admis: e.admis,
    second: e.second,
    ajournes: e.total - e.admis - e.second,
    taux: Math.round((e.admis / e.total) * 1000) / 10, // en %, une décimale
    // Résultats par série dans cet établissement (pour la fiche détaillée), du meilleur au moins bon taux.
    series: Object.entries(e.series)
      .map(([serie, s]) => ({ serie, total: s.total, admis: s.admis, taux: Math.round((s.admis / s.total) * 1000) / 10 }))
      .sort((a, b) => b.taux - a.taux || a.serie.localeCompare(b.serie)),
  })).sort((a, b) => b.taux - a.taux || b.total - a.total || a.nom.localeCompare(b.nom, 'fr'))
  stats.moyenneGenerale = avecMoyenne ? Math.round((sommeMoyennes / avecMoyenne) * 100) / 100 : 0
  return stats
}

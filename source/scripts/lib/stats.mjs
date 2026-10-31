// Calcul des statistiques d'une session (par statut, île, série, mention).
// Partagé par scripts/build-stats.mjs et par la console de publication, pour que
// les chiffres soient IDENTIQUES où qu'ils soient calculés.
const inc = (obj, key) => {
  obj[key] = (obj[key] ?? 0) + 1
}

export function calculerStats(candidats, session, chiffresNumero = 3) {
  const stats = {
    session: session.id,
    total: candidats.length,
    parStatut: {}, // { ADMIS: n, AJOURNE: n, SECOND_GROUPE: n }
    parMention: {}, // { BIEN: n, ... }
    parIle: {}, // { ngazidja: { nom, total, ADMIS, ... } }
    parSerie: {}, // { A1: { total, ADMIS, ... } }
    moyenneGenerale: 0,
    // Liste ordonnée des fichiers « numeros/<clé>.json » : l'application s'en sert
    // pour PARCOURIR les résultats quand on filtre sans rien taper (ex. « Admis »).
    fichiersNumeros: [],
  }
  const cles = new Set()
  let sommeMoyennes = 0
  let avecMoyenne = 0
  for (const c of candidats) {
    // Même règle que construireFichiers : début de la dernière partie numérique du n° de table.
    const cle = String(c.tableNumber).match(/\d+/g)?.at(-1)?.slice(0, chiffresNumero)
    if (cle) cles.add(cle)
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
  stats.fichiersNumeros = [...cles].sort()
  stats.moyenneGenerale = avecMoyenne ? Math.round((sommeMoyennes / avecMoyenne) * 100) / 100 : 0
  return stats
}

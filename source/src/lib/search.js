// ============================================================================
// src/lib/search.js – le "cerveau" de la recherche
// ----------------------------------------------------------------------------
// IDÉE CENTRALE : au lieu d'avoir une base de données, les 3 500 candidats sont
// découpés en petits fichiers ("shards", des tessons) :
//
//   data/bac-2026/numeros/001.json  → candidats dont le numéro commence par 001
//   data/bac-2026/noms/AB.json      → candidats dont le nom commence par AB
//
// Quand l'utilisateur tape sa recherche, on calcule QUEL fichier télécharger
// (≈ 30 Ko) puis on filtre à l'intérieur. Résultat : rapide, même en 3G, et
// aucun serveur n'est nécessaire.
//
// Ce fichier ne contient que des fonctions "pures" (même entrée → même sortie),
// donc faciles à tester (voir tests/search.test.js).
// ============================================================================

/**
 * Normalise un texte pour comparer sans se soucier des accents, majuscules
 * ou ponctuation.   "Zaïnaba  M'ze" → "ZAINABA M ZE"
 */
export function normalize(texte) {
  return String(texte ?? '')
    .normalize('NFD') // sépare les lettres de leurs accents : "ï" → "i" + "¨"
    .replace(/[̀-ͯ]/g, '') // supprime les accents
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ') // tout ce qui n'est pas lettre/chiffre → espace
    .trim()
}

/**
 * Analyse ce que tape l'utilisateur et décide quoi faire.
 *
 * @param {string} saisie    le texte de la barre de recherche
 * @param {object} shardKeys { numberDigits: 3, nameLetters: 2 }
 * @param {string} sessionId ex. "bac-2026"
 * @returns un objet décrivant l'état :
 *   { etat: 'vide' }                                  rien tapé
 *   { etat: 'trop-court', manque: n }                 il faut n caractères de plus
 *   { etat: 'pret', url, filtre(candidat) → boolean } on peut télécharger `url`
 */
export function buildQuery(saisie, shardKeys = {}, sessionId) {
  const texte = normalize(saisie)
  if (texte === '') return { etat: 'vide' }

  const chiffres = shardKeys.numberDigits ?? 3
  const lettres = shardKeys.nameLetters ?? 2
  const base = `./data/${sessionId}`

  // ---- Cas 1 : la saisie contient un chiffre → recherche par NUMÉRO ----
  if (/\d/.test(texte)) {
    const groupes = texte.match(/\d+/g) // ex. "BAC 26 00142" → ["26", "00142"]
    const dernier = groupes[groupes.length - 1] // "00142"
    if (dernier.length < chiffres) {
      return { etat: 'trop-court', manque: chiffres - dernier.length }
    }
    const compact = texte.replace(/ /g, '') // "BAC2600142"
    return {
      etat: 'pret',
      url: `${base}/numeros/${dernier.slice(0, chiffres)}.json`,
      filtre: (candidat) => {
        const numero = normalize(candidat.tableNumber)
        return (
          numero.replace(/ /g, '').includes(compact) ||
          (numero.match(/\d+/g)?.pop() ?? '').startsWith(dernier)
        )
      },
    }
  }

  // ---- Cas 2 : uniquement des lettres → recherche par NOM / PRÉNOM ----
  const mots = texte.split(' ')
  if (mots[0].length < lettres) {
    return { etat: 'trop-court', manque: lettres - mots[0].length }
  }
  return {
    etat: 'pret',
    url: `${base}/noms/${mots[0].slice(0, lettres)}.json`,
    // Chaque mot tapé doit être le DÉBUT d'un mot du nom ou du prénom,
    // dans n'importe quel ordre ("zainaba att" trouve ATTOUMANE Zaïnaba).
    filtre: (candidat) => {
      const motsCandidat = normalize(
        `${candidat.lastName} ${candidat.firstName}`,
      ).split(' ')
      return mots.every((m) => motsCandidat.some((mc) => mc.startsWith(m)))
    },
  }
}

/** Vrai si le candidat respecte les filtres choisis (île, série, statut). */
export function matchesFilters(candidat, { island = 'all', series = 'ALL', status = 'ALL', mention = 'ALL' }) {
  if (island !== 'all' && candidat.islandId !== island) return false
  if (series !== 'ALL' && candidat.series !== series) return false
  if (status !== 'ALL' && candidat.status !== status) return false
  if (mention !== 'ALL' && candidat.mention !== mention) return false
  return true
}

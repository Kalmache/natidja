// ============================================================================
// scripts/lib/separation.mjs – séparer le PUBLIC du PRIVÉ
// ----------------------------------------------------------------------------
// Logique : un candidat a des champs que n'importe quel visiteur peut voir après une recherche
// (nom, résultat, établissement…) et des champs SENSIBLES (date et lieu de naissance, moyenne,
// mention, notes). Cette fonction coupe la fiche en deux : le public part sur le site, le privé
// part dans le coffre du service d'attestation.
// ============================================================================

/** Champs qui ne doivent JAMAIS figurer dans les fichiers publics. */
export const CHAMPS_PRIVES = ['birthDate', 'birthPlace', 'gender', 'average', 'mention', 'grades']

/** @returns {{ publique: object, privee: object }} */
export function separer(candidat) {
  const publique = {}
  const privee = {}
  for (const [cle, valeur] of Object.entries(candidat)) {
    if (CHAMPS_PRIVES.includes(cle)) {
      if (valeur !== undefined && valeur !== null) privee[cle] = valeur
    } else publique[cle] = valeur
  }
  return { publique, privee }
}

/** Sépare une liste : { publics: [...], coffre: { numéro → détails privés } }. */
export function separerListe(candidats) {
  const publics = []
  const coffre = {}
  for (const c of candidats) {
    const { publique, privee } = separer(c)
    publics.push(publique)
    if (Object.keys(privee).length) coffre[c.tableNumber] = privee
  }
  return { publics, coffre }
}

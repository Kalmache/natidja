// ============================================================================
// demande.js – « va me montrer ces résultats-là »
// ----------------------------------------------------------------------------
// Quand on touche une carte de la page Statistiques (ex. « Admis », une mention,
// une île), on veut ARRIVER sur la liste des résultats déjà filtrée. Les deux
// pages ne partagent pas leur état : la première dépose donc ici une demande,
// la page des résultats la lit à son ouverture (une seule fois) et l'applique.
// ============================================================================
let demande = null

/** Dépose une demande, ex. { statut: 'ADMIS', mention: 'BIEN', island: 'mwali', serie: 'C' }. */
export const demanderFiltre = (filtre) => {
  demande = filtre
}

/** Lit la demande en attente puis l'efface (renvoie null s'il n'y en a pas). */
export const consommerFiltre = () => {
  const d = demande
  demande = null
  return d
}

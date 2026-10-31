// ============================================================================
// src/legal/config.js – VOS informations d'éditeur (un seul endroit à remplir)
// ----------------------------------------------------------------------------
// Les pages « Mentions légales », « Confidentialité », « Licence »... et le pied
// de page lisent ce fichier. Une information laissée vide ('') n'est PAS
// affichée : le site n'affiche donc jamais de « à compléter ».
// Pour un vrai déploiement officiel, complétez au minimum : adresse, SIRET (si
// vous en avez un) et vos liens de réseaux sociaux.
// ============================================================================
export const EDITOR = {
  name: 'M.M.B.T',
  person: 'Maabadi Ben Tamou', // éditeur à titre personnel (nom déjà publié sur mmbt.fr)
  website: 'https://mmbt.fr',
  websiteLabel: 'mmbt.fr',
  email: 'contact@mmbt.fr',
  year: 2026,

  // --- Réseaux sociaux (renseignés ; laisser '' pour masquer un lien) ---
  tiktok: 'https://www.tiktok.com/@mmbt.fr',
  instagram: 'https://www.instagram.com/mmbt.fr',

  // --- À compléter si vous le souhaitez (laisser '' pour masquer) ---
  address: '', // ex. '12 rue Exemple, 75000 Paris'
  siret: '', // ex. '123 456 789 00012'
  publisher: 'Maabadi Ben Tamou', // directeur de la publication
}

export const HOST = {
  name: 'OVH SAS',
  address: '2 rue Kellermann, 59100 Roubaix, France',
  website: 'https://www.ovhcloud.com',
}

// Version affichée dans le pied de page (lue dans package.json au build).
export const VERSION = typeof __APP_VERSION__ === 'undefined' ? 'dev' : __APP_VERSION__

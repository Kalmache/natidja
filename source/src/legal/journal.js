// ============================================================================
// Journal de bord : l'historique des versions du site (le plus récent d'abord).
// Pour ajouter une version : copier un bloc, changer le texte, et mettre à jour
// "version" dans package.json (le pied de page l'affiche automatiquement).
// ============================================================================
export const JOURNAL = [
  {
    version: '2.1.0',
    date: '31/10/2026',
    titre: 'Signature, licence et pages légales',
    points: [
      'Pied de page signé M.M.B.T avec contact et liens vers les pages légales',
      'Pages Mentions légales, Confidentialité, Conditions d’utilisation, Licence et Journal de bord',
      'Licences des composants libres utilisés (React, Vite, Workbox, générateur de QR code)',
    ],
  },
  {
    version: '2.0.1',
    date: '31/10/2026',
    titre: 'Réparation du déploiement OVH',
    points: [
      'La racine du dépôt redevient le site publié ; le code source est rangé dans source/',
      'Nouvelle commande de publication : npm run publish-site',
    ],
  },
  {
    version: '2.0.0',
    date: '31/10/2026',
    titre: 'Refonte complète',
    points: [
      'Écran d’ouverture animé, compteurs animés, confettis pour les admis',
      'Statistiques nationales et schéma interactif des îles',
      'Attestation avec QR code et page de vérification',
      'Français et arabe (écriture de droite à gauche)',
      'Sécurité renforcée (CSP, HSTS, suppression du faux espace administrateur)',
      'Application installable et utilisable hors-ligne',
    ],
  },
  {
    version: '1.3.0',
    date: '31/10/2026',
    titre: 'Palettes et confort de recherche',
    points: [
      'Quatre palettes de couleurs, grille à trois colonnes sur ordinateur',
      'Candidats affichés instantanément au démarrage, navigation clavier entre les îles',
      'Villages et centres d’examen affichés',
    ],
  },
  {
    version: '1.2.0',
    date: '31/10/2026',
    titre: 'Écoles et centres d’examen officiels',
    points: ['Ajout des établissements et des centres d’examen aux candidats'],
  },
  {
    version: '1.1.0',
    date: '31/10/2026',
    titre: 'Recherche par micro-fichiers',
    points: [
      'Données découpées en petits fichiers (recherche rapide même en 3G)',
      'Recherche insensible aux accents, jeu de 7 000 candidats',
    ],
  },
  {
    version: '1.0.0',
    date: '31/10/2026',
    titre: 'Première version',
    points: ['Mise en ligne initiale de Ndeze Natidja sur OVH'],
  },
]

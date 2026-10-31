// ============================================================================
// Journal de bord : l'historique des versions du site (le plus récent d'abord).
// Pour ajouter une version : copier un bloc, changer le texte, et mettre à jour
// "version" dans package.json (le pied de page l'affiche automatiquement).
// ============================================================================
export const JOURNAL = [
  {
    version: '2.5.0',
    date: '31/10/2026',
    titre: 'Console de publication et préparation du jour J',
    points: [
      'Console de publication sécurisée, séparée du site public : connexion, double authentification, validation par deux personnes, publication programmée, journal d’audit à chaîne',
      'Test de charge réaliste, modèle de capacité et comparaison des options d’hébergement pour le jour des résultats',
      'Tests de sécurité automatiques (66 tests au total)',
    ],
  },
  {
    version: '2.4.1',
    date: '31/10/2026',
    titre: 'Écran d’ouverture plus lisible',
    points: [
      'L’écran d’ouverture reste affiché plus longtemps (environ 6 secondes) pour laisser le temps de lire',
      'Le bouton « Passer », plus visible, permet d’aller directement à l’accueil ; un simple toucher ailleurs ne le coupe plus',
    ],
  },
  {
    version: '2.4.0',
    date: '31/10/2026',
    titre: 'Navigation par glissement',
    points: [
      'Glisser le doigt vers la gauche ou la droite pour passer d’un onglet à l’autre (Résultats, Statistiques, À propos, Réglages)',
      'Même geste entre les pages légales (Mentions, Confidentialité, Conditions, Licence, Journal de bord)',
      'Animation de transition entre les pages ; sens du geste inversé en arabe',
    ],
  },
  {
    version: '2.3.1',
    date: '31/10/2026',
    titre: 'Application Android : affichage et mises à jour',
    points: [
      'L’application respecte la barre d’état et la barre de gestes : plus aucun bouton masqué par les notifications',
      'Icônes de la barre d’état adaptées au thème clair ou sombre',
      'Nouvelle page Réglages : thème, couleur, langue, état de la connexion, version, effacement des données de l’appareil',
      'Les nouvelles versions de l’application s’installent par-dessus la précédente',
    ],
  },
  {
    version: '2.3.0',
    date: '31/10/2026',
    titre: 'Import des résultats depuis Excel',
    points: [
      'Modèle Excel à remplir (listes déroulantes, mode d’emploi) pour le Bac et le BEPC',
      'Vérification automatique du fichier : doublons, champs manquants, moyennes impossibles, avec numéro de ligne',
      'Publication sécurisée avec sauvegarde automatique et retour en arrière en une commande',
      'Guide de publication pas à pas et check-list du jour des résultats',
    ],
  },
  {
    version: '2.2.0',
    date: '31/10/2026',
    titre: 'Application Android',
    points: [
      'Application Android (fichier APK) emballant le site avec toutes les données : fonctionne sans connexion',
      'Les QR codes générés dans l’application pointent vers le site public natidja.mmbt.fr',
      'Licence : l’adoption par une institution ne vaut jamais cession des droits d’auteur',
    ],
  },
  {
    version: '2.1.0',
    date: '31/10/2026',
    titre: 'Signature, licence et pages légales',
    points: [
      'Pied de page signé M.M.B.T avec contact, TikTok, Instagram et liens vers les pages légales',
      'Pages Mentions légales, Confidentialité, Conditions d’utilisation, Licence et Journal de bord',
      'Textes juridiques rédigés selon le droit français (propriété intellectuelle, LCEN, RGPD)',
      'Textes alignés sur ceux de mmbt.fr (éditeur à titre personnel, statistiques anonymes de l’hébergeur)',
      'Licence « Tous droits réservés » et licences des composants libres utilisés',
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
    date: 'Fin octobre 2026',
    titre: 'Première mise en ligne',
    points: [
      'Mise en place de l’hébergement OVH et du dépôt de code Git',
      'Première version publique de Ndeze Natidja, issue du travail de conception et de développement mené en amont',
    ],
  },
  {
    version: 'Genèse',
    date: '2025 – 2026',
    titre: 'Conception et développement',
    points: [
      'Conception et développement de l’application, hors dépôt de code, jusqu’à sa première mise en ligne',
      'Priorités : retrouver un candidat en quelques secondes, tenir la charge le jour des résultats, fonctionner même avec un réseau fragile',
    ],
  },
  {
    version: 'Origine',
    date: '2025',
    titre: 'Le point de départ',
    points: [
      'Un dysfonctionnement de l’outil officiel de consultation empêche des élèves de retrouver leur résultat',
      'Ce constat est à l’origine du projet : créer un service simple, rapide et fiable pour que chaque élève retrouve le sien',
    ],
  },
]

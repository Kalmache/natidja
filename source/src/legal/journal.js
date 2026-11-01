// ============================================================================
// Journal de bord : l'historique des versions du site (le plus récent d'abord).
// Pour ajouter une version : copier un bloc, changer le texte, et mettre à jour
// "version" dans package.json (le pied de page l'affiche automatiquement).
// ============================================================================
export const JOURNAL = [
  {
    version: '3.4.1',
    date: '01/11/2026',
    titre: 'Page Découvrir : plus compacte sur téléphone',
    points: [
      'Le petit bouton de défilement reste visible sur téléphone',
      'Moins de vide autour du téléphone d’exemple et entre les sections',
      'Le téléphone d’exemple ne chevauche plus le texte au défilement',
    ],
  },
  {
    version: '3.4.0',
    date: '01/11/2026',
    titre: 'Rapport des statistiques en PDF',
    points: [
      'Nouveau bouton « Télécharger le rapport (PDF) » sur la page Statistiques : synthèse nationale, réussite par île, par série, mentions, centres d’examen et établissements, mise en page pour A4',
      'Le rapport ne contient que des totaux et des taux : aucun nom de candidat, aucune date de naissance',
      'Sur Android, le bouton ouvre l’impression d’où l’on choisit « Enregistrer au format PDF »',
    ],
  },
  {
    version: '3.3.0',
    date: '01/11/2026',
    titre: 'Centres d’examen et mises à jour fiables',
    points: [
      'Nouveau filtre « Centre d’examen » dans la recherche : on ne voit que les candidats d’un centre',
      'Nouvelle section « Centres d’examen » dans les statistiques : taux de réussite de chaque centre, avec sa fiche détaillée',
      'Dans l’application Android, les mises à jour s’affichent dès le premier lancement (l’ancienne version ne reste plus en mémoire)',
      '133 tests automatiques',
    ],
  },
  {
    version: '3.2.0',
    date: '01/11/2026',
    titre: 'La page « Découvrir »',
    points: [
      'Nouvelle page de présentation plein écran (À propos → Découvrir la présentation, ou lien « Découvrir » en bas de page) : chiffres animés, démonstration de la recherche sur un téléphone, hors-ligne, sécurité, vie privée, palettes, circuit de publication',
      'Chargée à la demande : elle n’alourdit pas l’ouverture de l’application, et les animations se calment si l’appareil demande moins de mouvement',
      'Un bouton « Demander une démonstration » prépare directement l’e-mail',
    ],
  },
  {
    version: '3.1.1',
    date: '01/11/2026',
    titre: 'Des statistiques qui apportent du nouveau',
    points: [
      'Le podium reste sur l’accueil ; la page Statistiques ne le répète plus. Elle montre chaque établissement comparé à la moyenne nationale (de combien il la dépasse) et le meilleur établissement de chaque île',
      'Toucher un établissement ouvre sa fiche : taux de réussite, écart avec la moyenne nationale, répartition des résultats, réussite par série et place dans le classement (chiffres agrégés, aucun nom de candidat)',
      'Les blocs flottent doucement de haut en bas, et les chiffres clés de la page Statistiques mènent au graphique qui les détaille',
      '128 tests automatiques',
    ],
  },
  {
    version: '3.1.0',
    date: '01/11/2026',
    titre: 'Le podium des établissements',
    points: [
      'Le classement des établissements prend la forme d’un podium : le premier au centre sur la marche la plus haute, le deuxième et le troisième de chaque côté, les suivants listés dessous',
      'Même podium sur l’accueil (5 établissements) et sur la page Statistiques (10) ; les marches montent à l’ouverture (désactivé si l’appareil demande moins d’animations)',
    ],
  },
  {
    version: '3.0.0',
    date: '01/11/2026',
    titre: 'Vie privée : un accueil sans liste de noms',
    points: [
      'L’accueil ne montre plus aucun nom : des statistiques et le classement des meilleurs établissements (par taux de réussite, candidats libres exclus, réglable par l’autorité organisatrice)',
      'La recherche affiche le résultat juste sous la barre ; la carte du candidat se limite au nom, au résultat et à l’établissement',
      'L’attestation (numéro de table, mention, moyenne, date de naissance) s’ouvre après vérification de l’identité : numéro de table et date de naissance',
      'Nouveau bouton « Partager ma réussite » : une image sobre, sans numéro ni date de naissance, à la place d’une capture de l’attestation',
      'Les cartes de chiffres mènent aux statistiques ; il n’est plus possible de parcourir une liste de candidats sans avoir cherché',
      'Recherche : message d’aide en arabe pour écrire le nom en lettres latines ; bouton « Actualiser les résultats » dans les Réglages ; lieu de naissance sur la page de vérification',
      '121 tests automatiques',
    ],
  },
  {
    version: '2.8.1',
    date: '01/11/2026',
    titre: 'E-mail prêt à envoyer',
    points: [
      'Réglages, Espace responsable : le bouton « Demander des informations » ouvre un e-mail déjà rédigé (objet, texte officiel, questions posées) ; il ne reste qu’à compléter son nom et son organisme',
    ],
  },
  {
    version: '2.8.0',
    date: '01/11/2026',
    titre: 'Choisir l’année et la session',
    points: [
      'Le visiteur choisit l’examen, l’année et la session (principale ou rattrapage) ; les années précédentes restent consultables',
      'La console permet de créer la session d’une nouvelle année : elle reste cachée du public jusqu’à la première publication de résultats, puis devient la session affichée par défaut',
      '109 tests automatiques',
    ],
  },
  {
    version: '2.7.0',
    date: '01/11/2026',
    titre: 'Date de naissance',
    points: [
      'La date de naissance complète figure sur la fiche du candidat, sur l’attestation et sur la page de vérification : elle permet de distinguer les homonymes',
      'Elle est obligatoire dans le fichier Excel de publication, avec contrôle (date réelle, âge vraisemblable) et numéro de ligne en cas d’erreur ; le modèle Excel a été mis à jour',
      'Elle fait partie de ce que garantit le code de vérification de l’attestation',
      '90 tests automatiques',
    ],
  },
  {
    version: '2.6.0',
    date: '31/10/2026',
    titre: 'Console de publication prête à être mise en ligne',
    points: [
      'Envoi automatique des résultats publiés vers le site public : un seul envoi par publication, déploiement automatique chez l’hébergeur, plus aucun transfert à la main',
      'En cas d’échec de l’envoi, la publication reste valide et un bouton permet de réessayer ; chaque envoi est inscrit au journal d’audit',
      'Kit d’installation sur serveur avec HTTPS automatique et guide pas à pas',
      'Page Licence : formulaire « Demander une autorisation » dont l’e-mail se rédige automatiquement, au ton officiel, et s’ouvre dans la messagerie',
      '83 tests automatiques',
    ],
  },
  {
    version: '2.5.4',
    date: '31/10/2026',
    titre: 'Saisie plus confortable avec le clavier',
    points: [
      'Quand le clavier du téléphone s’ouvre, la barre de navigation du bas se cache au lieu de recouvrir le champ de saisie',
      'La barre de recherche se place juste sous l’en-tête, bien visible, au lieu de disparaître derrière lui',
    ],
  },
  {
    version: '2.5.3',
    date: '31/10/2026',
    titre: 'Cartes cliquables et chiffres qui flottent',
    points: [
      'Toucher une carte de chiffres (Admis, Second groupe…) ou un élément des statistiques (mention, île, série, légende) mène directement à la liste des résultats concernés, déjà filtrée',
      'Nouveau filtre par mention ; les filtres actifs s’affichent en pastilles qu’on retire d’un toucher',
      'La liste filtrée parcourt tous les résultats, par petits fichiers, et ne se limite plus aux 120 premiers candidats',
      'Les cartes de chiffres flottent doucement, comme sur l’eau (désactivé si l’appareil demande moins d’animations)',
    ],
  },
  {
    version: '2.5.2',
    date: '31/10/2026',
    titre: 'Navigation au bouton retour et glissement plus fluide',
    points: [
      'Le bouton retour du téléphone ferme la fiche ouverte, ramène à l’accueil depuis toute autre page, et ne quitte l’application que depuis l’accueil',
      'Glisser d’une page à l’autre est plus facile : geste plus court accepté et coup de doigt rapide reconnu',
      'Drapeau : quatre vraies étoiles alignées sur le croissant ; adresse mmbt.fr cliquable à côté de la signature à l’ouverture',
    ],
  },
  {
    version: '2.5.1',
    date: '31/10/2026',
    titre: 'Bouton retour et nouvelle icône',
    points: [
      'Le bouton retour du téléphone referme maintenant la fiche d’un candidat au lieu de quitter l’application',
      'Dans l’application, le bouton Partager ouvre la vraie boîte de partage du téléphone (WhatsApp, SMS…) et le bouton Imprimer / PDF est de retour',
      'Nouvelle icône : croissant et quatre étoiles dorés sur fond vert, aux couleurs de l’archipel',
    ],
  },
  {
    version: '2.5.0',
    date: '31/10/2026',
    titre: 'Console de publication et préparation du jour J',
    points: [
      'Console de publication sécurisée, séparée du site public : connexion, double authentification, validation par deux personnes, publication programmée, journal d’audit à chaîne',
      'Test de charge réaliste, modèle de capacité et comparaison des options d’hébergement pour le jour des résultats',
      'Tests de sécurité automatiques (66 tests au total)',
      'Dossier de présentation à destination des autorités organisatrices (10 pages) et déroulé de démonstration',
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

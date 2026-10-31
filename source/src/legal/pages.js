// ============================================================================
// Contenu des pages légales (en français). Chaque page est une liste de blocs :
//   { h: 'titre' }  { p: 'paragraphe' }  { ul: ['puce 1', 'puce 2'] }
// Les infos d'éditeur viennent de config.js ; ce qui est vide est omis.
// ⚠️ Ces textes sont des modèles de bonne foi, adaptés à une DÉMONSTRATION.
// Avant un déploiement officiel, faites-les relire par un juriste.
// ============================================================================
import { EDITOR, HOST } from './config.js'

const si = (condition, ...blocs) => (condition ? blocs : [])

export const MENTIONS = [
  { h: 'Éditeur du site' },
  { p: `Le site « Ndeze Natidja » est édité par ${EDITOR.name} (${EDITOR.websiteLabel}).` },
  { ul: [
    `Contact : ${EDITOR.email}`,
    ...si(EDITOR.address, `Adresse : ${EDITOR.address}`),
    ...si(EDITOR.siret, `SIRET : ${EDITOR.siret}`),
    ...si(EDITOR.publisher, `Directeur de la publication : ${EDITOR.publisher}`),
  ].flat() },
  { h: 'Hébergeur' },
  { p: `${HOST.name}, ${HOST.address} — ${HOST.website}` },
  { h: 'Nature du site' },
  { p: 'Ce site est une démonstration technique. Tous les candidats, numéros de table et résultats affichés sont fictifs et n’ont aucune valeur officielle.' },
  { p: 'Les mentions « Ministère de l’Éducation Nationale » et « Office National des Examens et Concours » illustrent le service envisagé. Ce site n’est affilié à aucune administration et n’émet aucun document officiel.' },
  { h: 'Propriété intellectuelle' },
  { p: 'Le code, le design et les textes sont protégés. Les conditions d’utilisation sont détaillées dans la page « Licence ».' },
  { h: 'Responsabilité' },
  { p: 'L’éditeur s’efforce de garantir le bon fonctionnement du site mais ne peut être tenu responsable d’une indisponibilité, d’une erreur ou d’un usage des contenus de démonstration en dehors de leur contexte.' },
]

export const PRIVACY = [
  { h: 'En résumé' },
  { p: 'Ce site ne demande aucun compte, n’utilise aucun cookie, aucun outil de statistiques et aucun traceur publicitaire. Il ne collecte aucune donnée personnelle sur ses visiteurs.' },
  { h: 'Ce qui est mémorisé sur votre appareil' },
  { p: 'Uniquement pour votre confort, et jamais envoyé à un serveur :' },
  { ul: [
    'vos préférences : thème clair/sombre, couleur et langue ;',
    'le fait d’avoir déjà vu l’écran d’ouverture (le temps de la session) ;',
    'une copie des fichiers de résultats consultés, pour fonctionner hors-ligne (vous pouvez la supprimer dans les réglages de votre navigateur).',
  ] },
  { h: 'Ce que voit le serveur' },
  { p: `Comme tout site web, l’hébergeur (${HOST.name}) enregistre des journaux techniques standards : adresse IP, date et heure, fichier demandé. Pour vos recherches, le serveur voit uniquement le nom d’un petit fichier (par exemple les deux premières lettres d’un nom), jamais le texte complet que vous avez saisi.` },
  { h: 'Données de démonstration' },
  { p: 'Les candidats affichés sont fictifs. En cas de déploiement réel, le responsable du traitement serait l’autorité organisatrice de l’examen, qui devra compléter cette page.' },
  { h: 'Vos droits' },
  { p: `Pour toute question ou demande (accès, effacement), écrivez à ${EDITOR.email}.` },
]

export const TERMS = [
  { h: 'Objet' },
  { p: 'Ces conditions encadrent l’utilisation de la démonstration « Ndeze Natidja ». En utilisant le site, vous les acceptez.' },
  { h: 'Usage autorisé' },
  { ul: [
    'consulter et évaluer la démonstration ;',
    'installer l’application sur votre appareil ;',
    'partager le lien du site.',
  ] },
  { h: 'Usage interdit' },
  { ul: [
    'présenter les résultats affichés comme réels ou officiels ;',
    'fabriquer ou modifier des attestations pour tromper un tiers ;',
    'télécharger massivement les données par des moyens automatisés ou perturber le fonctionnement du site ;',
    'copier ou réutiliser le code et le design sans autorisation écrite (voir « Licence »).',
  ] },
  { h: 'Disponibilité et garanties' },
  { p: 'Le site est fourni « en l’état », sans garantie de disponibilité ou d’exactitude. Il peut être modifié ou interrompu à tout moment.' },
  { h: 'Droit applicable' },
  { p: 'Ces conditions sont soumises au droit français. Pour toute question : ' + EDITOR.email + '.' },
]

// Composants libres embarqués dans le site (tous sous licence MIT).
export const COMPOSANTS = [
  { nom: 'React', role: 'Construction de l’interface', licence: 'MIT' },
  { nom: 'Vite', role: 'Outil de fabrication du site', licence: 'MIT' },
  { nom: 'Workbox / vite-plugin-pwa', role: 'Mode hors-ligne et installation', licence: 'MIT' },
  { nom: 'qrcode-generator', role: 'Génération des QR codes', licence: 'MIT' },
]

export const LICENCE_REGLES = [
  { h: 'Droits réservés' },
  { p: `© ${EDITOR.year} ${EDITOR.name} — Tous droits réservés. Le code source, le design, les animations et les textes de « Ndeze Natidja » sont la propriété de ${EDITOR.name}.` },
  { h: 'Ce que vous pouvez faire' },
  { ul: ['consulter la démonstration et l’évaluer ;', 'la présenter à des tiers avec mention de l’auteur.'] },
  { h: 'Ce qui nécessite une autorisation écrite' },
  { ul: [
    'déployer le site ou l’application pour un usage réel ;',
    'copier, modifier ou redistribuer le code ou le design ;',
    'utiliser le nom « Ndeze Natidja » ou la signature « M.M.B.T » dans un autre produit.',
  ] },
  { p: `Pour toute demande : ${EDITOR.email}.` },
  { h: 'Composants libres' },
  { p: 'Le site s’appuie sur les logiciels libres ci-dessous, utilisés selon les termes de leur licence MIT (qui autorise leur réutilisation, à condition de conserver la mention de copyright de leurs auteurs). Ils restent la propriété de leurs auteurs respectifs.' },
]

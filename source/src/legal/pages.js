// ============================================================================
// Contenu des pages légales (français), rédigé en articles numérotés.
// Chaque page est une liste de blocs :
//   { h: 'titre' }  { p: 'paragraphe' }  { ul: ['puce', ...] }  { small: 'note' }
// Les informations d'éditeur viennent de config.js ; ce qui est vide est omis.
//
// ⚠️ IMPORTANT : ces textes sont rédigés selon le droit français (références aux
// textes en vigueur) mais ils ne remplacent pas l'avis d'un avocat. Avant tout
// déploiement officiel auprès d'une administration, faites-les relire.
// ============================================================================
import { EDITOR, HOST } from './config.js'

export const MAJ = '31 octobre 2026'
const si = (condition, ...blocs) => (condition ? blocs : [])
const maj = { small: `Dernière mise à jour : ${MAJ}` }

// ---------------------------------------------------------------- MENTIONS
export const MENTIONS = [
  maj,
  { p: 'Conformément à l’article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN), les présentes mentions légales sont portées à la connaissance des utilisateurs du site « Ndeze Natidja ».' },
  { h: 'Article 1 – Éditeur du site' },
  { p: `Le site est édité à titre personnel par ${EDITOR.person} (${EDITOR.name}).` },
  { ul: [
    `Site internet : ${EDITOR.website}`,
    `Adresse électronique : ${EDITOR.email}`,
    ...si(EDITOR.publisher, `Directeur de la publication : ${EDITOR.publisher}`),
    ...si(EDITOR.address, `Adresse : ${EDITOR.address}`),
    ...si(EDITOR.siret, `SIRET : ${EDITOR.siret}`),
  ] },
  { h: 'Article 2 – Hébergeur' },
  { p: `Le site est hébergé par ${HOST.name}, ${HOST.address} (${HOST.website}).` },
  { h: 'Article 3 – Nature du site' },
  { p: 'Le site « Ndeze Natidja » est une démonstration technique d’un service de consultation de résultats d’examens. L’ensemble des candidats, numéros de table, établissements et résultats présentés est fictif et dépourvu de toute valeur officielle.' },
  { p: 'Les références au « Ministère de l’Éducation Nationale » et à l’« Office National des Examens et Concours » ont pour seul objet d’illustrer le service envisagé. Le site n’est affilié à aucune administration et n’émet aucun document officiel. Toute attestation affichée est une simulation.' },
  { h: 'Article 4 – Propriété intellectuelle' },
  { p: 'Le site, son code source, son design, ses animations, ses textes et sa signature sont des œuvres de l’esprit protégées par le Code de la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite. Le détail figure dans la page « Licence ».' },
  { h: 'Article 5 – Données personnelles et traceurs' },
  { p: 'Le site n’utilise aucun cookie. L’hébergeur peut produire des statistiques de fréquentation globales et anonymes. Le détail figure dans la page « Confidentialité ».' },
  { h: 'Article 6 – Responsabilité' },
  { p: 'L’éditeur met tout en œuvre pour assurer l’accès et le bon fonctionnement du site, sans y être tenu par une obligation de résultat. Il ne saurait être tenu responsable des dommages résultant de l’utilisation du site, ni de l’utilisation des contenus de démonstration en dehors de leur contexte, dans la mesure permise par la loi.' },
  { h: 'Article 7 – Liens hypertextes' },
  { p: 'Les liens vers des sites tiers (réseaux sociaux notamment) sont fournis à titre d’information. L’éditeur n’exerce aucun contrôle sur leur contenu et décline toute responsabilité à ce titre.' },
  { h: 'Article 8 – Droit applicable' },
  { p: 'Les présentes mentions sont régies par le droit français. En cas de litige, les juridictions françaises sont seules compétentes, sous réserve des règles impératives de compétence.' },
  { h: 'Article 9 – Contact' },
  { p: `Pour toute question ou signalement de contenu : ${EDITOR.email}.` },
]

// ----------------------------------------------------------- CONFIDENTIALITÉ
export const PRIVACY = [
  maj,
  { p: 'La présente politique informe les utilisateurs du traitement de leurs données, conformément au règlement (UE) 2016/679 du 27 avril 2016 (RGPD) et à la loi n° 78-17 du 6 janvier 1978 relative à l’informatique, aux fichiers et aux libertés.' },
  { h: 'Article 1 – Responsable du traitement' },
  { p: `${EDITOR.person} (${EDITOR.name}), éditeur à titre personnel du site ${EDITOR.websiteLabel}, joignable à l’adresse ${EDITOR.email}.` },
  { h: 'Article 2 – Principe : aucune collecte de données personnelles' },
  { p: 'Le site ne propose ni compte, ni formulaire de collecte, ni publicité. Il n’utilise aucun cookie et aucun traceur, et l’éditeur n’y a installé aucun outil de mesure d’audience ni de publicité. L’éditeur ne collecte donc aucune donnée personnelle sur les visiteurs.' },
  { h: 'Article 3 – Données stockées sur votre appareil' },
  { p: 'Pour votre confort, le site enregistre localement, sur votre appareil uniquement et sans transmission au serveur :' },
  { ul: [
    'vos préférences d’affichage (thème clair ou sombre, couleur, langue) ;',
    'l’information selon laquelle l’écran d’ouverture a déjà été affiché (durée de la session) ;',
    'une copie des fichiers de résultats consultés, afin de permettre l’usage hors-ligne.',
  ] },
  { p: 'Ces éléments sont strictement nécessaires au service demandé et à son confort d’utilisation ; ils ne servent à aucun suivi, au sens de l’article 82 de la loi du 6 janvier 1978, et ne requièrent donc pas de consentement. Vous pouvez les supprimer à tout moment depuis les réglages de votre navigateur.' },
  { h: 'Article 4 – Journaux techniques de l’hébergeur' },
  { p: `Comme tout service en ligne, l’hébergeur (${HOST.name}) enregistre des journaux techniques (adresse IP, date et heure, ressource demandée) nécessaires à la sécurité et au fonctionnement du service, sur le fondement de l’intérêt légitime (article 6.1.f du RGPD). Ces journaux sont conservés par l’hébergeur dans les limites prévues par la réglementation applicable.` },
  { p: 'À partir de ces journaux, l’hébergeur produit des statistiques de fréquentation globales (nombre de visites, pages vues, pays) au moyen de l’outil OVHcloud Web Statistics. Elles ne permettent pas d’identifier les visiteurs et n’utilisent aucun cookie.' },
  { p: 'Lors d’une recherche, le serveur ne reçoit que le nom d’un petit fichier de données (par exemple, les deux premières lettres d’un nom), jamais le texte complet saisi.' },
  { h: 'Article 5 – Données de démonstration' },
  { p: 'Les candidats et résultats affichés sont fictifs ; ils ne se rapportent à aucune personne réelle. En cas de déploiement réel, l’autorité organisatrice de l’examen serait responsable du traitement et devrait compléter cette politique, en particulier pour les données de candidats mineurs.' },
  { h: 'Article 6 – Destinataires et transferts' },
  { p: 'Aucune donnée n’est communiquée à des tiers par l’éditeur. L’éditeur n’effectue aucun transfert de données en dehors de l’Union européenne.' },
  { h: 'Article 7 – Vos droits' },
  { p: 'Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité (articles 15 à 22 du RGPD). Pour les exercer : ' + EDITOR.email + '.' },
  { p: 'Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission nationale de l’informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — www.cnil.fr.' },
  { h: 'Article 8 – Modification' },
  { p: 'La présente politique peut être modifiée ; la date de dernière mise à jour figure en tête de page.' },
]

// ----------------------------------------------------- CONDITIONS D'UTILISATION
export const TERMS = [
  maj,
  { h: 'Article 1 – Objet' },
  { p: `Les présentes conditions générales d’utilisation (CGU) encadrent l’accès et l’utilisation du site de démonstration « Ndeze Natidja », édité à titre personnel par ${EDITOR.person} (${EDITOR.name}).` },
  { h: 'Article 2 – Acceptation' },
  { p: 'L’utilisation du site vaut acceptation pleine et entière des présentes CGU. Si vous ne les acceptez pas, vous devez cesser d’utiliser le site.' },
  { h: 'Article 3 – Description du service' },
  { p: 'Le site permet de consulter, à titre de démonstration, des résultats d’examens fictifs, de générer des attestations simulées et d’en vérifier la cohérence. Il est accessible gratuitement, depuis un navigateur ou sous forme d’application installable.' },
  { h: 'Article 4 – Usages autorisés' },
  { ul: [
    'consulter et évaluer la démonstration ;',
    'installer l’application sur son appareil ;',
    'partager le lien du site avec mention de son auteur.',
  ] },
  { h: 'Article 5 – Usages interdits' },
  { p: 'Il est strictement interdit :' },
  { ul: [
    'de présenter les résultats ou attestations affichés comme réels ou officiels ;',
    'de fabriquer, modifier ou diffuser une attestation dans le but de tromper un tiers, ces agissements pouvant constituer un faux et un usage de faux (article 441-1 du Code pénal) ;',
    'd’extraire massivement les données par des moyens automatisés, ou de perturber le fonctionnement du site ;',
    'de tenter d’accéder frauduleusement au système ou d’en altérer le fonctionnement (articles 323-1 et suivants du Code pénal) ;',
    'de copier, adapter ou réutiliser le code et le design sans autorisation écrite (voir la page « Licence »).',
  ] },
  { h: 'Article 6 – Propriété intellectuelle' },
  { p: 'Les droits sur le site sont réservés ; ils sont détaillés dans la page « Licence », qui fait partie intégrante des présentes CGU.' },
  { h: 'Article 7 – Disponibilité' },
  { p: 'Le site est fourni « en l’état » et peut être modifié, suspendu ou supprimé à tout moment, sans préavis, notamment pour maintenance.' },
  { h: 'Article 8 – Responsabilité' },
  { p: 'Dans les limites autorisées par la loi, l’éditeur n’est pas responsable des dommages directs ou indirects résultant de l’utilisation du site ou de son indisponibilité. Aucune stipulation des présentes ne limite une responsabilité qui ne peut l’être en vertu de la loi.' },
  { h: 'Article 9 – Modification des CGU' },
  { p: 'L’éditeur peut modifier les présentes CGU à tout moment. La version applicable est celle publiée sur le site à la date de l’utilisation.' },
  { h: 'Article 10 – Droit applicable et juridiction' },
  { p: 'Les présentes CGU sont soumises au droit français. À défaut de résolution amiable, tout litige relève des juridictions françaises compétentes.' },
  { h: 'Article 11 – Contact' },
  { p: `Toute question : ${EDITOR.email}.` },
]

// ----------------------------------------------------------------- LICENCE
export const LICENCE_REGLES = [
  maj,
  { h: 'Article 1 – Œuvre protégée' },
  { p: `« Ndeze Natidja » (code source, logiciel, interface, design, animations, textes, illustrations et signature « ${EDITOR.name} ») est une œuvre de l’esprit originale, protégée par le Code de la propriété intellectuelle, notamment ses articles L111-1 (droit d’auteur) et L112-2 (protection des logiciels).` },
  { p: `Copyright © ${EDITOR.year} ${EDITOR.name}. Tous droits réservés.` },
  { h: 'Article 2 – Titularité' },
  { p: `${EDITOR.person}, connu sous le nom ${EDITOR.name}, est seul titulaire des droits patrimoniaux et moraux sur l’œuvre, y compris le droit au respect de son nom et de son œuvre (article L121-1 du Code de la propriété intellectuelle), sous réserve des composants libres mentionnés à l’article 7.` },
  { h: 'Article 3 – Droit d’usage concédé' },
  { p: 'L’utilisateur bénéficie d’un droit personnel, non exclusif, non transférable, non sous-licenciable et révocable à tout moment, limité à :' },
  { ul: [
    'consulter le site et l’évaluer, à titre de démonstration ;',
    'installer l’application sur ses propres appareils ;',
    'présenter la démonstration à des tiers, en mentionnant son auteur.',
  ] },
  { h: 'Article 4 – Actes soumis à autorisation écrite préalable' },
  { p: 'Sauf exceptions légales impératives (notamment celles prévues aux articles L122-5 et L122-6-1 du Code de la propriété intellectuelle), sont interdits sans autorisation écrite préalable de l’éditeur :' },
  { ul: [
    'toute reproduction, représentation, adaptation, traduction, modification ou diffusion, totale ou partielle, du code, du design ou des textes ;',
    'tout déploiement du site ou de l’application pour un usage réel ou commercial, y compris auprès d’une administration ;',
    'toute extraction ou réutilisation systématique des contenus et des données ;',
    `toute utilisation de la dénomination « Ndeze Natidja » ou de la signature « ${EDITOR.name} » pour un autre produit ou service ;`,
    'la suppression ou la modification des mentions d’auteur et de droits.',
  ] },
  { h: 'Article 5 – Exploitation par une institution ou une administration' },
  { p: `Toute adoption de « Ndeze Natidja » par un ministère, un organisme public ou une organisation, y compris pour en faire un service officiel, ne peut résulter que d’une licence d’exploitation écrite, signée de ${EDITOR.person} (${EDITOR.name}), précisant son objet, sa durée et son étendue.` },
  { p: 'Une telle licence ne vaut jamais cession des droits d’auteur : sauf stipulation écrite expresse contraire, l’œuvre demeure la propriété de son auteur, qui conserve le droit au respect de son nom et de son œuvre.' },
  { h: 'Article 6 – Sanctions' },
  { p: 'Toute reproduction ou représentation intégrale ou partielle faite sans le consentement de l’auteur est illicite (article L122-4 du Code de la propriété intellectuelle). Elle constitue le délit de contrefaçon, notamment sanctionné par les articles L335-2 et L335-3 du même code (jusqu’à trois ans d’emprisonnement et 300 000 euros d’amende, hors circonstances aggravantes), sans préjudice de dommages et intérêts devant les juridictions civiles.' },
  { h: 'Article 7 – Composants libres' },
  { p: 'Le site intègre des composants logiciels libres, utilisés conformément aux termes de leurs licences. Leurs mentions de droits d’auteur et leurs licences sont reproduites dans le fichier « licences-tierces.txt », fourni avec le site. Ces composants demeurent la propriété de leurs auteurs respectifs et ne sont pas concernés par les articles 3 à 5.' },
  { h: 'Article 8 – Données de démonstration' },
  { p: 'Les candidats, numéros et résultats sont entièrement fictifs. Ils ne peuvent être présentés comme réels, ni réutilisés à des fins de tromperie.' },
  { h: 'Article 9 – Droit applicable et demandes d’autorisation' },
  { p: `La présente licence est régie par le droit français ; à défaut de résolution amiable, les juridictions françaises compétentes sont seules compétentes. Toute demande d’autorisation : ${EDITOR.email}.` },
]

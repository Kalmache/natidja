// ============================================================================
// autorisation.js – rédige AUTOMATIQUEMENT l'e-mail de « demande d'autorisation »
// ----------------------------------------------------------------------------
// La licence est « Tous droits réservés » : tout usage au-delà de la simple
// consultation (utiliser l'application dans une organisation, reprendre du code,
// du design, le nom, nouer un partenariat...) exige une autorisation écrite.
// Cette fonction transforme quelques réponses (type de demande, organisme, nom...)
// en un e-mail complet, rédigé sur un ton officiel, prêt à être envoyé.
//
// Rien n'est transmis par le site : l'e-mail s'ouvre dans la messagerie de la
// personne (lien « mailto: »), qui l'envoie, ou non, de sa propre initiative.
// ============================================================================
import { EDITOR } from './config.js'

/** Les natures de demande proposées : { identifiant: [libellé court, phrase dans l'e-mail] }. */
export const TYPES_DEMANDE = {
  usage: ['Utiliser l’application', 'utiliser l’application « Ndeze Natidja » au sein de mon organisation, y compris, le cas échéant, comme service officiel'],
  reproduction: ['Reprendre du code, du design ou des textes', 'reproduire, adapter ou réutiliser tout ou partie du code, du design ou des textes de l’application'],
  signature: ['Reprendre le nom ou la signature', 'reprendre le nom « Ndeze Natidja » ou la signature « M.M.B.T »'],
  partenariat: ['Partenariat ou licence d’exploitation', 'conclure un partenariat ou une licence d’exploitation relatifs à l’application'],
  autre: ['Autre demande', 'obtenir une autorisation dont la nature est précisée ci-dessous'],
}

const A_COMPLETER = (libelle) => `[${libelle} — à compléter]`
const nettoyer = (texte, max) => String(texte ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max)

/**
 * @param {object} d { type, organisme, nom, fonction, precisions, version, date }
 * @returns {{ objet: string, corps: string, lien: string }}  `lien` = adresse « mailto: » complète
 */
export function redigerDemandeAutorisation({ type = 'usage', organisme = '', nom = '', fonction = '', precisions = '', version = '', date = new Date() } = {}) {
  const [libelle, phrase] = TYPES_DEMANDE[type] ?? TYPES_DEMANDE.autre
  const org = nettoyer(organisme, 120) || A_COMPLETER('nom de l’organisme')
  const demandeur = nettoyer(nom, 100) || A_COMPLETER('vos nom et prénom')
  const fonctionTexte = nettoyer(fonction, 100)
  // Les précisions gardent leurs retours à la ligne, mais pas plus de 1 200 caractères
  // (les adresses « mailto: » trop longues sont refusées par certaines messageries).
  const details = String(precisions ?? '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1200)
  const jour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)

  const objet = `Demande d’autorisation – Ndeze Natidja – ${libelle}`
  const corps = [
    'Madame, Monsieur,',
    '',
    `Je me permets de vous adresser une demande d’autorisation relative à l’application « Ndeze Natidja »${version ? ` (version ${nettoyer(version, 20)})` : ''}, œuvre de ${EDITOR.person} (${EDITOR.name}), protégée par le Code de la propriété intellectuelle.`,
    '',
    `Nature de la demande : ${libelle.toLowerCase()}.`,
    `Je souhaite ${phrase}.`,
    '',
    `Organisme : ${org}`,
    `Demandeur : ${demandeur}${fonctionTexte ? `, ${fonctionTexte}` : ''}`,
    ...(details ? ['', 'Précisions (objet, durée, étendue, public concerné) :', details] : []),
    '',
    'Je reconnais qu’en l’absence d’autorisation écrite préalable, aucun usage au-delà de la simple consultation de l’application n’est permis. Je vous remercie de bien vouloir m’indiquer les conditions éventuelles de cette autorisation ainsi que la suite à donner à ma demande.',
    '',
    'Dans l’attente de votre réponse, je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
    '',
    demandeur,
    ...(fonctionTexte ? [fonctionTexte] : []),
    org,
    `Fait le ${jour}`,
  ].join('\n')

  // encodeURIComponent protège les caractères spéciaux (&, =, retours à la ligne...) : le texte saisi
  // ne peut pas ajouter de destinataire caché (Cci:) ni modifier l'objet.
  const lien = `mailto:${EDITOR.email}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps).replace(/%0A/g, '%0D%0A')}`
  return { objet, corps, lien }
}

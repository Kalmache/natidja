// Tests de la rédaction automatique de l'e-mail de demande d'autorisation.
import { describe, expect, it } from 'vitest'
import { redigerDemandeAutorisation, redigerDemandeDemonstration, redigerDemandeInformations, TYPES_DEMANDE } from '../src/legal/autorisation.js'

const date = new Date(2026, 9, 31)
const exemple = { type: 'usage', organisme: 'Ministère de l’Éducation Nationale', nom: 'Amina Said', fonction: 'Directrice de cabinet', precisions: 'Usage national pour la session juin 2026.', version: '2.6.0', date }

describe('e-mail de demande d’autorisation', () => {
  it('rédige un e-mail complet, adressé à l’éditeur, avec les informations saisies', () => {
    const { objet, corps, lien } = redigerDemandeAutorisation(exemple)
    expect(objet).toBe('Demande d’autorisation – Ndeze Natidja – Utiliser l’application')
    expect(corps).toContain('Madame, Monsieur,')
    expect(corps).toContain('version 2.6.0')
    expect(corps).toContain('Maabadi Ben Tamou (M.M.B.T)')
    expect(corps).toContain('Organisme : Ministère de l’Éducation Nationale')
    expect(corps).toContain('Demandeur : Amina Said, Directrice de cabinet')
    expect(corps).toContain('Usage national pour la session juin 2026.')
    expect(corps).toContain('Fait le 31 octobre 2026')
    expect(corps).toContain('salutations distinguées')
    expect(lien.startsWith('mailto:contact@mmbt.fr?subject=')).toBe(true)
  })

  it('le lien contient exactement le texte (décodé) et des retours à la ligne que les messageries comprennent', () => {
    const { corps, objet, lien } = redigerDemandeAutorisation(exemple)
    const params = new URLSearchParams(lien.split('?')[1])
    expect(params.get('subject')).toBe(objet)
    expect(params.get('body')).toBe(corps.replace(/\n/g, '\r\n'))
    expect(lien).not.toMatch(/[\r\n]/) // l'adresse elle-même ne contient aucun saut de ligne brut
  })

  it('laisse des repères « à compléter » quand les champs sont vides', () => {
    const { corps } = redigerDemandeAutorisation({ date })
    expect(corps).toContain('[nom de l’organisme — à compléter]')
    expect(corps).toContain('[vos nom et prénom — à compléter]')
  })

  it('propose toutes les natures de demande avec un objet différent', () => {
    const objets = Object.keys(TYPES_DEMANDE).map((type) => redigerDemandeAutorisation({ type, date }).objet)
    expect(new Set(objets).size).toBe(Object.keys(TYPES_DEMANDE).length)
  })

  it('un texte malveillant ne peut pas ajouter de destinataire caché ni changer l’objet', () => {
    const piege = 'Moi\r\nBcc: pirate@exemple.com&bcc=pirate@exemple.com&subject=Piege'
    const { lien } = redigerDemandeAutorisation({ ...exemple, nom: piege, organisme: piege, precisions: piege })
    const [, requete] = lien.split('?')
    const cles = [...new URLSearchParams(requete).keys()]
    expect(cles).toEqual(['subject', 'body']) // aucun paramètre ajouté
    expect(new URLSearchParams(requete).get('subject')).toBe('Demande d’autorisation – Ndeze Natidja – Utiliser l’application')
    expect(lien.split('?')[0]).toBe('mailto:contact@mmbt.fr') // un seul destinataire
  })

  it('limite la longueur (les adresses mailto trop longues sont refusées par certaines messageries)', () => {
    const { corps, lien } = redigerDemandeAutorisation({ ...exemple, precisions: 'a'.repeat(5000), organisme: 'b'.repeat(500) })
    expect(corps.length).toBeLessThan(2500)
    expect(lien.length).toBeLessThan(4500)
  })
})

describe('e-mail « Demander des informations » (Espace responsable)', () => {
  const mail = redigerDemandeInformations({ version: '2.8.0', date })

  it('s’ouvre DÉJÀ rédigé : objet, texte officiel, questions posées, signature, adressé à l’éditeur', () => {
    expect(mail.objet).toBe('Demande d’informations – Espace responsable – Ndeze Natidja')
    expect(mail.corps).toContain('Madame, Monsieur,')
    expect(mail.corps).toContain('console de publication')
    expect(mail.corps).toContain('version 2.8.0')
    expect(mail.corps).toContain('validation par deux personnes')
    expect(mail.corps).toContain('protection des données personnelles')
    expect(mail.corps).toContain('Fait le 31 octobre 2026')
    expect(mail.corps).toContain('salutations distinguées')
    expect(mail.lien.startsWith('mailto:contact@mmbt.fr?subject=')).toBe(true)
  })

  it('laisse des repères « à compléter » pour ce que seule la personne connaît', () => {
    expect(mail.corps).toContain('[nom de l’organisme — à compléter]')
    expect(mail.corps).toContain('[vos nom, prénom et fonction — à compléter]')
  })

  it('le lien contient exactement le texte, avec des retours à la ligne compris par les messageries', () => {
    const params = new URLSearchParams(mail.lien.split('?')[1])
    expect(params.get('subject')).toBe(mail.objet)
    expect(params.get('body')).toBe(mail.corps.replace(/\n/g, '\r\n'))
    expect([...params.keys()]).toEqual(['subject', 'body'])
    expect(mail.lien).not.toMatch(/[\r\n]/)
  })
})

describe('e-mail « Demander une démonstration »', () => {
  const mail = redigerDemandeDemonstration({ version: '3.2.0', date })
  it('s’ouvre déjà rédigé, adressé à l’éditeur, avec des repères à compléter', () => {
    expect(mail.objet).toBe('Demande de démonstration – Ndeze Natidja')
    expect(mail.corps).toContain('assister à une démonstration')
    expect(mail.corps).toContain('version 3.2.0')
    expect(mail.corps).toContain('[nom de l’organisme — à compléter]')
    expect(mail.corps).toContain('salutations distinguées')
    expect(mail.lien.startsWith('mailto:contact@mmbt.fr?subject=')).toBe(true)
    expect([...new URLSearchParams(mail.lien.split('?')[1]).keys()]).toEqual(['subject', 'body'])
  })
})

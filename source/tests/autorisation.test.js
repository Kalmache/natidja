// Tests de la rédaction automatique de l'e-mail de demande d'autorisation.
import { describe, expect, it } from 'vitest'
import { redigerDemandeAutorisation, TYPES_DEMANDE } from '../src/legal/autorisation.js'

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

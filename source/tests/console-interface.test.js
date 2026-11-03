// ============================================================================
// tests/console-interface.test.js – l'interface de la console s'affiche vraiment
// ----------------------------------------------------------------------------
// Pourquoi ce test ? Un oubli (une fonction appelée mais jamais écrite) avait fait planter l'AFFICHAGE
// après la connexion : le serveur acceptait le code, mais l'écran restait figé, sans message.
// Les autres tests ne regardaient que le serveur. Celui-ci fait tourner le VRAI fichier app.js
// avec un faux document minimal et de fausses réponses du serveur, puis lit ce qui s'affiche.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

class Noeud {}
class Elt extends Noeud {
  constructor(tag) { super(); this.tag = tag; this.enfants = []; this.attrs = {}; this.className = ''; this.value = ''; this.style = {}; this.classList = { add() {}, remove() {}, toggle() {} } }
  addEventListener() {} removeEventListener() {} setAttribute(k, v) { this.attrs[k] = v } append(...c) { this.enfants.push(...c) } appendChild(c) { this.enfants.push(c); return c }
  replaceChildren(...c) { this.enfants = c } focus() {} remove() {}
}
class Txt extends Noeud { constructor(t) { super(); this.t = t } }
const texte = (n) => (n instanceof Txt ? n.t : n.enfants.map(texte).join(' '))

const SOURCE = readFileSync(new URL('../console/public/app.js', import.meta.url), 'utf8')
const maintenant = new Date().toISOString()
const prop = (id, statut, plus = {}) => ({
  id, session: 'bac-2026', statut, auteur: { id: 'u1', nom: 'preparateur1', affichage: 'Directeur Kabir Illiassa' }, creeLe: maintenant,
  resume: { avant: { total: 3500, admis: 1600, second: 709, ajournes: 1191, taux: '45.7%' }, apres: { total: 3500, admis: 1600, second: 709, ajournes: 1191, taux: '45.7%', parIle: { ngazidja: 1754 } }, alertes: [],
    modifications: { ajoutes: 0, supprimes: 0, modifies: 1, tronque: false, lignes: [{ tableNumber: 'BAC-26-00001', nom: 'ATTOUMANE Zaïnaba', type: 'modifie', champs: [{ champ: 'average', avant: 10.2, apres: 15.25 }] }] } },
  ...plus,
})
const approuvee = { par: { id: 'u2', nom: 'approbateur1', affichage: 'Proviseur Dr Hachim' }, le: maintenant }
const REPONSES = {
  '/api/etat': { etape: 'ok', csrf: 'c', utilisateur: { nom: 'admin1', roles: ['admin'], affichage: 'Maabadi Ben Tamou' } },
  '/api/propositions': [
    prop('p1', 'publiee', { approbation: approuvee, publieLe: maintenant }),
    prop('p2', 'proposee'),
    prop('p3', 'refusee', { refus: { par: approuvee.par, le: maintenant, motif: 'erreur' } }),
    prop('p4', 'annulee', { annulation: { par: approuvee.par, le: maintenant } }),
  ],
  '/api/propositions/p1': { ...prop('p1', 'publiee', { approbation: approuvee, publieLe: maintenant }), fichier: { nom: 'r.xlsx', taille: 2048, sha256: 'abcdef0123456789' }, avertissements: [], echantillon: [], baseObsolete: false, donneesPurgees: false },
}

async function lancer() {
  const racine = new Elt('div')
  const document = { getElementById: () => racine, createElement: (t) => new Elt(t), createElementNS: (ns, t) => new Elt(t), createTextNode: (t) => new Txt(t), addEventListener() {}, body: new Elt('body') }
  const fetch = async (chemin) => ({ status: 200, ok: true, json: async () => REPONSES[String(chemin).split('?')[0]] ?? {} })
  const ctx = vm.createContext({ document, Node: Noeud, fetch, confirm: () => true, console, URL, Date, JSON, Math, Promise, Array, Object, Number, String, setTimeout, clearTimeout, history: {}, location: { hash: '' }, navigator: {}, Intl })
  vm.runInContext(SOURCE, ctx)
  await new Promise((r) => setTimeout(r, 60)) // le temps que « recharger() » ait dessiné
  return { ctx, racine }
}

describe('interface de la console', () => {
  it('après la connexion, la liste des propositions s’affiche (avec « Validée par » et les titres des personnes)', async () => {
    const { racine } = await lancer()
    const t = texte(racine)
    expect(t).not.toContain('rencontré une erreur')
    expect(t).toContain('Propositions de publication')
    expect(t).toContain('Validée par')
    expect(t).toContain('Directeur Kabir Illiassa')   // déposée par
    expect(t).toContain('Proviseur Dr Hachim')        // validée par
    expect(t).toContain('Refusée par')
    expect(t).toContain('Annulée par')
    expect(t).toContain('en attente')
    expect(t).toContain('Maabadi Ben Tamou')          // l'en-tête montre le titre du compte connecté
  })

  it('le détail d’une proposition s’affiche (lignes modifiées comprises)', async () => {
    const { ctx, racine } = await lancer()
    vm.runInContext("vue = { onglet: 'detail', id: 'p1' }", ctx)
    await vm.runInContext('afficher()', ctx)
    const t = texte(racine)
    expect(t).not.toContain('rencontré une erreur')
    expect(t).toContain('Lignes modifiées')
    expect(t).toContain('BAC-26-00001')
    expect(t).toContain('Approuvée par')
  })

  it('une erreur d’affichage n’est jamais silencieuse : un message clair s’affiche', async () => {
    const { ctx, racine } = await lancer()
    vm.runInContext("decision = () => { throw new Error('panne simulée') }", ctx)   // on simule un défaut dans le dessin de la liste
    vm.runInContext("vue = { onglet: 'propositions', id: null }", ctx)
    await vm.runInContext('afficher()', ctx)
    expect(texte(racine)).toContain('panne simulée')
  })
})

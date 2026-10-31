// ============================================================================
// Tests des sessions : créer « Bac 2027 », la garder cachée tant que rien n'est publié,
// la montrer à la première publication, et choisir examen / année / édition.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { creerSession, identifiantSession } from '../scripts/lib/sessions.mjs'
import { majConfig } from '../scripts/lib/resultats.mjs'
import { choisirSession, configPublique, optionsSessions, trierSessions } from '../src/lib/sessions.js'

const config = JSON.parse(readFileSync(new URL('../../data/exams.json', import.meta.url), 'utf8'))
const erreurDe = (f) => { try { f() } catch (e) { return e } return null }

describe('création d’une session (côté console)', () => {
  it('crée un BROUILLON qui reprend titre, îles (à zéro) et séries de l’examen précédent', () => {
    const { config: apres, session } = creerSession(config, { examType: 'BAC', year: 2027 })
    expect(session).toMatchObject({ id: 'bac-2027', examType: 'BAC', year: 2027, status: 'DRAFT', sessionKind: 'PRINCIPALE', sessionDate: 'Session 2027' })
    expect(session.title).toBe('Baccalauréat Général & Technique')
    expect(session.series).toEqual(['A1', 'A4', 'C', 'D', 'G'])
    expect(session.islands.map((i) => i.id)).toEqual(['ngazidja', 'ndzuwani', 'mwali'])
    expect(session.islands.every((i) => i.candidatesCount === 0)).toBe(true)
    expect(session.stats).toEqual({ total: 0, admitted: 0, oralSecondGroup: 0, successRate: '0.0%' })
    expect(apres.sessions).toHaveLength(config.sessions.length + 1)
  })

  it('ne touche ni à la date de mise à jour ni à la session par défaut, et ne modifie pas l’original', () => {
    const copie = JSON.stringify(config)
    const { config: apres } = creerSession(config, { examType: 'BEPC', year: 2027, libelle: 'Juin 2027' })
    expect(apres.updatedAt).toBe(config.updatedAt)
    expect(apres.defaultSessionId).toBe(config.defaultSessionId)
    expect(JSON.stringify(config)).toBe(copie)
  })

  it('distingue la session principale et le rattrapage, avec un identifiant différent', () => {
    expect(identifiantSession('BAC', 2027)).toBe('bac-2027')
    expect(identifiantSession('BAC', 2027, 'RATTRAPAGE')).toBe('bac-2027-rattrapage')
    const { session } = creerSession(config, { examType: 'bac', year: 2027, genre: 'RATTRAPAGE' })
    expect(session).toMatchObject({ id: 'bac-2027-rattrapage', sessionKind: 'RATTRAPAGE', sessionDate: 'Rattrapage 2027' })
  })

  it('le BEPC n’a pas de séries ; le Bac accepte des séries personnalisées (nettoyées)', () => {
    expect(creerSession(config, { examType: 'BEPC', year: 2027, series: ['X'] }).session.series).toEqual([])
    expect(creerSession(config, { examType: 'BAC', year: 2027, series: 'a1, c ; d' }).session.series).toEqual(['A1', 'C', 'D'])
  })

  it('refuse les demandes invalides, avec un message clair', () => {
    expect(erreurDe(() => creerSession(config, { examType: 'CAP', year: 2027 })).message).toMatch(/Examen inconnu/)
    expect(erreurDe(() => creerSession(config, { examType: 'BAC', year: 1999 })).message).toMatch(/Année invalide/)
    expect(erreurDe(() => creerSession(config, { examType: 'BAC', year: 'abc' })).message).toMatch(/Année invalide/)
    expect(erreurDe(() => creerSession(config, { examType: 'BAC', year: 2027, genre: 'X' })).message).toMatch(/Édition inconnue/)
    expect(erreurDe(() => creerSession(config, { examType: 'BAC', year: 2027, libelle: 'x'.repeat(41) })).message).toMatch(/trop long/)
    expect(erreurDe(() => creerSession(config, { examType: 'BAC', year: 2027, series: '' })).message).toMatch(/au moins une série/)
    expect(erreurDe(() => creerSession(config, { examType: 'BAC', year: 2027, series: 'A1, A1' })).message).toMatch(/deux fois/)
    expect(erreurDe(() => creerSession(config, { examType: 'BAC', year: 2027, series: '<script>' })).message).toMatch(/lettres ou chiffres/)
  })

  it('refuse un doublon (409)', () => {
    const e = erreurDe(() => creerSession(config, { examType: 'BAC', year: 2026 }))
    expect(e.statut).toBe(409)
    const { config: c2 } = creerSession(config, { examType: 'BAC', year: 2027 })
    expect(erreurDe(() => creerSession(c2, { examType: 'BAC', year: 2027 })).statut).toBe(409)
  })
})

describe('première publication d’une session créée en brouillon', () => {
  const candidats = [{ id: 'x', tableNumber: 'BAC-27-00001', status: 'ADMIS', islandId: 'ngazidja' }, { id: 'y', tableNumber: 'BAC-27-00002', status: 'AJOURNE', islandId: 'mwali' }]

  it('la session devient publique ET session par défaut, avec ses vrais chiffres', () => {
    const { config: brouillon } = creerSession(config, { examType: 'BAC', year: 2027 })
    const apres = majConfig(brouillon, 'bac-2027', candidats, new Date('2027-07-15T10:00:00Z'))
    const s = apres.sessions.find((x) => x.id === 'bac-2027')
    expect(s.status).toBe('PUBLISHED')
    expect(apres.defaultSessionId).toBe('bac-2027')
    expect(s.stats).toMatchObject({ total: 2, admitted: 1 })
    expect(apres.updatedAt).toBe('2027-07-15T10:00:00.000Z')
  })

  it('une session DÉJÀ publiée ne change pas la session par défaut', () => {
    const apres = majConfig(config, 'bepc-2026', candidats, new Date(config.updatedAt))
    expect(apres.defaultSessionId).toBe(config.defaultSessionId)
  })
})

describe('ce que voit le public', () => {
  const avec2027 = () => creerSession(config, { examType: 'BAC', year: 2027 }).config

  it('les brouillons sont MASQUÉS', () => {
    const publique = configPublique(avec2027())
    expect(publique.sessions.map((s) => s.id)).not.toContain('bac-2027')
    expect(publique.sessions).toHaveLength(config.sessions.length)
  })

  it('une session par défaut introuvable est remplacée par la plus récente', () => {
    expect(configPublique({ ...config, defaultSessionId: 'bac-1999' }).defaultSessionId).toBe('bac-2026')
  })

  it('classe du plus récent au plus ancien, Bac avant BEPC, session principale avant rattrapage', () => {
    const toutes = [
      { id: 'a', examType: 'BEPC', year: 2026 }, { id: 'b', examType: 'BAC', year: 2025 }, { id: 'c', examType: 'BAC', year: 2026, sessionKind: 'RATTRAPAGE' },
      { id: 'd', examType: 'BAC', year: 2026 }, { id: 'e', examType: 'BAC', year: 2027 },
    ]
    expect(trierSessions(toutes).map((s) => s.id)).toEqual(['e', 'd', 'c', 'a', 'b'])
  })
})

describe('choisir examen, année et édition', () => {
  const sessions = [
    { id: 'bac-2027', examType: 'BAC', year: 2027 }, { id: 'bac-2027-r', examType: 'BAC', year: 2027, sessionKind: 'RATTRAPAGE' },
    { id: 'bepc-2027', examType: 'BEPC', year: 2027 }, { id: 'bac-2026', examType: 'BAC', year: 2026 }, { id: 'bepc-2026', examType: 'BEPC', year: 2026 },
  ]
  const [bac27, bac27r, bepc27, bac26] = sessions

  it('propose uniquement des choix qui existent pour l’examen et l’année courants', () => {
    expect(optionsSessions(sessions, bac27)).toEqual({ examens: ['BAC', 'BEPC'], annees: [2027, 2026], genres: ['PRINCIPALE', 'RATTRAPAGE'] })
    expect(optionsSessions(sessions, bepc27).genres).toEqual(['PRINCIPALE'])
  })

  it('changer d’examen : l’année la plus récente de cet examen', () => {
    expect(choisirSession(sessions, bac26, { examType: 'BEPC' })).toBe('bepc-2027')
  })

  it('changer d’année : même examen, session principale d’abord', () => {
    expect(choisirSession(sessions, bac27r, { year: 2026 })).toBe('bac-2026')
    expect(choisirSession(sessions, bepc27, { year: 2026 })).toBe('bepc-2026')
  })

  it('changer d’édition : même examen et même année', () => {
    expect(choisirSession(sessions, bac27, { genre: 'RATTRAPAGE' })).toBe('bac-2027-r')
    expect(choisirSession(sessions, bac27r, { genre: 'PRINCIPALE' })).toBe('bac-2027')
  })

  it('si rien ne correspond, on reste sur la session courante', () => {
    expect(choisirSession(sessions, bepc27, { genre: 'RATTRAPAGE' })).toBe('bepc-2027')
  })
})

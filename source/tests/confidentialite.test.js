// ============================================================================
// Tests « vie privée » : classement des établissements, vérification d'identité,
// et ce que les fichiers publiés ne contiennent plus.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { calculerStats, estCandidatLibre } from '../scripts/lib/stats.mjs'
import { construireFichiers } from '../scripts/lib/resultats.mjs'
import { identiteCorrespond } from '../src/lib/identite.js'

const DATA = new URL('../../data/', import.meta.url).pathname
const session = { id: 'bac-2027' }
const c = (school, status, island = 'Ngazidja') => ({ school, status, island, islandId: island.toLowerCase(), tableNumber: 'X-1' })
const repeter = (n, f) => Array.from({ length: n }, f)

describe('classement des établissements', () => {
  const candidats = [
    ...repeter(10, (_, i) => c('Lycée A', i < 7 ? 'ADMIS' : 'AJOURNE')), // 70 %
    ...repeter(40, (_, i) => c('Lycée B', i < 24 ? 'ADMIS' : 'AJOURNE', 'Mwali')), // 60 %
    ...repeter(30, (_, i) => c('Lycée C', i < 18 ? 'ADMIS' : 'SECOND_GROUPE')), // 60 % (30 candidats)
    ...repeter(50, () => c('Candidat Libre', 'ADMIS')), // exclus
    ...repeter(5, () => c('', 'ADMIS')), // sans établissement : exclus
  ]
  const { etablissements } = calculerStats(candidats, session)

  it('classe du meilleur au moins bon taux ; à égalité, le plus de candidats d’abord', () => {
    expect(etablissements.map((e) => [e.nom, e.taux, e.total])).toEqual([['Lycée A', 70, 10], ['Lycée B', 60, 40], ['Lycée C', 60, 30]])
  })

  it('exclut les candidats libres et les candidats sans établissement', () => {
    expect(etablissements.some((e) => /libre/i.test(e.nom) || e.nom === '')).toBe(false)
    expect(etablissements.reduce((s, e) => s + e.total, 0)).toBe(80)
  })

  it('donne l’île de l’établissement et un taux à une décimale', () => {
    expect(etablissements.find((e) => e.nom === 'Lycée B').ile).toBe('Mwali')
    const [x] = calculerStats(repeter(3, (_, i) => c('Lycée D', i === 0 ? 'ADMIS' : 'AJOURNE')), session).etablissements
    expect(x.taux).toBe(33.3)
  })

  it('reconnaît « Candidat Libre » sous ses différentes écritures', () => {
    for (const nom of ['Candidat Libre', 'candidate libre', 'CANDIDATS LIBRES']) expect(estCandidatLibre(nom)).toBe(true)
    expect(estCandidatLibre('Lycée de Moroni')).toBe(false)
  })
})

describe('vérification d’identité avant l’attestation', () => {
  const cand = { tableNumber: 'BAC-26-00142', birthDate: '2006-02-25' }

  it('accepte le bon numéro (complet ou chiffres seuls) avec la bonne date', () => {
    for (const numero of ['BAC-26-00142', 'bac 26 00142', 'BAC2600142', '00142']) expect(identiteCorrespond(cand, numero, '25/02/2006')).toBe(true)
    expect(identiteCorrespond(cand, '00142', '25-02-2006')).toBe(true)
    expect(identiteCorrespond(cand, '00142', '2006-02-25')).toBe(true)
  })

  it('refuse un mauvais numéro, une mauvaise date, une date illisible ou un champ vide', () => {
    expect(identiteCorrespond(cand, '00143', '25/02/2006')).toBe(false)
    expect(identiteCorrespond(cand, '142', '25/02/2006')).toBe(false) // les zéros comptent : pas de tirage au hasard
    expect(identiteCorrespond(cand, '00142', '26/02/2006')).toBe(false)
    expect(identiteCorrespond(cand, '00142', '02/25/2006')).toBe(false) // mois et jour inversés = date impossible
    expect(identiteCorrespond(cand, '00142', 'hier')).toBe(false)
    expect(identiteCorrespond(cand, '', '25/02/2006')).toBe(false)
  })

  it('anciennes données sans date de naissance : seul le numéro est vérifié', () => {
    expect(identiteCorrespond({ tableNumber: 'BAC-26-00142' }, '00142', '')).toBe(true)
    expect(identiteCorrespond({ tableNumber: 'BAC-26-00142' }, '00999', '')).toBe(false)
  })
})

describe('ce que le site publie', () => {
  it('ne publie plus de liste de « premiers candidats » offerte à tout visiteur', () => {
    const fichiers = construireFichiers([{ id: 'a', tableNumber: 'BAC-26-00001', lastName: 'ALI', firstName: 'Sam', status: 'ADMIS' }], { numberDigits: 3, nameLetters: 2 })
    expect([...fichiers.keys()]).not.toContain('initial.json')
    for (const s of readdirSync(DATA).filter((n) => /-\d{4}/.test(n))) expect(existsSync(`${DATA}${s}/initial.json`)).toBe(false)
  })

  it('le classement est configurable par l’autorité organisatrice (exams.json)', () => {
    const { classement } = JSON.parse(readFileSync(`${DATA}exams.json`, 'utf8'))
    expect(classement).toMatchObject({ visible: true, top: 5, minCandidats: 20 })
  })
})

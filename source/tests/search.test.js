// Tests automatiques du moteur de recherche. Lancer : npm test
import { describe, it, expect } from 'vitest'
import { normalize, buildQuery, matchesFilters } from '../src/lib/search.js'

const keys = { numberDigits: 3, nameLetters: 2 }
const zainaba = {
  tableNumber: 'BAC-26-00001',
  lastName: 'ATTOUMANE',
  firstName: 'Zaïnaba',
  islandId: 'ngazidja',
  series: 'G',
  status: 'ADMIS',
}

describe('normalize', () => {
  it('retire accents, casse et ponctuation', () => {
    expect(normalize("  Zaïnaba  M'ze ")).toBe('ZAINABA M ZE')
  })
  it('gère les valeurs vides', () => {
    expect(normalize(undefined)).toBe('')
  })
})

describe('buildQuery', () => {
  it('rien tapé → vide', () => {
    expect(buildQuery('   ', keys, 'bac-2026').etat).toBe('vide')
  })

  it('numéro trop court → indique combien de chiffres manquent', () => {
    expect(buildQuery('1', keys, 'bac-2026')).toEqual({ etat: 'trop-court', manque: 2 })
  })

  it('numéro complet → bon fichier (3 premiers chiffres)', () => {
    const q = buildQuery('BAC-26-00142', keys, 'bac-2026')
    expect(q.etat).toBe('pret')
    expect(q.url).toBe('./data/bac-2026/numeros/001.json')
  })

  it('le filtre par numéro retrouve le candidat', () => {
    const q = buildQuery('00001', keys, 'bac-2026')
    expect(q.filtre(zainaba)).toBe(true)
    expect(q.filtre({ ...zainaba, tableNumber: 'BAC-26-00099' })).toBe(false)
  })

  it('nom trop court', () => {
    expect(buildQuery('a', keys, 'bac-2026')).toEqual({ etat: 'trop-court', manque: 1 })
  })

  it('nom → fichier des 2 premières lettres, sans accent', () => {
    const q = buildQuery('Attou', keys, 'bepc-2026')
    expect(q.url).toBe('./data/bepc-2026/noms/AT.json')
  })

  it('nom + prénom dans le désordre, avec accents', () => {
    const q = buildQuery('zainaba att', keys, 'bac-2026')
    expect(q.filtre(zainaba)).toBe(true)
    expect(q.filtre({ ...zainaba, lastName: 'ABDALLAH' })).toBe(false)
  })
})

describe('matchesFilters', () => {
  it('sans filtre, tout passe', () => {
    expect(matchesFilters(zainaba, {})).toBe(true)
  })
  it('filtre par île, série et statut', () => {
    expect(matchesFilters(zainaba, { island: 'mwali' })).toBe(false)
    expect(matchesFilters(zainaba, { series: 'G', status: 'ADMIS' })).toBe(true)
    expect(matchesFilters(zainaba, { status: 'AJOURNE' })).toBe(false)
  })
  it('filtre par mention (et laisse passer sans filtre)', () => {
    const bien = { ...zainaba, mention: 'BIEN' }
    expect(matchesFilters(bien, { mention: 'BIEN' })).toBe(true)
    expect(matchesFilters(bien, { mention: 'TRES_BIEN' })).toBe(false)
    expect(matchesFilters(bien, { mention: 'ALL' })).toBe(true)
  })
})

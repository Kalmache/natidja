// Statistiques par centre d'examen + filtre « centre » de la recherche.
import { describe, it, expect } from 'vitest'
import { calculerStats } from '../scripts/lib/stats.mjs'
import { matchesFilters } from '../src/lib/search.js'

const c = (center, status, school = 'École A') => ({ center, status, school, island: 'Ngazidja', islandId: 'ngazidja', series: 'D' })
const candidats = [c('Centre 1', 'ADMIS'), c('Centre 1', 'AJOURNE'), c('Centre 2', 'ADMIS', 'Candidat Libre')]

describe('statistiques par centre', () => {
  const stats = calculerStats(candidats, { id: 'bac-2026' })
  it('regroupe par centre, y compris les candidats libres', () => {
    expect(stats.centres.map((x) => [x.nom, x.total])).toEqual([['Centre 2', 1], ['Centre 1', 2]])
  })
  it('calcule le taux de réussite', () => {
    expect(stats.centres.find((x) => x.nom === 'Centre 1').taux).toBe(50)
  })
  it('garde les candidats libres hors du classement des établissements', () => {
    expect(stats.etablissements.map((x) => x.nom)).toEqual(['École A'])
  })
})

describe('filtre par centre', () => {
  it('ne garde que le centre choisi', () => {
    expect(matchesFilters(candidats[0], { center: 'Centre 1' })).toBe(true)
    expect(matchesFilters(candidats[2], { center: 'Centre 1' })).toBe(false)
    expect(matchesFilters(candidats[2], {})).toBe(true)
  })
})

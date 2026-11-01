// Tests des calculs d'affichage du classement (page Statistiques).
import { describe, expect, it } from 'vitest'
import { classes, ecart, echelle, meilleursParIle, position } from '../src/lib/classement.js'

const e = (nom, ile, total, taux) => ({ nom, ile, total, taux })
const liste = [e('A', 'Ngazidja', 142, 54.9), e('B', 'Mwali', 104, 52.9), e('C', 'Ngazidja', 144, 51.4), e('D', 'Ndzuwani', 154, 46.1), e('Petit', 'Mwali', 8, 87.5)]

describe('classement : établissements classés', () => {
  it('écarte ceux qui ont trop peu de candidats (sinon 7 admis sur 8 feraient 87,5 %)', () => {
    expect(classes(liste, 20).map((x) => x.nom)).toEqual(['A', 'B', 'C', 'D'])
    expect(classes(undefined)).toEqual([])
  })
  it('le meilleur de chaque île (même si la liste n’est pas triée), du plus haut au plus bas taux, sans les établissements trop petits', () => {
    expect(meilleursParIle(liste, 20).map((x) => [x.ile, x.nom])).toEqual([['Ngazidja', 'A'], ['Mwali', 'B'], ['Ndzuwani', 'D']])
    expect(meilleursParIle(liste, 5).find((x) => x.ile === 'Mwali').nom).toBe('Petit') // seuil plus bas : il devient classé
  })
})

describe('classement : échelle du graphique de comparaison', () => {
  it('zoome sur la zone utile (multiples de 5 avec un peu d’air) et le signale', () => {
    const ech = echelle([54.9, 52.9, 51.4, 46.1], 45.7)
    expect(ech).toMatchObject({ min: 40, max: 60, zoom: true })
    expect(ech.graduations).toEqual([40, 50, 60])
  })
  it('commence à 0 % quand les taux sont bas : pas de zoom à signaler', () => {
    const ech = echelle([3, 8], 5)
    expect(ech.min).toBe(0)
    expect(ech.zoom).toBe(false)
  })
  it('reste dans 0–100 % et garde au moins 10 points de large', () => {
    const haut = echelle([97, 99], 95)
    expect(haut.max).toBe(100)
    expect(haut.max - haut.min).toBeGreaterThanOrEqual(10)
    const tous = echelle([50, 50], 50)
    expect(tous.max - tous.min).toBeGreaterThanOrEqual(10)
  })
  it('positionne un taux entre 0 et 100 % de la largeur (borné)', () => {
    const ech = { min: 40, max: 60 }
    expect(position(50, ech)).toBe(50)
    expect(position(40, ech)).toBe(0)
    expect(position(70, ech)).toBe(100)
    expect(position(30, ech)).toBe(0)
  })
})

describe('classement : écart avec la moyenne nationale', () => {
  it('écrit « +9,2 », « −1,4 » (vrai signe moins) ou « 0,0 »', () => {
    expect(ecart(54.9, 45.7)).toBe('+9,2')
    expect(ecart(44.3, 45.7)).toBe('−1,4')
    expect(ecart(45.7, 45.7)).toBe('0,0')
  })
})

describe('fiche d’une île (touchée sur la carte)', () => {
  it('prend la forme d’une fiche d’établissement, avec le taux et la réussite par série', async () => {
    const { ficheIle } = await import('../src/lib/classement.js')
    const f = ficheIle({ nom: 'Mwali', total: 100, ADMIS: 40, SECOND_GROUPE: 20, series: { D: { total: 60, ADMIS: 30 }, C: { total: 40, ADMIS: 10 } } })
    expect([f.nom, f.total, f.admis, f.second, f.ajournes, f.taux]).toEqual(['Mwali', 100, 40, 20, 40, 40])
    expect(f.series.map((s) => [s.serie, s.taux])).toEqual([['D', 50], ['C', 25]])
  })
})

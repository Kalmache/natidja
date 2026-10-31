// Tests de l'outil d'import Excel/CSV. Lancer : npm test
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { construireFichiers, lireDate, lireTableau, majConfig, transformer } from '../scripts/lib/resultats.mjs'

const DATA = new URL('../../data/', import.meta.url).pathname
const config = JSON.parse(readFileSync(DATA + 'exams.json', 'utf8'))
const bac = config.sessions.find((s) => s.id === 'bac-2026')
const bepc = config.sessions.find((s) => s.id === 'bepc-2026')

const ENTETE = ['N° de table', 'Nom', 'Prénom', 'Date de naissance', 'Lieu de naissance', 'Série', 'Centre d’examen', 'Établissement', 'Île', 'Résultat', 'Mention', 'Moyenne']
const ligne = (n, ...v) => ({ numero: n, cellules: v })
const ok = (n = 2, table = 'BAC-26-90001') => ligne(n, table, 'Saïd', 'Fatima', '15/03/2007', 'Moroni', 'G', 'Centre', 'Lycée', 'Grande Comore', 'Admis', 'Très bien', '15,25')

describe('lecture et vérification', () => {
  it('accepte les écritures usuelles (synonymes, virgule décimale, accents)', () => {
    const r = transformer({ entete: ENTETE, lignes: [ok()] }, bac, config)
    expect(r.erreurs).toEqual([])
    expect(r.candidats[0]).toMatchObject({
      id: 'bac-2026-BAC-26-90001', lastName: 'SAÏD', islandId: 'ngazidja', island: 'Ngazidja',
      status: 'ADMIS', mention: 'TRES_BIEN', average: 15.25,
    })
  })

  it('ignore la ligne d’exemple du modèle', () => {
    const exemple = ligne(2, '(exemple) BAC-26-00001', 'EXEMPLE', 'X', '', '', 'G', '', '', 'Ngazidja', 'Admis', 'Bien', 13)
    expect(transformer({ entete: ENTETE, lignes: [exemple, ok(3)] }, bac, config).candidats).toHaveLength(1)
  })

  it('signale les erreurs avec le bon numéro de ligne', () => {
    // chaque ligne fautive a son propre n° de table (sauf si on teste justement le doublon)
    const l = (n, i, v) => { const c = ok(n, `BAC-26-9${n}00`).cellules.slice(); c[i] = v; return { numero: n, cellules: c } }
    const lignes = [
      ok(2), l(3, 0, 'BAC-26-90001'), // doublon
      l(4, 1, ''), l(5, 5, 'Z9'), l(6, 8, 'Madagascar'), l(7, 9, 'Peut-être'),
      l(8, 10, 'Excellent'), l(9, 11, '25'), l(10, 11, 'abc'), l(11, 0, 'BAC-26-9'),
    ]
    const r = transformer({ entete: ENTETE, lignes }, bac, config)
    expect(r.candidats).toHaveLength(1)
    expect(r.erreurs.map((e) => e.ligne)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(r.erreurs[0].message).toMatch(/Doublon.*ligne 2/)
  })

  it('exige les colonnes obligatoires', () => {
    const r = transformer({ entete: ['Nom', 'Prénom'], lignes: [ligne(2, 'A', 'B')] }, bac, config)
    expect(r.erreurs.some((e) => /absente/.test(e.message))).toBe(true)
  })

  it('BEPC : pas de série ; mention ignorée pour un non-admis', () => {
    const entete = ENTETE.filter((t) => t !== 'Série')
    const r = transformer({ entete, lignes: [ligne(2, 'BEPC-26-00001', 'ALI', 'Sam', '02/11/2010', 'Moroni', 'C', 'E', 'Mwali', 'Ajourné', 'Bien', '6')] }, bepc, config)
    expect(r.erreurs).toEqual([])
    expect(r.candidats[0]).toMatchObject({ series: '', status: 'AJOURNE' })
    expect(r.candidats[0].mention).toBeUndefined()
    expect(r.avertissements.length).toBeGreaterThan(0)
  })

  it('lit les notes par matière « Matière (coef N) »', () => {
    const r = transformer({ entete: [...ENTETE, 'Mathématiques (coef 4)'], lignes: [{ numero: 2, cellules: [...ok().cellules, '14,5'] }] }, bac, config)
    expect(r.candidats[0].grades).toEqual([{ subject: 'Mathématiques', coef: 4, score: 14.5 }])
  })
})

describe('date de naissance', () => {
  it('comprend les écritures usuelles, le JOUR d’abord, et la renvoie en AAAA-MM-JJ', () => {
    for (const brute of ['15/03/2007', '15-03-2007', '15.03.2007', '15 03 2007', '5/3/2007', '2007-03-15', '2007-03-15T00:00:00.000Z', ' 15/03/2007 ']) expect(lireDate(brute)).toBe(brute.trim().startsWith('5/') ? '2007-03-05' : '2007-03-15')
  })

  it('convertit le nombre « brut » d’Excel (39156 = 15 mars 2007)', () => {
    expect(lireDate(39156)).toBe('2007-03-15')
  })

  it('refuse les dates impossibles ou illisibles', () => {
    for (const brute of ['31/02/2007', '32/01/2007', '15/13/2007', '2007-02-30', '15/03/07', 'hier', '', 'abc', 0, 99999999]) expect(lireDate(brute)).toBeNull()
  })

  const avecDate = (valeur) => { const c = ok().cellules.slice(); c[3] = valeur; return { numero: 2, cellules: c } }

  it('l’enregistre dans la fiche du candidat (juste après le prénom)', () => {
    const [cand] = transformer({ entete: ENTETE, lignes: [ok()] }, bac, config).candidats
    expect(cand.birthDate).toBe('2007-03-15')
    expect(Object.keys(cand).slice(0, 5)).toEqual(['id', 'tableNumber', 'lastName', 'firstName', 'birthDate'])
  })

  it('est OBLIGATOIRE : une date manquante, illisible ou improbable est refusée avec le numéro de ligne', () => {
    const erreurs = (v) => transformer({ entete: ENTETE, lignes: [avecDate(v)] }, bac, config).erreurs
    expect(erreurs('')[0]).toMatchObject({ ligne: 2, champ: 'Date de naissance' })
    expect(erreurs('')[0].message).toMatch(/manquante/)
    expect(erreurs('31/02/2007')[0].message).toMatch(/illisible/)
    expect(erreurs('15/03/1900')[0].message).toMatch(/improbable/) // 126 ans
    expect(erreurs('15/03/2024')[0].message).toMatch(/improbable/) // 2 ans
    expect(erreurs('15/03/2007')).toEqual([])
  })

  it('un fichier sans la colonne « Date de naissance » est refusé', () => {
    const entete = ENTETE.filter((t) => t !== 'Date de naissance')
    const lignes = [ligne(2, ...ok().cellules.filter((_, i) => i !== 3))]
    expect(transformer({ entete, lignes }, bac, config).erreurs.some((e) => /Date de naissance.*absente/.test(e.message))).toBe(true)
  })

  it('reconnaît les autres intitulés de colonne (« Né(e) le », « Date naissance »…)', () => {
    for (const titre of ['Né le', 'Date naissance', 'DATE DE NAISSANCE']) {
      const entete = ENTETE.map((t) => (t === 'Date de naissance' ? titre : t))
      expect(transformer({ entete, lignes: [ok()] }, bac, config).erreurs).toEqual([])
    }
  })
})

describe('lecture de vrais fichiers', () => {
  it('lit un fichier Excel (.xlsx)', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'natidja-'))
    const f = join(dossier, 'test.xlsx')
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Résultats')
    ws.addRow(ENTETE)
    ws.addRow(['BAC-26-90001', 'Saïd', 'Fatima', '15/03/2007', 'Moroni', 'G', 'Centre', 'Lycée', 'Ngazidja', 'Admis', 'Bien', 13.5])
    await wb.xlsx.writeFile(f)
    const r = transformer(await lireTableau(f), bac, config)
    expect(r.erreurs).toEqual([])
    expect(r.candidats[0].average).toBe(13.5)
  })

  it('lit un CSV français (point-virgule, Windows-1252)', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'natidja-'))
    const f = join(dossier, 'test.csv')
    const texte = ENTETE.join(';') + '\r\n' + 'BAC-26-90001;Saïd;Fatima;15/03/2007;Moroni;G;Centre;Lycée;Anjouan;Ajournée;;7,8\r\n'
    writeFileSync(f, Buffer.from(texte, 'latin1'))
    const r = transformer(await lireTableau(f), bac, config)
    expect(r.erreurs).toEqual([])
    expect(r.candidats[0]).toMatchObject({ lastName: 'SAÏD', islandId: 'ndzuwani', status: 'AJOURNE', average: 7.8 })
  })
})

describe('fichiers produits pour le site', () => {
  it('range un candidat dans le fichier de CHAQUE mot de son nom (recherche prénom d’abord)', () => {
    const c = transformer({ entete: ENTETE, lignes: [ok()] }, bac, config).candidats
    const f = construireFichiers(c, config.shardKeys)
    expect([...f.keys()].sort()).toEqual(['initial.json', 'noms/FA.json', 'noms/SA.json', 'numeros/900.json'])
  })

  it('RECONSTRUIT À L’IDENTIQUE les fichiers actuellement publiés (3 500 candidats × 2 examens)', () => {
    for (const s of config.sessions) {
      const dir = `${DATA}${s.id}/`
      const cands = readdirSync(dir + 'numeros').flatMap((f) => JSON.parse(readFileSync(dir + 'numeros/' + f, 'utf8')))
      const produits = construireFichiers(cands, config.shardKeys)
      for (const [chemin, contenu] of produits) {
        expect(existsSync(dir + chemin)).toBe(true)
        expect(readFileSync(dir + chemin, 'utf8') === contenu).toBe(true)
      }
      expect(produits.size).toBe(1 + readdirSync(dir + 'numeros').length + readdirSync(dir + 'noms').length)
      expect(majConfig(config, s.id, cands, new Date(config.updatedAt))).toEqual(config)
    }
  })
})

// Le service d'attestation : protection réelle (le coffre ne parle qu'au bon numéro + à la bonne date).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Coffre } from '../attestation/lib/coffre.mjs'
import { Limiteur } from '../attestation/lib/limiteur.mjs'
import { creerServeur } from '../attestation/serveur.mjs'
import { CHAMPS_PRIVES, separer, separerListe } from '../scripts/lib/separation.mjs'

const candidat = { tableNumber: 'BAC-26-00142', lastName: 'ATTOUMANE', firstName: 'Zaïnaba', status: 'ADMIS', school: 'Lycée A', birthDate: '2006-02-25', birthPlace: 'Moroni', average: 12.4, mention: 'ASSEZ_BIEN' }

describe('séparation public / privé', () => {
  it('retire les champs sensibles de la fiche publique et les met dans le coffre', () => {
    const { publique, privee } = separer(candidat)
    for (const c of CHAMPS_PRIVES) expect(publique).not.toHaveProperty(c)
    expect(publique).toMatchObject({ tableNumber: 'BAC-26-00142', lastName: 'ATTOUMANE', status: 'ADMIS' })
    expect(privee).toEqual({ birthDate: '2006-02-25', birthPlace: 'Moroni', average: 12.4, mention: 'ASSEZ_BIEN' })
  })
  it('construit le coffre indexé par numéro de table', () => {
    const { publics, coffre } = separerListe([candidat])
    expect(publics).toHaveLength(1)
    expect(coffre['BAC-26-00142'].average).toBe(12.4)
  })
})

describe('le limiteur d’essais', () => {
  it('bloque un numéro après 5 échecs, puis le libère quand la fenêtre est passée', () => {
    let t = 0
    const l = new Limiteur({ horloge: () => t })
    for (let i = 0; i < 5; i++) { expect(l.verifier('n1', 'ip').ok).toBe(true); l.echec('n1', 'ip') }
    const r = l.verifier('n1', 'ip')
    expect(r.ok).toBe(false)
    expect(r.attenteS).toBeGreaterThan(800)
    expect(l.verifier('n2', 'autre').ok).toBe(true) // un autre numéro n'est pas touché
    t += 16 * 60_000
    expect(l.verifier('n1', 'ip').ok).toBe(true)
  })
  it('bloque une adresse qui balaie beaucoup de numéros', () => {
    const l = new Limiteur()
    for (let i = 0; i < 30; i++) l.echec(`n${i}`, 'pirate')
    expect(l.verifier('nouveau', 'pirate').ok).toBe(false)
    expect(l.verifier('nouveau', 'honnete').ok).toBe(true)
  })
})

describe('le service HTTP', () => {
  let serveur, base
  beforeEach(async () => {
    const coffre = new Coffre()
    coffre.ajouter('bac-2026', { 'BAC-26-00142': { birthDate: '2006-02-25', birthPlace: 'Moroni', average: 12.4, mention: 'ASSEZ_BIEN' } })
    serveur = creerServeur({ coffre, origine: 'https://site.test', delaiMinMs: 0 })
    await new Promise((r) => serveur.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${serveur.address().port}`
  })
  afterEach(() => new Promise((r) => serveur.close(r)))
  const demander = (corps) => fetch(`${base}/attestation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })

  it('rend les détails avec le bon numéro ET la bonne date (écritures souples acceptées)', async () => {
    const r = await demander({ session: 'bac-2026', numero: 'bac 26 00142', naissance: '25/02/2006' })
    expect(r.status).toBe(200)
    expect((await r.json()).details).toMatchObject({ average: 12.4, mention: 'ASSEZ_BIEN', birthDate: '2006-02-25' })
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(r.headers.get('access-control-allow-origin')).toBe('https://site.test')
  })
  it('accepte la partie chiffrée du numéro', async () => {
    const r = await demander({ session: 'bac-2026', numero: '00142', naissance: '25/02/2006' })
    expect(r.status).toBe(200)
  })
  it('répond exactement pareil si le numéro n’existe pas ou si la date est fausse (rien à deviner)', async () => {
    const fausseDate = await demander({ session: 'bac-2026', numero: 'BAC-26-00142', naissance: '01/01/2006' })
    const inconnu = await demander({ session: 'bac-2026', numero: 'BAC-26-99999', naissance: '25/02/2006' })
    expect(fausseDate.status).toBe(401)
    expect(inconnu.status).toBe(401)
    expect(await fausseDate.json()).toEqual(await inconnu.json())
  })
  it('bloque les essais au hasard : après 5 erreurs, même la bonne date est refusée un moment', async () => {
    for (let i = 0; i < 5; i++) await demander({ session: 'bac-2026', numero: 'BAC-26-00142', naissance: `0${i + 1}/01/2006` })
    const r = await demander({ session: 'bac-2026', numero: 'BAC-26-00142', naissance: '25/02/2006' })
    expect(r.status).toBe(429)
    expect(r.headers.get('retry-after')).toBeTruthy()
  })
  it('refuse les demandes mal formées et les corps trop gros', async () => {
    expect((await demander({ session: 'bac-2026' })).status).toBe(400)
    const gros = await fetch(`${base}/attestation`, { method: 'POST', body: 'x'.repeat(5000) }).catch(() => ({ status: 0 }))
    expect([0, 400]).toContain(gros.status)
  })
  it('ne connaît que /attestation et /sante', async () => {
    expect((await fetch(`${base}/sante`)).status).toBe(200)
    expect((await fetch(`${base}/autre`)).status).toBe(404)
  })
})

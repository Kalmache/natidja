// Tests de la couche de sécurité de la console : mots de passe, TOTP (vecteurs officiels), audit.
import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  base32Decoder, base32Encoder, hacherMotDePasse, hotp, nouveauSecretTotp, totp, uriTotp,
  verifierForceMotDePasse, verifierMotDePasse, verifierTotp, motDePasseTemporaire,
} from '../console/lib/securite.mjs'
import { Audit } from '../console/lib/audit.mjs'

describe('mots de passe', () => {
  it('hache sans jamais stocker le mot de passe, et le vérifie', async () => {
    const h = await hacherMotDePasse('Un-Bon-Mot-De-Passe-42')
    expect(h.startsWith('scrypt$')).toBe(true)
    expect(h).not.toContain('Un-Bon-Mot-De-Passe-42')
    expect(await verifierMotDePasse('Un-Bon-Mot-De-Passe-42', h)).toBe(true)
    expect(await verifierMotDePasse('un-bon-mot-de-passe-42', h)).toBe(false)
  })
  it('deux hachages du même mot de passe sont différents (sel)', async () => {
    expect(await hacherMotDePasse('Meme-Mot-De-Passe-7')).not.toBe(await hacherMotDePasse('Meme-Mot-De-Passe-7'))
  })
  it('refuse les mots de passe faibles', () => {
    expect(verifierForceMotDePasse('court')).toMatch(/12 caractères/)
    expect(verifierForceMotDePasse('aaaaaaaaaaaaaaaa')).toBeTruthy()
    expect(verifierForceMotDePasse('motdepasse2026!A')).toMatch(/courant/)
    expect(verifierForceMotDePasse('amina.diallo-2026!', 'amina.diallo')).toMatch(/identifiant/)
    expect(verifierForceMotDePasse('toutenminuscules')).toMatch(/3 sortes/)
    expect(verifierForceMotDePasse('Sol1de-Phrase-Secrete!')).toBeNull()
  })
  it('le mot de passe temporaire est assez fort', () => {
    expect(verifierForceMotDePasse(motDePasseTemporaire())).toBeNull()
  })
})

describe('double authentification (TOTP)', () => {
  // Vecteurs de test OFFICIELS de la RFC 6238 (annexe B), secret ASCII « 12345678901234567890 », SHA-1, 8 chiffres
  const secret = Buffer.from('12345678901234567890')
  const officiels = [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037']]
  it.each(officiels)('code officiel à t=%i s → %s', (t, attendu) => {
    expect(hotp(secret, Math.floor(t / 30), 8)).toBe(attendu)
  })
  it('base32 : aller-retour', () => {
    const s = nouveauSecretTotp()
    expect(s).toMatch(/^[A-Z2-7]{32}$/)
    expect(base32Encoder(base32Decoder(s))).toBe(s)
    expect(base32Encoder(Buffer.from('Hello!'))).toBe('JBSWY3DPEE')
  })
  it('accepte le code courant et la fenêtre ±30 s, refuse le reste', () => {
    const s = nouveauSecretTotp()
    const t = 1_700_000_000_000
    expect(verifierTotp(s, totp(s, t), { tempsMs: t })).not.toBeNull()
    expect(verifierTotp(s, totp(s, t - 30_000), { tempsMs: t })).not.toBeNull()
    expect(verifierTotp(s, totp(s, t - 90_000), { tempsMs: t })).toBeNull()
    expect(verifierTotp(s, '000000', { tempsMs: t })).toBeNull()
    expect(verifierTotp(s, 'abcdef', { tempsMs: t })).toBeNull()
  })
  it('refuse de réutiliser un code déjà accepté (rejeu)', () => {
    const s = nouveauSecretTotp()
    const t = 1_700_000_000_000
    const compteur = verifierTotp(s, totp(s, t), { tempsMs: t })
    expect(verifierTotp(s, totp(s, t), { tempsMs: t, dernierCompteur: compteur })).toBeNull()
  })
  it('construit une adresse otpauth lisible par les applications', () => {
    const uri = uriTotp('amina', 'ABCDEF')
    expect(uri).toBe('otpauth://totp/Ndeze%20Natidja:amina?secret=ABCDEF&issuer=Ndeze%20Natidja&algorithm=SHA1&digits=6&period=30')
  })
})

describe('journal d’audit à chaîne', () => {
  const nouveau = () => new Audit(join(mkdtempSync(join(tmpdir(), 'audit-')), 'audit.jsonl'))
  it('une chaîne intacte est valide, y compris après redémarrage', () => {
    const a = nouveau()
    a.ajouter({ utilisateur: 'amina', action: 'connexion_ok', ip: '1.2.3.4' })
    a.ajouter({ utilisateur: 'amina', action: 'proposition_creee', details: { id: 'p1' } })
    expect(a.verifier()).toMatchObject({ ok: true, lignes: 2 })
    const b = new Audit(a.fichier) // relecture du fichier
    b.ajouter({ utilisateur: 'moussa', action: 'approbation' })
    expect(b.verifier()).toMatchObject({ ok: true, lignes: 3 })
  })
  it('détecte une ligne modifiée, supprimée ou réordonnée', () => {
    const a = nouveau()
    for (const action of ['a', 'b', 'c']) a.ajouter({ action })
    const lignes = readFileSync(a.fichier, 'utf8').trim().split('\n')
    writeFileSync(a.fichier, [lignes[0], lignes[1].replace('"b"', '"x"'), lignes[2]].join('\n') + '\n')
    expect(a.verifier().ok).toBe(false)
    writeFileSync(a.fichier, [lignes[0], lignes[2]].join('\n') + '\n') // ligne supprimée
    expect(a.verifier().ok).toBe(false)
    writeFileSync(a.fichier, [lignes[1], lignes[0], lignes[2]].join('\n') + '\n') // réordonnée
    expect(a.verifier().ok).toBe(false)
  })
})

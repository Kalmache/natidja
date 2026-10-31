// ============================================================================
// console/lib/stockage.mjs – où la console range ses informations
// ----------------------------------------------------------------------------
// Des fichiers JSON dans un dossier PRIVÉ (droits 0700/0600 : lisibles par le seul
// compte qui lance la console). Pas de base de données à installer.
//   utilisateurs.json            les comptes (mots de passe HACHÉS, secrets TOTP)
//   propositions/<id>/meta.json  l'état d'une proposition de publication
//   propositions/<id>/candidats.json  les candidats validés (données personnelles !)
//   audit.jsonl                  le journal d'audit à chaîne
// ⚠️ Ce dossier contient des données sensibles : ne jamais le mettre dans Git,
// chiffrer le disque, le sauvegarder dans un endroit à accès restreint.
// ============================================================================
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const normaliserNom = (n) => String(n ?? '').trim().toLowerCase()
export const NOM_VALIDE = /^[a-z0-9][a-z0-9._-]{2,39}$/
const ID_VALIDE = /^[a-f0-9-]{36}$/ // empêche toute tentative de sortir du dossier (../)

function ecrireJson(fichier, valeur) {
  const tmp = `${fichier}.tmp`
  writeFileSync(tmp, JSON.stringify(valeur, null, 2), { mode: 0o600 })
  renameSync(tmp, fichier) // remplacement atomique : jamais de fichier à moitié écrit
}
function lireJson(fichier, defaut) {
  try {
    return JSON.parse(readFileSync(fichier, 'utf8'))
  } catch {
    return defaut
  }
}

export class Stockage {
  constructor(dossier) {
    this.dossier = dossier
    this.fichierUtilisateurs = join(dossier, 'utilisateurs.json')
    this.dossierPropositions = join(dossier, 'propositions')
    mkdirSync(this.dossierPropositions, { recursive: true, mode: 0o700 })
  }

  // ---- utilisateurs
  utilisateurs() {
    return lireJson(this.fichierUtilisateurs, [])
  }
  trouver(nom) {
    const n = normaliserNom(nom)
    return this.utilisateurs().find((u) => u.nom === n) ?? null
  }
  trouverId(id) {
    return this.utilisateurs().find((u) => u.id === id) ?? null
  }
  sauver(utilisateur) {
    const liste = this.utilisateurs()
    const i = liste.findIndex((u) => u.id === utilisateur.id)
    if (i >= 0) liste[i] = utilisateur
    else liste.push(utilisateur)
    ecrireJson(this.fichierUtilisateurs, liste)
  }

  // ---- propositions
  #dossier(id) {
    if (!ID_VALIDE.test(String(id))) return null
    return join(this.dossierPropositions, id)
  }
  propositions() {
    return readdirSync(this.dossierPropositions)
      .map((id) => this.proposition(id))
      .filter(Boolean)
      .sort((a, b) => (a.creeLe < b.creeLe ? 1 : -1))
  }
  proposition(id) {
    const d = this.#dossier(id)
    return d ? lireJson(join(d, 'meta.json'), null) : null
  }
  candidats(id) {
    const d = this.#dossier(id)
    return d ? lireJson(join(d, 'candidats.json'), null) : null
  }
  creerProposition(meta, candidats) {
    const d = this.#dossier(meta.id)
    mkdirSync(d, { recursive: true, mode: 0o700 })
    writeFileSync(join(d, 'candidats.json'), JSON.stringify(candidats), { mode: 0o600 })
    ecrireJson(join(d, 'meta.json'), meta)
  }
  majProposition(meta) {
    ecrireJson(join(this.#dossier(meta.id), 'meta.json'), meta)
  }
  /** Supprime les données de candidats des propositions terminées depuis plus de `jours` jours. */
  purger(jours, maintenantMs) {
    let n = 0
    for (const m of this.propositions()) {
      const fini = ['publiee', 'refusee', 'annulee', 'echec'].includes(m.statut)
      const date = Date.parse(m.publieLe ?? m.refus?.le ?? m.annulation?.le ?? m.creeLe)
      const f = join(this.#dossier(m.id), 'candidats.json')
      if (fini && maintenantMs - date > jours * 86_400_000 && existsSync(f)) {
        rmSync(f)
        n++
      }
    }
    return n
  }
}

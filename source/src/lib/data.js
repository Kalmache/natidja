// ============================================================================
// src/lib/data.js – téléchargement des fichiers de données
// ----------------------------------------------------------------------------
// - Réessaie automatiquement en cas de coupure réseau (4 essais, en attendant
//   de plus en plus longtemps : 1 s, 2 s, 4 s). Très utile avec une connexion
//   instable.
// - Garde en mémoire ce qui a déjà été téléchargé (pas de 2e téléchargement).
// - Le fonctionnement HORS-LIGNE est assuré par le service worker (voir
//   vite.config.js) : il garde une copie de chaque fichier consulté.
// ============================================================================

import { configPublique } from './sessions.js'

const memoire = new Map() // url → Promise (cache en mémoire)

const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))

async function telecharger(url, essais = 4) {
  for (let i = 1; i <= essais; i++) {
    try {
      const reponse = await fetch(url, { headers: { Accept: 'application/json' } })
      if (reponse.status === 404) return null // fichier absent = aucun résultat
      if (!reponse.ok) throw new Error(`Erreur serveur ${reponse.status}`)
      // Sécurité : on n'accepte que du JSON (sinon l'hébergeur a renvoyé
      // une page HTML d'erreur).
      const type = reponse.headers.get('content-type') ?? ''
      return type.includes('json') ? await reponse.json() : null
    } catch (erreur) {
      if (i === essais) throw erreur
      await attendre(1000 * 2 ** (i - 1))
    }
  }
  return null
}

/** Télécharge (une seule fois) un fichier JSON. Renvoie null s'il n'existe pas. */
export function getJson(url) {
  if (!memoire.has(url)) {
    const promesse = telecharger(url).catch((erreur) => {
      memoire.delete(url) // on pourra réessayer plus tard
      throw erreur
    })
    memoire.set(url, promesse)
  }
  return memoire.get(url)
}

export const loadConfig = async () => {
  const config = await getJson('./data/exams.json')
  if (!config) throw new Error('Configuration des examens introuvable.')
  return configPublique(config) // sessions en brouillon masquées, session par défaut valide
}
export const loadInitial = async (sessionId) =>
  (await getJson(`./data/${sessionId}/initial.json`)) ?? []
export const loadStats = (sessionId) => getJson(`./data/${sessionId}/stats.json`)
export const loadShard = async (url) => (await getJson(url)) ?? []

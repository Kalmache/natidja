// ============================================================================
// src/lib/verify.js – code de vérification d'une attestation
// ----------------------------------------------------------------------------
// Chaque attestation porte un QR code. En le scannant, on arrive sur une page
// qui recalcule un "code de vérification" et le compare à celui imprimé.
//
// ⚠️  VERSION DE DÉMONSTRATION : le code est une empreinte (SHA-256) des
// informations du candidat. Comme il n'y a pas de clé secrète, quelqu'un de
// très motivé pourrait fabriquer un faux code.
// EN PRODUCTION (phase 2) : le code serait une SIGNATURE créée par le serveur
// de l'ONEC avec une clé privée qui ne quitte jamais le serveur.
// ============================================================================

import { SITE_URL } from '../legal/config.js'

/** Renvoie un code lisible de type "7F3A-91BC". */
export async function verificationCode(candidat) {
  const contenu = [
    candidat.id,
    candidat.tableNumber,
    candidat.lastName,
    candidat.firstName,
    candidat.status,
    candidat.average ?? '',
  ].join('|')

  let hex
  if (globalThis.crypto?.subtle) {
    const octets = new TextEncoder().encode(contenu)
    const hash = await crypto.subtle.digest('SHA-256', octets)
    hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } else {
    // Secours très simple si le navigateur n'a pas "crypto" (ancien appareil).
    let h = 5381
    for (const c of contenu) h = (h * 33 + c.charCodeAt(0)) >>> 0
    hex = h.toString(16).padStart(8, '0')
  }
  const code = hex.slice(0, 8).toUpperCase()
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`
}

/** Vrai quand le site tourne dans l'application Android (Capacitor). */
export const isNativeApp = () => Boolean(window.Capacitor?.isNativePlatform?.())

/** Construit le lien intégré au QR code (ouvre la page de vérification). */
export function verificationUrl(sessionId, candidat, code) {
  // Dans l'appli, l'adresse interne n'est pas ouvrable par un tiers : on vise le site public.
  const base = isNativeApp() ? SITE_URL : window.location.href.split('#')[0]
  return `${base}#/verif/${sessionId}/${encodeURIComponent(candidat.tableNumber)}/${code}`
}

// ============================================================================
// attestationService.js – parler au SERVICE D'ATTESTATION (protection réelle)
// ----------------------------------------------------------------------------
// Quand l'autorité organisatrice active le service (exams.json > attestationService.url), la
// moyenne, la date de naissance, etc. ne sont plus dans les fichiers publics : on les demande au
// service avec le numéro de table et la date de naissance saisis.
// Le résultat (admis / ajourné) vient toujours du site public : si le service est lent ou
// arrêté, personne n'est empêché de savoir s'il est admis.
// ============================================================================

/**
 * @returns {Promise<{etat: 'ok', details: object} | {etat: 'refus'} | {etat: 'limite', attenteS: number} | {etat: 'indisponible'}>}
 */
export async function demanderAttestation(url, session, numero, naissance) {
  try {
    const reponse = await fetch(`${url.replace(/\/$/, '')}/attestation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, numero, naissance }),
    })
    if (reponse.status === 200) return { etat: 'ok', details: (await reponse.json()).details ?? {} }
    if (reponse.status === 401) return { etat: 'refus' }
    if (reponse.status === 429) return { etat: 'limite', attenteS: (await reponse.json().catch(() => ({}))).attenteS ?? 60 }
    return { etat: 'indisponible' }
  } catch {
    return { etat: 'indisponible' } // réseau coupé, service arrêté…
  }
}

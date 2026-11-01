// ============================================================================
// attestation/lib/limiteur.mjs – le LIMITEUR D'ESSAIS
// ----------------------------------------------------------------------------
// Logique : il y a ~2 000 dates de naissance possibles pour une classe d'âge. Sans limite, un
// programme les essaierait toutes en quelques minutes. Ce limiteur compte les ÉCHECS et bloque :
//   • par numéro de table : 5 échecs → pause de 15 minutes pour CE numéro (au plus ~480 essais
//     par jour et par numéro : deviner une date au hasard devient impraticable) ;
//   • par adresse IP : 30 échecs en 10 minutes → pause pour cette adresse (freine qui balaie
//     beaucoup de numéros).
// Un succès n'efface pas le compteur de l'adresse (sinon on pourrait « recharger » ses essais en
// réussissant de temps en temps sur son propre numéro).
// Tout est en mémoire : un redémarrage remet à zéro, c'est acceptable car la mémoire contient aussi
// les données (aucune persistance de secret).
// ============================================================================

export class Limiteur {
  /**
   * @param {object} o
   * @param {number} [o.maxParNumero]  échecs tolérés par numéro dans la fenêtre
   * @param {number} [o.fenetreNumeroMs]
   * @param {number} [o.maxParIp]
   * @param {number} [o.fenetreIpMs]
   * @param {() => number} [o.horloge]  injectable pour les tests
   */
  constructor({ maxParNumero = 5, fenetreNumeroMs = 15 * 60_000, maxParIp = 30, fenetreIpMs = 10 * 60_000, horloge = Date.now } = {}) {
    this.cfg = { maxParNumero, fenetreNumeroMs, maxParIp, fenetreIpMs }
    this.horloge = horloge
    this.numeros = new Map() // clé → { echecs: [dates] }
    this.ips = new Map()
  }

  /** Garde, dans la liste, seulement les échecs encore dans la fenêtre. */
  #recents(carte, cle, fenetre) {
    const maintenant = this.horloge()
    const liste = (carte.get(cle) ?? []).filter((t) => maintenant - t < fenetre)
    if (liste.length) carte.set(cle, liste)
    else carte.delete(cle)
    return liste
  }

  /**
   * Peut-on tenter ? Renvoie { ok: true } ou { ok: false, attenteS } (secondes à attendre).
   */
  verifier(numeroCle, ip) {
    const { maxParNumero, fenetreNumeroMs, maxParIp, fenetreIpMs } = this.cfg
    const maintenant = this.horloge()
    const attentes = []
    const n = this.#recents(this.numeros, numeroCle, fenetreNumeroMs)
    if (n.length >= maxParNumero) attentes.push(n[0] + fenetreNumeroMs - maintenant)
    const i = this.#recents(this.ips, ip, fenetreIpMs)
    if (i.length >= maxParIp) attentes.push(i[0] + fenetreIpMs - maintenant)
    if (!attentes.length) return { ok: true }
    return { ok: false, attenteS: Math.max(1, Math.ceil(Math.max(...attentes) / 1000)) }
  }

  /** À appeler après un échec d'identité. */
  echec(numeroCle, ip) {
    const t = this.horloge()
    if (numeroCle) this.numeros.set(numeroCle, [...(this.numeros.get(numeroCle) ?? []), t])
    this.ips.set(ip, [...(this.ips.get(ip) ?? []), t])
  }

  /** Ménage périodique : retire les entrées expirées (évite que la mémoire grossisse sans fin). */
  nettoyer() {
    for (const cle of [...this.numeros.keys()]) this.#recents(this.numeros, cle, this.cfg.fenetreNumeroMs)
    for (const cle of [...this.ips.keys()]) this.#recents(this.ips, cle, this.cfg.fenetreIpMs)
  }
}

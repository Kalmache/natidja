// ============================================================================
// src/hooks.js – "hooks" React réutilisables
// ----------------------------------------------------------------------------
// Un hook est une fonction dont le nom commence par "use" ; elle permet à un
// composant de mémoriser un état, réagir à un événement, etc.
// ============================================================================
import { useEffect, useRef, useState } from 'react'

/** Vrai si la personne a demandé "moins d'animations" dans son système. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Comme useState, mais la valeur est mémorisée dans le navigateur
 * (localStorage) pour être retrouvée à la prochaine visite.
 * `valide` empêche d'accepter une valeur trafiquée/inattendue.
 */
export function usePersistedState(cle, defaut, valide = () => true) {
  const [valeur, setValeur] = useState(() => {
    try {
      const stockee = localStorage.getItem(cle)
      return stockee !== null && valide(stockee) ? stockee : defaut
    } catch {
      return defaut // localStorage bloqué (navigation privée...) : pas grave
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(cle, valeur)
    } catch {
      /* ignoré */
    }
  }, [cle, valeur])
  return [valeur, setValeur]
}

/** Lit l'adresse après le # (ex. "#/stats") et se met à jour quand elle change. */
export function useHashRoute() {
  const lire = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [segments, setSegments] = useState(lire)
  useEffect(() => {
    const maj = () => setSegments(lire())
    window.addEventListener('hashchange', maj)
    return () => window.removeEventListener('hashchange', maj)
  }, [])
  return segments.map(decodeURIComponent)
}

export const navigate = (chemin) => {
  window.location.hash = chemin
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

/** Suit l'état de la connexion (en ligne / hors-ligne). */
export function useOnline() {
  const [enLigne, setEnLigne] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setEnLigne(true)
    const off = () => setEnLigne(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return enLigne
}

/**
 * Capte l'invitation d'installation envoyée par Chrome/Edge/Android.
 * `installer` est null tant que l'installation n'est pas possible.
 */
export function useInstallPrompt() {
  const [evenement, setEvenement] = useState(null)
  useEffect(() => {
    const avant = (e) => {
      e.preventDefault() // on affichera notre propre bouton
      setEvenement(e)
    }
    const apres = () => setEvenement(null)
    window.addEventListener('beforeinstallprompt', avant)
    window.addEventListener('appinstalled', apres)
    return () => {
      window.removeEventListener('beforeinstallprompt', avant)
      window.removeEventListener('appinstalled', apres)
    }
  }, [])
  if (!evenement) return null
  return async () => {
    evenement.prompt()
    await evenement.userChoice
    setEvenement(null)
  }
}

/**
 * Anime un nombre de 0 jusqu'à `cible` quand l'élément devient visible.
 * Renvoie [valeurAffichee, refAAttacherALElement].
 */
export function useCountUp(cible, duree = 1400) {
  const ref = useRef(null)
  const [valeur, setValeur] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValeur(cible)
      return
    }
    let raf
    const lancer = () => {
      const debut = performance.now()
      const etape = (maintenant) => {
        const progres = Math.min(1, (maintenant - debut) / duree)
        const adouci = 1 - Math.pow(1 - progres, 3) // ralentit à la fin (easeOutCubic)
        setValeur(cible * adouci)
        if (progres < 1) raf = requestAnimationFrame(etape)
      }
      raf = requestAnimationFrame(etape)
    }
    // On attend que le chiffre soit réellement à l'écran avant d'animer.
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          observateur.disconnect()
          lancer()
        }
      },
      { threshold: 0.3 },
    )
    if (ref.current) observateur.observe(ref.current)
    return () => {
      observateur.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [cible, duree])

  return [valeur, ref]
}

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

/**
 * Repère l'ouverture du clavier du téléphone : dès qu'un champ de saisie a le
 * focus, on ajoute la classe « clavier » sur la page. Le CSS s'en sert pour
 * CACHER la barre de navigation du bas, qui sinon se colle au clavier et
 * recouvre la moitié du champ qu'on essaie de remplir.
 */
export function useClavier() {
  useEffect(() => {
    const racine = document.documentElement
    const estChamp = (el) => el?.matches?.('input:not([type=checkbox]):not([type=radio]), textarea, select')
    const entree = (e) => estChamp(e.target) && racine.classList.add('clavier')
    const sortie = (e) => estChamp(e.target) && racine.classList.remove('clavier')
    document.addEventListener('focusin', entree)
    document.addEventListener('focusout', sortie)
    return () => {
      document.removeEventListener('focusin', entree)
      document.removeEventListener('focusout', sortie)
      racine.classList.remove('clavier')
    }
  }, [])
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

// ----------------------------------------------------------------------------
// GLISSEMENT (swipe) : passer d'une page à la suivante en glissant le doigt
// ----------------------------------------------------------------------------
/** Vrai si le geste a commencé dans une zone où un glissement a un autre sens. */
function geste_reserve(element) {
  if (!element?.closest) return false
  // champs de saisie, fenêtres (attestation), écran d'ouverture, zones marquées data-no-swipe
  if (element.closest('input, textarea, select, [contenteditable], [data-no-swipe], .modal, .splash')) return true
  // une zone qui défile elle-même horizontalement (ex. barre des pages légales sur téléphone)
  for (let n = element; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n)
    if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 2) return true
  }
  return false
}

/**
 * Appelle onNext / onPrev quand l'utilisateur glisse horizontalement.
 * LTR : glisser vers la GAUCHE = page suivante. RTL (arabe) : c'est l'inverse.
 * Garde-fous : geste franchement horizontal (pas un défilement vertical), assez long et
 * assez rapide, pas depuis le bord de l'écran (réservé au geste « retour » d'Android).
 */
export function useSwipe({ onNext, onPrev, dir = 'ltr', actif = true }) {
  // On garde toujours les dernières valeurs sans réinstaller les écouteurs à chaque rendu.
  const dernier = useRef({})
  dernier.current = { onNext, onPrev, dir, actif }

  useEffect(() => {
    let depart = null
    const debut = (e) => {
      if (e.touches.length !== 1) return (depart = null) // pincement à deux doigts : on ignore
      const t = e.touches[0]
      // timeStamp = l'heure RÉELLE du geste (insensible aux ralentissements de la page)
      depart = { x: t.clientX, y: t.clientY, temps: e.timeStamp, cible: e.target }
    }
    const fin = (e) => {
      const d = depart
      depart = null
      const { onNext, onPrev, dir, actif } = dernier.current
      if (!d || !actif || document.body.classList.contains('no-scroll')) return
      const t = e.changedTouches[0]
      const dx = t.clientX - d.x
      const dy = t.clientY - d.y
      if (e.timeStamp - d.temps > 1200) return // trop lent : ce n'est plus un geste de glissement
      // Deux façons de réussir : un glissement assez long, OU un coup de doigt rapide
      // (même court). Le geste doit surtout être horizontal.
      const duree = Math.max(1, e.timeStamp - d.temps)
      const rapide = Math.abs(dx) >= 40 && Math.abs(dx) / duree > 0.35 // > 0,35 px/ms
      if ((Math.abs(dx) < 55 && !rapide) || Math.abs(dx) < Math.abs(dy) * 1.25) return
      if (d.x < 16 || d.x > window.innerWidth - 16) return // bord d'écran (geste « retour » du système)
      if (geste_reserve(d.cible) || window.getSelection?.().toString()) return
      const versSuivant = dir === 'rtl' ? dx > 0 : dx < 0
      if (versSuivant) onNext?.()
      else onPrev?.()
    }
    const annule = () => (depart = null)
    document.addEventListener('touchstart', debut, { passive: true })
    document.addEventListener('touchend', fin, { passive: true })
    document.addEventListener('touchcancel', annule, { passive: true })
    return () => {
      document.removeEventListener('touchstart', debut)
      document.removeEventListener('touchend', fin)
      document.removeEventListener('touchcancel', annule)
    }
  }, [])
}

// ============================================================================
// Splash.jsx – l'écran d'ouverture animé (l'effet « waouh »)
// ----------------------------------------------------------------------------
// Déroulé (≈ 2,6 s) : le drapeau apparaît bande par bande → le titre se
// dévoile lettre par lettre → une barre de progression se remplit → fondu.
// Pendant ce temps, l'application charge déjà les données en arrière-plan :
// l'animation ne fait donc PERDRE aucun temps à l'utilisateur.
//
// Règles de bonne conduite :
//  - affiché une seule fois par session (pas à chaque rechargement) ;
//  - jamais affiché si la personne a demandé « moins d'animations » ;
//  - on peut le passer en touchant l'écran ou avec Entrée / Échap.
// ============================================================================
import { useEffect, useState } from 'react'
import Flag from './Flag.jsx'
import Signature from './Signature.jsx'
import { useI18n } from '../i18n/index.jsx'
import { prefersReducedMotion } from '../hooks.js'

const DUREE_MS = 2600
const CLE = 'ndeze_splash_vu'

const dejaVu = () => {
  try {
    return sessionStorage.getItem(CLE) === '1'
  } catch {
    return false
  }
}

export default function Splash({ onDone }) {
  const { t } = useI18n()
  const [visible] = useState(() => !prefersReducedMotion() && !dejaVu())
  const [sortie, setSortie] = useState(false)

  // Si on ne doit pas l'afficher, on prévient tout de suite l'application.
  useEffect(() => {
    if (!visible) onDone()
  }, [visible, onDone])

  const terminer = () => {
    setSortie(true)
    try {
      sessionStorage.setItem(CLE, '1')
    } catch {
      /* ignoré */
    }
    setTimeout(onDone, 550) // le temps du fondu de sortie
  }

  useEffect(() => {
    if (!visible) return
    const minuteur = setTimeout(terminer, DUREE_MS)
    const touche = (e) => (e.key === 'Enter' || e.key === 'Escape') && terminer()
    window.addEventListener('keydown', touche)
    return () => {
      clearTimeout(minuteur)
      window.removeEventListener('keydown', touche)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!visible) return null

  const titre = 'Ndeze Natidja'

  return (
    <div
      className={`splash ${sortie ? 'splash--out' : ''}`}
      onClick={terminer}
      role="dialog"
      aria-label={t('app.name')}
    >
      <div className="splash__aurora" aria-hidden="true" />
      <div className="splash__content">
        <Flag animated className="splash__flag" />
        <h1 className="splash__title" aria-label={titre}>
          {[...titre].map((lettre, i) => (
            <span key={i} style={{ '--d': `${0.9 + i * 0.045}s` }} aria-hidden="true">
              {lettre === ' ' ? ' ' : lettre}
            </span>
          ))}
        </h1>
        <p className="splash__tagline">{t('app.tagline')}</p>
        <div className="splash__bar" aria-hidden="true">
          <i />
        </div>
        <p className="splash__loading">{t('splash.loading')}</p>
      </div>
      <p className="splash__credit"><Signature /></p>
      <button type="button" className="splash__skip" onClick={terminer}>
        {t('splash.skip')}
      </button>
    </div>
  )
}

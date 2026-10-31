// ============================================================================
// Signature.jsx – la signature « Conçu par M.M.B.T » (réutilisée partout :
// pied de page, écran d'ouverture, page Licence). Le nom scintille aux couleurs
// du drapeau comorien ; l'animation s'arrête si « moins d'animations » est demandé.
// ============================================================================
import { useI18n } from '../i18n/index.jsx'
import { EDITOR } from '../legal/config.js'

export default function Signature({ size = 'md', link = false }) {
  const { t } = useI18n()
  const nom = <strong className="signature__name">{EDITOR.name}</strong>
  return (
    <span className={`signature signature--${size}`}>
      <span className="signature__by">{t('signature.by')}</span>{' '}
      {link ? (
        <a href={EDITOR.website} target="_blank" rel="noopener noreferrer">
          {nom}
        </a>
      ) : (
        nom
      )}
    </span>
  )
}

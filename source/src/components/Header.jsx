// ============================================================================
// Header.jsx – barre du haut (logo, navigation, réglages) + BottomNav (barre
// du bas, façon application mobile, visible seulement sur petit écran).
// ============================================================================
import Icon from './Icon.jsx'
import Flag from './Flag.jsx'
import { LANGS, useI18n } from '../i18n/index.jsx'
import { navigate, useInstallPrompt, useOnline } from '../hooks.js'
import Signature from './Signature.jsx'
import { EDITOR, VERSION } from '../legal/config.js'
import { PAGES_LEGALES } from '../views/LegalView.jsx'

export const PALETTES = [
  { id: 'emerald', name: 'Émeraude', color: '#059669' },
  { id: 'sapphire', name: 'Saphir', color: '#2563eb' },
  { id: 'amber', name: 'Soleil', color: '#d97706' },
  { id: 'ruby', name: 'Rubis', color: '#e11d48' },
]

const ONGLETS = [
  { id: 'results', path: '/', icon: 'search', label: 'nav.results' },
  { id: 'stats', path: '/stats', icon: 'chart', label: 'nav.stats' },
  { id: 'about', path: '/about', icon: 'info', label: 'nav.about' },
]

export function Header({ view, theme, onTheme, palette, onPalette, lang, onLang, sessionLabel }) {
  const { t } = useI18n()
  const enLigne = useOnline()
  const installer = useInstallPrompt()
  const autreLangue = lang === 'fr' ? 'ar' : 'fr'

  return (
    <header className="header no-print">
      <div className="header__inner">
        <a className="brand" href="#/" onClick={() => navigate('/')}>
          <span className="brand__mark"><Flag /></span>
          <span className="brand__text">
            <strong>{t('app.name')}</strong>
            <small>{sessionLabel}</small>
          </span>
        </a>

        <nav className="nav" aria-label="Navigation principale">
          {ONGLETS.map((o) => (
            <a
              key={o.id}
              href={`#${o.path}`}
              className={view === o.id ? 'is-active' : ''}
              aria-current={view === o.id ? 'page' : undefined}
            >
              <Icon name={o.icon} size={16} /> {t(o.label)}
            </a>
          ))}
        </nav>

        <div className="tools">
          <div className="swatches" role="group" aria-label={t('header.palette')}>
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                style={{ '--c': p.color }}
                className={palette === p.id ? 'is-active' : ''}
                onClick={() => onPalette(p.id)}
                title={p.name}
                aria-label={p.name}
                aria-pressed={palette === p.id}
              />
            ))}
          </div>

          <span className={`status ${enLigne ? 'is-on' : 'is-off'}`} title={enLigne ? t('header.online') : t('header.offline')}>
            <i /> <span>{enLigne ? t('header.online') : t('header.offline')}</span>
          </span>

          {installer && (
            <button type="button" className="btn btn--primary btn--sm" onClick={installer}>
              <Icon name="download" size={14} /> {t('header.install')}
            </button>
          )}

          <button
            type="button"
            className="btn btn--icon btn--lang"
            onClick={() => onLang(autreLangue)}
            aria-label={t('header.lang')}
            title={LANGS[autreLangue].label}
          >
            {LANGS[autreLangue].short}
          </button>

          <button
            type="button"
            className="btn btn--icon"
            onClick={onTheme}
            aria-label={theme === 'dark' ? t('header.toLight') : t('header.toDark')}
            title={theme === 'dark' ? t('header.toLight') : t('header.toDark')}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}

export function BottomNav({ view }) {
  const { t } = useI18n()
  return (
    <nav className="bottomnav no-print" aria-label="Navigation principale">
      {ONGLETS.map((o) => (
        <a key={o.id} href={`#${o.path}`} className={view === o.id ? 'is-active' : ''} aria-current={view === o.id ? 'page' : undefined}>
          <Icon name={o.icon} size={22} />
          <span>{t(o.label)}</span>
        </a>
      ))}
    </nav>
  )
}

export function Footer() {
  const { t } = useI18n()
  const reseaux = [
    ['TikTok', EDITOR.tiktok],
    ['Instagram', EDITOR.instagram],
  ].filter(([, url]) => url) // un lien vide n'est pas affiché
  return (
    <footer className="footer no-print">
      {/* Filet animé aux couleurs du drapeau */}
      <div className="footer__flagline" aria-hidden="true" />
      <div className="footer__inner">
        <p className="footer__org">
          <strong>{t('footer.line')}</strong>
          <span>{t('footer.org')}</span>
        </p>
        <p className="footer__made">
          <Signature link /> · {EDITOR.year} ·{' '}
          <a href={EDITOR.website} target="_blank" rel="noopener noreferrer">{EDITOR.websiteLabel}</a>
        </p>
        <p className="footer__contact">
          {t('footer.contact')} : <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>
          {reseaux.map(([nom, url]) => (
            <span key={nom}> · <a href={url} target="_blank" rel="noopener noreferrer">{nom}</a></span>
          ))}
        </p>
        <nav className="footer__legal" aria-label="Pages légales">
          {PAGES_LEGALES.map((p) => <a key={p} href={`#/legal/${p}`}>{t(`legal.${p}`)}</a>)}
          <a href="#/verif">{t('footer.verify')}</a>
        </nav>
        <p className="footer__small">v{VERSION} · {t('demo.short')}</p>
      </div>
    </footer>
  )
}

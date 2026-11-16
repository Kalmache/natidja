// ============================================================================
// Header.jsx – barre du haut (logo, navigation, réglages) + BottomNav (barre
// du bas, façon application mobile, visible seulement sur petit écran).
// ============================================================================
import Icon from './Icon.jsx'
import { FlagWave } from './Flag.jsx'
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
  { id: 'settings', path: '/settings', icon: 'sliders', label: 'nav.settings' },
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
          <span className="brand__mark"><FlagWave tranches={12} amplitude="2.2px" duree="3.2s" /></span>
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

// Bas de page commun aux applis MMBT (même style que mmbt.fr, voir styles/pied-mmbt.css) :
// un bandeau avec un seul bouton, puis 3 colonnes (Natidja / Contact / Explorer) et la ligne des pages légales.
const ICO = {
  lieu: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>,
  mail: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>,
  wa: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8.6 19z" /><path d="M9.2 8.6c.2-.4.6-.4.8 0l.7 1.5-.6.8a5 5 0 0 0 2.9 2.9l.8-.6 1.5.7c.4.2.4.6 0 .8-1.6 1.2-4.2.3-6-1.6-1.8-1.8-2.4-3.6-.1-4.5z" /></svg>,
  reseaux: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></svg>,
}
const FLECHE = <span className="pm-fleche" aria-hidden="true">↗</span>
const WHATSAPP = 'https://wa.me/33644252825?text=' + encodeURIComponent("Bonjour Maabadi, je viens de l'appli Ndeze Natidja")

export function Footer() {
  const { t } = useI18n()
  const explorer = [
    [t('footer.verify'), '#/verif', false],
    [t('footer.discover'), '#/decouvrir', false],
    [t('pied.guide'), 'https://mmbt.fr/guide-natidja.html', true],
    [t('pied.avis'), 'https://mmbt.fr/temoignage.php?appli=natidja', true],
    [t('pied.autres'), EDITOR.website, true],
  ]
  const ext = { target: '_blank', rel: 'noopener noreferrer' }
  return (
    <div className="pm no-print">
      {/* Filet aux couleurs du drapeau comorien, la marque de Natidja */}
      <div className="footer__flagline" aria-hidden="true" />
      <section className="pm-bande" aria-label={t('pied.titre')}>
        <div className="pm-bande-in">
          <div>
            <p className="pm-kick">{t('pied.kick')}</p>
            <h2>{t('pied.titre')}</h2>
            <p>{t('pied.texte')}</p>
          </div>
          <a className="pm-btn" href={`mailto:${EDITOR.email}?subject=Ndeze%20Natidja`}>{t('pied.bouton')} <span aria-hidden="true">↗</span></a>
        </div>
      </section>
      <footer className="pm-pied">
        <div className="pm-cols">
          <div className="pm-col">
            <a className="pm-marque" href="#/"><img src="icons/icon-192.png" alt="" width="34" height="34" /><span>Ndeze Natidja</span></a>
            <p>{t('pied.phrase')}</p>
            <p className="pm-lieu">{ICO.lieu}<span>{t('pied.lieu')}</span></p>
            <p className="pm-note">{t('demo.short')}</p>
          </div>
          <div className="pm-col">
            <h2>{t('footer.contact')}</h2>
            <ul className="pm-contact">
              <li><span className="pm-ico">{ICO.mail}</span><span><small>{t('pied.email')}</small><a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a></span></li>
              <li><span className="pm-ico">{ICO.wa}</span><span><small>WhatsApp</small><a href={WHATSAPP} {...ext}>{t('pied.whatsapp')}</a></span></li>
              <li><span className="pm-ico">{ICO.reseaux}</span><span><small>{t('pied.reseaux')}</small><a href={EDITOR.tiktok} {...ext}>TikTok</a><span className="pm-sep" aria-hidden="true">·</span><a href={EDITOR.instagram} {...ext}>Instagram</a></span></li>
            </ul>
          </div>
          <div className="pm-col">
            <h2>{t('pied.explorer')}</h2>
            <ul className="pm-liens">
              {explorer.map(([nom, url, dehors]) => (
                <li key={url}><a href={url} {...(dehors ? ext : {})}>{nom}{FLECHE}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pm-bas">
          <span>{t('pied.droits')} <Signature link /> · <span className="pm-version">v{VERSION}</span></span>
          <span className="pm-legal">
            {PAGES_LEGALES.map((p) => <a key={p} href={`#/legal/${p}`}>{t(`legal.${p}`)}</a>)}
          </span>
        </div>
      </footer>
    </div>
  )
}

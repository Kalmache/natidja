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
}
const FLECHE = <span className="pm-fleche" aria-hidden="true">↗</span>
const WHATSAPP = 'https://wa.me/33644252825?text=' + encodeURIComponent("Bonjour Maabadi Ben Tamou, je viens de l'appli Ndeze Natidja")
// Réseaux officiels MMBT : logo officiel dans un bouton rond cerclé, d'une seule couleur (celle du texte).
const RESEAUX = [
  { titre: 'Chaîne WhatsApp MMBT', href: 'https://whatsapp.com/channel/0029VbDtu6u2phHKrw1eqj34', d: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z' },
  { titre: 'TikTok @mmbt.fr', href: EDITOR.tiktok, d: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
  { titre: 'Instagram @mmbt.fr', href: EDITOR.instagram, d: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077' },
]

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
            <div className="pm-reseaux" role="group" aria-label={t('pied.reseaux')}>
              {RESEAUX.map((r) => (
                <a key={r.href} href={r.href} {...ext} aria-label={r.titre} title={r.titre}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={r.d} /></svg></a>
              ))}
            </div>
          </div>
          <div className="pm-col">
            <h2>{t('footer.contact')}</h2>
            <ul className="pm-contact">
              <li><span className="pm-ico">{ICO.mail}</span><span><small>{t('pied.email')}</small><a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a></span></li>
              <li><span className="pm-ico">{ICO.wa}</span><span><small>WhatsApp</small><a href={WHATSAPP} {...ext}>{t('pied.whatsapp')}</a></span></li>
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

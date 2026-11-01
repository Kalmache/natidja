// ============================================================================
// SettingsView.jsx – la page « Réglages » (apparence, langue, application, espace responsable)
// ----------------------------------------------------------------------------
// Sur téléphone, c'est ici qu'on change la couleur, le thème et la langue.
// L'« Espace responsable » est volontairement NON connecté : tant qu'une vraie
// connexion sécurisée n'existe pas, on n'affiche AUCUN formulaire de mot de passe
// (un faux formulaire donnerait une fausse impression de sécurité).
// ============================================================================
import Icon from '../components/Icon.jsx'
import { PALETTES } from '../components/Header.jsx'
import { LANGS, useI18n } from '../i18n/index.jsx'
import { isNativeApp } from '../lib/verify.js'
import { useInstallPrompt, useOnline } from '../hooks.js'
import { VERSION } from '../legal/config.js'
import { redigerDemandeInformations } from '../legal/autorisation.js'
import { PAGES_LEGALES } from './LegalView.jsx'

export default function SettingsView({ theme, onSetTheme, palette, onPalette, lang, onLang }) {
  const { t } = useI18n()
  // « Demander des informations » : l'e-mail s'ouvre déjà rédigé dans la messagerie.
  const demandeInfos = redigerDemandeInformations({ version: VERSION })
  const enLigne = useOnline()
  const installer = useInstallPrompt() // null si l'installation n'est pas proposée par le navigateur

  /**
   * « Actualiser les résultats » : vide seulement la copie gardée des résultats puis recharge.
   * Utile dans l'appli installée, qui n'a ni barre d'adresse ni bouton « Actualiser » : après une
   * publication ou une correction, on est sûr de voir la dernière version. Les préférences restent.
   */
  const actualiser = async () => {
    try {
      if ('caches' in window) {
        const noms = await caches.keys()
        await Promise.all(noms.filter((n) => n.includes('resultats')).map((n) => caches.delete(n)))
      }
    } catch {
      /* pas de cache accessible : le rechargement suffit */
    }
    window.location.reload()
  }

  /** Efface les préférences et la copie hors-ligne des résultats, puis recharge. */
  const reinitialiser = async () => {
    if (!window.confirm(t('settings.resetConfirm'))) return
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('ndeze_')).forEach((k) => localStorage.removeItem(k))
      sessionStorage.removeItem('ndeze_splash_vu')
      if ('caches' in window) {
        const noms = await caches.keys()
        // On ne supprime que la copie des résultats ; le « squelette » de l'appli reste.
        await Promise.all(noms.filter((n) => n.includes('resultats')).map((n) => caches.delete(n)))
      }
    } catch {
      /* stockage inaccessible : pas grave */
    }
    window.location.reload()
  }

  return (
    <div className="page">
      <header className="page__head">
        <h1>{t('settings.title')}</h1>
      </header>

      <div className="about-grid">
        <section className="panel">
          <h2>{t('settings.appearance')}</h2>

          <p className="field-label">{t('settings.theme')}</p>
          <div className="pills">
            {['light', 'dark'].map((m) => (
              <button key={m} type="button" className={`pill ${theme === m ? 'is-active' : ''}`} aria-pressed={theme === m} onClick={() => onSetTheme(m)}>
                <Icon name={m === 'dark' ? 'moon' : 'sun'} size={14} /> {t(`settings.${m}`)}
              </button>
            ))}
          </div>

          <p className="field-label">{t('settings.palette')}</p>
          <div className="palette-grid">
            {PALETTES.map((p) => (
              <button key={p.id} type="button" className={`palette-btn ${palette === p.id ? 'is-active' : ''}`} aria-pressed={palette === p.id} onClick={() => onPalette(p.id)}>
                <i style={{ background: p.color }} aria-hidden="true" /> {p.name}
              </button>
            ))}
          </div>

          <p className="field-label">{t('settings.language')}</p>
          <div className="pills">
            {Object.entries(LANGS).map(([code, l]) => (
              <button key={code} type="button" className={`pill ${lang === code ? 'is-active' : ''}`} aria-pressed={lang === code} onClick={() => onLang(code)}>
                <Icon name="globe" size={14} /> {l.label}
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>{t('settings.appTitle')}</h2>
          <dl className="kv">
            <div><dt>{t('settings.status')}</dt><dd><span className={`status ${enLigne ? 'is-on' : 'is-off'}`}><i /> {enLigne ? t('header.online') : t('header.offline')}</span></dd></div>
            <div><dt>{t('settings.version')}</dt><dd>v{VERSION}{isNativeApp() ? ' · Android' : ''}</dd></div>
          </dl>
          <p className="muted small">{t('settings.offline')}</p>
          {installer && !isNativeApp() && (
            <button type="button" className="btn btn--primary" onClick={installer}>
              <Icon name="download" size={16} /> {t('settings.install')}
            </button>
          )}
          <div className="settings-reset">
            <button type="button" className="btn btn--primary" onClick={actualiser}>
              <Icon name="refresh" size={16} /> {t('settings.refresh')}
            </button>
            <p className="muted small">{t('settings.refreshHint')}</p>
            <button type="button" className="btn" onClick={reinitialiser}>
              <Icon name="refresh" size={16} /> {t('settings.reset')}
            </button>
            <p className="muted small">{t('settings.resetHint')}</p>
          </div>
        </section>

        <section className="panel panel--wide manager">
          <h2>
            <Icon name="lock" size={20} /> {t('settings.managerTitle')} <span className="chip chip--accent">{t('settings.managerBadge')}</span>
          </h2>
          <p>{t('settings.managerBody')}</p>
          <div className="manager__actions">
            <button type="button" className="btn" disabled><Icon name="lock" size={16} /> {t('settings.managerButton')}</button>
            <a className="btn btn--ghost" href={demandeInfos.lien}>{t('settings.managerContact')}</a>
          </div>
        </section>

        <section className="panel panel--wide">
          <h2>{t('about.legalTitle')}</h2>
          <div className="legal-links">
            {PAGES_LEGALES.map((p) => (
              <a key={p} href={`#/legal/${p}`} className="pill">
                <Icon name={p === 'journal' ? 'list' : p === 'licence' ? 'shield' : 'info'} size={14} /> {t(`legal.${p}`)}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

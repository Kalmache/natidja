// ============================================================================
// App.jsx – le composant racine : il assemble tout.
// ----------------------------------------------------------------------------
// Responsabilités :
//  1. mémoriser les préférences (thème clair/sombre, couleur, langue) ;
//  2. charger la configuration des examens (exams.json) ;
//  3. choisir quelle « vue » afficher selon l'adresse (#/stats, #/about...) ;
//  4. afficher l'écran d'ouverture animé (Splash) pendant le chargement.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { I18nProvider, LANGS, useI18n } from './i18n/index.jsx'
import { brancherRetourNatif } from './lib/retour.js'
import { isNativeApp } from './lib/verify.js'
import { navigate, useClavier, useHashRoute, usePersistedState, useSwipe } from './hooks.js'
import { loadConfig, loadStats } from './lib/data.js'
import Splash from './components/Splash.jsx'
import { libelleSession } from './components/SessionPicker.jsx'
import Icon from './components/Icon.jsx'
import { BottomNav, Footer, Header, PALETTES } from './components/Header.jsx'
import ResultsView from './views/ResultsView.jsx'
import StatsView from './views/StatsView.jsx'
import AboutView from './views/AboutView.jsx'
import VerifyView from './views/VerifyView.jsx'
import LegalView, { PAGES_LEGALES } from './views/LegalView.jsx'
import SettingsView from './views/SettingsView.jsx'

// Démarre le téléchargement des données TOUT DE SUITE (avant même que React
// n'ait fini d'afficher la page) : pendant que le Splash s'anime, les
// premiers résultats arrivent.
const demarrage = loadConfig()
demarrage.then((c) => c.defaultSessionId && loadStats(c.defaultSessionId)).catch(() => {})

const THEME_PAR_DEFAUT = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export default function App() {
  const [theme, setTheme] = usePersistedState('ndeze_theme', THEME_PAR_DEFAUT, (v) => v === 'dark' || v === 'light')
  const [palette, setPalette] = usePersistedState('ndeze_palette', 'emerald', (v) => PALETTES.some((p) => p.id === v))
  const [lang, setLang] = usePersistedState('ndeze_lang', 'fr', (v) => v in LANGS)

  // On pousse les préférences sur la balise <html> : le CSS s'en sert.
  useEffect(() => {
    const html = document.documentElement
    html.dataset.theme = theme
    html.dataset.palette = palette
    html.lang = lang
    html.dir = LANGS[lang].dir
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#052e24' : '#047857')
    // Application Android : icônes de la barre d'état (heure, batterie...) claires sur
    // fond sombre, foncées sur fond clair, pour rester lisibles quel que soit le thème choisi.
    try {
      window.Capacitor?.Plugins?.SystemBars?.setStyle?.({ style: theme === 'dark' ? 'DARK' : 'LIGHT' })
    } catch {
      /* hors application : sans effet */
    }
  }, [theme, palette, lang])

  return (
    <I18nProvider lang={lang}>
      <Shell
        theme={theme}
        onTheme={() => setTheme((v) => (v === 'dark' ? 'light' : 'dark'))}
        onSetTheme={setTheme}
        palette={palette}
        onPalette={setPalette}
        lang={lang}
        onLang={setLang}
      />
    </I18nProvider>
  )
}

// Ordre des onglets : c'est aussi l'ordre dans lequel on passe de l'un à l'autre en glissant.
const ONGLETS_ORDRE = [
  ['results', '/'],
  ['stats', '/stats'],
  ['about', '/about'],
  ['settings', '/settings'],
]

function Shell({ theme, onTheme, onSetTheme, palette, onPalette, lang, onLang }) {
  const { t } = useI18n()
  const [config, setConfig] = useState(null)
  const [erreur, setErreur] = useState(false)
  const [essai, setEssai] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [ile, setIle] = useState('all')
  const route = useHashRoute()

  useEffect(() => {
    let actif = true
    setErreur(false)
    // Au premier essai on réutilise le téléchargement déjà lancé plus haut.
    const promesse = essai === 0 ? demarrage : loadConfig()
    promesse
      .then((c) => {
        if (!actif) return
        setConfig(c)
        setSessionId((courant) => courant ?? c.defaultSessionId ?? c.sessions[0].id)
      })
      .catch(() => actif && setErreur(true))
    return () => {
      actif = false
    }
  }, [essai])

  // L'écran d'ouverture n'a pas besoin de nous prévenir : l'appli charge ses données en parallèle.
  // Quand on change d'onglet, on repart du haut de la page.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.join('/')])

  // Bouton Retour du téléphone (application Android uniquement) : voir lib/retour.js.
  useEffect(() => {
    if (!isNativeApp()) return undefined
    return brancherRetourNatif({
      estAccueil: () => window.location.hash.replace(/^#\/?/, '') === '',
      versAccueil: () => navigate('/'),
    })
  }, [])

  const onSplashDone = useCallback(() => {}, [])

  const session = config?.sessions.find((s) => s.id === sessionId)
  const vue = route[0] === 'stats' ? 'stats' : route[0] === 'about' ? 'about' : route[0] === 'verif' ? 'verif' : route[0] === 'legal' ? 'legal' : route[0] === 'settings' ? 'settings' : 'results'

  // ----- Glisser pour changer de page -----
  // Sur une page légale : on circule entre les pages légales. Sinon : entre les 4 onglets.
  const pagesOrdre =
    vue === 'legal'
      ? PAGES_LEGALES.map((p) => [`legal/${p}`, `/legal/${p}`])
      : vue === 'verif'
        ? []
        : ONGLETS_ORDRE
  const cle = vue === 'legal' ? `legal/${PAGES_LEGALES.includes(route[1]) ? route[1] : 'mentions'}` : vue
  const indice = pagesOrdre.findIndex(([id]) => id === cle)
  const allerA = (decalage) => {
    const cible = pagesOrdre[indice + decalage]
    if (cible) navigate(cible[1]) // aux extrémités : rien ne se passe
  }
  useClavier() // cache la barre du bas quand le clavier est ouvert
  useSwipe({ onNext: () => allerA(1), onPrev: () => allerA(-1), dir: LANGS[lang].dir, actif: indice >= 0 })

  // Sens de l'animation d'arrivée de la page (+1 = on avance, -1 = on recule).
  const precedente = useRef({ cle, indice })
  const sens = precedente.current.cle === cle ? 0 : indice > precedente.current.indice ? 1 : -1
  useEffect(() => {
    precedente.current = { cle, indice }
  }, [cle, indice])

  const iles = session
    ? [{ id: 'all', name: 'all' }, ...session.islands.map((i) => ({ id: i.id, name: i.name }))]
    : []

  return (
    <div className="app">
      <Splash onDone={onSplashDone} />

      <Header
        view={vue === 'verif' || vue === 'legal' ? 'about' : vue}
        theme={theme}
        onTheme={onTheme}
        palette={palette}
        onPalette={onPalette}
        lang={lang}
        onLang={onLang}
        sessionLabel={session ? libelleSession(session, t) : t('app.tagline')}
      />

      {config?.demo && (
        <div className="demo-banner no-print" role="note">
          <Icon name="alert" size={16} /> {t('demo.banner')}
        </div>
      )}

      <main className="main">
        <div key={cle} className={`view ${sens > 0 ? 'view--next' : sens < 0 ? 'view--prev' : ''}`}>
        {erreur ? (
          <div className="notice notice--error page">
            <Icon name="alert" /> <span>{t('results.error')}</span>
            <button type="button" className="btn btn--sm" onClick={() => setEssai((n) => n + 1)}>
              <Icon name="refresh" size={14} /> {t('results.retry')}
            </button>
          </div>
        ) : !session ? (
          <div className="page"><div className="skeleton skeleton--hero" /></div>
        ) : vue === 'stats' ? (
          <StatsView session={session} classement={config.classement} />
        ) : vue === 'about' ? (
          <AboutView />
        ) : vue === 'settings' ? (
          <SettingsView theme={theme} onSetTheme={onSetTheme} palette={palette} onPalette={onPalette} lang={lang} onLang={onLang} />
        ) : vue === 'legal' ? (
          <LegalView page={route[1]} />
        ) : vue === 'verif' ? (
          <VerifyView config={config} session={session} params={route.slice(1)} />
        ) : (
          <ResultsView
            config={config}
            session={session}
            onSession={(id) => {
              setSessionId(id)
              setIle('all')
            }}
            island={ile}
            onIsland={setIle}
            islands={iles}
          />
        )}
        </div>
      </main>

      <Footer />
      <BottomNav view={vue === 'verif' || vue === 'legal' ? 'about' : vue} />
    </div>
  )
}

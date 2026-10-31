// ============================================================================
// AboutView.jsx – page de présentation : fonctionnement, sécurité,
// installation de l'appli et feuille de route. C'est aussi un support de vente.
// ============================================================================
import Icon from '../components/Icon.jsx'
import { useI18n } from '../i18n/index.jsx'
import { navigate } from '../hooks.js'

export default function AboutView() {
  const { t } = useI18n()
  return (
    <div className="page">
      <header className="page__head">
        <h1>{t('about.title')}</h1>
      </header>

      <div className="notice notice--warn">
        <Icon name="info" />
        <div>
          <strong>{t('about.demoTitle')}</strong>
          <p>{t('about.demoBody')}</p>
        </div>
      </div>

      <div className="about-grid">
        <section className="panel">
          <h2>{t('about.howTitle')}</h2>
          <ol className="steps">
            {t('about.how').map((etape, i) => (
              <li key={i}><span>{i + 1}</span><p>{etape}</p></li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <h2>{t('about.installTitle')}</h2>
          <ul className="plain">
            {t('about.install').map((x) => (
              <li key={x.t}><strong>{x.t}</strong><p>{x.d}</p></li>
            ))}
          </ul>
        </section>

        <section className="panel panel--wide">
          <h2><Icon name="shield" size={22} /> {t('about.securityTitle')}</h2>
          <ul className="features">
            {t('about.security').map((x) => (
              <li key={x.t}>
                <Icon name="check" size={18} />
                <div><strong>{x.t}</strong><p>{x.d}</p></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel panel--wide">
          <h2>{t('about.roadmapTitle')}</h2>
          <ul className="roadmap">
            {t('about.roadmap').map((x) => <li key={x}>{x}</li>)}
          </ul>
          <button type="button" className="btn" onClick={() => navigate('/verif')}>
            <Icon name="qr" size={16} /> {t('footer.verify')}
          </button>
        </section>
      </div>
    </div>
  )
}

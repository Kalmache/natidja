// ============================================================================
// LegalView.jsx – pages légales : Mentions, Confidentialité, Conditions,
// Licence (page « certificat ») et Journal de bord (frise des versions).
// Les textes juridiques sont en français ; seuls les titres sont traduits.
// ============================================================================
import Icon from '../components/Icon.jsx'
import Signature from '../components/Signature.jsx'
import { useI18n } from '../i18n/index.jsx'
import { EDITOR, VERSION } from '../legal/config.js'
import { JOURNAL } from '../legal/journal.js'
import { COMPOSANTS, LICENCE_REGLES, MENTIONS, PRIVACY, TERMS } from '../legal/pages.js'

export const PAGES_LEGALES = ['mentions', 'privacy', 'terms', 'licence', 'journal']
const BLOCS = { mentions: MENTIONS, privacy: PRIVACY, terms: TERMS }

/** Affiche une liste de blocs {h} / {p} / {ul}. */
function Blocs({ blocs }) {
  return blocs.map((b, i) =>
    b.h ? <h2 key={i}>{b.h}</h2> : b.small ? <p key={i} className="legal__meta">{b.small}</p> : b.p ? <p key={i}>{b.p}</p> : <ul key={i}>{b.ul.map((x) => <li key={x}>{x}</li>)}</ul>,
  )
}

/** Page Licence : un « certificat » avec la signature en vedette. */
function Licence() {
  const { t } = useI18n()
  return (
    <>
      <div className="certificate">
        <div className="certificate__shine" aria-hidden="true" />
        <p className="certificate__eyebrow">{t('legal.certificate')}</p>
        <h2 className="certificate__title">Ndeze Natidja</h2>
        <div className="certificate__sign"><Signature size="lg" link /></div>
        <p className="certificate__protected">{t('legal.protected')}</p>
        <p className="certificate__rights">
          © {EDITOR.year} {EDITOR.name} · {t('legal.rights')}
        </p>
        <p className="certificate__version">v{VERSION}</p>
      </div>
      <div className="legal__text" lang="fr"><Blocs blocs={LICENCE_REGLES} /></div>
      <table className="licences" lang="fr">
        <thead><tr><th>Composant</th><th>Rôle</th><th>Licence</th></tr></thead>
        <tbody>
          {COMPOSANTS.map((c) => (
            <tr key={c.nom}><td>{c.nom}</td><td>{c.role}</td><td><span className="chip chip--accent">{c.licence}</span></td></tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/** Journal de bord : une frise verticale des versions. */
function Journal() {
  return (
    <ol className="timeline" lang="fr">
      {JOURNAL.map((v, i) => (
        <li key={v.version} style={{ '--delay': `${i * 70}ms` }}>
          <span className="timeline__dot" aria-hidden="true" />
          <div className="timeline__head">
            <span className="chip chip--mono">v{v.version}</span>
            <time>{v.date}</time>
          </div>
          <h3>{v.titre}</h3>
          <ul>{v.points.map((p) => <li key={p}>{p}</li>)}</ul>
        </li>
      ))}
    </ol>
  )
}

export default function LegalView({ page }) {
  const { t } = useI18n()
  const actif = PAGES_LEGALES.includes(page) ? page : 'mentions'
  return (
    <div className="page legal">
      <header className="page__head">
        <h1>{t(`legal.${actif}`)}</h1>
      </header>
      <div className="legal__layout">
        <nav className="legal__nav" aria-label="Pages légales">
          {PAGES_LEGALES.map((p) => (
            <a key={p} href={`#/legal/${p}`} className={p === actif ? 'is-active' : ''} aria-current={p === actif ? 'page' : undefined}>
              <Icon name={p === 'journal' ? 'list' : p === 'licence' ? 'shield' : 'info'} size={16} /> {t(`legal.${p}`)}
            </a>
          ))}
        </nav>
        <div className="panel legal__content">
          {actif === 'licence' ? <Licence /> : actif === 'journal' ? <Journal /> : <div className="legal__text" lang="fr"><Blocs blocs={BLOCS[actif]} /></div>}
        </div>
      </div>
    </div>
  )
}

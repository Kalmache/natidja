// ============================================================================
// MeilleursParIle.jsx – le meilleur établissement de CHAQUE île
// ----------------------------------------------------------------------------
// Une vitrine plus équitable que le seul classement national : chaque île met en avant son champion.
// ============================================================================
import { useI18n } from '../i18n/index.jsx'
import { meilleursParIle } from '../lib/classement.js'

const fr = (n) => Number(n).toFixed(1).replace('.', ',')

export default function MeilleursParIle({ etablissements, minCandidats = 20, onOuvrir }) {
  const { t } = useI18n()
  const liste = meilleursParIle(etablissements, minCandidats)
  if (!liste.length) return null
  return (
    <div className="iles-champions">
      <h2>{t('rank.islandTitle')}</h2>
      <p className="vs__sous">{t('rank.islandSub')}</p>
      <ul className="iles-champions__liste">
        {liste.map((e, i) => (
          <li key={e.ile} style={{ '--delay': `${i * 110}ms`, '--flot': `${i * 1.3}s` }}>
            <button type="button" className="iles-champions__btn" onClick={() => onOuvrir?.(e)}>
              <span className="iles-champions__ile">{e.ile}</span>
              <svg className="iles-champions__couronne" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18l1-11-5 4-5-7-5 7-5-4 1 11zm1 2h16v2H4z" /></svg>
              <b className="iles-champions__taux">{fr(e.taux)} %</b>
              <strong className="iles-champions__nom">{e.nom}</strong>
              <small>{t('rank.candidates', { n: e.total })}</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

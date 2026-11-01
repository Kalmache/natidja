// ============================================================================
// CentresExamen.jsx – la réussite dans chaque CENTRE D'EXAMEN
// ----------------------------------------------------------------------------
// Un centre est le lieu où les candidats composent (≠ leur établissement d'origine). Chaque ligne :
// nom, île, nombre de candidats et une barre de taux de réussite. Toucher une ligne ouvre sa fiche.
// Aucune donnée personnelle : uniquement des totaux.
// ============================================================================
import { useI18n } from '../i18n/index.jsx'

const fr = (n) => Number(n).toFixed(1).replace('.', ',')

export default function CentresExamen({ centres, onOuvrir }) {
  const { t } = useI18n()
  if (!centres?.length) return null
  // Du plus gros centre au plus petit : l'ordre le plus parlant pour comparer.
  const liste = [...centres].sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, 'fr'))
  return (
    <div className="centres">
      <h2>{t('centres.title')}</h2>
      <p className="vs__sous">{t('centres.sub')}</p>
      <ul className="centres__liste">
        {liste.map((c) => (
          <li key={c.nom}>
            <button type="button" className="centres__ligne" onClick={() => onOuvrir?.(c)}>
              <span className="centres__nom">
                <strong>{c.nom}</strong>
                <small>{[c.ile, t('rank.candidates', { n: c.total })].filter(Boolean).join(' · ')}</small>
              </span>
              <span className="centres__barre" aria-hidden="true"><i style={{ width: `${c.taux}%` }} /></span>
              <b className="centres__taux">{fr(c.taux)} %</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

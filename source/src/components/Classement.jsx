// ============================================================================
// Classement.jsx – « Meilleurs établissements » (classés par taux de réussite)
// ----------------------------------------------------------------------------
// Affiché sur l'accueil (les N premiers) et sur la page Statistiques. C'est un choix de
// l'autorité organisatrice : exams.json > classement = { visible, top, minCandidats }.
//
// Pour que le classement reste juste :
//   - taux = admis ÷ candidats de l'établissement ;
//   - les candidats libres (sans établissement) sont exclus du calcul (voir scripts/lib/stats.mjs) ;
//   - un établissement n'est classé que s'il présente au moins `minCandidats` candidats
//     (sinon deux ou trois élèves suffiraient à faire un « 100 % »).
// ============================================================================
import { useI18n } from '../i18n/index.jsx'

const fr = (n) => Number(n).toFixed(1).replace('.', ',') // 49 → « 49,0 »

export default function Classement({ etablissements, top = 5, minCandidats = 20, chargement = false, onPlus }) {
  const { t } = useI18n()
  const classes = (etablissements ?? []).filter((e) => e.total >= minCandidats)
  const liste = classes.slice(0, top)
  if (!chargement && !liste.length) return null

  return (
    <section className="classement" aria-label={t('rank.title')}>
      <header className="classement__head">
        <h2>{t('rank.title')}</h2>
        <p>{t('rank.sub')}</p>
      </header>

      {chargement ? (
        <div className="classement__skel" aria-hidden="true">
          {Array.from({ length: Math.min(top, 5) }, (_, i) => <i key={i} />)}
        </div>
      ) : (
        <ol className="classement__liste">
          {liste.map((e, i) => (
            <li key={e.nom} className={i === 0 ? 'is-first' : ''} style={{ '--delay': `${i * 90}ms` }}>
              <span className="classement__rang" aria-label={`${t('rank.place')} ${i + 1}`}>{i + 1}</span>
              <div className="classement__corps">
                <strong>{e.nom}</strong>
                <small>{[e.ile, t('rank.candidates', { n: e.total })].filter(Boolean).join(' · ')}</small>
                <span className="classement__barre" aria-hidden="true"><i style={{ '--w': `${Math.min(100, e.taux)}%` }} /></span>
              </div>
              <b className="classement__taux">{fr(e.taux)} %</b>
            </li>
          ))}
        </ol>
      )}

      <p className="classement__note">{t('rank.note', { min: minCandidats })}</p>
      {onPlus && classes.length > liste.length && (
        <button type="button" className="btn btn--ghost classement__plus" onClick={onPlus}>
          {t('rank.more')}
        </button>
      )}
    </section>
  )
}

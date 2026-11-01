// ============================================================================
// Classement.jsx – « Meilleurs établissements » sous forme de PODIUM
// ----------------------------------------------------------------------------
// Les trois premiers montent sur des marches (1er au centre, plus haut), les suivants sont
// listés dessous. Affiché sur l'accueil (5 établissements) et sur la page Statistiques (10).
// C'est un choix de l'autorité organisatrice : exams.json > classement = { visible, top, … }.
//
// Pour que le classement reste juste :
//   - taux = admis ÷ candidats de l'établissement ;
//   - les candidats libres (sans établissement) sont exclus du calcul (voir scripts/lib/stats.mjs) ;
//   - un établissement n'est classé que s'il présente au moins `minCandidats` candidats
//     (sinon deux ou trois élèves suffiraient à faire un « 100 % »).
// ============================================================================
import { useI18n } from '../i18n/index.jsx'

const fr = (n) => Number(n).toFixed(1).replace('.', ',') // 49 → « 49,0 »

/** Couronne dorée posée au-dessus du premier. */
const Couronne = () => (
  <svg className="classement__couronne" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 18h18l1-11-5 4-5-7-5 7-5-4 1 11zm1 2h16v2H4z" />
  </svg>
)

export default function Classement({ etablissements, top = 5, minCandidats = 20, chargement = false, onPlus }) {
  const { t } = useI18n()
  const classes = (etablissements ?? []).filter((e) => e.total >= minCandidats)
  const liste = classes.slice(0, top)
  if (!chargement && !liste.length) return null

  // Podium : on a besoin d'au moins trois établissements ; sinon, simple liste.
  const podium = liste.length >= 3 ? [liste[1], liste[0], liste[2]] : []
  const suite = liste.length >= 3 ? liste.slice(3) : liste
  const rangDe = (e) => liste.indexOf(e) + 1

  return (
    <section className="classement" aria-label={t('rank.title')}>
      <header className="classement__head">
        <h2>{t('rank.title')}</h2>
        <p>{t('rank.sub')}</p>
      </header>

      {chargement ? (
        <div className="classement__skel" aria-hidden="true">
          <i /><i /><i />
        </div>
      ) : (
        <>
          {podium.length > 0 && (
            <ol className="podium" aria-label={t('rank.title')}>
              {podium.map((e) => {
                const rang = rangDe(e)
                return (
                  <li key={e.nom} className={`podium__col podium__col--${rang}`}>
                    {rang === 1 && <Couronne />}
                    <span className="podium__nom">{e.nom}</span>
                    <span className="podium__taux">{fr(e.taux)} %</span>
                    <span className="podium__details">{[e.ile, t('rank.candidates', { n: e.total })].filter(Boolean).join(' · ')}</span>
                    <span className="podium__bloc" aria-label={`${t('rank.place')} ${rang}`}>{rang}</span>
                  </li>
                )
              })}
            </ol>
          )}

          {suite.length > 0 && (
            <ol className="podium__suite" start={podium.length ? 4 : 1}>
              {suite.map((e) => (
                <li key={e.nom}>
                  <span className="podium__rang" aria-label={`${t('rank.place')} ${rangDe(e)}`}>{rangDe(e)}</span>
                  <span className="podium__ligne">
                    <strong>{e.nom}</strong>
                    <small>{[e.ile, t('rank.candidates', { n: e.total })].filter(Boolean).join(' · ')}</small>
                  </span>
                  <b>{fr(e.taux)} %</b>
                </li>
              ))}
            </ol>
          )}
        </>
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

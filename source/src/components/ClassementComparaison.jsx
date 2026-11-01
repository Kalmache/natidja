// ============================================================================
// ClassementComparaison.jsx – chaque établissement COMPARÉ À LA MOYENNE NATIONALE
// ----------------------------------------------------------------------------
// Page Statistiques. L'accueil montre déjà le podium : ici on apporte une information NOUVELLE —
// de combien chaque établissement dépasse (ou non) le taux de réussite national — et on va plus loin
// que les 5 premiers. Un point par établissement sur une ligne ; le trait pointillé est la moyenne nationale.
// ============================================================================
import { useI18n } from '../i18n/index.jsx'
import { classes, ecart, echelle, position } from '../lib/classement.js'

const fr = (n) => Number(n).toFixed(1).replace('.', ',')

export default function ClassementComparaison({ etablissements, top = 10, minCandidats = 20, nationale, onOuvrir }) {
  const { t } = useI18n()
  const liste = classes(etablissements, minCandidats).slice(0, top)
  if (!liste.length) return null
  const ech = echelle(liste.map((e) => e.taux), nationale)
  const posNat = position(nationale, ech)

  return (
    <div className="vs">
      <h2>{t('rank.vsTitle')}</h2>
      <p className="vs__sous">{t('rank.vsSub', { nat: fr(nationale) })}{onOuvrir ? ` · ${t('rank.tap')}` : ''}</p>

      <div className="vs__axe" aria-hidden="true">
        <i />
        <div>{ech.graduations.map((g) => <span key={g}>{g} %</span>)}</div>
      </div>

      <ol className="vs__liste">
        {liste.map((e, i) => {
          const p = position(e.taux, ech)
          const dessus = e.taux >= nationale
          return (
            <li key={e.nom} style={{ '--delay': `${i * 70}ms` }}>
             <button
              type="button"
              className="vs__ligne"
              onClick={() => onOuvrir?.(e)}
              aria-label={`${e.nom} : ${fr(e.taux)} %, ${ecart(e.taux, nationale)} ${t('rank.points')} ${t('rank.vsMoyenne')}`}
             >
              <span className="vs__nom">
                <strong>{e.nom}</strong>
                <small>{[e.ile, t('rank.candidates', { n: e.total })].filter(Boolean).join(' · ')}</small>
              </span>
              <span className="vs__piste" aria-hidden="true">
                <span className="vs__nat" style={{ insetInlineStart: `${posNat}%` }} />
                <span
                  className={`vs__trait ${dessus ? '' : 'vs__trait--sous'}`}
                  style={{ insetInlineStart: `${Math.min(p, posNat)}%`, width: `${Math.abs(p - posNat)}%` }}
                />
                <span className={`vs__point ${i === 0 ? 'vs__point--or' : ''} ${dessus ? '' : 'vs__point--sous'}`} style={{ insetInlineStart: `${p}%` }} />
              </span>
              <b className={`vs__ecart ${dessus ? '' : 'vs__ecart--sous'}`}>{ecart(e.taux, nationale)} {t('rank.points')}</b>
             </button>
            </li>
          )
        })}
      </ol>

      <p className="vs__legende">
        <span className="vs__trait-leg" aria-hidden="true" /> {t('rank.nat', { nat: fr(nationale) })}
        {ech.zoom && <> · {t('rank.zoom', { min: ech.min })}</>}
      </p>
    </div>
  )
}

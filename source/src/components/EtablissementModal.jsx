// ============================================================================
// EtablissementModal.jsx – la FICHE d'un établissement (on la touche dans le classement)
// ----------------------------------------------------------------------------
// Chiffres agrégés uniquement : taux de réussite, comparaison avec la moyenne nationale, répartition
// des résultats, réussite par série, place dans le classement. AUCUN nom de candidat.
// ============================================================================
import { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { useI18n } from '../i18n/index.jsx'
import { surRetour } from '../lib/retour.js'
import { classes, ecart } from '../lib/classement.js'

const fr = (n) => Number(n).toFixed(1).replace('.', ',')
const part = (n, total) => (total ? (n / total) * 100 : 0)

export default function EtablissementModal({ etablissement: e, etablissements, minCandidats = 20, nationale, type = 'etablissement', onClose, onComparer, onSituer }) {
  const { t } = useI18n()
  const boutonFermer = useRef(null)
  const degrade = 'etab-degrade-' + useId().replace(/:/g, '') // identifiant UNIQUE du dégradé de l'anneau

  // Fermeture : on « recule » d'une entrée d'historique (le bouton Retour d'Android ferme donc la fiche,
  // au lieu de quitter l'application) ; popstate se charge ensuite de la fermer vraiment.
  const fermer = useCallback(() => {
    if (window.history.state?.etab) window.history.back()
    else onClose()
  }, [onClose])

  useEffect(() => {
    window.history.pushState({ etab: true }, '')
    const surRetourNavigateur = () => {
      if (!window.history.state?.etab) onClose()
    }
    window.addEventListener('popstate', surRetourNavigateur)
    const retirerRetourNatif = surRetour(() => {
      fermer()
      return true
    })
    const touche = (ev) => ev.key === 'Escape' && fermer()
    window.addEventListener('keydown', touche)
    document.body.classList.add('no-scroll')
    boutonFermer.current?.focus()
    return () => {
      window.removeEventListener('popstate', surRetourNavigateur)
      window.removeEventListener('keydown', touche)
      retirerRetourNatif()
      document.body.classList.remove('no-scroll')
    }
  }, [onClose, fermer])

  // Place dans le classement général et dans l'île (parmi les établissements classés).
  const classes_ = classes(etablissements, minCandidats).sort((a, b) => b.taux - a.taux || b.total - a.total)
  const rang = classes_.findIndex((x) => x.nom === e.nom) + 1
  const memeIle = classes_.filter((x) => x.ile === e.ile)
  const rangIle = memeIle.findIndex((x) => x.nom === e.nom) + 1
  const delta = Math.round((e.taux - nationale) * 10) / 10
  const dessus = delta >= 0
  const resultats = [
    ['ADMIS', e.admis],
    ['SECOND_GROUPE', e.second ?? 0],
    ['AJOURNE', e.ajournes ?? Math.max(0, e.total - e.admis - (e.second ?? 0))],
  ]

  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label={e.nom}>
      <div className="modal__backdrop" onClick={fermer} />
      <div className="modal__panel">
        <article className="etab">
          <button type="button" ref={boutonFermer} className="btn btn--icon etab__close" onClick={fermer} aria-label={t('att.close')}>
            <Icon name="close" size={18} />
          </button>

          <header className="etab__head">
            {rang > 0 && <span className={`medaille ${rang === 1 ? '' : rang === 2 ? 'medaille--2' : rang === 3 ? 'medaille--3' : 'medaille--n'} etab__medaille`}>{rang}</span>}
            <div>
              <h2>{e.nom}</h2>
              <p>{[e.ile !== e.nom && e.ile, t('rank.candidates', { n: e.total })].filter(Boolean).join(' · ')}</p>
            </div>
          </header>

          <div className="etab__taux">
            <div className="etab__anneau" role="img" aria-label={`${fr(e.taux)} %`}>
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                  <linearGradient id={degrade} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#047857" /></linearGradient>
                </defs>
                <circle className="etab__piste" cx="50" cy="50" r="42" />
                <circle className="etab__val" cx="50" cy="50" r="42" pathLength="100" strokeDasharray={`${Math.min(100, e.taux)} 100`} stroke={`url(#${degrade})`} />
              </svg>
              <b>{fr(e.taux)} %</b>
            </div>
            <div>
              <p className="etab__legende">{t('kpi.rate')}</p>
              <p className={`etab__ecart ${dessus ? '' : 'etab__ecart--sous'}`}>
                {delta === 0
                  ? t('etab.equal', { nat: fr(nationale) })
                  : t(dessus ? 'etab.above' : 'etab.below', { n: ecart(e.taux, nationale).replace(/^[+−]/, ''), nat: fr(nationale) })}
              </p>
            </div>
          </div>

          <section className="etab__bloc">
            <h3>{t('etab.results')}</h3>
            <div className="etab__barre" role="img" aria-label={resultats.map(([k, n]) => `${t(`status.${k}`)} ${n}`).join(', ')}>
              {resultats.map(([k, n]) => <i key={k} className={`seg seg--${k}`} style={{ width: `${part(n, e.total)}%` }} />)}
            </div>
            <ul className="etab__legende-liste">
              {resultats.map(([k, n]) => (
                <li key={k}>
                  <i className={`dot dot--${k}`} aria-hidden="true" />
                  <span>{t(`status.${k}`)}</span>
                  <strong>{n.toLocaleString('fr-FR')}</strong>
                  <small>{fr(part(n, e.total))} %</small>
                </li>
              ))}
            </ul>
          </section>

          {e.series?.length > 0 && (
            <section className="etab__bloc">
              <h3>{t('etab.bySeries')}</h3>
              <ul className="etab__series">
                {e.series.map((s) => (
                  <li key={s.serie}>
                    <span>{t('filter.series')} {s.serie}</span>
                    <span className="etab__jauge" aria-hidden="true"><i style={{ width: `${Math.min(100, s.taux)}%` }} /></span>
                    <b>{fr(s.taux)} %</b>
                    <small>{t('rank.candidates', { n: s.total })}</small>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rang > 0 && (
            <section className="etab__bloc etab__places">
              <p><Icon name="chart" size={16} /> {t(type === 'centre' ? 'etab.rankCenter' : type === 'ile' ? 'etab.rankIsle' : 'etab.rank', { n: rang, total: classes_.length })}</p>
              {memeIle.length > 1 && <p><Icon name="pin" size={16} /> {t('etab.rankIsland', { n: rangIle, total: memeIle.length, ile: e.ile })}</p>}
            </section>
          )}

          {(onComparer || onSituer) && (
            <div className="etab__actions">
              {onComparer && <button type="button" className="btn btn--primary" onClick={() => { fermer(); setTimeout(() => onComparer(e), 120) }}>⚖️ {t('etab.compare')}</button>}
              {onSituer && type !== 'ile' && <button type="button" className="btn btn--ghost" onClick={() => { fermer(); setTimeout(() => onSituer(e), 120) }}>📍 {t('etab.locate')}</button>}
            </div>
          )}

          <p className="etab__note">{t('etab.note')}</p>
        </article>
      </div>
    </div>,
    document.body,
  )
}

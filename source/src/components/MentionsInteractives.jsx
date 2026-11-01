// ============================================================================
// MentionsInteractives.jsx – « Mentions décernées » qui REPOND quand on la touche
// ----------------------------------------------------------------------------
// Logique :
//   • des boutons choisissent l'île (ou « toutes ») et un interrupteur passe des effectifs aux pourcentages :
//     les barres changent de hauteur en s'animant ;
//   • une phrase écrite automatiquement résume ce qu'on voit ;
//   • toucher une barre ouvre une fiche : la mention île par île, et les établissements où elle est la plus fréquente.
// Aucune donnée personnelle : uniquement des totaux déjà publiés (stats.json).
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { useI18n } from '../i18n/index.jsx'
import { surRetour } from '../lib/retour.js'
import { analyseMentions, classes } from '../lib/classement.js'

const ORDRE = ['PASSABLE', 'ASSEZ_BIEN', 'BIEN', 'TRES_BIEN']
const fr = (n) => Number(n).toFixed(1).replace('.', ',')

/** La fiche d'une mention (même comportement que les autres fiches : le bouton Retour d'Android la ferme). */
function FicheMention({ mention, iles, etablissements, minCandidats, parMention, afficherEtablissements, onClose }) {
  const { t } = useI18n()
  const fermerBtn = useRef(null)
  const fermer = useCallback(() => {
    if (window.history.state?.mention) window.history.back()
    else onClose()
  }, [onClose])

  useEffect(() => {
    window.history.pushState({ mention: true }, '')
    const retour = () => { if (!window.history.state?.mention) onClose() }
    window.addEventListener('popstate', retour)
    const retirerNatif = surRetour(() => { fermer(); return true })
    const touche = (ev) => ev.key === 'Escape' && fermer()
    window.addEventListener('keydown', touche)
    document.body.classList.add('no-scroll')
    fermerBtn.current?.focus()
    return () => {
      window.removeEventListener('popstate', retour)
      window.removeEventListener('keydown', touche)
      retirerNatif()
      document.body.classList.remove('no-scroll')
    }
  }, [onClose, fermer])

  const total = ORDRE.reduce((s, m) => s + (parMention?.[m] ?? 0), 0)
  const n = parMention?.[mention] ?? 0
  const parIle = iles.map((i) => ({ nom: i.nom, n: i.mentions?.[mention] ?? 0 })).sort((a, b) => b.n - a.n)
  const maxIle = Math.max(...parIle.map((i) => i.n), 1)
  // Part de la mention dans chaque établissement (seulement ceux assez grands pour que ce soit fiable)
  const top = !afficherEtablissements ? [] : classes(etablissements, minCandidats)
    .map((e) => ({ nom: e.nom, ile: e.ile, part: ((e.mentions?.[mention] ?? 0) / e.total) * 100 }))
    .filter((e) => e.part > 0)
    .sort((a, b) => b.part - a.part)
    .slice(0, 3)

  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label={t(`mention.${mention}`)}>
      <div className="modal__backdrop" onClick={fermer} />
      <div className="modal__panel">
        <article className="etab">
          <button type="button" ref={fermerBtn} className="btn btn--icon etab__close" onClick={fermer} aria-label={t('att.close')}>
            <Icon name="close" size={18} />
          </button>
          <header className="etab__head">
            <div>
              <h2>{t('mnt.sheetTitle', { m: t(`mention.${mention}`) })}</h2>
              <p>{t('mnt.sheetSub', { n, p: fr(total ? (n / total) * 100 : 0) })}</p>
            </div>
          </header>

          <section className="etab__bloc">
            <h3>{t('mnt.byIsland')}</h3>
            <ul className="etab__series">
              {parIle.map((i) => (
                <li key={i.nom}>
                  <span>{i.nom}</span>
                  <span className="etab__jauge" aria-hidden="true"><i style={{ width: `${(i.n / maxIle) * 100}%` }} /></span>
                  <b>{i.n}</b>
                  <small />
                </li>
              ))}
            </ul>
          </section>

          {top.length > 0 && (
            <section className="etab__bloc">
              <h3>{t('mnt.topSchools')}</h3>
              <ol className="mnt__top">
                {top.map((e, k) => (
                  <li key={e.nom}><span>{k + 1}. {e.nom}</span><b>{fr(e.part)} %</b></li>
                ))}
              </ol>
            </section>
          )}
          <p className="etab__note">{t('mnt.noNames')}</p>
        </article>
      </div>
    </div>,
    document.body,
  )
}

export default function MentionsInteractives({ stats, iles, minCandidats = 20, afficherEtablissements = true }) {
  const { t } = useI18n()
  const [ile, setIle] = useState('all')
  const [mode, setMode] = useState('nombre') // 'nombre' | 'part'
  const [ouverte, setOuverte] = useState(null)
  const [monte, setMonte] = useState(false) // fait « pousser » les barres à l'apparition
  useEffect(() => { const r = requestAnimationFrame(() => setMonte(true)); return () => cancelAnimationFrame(r) }, [])

  const valeurs = useMemo(() => (ile === 'all' ? stats.parMention : iles.find((i) => i.id === ile)?.mentions) ?? {}, [ile, iles, stats.parMention])
  const analyse = analyseMentions(valeurs)
  const total = analyse?.total ?? 0
  const lignes = ORDRE.map((m) => ({ m, n: valeurs[m] ?? 0, p: total ? ((valeurs[m] ?? 0) / total) * 100 : 0 }))
  const max = Math.max(...lignes.map((l) => (mode === 'part' ? l.p : l.n)), 1)
  const fermer = useCallback(() => setOuverte(null), [])
  const lieu = ile === 'all' ? t('mnt.allCountry') : iles.find((i) => i.id === ile)?.nom

  return (
    <div className="mnt">
      <h2>{t('stats.byMention')}</h2>
      <p className="vs__sous">{t('mnt.hint')}</p>

      <div className="pills mnt__iles" role="group" aria-label={t('filter.island')}>
        <button type="button" className={`pill pill--sm ${ile === 'all' ? 'is-active' : ''}`} aria-pressed={ile === 'all'} onClick={() => setIle('all')}>{t('filter.allIslands')}</button>
        {iles.map((i) => (
          <button key={i.id} type="button" className={`pill pill--sm ${ile === i.id ? 'is-active' : ''}`} aria-pressed={ile === i.id} onClick={() => setIle(i.id)}>{i.nom}</button>
        ))}
      </div>
      <div className="mnt__mode" role="group" aria-label={t('mnt.mode')}>
        <button type="button" className={mode === 'nombre' ? 'is-on' : ''} aria-pressed={mode === 'nombre'} onClick={() => setMode('nombre')}>{t('mnt.count')}</button>
        <button type="button" className={mode === 'part' ? 'is-on' : ''} aria-pressed={mode === 'part'} onClick={() => setMode('part')}>{t('mnt.share')}</button>
      </div>

      <ul className="mnt__bars">
        {lignes.map((l, k) => (
          <li key={l.m}>
            <button type="button" className="mnt__bar" onClick={() => setOuverte(l.m)} aria-label={`${t(`mention.${l.m}`)} : ${l.n} (${fr(l.p)} %)`}>
              <strong>{mode === 'part' ? `${fr(l.p)} %` : l.n}</strong>
              <span className="mnt__colonne"><i style={{ height: monte ? `${Math.max(3, ((mode === 'part' ? l.p : l.n) / max) * 100)}%` : '0%', transitionDelay: `${k * 70}ms` }} /></span>
              <em>{t(`mention.${l.m}`)}</em>
            </button>
          </li>
        ))}
      </ul>

      {analyse && (
        <p className="mnt__phrase" role="status">
          💡 {t('mnt.insight', { lieu, top: t(`mention.${analyse.plusFrequente}`), p: fr(analyse.partPlusFrequente), hi: fr(analyse.partHautes) })}
        </p>
      )}

      {ouverte && <FicheMention mention={ouverte} iles={iles} etablissements={stats.etablissements} minCandidats={minCandidats} parMention={stats.parMention} afficherEtablissements={afficherEtablissements} onClose={fermer} />}
    </div>
  )
}

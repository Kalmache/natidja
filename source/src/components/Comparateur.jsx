// ============================================================================
// Comparateur.jsx – le DUEL : comparer deux établissements, deux îles, deux centres… ou deux années
// ----------------------------------------------------------------------------
// Logique :
//   • on choisit un TYPE (onglet), puis deux éléments de ce type : deux grandes cartes à TOUCHER,
//     la verte (A) et l'orange (B) ; chacune ouvre une liste avec recherche (plus de listes déroulantes) ;
//   • chaque carte affiche déjà le taux de réussite ; celle qui est devant est mise en valeur ;
//   • dessous, des barres « papillon » : A part du centre vers la gauche, B vers la droite, avec les
//     valeurs collées aux barres (résultats, mentions, séries).
// Tout est calculé dans le téléphone à partir des statistiques déjà publiées (aucun travail serveur).
// Précaution : un très petit groupe donne des taux trompeurs (7 sur 8 = 87,5 %) → avertissement.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { useI18n } from '../i18n/index.jsx'
import { comparer } from '../lib/classement.js'
import { normalize } from '../lib/search.js'
import { surRetour } from '../lib/retour.js'

const fr = (n) => Number(n).toFixed(1).replace('.', ',')
const part = (n, total) => (total ? (n / total) * 100 : 0)
const MENTIONS = ['PASSABLE', 'ASSEZ_BIEN', 'BIEN', 'TRES_BIEN']

/** Une ligne « papillon » : valeur A ▐███ libellé ███▌ valeur B. */
function Papillon({ libelle, pa, pb, texteA, texteB }) {
  return (
    <div className="pap" role="group" aria-label={`${libelle} : ${texteA} / ${texteB}`}>
      <span className="pap__lib">{libelle}</span>
      <div className="pap__g">
        <b>{texteA}</b>
        <span className="pap__piste" aria-hidden="true"><i style={{ width: `${Math.min(100, pa)}%` }} /></span>
      </div>
      <div className="pap__d">
        <span className="pap__piste" aria-hidden="true"><i style={{ width: `${Math.min(100, pb)}%` }} /></span>
        <b>{texteB}</b>
      </div>
    </div>
  )
}

/** La liste avec recherche qui s'ouvre quand on touche une carte (le bouton Retour la ferme). */
function Selecteur({ liste, actuel, autre, onChoisir, onClose }) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const champ = useRef(null)
  const fermer = useCallback(() => {
    if (window.history.state?.duel) window.history.back()
    else onClose()
  }, [onClose])

  useEffect(() => {
    window.history.pushState({ duel: true }, '')
    const retour = () => { if (!window.history.state?.duel) onClose() }
    window.addEventListener('popstate', retour)
    const retirerNatif = surRetour(() => { fermer(); return true })
    const touche = (ev) => ev.key === 'Escape' && fermer()
    window.addEventListener('keydown', touche)
    document.body.classList.add('no-scroll')
    champ.current?.focus()
    return () => {
      window.removeEventListener('popstate', retour)
      window.removeEventListener('keydown', touche)
      retirerNatif()
      document.body.classList.remove('no-scroll')
    }
  }, [onClose, fermer])

  const visibles = liste.filter((f) => !q || normalize(f.nom).includes(normalize(q)))
  const choisir = (f) => { onChoisir(f); fermer() }

  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label={t('cmp.pick')}>
      <div className="modal__backdrop" onClick={fermer} />
      <div className="modal__panel">
        <article className="etab selecteur">
          <button type="button" className="btn btn--icon etab__close" onClick={fermer} aria-label={t('att.close')}>
            <Icon name="close" size={18} />
          </button>
          <h2>{t('cmp.pick')}</h2>
          <input ref={champ} className="selecteur__q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('cmp.search')} aria-label={t('cmp.search')} autoComplete="off" />
          <ul className="selecteur__liste">
            {visibles.map((f) => (
              <li key={f.nom}>
                <button type="button" className={`selecteur__item ${f.nom === actuel ? 'is-actuel' : ''}`} disabled={f.nom === autre} onClick={() => choisir(f)}>
                  <span><strong>{f.nom}</strong><small>{[f.ile !== f.nom && f.ile, t('cmp.candidates', { n: f.total })].filter(Boolean).join(' · ')}</small></span>
                  <b>{fr(f.taux)} %</b>
                </button>
              </li>
            ))}
            {!visibles.length && <li className="selecteur__vide">{t('cmp.none')}</li>}
          </ul>
        </article>
      </div>
    </div>,
    document.body,
  )
}

export default function Comparateur({ groupes, minCandidats = 20, initial }) {
  const { t } = useI18n()
  // groupes : { cle: { titre, liste: [fiches] } } — seuls les types qui ont au moins 2 éléments sont proposés.
  const types = useMemo(() => Object.entries(groupes).filter(([, g]) => g.liste.length >= 2), [groupes])
  const [cle, setCle] = useState(types[0]?.[0])
  const [iA, setIA] = useState(0)
  const [iB, setIB] = useState(1)
  const [ouvert, setOuvert] = useState(null) // 'a' | 'b' | null : quelle carte change d'élément
  const carteB = useRef(null)
  const fermerSelecteur = useCallback(() => setOuvert(null), [])

  // Arrivée depuis la fiche d'un établissement (« Comparer avec… ») : le premier élément est choisi,
  // le second est le plus proche en taux de réussite (un duel intéressant dès l'ouverture).
  useEffect(() => {
    if (!initial) return
    const t0 = types.find(([k]) => k === initial.type)
    if (!t0) return
    const l = t0[1].liste
    const a = l.findIndex((f) => f.nom === initial.nom)
    if (a < 0) return
    let b = -1
    l.forEach((f, i) => { if (i !== a && (b < 0 || Math.abs(f.taux - l[a].taux) < Math.abs(l[b].taux - l[a].taux))) b = i })
    setCle(initial.type); setIA(a); setIB(b < 0 ? 0 : b)
    setTimeout(() => carteB.current?.focus({ preventScroll: true }), 400)
  }, [initial?.n]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!types.length) return null

  const type = types.find(([k]) => k === cle) ?? types[0]
  const liste = type[1].liste
  const a = liste[Math.min(iA, liste.length - 1)]
  const b = liste[Math.min(iB, liste.length - 1)]
  const meme = a.nom === b.nom
  const { ecartPoints, devant } = comparer(a, b)
  const petits = [a, b].filter((x) => x.total < minCandidats)
  const changerType = (k) => { setCle(k); setIA(0); setIB(1) }
  const choisir = (f) => {
    const i = liste.findIndex((x) => x.nom === f.nom)
    if (ouvert === 'a') setIA(i)
    else setIB(i)
  }

  const repartition = [['ADMIS', 'admis'], ['SECOND_GROUPE', 'second'], ['AJOURNE', 'ajournes']]
  const series = [...new Set([...(a.series ?? []), ...(b.series ?? [])].map((s) => s.serie))].sort()
  const tauxSerie = (f, s) => f.series?.find((x) => x.serie === s)

  // (fonction simple, pas un composant : on garde le focus entre deux affichages)
  const carte = (f, cote, reference) => (
    <button
      type="button"
      ref={reference}
      className={`duel__carte duel__carte--${cote} ${devant === cote ? 'is-devant' : ''}`}
      onClick={() => setOuvert(cote)}
      aria-label={`${t(cote === 'a' ? 'cmp.first' : 'cmp.second')} : ${f.nom}. ${t('cmp.change')}`}
    >
      <span className="duel__etiquette">{t('cmp.change')} ▾</span>
      <strong className="duel__nom">{f.nom}</strong>
      <span className="duel__taux">{fr(f.taux)} %</span>
      <small>{[f.ile !== f.nom && f.ile, t('cmp.candidates', { n: f.total })].filter(Boolean).join(' · ')}</small>
    </button>
  )

  return (
    <div className="cmp">
      <h2>{t('cmp.title')}</h2>
      <p className="vs__sous">{t('cmp.sub')}</p>

      {types.length > 1 && (
        <div className="pills cmp__types" role="tablist" aria-label={t('cmp.title')}>
          {types.map(([k, g]) => (
            <button key={k} type="button" role="tab" aria-selected={k === type[0]} className={`pill pill--sm ${k === type[0] ? 'is-active' : ''}`} onClick={() => changerType(k)}>
              {g.titre}
            </button>
          ))}
        </div>
      )}

      <div className="duel">
        {carte(a, 'a')}
        <span className="duel__vs" aria-hidden="true">VS</span>
        {carte(b, 'b', carteB)}
      </div>

      {meme ? (
        <p className="cmp__avert" role="status">{t('cmp.same')}</p>
      ) : (
        <div className="duel__corps">
          <p className="cmp__ecart" role="status">
            {devant ? t('cmp.gap', { n: fr(Math.abs(ecartPoints)), nom: devant === 'a' ? a.nom : b.nom }) : t('cmp.equal')}
          </p>
          {petits.length > 0 && (
            <p className="cmp__avert" role="note">{t('cmp.small', { n: minCandidats, noms: petits.map((x) => x.nom).join(', ') })}</p>
          )}

          <h3>{t('cmp.results')}</h3>
          {repartition.map(([statut, champ]) => (
            <Papillon key={statut} libelle={t(`status.${statut}`)} pa={part(a[champ], a.total)} pb={part(b[champ], b.total)}
              texteA={`${fr(part(a[champ], a.total))} % · ${a[champ]}`} texteB={`${fr(part(b[champ], b.total))} % · ${b[champ]}`} />
          ))}

          {MENTIONS.some((m) => (a.mentions?.[m] ?? 0) + (b.mentions?.[m] ?? 0) > 0) && (
            <>
              <h3>{t('cmp.mentions')}</h3>
              {MENTIONS.map((m) => (
                <Papillon key={m} libelle={t(`mention.${m}`)}
                  pa={part(a.mentions?.[m] ?? 0, a.total) * 4} pb={part(b.mentions?.[m] ?? 0, b.total) * 4}
                  texteA={`${fr(part(a.mentions?.[m] ?? 0, a.total))} % · ${a.mentions?.[m] ?? 0}`} texteB={`${fr(part(b.mentions?.[m] ?? 0, b.total))} % · ${b.mentions?.[m] ?? 0}`} />
              ))}
            </>
          )}

          {series.length > 0 && (
            <>
              <h3>{t('cmp.series')}</h3>
              {series.map((s) => {
                const sa = tauxSerie(a, s)
                const sb = tauxSerie(b, s)
                return (
                  <Papillon key={s} libelle={`${t('filter.series')} ${s}`} pa={sa?.taux ?? 0} pb={sb?.taux ?? 0}
                    texteA={sa ? `${fr(sa.taux)} %` : '–'} texteB={sb ? `${fr(sb.taux)} %` : '–'} />
                )
              })}
            </>
          )}
        </div>
      )}

      {ouvert && (
        <Selecteur
          liste={liste}
          actuel={(ouvert === 'a' ? a : b).nom}
          autre={(ouvert === 'a' ? b : a).nom}
          onChoisir={choisir}
          onClose={fermerSelecteur}
        />
      )}
    </div>
  )
}

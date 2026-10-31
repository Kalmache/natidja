// ============================================================================
// ResultsView.jsx – la page d'accueil : en-tête vedette + recherche + liste
// ----------------------------------------------------------------------------
// Deux sources de candidats :
//   1. `initial.json` (120 candidats, ~15 Ko) affiché IMMÉDIATEMENT quand rien
//      n'est tapé → la page n'est jamais vide.
//   2. Un « shard » (≈ 30 Ko) téléchargé dès que la saisie est assez longue,
//      choisi par buildQuery() (voir src/lib/search.js).
// ============================================================================
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { surRetour } from '../lib/retour.js'
import Icon from '../components/Icon.jsx'
import Stat from '../components/Stat.jsx'
import CandidateCard from '../components/CandidateCard.jsx'
import CandidateModal from '../components/CandidateModal.jsx'
import { useI18n } from '../i18n/index.jsx'
import { buildQuery, matchesFilters } from '../lib/search.js'
import { loadInitial, loadShard } from '../lib/data.js'

const PAGE = 60 // nombre de cartes affichées avant « Afficher plus »
const STATUTS = ['ALL', 'ADMIS', 'SECOND_GROUPE', 'AJOURNE']

export default function ResultsView({ config, session, onSession, island, onIsland, islands }) {
  const { t } = useI18n()

  // ---------- État de l'écran ----------
  const [saisie, setSaisie] = useState('')
  const requete = useDeferredValue(saisie) // garde la frappe fluide
  const [serie, setSerie] = useState('ALL')
  const [statut, setStatut] = useState('ALL')
  const [selection, setSelection] = useState(null) // candidat ouvert dans la fenêtre
  const [visibles, setVisibles] = useState(PAGE)

  // ---------- Fiche d'un candidat et bouton RETOUR ----------
  // Problème : la fiche n'était qu'un état de l'écran, sans trace dans
  // l'historique du navigateur. Sur Android, le bouton retour ne trouvait rien
  // à « défaire » et FERMAIT L'APPLICATION.
  // Solution : à l'ouverture, on ajoute une entrée à l'historique
  // (history.pushState). Le bouton retour retire alors cette entrée, et on
  // écoute cet événement (« popstate ») pour fermer la fiche.
  const ouvrirFiche = useCallback((candidat) => {
    window.history.pushState({ fiche: true }, '') // l'adresse ne change pas
    setSelection(candidat)
  }, [])

  const fermerFiche = useCallback(() => {
    // Fermeture par la croix ou Échap : on « recule » nous-mêmes d'une entrée,
    // ce qui déclenche popstate ci-dessous et ferme la fiche proprement.
    if (window.history.state?.fiche) window.history.back()
    else setSelection(null)
  }, [])

  // Bouton Retour d'Android : tant qu'une fiche est ouverte, il la referme.
  useEffect(() => {
    if (!selection) return undefined
    return surRetour(() => {
      fermerFiche()
      return true
    })
  }, [selection, fermerFiche])

  useEffect(() => {
    // Appelé quand l'utilisateur recule : si l'entrée « fiche » a disparu,
    // on ferme la fiche.
    const surRetour = () => {
      if (!window.history.state?.fiche) setSelection(null)
    }
    window.addEventListener('popstate', surRetour)
    return () => window.removeEventListener('popstate', surRetour)
  }, [])

  // ---------- 1. Candidats affichés au démarrage ----------
  const [apercu, setApercu] = useState([])
  const [apercuCharge, setApercuCharge] = useState(false)
  useEffect(() => {
    let actif = true
    setApercuCharge(false)
    loadInitial(session.id)
      .then((liste) => actif && setApercu(liste))
      .catch(() => {})
      .finally(() => actif && setApercuCharge(true))
    setSerie('ALL')
    return () => {
      actif = false
    }
  }, [session.id])

  // ---------- 2. Candidats issus d'une recherche ----------
  const plan = useMemo(
    () => buildQuery(requete, config.shardKeys, session.id),
    [requete, config.shardKeys, session.id],
  )
  const url = plan.etat === 'pret' ? plan.url : null
  const [shard, setShard] = useState(null) // { url, candidats }
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(false)
  const [tentative, setTentative] = useState(0)

  useEffect(() => {
    if (!url) return
    let actif = true
    setChargement(true)
    setErreur(false)
    loadShard(url)
      .then((candidats) => actif && setShard({ url, candidats }))
      .catch(() => actif && setErreur(true))
      .finally(() => actif && setChargement(false))
    return () => {
      actif = false
    }
  }, [url, tentative])

  // ---------- 3. Liste finale à afficher ----------
  const filtres = { island, series: serie, status: statut }
  // « recherche » = une vraie recherche est lancée (saisie assez longue).
  // Tant que la saisie est trop courte, on garde l'aperçu des candidats.
  const recherche = plan.etat === 'pret'
  const liste = useMemo(() => {
    if (!recherche) return apercu.filter((c) => matchesFilters(c, filtres))
    if (shard?.url !== plan.url) return []
    return shard.candidats.filter((c) => matchesFilters(c, filtres) && plan.filtre(c))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, apercu, shard, plan, island, serie, statut])

  const pret = recherche ? !chargement && !erreur && shard?.url === plan.url : apercuCharge

  useEffect(() => setVisibles(PAGE), [requete, island, serie, statut, session.id])

  // ---------- Raccourcis clavier : ← → pour changer d'île ----------
  const changerIle = useCallback(
    (sens) => {
      const i = islands.findIndex((x) => x.id === island)
      onIsland(islands[(i + sens + islands.length) % islands.length].id)
    },
    [islands, island, onIsland],
  )
  useEffect(() => {
    const touche = (e) => {
      const balise = document.activeElement?.tagName
      if (selection || balise === 'INPUT' || balise === 'SELECT' || balise === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') changerIle(-1)
      if (e.key === 'ArrowRight') changerIle(1)
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [changerIle, selection])

  const reinitialiser = () => {
    setSaisie('')
    setSerie('ALL')
    setStatut('ALL')
    onIsland('all')
  }

  // ---------- Chiffres clés ----------
  const stats = session.stats
  const taux = parseFloat(String(stats.successRate).replace(',', '.')) || 0
  const series = ['ALL', ...session.series]

  // Message d'aide sous la barre de recherche
  const aide =
    plan.etat === 'trop-court'
      ? t(/\d/.test(saisie) ? 'search.needDigits' : 'search.needLetters', { n: plan.manque })
      : t('search.hint')

  return (
    <>
      {/* ================= HÉROS ================= */}
      <section className="hero">
        <div className="hero__aurora" aria-hidden="true">
          <i /><i /><i />
        </div>

        <div className="hero__inner">
          {/* Sélecteur d'examen (Bac / BEPC) */}
          {config.sessions.length > 1 && (
            <div className="segmented" role="tablist" aria-label={t('hero.eyebrow', { session: '' })}>
              {config.sessions.map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  type="button"
                  aria-selected={s.id === session.id}
                  className={s.id === session.id ? 'is-active' : ''}
                  onClick={() => {
                    onSession(s.id)
                    setSaisie('')
                    setStatut('ALL')
                  }}
                >
                  {s.examType} {s.year}
                </button>
              ))}
            </div>
          )}

          <p className="hero__eyebrow">{t('hero.eyebrow', { session: `${session.sessionDate}` })}</p>
          <h1 className="hero__title">{t('hero.title')}</h1>
          <p className="hero__subtitle">{t('hero.subtitle')}</p>

          <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
            <Icon name="search" size={22} className="search__icon" />
            <input
              type="search"
              inputMode="search"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('search.label')}
              maxLength={60}
            />
            {saisie && (
              <button
                type="button"
                className="search__clear"
                onClick={() => setSaisie('')}
                aria-label={t('search.clear')}
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </form>
          <p className={`hero__hint ${plan.etat === 'trop-court' ? 'is-warn' : ''}`} aria-live="polite">
            {aide}
          </p>
        </div>
      </section>

      {/* ================= CHIFFRES CLÉS ================= */}
      <section className="kpis" aria-label="Chiffres clés">
        <Stat value={stats.total} label={t('kpi.candidates')} />
        <Stat value={stats.admitted} label={t('kpi.admitted')} tone="ok" />
        <Stat value={stats.oralSecondGroup} label={t('kpi.second')} tone="warn" />
        <Stat value={taux} decimals={1} suffix=" %" label={t('kpi.rate')} tone="accent" />
      </section>

      {/* ================= FILTRES ================= */}
      <section className="filters" aria-label="Filtres">
        <div className="filters__group">
          <span className="filters__label">{t('filter.island')}</span>
          <div className="pills">
            <button type="button" className="pill pill--nav" onClick={() => changerIle(-1)} aria-label={t('filter.prev')}>
              <Icon name="chevronL" size={16} className="flip-rtl" />
            </button>
            {islands.map((i) => (
              <button
                key={i.id}
                type="button"
                className={`pill ${i.id === island ? 'is-active' : ''}`}
                aria-pressed={i.id === island}
                onClick={() => onIsland(i.id)}
              >
                {i.id === 'all' ? t('filter.allIslands') : i.name.split(' (')[0]}
              </button>
            ))}
            <button type="button" className="pill pill--nav" onClick={() => changerIle(1)} aria-label={t('filter.next')}>
              <Icon name="chevronR" size={16} className="flip-rtl" />
            </button>
          </div>
        </div>

        <div className="filters__row">
          {session.series.length > 0 && (
            <div className="filters__group">
              <span className="filters__label">{t('filter.series')}</span>
              <div className="pills">
                {series.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`pill pill--sm ${s === serie ? 'is-active' : ''}`}
                    aria-pressed={s === serie}
                    onClick={() => setSerie(s)}
                  >
                    {s === 'ALL' ? t('filter.allSeries') : s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="filters__group">
            <span className="filters__label">{t('filter.status')}</span>
            <div className="pills">
              {STATUTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`pill pill--sm pill--${s} ${s === statut ? 'is-active' : ''}`}
                  aria-pressed={s === statut}
                  onClick={() => setStatut(s)}
                >
                  {s === 'ALL' ? t('filter.allStatus') : t(`status.${s}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= RÉSULTATS ================= */}
      <section className="results" aria-live="polite" aria-busy={!pret}>
        {erreur ? (
          <div className="notice notice--error">
            <Icon name="alert" /> <span>{t('results.error')}</span>
            <button type="button" className="btn btn--sm" onClick={() => setTentative((n) => n + 1)}>
              <Icon name="refresh" size={14} /> {t('results.retry')}
            </button>
          </div>
        ) : !pret ? (
          <div className="grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="card card--skeleton" />
            ))}
          </div>
        ) : liste.length === 0 ? (
          <div className="empty">
            <div className="empty__emoji" aria-hidden="true">🔎</div>
            <h3>{t('results.empty')}</h3>
            <p>{t('results.emptyHint')}</p>
            <button type="button" className="btn" onClick={reinitialiser}>
              {t('results.reset')}
            </button>
          </div>
        ) : (
          <>
            <p className="results__count">
              {recherche
                ? t('results.count', { n: liste.length })
                : t('results.preview', { total: stats.total.toLocaleString('fr-FR') })}
            </p>
            <div className="grid">
              {liste.slice(0, visibles).map((c, i) => (
                <CandidateCard key={c.id} candidat={c} index={i} onOpen={ouvrirFiche} />
              ))}
            </div>
            {liste.length > visibles && (
              <div className="results__more">
                <button type="button" className="btn" onClick={() => setVisibles((v) => v + PAGE)}>
                  {t('results.more')} ({liste.length - visibles})
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {selection && (
        <CandidateModal candidat={selection} session={session} onClose={fermerFiche} />
      )}
    </>
  )
}

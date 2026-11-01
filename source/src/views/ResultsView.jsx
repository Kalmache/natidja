// ============================================================================
// ResultsView.jsx – la page d'accueil : en-tête vedette + recherche + résultats
// ----------------------------------------------------------------------------
// RESPECT DE LA VIE PRIVÉE : tant que personne n'a cherché quoi que ce soit, l'accueil
// n'affiche AUCUN nom : seulement des statistiques et le classement des établissements.
// Les candidats n'apparaissent que lorsqu'on tape un nom ou un numéro, et seulement avec le
// strict nécessaire (nom, résultat, établissement). Le détail s'ouvre après vérification
// de l'identité (voir CandidateModal).
//
// Source des candidats : un « shard » (petit fichier d'environ 4 Ko) téléchargé dès que la
// saisie est assez longue, choisi par buildQuery() (voir src/lib/search.js).
// ============================================================================
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { surRetour } from '../lib/retour.js'
import Icon from '../components/Icon.jsx'
import Stat from '../components/Stat.jsx'
import SessionPicker from '../components/SessionPicker.jsx'
import Classement from '../components/Classement.jsx'
import CandidateCard from '../components/CandidateCard.jsx'
import CandidateModal from '../components/CandidateModal.jsx'
import EtablissementModal from '../components/EtablissementModal.jsx'
import { useI18n } from '../i18n/index.jsx'
import { buildQuery, matchesFilters } from '../lib/search.js'
import { loadShard, loadStats } from '../lib/data.js'
import { navigate, prefersReducedMotion } from '../hooks.js'

const PAGE = 60 // nombre de cartes affichées avant « Afficher plus »
const STATUTS = ['ALL', 'ADMIS', 'SECOND_GROUPE', 'AJOURNE']
const ARABE = /[؀-ۿ]/ // lettres arabes : les noms sont enregistrés en lettres latines

export default function ResultsView({ config, session, onSession, island, onIsland, islands }) {
  const { t } = useI18n()

  // ---------- État de l'écran ----------
  const [saisie, setSaisie] = useState('')
  const requete = useDeferredValue(saisie) // garde la frappe fluide
  const [serie, setSerie] = useState('ALL')
  const [centre, setCentre] = useState('ALL') // filtre « centre d'examen »
  const [statut, setStatut] = useState('ALL')
  const [selection, setSelection] = useState(null) // candidat ouvert dans la fenêtre
  const [etabOuvert, setEtabOuvert] = useState(null) // établissement dont on regarde la fiche

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
    const surRetourNavigateur = () => {
      if (!window.history.state?.fiche) setSelection(null)
    }
    window.addEventListener('popstate', surRetourNavigateur)
    return () => window.removeEventListener('popstate', surRetourNavigateur)
  }, [])

  // On change d'examen : on repart de zéro côté filtres.
  useEffect(() => {
    setSerie('ALL')
    setCentre('ALL')
  }, [session.id])

  // ---------- 1. Candidats issus d'une recherche ----------
  const plan = useMemo(
    () => buildQuery(requete, config.shardKeys, session.id),
    [requete, config.shardKeys, session.id],
  )
  const recherche = plan.etat === 'pret' // vrai dès que la saisie permet une vraie recherche
  const url = recherche ? plan.url : null
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

  // ---------- 2. Liste finale à afficher ----------
  const filtres = { island, series: serie, status: statut, center: centre }
  const filtreActif = island !== 'all' || serie !== 'ALL' || statut !== 'ALL' || centre !== 'ALL'
  const liste = useMemo(() => {
    if (!recherche || shard?.url !== plan.url) return []
    return shard.candidats.filter((c) => matchesFilters(c, filtres) && plan.filtre(c))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, shard, plan, island, serie, statut, centre])
  const pret = !recherche || (!chargement && !erreur && shard?.url === plan.url)

  const [visibles, setVisibles] = useState(PAGE)
  useEffect(() => setVisibles(PAGE), [requete, island, serie, statut, session.id])

  // ---------- 3. Classement des établissements (accueil sans recherche) ----------
  // Le ministère décide s'il est affiché et combien d'établissements : réglage « classement » de exams.json.
  const classement = { visible: false, top: 5, minCandidats: 20, ...config.classement }
  const [statsSession, setStatsSession] = useState(null)
  useEffect(() => {
    if (!classement.visible) return undefined
    let actif = true
    setStatsSession(null)
    loadStats(session.id).then((s) => actif && setStatsSession(s)).catch(() => {})
    return () => {
      actif = false
    }
  }, [session.id, classement.visible])

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
    setCentre('ALL')
    onIsland('all')
  }

  // ---------- Chiffres clés ----------
  const stats = session.stats
  const taux = parseFloat(String(stats.successRate).replace(',', '.')) || 0
  const series = ['ALL', ...session.series]

  // Message d'aide sous la barre de recherche
  const aide = ARABE.test(saisie)
    ? t('search.latin')
    : plan.etat === 'trop-court'
      ? t(/\d/.test(saisie) ? 'search.needDigits' : 'search.needLetters', { n: plan.manque })
      : t('search.hint')

  return (
    <>
      {/* ================= HÉROS ================= */}
      <section className={`hero ${recherche ? 'hero--compact' : ''}`}>
        <div className="hero__aurora" aria-hidden="true">
          <i /><i /><i />
        </div>

        <div className="hero__inner">
          {/* Choix de l'examen, de l'année et de l'édition (onglets, ou 3 listes s'il y a plusieurs années) */}
          <SessionPicker
            sessions={config.sessions}
            session={session}
            onChange={(id) => {
              onSession(id)
              setSaisie('')
              setStatut('ALL')
            }}
          />

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
              onFocus={(e) => {
                // Le clavier met un instant à apparaître et à réduire l'écran : on attend
                // la fin de son animation, puis on place la barre de recherche JUSTE SOUS
                // l'en-tête (et non cachée dessous, ni derrière le clavier).
                // (On mémorise le champ AVANT d'attendre : React vide e.currentTarget
                // dès que l'événement est terminé.)
                const champ = e.currentTarget
                const formulaire = champ.closest('form')
                setTimeout(() => {
                  if (document.activeElement === champ)
                    formulaire?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
                }, 350)
              }}
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
          <p className={`hero__hint ${plan.etat === 'trop-court' || ARABE.test(saisie) ? 'is-warn' : ''}`} aria-live="polite">
            {aide}
          </p>
        </div>
      </section>

      {/* ================= ACCUEIL : statistiques (aucun nom de candidat) ================= */}
      {!recherche && (
        <>
          <section className="kpis" aria-label="Chiffres clés">
            {/* Toucher une carte mène aux statistiques détaillées (jamais à une liste de noms). */}
          <Stat value={stats.total} label={t('kpi.candidates')} onClick={() => navigate('/stats')} />
          <Stat value={stats.admitted} label={t('kpi.admitted')} tone="ok" onClick={() => navigate('/stats')} />
          <Stat value={stats.oralSecondGroup} label={t('kpi.second')} tone="warn" onClick={() => navigate('/stats')} />
          <Stat value={taux} decimals={1} suffix=" %" label={t('kpi.rate')} tone="accent" onClick={() => navigate('/stats')} />
          </section>

          {classement.visible && (
            <Classement
              etablissements={statsSession?.etablissements}
              top={classement.top}
              minCandidats={classement.minCandidats}
              chargement={!statsSession}
              onPlus={() => navigate('/stats')}
              onOuvrir={setEtabOuvert}
            />
          )}
        </>
      )}

      {/* ================= RECHERCHE : filtres puis résultats ================= */}
      {recherche && (
        <>
          <details className="filters-box" open={filtreActif}>
            <summary>
              <Icon name="sliders" size={16} /> {t('results.filter')}
              {filtreActif && <span className="filters-box__badge">{[statut !== 'ALL', serie !== 'ALL', island !== 'all', centre !== 'ALL'].filter(Boolean).length}</span>}
            </summary>
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
                  {/* Mayotte : présente pour le symbole, grisée (pas de résultats dans cette session) */}
                  <button type="button" className="pill pill--grise" disabled title={`${t('map.mayotte')} : ${t('map.mayotteNo')}`}>{t('map.mayotte')}</button>
                  <button type="button" className="pill pill--nav" onClick={() => changerIle(1)} aria-label={t('filter.next')}>
                    <Icon name="chevronR" size={16} className="flip-rtl" />
                  </button>
                </div>
              </div>

              {/* Centre d'examen : la liste vient des statistiques de la session (un centre par ligne). */}
              {statsSession?.centres?.length > 0 && (
                <div className="filters__group">
                  <label className="filters__label" htmlFor="filtre-centre">{t('filter.center')}</label>
                  <select id="filtre-centre" className="select" value={centre} onChange={(e) => setCentre(e.target.value)}>
                    <option value="ALL">{t('filter.allCenters')}</option>
                    {[...statsSession.centres].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map((c) => (
                      <option key={c.nom} value={c.nom}>{c.nom}</option>
                    ))}
                  </select>
                </div>
              )}

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
          </details>

          <section className="results" aria-live="polite" aria-busy={!pret}>
            {filtreActif && (
              <div className="filtre-puces" aria-label={t('results.active')}>
                {statut !== 'ALL' && (
                  <button type="button" className="filtre-puce" onClick={() => setStatut('ALL')}>
                    {t(`status.${statut}`)} <Icon name="close" size={12} />
                  </button>
                )}
                {serie !== 'ALL' && (
                  <button type="button" className="filtre-puce" onClick={() => setSerie('ALL')}>
                    {t('filter.series')} {serie} <Icon name="close" size={12} />
                  </button>
                )}
                {centre !== 'ALL' && (
                  <button type="button" className="filtre-puce" onClick={() => setCentre('ALL')}>
                    {centre} <Icon name="close" size={12} />
                  </button>
                )}
                {island !== 'all' && (
                  <button type="button" className="filtre-puce" onClick={() => onIsland('all')}>
                    {(islands.find((i) => i.id === island)?.name ?? island).split(' (')[0]} <Icon name="close" size={12} />
                  </button>
                )}
              </div>
            )}
            {erreur ? (
              <div className="notice notice--error">
                <Icon name="alert" /> <span>{t('results.error')}</span>
                <button type="button" className="btn btn--sm" onClick={() => setTentative((n) => n + 1)}>
                  <Icon name="refresh" size={14} /> {t('results.retry')}
                </button>
              </div>
            ) : !pret ? (
              <div className="grid" aria-hidden="true">
                {Array.from({ length: 3 }, (_, i) => (
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
                <p className="results__count">{t('results.count', { n: liste.length })}</p>
                <div className="grid">
                  {liste.slice(0, visibles).map((c, i) => (
                    <CandidateCard key={c.id} candidat={c} index={i} onOpen={ouvrirFiche} fete={liste.length === 1} />
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
        </>
      )}

      {selection && (
        <CandidateModal candidat={selection} session={session} service={config.attestationService?.url} demo={Boolean(config.demo)} onClose={fermerFiche} />
      )}
      {etabOuvert && (
        <EtablissementModal
          etablissement={etabOuvert}
          etablissements={statsSession?.etablissements}
          minCandidats={classement.minCandidats}
          nationale={stats.total ? (stats.admitted / stats.total) * 100 : 0}
          onClose={() => setEtabOuvert(null)}
        />
      )}
    </>
  )
}

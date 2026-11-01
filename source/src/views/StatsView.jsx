// ============================================================================
// StatsView.jsx – tableau de bord des statistiques nationales
// Les chiffres viennent de public/data/<session>/stats.json, fichier calculé
// à l'avance par scripts/build-stats.mjs (voir ce fichier pour le détail).
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Stat from '../components/Stat.jsx'
import IslandMap from '../components/IslandMap.jsx'
import { Columns, Donut, Legend, StackedBars } from '../components/Charts.jsx'
import { useI18n } from '../i18n/index.jsx'
import { loadStats } from '../lib/data.js'
import ClassementComparaison from '../components/ClassementComparaison.jsx'
import MeilleursParIle from '../components/MeilleursParIle.jsx'
import CentresExamen from '../components/CentresExamen.jsx'
import EtablissementModal from '../components/EtablissementModal.jsx'
import { prefersReducedMotion } from '../hooks.js'

const ORDRE_STATUTS = ['ADMIS', 'SECOND_GROUPE', 'AJOURNE']
const ORDRE_MENTIONS = ['PASSABLE', 'ASSEZ_BIEN', 'BIEN', 'TRES_BIEN']

export default function StatsView({ session, classement: reglage }) {
  const { t } = useI18n()
  const [stats, setStats] = useState(null)
  const [erreur, setErreur] = useState(false)
  const [etabOuvert, setEtabOuvert] = useState(null) // établissement dont on regarde la fiche
  const fermerEtab = useCallback(() => setEtabOuvert(null), [])
  // Toucher un chiffre clé fait glisser jusqu'au graphique qui le détaille, qui s'illumine un instant.
  const aller = useCallback((id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    el.classList.add('is-flash')
    setTimeout(() => el.classList.remove('is-flash'), 1800)
  }, [])

  useEffect(() => {
    let actif = true
    setStats(null)
    setErreur(false)
    loadStats(session.id)
      .then((s) => (s ? actif && setStats(s) : setErreur(true)))
      .catch(() => actif && setErreur(true))
    return () => {
      actif = false
    }
  }, [session.id])

  if (erreur) {
    return (
      <div className="notice notice--error page">
        <Icon name="alert" /> <span>{t('stats.error')}</span>
      </div>
    )
  }
  if (!stats) {
    return (
      <div className="page">
        <div className="skeleton skeleton--title" />
        <div className="stats-grid">
          {[0, 1, 2, 3].map((i) => <div key={i} className="panel skeleton skeleton--panel" />)}
        </div>
      </div>
    )
  }

  // Classement des établissements : réglage de l'autorité organisatrice (exams.json > classement).
  const rang = { visible: false, top: 5, topStatistiques: 10, minCandidats: 20, ...reglage }
  const total = stats.total
  const admis = stats.parStatut.ADMIS ?? 0
  const parts = ORDRE_STATUTS.map((k) => ({
    key: k,
    label: t(`status.${k}`),
    value: stats.parStatut[k] ?? 0,
  }))
  const iles = Object.entries(stats.parIle).map(([id, v]) => ({ id, ...v }))
  const series = Object.entries(stats.parSerie).map(([k, v]) => ({ key: k, label: `${t('filter.series')} ${k}`, ...v }))
  const mentions = ORDRE_MENTIONS.map((k) => ({
    key: k,
    label: t(`mention.${k}`),
    value: stats.parMention[k] ?? 0,
  }))

  return (
    <div className="page">
      <header className="page__head">
        <h1>{t('stats.title')}</h1>
        <p>{t('stats.subtitle', { session: `${session.examType} ${session.year}`, total: total.toLocaleString('fr-FR') })}</p>
      </header>

      <section className="kpis kpis--flat">
        <Stat value={total} label={t('kpi.candidates')} onClick={() => aller('stats-statut')} />
        <Stat value={admis} label={t('kpi.admitted')} tone="ok" onClick={() => aller('stats-statut')} />
        <Stat value={(admis / total) * 100} decimals={1} suffix=" %" label={t('kpi.rate')} tone="accent" onClick={() => aller('stats-ile')} />
        <Stat value={stats.moyenneGenerale} decimals={2} suffix=" /20" label={t('stats.average')} onClick={() => aller('stats-mention')} />
      </section>

      <div className="stats-grid">
        <section className="panel" id="stats-statut">
          <h2>{t('stats.byStatus')}</h2>
          <div className="panel__split">
            <Donut parts={parts} total={total} centerValue={`${((admis / total) * 100).toFixed(1).replace('.', ',')} %`} centerLabel={t('kpi.rate')} />
            <Legend parts={parts} total={total} />
          </div>
        </section>

        <section className="panel">
          <h2>{t('stats.map')}</h2>
          <IslandMap islands={iles} />
        </section>

        <section className="panel" id="stats-ile">
          <h2>{t('stats.byIsland')}</h2>
          <StackedBars rows={iles.map((i) => ({ key: i.id, label: i.nom, ...i }))} />
          <Legend parts={parts.map((p) => ({ ...p, value: p.value }))} total={total} />
        </section>

        {series.length > 0 && (
          <section className="panel">
            <h2>{t('stats.bySeries')}</h2>
            <StackedBars rows={series} />
          </section>
        )}

        {/* L'accueil montre déjà le podium : ici, de l'information NOUVELLE (écart avec la moyenne nationale, champion de chaque île). */}
        {rang.visible && stats.etablissements?.length > 0 && (
          <>
            <section className="panel panel--wide">
              <ClassementComparaison etablissements={stats.etablissements} top={rang.topStatistiques} minCandidats={rang.minCandidats} nationale={(admis / total) * 100} onOuvrir={setEtabOuvert} />
            </section>
            <section className="panel panel--wide">
              <MeilleursParIle etablissements={stats.etablissements} minCandidats={rang.minCandidats} onOuvrir={setEtabOuvert} />
            </section>
          </>
        )}

        {stats.centres?.length > 0 && (
          <section className="panel panel--wide" id="stats-centres">
            <CentresExamen centres={stats.centres} onOuvrir={(c) => setEtabOuvert({ ...c, _centre: true })} />
          </section>
        )}

        <section className="panel panel--wide" id="stats-mention">
          <h2>{t('stats.byMention')}</h2>
          <Columns items={mentions} />
        </section>
      </div>

      {etabOuvert && (
        <EtablissementModal
          etablissement={etabOuvert}
          etablissements={etabOuvert._centre ? stats.centres : stats.etablissements}
          minCandidats={etabOuvert._centre ? 0 : rang.minCandidats}
          centre={Boolean(etabOuvert._centre)}
          nationale={(admis / total) * 100}
          onClose={fermerEtab}
        />
      )}
    </div>
  )
}

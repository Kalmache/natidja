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
import { registerPlugin } from '@capacitor/core'
import { isNativeApp } from '../lib/verify.js'
import { useI18n } from '../i18n/index.jsx'
import { loadStats } from '../lib/data.js'
import ClassementComparaison from '../components/ClassementComparaison.jsx'
import MeilleursParIle from '../components/MeilleursParIle.jsx'
import { ficheIle, ficheNationale } from '../lib/classement.js'
import Comparateur from '../components/Comparateur.jsx'
import RapportStatistiques from '../components/RapportStatistiques.jsx'
import CentresExamen from '../components/CentresExamen.jsx'
import EtablissementModal from '../components/EtablissementModal.jsx'
import { prefersReducedMotion } from '../hooks.js'

const ORDRE_STATUTS = ['ADMIS', 'SECOND_GROUPE', 'AJOURNE']
const ORDRE_MENTIONS = ['PASSABLE', 'ASSEZ_BIEN', 'BIEN', 'TRES_BIEN']

// Module natif d'impression (application Android) ; sur le web : window.print().
const ImpressionNative = registerPlugin('ImpressionNative')

export default function StatsView({ session, sessions = [], classement: reglage }) {
  const { t } = useI18n()
  const [stats, setStats] = useState(null)
  const [erreur, setErreur] = useState(false)
  const [annees, setAnnees] = useState([]) // fiches nationales des autres années du MÊME examen (pour « Comparer »)
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

  // « Télécharger le rapport » : ouvre l'impression, d'où l'on choisit « Enregistrer en PDF ».
  const telechargerRapport = async () => {
    try {
      if (isNativeApp()) await ImpressionNative.imprimer({ nom: `Statistiques ${session.examType} ${session.year}` })
      else window.print()
    } catch {
      /* impression annulée : rien à faire */
    }
  }

  // Autres années du même examen (Bac 2025, Bac 2026…) : chargées seulement s'il y en a, pour l'onglet « Années ».
  useEffect(() => {
    const memes = sessions.filter((s) => s.examType === session.examType)
    if (memes.length < 2) return setAnnees([])
    let actif = true
    Promise.all(memes.map((s) => loadStats(s.id).then((st) => (st ? ficheNationale(st, `${s.examType} ${s.year}`) : null)).catch(() => null)))
      .then((fiches) => actif && setAnnees(fiches.filter(Boolean)))
    return () => { actif = false }
  }, [sessions, session.examType])

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

      <div className="page__actions">
        <button type="button" className="btn btn--ghost" onClick={telechargerRapport}>
          <Icon name="download" size={16} /> {t('rapport.button')}
        </button>
      </div>

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
          <IslandMap islands={iles} onSelect={(id) => setEtabOuvert({ ...ficheIle(iles.find((i) => i.id === id)), _type: 'ile' })} />
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
            <CentresExamen centres={stats.centres} onOuvrir={(c) => setEtabOuvert({ ...c, _type: 'centre' })} />
          </section>
        )}

        <section className="panel panel--wide" id="stats-comparer">
          <Comparateur
            minCandidats={rang.minCandidats}
            groupes={{
              etablissements: { titre: t('cmp.tabEtab'), liste: [...(stats.etablissements ?? [])].sort((x, y) => x.nom.localeCompare(y.nom, 'fr')) },
              iles: { titre: t('cmp.tabIle'), liste: iles.map(ficheIle) },
              centres: { titre: t('cmp.tabCentre'), liste: [...(stats.centres ?? [])].sort((x, y) => x.nom.localeCompare(y.nom, 'fr')) },
              annees: { titre: t('cmp.tabYear'), liste: annees },
            }}
          />
        </section>

        <section className="panel panel--wide" id="stats-mention">
          <h2>{t('stats.byMention')}</h2>
          <Columns items={mentions} />
        </section>
      </div>

      <RapportStatistiques stats={stats} session={session} />

      {etabOuvert && (
        <EtablissementModal
          etablissement={etabOuvert}
          etablissements={etabOuvert._type === 'ile' ? iles.map(ficheIle) : etabOuvert._type === 'centre' ? stats.centres : stats.etablissements}
          minCandidats={etabOuvert._type ? 0 : rang.minCandidats}
          type={etabOuvert._type}
          nationale={(admis / total) * 100}
          onClose={fermerEtab}
        />
      )}
    </div>
  )
}

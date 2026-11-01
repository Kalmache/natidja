// ============================================================================
// RapportStatistiques.jsx – le RAPPORT imprimable / « Enregistrer en PDF » des statistiques
// ----------------------------------------------------------------------------
// Logique : ce bloc est caché à l'écran (display:none) et n'apparaît qu'à l'IMPRESSION
// (voir app.css, @media print). Le navigateur ou Android propose alors « Enregistrer en PDF ».
// Il est rendu dans <body> (portail), à côté de #root, qui est masqué à l'impression.
// Contenu 100 % PUBLIC : totaux et taux uniquement, jamais un nom de candidat.
// ============================================================================
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/index.jsx'

const pct = (n, total) => (total ? ((n / total) * 100).toFixed(1).replace('.', ',') + ' %' : '–')
const ORDRE_MENTIONS = ['PASSABLE', 'ASSEZ_BIEN', 'BIEN', 'TRES_BIEN']

/** Un tableau simple : en-têtes + lignes (tableaux de cellules). */
function Tableau({ entetes, lignes }) {
  return (
    <table className="rapport__table">
      <thead><tr>{entetes.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{lignes.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  )
}

export default function RapportStatistiques({ stats, session, avecClassement = true }) {
  const { t } = useI18n()
  const total = stats.total
  const admis = stats.parStatut.ADMIS ?? 0
  const second = stats.parStatut.SECOND_GROUPE ?? 0
  const ajournes = stats.parStatut.AJOURNE ?? total - admis - second
  const ligneGroupe = (e) => [e.nom, e.ile || '–', e.total, e.admis, e.second, e.ajournes, pct(e.admis, e.total)]
  const entetesGroupe = [t('rapport.nom'), t('filter.island'), t('kpi.candidates'), t('kpi.admitted'), t('kpi.second'), t('status.AJOURNE'), t('kpi.rate')]
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return createPortal(
    <article className="rapport" aria-hidden="true">
      <header className="rapport__tete">
        <h1>{t('app.name')} · {t('stats.title')}</h1>
        <p>{session.examType} {session.year} — {t('rapport.edite', { date })}</p>
      </header>

      <h2>{t('rapport.synthese')}</h2>
      <Tableau
        entetes={[t('kpi.candidates'), t('kpi.admitted'), t('kpi.second'), t('status.AJOURNE'), t('kpi.rate'), t('stats.average')]}
        lignes={[[total, admis, second, ajournes, pct(admis, total), `${stats.moyenneGenerale} / 20`]]}
      />

      <h2>{t('stats.byIsland')}</h2>
      <Tableau
        entetes={[t('filter.island'), t('kpi.candidates'), t('kpi.admitted'), t('kpi.rate')]}
        lignes={Object.values(stats.parIle).map((i) => [i.nom, i.total, i.ADMIS ?? 0, pct(i.ADMIS ?? 0, i.total)])}
      />

      {Object.keys(stats.parSerie).length > 0 && (
        <>
          <h2>{t('stats.bySeries')}</h2>
          <Tableau
            entetes={[t('filter.series'), t('kpi.candidates'), t('kpi.admitted'), t('kpi.rate')]}
            lignes={Object.entries(stats.parSerie).map(([k, s]) => [k, s.total, s.ADMIS ?? 0, pct(s.ADMIS ?? 0, s.total)])}
          />
        </>
      )}

      <h2>{t('stats.byMention')}</h2>
      <Tableau
        entetes={ORDRE_MENTIONS.map((k) => t(`mention.${k}`))}
        lignes={[ORDRE_MENTIONS.map((k) => stats.parMention[k] ?? 0)]}
      />

      {stats.centres?.length > 0 && (
        <>
          <h2>{t('centres.title')}</h2>
          <Tableau entetes={entetesGroupe} lignes={[...stats.centres].sort((a, b) => b.total - a.total).map(ligneGroupe)} />
        </>
      )}

      {avecClassement && stats.etablissements?.length > 0 && (
        <>
          <h2>{t('rapport.etablissements')}</h2>
          <Tableau entetes={entetesGroupe} lignes={stats.etablissements.map(ligneGroupe)} />
        </>
      )}

      <footer className="rapport__pied">{t('rapport.pied')}</footer>
    </article>,
    document.body,
  )
}

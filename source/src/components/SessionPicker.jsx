// ============================================================================
// SessionPicker.jsx – choisir l'examen, l'année et l'édition
// ----------------------------------------------------------------------------
// - Peu de sessions (3 ou moins) : des onglets, comme avant (« BAC 2026 | BEPC 2026 »).
// - Davantage (plusieurs années) : trois listes — Examen, Année, Session — qui
//   restent lisibles même avec dix ans d'historique.
// ============================================================================
import { useI18n } from '../i18n/index.jsx'
import { choisirSession, genreDe, optionsSessions } from '../lib/sessions.js'

/** « BAC 2027 » ou « BAC 2027 · Rattrapage ». */
export const libelleSession = (s, t) => `${s.examType} ${s.year}${genreDe(s) === 'RATTRAPAGE' ? ` · ${t('session.rattrapage')}` : ''}`

export default function SessionPicker({ sessions, session, onChange }) {
  const { t } = useI18n()
  if (sessions.length <= 1) return null

  if (sessions.length <= 3) {
    return (
      <div className="segmented" role="tablist" aria-label={t('session.choose')}>
        {sessions.map((s) => (
          <button key={s.id} role="tab" type="button" aria-selected={s.id === session.id} className={s.id === session.id ? 'is-active' : ''} onClick={() => onChange(s.id)}>
            {libelleSession(s, t)}
          </button>
        ))}
      </div>
    )
  }

  const { examens, annees, genres } = optionsSessions(sessions, session)
  const changer = (critere) => (e) => onChange(choisirSession(sessions, session, { [critere]: e.target.value }))
  return (
    <div className="session-picker" role="group" aria-label={t('session.choose')}>
      <label>
        <span>{t('session.exam')}</span>
        <select value={session.examType} onChange={changer('examType')}>
          {examens.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label>
        <span>{t('session.year')}</span>
        <select value={session.year} onChange={changer('year')}>
          {annees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <label>
        <span>{t('session.edition')}</span>
        <select value={genreDe(session)} onChange={changer('genre')} disabled={genres.length < 2}>
          {genres.map((g) => <option key={g} value={g}>{t(g === 'RATTRAPAGE' ? 'session.rattrapage' : 'session.principale')}</option>)}
        </select>
      </label>
    </div>
  )
}

// ============================================================================
// CandidateCard.jsx – la carte affichée dans la liste des résultats
// ============================================================================
import Icon from './Icon.jsx'
import { useI18n } from '../i18n/index.jsx'
import { MENTIONS, dateNaissance, note, titleCase } from '../lib/format.js'

/** Petit anneau de progression : la moyenne sur 20 matérialisée en cercle. */
function AverageRing({ value, status }) {
  const pourcent = Math.max(0, Math.min(100, (value / 20) * 100))
  return (
    <div className={`ring ring--${status}`} aria-label={`${note(value)} / 20`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className="ring__bg" cx="18" cy="18" r="15.9" />
        <circle
          className="ring__fg"
          cx="18"
          cy="18"
          r="15.9"
          strokeDasharray={`${pourcent} ${100 - pourcent}`}
        />
      </svg>
      <span>{note(value)}</span>
    </div>
  )
}

export default function CandidateCard({ candidat, onOpen, index = 0 }) {
  const { t } = useI18n()
  const statut = candidat.status

  return (
    <button
      type="button"
      className={`card card--${statut}`}
      onClick={() => onOpen(candidat)}
      // Les cartes apparaissent en cascade (léger décalage), limité à 12.
      style={{ '--delay': `${Math.min(index, 12) * 35}ms` }}
    >
      <div className="card__top">
        <span className="chip chip--mono">
          {t('card.table')} {candidat.tableNumber}
        </span>
        {candidat.series && (
          <span className="chip chip--accent">
            {t('card.series')} {candidat.series}
          </span>
        )}
      </div>

      <div className="card__main">
        <div className="card__identity">
          <h3 className="card__name">
            {candidat.lastName} <span>{titleCase(candidat.firstName)}</span>
          </h3>
          <span className={`badge badge--${statut}`}>
            <i aria-hidden="true" />
            {t(`status.${statut}`)}
            {statut === 'ADMIS' && candidat.mention && MENTIONS[candidat.mention]
              ? ` · ${MENTIONS[candidat.mention]}`
              : ''}
          </span>
        </div>
        {typeof candidat.average === 'number' && (
          <AverageRing value={candidat.average} status={statut} />
        )}
      </div>

      <ul className="card__meta">
        {dateNaissance(candidat.birthDate) && (
          <li>
            <Icon name="calendar" size={14} /> {t('card.born', { date: dateNaissance(candidat.birthDate) })}
          </li>
        )}
        {candidat.birthPlace && (
          <li>
            <Icon name="pin" size={14} /> {candidat.birthPlace}
          </li>
        )}
        {candidat.school && (
          <li>
            <Icon name="school" size={14} /> {candidat.school}
          </li>
        )}
      </ul>

      <span className="card__open">
        {t('card.open')} <Icon name="chevronR" size={14} className="flip-rtl" />
      </span>
    </button>
  )
}

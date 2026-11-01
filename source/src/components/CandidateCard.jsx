// ============================================================================
// CandidateCard.jsx – la carte affichée dans la liste des résultats
// ----------------------------------------------------------------------------
// VOLONTAIREMENT SOBRE : n'importe qui peut chercher un nom, donc la carte ne montre que
// le nécessaire pour reconnaître la bonne personne — nom, résultat (admis ou non), série,
// établissement. Le numéro de table, la mention, la moyenne et la date de naissance ne
// figurent que sur l'attestation, ouverte après vérification de l'identité du candidat.
// ============================================================================
import Icon from './Icon.jsx'
import { useI18n } from '../i18n/index.jsx'
import { titleCase } from '../lib/format.js'

// Une icône par résultat : lisible même sans lire le texte.
const ICONE = { ADMIS: 'check', SECOND_GROUPE: 'info', AJOURNE: 'close' }

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
      <div className="card__main">
        <div className="card__identity">
          <h3 className="card__name">
            {candidat.lastName} <span>{titleCase(candidat.firstName)}</span>
          </h3>
          <span className={`badge badge--${statut}`}>
            <i aria-hidden="true" />
            {t(`status.${statut}`)}
          </span>
        </div>
        <span className={`card__icon card__icon--${statut}`} aria-hidden="true">
          <Icon name={ICONE[statut] ?? 'info'} size={22} />
        </span>
      </div>

      <ul className="card__meta">
        {candidat.school && (
          <li>
            <Icon name="school" size={14} /> {candidat.school}
          </li>
        )}
        {(candidat.series || candidat.island) && (
          <li>
            <Icon name="pin" size={14} />
            {[candidat.island, candidat.series && `${t('card.series')} ${candidat.series}`].filter(Boolean).join(' · ')}
          </li>
        )}
      </ul>

      <span className="card__open">
        {t('card.open')} <Icon name="chevronR" size={14} className="flip-rtl" />
      </span>
    </button>
  )
}

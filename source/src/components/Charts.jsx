// ============================================================================
// Charts.jsx – graphiques dessinés à la main en SVG/CSS (aucune bibliothèque :
// le site reste léger). Chaque graphique a un texte alternatif pour les
// lecteurs d'écran.
// ============================================================================
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { pct } from '../lib/format.js'

/**
 * Rend un élément de liste cliquable ET utilisable au clavier (Entrée / Espace)
 * quand `action` est fourni ; sinon ne change rien.
 */
function cliquable(action) {
  if (!action) return {}
  return {
    role: 'button',
    tabIndex: 0,
    className: 'is-click',
    onClick: action,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        action()
      }
    },
  }
}

/** Renvoie false au 1er affichage puis true : sert à déclencher les transitions CSS. */
function useMounted() {
  const [monte, setMonte] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMonte(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return monte
}

/**
 * Anneau (« donut ») : chaque segment est un cercle dont on ne dessine qu'une
 * portion grâce à stroke-dasharray. Le rayon 15.915 donne une circonférence de
 * 100 : les pourcentages se lisent donc directement.
 */
export function Donut({ parts, total, centerValue, centerLabel }) {
  const monte = useMounted()
  let decalage = 0
  return (
    <div className="donut">
      <svg viewBox="0 0 36 36" role="img" aria-label={parts.map((p) => `${p.label} ${pct(p.value, total)}`).join(', ')}>
        <circle className="donut__track" cx="18" cy="18" r="15.915" />
        {parts.map((p) => {
          const part = (p.value / total) * 100
          const segment = (
            <circle
              key={p.key}
              className={`donut__seg donut__seg--${p.key}`}
              cx="18"
              cy="18"
              r="15.915"
              strokeDasharray={`${monte ? Math.max(0, part - 0.6) : 0} ${100 - (monte ? Math.max(0, part - 0.6) : 0)}`}
              strokeDashoffset={-decalage}
            />
          )
          decalage += part
          return segment
        })}
      </svg>
      <div className="donut__center">
        <strong>{centerValue}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  )
}

export function Legend({ parts, total, onSelect }) {
  return (
    <ul className="legend">
      {parts.map((p) => (
        <li key={p.key} {...cliquable(onSelect && (() => onSelect(p)))}>
          <i className={`dot dot--${p.key}`} />
          <span>{p.label}</span>
          <strong>{p.value.toLocaleString('fr-FR')}</strong>
          <small>{pct(p.value, total)}</small>
        </li>
      ))}
    </ul>
  )
}

/**
 * Barres empilées horizontales : une ligne par île/série, avec la part
 * d'admis / second groupe / ajournés. Le taux de réussite est écrit à droite.
 */
export function StackedBars({ rows, onSelect }) {
  const { t } = useI18n()
  const monte = useMounted()
  return (
    <ul className="bars">
      {rows.map((r) => {
        const admis = r.ADMIS ?? 0
        const second = r.SECOND_GROUPE ?? 0
        const ajourne = r.AJOURNE ?? 0
        const w = (n) => (monte ? (n / r.total) * 100 : 0)
        return (
          <li key={r.key} {...cliquable(onSelect && (() => onSelect(r)))}>
            <div className="bars__head">
              <span>{r.label}</span>
              <strong>{pct(admis, r.total)}</strong>
            </div>
            <div
              className="bars__track"
              role="img"
              aria-label={`${r.label} : ${t('status.ADMIS')} ${admis}, ${t('status.SECOND_GROUPE')} ${second}, ${t('status.AJOURNE')} ${ajourne}`}
            >
              <i className="seg seg--ADMIS" style={{ width: `${w(admis)}%` }} />
              <i className="seg seg--SECOND_GROUPE" style={{ width: `${w(second)}%` }} />
              <i className="seg seg--AJOURNE" style={{ width: `${w(ajourne)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Histogramme vertical simple (mentions). */
export function Columns({ items, onSelect }) {
  const monte = useMounted()
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="columns">
      {items.map((i) => (
        <li key={i.key} {...cliquable(onSelect && (() => onSelect(i)))}>
          <strong>{i.value}</strong>
          <div className="columns__bar">
            <i style={{ height: monte ? `${(i.value / max) * 100}%` : '0%' }} />
          </div>
          <span>{i.label}</span>
        </li>
      ))}
    </ul>
  )
}

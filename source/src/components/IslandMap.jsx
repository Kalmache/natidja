// ============================================================================
// IslandMap.jsx – schéma interactif des îles de l'archipel (Mayotte figure en grisé, à titre symbolique)
// ----------------------------------------------------------------------------
// ⚠️ Ce n'est PAS une carte à l'échelle : ce sont des formes stylisées placées
// à peu près comme sur la vraie carte (Ngazidja au nord-ouest, Mwali au centre,
// Ndzuwani à l'est). Chaque île est cliquable ; sa teinte est d'autant plus
// intense que son taux de réussite est élevé.
// Pour une vraie carte précise, il faudra intégrer des contours géographiques
// officiels (GeoJSON) – à prévoir en phase 2.
// ============================================================================
import { useI18n } from '../i18n/index.jsx'
import { pct } from '../lib/format.js'

// Contour (path SVG) et position de l'étiquette de chaque île.
const FORMES = {
  ngazidja: {
    d: 'M95 42 C125 28 162 52 160 88 C158 124 142 162 118 170 C92 178 68 152 70 112 C71 82 78 50 95 42 Z',
    label: [116, 108],
  },
  mwali: {
    d: 'M182 190 C198 176 242 178 254 191 C260 203 238 214 214 213 C190 212 172 200 182 190 Z',
    label: [217, 197],
  },
  ndzuwani: {
    d: 'M302 70 C327 62 354 85 360 116 C366 150 347 192 320 198 C298 202 286 172 290 142 C292 114 288 78 302 70 Z',
    label: [324, 134],
  },
}

export default function IslandMap({ islands, onSelect }) {
  const { t } = useI18n()
  return (
    <figure className="map">
      <svg viewBox="0 0 430 262" role="group" aria-label={t('stats.map')}>
        <defs>
          <radialGradient id="mer" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="var(--sea-1)" />
            <stop offset="100%" stopColor="var(--sea-2)" />
          </radialGradient>
        </defs>
        <rect width="430" height="262" rx="18" fill="url(#mer)" />
        {/* Vagues décoratives qui ondulent doucement */}
        {[40, 90, 150, 215].map((y, i) => (
          <path
            key={y}
            className="map__wave"
            style={{ '--i': i }}
            d={`M-20 ${y} q 30 -10 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0`}
          />
        ))}

        {islands.map((ile) => {
          const forme = FORMES[ile.id]
          if (!forme) return null
          const taux = (ile.ADMIS ?? 0) / ile.total
          return (
            <g
              key={ile.id}
              className="map__island"
              style={{ '--rate': `${Math.round(35 + taux * 60)}%` }}
              role={onSelect ? 'button' : 'img'}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={`${ile.nom} : ${pct(ile.ADMIS ?? 0, ile.total)}`}
              onClick={onSelect ? () => onSelect(ile.id) : undefined}
              onKeyDown={onSelect ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(ile.id)) : undefined}
            >
              <path d={forme.d} />
              <text x={forme.label[0]} y={forme.label[1]} textAnchor="middle">
                <tspan className="map__name" x={forme.label[0]}>{ile.nom}</tspan>
                <tspan className="map__rate" x={forme.label[0]} dy="17">{pct(ile.ADMIS ?? 0, ile.total)}</tspan>
              </text>
            </g>
          )
        })}
        {/* Mayotte : présente sur la carte pour le symbole, mais grisée (aucun résultat publié ici) ;
            ni cliquable, ni chiffrée. Placée au sud-est d'Anjouan, comme sur la vraie carte. */}
        <g className="map__island map__island--grise" role="img" aria-label={`${t('map.mayotte')} : ${t('map.mayotteNo')}`}>
          <title>{`${t('map.mayotte')} : ${t('map.mayotteNo')}`}</title>
          <g transform="translate(396 205) scale(1.4) translate(-396 -205)">
            <path d="M388 182 C395 176 403 181 402 193 C401 205 407 214 401 225 C396 232 388 229 386 220 C384 211 389 203 387 194 C386 188 386 184 388 182 Z" />
            <ellipse cx="410" cy="186" rx="4.5" ry="7" />
          </g>
          <text x="396" y="250" textAnchor="middle"><tspan className="map__name">{t('map.mayotte')}</tspan></text>
        </g>
      </svg>
      <figcaption>
        <strong>{t('stats.mapHint')}</strong> · {t('stats.mapNote')}
      </figcaption>
    </figure>
  )
}

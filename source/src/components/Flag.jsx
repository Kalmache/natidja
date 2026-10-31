// ============================================================================
// Drapeau des Comores dessiné en SVG (donc net à toutes les tailles, et sans
// aucune image à télécharger).
//   - 4 bandes horizontales : jaune, blanc, rouge, bleu
//   - triangle vert côté mât, avec un croissant blanc et 4 étoiles
// `animated` fait glisser les bandes l'une après l'autre (écran d'accueil).
// ============================================================================
import { useId } from 'react'

const BANDES = ['#fcd116', '#ffffff', '#ce1126', '#3d4fb3']

// Étoile à 5 branches centrée en (cx, cy) : on alterne un point extérieur
// (rayon r) et un point intérieur (rayon plus petit) autour du centre.
function etoile(cx, cy, r) {
  const points = []
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5 // on part de la pointe du haut
    const rayon = i % 2 === 0 ? r : r * 0.42
    points.push(`${(cx + rayon * Math.cos(angle)).toFixed(2)},${(cy + rayon * Math.sin(angle)).toFixed(2)}`)
  }
  return points.join(' ')
}

export default function Flag({ animated = false, className = '' }) {
  // Chaque drapeau affiché a besoin d'un identifiant UNIQUE pour son masque
  // de découpe ; sinon plusieurs drapeaux sur la page se « volent » le masque.
  const id = 'flag-clip-' + useId().replace(/:/g, '')
  return (
    <svg
      className={`flag ${animated ? 'flag--animated' : ''} ${className}`}
      viewBox="0 0 300 180"
      role="img"
      aria-label="Drapeau de l’Union des Comores"
    >
      <defs>
        <clipPath id={id}>
          <rect width="300" height="180" rx="10" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {BANDES.map((couleur, i) => (
          <rect
            key={couleur}
            className="flag__band"
            style={{ '--i': i }}
            x="0"
            y={i * 45}
            width="300"
            height="45"
            fill={couleur}
          />
        ))}
        <g className="flag__triangle">
          <polygon points="0,0 135,90 0,180" fill="#3a9d23" />
          {/* Croissant = un disque blanc moins un disque vert décalé */}
          <circle cx="40" cy="90" r="27" fill="#fff" />
          <circle cx="50" cy="90" r="24" fill="#3a9d23" />
          {/* 4 étoiles à 5 branches, parfaitement alignées sur une verticale (x = 60)
              et centrées sur le milieu du drapeau (y = 90), espacées de 17 */}
          {[64.5, 81.5, 98.5, 115.5].map((y) => (
            <polygon key={y} points={etoile(60, y, 6.5)} fill="#fff" />
          ))}
        </g>
      </g>
    </svg>
  )
}

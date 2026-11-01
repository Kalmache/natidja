// ============================================================================
// Ballons.jsx – des ballons qui s'envolent pour fêter un candidat admis
// ----------------------------------------------------------------------------
// Logique : une douzaine de ballons (un rond + une petite ficelle) partent du bas de l'écran et
// montent en se balançant, chacun avec sa taille, sa couleur (celles du drapeau), son départ et sa
// vitesse. Tout est fait en CSS (transformations et opacité) : fluide même sur un téléphone modeste.
// Ils disparaissent seuls à la fin (le composant se retire du rendu), ne bloquent aucun clic
// (pointer-events: none) et ne s'affichent pas si l'appareil demande « moins d'animations ».
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import { prefersReducedMotion } from '../hooks.js'

const COULEURS = ['#fcd116', '#ce1126', '#3d4fb3', '#3a9d23', '#ffffff', '#34d399']
const hasard = (min, max) => min + Math.random() * (max - min)

export default function Ballons({ nombre = 14 }) {
  const [visible, setVisible] = useState(true)
  // Les caractéristiques de chaque ballon sont tirées UNE fois (sinon ils « sauteraient » à chaque affichage).
  const ballons = useMemo(
    () =>
      Array.from({ length: nombre }, (_, i) => ({
        id: i,
        gauche: hasard(2, 94), // position horizontale, en % de la largeur
        taille: hasard(34, 58), // diamètre, en pixels
        couleur: COULEURS[i % COULEURS.length],
        retard: hasard(0, 1.4), // départ échelonné, en secondes
        duree: hasard(4.2, 6.4), // temps de la montée
        balancement: hasard(10, 28), // amplitude du balancement latéral, en pixels
      })),
    [nombre],
  )

  // On retire les ballons du rendu une fois la dernière animation finie.
  useEffect(() => {
    const fin = Math.max(...ballons.map((b) => b.retard + b.duree)) * 1000 + 300
    const minuteur = setTimeout(() => setVisible(false), fin)
    return () => clearTimeout(minuteur)
  }, [ballons])

  if (!visible || prefersReducedMotion()) return null
  return (
    <div className="ballons no-print" aria-hidden="true">
      {ballons.map((b) => (
        <span
          key={b.id}
          className="ballon"
          style={{
            left: `${b.gauche}%`,
            width: b.taille,
            height: b.taille * 1.18,
            '--c': b.couleur,
            '--balance': `${b.balancement}px`,
            animationDuration: `${b.duree}s`,
            animationDelay: `${b.retard}s`,
          }}
        />
      ))}
    </div>
  )
}

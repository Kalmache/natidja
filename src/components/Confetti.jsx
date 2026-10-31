// ============================================================================
// Confetti.jsx – feu d'artifice de confettis pour célébrer un candidat admis
// ----------------------------------------------------------------------------
// On dessine sur un <canvas> (une « toile ») plein écran, 60 fois par seconde.
// Chaque confetti a une position, une vitesse et une rotation. À chaque image :
//   - la GRAVITÉ ajoute de la vitesse vers le bas ;
//   - la RÉSISTANCE DE L'AIR ralentit un peu le confetti ;
// Deux « canons » tirent depuis les coins du bas, puis une pluie fine retombe
// du haut. Couleurs = celles du drapeau comorien.
// Désactivé si la personne a demandé « moins d'animations ».
// ============================================================================
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../hooks.js'

const COULEURS = ['#fcd116', '#ffffff', '#ce1126', '#3d4fb3', '#3a9d23', '#34d399']
const hasard = (min, max) => min + Math.random() * (max - min)

export default function Confetti({ intensite = 1 }) {
  const toile = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const canvas = toile.current
    const ctx = canvas.getContext('2d')
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const largeur = window.innerWidth
    const hauteur = window.innerHeight
    canvas.width = largeur * ratio
    canvas.height = hauteur * ratio
    ctx.scale(ratio, ratio)

    const creer = (x, y, vx, vy, retard = 0) => ({
      x, y, vx, vy, retard,
      taille: hasard(7, 13),
      angle: hasard(0, Math.PI * 2),
      rotation: hasard(-0.3, 0.3),
      couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
    })

    const confettis = []
    const parCanon = Math.round(70 * intensite)
    // Canon de gauche : tire vers le haut et vers la droite.
    for (let i = 0; i < parCanon; i++) {
      confettis.push(creer(0, hauteur, hasard(5, 17), -hasard(14, 30)))
      // Canon de droite : symétrique.
      confettis.push(creer(largeur, hauteur, -hasard(5, 17), -hasard(14, 30)))
    }
    // Pluie fine qui démarre un peu plus tard, répartie sur toute la largeur.
    for (let i = 0; i < Math.round(60 * intensite); i++) {
      confettis.push(creer(hasard(0, largeur), hasard(-hauteur * 0.4, -10), hasard(-1.5, 1.5), hasard(2, 5), hasard(300, 1500)))
    }

    let raf
    const debut = performance.now()
    const dessiner = (maintenant) => {
      const ecoule = maintenant - debut
      ctx.clearRect(0, 0, largeur, hauteur)
      // Fondu progressif pendant la dernière seconde et demie.
      ctx.globalAlpha = ecoule > 3000 ? Math.max(0, 1 - (ecoule - 3000) / 1500) : 1
      for (const c of confettis) {
        if (ecoule < c.retard) continue
        c.vy += 0.42 // gravité
        c.vx *= 0.985 // résistance de l'air (horizontal)
        c.vy *= 0.985
        c.x += c.vx + Math.sin(c.y / 35) * 0.8 // petit balancement
        c.y += c.vy
        c.angle += c.rotation
        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate(c.angle)
        ctx.fillStyle = c.couleur
        ctx.fillRect(-c.taille / 2, -c.taille / 4, c.taille, c.taille / 2)
        ctx.restore()
      }
      if (ecoule < 4600) raf = requestAnimationFrame(dessiner)
      else ctx.clearRect(0, 0, largeur, hauteur)
    }
    raf = requestAnimationFrame(dessiner)
    return () => cancelAnimationFrame(raf) // on arrête tout si le composant disparaît
  }, [intensite])

  return <canvas ref={toile} className="confetti" aria-hidden="true" />
}

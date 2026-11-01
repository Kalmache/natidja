// ============================================================================
// carteReussite.js – la « carte à partager » : une image faite pour les réseaux sociaux
// ----------------------------------------------------------------------------
// Beaucoup de candidats publient une capture de leur attestation, avec leur numéro de table,
// leur date de naissance, leur moyenne... Cette carte donne une alternative belle ET sobre :
// le nom, « Admis(e) », la mention, l'établissement, et la signature de l'application.
// Jamais de numéro de table, de date de naissance ni de moyenne.
//
// Dessinée avec un <canvas> : aucune image à télécharger, aucun serveur.
// ============================================================================
import { MENTIONS, titleCase } from './format.js'

const L = 1080 // largeur de l'image
const H = 1350 // hauteur (format portrait, adapté aux stories et aux statuts)

/** Étoile à 5 branches centrée en (cx, cy). */
function etoile(ctx, cx, cy, r) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rayon = i % 2 === 0 ? r : r * 0.42
    ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + rayon * Math.cos(a), cy + rayon * Math.sin(a))
  }
  ctx.closePath()
  ctx.fill()
}

/** Le drapeau des Comores (4 bandes, triangle vert, croissant, 4 étoiles), dessiné en (x, y) sur 300 × 180 × échelle. */
function drapeau(ctx, x, y, e) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(e, e)
  ctx.beginPath()
  ctx.roundRect(0, 0, 300, 180, 12)
  ctx.clip()
  ;['#fcd116', '#ffffff', '#ce1126', '#3d4fb3'].forEach((c, i) => {
    ctx.fillStyle = c
    ctx.fillRect(0, i * 45, 300, 45)
  })
  ctx.fillStyle = '#3a9d23'
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.lineTo(135, 90); ctx.lineTo(0, 180); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(40, 90, 27, 0, Math.PI * 2); ctx.fill() // croissant = disque blanc…
  ctx.fillStyle = '#3a9d23'
  ctx.beginPath(); ctx.arc(50, 90, 24, 0, Math.PI * 2); ctx.fill() // …moins un disque vert décalé
  ctx.fillStyle = '#fff'
  ;[64.5, 81.5, 98.5, 115.5].forEach((cy) => etoile(ctx, 60, cy, 6.5))
  ctx.restore()
}

/** Coupe un texte en lignes qui tiennent dans `largeur` pixels. */
function lignes(ctx, texte, largeur) {
  const mots = texte.split(' ')
  const sortie = []
  let courante = ''
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot
    if (ctx.measureText(essai).width > largeur && courante) {
      sortie.push(courante)
      courante = mot
    } else courante = essai
  }
  if (courante) sortie.push(courante)
  return sortie
}

/**
 * @returns {Promise<Blob>} l'image PNG
 * @param {object} d  { candidat, session, textes: { admis, mention, sur } }
 */
export function creerCarteReussite({ candidat, session, textes }) {
  const canvas = document.createElement('canvas')
  canvas.width = L
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const police = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

  // Fond : dégradé vert profond vers bleu, avec deux grands halos lumineux.
  const fond = ctx.createLinearGradient(0, 0, L, H)
  fond.addColorStop(0, '#064e3b')
  fond.addColorStop(0.55, '#0f766e')
  fond.addColorStop(1, '#155e75')
  ctx.fillStyle = fond
  ctx.fillRect(0, 0, L, H)
  for (const [x, y, r, c] of [[160, 220, 520, 'rgba(252,209,22,0.16)'], [960, 1100, 560, 'rgba(255,255,255,0.10)']]) {
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r)
    halo.addColorStop(0, c)
    halo.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, L, H)
  }
  // Petits points dorés comme des confettis (positions fixes : la carte est toujours la même).
  ctx.fillStyle = 'rgba(252,209,22,0.55)'
  for (let i = 0; i < 46; i++) {
    const x = (i * 197 + 71) % L
    const y = (i * 311 + 43) % 520
    ctx.beginPath(); ctx.arc(x, y, 3 + (i % 4) * 2, 0, Math.PI * 2); ctx.fill()
  }

  ctx.textAlign = 'center'
  drapeau(ctx, L / 2 - 150, 90, 1)

  ctx.fillStyle = '#ffffff'
  ctx.font = `800 54px ${police}`
  ctx.fillText('Ndeze Natidja', L / 2, 360)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = `600 36px ${police}`
  ctx.fillText(`${session.title.split(' (')[0]} · ${session.sessionDate}`.slice(0, 60), L / 2, 416)

  // Le grand « Admis(e) »
  ctx.fillStyle = '#fde68a'
  ctx.font = `900 190px ${police}`
  ctx.fillText(textes.admis.toUpperCase(), L / 2, 700)
  if (candidat.mention && MENTIONS[candidat.mention]) {
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 62px ${police}`
    ctx.fillText(`${textes.mention} ${MENTIONS[candidat.mention]}`, L / 2, 790)
  }

  // Le nom
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 80px ${police}`
  const nom = `${titleCase(candidat.firstName)} ${candidat.lastName}`
  const lignesNom = lignes(ctx, nom, L - 160)
  lignesNom.slice(0, 3).forEach((l, i) => ctx.fillText(l, L / 2, 930 + i * 92))

  // L'établissement
  if (candidat.school) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = `600 42px ${police}`
    const y = 930 + Math.min(lignesNom.length, 3) * 92 + 24
    lignes(ctx, candidat.school, L - 200).slice(0, 2).forEach((l, i) => ctx.fillText(l, L / 2, y + i * 54))
  }

  // Signature
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `700 34px ${police}`
  ctx.fillText('Résultats sur Ndeze Natidja · mmbt.fr', L / 2, H - 70)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image impossible'))), 'image/png'))
}

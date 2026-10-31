// ============================================================================
// QrCode.jsx – dessine un QR code en SVG à partir d'un texte (un lien ici).
// La bibliothèque « qrcode-generator » calcule la grille de carrés noirs/blancs ;
// nous la dessinons nous-mêmes (un <rect> par carré noir). Rien n'est envoyé
// sur internet : tout est calculé dans le navigateur.
// ============================================================================
import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

export default function QrCode({ text, size = 120, label }) {
  const grille = useMemo(() => {
    const qr = qrcode(0, 'M') // 0 = taille automatique, 'M' = correction d'erreur moyenne
    qr.addData(text)
    qr.make()
    const n = qr.getModuleCount()
    const carres = []
    for (let ligne = 0; ligne < n; ligne++) {
      for (let col = 0; col < n; col++) {
        if (qr.isDark(ligne, col)) carres.push([col, ligne])
      }
    }
    return { n, carres }
  }, [text])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-2 -2 ${grille.n + 4} ${grille.n + 4}`} // marge blanche autour (zone de silence)
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      <rect x="-2" y="-2" width={grille.n + 4} height={grille.n + 4} fill="#fff" />
      {grille.carres.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0f172a" />
      ))}
    </svg>
  )
}

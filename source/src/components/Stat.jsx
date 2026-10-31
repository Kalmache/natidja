// Un chiffre clé qui « monte » de 0 à sa valeur quand il apparaît à l'écran.
// Si on lui donne `onClick`, la carte devient un BOUTON (accessible au clavier
// et au lecteur d'écran) qui mène directement aux résultats concernés.
import { useCountUp } from '../hooks.js'

export default function Stat({ value, decimals = 0, suffix = '', label, tone = 'default', onClick }) {
  const [affiche, ref] = useCountUp(value)
  // Entiers : « 3 500 » (séparateur de milliers) ; décimaux : « 45,7 ».
  const texte = decimals
    ? affiche.toFixed(decimals).replace('.', ',')
    : Math.round(affiche).toLocaleString('fr-FR')
  const Balise = onClick ? 'button' : 'div'
  return (
    <Balise
      className={`stat stat--${tone} ${onClick ? 'stat--click' : ''}`}
      ref={ref}
      {...(onClick ? { type: 'button', onClick, title: label } : {})}
    >
      <div className="stat__value">
        {texte}
        {suffix && <small>{suffix}</small>}
      </div>
      <div className="stat__label">{label}</div>
    </Balise>
  )
}

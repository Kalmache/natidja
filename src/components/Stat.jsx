// Un chiffre clé qui « monte » de 0 à sa valeur quand il apparaît à l'écran.
import { useCountUp } from '../hooks.js'

export default function Stat({ value, decimals = 0, suffix = '', label, tone = 'default' }) {
  const [affiche, ref] = useCountUp(value)
  // Entiers : « 3 500 » (séparateur de milliers) ; décimaux : « 45,7 ».
  const texte = decimals
    ? affiche.toFixed(decimals).replace('.', ',')
    : Math.round(affiche).toLocaleString('fr-FR')
  return (
    <div className={`stat stat--${tone}`} ref={ref}>
      <div className="stat__value">
        {texte}
        {suffix && <small>{suffix}</small>}
      </div>
      <div className="stat__label">{label}</div>
    </div>
  )
}

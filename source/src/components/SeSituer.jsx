// ============================================================================
// SeSituer.jsx – « Où se situe mon établissement ? »
// ----------------------------------------------------------------------------
// On choisit UN établissement (ou un centre) et l'appli le compare toute seule à la moyenne de son île
// et à la moyenne nationale, puis écrit un verdict. C'est la question que posent surtout parents et
// enseignants. Un bouton mène ensuite au duel avec un autre élément.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { positionnement } from '../lib/classement.js'

const fr = (n) => Number(n).toFixed(1).replace('.', ',')
const sansSigne = (n) => fr(Math.abs(n))

function Ecart({ n, cible, nom, t }) {
  if (n === null || n === undefined) return null
  const cle = n === 0 ? 'situ.level' : n > 0 ? 'situ.above' : 'situ.below'
  return <li className={n > 0 ? 'is-plus' : n < 0 ? 'is-moins' : ''}>{t(cle, { n: sansSigne(n), cible, nom })}</li>
}

export default function SeSituer({ groupes, iles, nationale, minCandidats = 20, initial, onComparer }) {
  const { t } = useI18n()
  const types = useMemo(() => Object.entries(groupes).filter(([, g]) => g.liste.length > 0), [groupes])
  const [cle, setCle] = useState(types[0]?.[0])
  const [nom, setNom] = useState('')

  // Arrivée depuis la fiche d'un établissement : on pré-sélectionne.
  useEffect(() => {
    if (!initial) return
    if (types.some(([k]) => k === initial.type)) { setCle(initial.type); setNom(initial.nom) }
  }, [initial?.n]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!types.length) return null
  const type = types.find(([k]) => k === cle) ?? types[0]
  const liste = type[1].liste
  const fiche = liste.find((f) => f.nom === nom)
  const seuil = type[0] === 'etablissements' ? minCandidats : 0
  const pos = fiche ? positionnement(fiche, iles, nationale, liste, seuil) : null

  const barre = (valeur, couleur) => <span className="situ__piste" aria-hidden="true"><i style={{ width: `${Math.min(100, valeur)}%`, background: couleur }} /></span>

  return (
    <div className="situ">
      <h2>{t('situ.title')}</h2>
      <p className="vs__sous">{t('situ.sub')}</p>

      {types.length > 1 && (
        <div className="pills situ__types" role="tablist">
          {types.map(([k, g]) => (
            <button key={k} type="button" role="tab" aria-selected={k === type[0]} className={`pill pill--sm ${k === type[0] ? 'is-active' : ''}`} onClick={() => { setCle(k); setNom('') }}>{g.titre}</button>
          ))}
        </div>
      )}

      <select className="select situ__choix" value={nom} onChange={(e) => setNom(e.target.value)} aria-label={t('situ.title')}>
        <option value="">{t('situ.pick')}</option>
        {liste.map((f) => <option key={f.nom} value={f.nom}>{f.nom}</option>)}
      </select>

      {pos && (
        <div className="situ__res">
          <div className="situ__ligne"><span>{t('situ.mine')}</span><b>{fr(pos.taux)} %</b></div>
          {barre(pos.taux, 'linear-gradient(90deg,#059669,#34d399)')}
          {pos.tauxIle !== null && (<><div className="situ__ligne"><span>{t('situ.island', { ile: fiche.ile })}</span><b>{fr(pos.tauxIle)} %</b></div>{barre(pos.tauxIle, '#9db8ac')}</>)}
          <div className="situ__ligne"><span>{t('situ.national')}</span><b>{fr(pos.tauxNational)} %</b></div>
          {barre(pos.tauxNational, '#c8d6cf')}

          <ul className="situ__verdict" role="status">
            <Ecart n={pos.ecartNational} cible={t('situ.nationalLow')} t={t} />
            <Ecart n={pos.ecartIle} cible={t('situ.islandLow', { ile: fiche.ile })} t={t} />
            {pos.rang && <li>🏆 {t(type[0] === 'centres' ? 'etab.rankCenter' : 'etab.rank', { n: pos.rang, total: pos.total })}</li>}
            {pos.petit && <li className="is-moins">{t('situ.small', { n: minCandidats })}</li>}
          </ul>
          <button type="button" className="btn btn--ghost situ__duel" onClick={() => onComparer?.(type[0], fiche.nom)}>⚖️ {t('situ.compare')}</button>
        </div>
      )}
    </div>
  )
}

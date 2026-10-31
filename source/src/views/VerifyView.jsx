// ============================================================================
// VerifyView.jsx – vérification d'une attestation
// Arrivée par QR code : #/verif/<session>/<n° de table>/<code>  (contrôle auto)
// Arrivée manuelle   : #/verif  (formulaire à remplir)
// ============================================================================
import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { useI18n } from '../i18n/index.jsx'
import { buildQuery, normalize } from '../lib/search.js'
import { loadShard } from '../lib/data.js'
import { verificationCode } from '../lib/verify.js'
import { navigate } from '../hooks.js'

export default function VerifyView({ config, session, params }) {
  const { t } = useI18n()
  const [sessionId, tableUrl, codeUrl] = params
  const sessionCible = config.sessions.find((s) => s.id === sessionId) ?? session

  const [table, setTable] = useState(tableUrl ?? '')
  const [code, setCode] = useState(codeUrl ?? '')
  const [etat, setEtat] = useState(null) // null | 'cherche' | 'ok' | 'ko' | 'absent'
  const [candidat, setCandidat] = useState(null)

  const verifier = async (tableVisee = table, codeVise = code) => {
    setEtat('cherche')
    setCandidat(null)
    try {
      const plan = buildQuery(tableVisee, config.shardKeys, sessionCible.id)
      if (plan.etat !== 'pret') return setEtat('absent')
      const liste = await loadShard(plan.url)
      // Correspondance EXACTE sur le numéro de table (pas seulement un début).
      // On accepte le numéro complet ("BAC-26-00001") ou seulement sa partie
      // numérique ("00001"), mais toujours en entier.
      const saisi = normalize(tableVisee).replace(/ /g, '')
      const trouve = liste.find((c) => {
        const complet = normalize(c.tableNumber).replace(/ /g, '')
        const dernierGroupe = normalize(c.tableNumber).match(/\d+/g)?.pop()
        return complet === saisi || dernierGroupe === saisi
      })
      if (!trouve) return setEtat('absent')
      setCandidat(trouve)
      const attendu = await verificationCode(trouve)
      setEtat(attendu === codeVise.trim().toUpperCase() ? 'ok' : 'ko')
    } catch {
      setEtat('absent')
    }
  }

  // Si on arrive depuis un QR code, on vérifie tout de suite.
  useEffect(() => {
    if (tableUrl && codeUrl) verifier(tableUrl, codeUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1>{t('verify.title')}</h1>
        <p>{t('verify.intro')}</p>
      </header>

      <form
        className="panel form"
        onSubmit={(e) => {
          e.preventDefault()
          verifier()
        }}
      >
        <label>
          {t('verify.table')}
          <input value={table} onChange={(e) => setTable(e.target.value)} placeholder="BAC-26-00001" autoComplete="off" required />
        </label>
        <label>
          {t('verify.code')}
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" autoComplete="off" required maxLength={9} />
        </label>
        <button type="submit" className="btn btn--primary" disabled={etat === 'cherche'}>
          <Icon name="shield" size={16} /> {etat === 'cherche' ? t('verify.checking') : t('verify.check')}
        </button>
      </form>

      {etat && etat !== 'cherche' && (
        <div className={`verify-result verify-result--${etat}`} role="status">
          <Icon name={etat === 'ok' ? 'check' : 'alert'} size={28} />
          <div>
            <strong>
              {etat === 'ok' ? t('verify.ok') : etat === 'ko' ? t('verify.ko') : t('verify.notFound')}
            </strong>
            {etat === 'ok' && <p>{t('verify.okSub')}</p>}
            {etat === 'ko' && <p>{t('verify.koSub')}</p>}
            {candidat && etat === 'ok' && (
              <p className="verify-result__who">
                {candidat.lastName} {candidat.firstName} · {candidat.tableNumber} · {t(`status.${candidat.status}`)}
              </p>
            )}
          </div>
        </div>
      )}

      <p className="muted small"><Icon name="info" size={14} /> {t('verify.demo')}</p>
      <button type="button" className="btn btn--ghost" onClick={() => navigate('/')}>
        <Icon name="chevronL" size={16} className="flip-rtl" /> {t('verify.back')}
      </button>
    </div>
  )
}

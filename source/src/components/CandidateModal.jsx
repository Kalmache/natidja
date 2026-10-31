// ============================================================================
// CandidateModal.jsx – l'attestation de résultat (fenêtre par-dessus la page)
// ----------------------------------------------------------------------------
// Contient : le résultat, les informations du candidat, un QR code de
// vérification, et des boutons Imprimer / Partager. Si le candidat est admis,
// des confettis célèbrent la réussite.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import Flag from './Flag.jsx'
import Confetti from './Confetti.jsx'
import QrCode from './QrCode.jsx'
import { useI18n } from '../i18n/index.jsx'
import { MENTIONS, note, titleCase } from '../lib/format.js'
import { registerPlugin } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { isNativeApp, verificationCode, verificationUrl } from '../lib/verify.js'

// Module natif d'impression (voir android/.../ImpressionPlugin.java). Il n'existe
// que dans l'application Android ; sur le web on utilise window.print().
const ImpressionNative = registerPlugin('ImpressionNative')

export default function CandidateModal({ candidat, session, onClose }) {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [copie, setCopie] = useState(false)
  const boutonFermer = useRef(null)
  const statut = candidat.status

  // Calcul du code de vérification (asynchrone car il utilise la cryptographie).
  useEffect(() => {
    let actif = true
    verificationCode(candidat).then((c) => actif && setCode(c))
    return () => {
      actif = false
    }
  }, [candidat])

  // Comportements d'une fenêtre modale bien élevée :
  //  - Échap ferme ; - la page derrière ne défile plus ; - le focus clavier
  //    est placé dans la fenêtre puis rendu à l'élément précédent à la fermeture.
  useEffect(() => {
    const precedent = document.activeElement
    boutonFermer.current?.focus()
    const touche = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', touche)
    document.body.classList.add('no-scroll')
    return () => {
      window.removeEventListener('keydown', touche)
      document.body.classList.remove('no-scroll')
      precedent?.focus?.()
    }
  }, [onClose])

  const lien = code ? verificationUrl(session.id, candidat, code) : ''

  const partager = async () => {
    const texte = t('att.shareText')
    try {
      if (isNativeApp()) {
        // Application Android : le navigateur intégré n'a pas navigator.share.
        // Le module officiel Capacitor ouvre la VRAIE boîte de partage d'Android
        // (WhatsApp, SMS, e-mail, Telegram...).
        await Share.share({ title: t('app.name'), text: texte, url: lien, dialogTitle: t('att.share') })
      } else if (navigator.share) {
        // Navigateur de téléphone : menu de partage du système.
        await navigator.share({ title: t('app.name'), text: texte, url: lien })
      } else {
        await navigator.clipboard.writeText(lien)
        setCopie(true)
        setTimeout(() => setCopie(false), 2500)
      }
    } catch {
      /* partage annulé par l'utilisateur : rien à faire */
    }
  }

  const imprimer = async () => {
    try {
      if (isNativeApp()) await ImpressionNative.imprimer({ nom: `Attestation ${candidat.tableNumber}` })
      else window.print()
    } catch {
      /* impression annulée ou indisponible : rien à faire */
    }
  }

  const prenom = titleCase(candidat.firstName)
  const titres = {
    ADMIS: [t('att.admis'), t('att.admisSub')],
    SECOND_GROUPE: [t('att.second'), t('att.secondSub')],
    AJOURNE: [t('att.ajourne'), t('att.ajourneSub')],
  }[statut]

  const details = [
    [t('att.table'), candidat.tableNumber],
    [t('att.series'), candidat.series],
    [t('att.birth'), candidat.birthPlace],
    [t('att.island'), candidat.island],
    [t('att.school'), candidat.school],
    [t('att.center'), candidat.center],
  ].filter(([, valeur]) => valeur)

  // createPortal : la fenêtre est dessinée à la racine de <body>, ce qui
  // simplifie l'impression (on masque tout sauf elle) et évite les soucis de
  // superposition avec le reste de la page.
  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label={t('att.title')}>
      <div className="modal__backdrop" onClick={onClose} />
      {statut === 'ADMIS' && <Confetti intensite={candidat.mention === 'TRES_BIEN' ? 1.6 : 1} />}

      <div className="modal__panel">
        <div className="modal__bar no-print">
          {/* Application : impression Android (avec « Enregistrer en PDF »).
              Web : fenêtre d'impression du navigateur. */}
          <button type="button" className="btn btn--ghost" onClick={imprimer}>
            <Icon name="print" size={16} /> {t('att.print')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={partager} disabled={!lien}>
            <Icon name={copie ? 'check' : 'share'} size={16} />
            {copie ? t('att.copied') : t('att.share')}
          </button>
          <button
            type="button"
            ref={boutonFermer}
            className="btn btn--icon"
            onClick={onClose}
            aria-label={t('att.close')}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* ----- La feuille elle-même (c'est elle qui s'imprime) ----- */}
        <article className="sheet">
          <p className="sheet__watermark" aria-hidden="true">
            {t('att.watermark')}
          </p>

          <header className="sheet__head">
            <Flag className="sheet__flag" />
            <div>
              <p>{t('att.republic')}</p>
              <p>{t('att.ministry')}</p>
              <p className="sheet__office">{t('att.office')}</p>
            </div>
          </header>

          <h2 className="sheet__title">{t('att.title')}</h2>
          <p className="sheet__exam">
            {session.title} · {session.sessionDate}
          </p>

          <div className={`verdict verdict--${statut}`}>
            <div className="verdict__title">{titres[0]}</div>
            <div className="verdict__sub">{titres[1]}</div>
            {typeof candidat.average === 'number' && (
              <div className="verdict__avg">
                <span>{t('att.average')}</span>
                <strong>{note(candidat.average)}</strong>
                <span>/ 20</span>
                {candidat.mention && MENTIONS[candidat.mention] && (
                  <em>
                    {t('att.mention')} : {t(`mention.${candidat.mention}`)}
                  </em>
                )}
              </div>
            )}
          </div>

          {statut === 'ADMIS' && (
            <p className="congrats">{t('att.congrats', { name: prenom })}</p>
          )}

          <h3 className="sheet__name">
            {candidat.lastName} {prenom}
          </h3>

          <dl className="details">
            {details.map(([nom, valeur]) => (
              <div key={nom}>
                <dt>{nom}</dt>
                <dd>{valeur}</dd>
              </div>
            ))}
          </dl>

          {candidat.grades?.length > 0 && (
            <section className="grades">
              <h4>{t('att.grades')}</h4>
              {candidat.grades.map((g) => (
                <div key={g.subject} className="grade">
                  <span>
                    {g.subject} <small>({t('att.coef')} {g.coef})</small>
                  </span>
                  <strong className={g.score >= 10 ? 'ok' : 'ko'}>{note(g.score)}</strong>
                  <i style={{ '--w': `${Math.min(100, (g.score / 20) * 100)}%` }} />
                </div>
              ))}
            </section>
          )}

          <footer className="sheet__foot">
            <div className="sheet__qr">
              {lien ? <QrCode text={lien} size={104} label={t('att.scan')} /> : <div className="qr-skel" />}
              <div>
                <p className="muted">{t('att.scan')}</p>
                <p className="sheet__code">
                  {t('att.code')} : <strong>{code || '····-····'}</strong>
                </p>
              </div>
            </div>
            <div className="sheet__sign">
              <p>{t('att.signed', { year: session.year })}</p>
              <p className="muted">{t('att.jury')}</p>
              <div className="sheet__stamp" aria-hidden="true" />
            </div>
          </footer>
        </article>
      </div>
    </div>,
    document.body,
  )
}

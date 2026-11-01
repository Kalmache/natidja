// ============================================================================
// CandidateModal.jsx – l'attestation de résultat (fenêtre par-dessus la page)
// ----------------------------------------------------------------------------
// Contient : le résultat, les informations du candidat, un QR code de
// vérification, et des boutons Imprimer / Partager. Si le candidat est admis,
// des confettis célèbrent la réussite.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import Flag from './Flag.jsx'
import Confetti from './Confetti.jsx'
import Ballons from './Ballons.jsx'
import QrCode from './QrCode.jsx'
import { useI18n } from '../i18n/index.jsx'
import { MENTIONS, dateNaissance, note, titleCase } from '../lib/format.js'
import { registerPlugin } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { creerCarteReussite } from '../lib/carteReussite.js'
import { isNativeApp, verificationCode, verificationUrl } from '../lib/verify.js'
import { identiteCorrespond } from '../lib/identite.js'
import { demanderAttestation } from '../lib/attestationService.js'

// Module natif d'impression (voir android/.../ImpressionPlugin.java). Il n'existe
// que dans l'application Android ; sur le web on utilise window.print().
const ImpressionNative = registerPlugin('ImpressionNative')

/**
 * Vérification d'identité AVANT d'afficher l'attestation (moyenne, date de naissance...).
 * La personne saisit son numéro de table ET sa date de naissance : les informations qu'elle est
 * seule, avec l'administration, à connaître ensemble.
 *
 * ⚠️ Étape 1 (démonstration) : la comparaison se fait sur l'appareil, donc c'est une protection
 * d'AFFICHAGE : les fichiers publiés contiennent encore ces détails. La protection réelle suppose
 * que la comparaison se fasse sur un serveur (voir docs/CONFIDENTIALITE.md).
 */
function VerificationIdentite({ candidat, session, service, demo, onValide, onClose }) {
  const { t } = useI18n()
  const [numero, setNumero] = useState('')
  const [naissance, setNaissance] = useState('')
  const [erreur, setErreur] = useState(false)
  const [essais, setEssais] = useState(0)
  const [bloque, setBloque] = useState(false)
  const [message, setMessage] = useState('') // 'locked' | 'unavailable' | ''
  const [enCours, setEnCours] = useState(false)

  // MODE DÉMONSTRATION : les données sont fictives, donc on peut proposer de remplir le formulaire à la place
  // du visiteur (utile pour montrer l'attestation sans connaître le numéro ni la date). Le bouton n'existe
  // QUE si exams.json contient "demo": true ; avec de vraies données il disparaît.
  const remplirDemo = () => {
    const [a, m, j] = String(candidat.birthDate ?? '').split('-')
    setNumero(candidat.tableNumber)
    setNaissance(j ? `${j}/${m}/${a}` : '')
    setErreur(false)
  }

  const verifier = async (e) => {
    e.preventDefault()
    if (bloque || enCours) return
    setMessage('')
    if (service) {
      // Protection RÉELLE : c'est le serveur qui compare ; la moyenne et la date n'existent pas dans les fichiers publics.
      setEnCours(true)
      const r = await demanderAttestation(service, session.id, numero, naissance)
      setEnCours(false)
      if (r.etat === 'ok') return onValide(r.details)
      if (r.etat === 'indisponible') return setMessage('unavailable')
      if (r.etat === 'limite') {
        setBloque(true)
        setMessage('locked')
        setTimeout(() => setBloque(false), Math.min(r.attenteS, 60) * 1000)
        return
      }
      return setErreur(true)
    }
    if (identiteCorrespond(candidat, numero, naissance)) return onValide()
    setErreur(true)
    if (essais + 1 >= 5) {
      // Trop d'essais : courte pause (freine les essais au hasard).
      setBloque(true)
      setTimeout(() => { setBloque(false); setEssais(0) }, 20_000)
    } else setEssais(essais + 1)
  }

  return (
    <form className="gate" onSubmit={verifier}>
      <button type="button" className="btn btn--icon gate__close" onClick={onClose} aria-label={t('att.close')}>
        <Icon name="close" size={18} />
      </button>
      <span className="gate__lock" aria-hidden="true"><Icon name="lock" size={28} /></span>
      <h2>{t('id.title')}</h2>
      <p className="gate__who">{candidat.lastName} {titleCase(candidat.firstName)}</p>
      <p className="gate__intro">{t('id.intro')}</p>
      <label>
        <span>{t('id.table')}</span>
        <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder={t('id.tablePh')} autoComplete="off" autoCapitalize="characters" spellCheck="false" autoFocus required />
      </label>
      <label>
        <span>{t('id.birth')}</span>
        <input type="text" inputMode="numeric" value={naissance} onChange={(e) => setNaissance(e.target.value)} placeholder={t('id.birthPh')} autoComplete="off" required />
      </label>
      {message === 'unavailable' && <p className="gate__error" role="alert">{t('id.unavailable')}</p>}
      {message !== 'unavailable' && erreur && <p className="gate__error" role="alert">{bloque ? t('id.locked') : t('id.error')}</p>}
      {demo && candidat.birthDate && (
        <button type="button" className="btn btn--ghost gate__demo" onClick={remplirDemo}>{t('id.demoFill')}</button>
      )}
      <button type="submit" className="btn btn--primary" disabled={bloque || enCours}>{t('id.submit')}</button>
    </form>
  )
}

export default function CandidateModal({ candidat: candidatPublic, session, service, demo, onClose }) {
  const { t } = useI18n()
  const [sensibles, setSensibles] = useState(null) // détails sensibles reçus du service d'attestation (s'il est activé)
  const candidat = useMemo(() => (sensibles ? { ...candidatPublic, ...sensibles } : candidatPublic), [candidatPublic, sensibles])
  const [code, setCode] = useState('')
  const [copie, setCopie] = useState(false)
  const boutonFermer = useRef(null)
  const [identifie, setIdentifie] = useState(false) // vrai une fois l'identité confirmée
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

  /**
   * « Partager ma réussite » : une image sobre (nom, Admis(e), mention, établissement) à poster
   * sur les réseaux, à la place d'une capture de l'attestation qui montre numéro et date de naissance.
   */
  const [carteEnCours, setCarteEnCours] = useState(false)
  const partagerCarte = async () => {
    setCarteEnCours(true)
    try {
      const blob = await creerCarteReussite({ candidat, session, textes: { admis: t('att.admisCarte'), mention: t('att.mention') } })
      const titre = t('app.name')
      const texte = t('att.shareCard')
      const fichier = new File([blob], 'ma-reussite.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: titre, text: texte }) // navigateur de téléphone
      } else if (isNativeApp()) {
        // Application Android : on écrit l'image dans le cache, puis on ouvre la boîte de partage d'Android.
        const base64 = await new Promise((ok, ko) => {
          const lecteur = new FileReader()
          lecteur.onload = () => ok(String(lecteur.result).split(',')[1])
          lecteur.onerror = ko
          lecteur.readAsDataURL(blob)
        })
        const { uri } = await Filesystem.writeFile({ path: 'ma-reussite.png', data: base64, directory: Directory.Cache })
        await Share.share({ title: titre, text: texte, files: [uri], dialogTitle: t('att.shareCardBtn') })
      } else {
        // Ordinateur : on télécharge l'image.
        const adresse = URL.createObjectURL(blob)
        const a = Object.assign(document.createElement('a'), { href: adresse, download: 'ma-reussite.png' })
        a.click()
        setTimeout(() => URL.revokeObjectURL(adresse), 4000)
      }
    } catch {
      /* partage annulé : rien à faire */
    } finally {
      setCarteEnCours(false)
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
    [t('att.birthDate'), dateNaissance(candidat.birthDate)],
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
      {identifie && statut === 'ADMIS' && (
        <>
          <Confetti intensite={candidat.mention === 'TRES_BIEN' ? 1.6 : 1} />
          <Ballons nombre={candidat.mention === 'TRES_BIEN' ? 20 : 14} />
        </>
      )}

      <div className="modal__panel">
        {!identifie ? (
          <VerificationIdentite candidat={candidat} session={session} service={service} demo={demo} onValide={(d) => { if (d) setSensibles(d); setIdentifie(true) }} onClose={onClose} />
        ) : (
        <>
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
          {statut === 'ADMIS' && (
            <button type="button" className="btn btn--ghost" onClick={partagerCarte} disabled={carteEnCours}>
              <Icon name="share" size={16} /> {t('att.shareCardBtn')}
            </button>
          )}
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
        <article className={`sheet${statut === 'ADMIS' ? ' sheet--fete' : ''}`}>
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
        </>
        )}
      </div>
    </div>,
    document.body,
  )
}

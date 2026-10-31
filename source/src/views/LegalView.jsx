// ============================================================================
// LegalView.jsx – pages légales : Mentions, Confidentialité, Conditions,
// Licence (page « certificat ») et Journal de bord (frise des versions).
// Les textes juridiques sont en français ; seuls les titres sont traduits.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Signature from '../components/Signature.jsx'
import { useI18n } from '../i18n/index.jsx'
import { EDITOR, VERSION } from '../legal/config.js'
import { JOURNAL } from '../legal/journal.js'
import { LICENCE_REGLES, MENTIONS, PRIVACY, TERMS } from '../legal/pages.js'
import { redigerDemandeAutorisation, TYPES_DEMANDE } from '../legal/autorisation.js'

export const PAGES_LEGALES = ['mentions', 'privacy', 'terms', 'licence', 'journal']
const BLOCS = { mentions: MENTIONS, privacy: PRIVACY, terms: TERMS }

/** Affiche une liste de blocs {h} / {p} / {ul}. */
function Blocs({ blocs }) {
  return blocs.map((b, i) =>
    b.h ? <h2 key={i}>{b.h}</h2> : b.small ? <p key={i} className="legal__meta">{b.small}</p> : b.p ? <p key={i}>{b.p}</p> : <ul key={i}>{b.ul.map((x) => <li key={x}>{x}</li>)}</ul>,
  )
}

/**
 * Formulaire « Demander une autorisation » : l'e-mail se rédige TOUT SEUL pendant qu'on
 * remplit les champs ; un bouton l'ouvre dans la messagerie, prêt à être envoyé.
 * Rien n'est transmis par le site lui-même.
 */
function DemandeAutorisation() {
  const [champs, setChamps] = useState({ type: 'usage', organisme: '', nom: '', fonction: '', precisions: '' })
  const [copie, setCopie] = useState(false)
  const maj = (cle) => (e) => setChamps((c) => ({ ...c, [cle]: e.target.value }))
  // L'e-mail est recalculé à chaque frappe (la date, elle, est celle du jour).
  const mail = useMemo(() => redigerDemandeAutorisation({ ...champs, version: VERSION }), [champs])

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(`Objet : ${mail.objet}\n\n${mail.corps}`)
      setCopie(true)
      setTimeout(() => setCopie(false), 2500)
    } catch {
      /* presse-papiers indisponible : la personne peut sélectionner le texte à la main */
    }
  }

  return (
    <section className="autorisation" lang="fr" aria-labelledby="titre-autorisation">
      <h2 id="titre-autorisation">Demander une autorisation</h2>
      <p>
        Tout usage de l’application au-delà de la simple consultation exige une autorisation écrite de son auteur.
        Remplissez les champs : l’e-mail se rédige tout seul, puis s’ouvre dans votre messagerie, prêt à être envoyé.
        Ce site ne transmet rien : l’envoi se fait de votre propre initiative, depuis votre messagerie.
      </p>

      <div className="autorisation__champs">
        <label>
          <span>Nature de la demande</span>
          <select value={champs.type} onChange={maj('type')}>
            {Object.entries(TYPES_DEMANDE).map(([id, [libelle]]) => <option key={id} value={id}>{libelle}</option>)}
          </select>
        </label>
        <label>
          <span>Organisme</span>
          <input type="text" value={champs.organisme} onChange={maj('organisme')} maxLength={120} placeholder="Ex. Ministère de l’Éducation Nationale" autoComplete="organization" />
        </label>
        <label>
          <span>Nom et prénom</span>
          <input type="text" value={champs.nom} onChange={maj('nom')} maxLength={100} autoComplete="name" />
        </label>
        <label>
          <span>Fonction</span>
          <input type="text" value={champs.fonction} onChange={maj('fonction')} maxLength={100} autoComplete="organization-title" />
        </label>
        <label className="autorisation__large">
          <span>Précisions (objet, durée, public concerné)</span>
          <textarea value={champs.precisions} onChange={maj('precisions')} maxLength={1200} rows={4} />
        </label>
      </div>

      <h3>Votre e-mail (rédigé automatiquement)</h3>
      <div className="autorisation__apercu" aria-live="polite">
        <p className="autorisation__objet"><strong>À :</strong> {EDITOR.email}<br /><strong>Objet :</strong> {mail.objet}</p>
        <p className="autorisation__corps">{mail.corps}</p>
      </div>

      <div className="autorisation__actions">
        <a className="btn btn--primary" href={mail.lien}>
          <Icon name="share" size={16} /> Ouvrir dans ma messagerie
        </a>
        <button type="button" className="btn btn--ghost" onClick={copier}>
          <Icon name={copie ? 'check' : 'print'} size={16} /> {copie ? 'Texte copié !' : 'Copier le texte'}
        </button>
      </div>
      <p className="legal__meta">Pas de messagerie configurée sur cet appareil ? Copiez le texte et envoyez-le à {EDITOR.email} depuis le service de votre choix.</p>
    </section>
  )
}

/** Page Licence : un « certificat » avec la signature en vedette. */
function Licence() {
  const { t } = useI18n()
  return (
    <>
      <div className="certificate">
        <div className="certificate__shine" aria-hidden="true" />
        <p className="certificate__eyebrow">{t('legal.certificate')}</p>
        <h2 className="certificate__title">Ndeze Natidja</h2>
        <div className="certificate__sign"><Signature size="lg" link /></div>
        <p className="certificate__protected">{t('legal.protected')}</p>
        <p className="certificate__rights">
          © {EDITOR.year} {EDITOR.name} · {t('legal.rights')}
        </p>
        <p className="certificate__version">v{VERSION}</p>
      </div>
      <div className="legal__text" lang="fr"><Blocs blocs={LICENCE_REGLES} /></div>
      <DemandeAutorisation />
      <p className="legal__text legal__notice" lang="fr">
        <a href="./licences-tierces.txt" target="_blank" rel="noopener noreferrer">licences-tierces.txt</a>
      </p>
    </>
  )
}

/** Journal de bord : une frise verticale des versions. */
function Journal() {
  return (
    <ol className="timeline" lang="fr">
      {JOURNAL.map((v, i) => (
        <li key={v.version} style={{ '--delay': `${i * 70}ms` }}>
          <span className="timeline__dot" aria-hidden="true" />
          <div className="timeline__head">
            <span className="chip chip--mono">{/^\d/.test(v.version) ? `v${v.version}` : v.version}</span>
            <time>{v.date}</time>
          </div>
          <h3>{v.titre}</h3>
          <ul>{v.points.map((p) => <li key={p}>{p}</li>)}</ul>
        </li>
      ))}
    </ol>
  )
}

export default function LegalView({ page }) {
  const { t } = useI18n()
  const actif = PAGES_LEGALES.includes(page) ? page : 'mentions'
  // Sur téléphone la barre des pages légales défile : on garde la page active visible
  // (utile quand on change de page en glissant).
  useEffect(() => {
    document.querySelector('.legal__nav a.is-active')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [actif])
  return (
    <div className="page legal">
      <header className="page__head">
        <h1>{t(`legal.${actif}`)}</h1>
      </header>
      <div className="legal__layout">
        <nav className="legal__nav" aria-label="Pages légales">
          {PAGES_LEGALES.map((p) => (
            <a key={p} href={`#/legal/${p}`} className={p === actif ? 'is-active' : ''} aria-current={p === actif ? 'page' : undefined}>
              <Icon name={p === 'journal' ? 'list' : p === 'licence' ? 'shield' : 'info'} size={16} /> {t(`legal.${p}`)}
            </a>
          ))}
        </nav>
        <div className="panel legal__content">
          {actif === 'licence' ? <Licence /> : actif === 'journal' ? <Journal /> : <div className="legal__text" lang="fr"><Blocs blocs={BLOCS[actif]} /></div>}
        </div>
      </div>
    </div>
  )
}

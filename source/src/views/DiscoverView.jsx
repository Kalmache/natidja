// ============================================================================
// DiscoverView.jsx – « Découvrir » : la page vitrine, dans l'esprit des pages produit d'Apple
// ----------------------------------------------------------------------------
// Pensée pour impressionner (autorités, décideurs) : un grand titre, un téléphone qui montre
// l'application en action, des chiffres qui comptent à l'écran, un récit qui se déroule en défilant.
//
// Règles de conception :
//   • 100 % CSS + un peu de JavaScript : aucune image, aucune bibliothèque → page légère,
//     chargée À LA DEMANDE (la page d'accueil, elle, n'en paie pas le prix) ;
//   • toutes les animations s'arrêtent si l'appareil demande « moins d'animations » ;
//   • tous les chiffres affichés sont des mesures réelles (voir docs/CHARGE-ET-HEBERGEMENT.md) :
//     rien d'inventé, et les limites sont écrites noir sur blanc.
// ============================================================================
import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/index.jsx'
import Flag from '../components/Flag.jsx'
import Icon from '../components/Icon.jsx'
import Signature from '../components/Signature.jsx'
import { navigate, prefersReducedMotion, useCountUp } from '../hooks.js'
import { VERSION } from '../legal/config.js'
import { redigerDemandeDemonstration } from '../legal/autorisation.js'
import '../styles/decouvrir.css'

/** Fait apparaître son contenu en douceur quand il entre à l'écran (une seule fois). */
function Reveal({ children, delay = 0, as: Balise = 'div', className = '', ...reste }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      el.classList.add('is-vu')
      return undefined
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-vu')
          obs.disconnect()
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -6% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <Balise ref={ref} className={`d-reveal ${className}`} style={{ '--d': `${delay}ms` }} {...reste}>
      {children}
    </Balise>
  )
}

/** Un grand chiffre qui monte de 0 à sa valeur quand il apparaît. */
function GrandChiffre({ valeur, decimales = 0, suffixe = '', legende, delai = 0 }) {
  const [affiche, ref] = useCountUp(valeur, 1700)
  const texte = decimales ? affiche.toFixed(decimales).replace('.', ',') : Math.round(affiche).toLocaleString('fr-FR')
  return (
    <Reveal delay={delai} className="d-chiffre">
      <div className="d-chiffre__valeur" ref={ref}>
        {texte}
        {suffixe && <small>{suffixe}</small>}
      </div>
      <p>{legende}</p>
    </Reveal>
  )
}

/** Le téléphone : l'application « en vrai », qui tape une recherche puis affiche un résultat. */
function Telephone({ t }) {
  return (
    <div className="d-phone" aria-hidden="true">
      <div className="d-puce d-puce--a"><Icon name="download" size={14} /> {t('d.puceA')}</div>
      <div className="d-puce d-puce--b"><Icon name="check" size={14} /> {t('d.puceB')}</div>
      <div className="d-puce d-puce--c">FR · عربي</div>
      <div className="d-phone__cadre">
        <div className="d-phone__encoche" />
        <div className="d-phone__ecran">
          <div className="d-app__entete"><Flag className="d-app__drapeau" /><b>Ndeze Natidja</b><i className="d-app__live" /></div>
          <div className="d-app__hero">
            <small>{t('d.phoneSession')}</small>
            <strong>{t('d.phoneTitle')}</strong>
            <div className="d-app__recherche">
              <Icon name="search" size={14} />
              <span className="d-app__saisie">maabadi ben</span>
              <i className="d-app__curseur" />
            </div>
          </div>
          <div className="d-app__carte">
            <div className="d-app__nom"><b>MAABADI</b> Ben Tamou</div>
            <span className="d-app__badge"><i /> {t('d.phoneAdmis')}</span>
            <small>Groupe Scolaire Avenir (Moroni)</small>
            <span className="d-app__icone"><Icon name="check" size={18} /></span>
          </div>
          <div className="d-app__barres"><i style={{ '--h': '34%' }} /><i style={{ '--h': '58%' }} /><i style={{ '--h': '44%' }} /><i style={{ '--h': '76%' }} /><i style={{ '--h': '62%' }} /></div>
        </div>
      </div>
    </div>
  )
}

export default function DiscoverView() {
  const { t, lang } = useI18n()
  const demo = redigerDemandeDemonstration({ version: VERSION })
  const versChiffres = () => document.getElementById('d-chiffres')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })

  return (
    <div className="decouvrir" lang={lang}>
      {/* ===================== HÉROS ===================== */}
      <section className="d-hero">
        <div className="d-orbe d-orbe--1" aria-hidden="true" />
        <div className="d-orbe d-orbe--2" aria-hidden="true" />
        <div className="d-orbe d-orbe--3" aria-hidden="true" />
        <div className="d-hero__texte">
          <Reveal className="d-surtitre"><Flag className="d-surtitre__drapeau" /> {t('d.surtitre')}</Reveal>
          <Reveal as="h1" delay={120} className="d-titre">
            {t('d.hero1')}<br />
            <span className="d-degrade">{t('d.hero2')}</span>
          </Reveal>
          <Reveal as="p" delay={260} className="d-chapo">
            {t('d.chapo')}
          </Reveal>
          <Reveal delay={400} className="d-actions">
            <button type="button" className="d-bouton d-bouton--plein" onClick={() => navigate('/')}>
              <Icon name="search" size={18} /> {t('d.btnSearch')}
            </button>
            <button type="button" className="d-bouton d-bouton--vide" onClick={versChiffres}>
              {t('d.btnHow')} <Icon name="chevronR" size={16} className="flip-rtl d-bas" />
            </button>
          </Reveal>
          <Reveal delay={520} className="d-mini">{t('d.mini')}</Reveal>
        </div>
        <Reveal delay={300} className="d-hero__visuel"><Telephone t={t} /></Reveal>
        <div className="d-defile" aria-hidden="true"><i /></div>
      </section>

      {/* ===================== LES CHIFFRES ===================== */}
      <section className="d-section d-section--chiffres" id="d-chiffres">
        <Reveal as="h2" className="d-h2">{t('d.chT1')} <span className="d-degrade">{t('d.chT2')}</span></Reveal>
        <div className="d-chiffres">
          <GrandChiffre valeur={4.2} decimales={1} suffixe={t('d.unit')} legende={t('d.ch1')} delai={0} />
          <GrandChiffre valeur={12} suffixe={t('d.unit')} legende={t('d.ch2')} delai={120} />
          <GrandChiffre valeur={1500} suffixe="*" legende={t('d.ch3')} delai={240} />
          <GrandChiffre valeur={0} legende={t('d.ch4')} delai={360} />
        </div>
        <Reveal as="p" className="d-note">
          {t('d.chNote')}
        </Reveal>
      </section>

      {/* ===================== INSTANTANÉ ===================== */}
      <section className="d-section d-bloc">
        <Reveal className="d-bloc__texte">
          <p className="d-kicker">{t('d.k1')}</p>
          <h2 className="d-h2">{t('d.i1')} <span className="d-degrade">{t('d.i2')}</span></h2>
          <p>{t('d.ip')}</p>
        </Reveal>
        <Reveal delay={150} className="d-bloc__visuel">
          <div className="d-pulse" aria-hidden="true"><i /><i /><i /><b>{t('d.puceA').split(' ').slice(0, 2).join(' ')}</b></div>
        </Reveal>
      </section>

      {/* ===================== HORS-LIGNE ===================== */}
      <section className="d-section d-bloc d-bloc--inverse">
        <Reveal className="d-bloc__texte">
          <p className="d-kicker">{t('d.k2')}</p>
          <h2 className="d-h2">{t('d.o1')} <span className="d-degrade">{t('d.o2')}</span></h2>
          <p>{t('d.op')}</p>
        </Reveal>
        <Reveal delay={150} className="d-bloc__visuel">
          <div className="d-signal" aria-hidden="true">
            <div className="d-signal__barres"><i /><i /><i /><i /></div>
            <div className="d-signal__etat"><span className="d-signal__hors"><Icon name="alert" size={16} /> {t('d.noNet')}</span><span className="d-signal__ok"><Icon name="check" size={16} /> {t('d.available')}</span></div>
          </div>
        </Reveal>
      </section>

      {/* ===================== SÉCURITÉ ===================== */}
      <section className="d-section d-bloc">
        <Reveal className="d-bloc__texte">
          <p className="d-kicker">{t('d.k3')}</p>
          <h2 className="d-h2">{t('d.s1')} <span className="d-degrade">{t('d.s2')}</span></h2>
          <p>{t('d.sp')}</p>
          <p className="d-petit">{t('d.sSmall')}</p>
        </Reveal>
        <Reveal delay={150} className="d-bloc__visuel">
          <div className="d-cles" aria-hidden="true">
            <div className="d-cle d-cle--1"><Icon name="lock" size={22} /><span>{t('d.keyPrep')}</span></div>
            <div className="d-cle__lien"><i /></div>
            <div className="d-cle d-cle--2"><Icon name="shield" size={22} /><span>{t('d.keyAppr')}</span></div>
            <div className="d-cles__resultat"><Icon name="check" size={18} /> {t('d.published')}</div>
          </div>
        </Reveal>
      </section>

      {/* ===================== VIE PRIVÉE ===================== */}
      <section className="d-section d-bloc d-bloc--inverse">
        <Reveal className="d-bloc__texte">
          <p className="d-kicker">{t('d.k4')}</p>
          <h2 className="d-h2">{t('d.v1')} <span className="d-degrade">{t('d.v2')}</span></h2>
          <p>{t('d.vp')}</p>
        </Reveal>
        <Reveal delay={150} className="d-bloc__visuel">
          <div className="d-confid" aria-hidden="true">
            <div className="d-confid__carte d-confid__carte--flou"><b>••••••••</b><span>•• / •• / ••••</span></div>
            <div className="d-confid__cadenas"><Icon name="lock" size={26} /></div>
            <div className="d-confid__carte d-confid__carte--net"><b>{t('d.phoneCard')}</b><span>{t('d.phoneMention')}</span></div>
          </div>
        </Reveal>
      </section>

      {/* ===================== POUR TOUS ===================== */}
      <section className="d-section d-bloc">
        <Reveal className="d-bloc__texte">
          <p className="d-kicker">{t('d.k5')}</p>
          <h2 className="d-h2">{t('d.p1')} <span className="d-degrade">{t('d.p2')}</span></h2>
          <p>{t('d.pp')}</p>
        </Reveal>
        <Reveal delay={150} className="d-bloc__visuel">
          <div className="d-palettes" aria-hidden="true">
            <span style={{ '--c': '#059669' }} /><span style={{ '--c': '#2563eb' }} /><span style={{ '--c': '#d97706' }} /><span style={{ '--c': '#e11d48' }} />
            <p><b>FR</b> · <b>عربي</b></p>
          </div>
        </Reveal>
      </section>

      {/* ===================== COMMENT ÇA MARCHE ===================== */}
      <section className="d-section d-section--etapes">
        <Reveal as="h2" className="d-h2 d-centre">{t('d.e1')} <span className="d-degrade">{t('d.e2')}</span></Reveal>
        <ol className="d-etapes">
          {[
            ['1', t('d.st1t'), t('d.st1p')],
            ['2', t('d.st2t'), t('d.st2p')],
            ['3', t('d.st3t'), t('d.st3p')],
          ].map(([n, titre, texte], i) => (
            <Reveal as="li" key={n} delay={i * 160} className="d-etape">
              <span className="d-etape__n">{n}</span>
              <h3>{titre}</h3>
              <p>{texte}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ===================== APPEL FINAL ===================== */}
      <section className="d-section d-final">
        <div className="d-orbe d-orbe--4" aria-hidden="true" />
        <Reveal as="h2" className="d-titre d-titre--moyen d-centre">{t('d.f1')} <span className="d-degrade">{t('d.f2')}</span></Reveal>
        <Reveal as="p" delay={120} className="d-chapo d-centre">{t('d.fp')}</Reveal>
        <Reveal delay={240} className="d-actions d-actions--centre">
          <button type="button" className="d-bouton d-bouton--plein" onClick={() => navigate('/')}><Icon name="search" size={18} /> {t('d.btnSearch')}</button>
          <a className="d-bouton d-bouton--vide" href={demo.lien}><Icon name="share" size={18} /> {t('d.btnDemo')}</a>
        </Reveal>
        <Reveal delay={360} className="d-signature">
          <Signature size="lg" link />
          <p>{t('d.sig')}</p>
        </Reveal>
      </section>
    </div>
  )
}

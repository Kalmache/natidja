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
function Telephone() {
  return (
    <div className="d-phone" aria-hidden="true">
      <div className="d-puce d-puce--a"><Icon name="download" size={14} /> 4,2 Ko par recherche</div>
      <div className="d-puce d-puce--b"><Icon name="check" size={14} /> Fonctionne hors-ligne</div>
      <div className="d-puce d-puce--c">FR · عربي</div>
      <div className="d-phone__cadre">
        <div className="d-phone__encoche" />
        <div className="d-phone__ecran">
          <div className="d-app__entete"><Flag className="d-app__drapeau" /><b>Ndeze Natidja</b><i className="d-app__live" /></div>
          <div className="d-app__hero">
            <small>SESSION JUIN 2026</small>
            <strong>Découvrez votre résultat</strong>
            <div className="d-app__recherche">
              <Icon name="search" size={14} />
              <span className="d-app__saisie">maabadi ben</span>
              <i className="d-app__curseur" />
            </div>
          </div>
          <div className="d-app__carte">
            <div className="d-app__nom"><b>MAABADI</b> Ben Tamou</div>
            <span className="d-app__badge"><i /> Admis(e)</span>
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
  const demo = redigerDemandeDemonstration({ version: VERSION })
  const versChiffres = () => document.getElementById('d-chiffres')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })

  return (
    <div className="decouvrir" lang="fr">
      {/* ===================== HÉROS ===================== */}
      <section className="d-hero">
        <div className="d-orbe d-orbe--1" aria-hidden="true" />
        <div className="d-orbe d-orbe--2" aria-hidden="true" />
        <div className="d-orbe d-orbe--3" aria-hidden="true" />
        <div className="d-hero__texte">
          <Reveal className="d-surtitre"><Flag className="d-surtitre__drapeau" /> Résultats des examens · Union des Comores</Reveal>
          <Reveal as="h1" delay={120} className="d-titre">
            Vos résultats.<br />
            <span className="d-degrade">Sans attendre.</span>
          </Reveal>
          <Reveal as="p" delay={260} className="d-chapo">
            Le jour des résultats, tout un pays cherche en même temps. Ndeze Natidja répond en un instant, même sur une connexion fragile.
          </Reveal>
          <Reveal delay={400} className="d-actions">
            <button type="button" className="d-bouton d-bouton--plein" onClick={() => navigate('/')}>
              <Icon name="search" size={18} /> Chercher un résultat
            </button>
            <button type="button" className="d-bouton d-bouton--vide" onClick={versChiffres}>
              Voir comment ça marche <Icon name="chevronR" size={16} className="flip-rtl d-bas" />
            </button>
          </Reveal>
          <Reveal delay={520} className="d-mini">Baccalauréat · BEPC · Français et arabe · Application Android</Reveal>
        </div>
        <Reveal delay={300} className="d-hero__visuel"><Telephone /></Reveal>
        <div className="d-defile" aria-hidden="true"><i /></div>
      </section>

      {/* ===================== LES CHIFFRES ===================== */}
      <section className="d-section d-section--chiffres" id="d-chiffres">
        <Reveal as="h2" className="d-h2">Des chiffres, <span className="d-degrade">pas des promesses.</span></Reveal>
        <div className="d-chiffres">
          <GrandChiffre valeur={4.2} decimales={1} suffixe=" Ko" legende="pour une recherche (moyenne mesurée)" delai={0} />
          <GrandChiffre valeur={12} suffixe=" Ko" legende="pour chaque visite suivante, une fois l'application installée" delai={120} />
          <GrandChiffre valeur={1500} suffixe="*" legende="visiteurs simultanés, sans la moindre erreur" delai={240} />
          <GrandChiffre valeur={0} legende="base de données à attaquer" delai={360} />
        </div>
        <Reveal as="p" className="d-note">
          * Test de charge réalisé en local avec les outils du projet. La capacité de l'hébergement final se mesure lors de l'essai sur le serveur réel.
        </Reveal>
      </section>

      {/* ===================== INSTANTANÉ ===================== */}
      <section className="d-section d-bloc">
        <Reveal className="d-bloc__texte">
          <p className="d-kicker">Instantané</p>
          <h2 className="d-h2">Un petit fichier. <span className="d-degrade">Pas un serveur qui travaille.</span></h2>
          <p>Les résultats sont découpés à l'avance en petits fichiers. Une recherche télécharge uniquement le bon, et la comparaison se fait dans le téléphone. Rien à calculer côté serveur : pas de file d'attente, pas de page qui ne charge plus le jour J.</p>
        </Reveal>
        <Reveal delay={150} className="d-bloc__visuel">
          <div className="d-pulse" aria-hidden="true"><i /><i /><i /><b>4,2 Ko</b></div>
        </Reveal>
      </section>

      {/* ===================== HORS-LIGNE ===================== */}
      <section className="d-section d-bloc d-bloc--inverse">
        <Reveal className="d-bloc__texte">
          <p className="d-kicker">Hors-ligne</p>
          <h2 className="d-h2">Le réseau disparaît. <span className="d-degrade">Pas votre résultat.</span></h2>
          <p>L'application garde en mémoire ce que vous avez consulté. Elle s'ouvre et affiche vos résultats même quand la connexion tombe : dans le taxi-brousse comme à la maison.</p>
        </Reveal>
        <Reveal delay={150} className="d-bloc__visuel">
          <div className="d-signal" aria-hidden="true">
            <div className="d-signal__barres"><i /><i /><i /><i /></div>
            <div className="d-signal__etat"><span className="d-signal__hors"><Icon name="alert" size={16} /> Pas de réseau</span><span className="d-signal__ok"><Icon name="check" size={16} /> Résultat disponible</span></div>
          </div>
        </Reveal>
      </section>

      {/* ===================== SÉCURITÉ ===================== */}
      <section className="d-section d-bloc">
        <Reveal className="d-bloc__texte">
          <p className="d-kicker">Sécurité</p>
          <h2 className="d-h2">Rien à attaquer. <span className="d-degrade">Rien publié sans deux personnes.</span></h2>
          <p>Le site public ne contient aucune connexion. Les résultats sont publiés depuis une console à double authentification : un fichier n'est jamais mis en ligne sans l'accord d'une seconde personne, et chaque action est inscrite dans un journal d'audit infalsifiable.</p>
          <p className="d-petit">Console testée en prototype ; un audit de sécurité indépendant sera réalisé avant tout usage officiel.</p>
        </Reveal>
        <Reveal delay={150} className="d-bloc__visuel">
          <div className="d-cles" aria-hidden="true">
            <div className="d-cle d-cle--1"><Icon name="lock" size={22} /><span>Préparateur</span></div>
            <div className="d-cle__lien"><i /></div>
            <div className="d-cle d-cle--2"><Icon name="shield" size={22} /><span>Approbateur</span></div>
            <div className="d-cles__resultat"><Icon name="check" size={18} /> Publié</div>
          </div>
        </Reveal>
      </section>

      {/* ===================== VIE PRIVÉE ===================== */}
      <section className="d-section d-bloc d-bloc--inverse">
        <Reveal className="d-bloc__texte">
          <p className="d-kicker">Vie privée</p>
          <h2 className="d-h2">Aucun nom à l'accueil. <span className="d-degrade">Le détail, sur confirmation.</span></h2>
          <p>L'accueil n'affiche que des statistiques. Un résultat n'apparaît qu'après une recherche, et l'attestation (moyenne, date de naissance) ne s'ouvre qu'après confirmation du numéro de table et de la date de naissance. Les candidats peuvent partager leur réussite avec une image qui ne montre ni numéro ni date.</p>
        </Reveal>
        <Reveal delay={150} className="d-bloc__visuel">
          <div className="d-confid" aria-hidden="true">
            <div className="d-confid__carte d-confid__carte--flou"><b>••••••••</b><span>•• / •• / ••••</span></div>
            <div className="d-confid__cadenas"><Icon name="lock" size={26} /></div>
            <div className="d-confid__carte d-confid__carte--net"><b>ADMIS(E)</b><span>Mention Bien</span></div>
          </div>
        </Reveal>
      </section>

      {/* ===================== POUR TOUS ===================== */}
      <section className="d-section d-bloc">
        <Reveal className="d-bloc__texte">
          <p className="d-kicker">Pour tous</p>
          <h2 className="d-h2">Français, arabe. <span className="d-degrade">Clair, sombre, vos couleurs.</span></h2>
          <p>Une interface en français et en arabe (avec lecture de droite à gauche), quatre palettes, un mode clair et un mode sombre. Sur téléphone comme sur ordinateur, et installable comme une vraie application Android.</p>
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
        <Reveal as="h2" className="d-h2 d-centre">Du fichier Excel <span className="d-degrade">à l'écran du candidat.</span></Reveal>
        <ol className="d-etapes">
          {[
            ['1', 'Un responsable dépose le fichier', 'Le tableau Excel est vérifié ligne par ligne : doublons, champs manquants, dates impossibles. Rien n\'est publié.'],
            ['2', 'Une seconde personne approuve', 'Elle relit le « avant / après », puis approuve. Personne ne peut approuver son propre dépôt.'],
            ['3', 'Le site se met à jour tout seul', 'Une publication, une sauvegarde de l\'ancienne version, et les candidats voient leurs résultats.'],
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
        <Reveal as="h2" className="d-titre d-titre--moyen d-centre">Prêt à le voir <span className="d-degrade">en vrai ?</span></Reveal>
        <Reveal as="p" delay={120} className="d-chapo d-centre">Essayez la recherche tout de suite, ou demandez une démonstration complète : de l'import du fichier Excel à l'écran du candidat.</Reveal>
        <Reveal delay={240} className="d-actions d-actions--centre">
          <button type="button" className="d-bouton d-bouton--plein" onClick={() => navigate('/')}><Icon name="search" size={18} /> Chercher un résultat</button>
          <a className="d-bouton d-bouton--vide" href={demo.lien}><Icon name="share" size={18} /> Demander une démonstration</a>
        </Reveal>
        <Reveal delay={360} className="d-signature">
          <Signature size="lg" link />
          <p>Une œuvre originale · mmbt.fr</p>
        </Reveal>
      </section>
    </div>
  )
}

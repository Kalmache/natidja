// ============================================================================
// Comparateur.jsx – « Comparer » deux établissements, deux îles, deux centres… ou deux années
// ----------------------------------------------------------------------------
// Logique : on choisit un TYPE (onglet), puis deux éléments de ce type. Chaque élément est une
// « fiche » de même forme (nom, total, admis, second, ajournés, taux, séries, mentions) ; on les
// affiche côte à côte : taux de réussite et écart, répartition des résultats, mentions, séries.
// Tout est calculé dans le téléphone à partir des statistiques déjà publiées (aucun travail serveur).
// Précaution : un très petit groupe donne des taux trompeurs (7 sur 8 = 87,5 %) → avertissement.
// ============================================================================
import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { comparer } from '../lib/classement.js'

const fr = (n) => Number(n).toFixed(1).replace('.', ',')
const part = (n, total) => (total ? (n / total) * 100 : 0)
const MENTIONS = ['PASSABLE', 'ASSEZ_BIEN', 'BIEN', 'TRES_BIEN']

/** Une ligne « A ◄ libellé ► B » avec deux barres qui partent du centre. */
function Ligne({ libelle, a, b, pa, pb, texteA, texteB }) {
  return (
    <div className="cmp__ligne">
      <span className="cmp__val cmp__val--a">{texteA ?? a}</span>
      <div className="cmp__duo" aria-hidden="true">
        <i className="cmp__barre cmp__barre--a" style={{ width: `${Math.min(100, pa)}%` }} />
        <i className="cmp__barre cmp__barre--b" style={{ width: `${Math.min(100, pb)}%` }} />
      </div>
      <span className="cmp__val cmp__val--b">{texteB ?? b}</span>
      <span className="cmp__lib">{libelle}</span>
    </div>
  )
}

export default function Comparateur({ groupes, minCandidats = 20 }) {
  const { t } = useI18n()
  // groupes : { cle: { titre, liste: [fiches] } } — seuls les types qui ont au moins 2 éléments sont proposés.
  const types = useMemo(() => Object.entries(groupes).filter(([, g]) => g.liste.length >= 2), [groupes])
  const [cle, setCle] = useState(types[0]?.[0])
  const [iA, setIA] = useState(0)
  const [iB, setIB] = useState(1)
  if (!types.length) return null

  const type = types.find(([k]) => k === cle) ?? types[0]
  const liste = type[1].liste
  const a = liste[Math.min(iA, liste.length - 1)]
  const b = liste[Math.min(iB, liste.length - 1)]
  const meme = a.nom === b.nom
  const { ecartPoints, devant } = comparer(a, b)
  const petits = [a, b].filter((x) => x.total < minCandidats)
  const changerType = (k) => { setCle(k); setIA(0); setIB(1) }

  const repartition = [['ADMIS', 'admis'], ['SECOND_GROUPE', 'second'], ['AJOURNE', 'ajournes']]
  const series = [...new Set([...(a.series ?? []), ...(b.series ?? [])].map((s) => s.serie))].sort()
  const tauxSerie = (f, s) => f.series?.find((x) => x.serie === s)

  return (
    <div className="cmp">
      <h2>{t('cmp.title')}</h2>
      <p className="vs__sous">{t('cmp.sub')}</p>

      {types.length > 1 && (
        <div className="pills cmp__types" role="tablist" aria-label={t('cmp.title')}>
          {types.map(([k, g]) => (
            <button key={k} type="button" role="tab" aria-selected={k === type[0]} className={`pill pill--sm ${k === type[0] ? 'is-active' : ''}`} onClick={() => changerType(k)}>
              {g.titre}
            </button>
          ))}
        </div>
      )}

      <div className="cmp__choix">
        <label>
          <span className="cmp__pastille cmp__pastille--a" aria-hidden="true" />
          <select className="select" value={iA} onChange={(e) => setIA(Number(e.target.value))} aria-label={t('cmp.first')}>
            {liste.map((f, i) => <option key={f.nom} value={i}>{f.nom}</option>)}
          </select>
        </label>
        <span className="cmp__vs" aria-hidden="true">VS</span>
        <label>
          <span className="cmp__pastille cmp__pastille--b" aria-hidden="true" />
          <select className="select" value={iB} onChange={(e) => setIB(Number(e.target.value))} aria-label={t('cmp.second')}>
            {liste.map((f, i) => <option key={f.nom} value={i}>{f.nom}</option>)}
          </select>
        </label>
      </div>

      {meme ? (
        <p className="cmp__avert" role="status">{t('cmp.same')}</p>
      ) : (
        <>
          {/* Taux de réussite : les deux gros chiffres et l'écart */}
          <div className="cmp__taux">
            <div className={`cmp__score cmp__score--a ${devant === 'a' ? 'is-devant' : ''}`}>
              <strong>{fr(a.taux)} %</strong>
              <small>{t('cmp.candidates', { n: a.total })}</small>
            </div>
            <div className={`cmp__score cmp__score--b ${devant === 'b' ? 'is-devant' : ''}`}>
              <strong>{fr(b.taux)} %</strong>
              <small>{t('cmp.candidates', { n: b.total })}</small>
            </div>
          </div>
          <p className="cmp__ecart" role="status">
            {devant ? t('cmp.gap', { n: fr(Math.abs(ecartPoints)), nom: devant === 'a' ? a.nom : b.nom }) : t('cmp.equal')}
          </p>
          {petits.length > 0 && (
            <p className="cmp__avert" role="note">{t('cmp.small', { n: minCandidats, noms: petits.map((x) => x.nom).join(', ') })}</p>
          )}

          <h3>{t('cmp.results')}</h3>
          {repartition.map(([statut, champ]) => (
            <Ligne key={statut} libelle={t(`status.${statut}`)} a={a[champ]} b={b[champ]} pa={part(a[champ], a.total)} pb={part(b[champ], b.total)}
              texteA={`${a[champ]} · ${fr(part(a[champ], a.total))} %`} texteB={`${b[champ]} · ${fr(part(b[champ], b.total))} %`} />
          ))}

          {MENTIONS.some((m) => (a.mentions?.[m] ?? 0) + (b.mentions?.[m] ?? 0) > 0) && (
            <>
              <h3>{t('cmp.mentions')}</h3>
              {MENTIONS.map((m) => (
                <Ligne key={m} libelle={t(`mention.${m}`)} a={a.mentions?.[m] ?? 0} b={b.mentions?.[m] ?? 0}
                  pa={part(a.mentions?.[m] ?? 0, a.total) * 4} pb={part(b.mentions?.[m] ?? 0, b.total) * 4}
                  texteA={`${a.mentions?.[m] ?? 0} · ${fr(part(a.mentions?.[m] ?? 0, a.total))} %`} texteB={`${b.mentions?.[m] ?? 0} · ${fr(part(b.mentions?.[m] ?? 0, b.total))} %`} />
              ))}
            </>
          )}

          {series.length > 0 && (
            <>
              <h3>{t('cmp.series')}</h3>
              {series.map((s) => {
                const sa = tauxSerie(a, s)
                const sb = tauxSerie(b, s)
                return (
                  <Ligne key={s} libelle={`${t('filter.series')} ${s}`} a={sa?.taux ?? 0} b={sb?.taux ?? 0} pa={sa?.taux ?? 0} pb={sb?.taux ?? 0}
                    texteA={sa ? `${fr(sa.taux)} %` : '–'} texteB={sb ? `${fr(sb.taux)} %` : '–'} />
                )
              })}
            </>
          )}
        </>
      )}
    </div>
  )
}

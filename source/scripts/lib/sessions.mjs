// ============================================================================
// scripts/lib/sessions.mjs – créer la session d'une nouvelle année
// ----------------------------------------------------------------------------
// Une « session » = un examen + une année + une édition (principale ou rattrapage),
// par exemple « Bac 2027, session principale ». Elle est décrite dans data/exams.json.
//
// Créer une session ne publie RIEN : elle est enregistrée en BROUILLON (status
// « DRAFT »), invisible du public. Elle n'apparaît sur le site qu'à la première
// publication de résultats (voir majConfig dans resultats.mjs), qui la passe en
// « PUBLISHED » et en fait la session affichée par défaut.
// ============================================================================
import { ILES } from './resultats.mjs'

/** Examens connus, avec leur intitulé officiel et leurs séries par défaut. */
export const TYPES_EXAMEN = {
  BAC: { titre: 'Baccalauréat Général & Technique', series: ['A1', 'A4', 'C', 'D', 'G'] },
  BEPC: { titre: "Brevet d'Études du Premier Cycle (BEPC)", series: [] },
}
export const GENRES = { PRINCIPALE: 'Session principale', RATTRAPAGE: 'Rattrapage' }
const NOMS_ILES = { ngazidja: 'Ngazidja (Grande Comore)', ndzuwani: 'Ndzuwani (Anjouan)', mwali: 'Mwali (Mohéli)' }

const refus = (statut, message) => Object.assign(new Error(message), { statut })

/** « bac-2027 » ou « bac-2027-rattrapage ». */
export const identifiantSession = (examType, year, genre = 'PRINCIPALE') =>
  `${String(examType).toLowerCase()}-${year}${genre === 'RATTRAPAGE' ? '-rattrapage' : ''}`

/**
 * Ajoute une session en brouillon. Ne modifie ni la date de mise à jour ni la session par défaut :
 * les propositions en cours restent valables.
 * @returns {{ config: object, session: object }}  la config complète (copie) et la session créée
 */
export function creerSession(config, { examType, year, genre = 'PRINCIPALE', libelle, series } = {}) {
  const type = String(examType ?? '').toUpperCase()
  if (!TYPES_EXAMEN[type]) throw refus(400, `Examen inconnu : « ${examType ?? ''} » (attendu : ${Object.keys(TYPES_EXAMEN).join(' ou ')}).`)
  const annee = Number(year)
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) throw refus(400, 'Année invalide (entre 2000 et 2100).')
  if (!GENRES[genre]) throw refus(400, `Édition inconnue (attendu : ${Object.keys(GENRES).join(' ou ')}).`)

  const id = identifiantSession(type, annee, genre)
  if (config.sessions.some((s) => s.id === id)) throw refus(409, `La session « ${id} » existe déjà.`)

  const nom = String(libelle ?? '').replace(/\s+/g, ' ').trim()
  if (nom.length > 40) throw refus(400, 'Le libellé est trop long (40 caractères au maximum).')
  const sessionDate = nom || (genre === 'RATTRAPAGE' ? `Rattrapage ${annee}` : `Session ${annee}`)

  // On reprend titre, îles et séries de la session la plus récente du MÊME examen (sinon des valeurs par défaut).
  const modele = config.sessions.filter((s) => s.examType === type).sort((a, b) => b.year - a.year)[0]
  const islands = (modele?.islands ?? Object.keys(ILES).map((i) => ({ id: i, name: NOMS_ILES[i] ?? ILES[i].nom }))).map((i) => ({ id: i.id, name: i.name, candidatesCount: 0 }))

  let listeSeries = []
  if (type === 'BAC') {
    const brutes = Array.isArray(series) ? series : String(series ?? '').split(/[,;]/)
    listeSeries = (series === undefined ? (modele?.series ?? TYPES_EXAMEN.BAC.series) : brutes).map((s) => String(s).trim().toUpperCase()).filter(Boolean)
    if (!listeSeries.length) throw refus(400, 'Indiquez au moins une série (ex. A1, A4, C, D, G).')
    if (listeSeries.some((s) => !/^[A-Z0-9]{1,4}$/.test(s))) throw refus(400, 'Une série ne peut contenir que des lettres ou chiffres (4 au maximum), ex. A1.')
    if (new Set(listeSeries).size !== listeSeries.length) throw refus(400, 'Une série est indiquée deux fois.')
  }

  const session = {
    id, examType: type, title: modele?.title ?? TYPES_EXAMEN[type].titre, year: annee, sessionDate, sessionKind: genre,
    status: 'DRAFT', series: listeSeries, islands, stats: { total: 0, admitted: 0, oralSecondGroup: 0, successRate: '0.0%' },
  }
  const copie = structuredClone(config)
  copie.sessions.push(session)
  return { config: copie, session }
}

// ============================================================================
// sessions.js – choisir l'examen, l'année et l'édition (principale / rattrapage)
// ----------------------------------------------------------------------------
// Les sessions viennent de data/exams.json. Une session créée dans la console
// reste « DRAFT » (brouillon) et n'est PAS montrée au public tant qu'aucun
// résultat n'a été publié : on ne garde ici que les sessions « PUBLISHED ».
// ============================================================================

const ORDRE_EXAMENS = ['BAC', 'BEPC']

/** « PRINCIPALE » (par défaut) ou « RATTRAPAGE ». */
export const genreDe = (s) => (s.sessionKind === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'PRINCIPALE')

/** Vrai si le public peut voir la session (les anciennes configurations sans statut sont publiées). */
export const estPubliee = (s) => !s.status || s.status === 'PUBLISHED'

/** Du plus récent au plus ancien ; à année égale : Bac avant BEPC, puis session principale avant rattrapage. */
export function trierSessions(sessions) {
  const rang = (s) => (ORDRE_EXAMENS.includes(s.examType) ? ORDRE_EXAMENS.indexOf(s.examType) : ORDRE_EXAMENS.length)
  return [...sessions].sort((a, b) => b.year - a.year || rang(a) - rang(b) || (genreDe(a) === genreDe(b) ? 0 : genreDe(a) === 'PRINCIPALE' ? -1 : 1))
}

/** Configuration prête pour le public : seulement les sessions publiées, triées, avec une session par défaut valide. */
export function configPublique(config) {
  const visibles = trierSessions(config.sessions.filter(estPubliee))
  // Si, par erreur, rien n'est publié, on garde tout plutôt que d'afficher une application vide.
  const sessions = visibles.length ? visibles : trierSessions(config.sessions)
  const defaut = sessions.some((s) => s.id === config.defaultSessionId) ? config.defaultSessionId : sessions[0]?.id
  return { ...config, sessions, defaultSessionId: defaut }
}

/**
 * Quelle session afficher quand la personne change UN des trois choix ?
 *   { examType }  → l'examen le plus récent de ce type (session principale d'abord)
 *   { year }      → la même année pour le même examen (principale d'abord)
 *   { genre }     → la même année et le même examen, dans cette édition
 * Renvoie l'identifiant, ou celui de la session courante si rien ne correspond.
 */
export function choisirSession(sessions, courante, { examType, year, genre } = {}) {
  const liste = trierSessions(sessions)
  const type = examType ?? courante.examType
  const memeExamen = liste.filter((s) => s.examType === type)
  let trouvee
  if (examType) trouvee = memeExamen[0]
  else if (year) trouvee = memeExamen.find((s) => s.year === Number(year))
  else if (genre) trouvee = memeExamen.find((s) => s.year === courante.year && genreDe(s) === genre)
  return (trouvee ?? courante).id
}

/** Les valeurs proposées pour chacun des trois choix (sans doublon). */
export function optionsSessions(sessions, courante) {
  const liste = trierSessions(sessions)
  const examens = [...new Map(liste.map((s) => [s.examType, s.examType])).keys()]
  const annees = [...new Set(liste.filter((s) => s.examType === courante.examType).map((s) => s.year))]
  const genres = [...new Set(liste.filter((s) => s.examType === courante.examType && s.year === courante.year).map(genreDe))]
  return { examens, annees, genres }
}

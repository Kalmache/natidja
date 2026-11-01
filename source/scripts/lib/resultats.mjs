// ============================================================================
// scripts/lib/resultats.mjs – le moteur d'import des résultats (Excel / CSV)
// ----------------------------------------------------------------------------
// IDÉE : un responsable remplit un tableau Excel (une ligne par candidat). Ce
// module :
//   1. LIT le fichier (xlsx ou csv) ;
//   2. VÉRIFIE chaque ligne (champs obligatoires, doublons, moyenne 0-20...) ;
//   3. CONSTRUIT les petits fichiers que le site attend (voir src/lib/search.js).
//
// Il réutilise exactement la fonction `normalize` de la recherche : les fichiers
// produits sont donc forcément compatibles avec ce que le site va chercher.
// Aucune écriture ici : ce sont des fonctions "pures", faciles à tester.
// ============================================================================
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import ExcelJS from 'exceljs'
import { normalize } from '../../src/lib/search.js'
import { lireDate } from '../../src/lib/dates.js'

// --------------------------------------------------------------------------
// 1. LES COLONNES DU TABLEAU
// --------------------------------------------------------------------------
// champ : nom interne ; titre : en-tête écrit dans le modèle Excel ;
// alias : autres écritures acceptées à la lecture (accents/majuscules ignorés).
export const COLONNES = [
  { champ: 'tableNumber', titre: 'N° de table', requis: true, largeur: 16,
    alias: ['numero de table', 'n de table', 'n table', 'numero', 'table'] },
  { champ: 'lastName', titre: 'Nom', requis: true, largeur: 20, alias: ['nom de famille'] },
  { champ: 'firstName', titre: 'Prénom', requis: true, largeur: 20, alias: ['prenoms'] },
  { champ: 'birthDate', titre: 'Date de naissance', requis: true, largeur: 16,
    alias: ['date naissance', 'date de naiss', 'ne le', 'nee le', 'ne e le', 'naissance', 'date n'] },
  { champ: 'birthPlace', titre: 'Lieu de naissance', largeur: 22, alias: ['village', 'village lieu de naissance', 'ne a'] },
  { champ: 'series', titre: 'Série', largeur: 9, alias: ['serie bac', 'filiere'] },
  { champ: 'center', titre: 'Centre d’examen', largeur: 38, alias: ['centre', 'centre d examen'] },
  { champ: 'school', titre: 'Établissement', largeur: 38, alias: ['ecole', 'etablissement scolaire', 'lycee'] },
  { champ: 'island', titre: 'Île', requis: true, largeur: 14, alias: ['ile'] },
  { champ: 'status', titre: 'Résultat', requis: true, largeur: 16, alias: ['decision', 'statut', 'admission'] },
  { champ: 'mention', titre: 'Mention', largeur: 14, alias: [] },
  { champ: 'average', titre: 'Moyenne', requis: true, largeur: 10, alias: ['moyenne generale', 'moy'] },
]

// Colonnes de notes facultatives, du type  « Mathématiques (coef 4) ».
const MOTIF_NOTE = /^(.+?)\s*\(\s*coef\.?\s*([\d.,]+)\s*\)\s*$/i

// Valeurs acceptées -> valeur interne
const STATUTS = {
  ADMIS: 'ADMIS', ADMISE: 'ADMIS',
  'SECOND GROUPE': 'SECOND_GROUPE', '2ND GROUPE': 'SECOND_GROUPE', '2EME GROUPE': 'SECOND_GROUPE',
  'SECOND TOUR': 'SECOND_GROUPE', ORAL: 'SECOND_GROUPE', RATTRAPAGE: 'SECOND_GROUPE', 'SECOND GROUPE ORAL': 'SECOND_GROUPE',
  AJOURNE: 'AJOURNE', AJOURNEE: 'AJOURNE', REFUSE: 'AJOURNE', REFUSEE: 'AJOURNE', 'NON ADMIS': 'AJOURNE', 'NON ADMISE': 'AJOURNE', ECHEC: 'AJOURNE',
}
const MENTIONS = {
  PASSABLE: 'PASSABLE', 'ASSEZ BIEN': 'ASSEZ_BIEN', BIEN: 'BIEN', 'TRES BIEN': 'TRES_BIEN',
}
export const LIBELLES_STATUT = { ADMIS: 'Admis', SECOND_GROUPE: 'Second groupe', AJOURNE: 'Ajourné' }
export const LIBELLES_MENTION = { PASSABLE: 'Passable', ASSEZ_BIEN: 'Assez bien', BIEN: 'Bien', TRES_BIEN: 'Très bien' }
export const ILES = {
  ngazidja: { nom: 'Ngazidja', synonymes: ['NGAZIDJA', 'GRANDE COMORE'] },
  ndzuwani: { nom: 'Ndzuwani', synonymes: ['NDZUWANI', 'ANJOUAN'] },
  mwali: { nom: 'Mwali', synonymes: ['MWALI', 'MOHELI'] },
}

const enTeteNorm = (t) => normalize(t).toLowerCase()

// La lecture d'une date de naissance est partagée avec l'application : src/lib/dates.js
export { lireDate }

// --------------------------------------------------------------------------
// 2. LECTURE DU FICHIER  (xlsx ou csv)  ->  lignes brutes
// --------------------------------------------------------------------------
/** Convertit le contenu d'une cellule Excel en valeur simple (texte ou nombre). */
function valeurCellule(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    if ('result' in v) return valeurCellule(v.result) // formule
    if ('richText' in v) return v.richText.map((r) => r.text).join('')
    if ('text' in v) return String(v.text) // lien hypertexte
    if ('error' in v) return ''
  }
  return typeof v === 'number' ? v : String(v)
}

/** Lit un fichier .csv : encodage UTF-8 ou Windows-1252, séparateur ; , ou tabulation. */
function lireCsv(chemin) {
  const octets = readFileSync(chemin)
  let texte = new TextDecoder('utf-8').decode(octets)
  if (texte.includes('�')) texte = new TextDecoder('windows-1252').decode(octets) // CSV d'Excel français
  texte = texte.replace(/^﻿/, '')
  const premiere = texte.split(/\r?\n/, 1)[0]
  const sep = [';', '\t', ','].map((s) => [s, premiere.split(s).length]).sort((a, b) => b[1] - a[1])[0][0]
  const lignes = []
  let ligne = [], champ = '', guillemets = false
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++ }
      else if (c === '"') guillemets = false
      else champ += c
    } else if (c === '"') guillemets = true
    else if (c === sep) { ligne.push(champ); champ = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++
      ligne.push(champ); lignes.push(ligne); ligne = []; champ = ''
    } else champ += c
  }
  if (champ !== '' || ligne.length) { ligne.push(champ); lignes.push(ligne) }
  return lignes
}

/** Lit un fichier .xlsx : renvoie un tableau de lignes (tableaux de valeurs). */
async function lireXlsx(chemin) {
  const classeur = new ExcelJS.Workbook()
  await classeur.xlsx.readFile(chemin)
  const feuille = classeur.getWorksheet('Résultats') ?? classeur.worksheets[0]
  if (!feuille) throw new Error('Le fichier Excel ne contient aucune feuille.')
  const lignes = []
  feuille.eachRow({ includeEmpty: true }, (row) => {
    const valeurs = []
    for (let c = 1; c <= feuille.columnCount; c++) valeurs.push(valeurCellule(row.getCell(c).value))
    lignes[row.number - 1] = valeurs
  })
  return Array.from(lignes, (l) => l ?? []) // lignes vides -> []
}

/**
 * Lit le fichier et renvoie { entete: [...], lignes: [{ numero, valeurs: {...} }] }
 * `numero` est le numéro de ligne tel qu'il apparaît dans Excel (pour les messages d'erreur).
 */
export async function lireTableau(chemin) {
  const ext = extname(chemin).toLowerCase()
  const brut = ext === '.csv' || ext === '.txt' ? lireCsv(chemin) : ext === '.xlsx' ? await lireXlsx(chemin) : null
  if (!brut) throw new Error(`Format « ${ext} » non pris en charge : utilisez .xlsx ou .csv.`)

  // L'en-tête = première ligne (parmi les 10 premières) qui contient « N° de table ».
  const motsTable = new Set(['n de table', 'numero de table', 'n table', 'numero', 'table'])
  const idxEntete = brut.slice(0, 10).findIndex((l) => l.some((v) => motsTable.has(enTeteNorm(v))))
  if (idxEntete < 0) throw new Error('En-tête introuvable : la colonne « N° de table » est absente des 10 premières lignes.')
  const entete = brut[idxEntete].map((v) => String(v).trim())

  const lignes = []
  for (let i = idxEntete + 1; i < brut.length; i++) {
    const cellules = brut[i] ?? []
    if (cellules.every((v) => String(v ?? '').trim() === '')) continue // ligne vide
    lignes.push({ numero: i + 1, cellules })
  }
  return { entete, lignes }
}

// --------------------------------------------------------------------------
// 3. VÉRIFICATION ET TRANSFORMATION
// --------------------------------------------------------------------------
const nettoyer = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()

/** Associe chaque colonne du fichier à un champ interne (ou à une note). */
function associerColonnes(entete) {
  const index = {} // champ -> position
  const notes = [] // { position, matiere, coef }
  const inconnues = []
  entete.forEach((titre, pos) => {
    if (!titre) return
    const n = enTeteNorm(titre)
    const col = COLONNES.find((c) => enTeteNorm(c.titre) === n || c.alias.includes(n))
    if (col) { if (!(col.champ in index)) index[col.champ] = pos; return }
    const m = titre.match(MOTIF_NOTE)
    if (m) { notes.push({ position: pos, matiere: nettoyer(m[1]), coef: Number(m[2].replace(',', '.')) }); return }
    inconnues.push(titre)
  })
  return { index, notes, inconnues }
}

/**
 * Vérifie le tableau et fabrique la liste des candidats.
 * @returns {{ candidats, erreurs, avertissements }}
 *   erreurs : bloquantes (rien n'est écrit tant qu'il en reste)
 *   avertissements : à lire mais non bloquantes
 */
export function transformer({ entete, lignes }, session, config) {
  const erreurs = []
  const avertissements = []
  const err = (ligne, champ, message) => erreurs.push({ ligne, champ, message })
  const avert = (ligne, champ, message) => avertissements.push({ ligne, champ, message })

  const { index, notes, inconnues } = associerColonnes(entete)
  for (const col of COLONNES.filter((c) => c.requis)) {
    if (!(col.champ in index)) err(0, col.titre, `La colonne « ${col.titre} » est absente du fichier.`)
  }
  if (inconnues.length) avert(0, '', `Colonnes ignorées (non reconnues) : ${inconnues.join(', ')}`)
  if (erreurs.length) return { candidats: [], erreurs, avertissements }

  const chiffresNumero = config.shardKeys?.numberDigits ?? 3
  const series = session.series ?? []
  const idsIles = new Set(session.islands.map((i) => i.id))
  const vus = new Map() // numéro de table -> n° de ligne
  const candidats = []

  for (const { numero, cellules } of lignes) {
    const lire = (champ) => (champ in index ? cellules[index[champ]] : '')
    const texte = (champ) => nettoyer(lire(champ))

    let table = texte('tableNumber').toUpperCase()
    if (/^\(EXEMPLE\)/.test(table)) continue // ligne d'exemple du modèle : ignorée
    const nErr = erreurs.length

    // --- N° de table
    const groupes = normalize(table).match(/\d+/g)
    if (!table) err(numero, 'N° de table', 'N° de table manquant.')
    else if (!groupes) err(numero, 'N° de table', `« ${table} » ne contient aucun chiffre.`)
    else if (groupes.at(-1).length < chiffresNumero)
      err(numero, 'N° de table', `« ${table} » : la partie numérique doit avoir au moins ${chiffresNumero} chiffres.`)
    else if (vus.has(table)) err(numero, 'N° de table', `Doublon : « ${table} » figure déjà à la ligne ${vus.get(table)}.`)
    else vus.set(table, numero)

    // --- Nom / prénom
    const nom = texte('lastName')
    const prenom = texte('firstName')
    if (!nom) err(numero, 'Nom', 'Nom manquant.')
    if (!prenom) err(numero, 'Prénom', 'Prénom manquant.')
    if (nom.length > 80 || prenom.length > 80) err(numero, 'Nom', 'Nom ou prénom anormalement long (plus de 80 caractères).')
    if (nom && prenom && normalize(nom).split(' ').concat(normalize(prenom).split(' ')).every((m) => m.length < 2))
      err(numero, 'Nom', 'Nom et prénom trop courts pour être recherchés.')

    // --- Date de naissance (obligatoire : elle permet de distinguer les homonymes)
    const naissanceBrute = lire('birthDate')
    let naissance = ''
    if (String(naissanceBrute).trim() === '') err(numero, 'Date de naissance', 'Date de naissance manquante.')
    else if (!(naissance = lireDate(naissanceBrute) ?? '')) err(numero, 'Date de naissance', `Date de naissance illisible : « ${naissanceBrute} » (écrivez JJ/MM/AAAA, par exemple 15/03/2007).`)
    else if (session.year) {
      const age = Number(session.year) - Number(naissance.slice(0, 4))
      if (age < 10 || age > 60) err(numero, 'Date de naissance', `Date de naissance improbable : « ${naissanceBrute} » (${age} ans lors de la session ${session.year}). Vérifiez l'année.`)
    }

    // --- Île
    const ileBrute = normalize(texte('island'))
    const ileId = Object.keys(ILES).find((id) => ILES[id].synonymes.some((s) => ileBrute === s || ileBrute.startsWith(s + ' ')))
    if (!ileBrute) err(numero, 'Île', 'Île manquante.')
    else if (!ileId) err(numero, 'Île', `Île inconnue : « ${texte('island')} » (attendu : Ngazidja, Ndzuwani ou Mwali).`)
    else if (!idsIles.has(ileId)) err(numero, 'Île', `L'île « ${ILES[ileId].nom} » n'est pas prévue pour cette session.`)

    // --- Résultat
    const statut = STATUTS[normalize(texte('status'))]
    if (!texte('status')) err(numero, 'Résultat', 'Résultat manquant.')
    else if (!statut) err(numero, 'Résultat', `Résultat inconnu : « ${texte('status')} » (attendu : Admis, Second groupe ou Ajourné).`)

    // --- Mention (seulement pour les admis)
    let mention
    if (texte('mention')) {
      mention = MENTIONS[normalize(texte('mention'))]
      if (!mention) err(numero, 'Mention', `Mention inconnue : « ${texte('mention')} » (attendu : Passable, Assez bien, Bien, Très bien).`)
      else if (statut && statut !== 'ADMIS') { avert(numero, 'Mention', 'Mention ignorée : elle ne s\'applique qu\'aux admis.'); mention = undefined }
    }

    // --- Série
    let serie = ''
    if (series.length) {
      serie = texte('series').toUpperCase()
      if (!serie) err(numero, 'Série', 'Série manquante.')
      else if (!series.includes(serie)) err(numero, 'Série', `Série inconnue : « ${serie} » (attendu : ${series.join(', ')}).`)
    } else if (texte('series')) avert(numero, 'Série', 'Série ignorée : cet examen n\'a pas de séries.')

    // --- Moyenne
    const brute = lire('average')
    const moyenne = typeof brute === 'number' ? brute : Number(String(brute).replace(',', '.').replace(/\s/g, ''))
    if (String(brute).trim() === '') err(numero, 'Moyenne', 'Moyenne manquante.')
    else if (!Number.isFinite(moyenne)) err(numero, 'Moyenne', `Moyenne illisible : « ${brute} ».`)
    else if (moyenne < 0 || moyenne > 20) err(numero, 'Moyenne', `Moyenne hors limites (0 à 20) : ${moyenne}.`)
    else if (statut === 'ADMIS' && moyenne < 10) avert(numero, 'Moyenne', `Admis avec une moyenne inférieure à 10 (${moyenne}) : à vérifier.`)
    else if (statut === 'AJOURNE' && moyenne >= 12) avert(numero, 'Moyenne', `Ajourné avec une moyenne élevée (${moyenne}) : à vérifier.`)

    // --- Notes par matière (facultatif)
    const grades = []
    for (const n of notes) {
      const v = cellules[n.position]
      if (String(v ?? '').trim() === '') continue
      const score = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
      if (!Number.isFinite(score) || score < 0 || score > 20) err(numero, n.matiere, `Note invalide pour « ${n.matiere} » : « ${v} » (0 à 20).`)
      else grades.push({ subject: n.matiere, coef: n.coef, score })
    }

    if (erreurs.length > nErr) continue // ligne en erreur : on ne la garde pas

    const c = {
      id: `${session.id}-${table}`,
      tableNumber: table,
      lastName: nom.toLocaleUpperCase('fr'),
      firstName: prenom,
      birthDate: naissance,
      birthPlace: texte('birthPlace'),
      series: serie,
      center: texte('center'),
      school: texte('school'),
      island: ILES[ileId].nom,
      islandId: ileId,
      status: statut,
    }
    if (mention) c.mention = mention
    c.average = Math.round(moyenne * 100) / 100
    if (grades.length) c.grades = grades
    candidats.push(c)
  }

  if (!candidats.length && !erreurs.length) err(0, '', 'Aucun candidat trouvé dans le fichier.')
  return { candidats, erreurs, avertissements }
}

// --------------------------------------------------------------------------
// 4. CONSTRUCTION DES PETITS FICHIERS DU SITE
// --------------------------------------------------------------------------
const parNumero = (a, b) => (a.tableNumber < b.tableNumber ? -1 : a.tableNumber > b.tableNumber ? 1 : 0)

/**
 * @returns {Map<string,string>} chemin relatif (ex. "numeros/001.json") -> contenu JSON
 */
export function construireFichiers(candidats, shardKeys = {}) {
  const chiffres = shardKeys.numberDigits ?? 3
  const lettres = shardKeys.nameLetters ?? 2
  const tries = [...candidats].sort(parNumero)
  const fichiers = new Map()
  const ajouter = (chemin, c) => {
    if (!fichiers.has(chemin)) fichiers.set(chemin, [])
    fichiers.get(chemin).push(c)
  }

  for (const c of tries) {
    // Fichier des numéros : 3 premiers chiffres de la dernière partie numérique.
    const dernier = normalize(c.tableNumber).match(/\d+/g).at(-1)
    ajouter(`numeros/${dernier.slice(0, chiffres)}.json`, c)
    // Fichiers des noms : 2 premières lettres de CHAQUE mot du nom et du prénom.
    const cles = new Set(
      normalize(`${c.lastName} ${c.firstName}`).split(' ').filter((m) => m.length >= lettres).map((m) => m.slice(0, lettres)),
    )
    for (const cle of cles) ajouter(`noms/${cle}.json`, c)
  }

  const sortie = new Map()
  for (const [chemin, liste] of fichiers) sortie.set(chemin, JSON.stringify(liste))
  return sortie
}

// --------------------------------------------------------------------------
// 5. STATISTIQUES ET MISE À JOUR DE exams.json
// --------------------------------------------------------------------------
export function resumer(candidats) {
  const total = candidats.length
  const compte = (f) => candidats.filter(f).length
  const admis = compte((c) => c.status === 'ADMIS')
  const second = compte((c) => c.status === 'SECOND_GROUPE')
  const parIle = {}
  for (const c of candidats) parIle[c.islandId] = (parIle[c.islandId] ?? 0) + 1
  return {
    total, admis, second, ajournes: total - admis - second, parIle,
    taux: total ? `${((admis / total) * 100).toFixed(1)}%` : '0.0%',
  }
}

/** Renvoie une copie de exams.json avec les chiffres de la session mis à jour. */
export function majConfig(config, sessionId, candidats, maintenant = new Date()) {
  const r = resumer(candidats)
  const copie = structuredClone(config)
  const s = copie.sessions.find((x) => x.id === sessionId)
  s.islands = s.islands.map((i) => ({ ...i, candidatesCount: r.parIle[i.id] ?? 0 }))
  s.stats = { total: r.total, admitted: r.admis, oralSecondGroup: r.second, successRate: r.taux }
  // Première publication d'une session créée en brouillon : elle devient publique ET c'est elle
  // que les visiteurs voient en arrivant (la plus récente publiée).
  if (s.status && s.status !== 'PUBLISHED') {
    s.status = 'PUBLISHED'
    copie.defaultSessionId = s.id
  }
  copie.updatedAt = maintenant.toISOString()
  return copie
}

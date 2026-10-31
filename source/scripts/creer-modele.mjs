// ============================================================================
// scripts/creer-modele.mjs – fabrique le MODÈLE EXCEL à remplir
//   npm run modele -- --session bac-2026
// Le fichier contient : une feuille « Résultats » (en-têtes, listes déroulantes
// qui empêchent les fautes de frappe), une feuille « Mode d'emploi », une
// feuille « Listes » (valeurs autorisées).
// ============================================================================
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import ExcelJS from 'exceljs'
import { lireArguments, lireConfig, choisirSession, SOURCE } from './lib/cli.mjs'
import { COLONNES, ILES, LIBELLES_MENTION, LIBELLES_STATUT } from './lib/resultats.mjs'

const args = lireArguments()
const config = lireConfig()
const session = choisirSession(config, args.session)
const colonnes = COLONNES.filter((c) => c.champ !== 'series' || session.series.length)
const LIGNES = 6000 // nombre de lignes avec listes déroulantes

const listes = {
  island: Object.values(ILES).map((i) => i.nom),
  status: Object.values(LIBELLES_STATUT),
  mention: Object.values(LIBELLES_MENTION),
  series: session.series,
}

const classeur = new ExcelJS.Workbook()
classeur.creator = 'Ndeze Natidja'
const feuille = classeur.addWorksheet('Résultats')
feuille.columns = colonnes.map((c) => ({ header: c.titre, key: c.champ, width: c.largeur }))
const entete = feuille.getRow(1)
entete.height = 24
entete.font = { bold: true, color: { argb: 'FFFFFFFF' } }
entete.alignment = { vertical: 'middle' }
entete.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }
feuille.views = [{ state: 'frozen', ySplit: 1 }]

// Ligne d'exemple (grisée) : ignorée à l'import car elle commence par « (exemple) ».
const exemple = {
  tableNumber: `(exemple) ${session.examType}-26-00001`, lastName: 'EXEMPLE', firstName: 'Prénom', birthPlace: 'Moroni',
  series: session.series[0] ?? '', center: 'Centre Lycée de Moroni', school: 'Lycée de Moroni',
  island: 'Ngazidja', status: 'Admis', mention: 'Bien', average: 13.5,
}
const ligneExemple = feuille.addRow(exemple)
ligneExemple.font = { italic: true, color: { argb: 'FF8A8A8A' } }

// Formats et listes déroulantes
colonnes.forEach((c, i) => {
  const col = feuille.getColumn(i + 1)
  if (c.champ === 'tableNumber') col.numFmt = '@' // texte : garde les zéros du début
  if (c.champ === 'average') col.numFmt = '0.00'
  if (listes[c.champ]?.length) {
    for (let r = 2; r <= LIGNES; r++) {
      feuille.getCell(r, i + 1).dataValidation = {
        type: 'list', allowBlank: true, formulae: [`"${listes[c.champ].join(',')}"`],
        showErrorMessage: true, errorTitle: 'Valeur non autorisée', error: 'Choisissez une valeur dans la liste déroulante.',
      }
    }
  }
  if (c.champ === 'average') {
    for (let r = 2; r <= LIGNES; r++) {
      feuille.getCell(r, i + 1).dataValidation = {
        type: 'decimal', operator: 'between', formulae: [0, 20], allowBlank: true,
        showErrorMessage: true, errorTitle: 'Moyenne invalide', error: 'La moyenne doit être un nombre entre 0 et 20.',
      }
    }
  }
})

// Mode d'emploi
const aide = classeur.addWorksheet("Mode d'emploi")
aide.getColumn(1).width = 110
const lignes = [
  [`MODÈLE DE RÉSULTATS — ${session.title} ${session.year}`, true],
  ['', false],
  ['1. Remplissez la feuille « Résultats » : UNE LIGNE PAR CANDIDAT, sans changer les titres des colonnes.', false],
  ['2. La ligne grise « (exemple) » sert d\'illustration : elle est ignorée, vous pouvez la supprimer.', false],
  ['3. Colonnes obligatoires : N° de table, Nom, Prénom, Île, Résultat, Moyenne' + (session.series.length ? ', Série.' : '.'), false],
  ['4. Île, Résultat, Mention' + (session.series.length ? ' et Série' : '') + ' : choisissez dans la liste déroulante (ne tapez pas à la main).', false],
  ['5. Mention : seulement pour les candidats « Admis ». Laissez vide pour les autres.', false],
  ['6. Moyenne : un nombre entre 0 et 20 (la virgule est acceptée, ex. 13,5).', false],
  ['7. Le N° de table doit être UNIQUE (ex. ' + `${session.examType}-26-00142` + '). Il doit se terminer par au moins 3 chiffres.', false],
  ['8. Facultatif — notes par matière : ajoutez des colonnes intitulées « Mathématiques (coef 4) », « Français (coef 3) »… avec la note sur 20.', false],
  ['9. Enregistrez le fichier au format .xlsx (ou .csv), puis transmettez-le à la personne chargée de la publication.', false],
  ['', false],
  ['Avant publication, le fichier est VÉRIFIÉ automatiquement : doublons, champs manquants, moyennes impossibles… Aucune publication si une erreur subsiste.', false],
  ['Ne mettez jamais ce fichier dans un dossier public ni sur GitHub : il contient des données personnelles de candidats.', true],
]
lignes.forEach(([t, gras], i) => {
  const cell = aide.getCell(i + 1, 1)
  cell.value = t
  cell.alignment = { wrapText: true, vertical: 'top' }
  if (gras) cell.font = { bold: true }
})

// Valeurs autorisées
const ref = classeur.addWorksheet('Listes')
const titres = { island: 'Île', status: 'Résultat', mention: 'Mention', series: 'Série' }
Object.entries(listes).filter(([, v]) => v.length).forEach(([cle, valeurs], i) => {
  ref.getCell(1, i + 1).value = titres[cle]
  ref.getCell(1, i + 1).font = { bold: true }
  valeurs.forEach((v, j) => (ref.getCell(j + 2, i + 1).value = v))
  ref.getColumn(i + 1).width = 18
})

const sortie = args.sortie ?? join(SOURCE, 'modeles', `modele-resultats-${session.id}.xlsx`)
mkdirSync(dirname(sortie), { recursive: true })
await classeur.xlsx.writeFile(sortie)
console.log(`\n✔ Modèle créé : ${sortie}\n`)

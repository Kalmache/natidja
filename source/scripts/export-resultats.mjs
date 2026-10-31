// ============================================================================
// scripts/export-resultats.mjs – EXPORTE les résultats actuels vers Excel
//   npm run export:resultats -- --session bac-2026 [--sortie fichier.xlsx]
// Utile pour corriger quelques lignes dans Excel puis réimporter le fichier.
// ============================================================================
import { readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import ExcelJS from 'exceljs'
import { lireArguments, lireConfig, choisirSession, DATA, SOURCE } from './lib/cli.mjs'
import { COLONNES, LIBELLES_MENTION, LIBELLES_STATUT } from './lib/resultats.mjs'

const args = lireArguments()
const config = lireConfig()
const session = choisirSession(config, args.session)
const dossier = join(DATA, session.id, 'numeros')
const candidats = readdirSync(dossier).flatMap((f) => JSON.parse(readFileSync(join(dossier, f), 'utf8')))
candidats.sort((a, b) => (a.tableNumber < b.tableNumber ? -1 : 1))

const colonnes = COLONNES.filter((c) => c.champ !== 'series' || session.series.length)
const matieres = [...new Map(candidats.flatMap((c) => c.grades ?? []).map((g) => [g.subject, g.coef]))]

const classeur = new ExcelJS.Workbook()
const feuille = classeur.addWorksheet('Résultats')
feuille.columns = [
  ...colonnes.map((c) => ({ header: c.titre, key: c.champ, width: c.largeur })),
  ...matieres.map(([m, coef]) => ({ header: `${m} (coef ${coef})`, key: `note:${m}`, width: 16 })),
]
const entete = feuille.getRow(1)
entete.font = { bold: true, color: { argb: 'FFFFFFFF' } }
entete.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }
feuille.views = [{ state: 'frozen', ySplit: 1 }]
feuille.getColumn('tableNumber').numFmt = '@'
for (const c of candidats) {
  const ligne = { ...c, status: LIBELLES_STATUT[c.status], mention: c.mention ? LIBELLES_MENTION[c.mention] : '' }
  for (const g of c.grades ?? []) ligne[`note:${g.subject}`] = g.score
  feuille.addRow(ligne)
}
const sortie = args.sortie ?? join(SOURCE, 'exports', `${session.id}-${new Date().toISOString().slice(0, 10)}.xlsx`)
mkdirSync(dirname(sortie), { recursive: true })
await classeur.xlsx.writeFile(sortie)
console.log(`\n✔ ${candidats.length} candidats exportés dans : ${sortie}\n`)

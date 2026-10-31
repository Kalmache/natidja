// ============================================================================
// scripts/build-stats.mjs
// ----------------------------------------------------------------------------
// But : calculer UNE FOIS les statistiques (taux de réussite par île, par
// série, par mention...) et les écrire dans public/data/<session>/stats.json.
//
// Pourquoi ne pas les calculer dans le navigateur ? Parce que cela obligerait
// chaque visiteur à télécharger les 3 500 candidats (plusieurs Mo). Ici, le
// visiteur ne télécharge qu'un petit fichier de quelques Ko.
//
// Lancement : npm run stats   (déjà inclus dans npm run build)
// ============================================================================
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DATA = join(process.cwd(), 'public', 'data')

// 1. On lit la liste des sessions d'examen (Bac, BEPC...).
const config = JSON.parse(readFileSync(join(DATA, 'exams.json'), 'utf8'))

// Petit outil : ajoute 1 au compteur "cle" d'un objet.
const inc = (obj, key) => {
  obj[key] = (obj[key] ?? 0) + 1
}

for (const session of config.sessions) {
  const dossier = join(DATA, session.id, 'numeros')

  // 2. On rassemble tous les candidats de la session (fichiers 000.json...).
  const candidats = readdirSync(dossier)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(dossier, f), 'utf8')))

  // 3. On compte.
  const stats = {
    session: session.id,
    total: candidats.length,
    parStatut: {}, // { ADMIS: n, AJOURNE: n, SECOND_GROUPE: n }
    parMention: {}, // { BIEN: n, ... }
    parIle: {}, // { ngazidja: { nom, total, ADMIS, ... } }
    parSerie: {}, // { A1: { total, ADMIS, ... } }
    moyenneGenerale: 0,
  }

  let sommeMoyennes = 0
  let avecMoyenne = 0

  for (const c of candidats) {
    inc(stats.parStatut, c.status)
    if (c.mention && c.mention !== 'SANS') inc(stats.parMention, c.mention)

    // Île
    stats.parIle[c.islandId] ??= { nom: c.island, total: 0 }
    stats.parIle[c.islandId].total++
    inc(stats.parIle[c.islandId], c.status)

    // Série (le BEPC n'en a pas)
    if (c.series) {
      stats.parSerie[c.series] ??= { total: 0 }
      stats.parSerie[c.series].total++
      inc(stats.parSerie[c.series], c.status)
    }

    if (typeof c.average === 'number') {
      sommeMoyennes += c.average
      avecMoyenne++
    }
  }

  stats.moyenneGenerale = avecMoyenne
    ? Math.round((sommeMoyennes / avecMoyenne) * 100) / 100
    : 0

  // 4. On écrit le résultat.
  writeFileSync(join(DATA, session.id, 'stats.json'), JSON.stringify(stats))
  console.log(
    `✔ ${session.id} : ${stats.total} candidats → stats.json (${Object.keys(stats.parIle).length} îles)`,
  )
}

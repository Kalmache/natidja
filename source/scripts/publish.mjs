// ============================================================================
// scripts/publish.mjs – fabrique le site et le dépose à la RACINE du dépôt
// ----------------------------------------------------------------------------
// Pourquoi ? OVH publie la racine du dépôt Git telle quelle. La racine doit
// donc contenir le site FINI (index.html, assets/, sw.js...), pas le code
// source (qui est rangé dans source/).
//
// Étapes : 1) calcul des statistiques  2) construction dans source/dist
//          3) nettoyage de l'ancienne version à la racine  4) copie de la nouvelle
//
// Lancement : npm run publish-site   (puis « git add -A », commit, push)
// ============================================================================
import { execSync } from 'node:child_process'
import { cpSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const SOURCE = fileURLToPath(new URL('..', import.meta.url))
const RACINE = join(SOURCE, '..')
const DIST = join(SOURCE, 'dist')

// 1 + 2 : construction
execSync('npm run build', { cwd: SOURCE, stdio: 'inherit' })

// 3 : on supprime UNIQUEMENT les fichiers générés par une construction
// précédente (jamais data/, source/, README...).
const aSupprimer = ['assets', 'icons', 'index.html', 'sw.js', 'registerSW.js', 'manifest.webmanifest', 'favicon.svg', '.htaccess']
for (const nom of readdirSync(RACINE)) {
  if (aSupprimer.includes(nom) || /^workbox-.*\.js$/.test(nom)) {
    rmSync(join(RACINE, nom), { recursive: true, force: true })
  }
}

// 4 : copie de la nouvelle version (le fichier caché .htaccess est inclus)
cpSync(DIST, RACINE, { recursive: true })
rmSync(DIST, { recursive: true, force: true })
console.log('\n✔ Site prêt à la racine du dépôt. Étape suivante : git add -A && git commit && git push')

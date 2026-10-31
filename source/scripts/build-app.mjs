// ============================================================================
// scripts/build-app.mjs – prépare le site pour l'APPLICATION ANDROID
// ----------------------------------------------------------------------------
// Dans l'application, il n'y a pas d'hébergeur : tout doit être DANS le
// téléphone. Ce script :
//   1. construit le site (npm run build  →  source/dist)
//   2. copie les données (data/, ~6,5 Mo) dans source/dist/data
//   3. retire le .htaccess (inutile hors serveur Apache)
// Capacitor (cap sync) copie ensuite source/dist dans le projet Android.
// Lancement : npm run build:app
// ============================================================================
import { execSync } from 'node:child_process'
import { cpSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const SOURCE = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(SOURCE, 'dist')

execSync('npm run build', { cwd: SOURCE, stdio: 'inherit' })
cpSync(join(SOURCE, '..', 'data'), join(DIST, 'data'), { recursive: true })
rmSync(join(DIST, '.htaccess'), { force: true })
console.log('\n✔ Site prêt pour Android dans source/dist (données incluses).')

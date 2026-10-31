// ============================================================================
// scripts/serveur-local.mjs – petit serveur web pour ESSAYER le site publié
// ----------------------------------------------------------------------------
//   npm run serveur -- --port 8080            (sert la racine du dépôt)
// Il imite ce que fait l'hébergeur Apache : compression (gzip) des fichiers texte
// et en-têtes de cache. Sert aux essais locaux et au test de charge.
// ⚠️ Ce n'est PAS un serveur de production.
// ============================================================================
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { extname, join, resolve, sep } from 'node:path'
import { lireArguments, RACINE } from './lib/cli.mjs'

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
}
const COMPRESSIBLES = new Set(['.html', '.js', '.css', '.json', '.svg', '.webmanifest', '.txt'])

export function creerServeur(racine = RACINE) {
  const base = resolve(racine)
  const cache = new Map() // chemin -> { gz } : on compresse une fois, comme un serveur bien réglé
  return createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0])
    let fichier = resolve(join(base, url.endsWith('/') ? url + 'index.html' : url))
    if (!fichier.startsWith(base + sep) && fichier !== base) { res.writeHead(403).end(); return }
    // dossier « source » et fichiers sensibles jamais servis
    if (/[\\/](source|\.git|node_modules)([\\/]|$)/.test(fichier.slice(base.length))) { res.writeHead(404).end(); return }
    if (!existsSync(fichier) || !statSync(fichier).isFile()) {
      if (extname(url) === '.json') { res.writeHead(404).end(); return } // comme .htaccess : pas de repli sur l'accueil
      fichier = join(base, 'index.html')
    }
    const ext = extname(fichier)
    const entetes = {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': ext === '.json' ? 'public, max-age=300, stale-while-revalidate=86400' : /^(sw|registerSW)\.js$|index\.html$/.test(fichier.split(/[\\/]/).pop()) ? 'no-cache' : 'public, max-age=31536000, immutable',
    }
    if (COMPRESSIBLES.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
      if (!cache.has(fichier)) cache.set(fichier, gzipSync(readFileSync(fichier), { level: 6 }))
      const gz = cache.get(fichier)
      res.writeHead(200, { ...entetes, 'Content-Encoding': 'gzip', 'Content-Length': gz.length, Vary: 'Accept-Encoding' }).end(gz)
    } else {
      res.writeHead(200, { ...entetes, 'Content-Length': statSync(fichier).size })
      createReadStream(fichier).pipe(res)
    }
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = lireArguments()
  const port = Number(args.port ?? 8080)
  creerServeur(args.racine ?? RACINE).listen(port, '127.0.0.1', () => console.log(`\n✔ Site servi sur http://127.0.0.1:${port}  (Ctrl+C pour arrêter)\n`))
}

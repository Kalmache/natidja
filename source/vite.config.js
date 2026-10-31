// ============================================================================
// vite.config.js – configuration de l'outil de construction ("build")
// ----------------------------------------------------------------------------
// Vite transforme notre code lisible (src/) en fichiers optimisés (dist/) que
// l'on envoie sur l'hébergeur. Le plugin PWA ajoute en plus :
//   - le fichier manifest (ce qui rend le site "installable" comme une appli)
//   - le service worker (le petit programme qui fait marcher le site hors-ligne)
// ============================================================================
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve, sep } from 'node:path'

// Les données (data/) sont à la racine du dépôt, pas dans source/. Pour que
// « npm run dev » les trouve, ce petit plugin les sert à l'adresse /data/...
const DOSSIER_DATA = fileURLToPath(new URL('../data', import.meta.url))
function servirData() {
  const middleware = (req, res, next) => {
    const chemin = resolve(join(DOSSIER_DATA, decodeURIComponent(req.url.split('?')[0])))
    // Sécurité : on refuse tout chemin qui sortirait du dossier data/ ("../").
    const autorise = chemin.startsWith(DOSSIER_DATA + sep)
    if (autorise && existsSync(chemin) && statSync(chemin).isFile()) {
      res.setHeader('Content-Type', 'application/json')
      createReadStream(chemin).pipe(res)
    } else {
      res.statusCode = 404
      res.end()
    }
  }
  return {
    name: 'servir-data',
    // Attention : ces fonctions ne doivent RIEN renvoyer (d'où les accolades).
    configureServer(server) {
      server.middlewares.use('/data', middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/data', middleware)
    },
  }
}

const VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

export default defineConfig({
  // __APP_VERSION__ est remplacé par la version de package.json (affichée au pied de page)
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  // "./" = chemins relatifs : le site fonctionne à la racine d'un domaine
  // comme dans un sous-dossier (utile aussi pour l'appli mobile Capacitor).
  base: './',

  plugins: [
    react(),
    servirData(),
    VitePWA({
      // L'appli se met à jour toute seule quand une nouvelle version existe.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],

      // --- Le manifest : la "carte d'identité" de l'appli sur le téléphone ---
      manifest: {
        id: './',
        name: 'Ndeze Natidja — Résultats des examens',
        short_name: 'Ndeze Natidja',
        description:
          'Consultez les résultats du Baccalauréat et du BEPC aux Comores, rapidement et même hors-ligne.',
        lang: 'fr',
        dir: 'auto',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any', // téléphone ET ordinateur/tablette
        background_color: '#052e24',
        theme_color: '#047857',
        categories: ['education', 'government'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      // --- Le service worker : gestion du cache et du hors-ligne ---
      workbox: {
        // On met en cache le "squelette" de l'appli dès la première visite.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/data\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Chaque fichier de résultats consulté est gardé 7 jours.
            // "StaleWhileRevalidate" = on affiche tout de suite la copie
            // locale, et on la met à jour en arrière-plan.
            urlPattern: /\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'resultats-examens',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],

  build: {
    target: 'es2020',
    sourcemap: false, // on ne publie pas le code source en clair
  },

  // Configuration des tests automatiques (commande : npm test)
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})

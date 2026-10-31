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

export default defineConfig({
  // "./" = chemins relatifs : le site fonctionne à la racine d'un domaine
  // comme dans un sous-dossier (utile aussi pour l'appli mobile Capacitor).
  base: './',

  plugins: [
    react(),
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
        // Les fichiers de données ne sont PAS préchargés (6,5 Mo) : on les
        // garde au fur et à mesure des recherches, voir ci-dessous.
        globIgnores: ['data/**'],
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

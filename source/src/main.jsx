// Point d'entrée : c'est le premier fichier exécuté. Il « branche » React sur
// la <div id="root"> de index.html.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// --- Service worker : seulement sur le site web, jamais dans l'application ---
// Dans l'APK, tous les fichiers sont déjà dans le téléphone : un service worker
// n'y sert à rien et gardait l'ANCIENNE version en mémoire après une mise à jour.
// Sur le site web, il reste utile (mode hors-ligne, installation).
const dansAppli = Boolean(window.Capacitor?.isNativePlatform?.())
if (dansAppli) {
  // Nettoyage des anciennes installations : on retire le service worker et ses caches.
  navigator.serviceWorker?.getRegistrations?.().then(async (regs) => {
    await Promise.all(regs.map((r) => r.unregister()))
    if (window.caches) for (const cle of await caches.keys()) await caches.delete(cle)
    // Si un ancien service worker servait la vieille version, on recharge UNE fois.
    if (regs.length && !sessionStorage.getItem('sw-nettoye')) {
      sessionStorage.setItem('sw-nettoye', '1')
      location.reload()
    }
  }).catch(() => {})
} else {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Petite signature pour les curieux qui ouvrent la console du navigateur.
console.log('%cConçu par M.M.B.T · mmbt.fr', 'font:700 14px system-ui;color:#fcd116;background:#052e24;padding:6px 12px;border-radius:6px')

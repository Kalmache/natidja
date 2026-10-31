// Point d'entrée : c'est le premier fichier exécuté. Il « branche » React sur
// la <div id="root"> de index.html.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Petite signature pour les curieux qui ouvrent la console du navigateur.
console.log('%cConçu par M.M.B.T · mmbt.fr', 'font:700 14px system-ui;color:#fcd116;background:#052e24;padding:6px 12px;border-radius:6px')

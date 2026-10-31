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

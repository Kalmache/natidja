// ============================================================================
// retour.js – le bouton « Retour » du téléphone Android
// ----------------------------------------------------------------------------
// Sans réglage, Android ferme l'application dès qu'on appuie sur Retour. On
// veut le comportement attendu d'une vraie application :
//   1. si une fenêtre est ouverte (fiche d'un candidat) → on la ferme ;
//   2. sinon, si on n'est pas sur l'accueil → on revient à l'accueil ;
//   3. sinon (déjà sur l'accueil) → on quitte l'application.
//
// Les écrans qui ouvrent une fenêtre s'inscrivent avec `surRetour(fn)` : `fn`
// renvoie true si elle a « consommé » le retour (elle a fermé quelque chose).
// ============================================================================
import { App } from '@capacitor/app'

const gestionnaires = [] // le dernier inscrit est le premier interrogé

/** Inscrit un gestionnaire ; renvoie la fonction qui le retire. */
export function surRetour(fn) {
  gestionnaires.push(fn)
  return () => {
    const i = gestionnaires.lastIndexOf(fn)
    if (i >= 0) gestionnaires.splice(i, 1)
  }
}

/**
 * Branche le bouton Retour d'Android. `estAccueil()` dit si on est sur
 * l'accueil, `versAccueil()` y ramène. Renvoie la fonction de débranchement.
 */
export function brancherRetourNatif({ estAccueil, versAccueil }) {
  const ecoute = App.addListener('backButton', () => {
    // 1. Une fenêtre ouverte ? (du plus récent au plus ancien)
    for (let i = gestionnaires.length - 1; i >= 0; i--) {
      if (gestionnaires[i]()) return
    }
    // 2. Pas sur l'accueil : on y retourne.
    if (!estAccueil()) return versAccueil()
    // 3. Sur l'accueil : on quitte.
    App.exitApp()
  })
  return () => {
    ecoute.then((h) => h.remove())
  }
}

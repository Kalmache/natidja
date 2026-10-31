# Ndeze Natidja 🇰🇲 — Résultats des examens (démonstration)

Site et application mobile (PWA) de consultation des résultats du **Baccalauréat**
et du **BEPC** aux Comores. **Toutes les données sont fictives** (démonstration).

## Ce que fait le projet
- Recherche instantanée par **numéro de table** ou **nom** (accents ignorés).
- Attestation de résultat avec **QR code de vérification**, impression/PDF et partage.
- **Statistiques nationales** (taux de réussite par île et par série, mentions, carte des îles).
- Français et **arabe** (écriture de droite à gauche), thème clair/sombre, 4 couleurs.
- **Installable** comme une application (Android, iPhone, ordinateur) et **utilisable hors-ligne**.

## Comment ça marche (l'idée clé)
Il n'y a **pas de serveur ni de base de données**. Les 3 500 candidats de chaque examen sont
découpés en petits fichiers (`public/data/<examen>/numeros/001.json`, `.../noms/AB.json`).
Quand on tape une recherche, le navigateur télécharge **uniquement le bon fichier** (~30 Ko).
Le calcul du bon fichier est dans `src/lib/search.js`.

## Organisation des fichiers
| Dossier / fichier | Rôle |
|---|---|
| `src/` | Le code source (React) : `components/` (briques d'écran), `views/` (pages), `lib/` (logique), `i18n/` (textes FR/AR), `styles/` |
| `public/data/` | Les résultats (JSON) et `exams.json` (liste des examens) |
| `public/.htaccess` | Sécurité et cache pour l'hébergement Apache (OVH) |
| `scripts/build-stats.mjs` | Calcule `stats.json` (statistiques) avant chaque build |
| `tests/` | Tests automatiques du moteur de recherche |
| `vite.config.js` | Configuration du build et de l'application installable (PWA) |

## Commandes (à lancer dans un terminal, dans ce dossier)
```bash
npm install      # une seule fois : télécharge les outils
npm run dev      # lance le site en local (http://localhost:5173) pour travailler
npm test         # lance les tests automatiques
npm run build    # fabrique le dossier dist/ prêt à publier
```

## Publier sur OVH
1. `npm run build`
2. Envoyer **tout le contenu du dossier `dist/`** (y compris le fichier caché `.htaccess`)
   à la racine de l'hébergement, par FTP.
3. Le site doit être en **HTTPS** (indispensable pour l'installation et le mode hors-ligne).

## Mettre à jour les résultats
Remplacer les fichiers dans `public/data/<examen>/`, puis `npm run build` et renvoyer `dist/`.
Les téléphones récupèrent les corrections en quelques minutes (cache de 5 min sur les JSON).

## Sécurité — ce qui est fait, et ses limites
**En place :** HTTPS forcé + HSTS, politique CSP stricte (aucun code externe), anti-clickjacking,
aucun traceur ni cookie, pas de CORS ouvert, pas de listing de dossiers, **aucun mot de passe
dans le code**. Le faux espace « administrateur » de la version précédente a été retiré : un mot
de passe écrit dans du code envoyé au navigateur est lisible par tous.

**Limites (honnêtes) de l'architecture sans serveur :**
- Les fichiers de résultats sont publics : quelqu'un de déterminé peut les télécharger tous.
- Le code de vérification des attestations n'est pas une vraie signature (pas de clé secrète).

**Phase 2 (à proposer au gouvernement) :** API sécurisée avec limitation de débit, espace
administrateur avec double authentification et journal d'audit, signature numérique des
attestations, notifications, application Android/iOS native (Capacitor), interface en shikomori
validée par des locuteurs natifs.

## À valider avant une présentation officielle
- Relecture de la traduction arabe par un locuteur natif.
- Le schéma des îles est indicatif (pas une carte à l'échelle).
- Les noms de ministère/ONEC et la mention « Fait à Moroni » sont des exemples.

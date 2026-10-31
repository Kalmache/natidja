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
**La racine du dépôt EST le site publié** : OVH copie tel quel ce qui s'y trouve.
Le code source est rangé à part dans `source/`.

| Dossier / fichier | Rôle |
|---|---|
| `index.html`, `assets/`, `sw.js`, `icons/`, `.htaccess`... | **Le site fini, publié par OVH.** Fichiers générés : ne pas les modifier à la main |
| `data/` | Les résultats (JSON) et `exams.json` (liste des examens). Publiés tels quels |
| `source/src/` | Le code source (React) : `components/`, `views/`, `lib/`, `i18n/` (textes FR/AR), `styles/` |
| `source/public/` | Icônes et `.htaccess` (sécurité/cache Apache) copiés dans le site |
| `source/scripts/` | `build-stats.mjs` (calcule les statistiques) et `publish.mjs` (reconstruit le site à la racine) |
| `source/tests/` | Tests automatiques du moteur de recherche |

## Commandes (terminal, dans le dossier `source/`)
```bash
npm install          # une seule fois : télécharge les outils
npm run dev          # lance le site en local (http://localhost:5173) pour travailler
npm test             # lance les tests automatiques
npm run publish-site # reconstruit le site À LA RACINE du dépôt
```

## Mettre le site en ligne (OVH est relié à Git)
1. Dans `source/` : `npm run publish-site`
2. À la racine : `git add -A`, `git commit`, `git push` sur la branche suivie par OVH (`main`).
3. OVH met à jour le site. Ne jamais pousser sans avoir lancé `publish-site` après un changement
   du code : sinon le site publié ne reflète pas le code source.

## Application Android (APK)
L'application emballe le même site avec **toutes les données** : elle fonctionne sans connexion.
Projet Android dans `source/android/` (Capacitor, identifiant `fr.mmbt.natidja`).

**Le plus simple : laisser GitHub la fabriquer.**
1. Sur GitHub : onglet **Actions** > **Application Android** > **Run workflow**
   (elle se lance aussi toute seule quand `source/` ou `data/` change sur `main`).
2. À la fin (≈ 5 min), ouvrir l'exécution et télécharger **ndeze-natidja-android** (un zip contenant `app-debug.apk`).
3. Envoyer l'APK sur le téléphone, l'ouvrir, autoriser « Installer des applications inconnues » si demandé.

**Ou la fabriquer soi-même** (Android Studio ou SDK Android + Java 21), dans `source/` :
```bash
npm run android:sync                 # construit le site + données et les copie dans le projet Android
cd android && ./gradlew assembleDebug
# APK : source/android/app/build/outputs/apk/debug/app-debug.apk
```
Cet APK est signé avec une clé de **test** : il suffit pour une démonstration. Pour **Google Play**, il faudra
un compte développeur, une clé de signature personnelle (à ne jamais publier) et un bundle signé (`bundleRelease`).

## Mettre à jour les résultats (Excel / CSV)
Les résultats se préparent dans un tableau Excel, **vérifié automatiquement** avant publication.
Guide complet pas à pas : [`source/docs/GUIDE-PUBLICATION.md`](source/docs/GUIDE-PUBLICATION.md). En bref, dans `source/` :
```bash
npm run modele -- --session bac-2026                                   # crée le modèle Excel à remplir
npm run import -- fichier.xlsx --session bac-2026 --dry-run            # vérifie, sans rien modifier
npm run import -- fichier.xlsx --session bac-2026                      # publie (ancienne version sauvegardée)
npm run restaurer -- --session bac-2026                                # liste les sauvegardes / revient en arrière
npm run publish-site                                                   # reconstruit le site à la racine
```
⚠️ Avec de **vraies** données de candidats, ne pas passer par un dépôt public : voir la section 8 du guide.

## Console de publication (responsables des examens)
Une application **séparée du site public** pour publier les résultats en sécurité : connexion + double authentification,
dépôt du fichier par un préparateur, **approbation par une autre personne**, publication immédiate ou programmée,
sauvegarde automatique, journal d'audit. Installation, sécurité et **limites connues** : [`source/docs/CONSOLE.md`](source/docs/CONSOLE.md).
```bash
npm run console:utilisateur -- creer --nom amina --roles preparateur   # crée un compte (dans source/)
npm run console                                                        # lance la console (derrière HTTPS en production)
```

## Charge et hébergement du jour J
Poids mesurés, modèle de capacité, résultats du test de charge, comparaison des hébergements :
[`source/docs/CHARGE-ET-HEBERGEMENT.md`](source/docs/CHARGE-ET-HEBERGEMENT.md).
```bash
npm run capacite -- --visiteurs 100000 --minutes 30     # combien de requêtes/s et de Go ?
npm run serveur -- --port 8081                          # sert le site en local
npm run charge -- --url http://127.0.0.1:8081 --utilisateurs 500 --duree 20
```

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

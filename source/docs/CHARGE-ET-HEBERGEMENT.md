# Charge et hébergement du jour J — Ndeze Natidja

*Document de travail — 31 octobre 2026. Les chiffres « mesurés » viennent des outils du projet (`npm run capacite`, `npm run charge`) et peuvent être rejoués. Ce qui est une hypothèse est écrit comme tel.*

---

## 1. En quelques lignes

- **Le site demande très peu à un serveur** : il n'y a ni base de données ni calcul. Une recherche = le téléchargement d'un petit fichier déjà prêt (**4,2 Ko** en moyenne une fois compressé). Il n'y a rien à « faire tomber » côté application.
- **Mesuré en local** : zéro erreur jusqu'à **1 500 visiteurs simultanés** (≈ 1 000 requêtes par seconde) sur un petit serveur de test.
- **Ce n'est pas encore une preuve pour le jour J.** Le test local ne dit rien de la capacité de l'hébergeur réel. Il faut refaire le test **sur l'hébergement visé** (protocole en section 7).
- **Pour une affluence nationale, il faut un CDN** (un réseau de serveurs qui gardent une copie des fichiers). Un hébergement mutualisé seul est le maillon le plus fragile.
- **Point à décider avec le ministère** : avec de vraies données de candidats, le choix de l'hébergeur dépend aussi de la **protection des données** (section 6).

---

## 2. Pourquoi cette architecture tient mieux

Un outil classique fait travailler un serveur à chaque recherche (interroger une base, calculer, répondre). Quand des dizaines de milliers de personnes arrivent en même temps, le serveur se bloque.

Ici, les résultats sont découpés à l'avance en petits fichiers (voir `src/lib/search.js`). Le téléphone télécharge **le bon fichier** et cherche **dans le téléphone**. Les fichiers sont identiques pour tout le monde : un CDN peut donc les servir sans jamais solliciter l'hébergeur d'origine. En plus, l'application garde ses fichiers : une personne qui l'a déjà installée ne retélécharge presque rien.

---

## 3. Ce que télécharge un visiteur (mesuré)

Poids **compressés** (gzip niveau 6, comme le fait Apache), session `bac-2026` :

| Élément | Poids | Quand |
|---|---|---|
| Application (page, scripts, style, mode hors-ligne) | 100,3 Ko | **une seule fois** par appareil |
| Accueil (configuration + statistiques, **sans liste de candidats**) | mesure à refaire (`npm run capacite`) | à chaque visite |
| Une recherche (fichier moyen sur 67) | 4,2 Ko (max 11,2 Ko) | à chaque recherche |
| **Première visite** (2 recherches) | **≈ 113 Ko, ≈ 11 requêtes** | |
| **Visite suivante** (2 recherches) | **≈ 12 Ko, ≈ 4 requêtes** | |

Pour comparaison, la base complète d'un examen pèse environ 1 Mo non compressé : on ne la télécharge jamais en entier.

---

## 4. Modèle de capacité

`npm run capacite -- --visiteurs 100000 --minutes 30 --pic 5 --deja-installes 0.3`

Hypothèses de départ (**à remplacer par les vrais effectifs de l'ONEC**) : affluence concentrée sur 30 minutes, moment le plus chargé = 5 × la moyenne, 30 % d'appareils déjà équipés, 2 recherches par visite.

| Visiteurs | Volume total | Requêtes/s (moyenne) | Requêtes/s (pic) | Débit au pic |
|---:|---:|---:|---:|---:|
| 10 000 | 0,8 Go | 49 | 247 | 19 Mbit/s |
| 50 000 | 4,2 Go | 247 | 1 236 | 94 Mbit/s |
| 100 000 | 8,5 Go | 494 | 2 472 | 188 Mbit/s |
| 300 000 | 25,4 Go | 1 483 | 7 417 | 564 Mbit/s |

Lecture : même à 100 000 visiteurs, le **volume** reste modeste (8,5 Go). Ce qui compte, c'est le **nombre de requêtes par seconde** au pic et le débit : c'est exactement ce qu'un CDN absorbe, et ce qu'un hébergement mutualisé absorbe mal.

---

## 5. Test de charge en local (mesuré)

`npm run serveur` puis `npm run charge -- --url http://127.0.0.1:8081 --utilisateurs N --duree 20`

Chaque visiteur virtuel charge l'application (une fois sur deux), affiche l'accueil, fait 1 à 3 recherches (numéro ou nom, avec **la même fonction de recherche que le site**) et patiente 1 à 4 s entre deux actions.

| Visiteurs simultanés | Requêtes/s | Erreurs | Délai médian | 95 % des réponses | 99 % |
|---:|---:|---:|---:|---:|---:|
| 100 | 76 | 0 | 2 ms | 6 ms | 12 ms |
| 500 | 373 | 0 | 1 ms | 6 ms | 14 ms |
| 1 500 | 1 043 | 0 | 4 ms | 301 ms | 953 ms |

**À lire avec précaution :**
- Le serveur de test **et** le générateur de charge tournent sur la même machine (4 processeurs partagés) : à 1 500, les délais montent à cause de ce banc d'essai, pas du site.
- C'est un test **sur un serveur local**, sans réseau mobile, sans CDN, sans les limites d'un hébergeur réel.
- Il prouve que **l'application ne génère pas de travail coûteux côté serveur** ; il ne prouve pas la capacité de l'hébergeur final.

---

## 6. Options d'hébergement pour le jour J

| Option | Avantages | Limites / risques |
|---|---|---|
| **A. Hébergement mutualisé seul** (situation actuelle de la démo) | Simple, déjà en place | Le plus fragile en cas d'affluence : ressources partagées, nombre de requêtes simultanées limité par l'offre. **Déconseillé seul** pour un usage national |
| **B. Hébergement mutualisé + CDN** | On garde l'hébergeur actuel, le CDN sert les copies | OVHcloud indique que l'option CDN est **incluse dans les offres Performance** et au-dessus, et proposée en option sur d'autres ; certains réglages avancés sont payants (tarifs à vérifier avant commande) ¹ ² |
| **C. Hébergement statique à réseau mondial** (ex. Cloudflare Pages, GitHub Pages) | CDN intégré. Cloudflare indique que les requêtes et la bande passante des fichiers statiques sont **illimitées** sur son offre gratuite ³. GitHub Pages fixe une limite **indicative** de 100 Go/mois, 1 Go par site et peut répondre 429 en cas d'excès ⁴ | Pas d'engagement de service pour un usage gouvernemental ; **hébergeurs hors de l'Union européenne** (voir ci-dessous) |
| **D. Serveur dédié ou VPS + CDN** | Maîtrise totale, peut se placer chez un hébergeur souverain | Plus de travail d'exploitation, coût plus élevé |

**Recommandation** : au minimum **B** pour un essai grandeur nature, et viser **C ou D derrière un CDN** pour un déploiement officiel, après avoir répondu à la question suivante.

### Protection des données — à trancher avec le ministère
Les fichiers de résultats contiennent des **données personnelles de candidats, souvent mineurs** (noms, établissements, résultats). Pour un déploiement réel, il faut déterminer :
- qui est **responsable du traitement** (l'autorité organisatrice de l'examen) ;
- **où** peuvent être hébergées ces données (certains États exigent un hébergement national ou dans une zone précise ; l'usage d'un CDN mondial est un transfert de données à justifier) ;
- les **durées de conservation** et le circuit d'accès.

Ce document ne tranche pas ces points : ils relèvent du ministère et de son conseil juridique. Pour la **démonstration**, les données sont fictives et la question ne se pose pas.

---

## 7. Protocole pour mesurer l'hébergement réel

1. **Prévenir l'hébergeur** par écrit de la date et de la durée du test. Un test de charge peut ressembler à une attaque et faire suspendre un compte.
2. Tester un **domaine de pré-production** (ex. `essai.mmbt.fr`) qui sert **la même chose** que le site final, avec le CDN activé comme le jour J.
3. Montée progressive, depuis une machine **différente** du serveur (idéalement depuis plusieurs réseaux) :
   `npm run charge -- --url https://essai.exemple --confirmer-url-reelle --utilisateurs 100 --duree 60`
   puis 200, 300… L'outil plafonne à 300 visiteurs sur un site réel ; au-delà, un service de test de charge dédié est recommandé.
4. **Critères d'acceptation proposés** : moins de 1 % d'erreurs et 95 % des réponses en moins d'une seconde, à la charge prévue au pic (section 4).
5. Noter le résultat, la date, la configuration (CDN actif ou non) et **refaire le test** après tout changement d'hébergement.

---

## 8. Le jour J : mesures complémentaires

**Avant**
- Campagne « **installez l'application avant** l'annonce » : un appareil équipé ne télécharge presque plus rien.
- Répétition générale de la publication (voir le guide de publication).
- Surveillance : une alerte automatique (service de supervision) qui prévient si le site ne répond plus.

**Au moment de la publication**
- Prévoir un **plan B** : une page de secours expliquant comment obtenir son résultat, et un canal d'information (réseaux, radio).
- Éviter que tout le monde actualise en même temps : une amélioration prévue consiste à afficher un **compte à rebours** avec un léger décalage aléatoire au moment de la publication.

**Limites connues du dispositif actuel**
- Les fichiers de résultats sont publics : il n'existe **pas de publication sous embargo** (les fichiers sont accessibles dès qu'ils sont déposés). Une publication programmée avec contrôle d'accès demande une brique serveur (voir la console de publication).
- Aucune mesure sur un téléphone réel en réseau mobile faible n'a encore été faite : à réaliser avant la présentation officielle.

---

## Sources

1. OVHcloud, *Speeding up your website with CDN* — https://docs.ovhcloud.com/en/guides/web-cloud/web-hosting/cdn-how-to-use-cdn
2. OVHcloud, *Shared CDN* — https://www.ovhcloud.com/fr/web-hosting/options/cdn/
3. Cloudflare, *Pages Functions pricing* (requêtes statiques gratuites et illimitées) — https://developers.cloudflare.com/pages/functions/pricing/index.md ; et synthèses : https://temps.sh/blog/cloudflare-pages-free-tier-limits-2026
4. GitHub, *GitHub Pages limits* — https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

*Les offres et tarifs des hébergeurs évoluent : à re-vérifier sur les pages officielles avant toute décision.*

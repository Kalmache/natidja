# Console de publication — guide d'installation et d'exploitation

*Version 1 (prototype testé) — 31 octobre 2026*

La console est l'application **réservée aux responsables des examens** : elle sert à déposer le fichier de résultats, à le faire valider par une seconde personne, puis à le publier. Elle est **séparée du site public**, qui reste un ensemble de fichiers sans aucune page de connexion.

```
 Responsable ─► CONSOLE (privée, HTTPS) ──► écrit les fichiers ──► SITE PUBLIC (fichiers + CDN)
   2 personnes         connexion + 2FA                             aucune connexion, rien à attaquer
```

---

## 1. Ce que fait la console

| Étape | Qui | Ce qui se passe |
|---|---|---|
| 1. Connexion | tous | identifiant + mot de passe, **puis** code à 6 chiffres (application d'authentification) |
| 2. Dépôt | **préparateur** | dépose le fichier Excel/CSV ; il est vérifié ligne par ligne ; **rien n'est publié** |
| 3. Relecture | **approbateur** (une AUTRE personne) | voit ce qui va changer (avant/après), les avertissements, un extrait |
| 4. Décision | approbateur | approuve et publie, **ou** programme la publication, **ou** refuse avec un motif |
| 5. Publication | automatique | écriture des fichiers, **sauvegarde de l'ancienne version**, recalcul des statistiques |
| 6. Traçabilité | admin | journal d'audit : qui a fait quoi, quand, avec contrôle d'intégrité |

**Rôles volontairement séparés** : `preparateur` (dépose), `approbateur` (approuve/refuse/programme), `admin` (consulte le journal). Un même compte peut cumuler des rôles, mais **la règle des deux personnes est appliquée par le serveur** : l'auteur d'une proposition ne peut jamais l'approuver lui-même.

---

## 2. Mesures de sécurité en place (et vérifiées par des tests automatiques)

- **Mots de passe** hachés avec scrypt (jamais stockés en clair), 12 caractères minimum, mot de passe temporaire à changer à la première connexion.
- **Double authentification** (TOTP, norme RFC 6238 ; code vérifié avec les vecteurs de test officiels), refus de **rejouer** un code déjà utilisé.
- **Verrouillage** après 5 erreurs (15 minutes) et limite par adresse ; réponse **identique** que le compte existe ou non (pas de découverte des comptes).
- **Sessions** : cookie `HttpOnly`, `SameSite=Strict`, `Secure` en production ; expiration après 15 min d'inactivité et 8 h au maximum ; nouvel identifiant à chaque montée en privilège.
- **Protection CSRF** (jeton + contrôle de l'origine), en-têtes de sécurité stricts (CSP sans script ni style en ligne, anti-clickjacking, `nosniff`, HSTS en production), aucune mise en cache.
- **Fichiers déposés** : taille limitée, contenu réel contrôlé (un faux `.xlsx` est refusé), supprimés du disque après lecture.
- **Interface** : aucun texte reçu n'est inséré comme du HTML (pas d'injection de code possible via un nom de candidat).
- **Comptes** créés **uniquement en ligne de commande** sur le serveur (pas de page de création de comptes à attaquer).
- **Journal d'audit à chaîne** : toute modification a posteriori est détectée. Les mots de passe et secrets n'y figurent jamais.
- **Publication** : une seule à la fois, sauvegarde automatique, refus d'écraser une publication plus récente sans confirmation explicite.

---

## 3. Installation (sur un serveur à vous)

Prérequis : un serveur Linux avec **Node.js 22** et un **serveur HTTPS** devant (voir 4).

```bash
cd source && npm ci

# Créer les premiers comptes (affiche UNE fois le mot de passe temporaire et le QR code 2FA)
npm run console:utilisateur -- creer --nom amina  --roles preparateur
npm run console:utilisateur -- creer --nom moussa --roles approbateur,admin

# Lancer la console (réglages par variables d'environnement)
CONSOLE_PORT=8787 CONSOLE_DATA=/var/lib/ndeze/console PUBLISH_DATA=/var/www/natidja/data npm run console
```

| Variable | Rôle | Défaut |
|---|---|---|
| `CONSOLE_PORT` / `CONSOLE_HOST` | où écouter | `8787` / `127.0.0.1` |
| `CONSOLE_DATA` | dossier **privé** de la console (comptes, propositions, journal) | `source/console-data` |
| `GITHUB_TOKEN_PUBLICATION`, `GITHUB_REPO`, `GITHUB_BRANCHE` | active l'envoi vers le site public via GitHub (jeton limité à ce dépôt, permission *Contents : lecture/écriture*) | désactivé |
| `PUBLISH_DATA` | dossier `data/` du site public à mettre à jour | `data/` du dépôt |
| `CONSOLE_TRUST_PROXY=1` | lire l'adresse du visiteur dans `X-Forwarded-For` (seulement derrière un proxy de confiance) | non |
| `CONSOLE_DEV=1` | cookies non sécurisés — **jamais en production** | non |

Remise des accès : le mot de passe temporaire et le QR code s'affichent **une seule fois**, à remettre **en main propre**. La personne change son mot de passe à la première connexion et peut **renouveler son secret 2FA** depuis « Mon compte » (pour qu'aucun tiers, administrateur compris, n'en détienne une copie).

Autres commandes : `lister`, `reinitialiser --nom X`, `desactiver|activer --nom X`.

## 4. Mise en production : HTTPS obligatoire

La console parle HTTP : placez-la **derrière un serveur HTTPS** (Caddy, nginx…) et ne l'exposez qu'à qui en a besoin (idéalement réseau privé / VPN, ou liste d'adresses autorisées).

Exemple Caddy (certificat automatique) :
```
console.exemple.org {
    reverse_proxy 127.0.0.1:8787
}
```
Avec `CONSOLE_TRUST_PROXY=1` pour que le verrouillage tienne compte de l'adresse réelle.

## 5. Du dossier de données au site public

La console écrit dans `PUBLISH_DATA`. Deux montages possibles :
- **console et site public sur le même serveur** : `PUBLISH_DATA` pointe directement sur le dossier `data/` servi au public ;
- **site public ailleurs** (cas de l'hébergement OVH actuel) : la console envoie elle-même les fichiers publiés vers le dépôt GitHub, en **un seul commit** par publication ; OVH redéploie ensuite le site grâce à son webhook. Elle s'active quand `GITHUB_TOKEN_PUBLICATION` et `GITHUB_REPO` sont définis (`GITHUB_BRANCHE`, par défaut `main`). Un échec d'envoi n'annule pas la publication : il est affiché dans la proposition avec un bouton **Réessayer la mise en ligne**, et inscrit au journal d'audit. Installation complète sur un serveur, avec HTTPS : [`DEPLOIEMENT-CONSOLE.md`](DEPLOIEMENT-CONSOLE.md).

Pour revenir en arrière : les sauvegardes sont dans `<CONSOLE_DATA>/sauvegardes/` ; la commande `npm run restaurer` fonctionne sur ces dossiers.

---

## 6. Limites connues — à lire avant tout usage réel

Ce prototype est **testé** (30 tests d'attaque et de fonctionnement + parcours complet dans un navigateur), mais **il n'a pas été audité par un tiers**. Avant de traiter de vraies données de candidats :

1. **Audit de sécurité indépendant et test d'intrusion** : indispensable pour un service d'État.
2. **Secrets au repos** : les secrets 2FA sont dans `utilisateurs.json` en clair (fichier à droits 0600). Prévoir le **chiffrement du disque** et une gestion de secrets (coffre).
3. **Fichiers Excel piégés** (archives « bombes ») : la lecture d'un `.xlsx` malveillant peut consommer beaucoup de mémoire. Lancer la console dans un **conteneur à mémoire limitée** et préférer le format CSV pour les gros volumes.
4. **Sessions en mémoire** : un redémarrage déconnecte tout le monde (sans autre conséquence).
5. **Verrouillage de compte** : un attaquant qui connaît un identifiant peut le verrouiller 15 minutes (compromis classique contre la force brute).
6. **Journal d'audit** : la falsification est *détectée*, pas *impossible* si l'attaquant contrôle tout le serveur. Envoyer régulièrement la dernière empreinte à un tiers de confiance.
7. **Pas de réinitialisation de mot de passe par e-mail** (volontaire : elle passe par un administrateur en ligne de commande).
8. **Données personnelles** : la console conserve les candidats des propositions (30 jours après leur clôture, puis purge automatique). Le **responsable de traitement** et le cadre juridique doivent être définis avec le ministère.
9. **Un seul serveur, un seul processus** : pas de haute disponibilité.

# Service d'attestation — la protection réelle de la moyenne et de la date de naissance

*Document technique — 1er novembre 2026. Complète `docs/CONFIDENTIALITE.md`.*

## 1. À quoi ça sert

Sans ce service, la vérification d'identité (numéro de table + date de naissance) se fait **sur le téléphone** : un visiteur compétent peut lire les fichiers publics et y retrouver la moyenne et la date de naissance de **tous** les candidats.

Avec ce service :

| | Sans le service (démonstration) | Avec le service |
|---|---|---|
| Fichiers publics | nom, résultat, **moyenne, date de naissance, mention, notes** | nom, résultat, établissement… **rien de sensible** |
| Qui compare numéro + date ? | le téléphone | le serveur |
| Lire tous les détails d'un coup | possible (fichiers publics) | **impossible** : il faut le bon numéro **et** la bonne date |
| Deviner une date au hasard | sans limite | **5 essais par numéro** puis pause de 15 min ; 30 échecs par adresse en 10 min |
| Si le service s'arrête | — | on voit toujours si l'on est admis ; seule l'attestation attend |

## 2. Le circuit

```
Fichier Excel ─► console de publication ─► « npm run separer »
                                              ├─► public/  (sans détails sensibles) ─► site public (OVH)
                                              └─► prive/   (le coffre)              ─► serveur du service (VPS)

Candidat ─► site public : « suis-je admis(e) ? »                (rapide, jamais saturé)
        └─► service     : numéro de table + date de naissance ─► moyenne, mention, date et lieu de naissance
```

## 3. Ce qui est déjà fait et testé

- `attestation/serveur.mjs` : le service (aucune dépendance npm), `attestation/lib/coffre.mjs` (données en mémoire, comparaison d'identité), `attestation/lib/limiteur.mjs` (limite des essais).
- `npm run separer` : coupe les données en deux dossiers sans toucher aux originaux.
- Le site : si `data/exams.json` contient `"attestationService": { "url": "https://…" }`, la fenêtre d'identité interroge le service. **Sans cette ligne, rien ne change** (mode démonstration actuel).
- 10 tests automatiques + un essai complet réalisé (séparation, démarrage du service, saisie d'un candidat dans le navigateur, fichiers publics vérifiés sans données sensibles).

## 4. Propriétés de sécurité

- **Même réponse** si le numéro n'existe pas ou si la date est fausse, et même durée (au moins 250 ms) : on ne peut pas savoir si un numéro existe.
- **Aucun cache** (`Cache-Control: no-store`), **une seule origine autorisée** (CORS), corps de requête limité à 2 Ko, rien de personnel dans les journaux.
- Le conteneur est en lecture seule, sans privilège, et les données privées sont montées en lecture seule.

## 5. Limites à connaître (honnêtement)

1. **Une date de naissance reste un secret faible** : 5 essais / 15 min par numéro rend le hasard impraticable, mais **quelqu'un qui connaît déjà la date de naissance d'un camarade** (ce n'est pas un secret entre élèves) peut ouvrir son attestation. Le vrai remède est un **code secret imprimé sur la convocation** (à décider avec le ministère ; le service est prêt à l'accueillir, ce serait un troisième champ).
2. **Blocage volontaire d'un candidat** : un malveillant peut épuiser les 5 essais d'un numéro pour empêcher son propriétaire d'ouvrir son attestation pendant 15 minutes. Son résultat (admis/ajourné) reste visible ; c'est un compromis assumé.
3. **La page de vérification d'un QR code** (`#/verif`) utilise encore les données publiques : elle devra aussi passer par le service avant activation réelle.
4. **Hors-ligne** : l'attestation n'est plus consultable sans réseau (le résultat, lui, oui).
5. **Mémoire** : le service garde tout en mémoire (7 000 fiches de démonstration ≈ 0,6 Mo) ; un redémarrage remet les compteurs d'essais à zéro.
6. **Non audité** : comme la console, il faut un audit indépendant avant tout usage officiel.

## 6. Mise en service (quand le VPS existe)

1. Produire les deux dossiers : `npm run separer -- --sortie ./separe`.
2. Copier `separe/prive/` dans `console/deploiement/prive/` sur le serveur.
3. Dans `console/deploiement/.env`, renseigner `SITE_PUBLIC_URL` et `ATTESTATION_DOMAINE` (un nom de domaine qui pointe vers le serveur).
4. Lancer : `docker compose --profile attestation up -d --build`.
5. Vérifier : `https://<ATTESTATION_DOMAINE>/sante` doit répondre `{"ok":true}`.
6. Publier sur le site le dossier `separe/public/data/` **en y ajoutant** dans `exams.json` : `"attestationService": { "url": "https://<ATTESTATION_DOMAINE>" }`.
7. Vérifier dans un navigateur : les fichiers `data/…/numeros/*.json` ne contiennent plus `average` ni `birthDate`.

> ⚠️ L'image Docker n'a pas pu être construite dans l'environnement de développement : le premier `docker compose build` sur le serveur est la première vraie vérification.

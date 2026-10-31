# Guide de publication des résultats — Ndeze Natidja

*Pour la personne chargée de mettre les résultats en ligne (technicien de publication).*
*Version du 31 octobre 2026 — outil d'import v1.*

Ce guide explique, étape par étape, comment passer d'un **tableau Excel** de résultats à un **site à jour**. Chaque étape est vérifiée par l'outil : il est impossible de publier un fichier contenant une erreur.

---

## 0. Avant de commencer

**À installer une seule fois sur l'ordinateur de publication :**
- **Node.js** (version « LTS », gratuit, nodejs.org) ;
- le **dossier du projet** (récupéré par la personne qui gère le dépôt).

Puis, dans un terminal ouvert dans le dossier `source/` du projet :

```bash
npm install
```

> ⚠️ **Données personnelles.** Les vrais résultats concernent des candidats, souvent mineurs.
> **Ne jamais** déposer le fichier Excel sur un dossier public, par e-mail non protégé ou sur GitHub
> *public*. Voir la section 8.

---

## 1. Obtenir le modèle Excel

```bash
npm run modele -- --session bac-2026
```

Le fichier créé est `source/modeles/modele-resultats-bac-2026.xlsx` (idem pour `bepc-2026`).
Il contient trois feuilles :
- **Résultats** : le tableau à remplir (listes déroulantes pour *Île*, *Résultat*, *Mention*, *Série*) ;
- **Mode d'emploi** : les règles de remplissage ;
- **Listes** : les valeurs autorisées.

## 2. Remplir le tableau

Une ligne par candidat. Colonnes obligatoires : **N° de table, Nom, Prénom, Île, Résultat, Moyenne** (et **Série** pour le Bac).
- Le **N° de table** est unique et se termine par au moins 3 chiffres (ex. `BAC-26-00142`).
- La **Mention** ne concerne que les *Admis*.
- La **Moyenne** est comprise entre 0 et 20 (la virgule est acceptée).
- *(Facultatif)* Notes par matière : ajouter des colonnes nommées `Mathématiques (coef 4)`, `Français (coef 3)`…
- Format du fichier : `.xlsx` ou `.csv`.

## 3. VÉRIFIER le fichier (sans rien publier)

```bash
npm run import -- chemin/vers/mon-fichier.xlsx --session bac-2026 --dry-run
```

L'outil affiche :
- ✔ le nombre de candidats valides et un résumé (admis, second groupe, ajournés, par île) ;
- ⚠ des **avertissements** à lire (ex. « admis avec une moyenne inférieure à 10 ») ;
- ✖ des **erreurs bloquantes**, avec le **numéro de ligne** Excel et la correction attendue.

Corriger le fichier, relancer la commande, jusqu'à ne plus avoir d'erreur. **Tant qu'il y a une erreur, rien n'est jamais modifié.**

## 4. Publier les données

Même commande, sans `--dry-run` :

```bash
npm run import -- chemin/vers/mon-fichier.xlsx --session bac-2026
```

L'outil :
1. remplace les fichiers de résultats de la session ;
2. met à jour les chiffres (total, admis, taux…) ;
3. **sauvegarde automatiquement l'ancienne version** dans `source/backups/`.

## 5. Reconstruire le site

```bash
npm run publish-site
```

## 6. Mettre en ligne

Selon l'organisation retenue : envoi des fichiers sur l'hébergeur (voir section 8 pour les données réelles), puis, côté hébergeur OVH, bouton **Déployer** si le déploiement passe par Git. Vérifier ensuite le site (Ctrl+F5).

## 7. En cas d'erreur : revenir en arrière

Lister les sauvegardes, puis restaurer celle qu'on veut :

```bash
npm run restaurer -- --session bac-2026
npm run restaurer -- --session bac-2026 --depuis bac-2026-2026-10-31T19-30-42
npm run publish-site
```

La version qu'on remplace est elle-même sauvegardée : on peut toujours annuler une restauration.

## 8. Données réelles : précautions indispensables

- Le projet actuel est relié à **GitHub**, qui conserve **tout l'historique**, même après suppression d'un fichier.
  Pour de vrais résultats, soit utiliser un **dépôt privé** dont l'accès est strictement contrôlé, soit **envoyer les fichiers directement** sur l'hébergeur (FTP sécurisé), sans passer par Git.
- Conserver le fichier Excel original dans un espace **chiffré et à accès restreint**, et le supprimer après la période de contestation.
- Ne jamais envoyer le fichier par messagerie grand public.
- Le responsable du traitement de ces données est l'autorité organisatrice de l'examen : elle doit valider ce circuit.

---

## Check-list du jour J

**La veille**
- [ ] Fichier final reçu et vérifié avec `--dry-run` (aucune erreur, avertissements relus avec le responsable)
- [ ] Répétition complète faite sur une copie : import → build → mise en ligne → vérification
- [ ] Dernière sauvegarde repérée (`npm run restaurer -- --session …`)
- [ ] Annonce publique : *installez l'application avant l'heure de publication*

**Au moment de la publication**
- [ ] Import réel, puis `npm run publish-site`
- [ ] Mise en ligne, Ctrl+F5, essai avec 3 numéros de table connus (un admis, un second groupe, un ajourné)
- [ ] Contrôle d'un QR code d'attestation

**Après**
- [ ] Surveiller le site et les messages de signalement
- [ ] Corrections : corriger la ligne dans Excel, ré-importer, republier (les téléphones voient la correction en quelques minutes)
- [ ] Conserver les sauvegardes jusqu'à la fin de la période de contestation

---

## Commandes utiles (aide-mémoire)

| Besoin | Commande (dans `source/`) |
|---|---|
| Créer le modèle Excel | `npm run modele -- --session bac-2026` |
| Vérifier un fichier | `npm run import -- fichier.xlsx --session bac-2026 --dry-run` |
| Publier les données | `npm run import -- fichier.xlsx --session bac-2026` |
| Exporter les données actuelles vers Excel | `npm run export:resultats -- --session bac-2026` |
| Lister / restaurer les sauvegardes | `npm run restaurer -- --session bac-2026 [--depuis nom]` |
| Reconstruire le site | `npm run publish-site` |
| Lancer les tests | `npm test` |

*Cet outil en ligne de commande est la première brique. Un espace de publication web sécurisé (connexion, double authentification, validation à deux personnes) pourra s'appuyer dessus.*

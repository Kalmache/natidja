# Confidentialité des résultats — ce qui est public, ce qui ne l'est pas

*Document de travail — 1er novembre 2026. À valider avec l'autorité organisatrice et son conseil juridique.*

## 1. Le principe

Les résultats d'examen concernent des jeunes, souvent mineurs. Le site doit répondre à une question simple — « suis-je admis(e) ? » — **sans devenir un annuaire** où n'importe qui parcourt des noms, des dates de naissance et des moyennes.

| Information | Visible par tout visiteur | Après vérification de l'identité |
|---|---|---|
| Nom, prénom | oui, **uniquement après une recherche** | oui |
| Résultat (admis / second groupe / ajourné) | oui | oui |
| Établissement, île, série | oui | oui |
| Numéro de table | non | oui |
| Mention | non | oui |
| Moyenne, notes par matière | non | oui |
| Date et lieu de naissance | non | oui |
| Liste de candidats sans avoir cherché | **non** (l'accueil ne montre que des statistiques) | — |

**Vérification d'identité** : pour ouvrir l'attestation, la personne saisit son **numéro de table** et sa **date de naissance**. Dix tentatives au hasard ne suffisent pas : après 5 erreurs, une pause de 20 secondes est imposée.

**Statistiques et classement** : l'accueil montre des chiffres nationaux et le classement des meilleurs établissements (taux de réussite). Aucun nom de candidat n'y figure.

## 2. ⚠️ Ce que cette première version protège… et ce qu'elle ne protège pas

La vérification d'identité se fait **sur l'appareil du visiteur**, et les fichiers de résultats publiés contiennent encore, pour chaque candidat, la moyenne et la date de naissance. Autrement dit :

- ✅ un visiteur ordinaire, un parent, un journaliste qui utilise l'application **ne voit pas** ces informations ;
- ✅ aucune liste de noms n'est offerte ; les captures d'écran de l'attestation sont celles que le candidat choisit de faire ;
- ❌ une personne **techniquement compétente** peut lire les fichiers publiés et y retrouver ces informations pour tous les candidats.

C'est donc une **protection d'affichage**, adaptée à une démonstration. Elle ne suffit pas pour de vraies données de mineurs.

## 3. La protection réelle (étape suivante, à décider)

**Principe : les informations sensibles ne doivent plus figurer dans les fichiers publics.** Le site public reste un ensemble de fichiers (rapide, jamais saturé) avec le strict minimum : nom, résultat, établissement. Les détails (moyenne, date de naissance, mention, notes) sont servis par un **petit service séparé** qui répond uniquement à une demande précise :

```
 Visiteur ──► SITE PUBLIC (fichiers)  : nom, résultat, établissement      ← ne sature jamais
          └─► petit service privé     : numéro de table + date de naissance → attestation complète
                                         • limite le nombre d'essais (par numéro de table et par adresse)
                                         • peut ralentir ou s'interrompre SANS empêcher de savoir si l'on est admis
```

**Pourquoi pas un simple chiffrement par la date de naissance ?** Parce qu'il y a environ 2 000 dates possibles pour une classe d'âge : un attaquant les essaierait toutes en quelques minutes **hors ligne**. Un service qui limite les essais est la seule façon de rendre ce secret réellement protecteur. Mieux encore : un **code secret imprimé sur la convocation** par l'autorité organisatrice, que personne d'autre ne connaît.

**Conséquences à accepter :**
- un second composant à héberger (même serveur que la console) et à surveiller ;
- les détails ne sont pas disponibles hors ligne ;
- l'autorité organisatrice doit décider : exiger ou non un code sur la convocation, durée de conservation, hébergement.

## 4. Choix qui appartiennent à l'autorité organisatrice

Réglables sans toucher au code, dans `data/exams.json` :

```json
"classement": { "visible": true, "top": 5, "topStatistiques": 10, "minCandidats": 20 }
```

- **`visible`** : afficher ou non le classement des établissements ;
- **`top`** / **`topStatistiques`** : combien d'établissements sur l'accueil / sur la page Statistiques ;
- **`minCandidats`** : un établissement n'est classé qu'au-delà de ce nombre de candidats (sinon deux ou trois élèves suffiraient à faire un « 100 % »).

**Précautions de ce classement** : le taux est calculé sur les candidats de l'établissement ; les **candidats libres sont exclus** (ils ne sont rattachés à aucun établissement et pourraient servir à faire monter artificiellement un taux). Les données qui l'alimentent passent par la console : dépôt par une personne, approbation par une autre, journal d'audit.

**À décider avec le ministère** : afficher ou non un classement ; afficher seulement les meilleurs établissements ou tous ; afficher ou non la mention publiquement ; exiger ou non un code sur la convocation.

---
**Mise à jour (1er nov. 2026)** — la protection réelle décrite au §3 est maintenant **écrite et testée** (service d'attestation, séparation des données). Elle reste **désactivée** tant qu'elle n'est pas hébergée : voir `docs/SERVICE-ATTESTATION.md`.

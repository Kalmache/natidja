# Mettre la console de publication en ligne — guide pas à pas

*Document de travail — 31 octobre 2026. Écrit pour être suivi par quelqu'un qui n'a jamais administré un serveur. Chaque étape dit **pourquoi** on la fait, **quoi taper**, et **comment vérifier** que c'est réussi.*

> **État de ce kit.** Les programmes (envoi vers GitHub, console) sont couverts par 77 tests automatiques. Le fichier `Dockerfile` et `docker-compose.yml` n'ont **pas pu être construits** dans l'environnement où ils ont été écrits (pas de moteur Docker disponible) : j'ai vérifié que la console démarre avec uniquement les modules de production, c'est tout. **La première installation sur un vrai serveur est donc le test final.** Le guide indique, en fin de document, les erreurs probables et leur remède.

---

## 0. Ce qu'on met en place

```
 Responsable ──► https://console.mmbt.fr ──► CONSOLE (petit serveur à vous)
 (2 personnes)     connexion + code 2FA         │ 1. vérifie le fichier Excel
                                                │ 2. un 2e responsable approuve
                                                │ 3. publie (sauvegarde de l'ancienne version)
                                                ▼
                                          GitHub (dépôt natidja)       ← 1 commit « Résultats bac-2026 »
                                                │ webhook
                                                ▼
                                          OVH déploie ──► SITE PUBLIC (fichiers, aucune connexion)
```

**À retenir** : le site public ne dépend **jamais** de la console. Si la console tombe en panne ou est attaquée, les élèves consultent leurs résultats comme avant : le site public reste un ensemble de fichiers.

La chaîne devient entièrement automatique : après l'approbation du second responsable, plus aucun clic « Déployer » dans OVH.

---

## 1. Ce qu'il vous faut

| Élément | Pourquoi | Remarque |
|---|---|---|
| Un **petit serveur** (VPS) Linux, Ubuntu 24.04 | Il fait tourner la console 24 h/24 | Quelques euros par mois. **Vérifiez le prix actuel sur ovhcloud.com** : OVHcloud a relevé ses tarifs de VPS en avril 2026 d'après [la presse spécialisée](https://next.ink/225720/ovhcloud-augmente-fortement-le-prix-de-ses-vps-2026-et-ipv4/), je n'ai donc pas de chiffre fiable à vous donner |
| Un **nom d'adresse** pour la console, ex. `console.mmbt.fr` | Pour avoir une adresse sécurisée (HTTPS) | Se crée dans la gestion de votre domaine `mmbt.fr` |
| Votre **compte GitHub** | Reçoit les résultats publiés | Déjà en place |
| Le **déploiement automatique OVH** (webhook) | Met le site à jour tout seul | Étape 9 |

### ⚠ À décider avec le ministère AVANT de mettre de vraies données
La console conserve temporairement (30 jours, puis purge automatique) les fichiers déposés, qui contiennent des **données personnelles de candidats, souvent mineurs**. Où se trouve le serveur, et qui en est responsable, n'est **pas** une décision technique : c'est celle de l'autorité organisatrice. Tant que les données sont fictives (démonstration), la question ne se pose pas.

---

## 2. Commander et sécuriser le serveur

1. Commandez un VPS **Ubuntu 24.04** (gamme d'entrée suffisante : la console est légère). Choisissez un centre de données en **France ou dans l'Union européenne**.
2. **Connexion par clé** plutôt que par mot de passe : lors de la commande, ajoutez votre clé SSH publique. *(Une clé SSH est une paire de fichiers : un cadenas public que vous donnez au serveur, une clé privée qui reste sur votre ordinateur. Beaucoup plus sûr qu'un mot de passe.)* Si vous n'en avez pas : sur votre ordinateur, `ssh-keygen -t ed25519`, puis donnez le contenu du fichier `.pub`.
3. Connectez-vous au serveur (remplacez l'adresse par celle reçue d'OVH) :

```bash
ssh ubuntu@ADRESSE_IP_DU_SERVEUR
```

4. Mettez le serveur à jour, puis activez le pare-feu en n'ouvrant que le nécessaire :

```bash
sudo apt update && sudo apt upgrade -y
```

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw --force enable
```

*Le port 80 sert uniquement à obtenir le certificat HTTPS ; le 443 est l'accès à la console ; OpenSSH est votre accès d'administration.*

5. Activez les mises à jour de sécurité automatiques :

```bash
sudo apt install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades
```

**Vérification** : `sudo ufw status` doit lister OpenSSH, 80 et 443 comme « ALLOW ».

---

## 3. Donner une adresse à la console (DNS)

Dans la zone DNS de `mmbt.fr` (espace client OVH → Noms de domaine → `mmbt.fr` → Zone DNS), ajoutez un enregistrement :

| Type | Sous-domaine | Cible |
|---|---|---|
| `A` | `console` | l'adresse IP de votre serveur |

**Vérification** (depuis votre ordinateur, après quelques minutes) : `ping console.mmbt.fr` doit répondre avec l'IP du serveur. *Si ce n'est pas encore le cas, attendez : la propagation peut prendre jusqu'à quelques heures. Ne passez pas à la suite avant : le certificat HTTPS en dépend.*

---

## 4. Installer Docker et récupérer le code

*Docker est un outil qui fait tourner la console dans une « boîte » isolée : même résultat sur n'importe quel serveur, et mise à jour facile.*

```bash
sudo apt install -y docker.io docker-compose-v2 git && sudo usermod -aG docker $USER
```

*(Ce sont les paquets d'Ubuntu lui-même : plus sûrs sur une version récente d'Ubuntu, comme la 26.04, que le script `get.docker.com`, qui ne la gère pas toujours encore.)*

Déconnectez-vous puis reconnectez-vous en SSH (pour que le droit s'applique), puis récupérez le code :

```bash
git clone https://github.com/Kalmache/natidja.git
```

```bash
cd natidja/source/console/deploiement
```

**Vérification** : `docker --version` et `docker compose version` affichent un numéro de version, et `docker run --rm hello-world` affiche « Hello from Docker! ».

---

## 5. Créer le jeton GitHub (la clé qui permet à la console d'envoyer les résultats)

⚠ C'est **le secret le plus sensible** de l'installation : qui le possède peut modifier votre dépôt. On le limite donc au strict minimum.

1. GitHub → votre photo → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Token name** : `console-natidja`.
3. **Expiration** : 90 jours *(vous devrez le renouveler : notez la date)*.
4. **Repository access** : **Only select repositories** → choisissez **uniquement** `natidja`.
5. **Permissions → Repository permissions → Contents : Read and write.** Aucune autre permission.
6. **Generate token** puis **copiez-le tout de suite** (il ne sera plus affiché).

> Si un jour vous protégez la branche `main` (exiger une revue avant tout envoi), ce jeton ne pourra plus publier : il faudra l'autoriser explicitement ou utiliser une branche dédiée.

---

## 6. Régler la console

Toujours dans `natidja/source/console/deploiement` :

```bash
cp .env.exemple .env && chmod 600 .env && nano .env
```

Remplissez : `CONSOLE_DOMAINE=console.mmbt.fr`, `GITHUB_REPO=Kalmache/natidja`, `GITHUB_BRANCHE=main`, et collez le jeton après `GITHUB_TOKEN_PUBLICATION=`. Enregistrez (`Ctrl+O`, Entrée, `Ctrl+X`).

*Le fichier `.env` n'est jamais envoyé sur GitHub (il est ignoré) et n'est lisible que par vous (`chmod 600`).*

---

## 7. Copier les résultats actuels dans la console

La console travaille sur sa propre copie des résultats publiés (pour pouvoir comparer « avant / après »). On l'initialise une seule fois avec ce que contient le dépôt :

```bash
docker compose run --rm --no-deps -v "$(realpath ../../../data)":/seed:ro --entrypoint sh console -c 'cp -r /seed/. /donnees/'
```

---

## 8. Démarrer

```bash
docker compose up -d --build
```

*La première fois, la construction prend quelques minutes.* Puis :

```bash
docker compose ps
```

```bash
docker compose logs console
```

**Vérifications**
- `ps` montre `console` et `caddy` à l'état « running » (console passe à « healthy » après quelques secondes).
- Les journaux de `console` contiennent : `Mise en ligne automatique : Kalmache/natidja (branche main)`. S'ils disent « désactivée », le jeton ou le dépôt n'est pas lu : revoyez l'étape 6.
- `https://console.mmbt.fr` affiche la page de connexion avec un cadenas. (Le premier chargement peut attendre quelques secondes : c'est l'obtention du certificat.)

---

## 9. Créer les comptes

Les comptes se créent **uniquement ici, sur le serveur** (il n'existe volontairement aucune page de création de compte à attaquer). Minimum : une personne qui **dépose**, une **autre** qui **approuve**, et un administrateur qui lit le journal.

```bash
docker compose exec console node console/utilisateurs.mjs creer --nom amina --roles preparateur
```

```bash
docker compose exec console node console/utilisateurs.mjs creer --nom moussa --roles approbateur
```

```bash
docker compose exec console node console/utilisateurs.mjs creer --nom zaid --roles admin
```

Chaque commande affiche **une seule fois** un mot de passe temporaire et un QR code. **Remettez-les en main propre** à la personne : elle scanne le QR avec une application d'authentification (Google Authenticator, Microsoft Authenticator, Aegis, FreeOTP), puis se connecte et **choisit son propre mot de passe**.

**Nom d'affichage.** Pour que l'écran indique « Directeur Kabir Illiassa » au lieu de l'identifiant, ajoutez `--affichage "Directeur Kabir Illiassa"` à la création, ou, pour un compte existant :

```bash
docker compose exec console node console/utilisateurs.mjs affichage --nom amina --texte "Directeur Kabir Illiassa"
```

Ce titre ne sert qu'à l'affichage (liste des propositions, « déposée par », « approuvée par »). L'identifiant de connexion reste la référence pour la règle des deux personnes et pour le journal d'audit. Un texte vide (`--texte ""`) retire le titre.

Autres commandes : `lister`, `reinitialiser --nom X`, `desactiver --nom X` (à utiliser dès qu'une personne quitte son poste).

---

## 10. Relier OVH à GitHub (déploiement automatique)

*Sans cette étape, tout marche, mais il faut encore cliquer sur « Déployer » dans OVH après chaque publication.*

1. Espace client OVH → **Web Cloud → Hébergements** → votre hébergement → onglet **Multisite**.
2. Dans la ligne de votre site, menu **⋮** → **Configurer Git** (c'est déjà fait pour votre dépôt). Au bas du formulaire, la section **« Configuration du déploiement automatique »** affiche une **URL de webhook** : copiez-la.
3. GitHub → dépôt `natidja` → **Settings → Webhooks → Add webhook** : **Payload URL** = l'URL copiée ; **Content type** = `application/json` ; événement : **Just the push event** ; **Add webhook**.

*Source : [documentation OVHcloud « Configurer et utiliser Git avec son hébergement web »](https://docs.ovhcloud.com/fr/guides/web-cloud/web-hosting/git-integration-webhosting).*

**Vérification** : GitHub → Settings → Webhooks → votre webhook → « Recent Deliveries » : une coche verte après chaque envoi.

---

## 11. Répétition générale (à faire avant de montrer à qui que ce soit)

⚠ **Cette répétition modifie vraiment le site public.** Faites-la tant que les données sont fictives. Pour revenir en arrière après coup : GitHub → l'historique du dépôt → le commit « Résultats bac-2026 : publication … » → **Revert**.

1. Sur votre ordinateur, générez un fichier d'essai : `cd source && npm run modele` (crée un modèle Excel à remplir).
2. Connectez-vous avec le compte **préparateur** → déposez le fichier. Corrigez les erreurs affichées (la console donne le numéro de ligne).
3. Déconnectez-vous, connectez-vous avec le compte **approbateur** → relisez le « avant / après » → **Approuver et publier**.
4. Dans la proposition, le bloc vert doit dire « *Envoyée vers le site public… (modification abc1234)* ».
5. Dans GitHub, un nouveau commit « Résultats bac-2026 : publication … » est apparu. Dans OVH → Multisite, le **dernier déploiement** est récent. Rechargez le site (Ctrl+F5) : les chiffres ont changé.
6. Notez le temps total, de l'approbation à l'affichage : c'est la donnée à annoncer au ministère.

---

## 12. Exploitation au quotidien

| Tâche | Commande / action |
|---|---|
| Voir ce qui se passe | `docker compose logs -f console` |
| Mettre la console à jour | `cd natidja && git pull`, puis dans `source/console/deploiement` : `docker compose up -d --build` |
| Redémarrer | `docker compose restart console` |
| **Renouveler le jeton GitHub** (tous les 90 jours) | créer un nouveau jeton (étape 5), remplacer la ligne dans `.env`, puis `docker compose up -d` |
| Sauvegarder la console (comptes, journal d'audit, propositions) | `docker run --rm -v deploiement_console-data:/d -v "$PWD":/s alpine tar czf /s/console-data.tar.gz -C /d .` puis copier l'archive **hors du serveur** |
| Surveiller | un service de supervision gratuit (ex. UptimeRobot) qui prévient si `https://console.mmbt.fr` ne répond plus |

*Le nom exact du volume peut varier : `docker volume ls` le montre.*

---

## 13. Dépannage

| Symptôme | Cause probable | Remède |
|---|---|---|
| La page ne s'ouvre pas / pas de cadenas | Le nom n'est pas encore relié au serveur, ou le port 80/443 est fermé | Étape 3 (DNS) et `sudo ufw status` ; `docker compose logs caddy` explique l'échec du certificat |
| « Mise en ligne : échec — GitHub **401** » | Jeton expiré ou mal copié | Étape 5, puis remplacer dans `.env`, `docker compose up -d`, et **Réessayer la mise en ligne** dans la proposition |
| « … GitHub **403** » ou « **404** » | Le jeton n'a pas la permission *Contents : Read and write*, ou ne couvre pas le dépôt ; ou nom du dépôt/branche faux | Reprendre l'étape 5 ; vérifier `GITHUB_REPO` et `GITHUB_BRANCHE` |
| « … GitHub **409** / **422** » répété | Quelqu'un d'autre a modifié le dépôt pendant l'envoi | La console réessaie seule 3 fois ; sinon cliquer sur **Réessayer la mise en ligne** |
| Le commit est sur GitHub mais le site ne change pas | Le webhook OVH n'est pas en place ou a échoué | Étape 10 ; OVH → Multisite → informations du dernier déploiement |
| « Une autre publication a eu lieu depuis le dépôt de ce fichier » | Un autre fichier a été publié entre-temps | Déposer le fichier à nouveau, ou confirmer le remplacement en toute connaissance |
| `docker compose build` échoue | Premier essai sur un vrai serveur : c'est le seul élément non testé en amont | Copier le message d'erreur : il se corrige en quelques minutes |

---

## 14. Ce que ce dispositif garantit… et ne garantit pas

**Garanti (et vérifié par des tests automatiques)**
- Rien n'est publié sans qu'une **seconde personne** ait approuvé ; le serveur l'impose.
- Chaque publication laisse une **sauvegarde** de l'ancienne version et un **commit** daté, annulable.
- Un échec d'envoi vers le site **n'annule pas** la publication locale : il est affiché, enregistré dans le journal, et peut être relancé.
- Le jeton GitHub **n'apparaît jamais** dans les journaux ni dans les messages d'erreur ; il est limité à un seul dépôt.
- Le site public ne dépend pas de la console.

**Une conséquence à connaître : le dépôt GitHub devient le canal de publication**
- **Avec de vraies données, le dépôt doit être PRIVÉ** (OVH sait déployer un dépôt privé avec une clé SSH, voir sa documentation). Un dépôt public afficherait à tous les résultats **et leur historique complet**.
- Même privé, **l'historique Git conserve toutes les versions successives**, y compris d'anciennes données personnelles : à examiner avec le ministère (durées de conservation, droit à l'effacement) avant tout usage réel.
- **Pas de fuite avant l'heure** : une publication programmée n'est envoyée vers GitHub **qu'à l'heure prévue** (c'est la console qui garde le fichier d'ici là), donc rien n'est visible avant.

**Non garanti — à traiter avant de vraies données**
- **Aucun audit de sécurité indépendant** n'a été réalisé (voir `docs/CONSOLE.md`, section limites). Indispensable avant un usage officiel.
- **Un seul serveur** : pas de haute disponibilité. Une panne de la console n'arrête pas le site, mais empêche de publier tant qu'elle dure.
- **Le jeton GitHub est un secret exposé sur le serveur** : qui prend le contrôle du serveur peut modifier le dépôt. Mesures : serveur à jour, connexion SSH par clé uniquement, jeton limité et renouvelé.
- **L'application Android embarque une copie des résultats** au moment de sa fabrication : elle ne reçoit pas encore les nouvelles publications. Pour un usage réel, elle doit lire les données en ligne (chantier à part).
- **Chaque publication relance la fabrication de l'APK** sur GitHub (le workflow surveille le dossier `data/`) : sans conséquence, mais consomme du temps de calcul GitHub.
- Le **cadre de protection des données** (hébergement, responsable du traitement, durées) reste à fixer avec le ministère.

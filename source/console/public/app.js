// ============================================================================
// console/public/app.js – l'interface de la console de publication
// ----------------------------------------------------------------------------
// SÉCURITÉ : cette page n'insère JAMAIS de texte reçu du serveur sous forme de HTML
// (pas de innerHTML). Tout passe par textContent via la fonction h() : même si un
// nom de candidat contenait du code, il serait affiché comme du simple texte.
// ============================================================================
'use strict'

const racine = document.getElementById('app')

/** Crée un élément : h('div', { class: 'carte' }, 'texte', autreElement) */
function h(balise, attrs, ...enfants) {
  const el = document.createElement(balise)
  for (const [cle, valeur] of Object.entries(attrs ?? {})) {
    if (cle === 'class') el.className = valeur
    else if (cle.startsWith('on')) el.addEventListener(cle.slice(2), valeur)
    else if (valeur !== false && valeur != null) el.setAttribute(cle, valeur === true ? '' : valeur)
  }
  for (const e of enfants.flat(Infinity)) if (e != null && e !== false) el.append(e instanceof Node ? e : document.createTextNode(String(e)))
  return el
}

let etat = { etape: 'aucune', csrf: null, utilisateur: null }
let vue = { onglet: 'propositions', id: null }
let message = null // { type, texte } affiché en haut du contenu
let dernierNom = '' // l'identifiant tapé : on le garde si le mot de passe est refusé (pas besoin de le retaper)

// ---------------------------------------------------------------- appels au serveur
async function api(methode, chemin, corps, { brut = false, entetes = {} } = {}) {
  const options = { method: methode, headers: { ...entetes }, credentials: 'same-origin' }
  if (etat.csrf) options.headers['X-CSRF-Token'] = etat.csrf
  if (corps !== undefined) {
    if (brut) options.body = corps
    else { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(corps) }
  }
  const r = await fetch(chemin, options)
  let json = null
  try { json = await r.json() } catch { /* pas de JSON */ }
  if (r.status === 401 && etat.etape === 'ok') { // session expirée
    etat = { etape: 'aucune', csrf: null, utilisateur: null }
    message = { type: 'info', texte: 'Votre session a expiré : reconnectez-vous.' }
    afficher()
  }
  return { statut: r.status, ok: r.ok, json }
}
async function recharger() {
  const r = await api('GET', '/api/etat')
  etat = { etape: r.json?.etape ?? 'aucune', csrf: r.json?.csrf ?? null, utilisateur: r.json?.utilisateur ?? null }
  afficher()
}
const dire = (type, texte) => { message = { type, texte }; afficher() }
const roles = () => etat.utilisateur?.roles ?? []
const date = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR') : '—')
const STATUTS = { proposee: 'À approuver', planifiee: 'Programmée', publiee: 'Publiée', refusee: 'Refusée', annulee: 'Annulée', echec: 'Échec' }
const RESULTATS = { ADMIS: 'Admis', SECOND_GROUPE: 'Second groupe', AJOURNE: 'Ajourné' }
const badge = (s) => h('span', { class: `badge ${s}` }, STATUTS[s] ?? s)

// ---------------------------------------------------------------- écrans de connexion
function ecranConnexion() {
  const nom = h('input', { type: 'text', id: 'nom', autocomplete: 'username', required: true, autocapitalize: 'none', value: dernierNom })
  const mdp = h('input', { type: 'password', id: 'mdp', autocomplete: 'current-password', required: true })
  const form = h('form', { class: 'carte connexion', onsubmit: async (e) => {
    e.preventDefault()
    dernierNom = nom.value
    const r = await api('POST', '/api/connexion', { nom: nom.value, motDePasse: mdp.value })
    if (r.ok) { etat = { ...etat, etape: r.json.etape, csrf: r.json.csrf }; message = null; afficher() } else dire('erreur', r.json?.erreur ?? 'Connexion impossible.')
  } },
  h('h1', null, 'Console de publication'),
  h('p', { class: 'doux' }, 'Ndeze Natidja — accès réservé aux responsables des examens.'),
  message && h('div', { class: `message ${message.type}`, role: 'alert' }, message.texte),
  h('label', { for: 'nom' }, 'Identifiant'), nom,
  h('label', { for: 'mdp' }, 'Mot de passe'), mdp,
  h('p', null, h('button', { class: 'btn primaire', type: 'submit' }, 'Continuer')),
  h('p', { class: 'doux' }, 'Une seconde étape vous demandera le code à 6 chiffres de votre application d’authentification.'))
  return form
}

function ecranTotp() {
  const code = h('input', { type: 'text', id: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', pattern: '[0-9]{6}', required: true })
  return h('form', { class: 'carte connexion', onsubmit: async (e) => {
    e.preventDefault()
    const r = await api('POST', '/api/totp', { code: code.value })
    if (r.ok) { etat = { etape: r.json.etape, csrf: r.json.csrf, utilisateur: r.json.utilisateur }; message = null; afficher() } else { if (r.statut === 401 && /reconnectez/.test(r.json?.erreur ?? '')) etat = { etape: 'aucune', csrf: null, utilisateur: null }; dire('erreur', r.json?.erreur ?? 'Code refusé.') }
  } },
  h('h1', null, 'Vérification en deux étapes'),
  h('p', { class: 'doux' }, 'Ouvrez votre application d’authentification et saisissez le code à 6 chiffres affiché pour « Ndeze Natidja ».'),
  message && h('div', { class: `message ${message.type}`, role: 'alert' }, message.texte),
  h('label', { for: 'code' }, 'Code à 6 chiffres'), code,
  h('p', null, h('button', { class: 'btn primaire', type: 'submit' }, 'Valider')))
}

function formulaireMotDePasse({ force }) {
  const ancien = h('input', { type: 'password', id: 'ancien', autocomplete: 'current-password', required: true })
  const nouveau = h('input', { type: 'password', id: 'nouveau', autocomplete: 'new-password', required: true })
  const erreur = h('div') // l'erreur s'affiche ICI, sans redessiner le formulaire (on ne perd pas ce qui est saisi)
  return h('form', { class: force ? 'carte connexion' : 'carte', onsubmit: async (e) => {
    e.preventDefault()
    const r = await api('POST', '/api/mot-de-passe', { ancien: ancien.value, nouveau: nouveau.value })
    if (r.ok) { etat.etape = 'ok'; dire('succes', 'Mot de passe changé.') } else erreur.replaceChildren(h('div', { class: 'message erreur', role: 'alert' }, r.json?.erreur ?? 'Changement impossible.'))
  } },
  h('h2', null, force ? 'Choisissez votre mot de passe' : 'Changer mon mot de passe'),
  force && h('p', { class: 'doux' }, 'C’est votre première connexion : remplacez le mot de passe temporaire par un mot de passe personnel (12 caractères minimum, avec au moins 3 sortes de caractères).'),
  erreur,
  h('label', { for: 'ancien' }, 'Mot de passe actuel'), ancien,
  h('label', { for: 'nouveau' }, 'Nouveau mot de passe'), nouveau,
  h('p', null, h('button', { class: 'btn primaire', type: 'submit' }, 'Enregistrer')))
}

// ---------------------------------------------------------------- tableau de bord
function enTete() {
  return h('header', { class: 'entete' },
    h('strong', null, 'Console de publication · Ndeze Natidja'),
    h('div', { class: 'qui' }, `${etat.utilisateur.nom} (${roles().join(', ')})`,
      h('button', { class: 'btn', onclick: async () => { await api('POST', '/api/deconnexion', {}); etat = { etape: 'aucune', csrf: null, utilisateur: null }; message = null; afficher() } }, 'Se déconnecter')))
}
function onglets() {
  const liste = [['propositions', 'Propositions'], roles().includes('preparateur') && ['nouvelle', 'Nouvelle proposition'], ['sessions', 'Sessions'], roles().includes('admin') && ['journal', 'Journal d’audit'], ['compte', 'Mon compte']].filter(Boolean)
  return h('nav', { class: 'onglets' }, liste.map(([id, texte]) => h('button', { class: vue.onglet === id ? 'actif' : '', onclick: () => { vue = { onglet: id, id: null }; message = null; afficher() } }, texte)))
}
const bandeau = () => message && h('div', { class: `message ${message.type}`, role: 'alert' }, message.texte)

async function ecranPropositions() {
  const r = await api('GET', '/api/propositions')
  const liste = r.json ?? []
  return h('div', null, h('h2', null, 'Propositions de publication'),
    bandeau(),
    !liste.length ? h('p', { class: 'doux' }, 'Aucune proposition pour le moment.') :
      h('div', { class: 'carte' }, h('table', null,
        h('thead', null, h('tr', null, ['Date', 'Examen', 'Déposée par', 'Candidats', 'Statut', ''].map((t) => h('th', null, t)))),
        h('tbody', null, liste.map((p) => h('tr', null,
          h('td', null, date(p.creeLe)), h('td', null, p.session), h('td', null, p.auteur.nom), h('td', null, p.resume.apres.total), h('td', null, badge(p.statut)),
          h('td', null, h('button', { class: 'btn', onclick: () => { vue = { onglet: 'detail', id: p.id }; message = null; afficher() } }, 'Ouvrir'))))))))
}

function ecranNouvelle() {
  const choix = h('select', { id: 'session' })
  const fichier = h('input', { type: 'file', id: 'fichier', accept: '.xlsx,.csv', required: true })
  const sortie = h('div')
  api('GET', '/api/examens').then((r) => (r.json ?? []).forEach((s) => choix.append(h('option', { value: s.id }, `${s.titre} (${s.libelle})${s.statut === 'DRAFT' ? ' — nouvelle session, en attente de sa première publication' : ` — actuellement ${s.stats.total} candidats`}`))))
  const envoyer = async (e) => {
    e.preventDefault()
    const f = fichier.files[0]
    if (!f) return
    sortie.replaceChildren(h('p', { class: 'doux' }, 'Vérification en cours…'))
    const r = await api('POST', `/api/propositions?session=${encodeURIComponent(choix.value)}`, await f.arrayBuffer(), { brut: true, entetes: { 'Content-Type': 'application/octet-stream', 'X-Filename': encodeURIComponent(f.name) } })
    if (r.statut === 201) { vue = { onglet: 'detail', id: r.json.id }; dire('succes', 'Fichier vérifié : la proposition attend l’approbation d’un autre responsable.'); return }
    sortie.replaceChildren(
      h('div', { class: 'message erreur', role: 'alert' }, r.json?.erreur ?? 'Fichier refusé.'),
      r.json?.erreurs && h('div', { class: 'carte' }, h('h3', null, `${r.json.total} erreur(s) bloquante(s)`),
        h('table', null, h('thead', null, h('tr', null, ['Ligne', 'Colonne', 'Problème'].map((t) => h('th', null, t)))),
          h('tbody', null, r.json.erreurs.map((x) => h('tr', null, h('td', null, x.ligne || '—'), h('td', null, x.champ || '—'), h('td', null, x.message))))),
        r.json.total > r.json.erreurs.length && h('p', { class: 'doux' }, `… et ${r.json.total - r.json.erreurs.length} autres.`)))
  }
  return h('div', null, h('h2', null, 'Nouvelle proposition'), bandeau(),
    h('form', { class: 'carte', onsubmit: envoyer },
      h('p', { class: 'doux' }, 'Déposez le tableau Excel (.xlsx) ou CSV de résultats. Il est vérifié ligne par ligne ; rien n’est publié tant qu’un autre responsable ne l’a pas approuvé.'),
      h('label', { for: 'session' }, 'Examen'), choix,
      h('label', { for: 'fichier' }, 'Fichier de résultats'), fichier,
      h('p', null, h('button', { class: 'btn primaire', type: 'submit' }, 'Vérifier et proposer'))),
    sortie)
}

/** Les sessions (examen + année + édition) et la création de celle d'une nouvelle année. */
async function ecranSessions() {
  const r = await api('GET', '/api/examens')
  const liste = r.json ?? []
  const type = h('select', { id: 'type' }, h('option', { value: 'BAC' }, 'Baccalauréat (BAC)'), h('option', { value: 'BEPC' }, 'BEPC'))
  const annee = h('input', { type: 'number', id: 'annee', min: '2000', max: '2100', value: String(liste.length ? Math.max(...liste.map((s) => s.annee)) + 1 : new Date().getFullYear()), required: true })
  const genre = h('select', { id: 'genre' }, h('option', { value: 'PRINCIPALE' }, 'Session principale'), h('option', { value: 'RATTRAPAGE' }, 'Rattrapage'))
  const libelle = h('input', { type: 'text', id: 'libelle', maxlength: '40', placeholder: 'Ex. Juin 2027 (facultatif)' })
  const series = h('input', { type: 'text', id: 'series', value: (liste.find((s) => s.series?.length)?.series ?? ['A1', 'A4', 'C', 'D', 'G']).join(', ') })
  const zoneSeries = h('div', null, h('label', { for: 'series' }, 'Séries du Bac (séparées par des virgules)'), series)
  type.onchange = () => { zoneSeries.style.display = type.value === 'BAC' ? '' : 'none' }
  const erreur = h('div')
  const creer = async (e) => {
    e.preventDefault()
    const rep = await api('POST', '/api/sessions', { examType: type.value, year: Number(annee.value), genre: genre.value, libelle: libelle.value, ...(type.value === 'BAC' ? { series: series.value } : {}) })
    if (rep.statut === 201) return dire('succes', `Session « ${rep.json.id} » créée. Elle apparaîtra sur le site à la première publication de résultats.`)
    erreur.replaceChildren(h('div', { class: 'message erreur', role: 'alert' }, rep.json?.erreur ?? 'Création impossible.'))
  }
  const statut = (s) => (s.statut === 'DRAFT' ? 'Brouillon (pas encore publique)' : 'Publiée')
  return h('div', null, h('h2', null, 'Sessions d’examen'), bandeau(),
    h('div', { class: 'carte' }, h('table', null,
      h('thead', null, h('tr', null, ['Identifiant', 'Examen', 'Année', 'Édition', 'Statut', 'Candidats'].map((t) => h('th', null, t)))),
      h('tbody', null, liste.map((s) => h('tr', null, h('td', null, s.id), h('td', null, s.titre), h('td', null, s.annee), h('td', null, `${s.genre === 'RATTRAPAGE' ? 'Rattrapage' : 'Principale'} — ${s.libelle}`), h('td', null, statut(s)), h('td', null, s.stats.total)))))),
    h('form', { class: 'carte', onsubmit: creer },
      h('h3', null, 'Créer la session d’une nouvelle année'),
      h('p', { class: 'doux' }, 'La session est créée en brouillon : rien n’est publié et le public ne la voit pas. Elle apparaît sur le site, et devient la session affichée par défaut, à la première publication de résultats.'),
      erreur,
      h('label', { for: 'type' }, 'Examen'), type,
      h('label', { for: 'annee' }, 'Année'), annee,
      h('label', { for: 'genre' }, 'Édition'), genre,
      h('label', { for: 'libelle' }, 'Libellé affiché (facultatif)'), libelle,
      zoneSeries,
      h('p', null, h('button', { class: 'btn primaire', type: 'submit' }, 'Créer la session'))))
}

const ligneChiffre = (titre, valeur) => h('div', { class: 'chiffre' }, h('strong', null, valeur), h('span', null, titre))

// Noms lisibles des champs d'un candidat (affichés dans la liste des lignes modifiées).
const NOMS_CHAMPS = { lastName: 'Nom', firstName: 'Prénom', birthDate: 'Date de naissance', birthPlace: 'Lieu de naissance', gender: 'Sexe', series: 'Série', center: 'Centre', school: 'Établissement', island: 'Île', islandId: 'Île (code)', status: 'Résultat', mention: 'Mention', average: 'Moyenne' }
const nomChamp = (c) => (c.startsWith('note:') ? `Note ${c.slice(5)}` : NOMS_CHAMPS[c] ?? c)
const valeur = (v) => (v === null || v === undefined ? '—' : (RESULTATS[v] ?? String(v)))

/** Carte « Lignes modifiées » : ce que le relecteur doit vraiment vérifier. */
function modificationsCarte(m) {
  if (!m) return null // proposition créée avant l'ajout de cette fonction
  const total = m.ajoutes + m.supprimes + m.modifies
  if (!total) return h('div', { class: 'carte' }, h('h3', null, 'Lignes modifiées : 0'), h('p', { class: 'doux' }, 'Ce fichier est identique à la version publiée : aucun candidat ne change.'))
  return h('div', { class: 'carte' }, h('h3', null, `Lignes modifiées : ${total}`),
    h('p', { class: 'doux' }, `${m.modifies} modifié(s) · ${m.ajoutes} ajouté(s) · ${m.supprimes} supprimé(s)${m.tronque ? ` — seules les ${m.lignes.length} premières sont affichées` : ''}`),
    h('table', null, h('thead', null, h('tr', null, ['N° de table', 'Nom', 'Changement'].map((t) => h('th', null, t)))),
      h('tbody', null, m.lignes.map((l) => h('tr', null, h('td', null, l.tableNumber), h('td', null, l.nom),
        h('td', null, l.type === 'ajoute' ? 'Nouveau candidat' : l.type === 'supprime' ? 'Candidat retiré' : l.champs.map((c) => h('div', null, `${nomChamp(c.champ)} : ${valeur(c.avant)} → ${valeur(c.apres)}`))))))))
}

async function ecranDetail() {
  const r = await api('GET', `/api/propositions/${vue.id}`)
  if (!r.ok) return h('div', null, h('div', { class: 'message erreur' }, r.json?.erreur ?? 'Introuvable.'))
  const p = r.json
  const a = p.resume.apres
  const b = p.resume.avant
  const moi = etat.utilisateur.nom
  const monRole = (x) => roles().includes(x)
  const actif = ['proposee', 'planifiee'].includes(p.statut)

  const zoneHeure = h('input', { type: 'datetime-local', id: 'quand' })
  const motif = h('input', { type: 'text', id: 'motif', maxlength: '500', placeholder: 'Motif du refus' })
  const agir = async (action, corps = {}) => {
    const rep = await api('POST', `/api/propositions/${p.id}/${action}`, corps)
    if (rep.ok) return dire('succes', { approuver: 'Approbation enregistrée.', refuser: 'Proposition refusée.', annuler: 'Proposition annulée.', 'mise-en-ligne': 'Mise en ligne réussie : le site public se met à jour dans quelques instants.' }[action])
    if (rep.json?.code === 'base_modifiee' && confirm(`${rep.json.erreur}\n\nRemplacer malgré tout la version publiée ?`)) return agir(action, { ...corps, confirmerEcrasement: true })
    dire('erreur', rep.json?.erreur ?? 'Action impossible.')
  }

  return h('div', null,
    h('p', null, h('button', { class: 'btn', onclick: () => { vue = { onglet: 'propositions', id: null }; message = null; afficher() } }, '← Retour')),
    h('h2', null, `Proposition du ${date(p.creeLe)} `, badge(p.statut)), bandeau(),
    h('p', { class: 'doux' }, `Examen ${p.session} · déposée par ${p.auteur.nom} · fichier « ${p.fichier.nom} » (${Math.round(p.fichier.taille / 1024)} Ko) · empreinte ${p.fichier.sha256.slice(0, 12)}…`),
    p.baseObsolete && actif && h('div', { class: 'message alerte' }, 'Une autre publication a eu lieu depuis le dépôt de ce fichier : l’approbation demandera une confirmation explicite.'),
    (p.resume.alertes ?? []).map((t) => h('div', { class: 'message alerte' }, t)),
    h('div', { class: 'carte' }, h('h3', null, 'Ce qui va changer'),
      h('table', null, h('thead', null, h('tr', null, ['', 'Actuellement publié', 'Cette proposition'].map((t) => h('th', null, t)))),
        h('tbody', null, [['Candidats', b.total, a.total], ['Admis', b.admis, a.admis], ['Second groupe', b.second, a.second], ['Ajournés', b.ajournes, a.ajournes], ['Taux de réussite', b.taux, a.taux]].map(([t, x, y]) => h('tr', null, h('td', null, t), h('td', null, x), h('td', null, y))))),
      h('p', { class: 'doux' }, `Par île : ${Object.entries(a.parIle).map(([k, v]) => `${k} ${v}`).join(' · ')}`)),
    modificationsCarte(p.resume.modifications),
    p.avertissements?.length ? h('div', { class: 'carte' }, h('h3', null, `${p.avertissements.length} avertissement(s) à relire`), h('ul', { class: 'liste' }, p.avertissements.slice(0, 30).map((x) => h('li', null, `Ligne ${x.ligne || '—'} : ${x.message}`)))) : null,
    h('div', { class: 'carte' }, h('h3', null, 'Extrait (10 premiers candidats)'),
      p.donneesPurgees ? h('p', { class: 'doux' }, 'Données purgées (durée de conservation dépassée).') :
        h('table', null, h('thead', null, h('tr', null, ['N° de table', 'Nom', 'Île', 'Résultat', 'Moyenne'].map((t) => h('th', null, t)))),
          h('tbody', null, p.echantillon.map((c) => h('tr', null, h('td', null, c.tableNumber), h('td', null, c.nom), h('td', null, c.ile), h('td', null, RESULTATS[c.resultat] ?? c.resultat), h('td', null, c.moyenne)))))),
    p.approbation && h('p', { class: 'doux' }, `Approuvée par ${p.approbation.par.nom} le ${date(p.approbation.le)}${p.approbation.publierA ? ` · publication prévue le ${date(p.approbation.publierA)}` : ''}`),
    p.refus && h('div', { class: 'message erreur' }, `Refusée par ${p.refus.par.nom} le ${date(p.refus.le)} : ${p.refus.motif}`),
    p.erreurPublication && h('div', { class: 'message erreur' }, `Échec de la publication : ${p.erreurPublication}`),
    p.publieLe && h('div', { class: 'message succes' }, `Publiée le ${date(p.publieLe)}.`),
    p.publieLe && miseEnLigne(p, monRole, agir),
    p.statut === 'proposee' && monRole('approbateur') && (p.auteur.nom === moi
      ? h('div', { class: 'message info' }, 'Règle des deux personnes : vous avez déposé ce fichier, un AUTRE responsable doit l’approuver.')
      : h('div', { class: 'carte' }, h('h3', null, 'Décision'),
        h('p', null, h('button', { class: 'btn primaire', onclick: () => confirm(`Publier maintenant ${a.total} candidats pour ${p.session} ?\nL’ancienne version sera sauvegardée.`) && agir('approuver') }, 'Approuver et publier maintenant')),
        h('label', { for: 'quand' }, 'Ou programmer la publication'), zoneHeure,
        h('p', null, h('button', { class: 'btn', onclick: () => { if (!zoneHeure.value) return dire('erreur', 'Choisissez la date et l’heure.'); agir('approuver', { publierA: new Date(zoneHeure.value).toISOString() }) } }, 'Approuver et programmer')),
        h('label', { for: 'motif' }, 'Ou refuser'), motif,
        h('p', null, h('button', { class: 'btn danger', onclick: () => agir('refuser', { motif: motif.value }) }, 'Refuser')))),
    actif && (p.auteur.nom === moi || monRole('admin')) && h('p', null, h('button', { class: 'btn danger', onclick: () => confirm('Annuler cette proposition ?') && agir('annuler') }, 'Annuler la proposition')))
}

/** Bloc « Mise en ligne » : l'envoi des fichiers publiés vers le site public. */
function miseEnLigne(p, monRole, agir) {
  const m = p.miseEnLigne
  if (!m || m.etat === 'non_configuree')
    return h('div', { class: 'message alerte' }, 'La mise en ligne automatique n’est pas activée : les fichiers sont publiés sur la console, mais pas encore sur le site public (voir le guide de déploiement).')
  if (m.etat === 'ok')
    return h('div', { class: 'message succes' }, `Envoyée vers le site public le ${date(m.le)} (modification ${m.commit}, ${m.fichiers} fichiers). Le site se met à jour dès que l’hébergeur a terminé son déploiement.`)
  return h('div', { class: 'message erreur' },
    `La publication est faite, mais l’envoi vers le site public a échoué : ${m.erreur}`,
    (monRole('approbateur') || monRole('admin')) && h('p', null, h('button', { class: 'btn primaire', onclick: () => agir('mise-en-ligne') }, 'Réessayer la mise en ligne')))
}

async function ecranJournal() {
  const r = await api('GET', '/api/audit')
  if (!r.ok) return h('div', { class: 'message erreur' }, r.json?.erreur ?? 'Accès refusé.')
  const v = r.json.verification
  return h('div', null, h('h2', null, 'Journal d’audit'),
    h('div', { class: `message ${v.ok ? 'succes' : 'erreur'}` }, v.ok ? `Chaîne intacte (${v.lignes} entrées vérifiées).` : `⚠ ALTÉRATION DÉTECTÉE : ${v.erreur}`),
    h('div', { class: 'carte' }, h('table', null, h('thead', null, h('tr', null, ['Date', 'Utilisateur', 'Action', 'Détails', 'Adresse'].map((t) => h('th', null, t)))),
      h('tbody', null, r.json.entrees.map((e) => h('tr', null, h('td', null, date(e.t)), h('td', null, e.utilisateur ?? '—'), h('td', null, e.action), h('td', null, JSON.stringify(e.details)), h('td', null, e.ip)))))))
}

function ecranCompte() {
  const mdp = h('input', { type: 'password', id: 'mdpTotp', autocomplete: 'current-password' })
  const code = h('input', { type: 'text', id: 'codeTotp', inputmode: 'numeric', maxlength: '6' })
  const zone = h('div')
  const dessinerQr = (modules) => {
    const ns = 'http://www.w3.org/2000/svg'
    const n = modules.length
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', `-2 -2 ${n + 4} ${n + 4}`)
    svg.setAttribute('width', '200'); svg.setAttribute('height', '200'); svg.setAttribute('shape-rendering', 'crispEdges')
    modules.forEach((ligne, y) => [...ligne].forEach((c, x) => { if (c === '1') { const r = document.createElementNS(ns, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', 1); r.setAttribute('height', 1); svg.append(r) } }))
    return h('div', { class: 'qr' }, svg)
  }
  return h('div', null, h('h2', null, 'Mon compte'), bandeau(), formulaireMotDePasse({ force: false }),
    h('div', { class: 'carte' }, h('h3', null, 'Renouveler la double authentification'),
      h('p', { class: 'doux' }, 'À faire si vous changez de téléphone, ou si le secret initial vous a été communiqué par un tiers.'),
      h('label', { for: 'mdpTotp' }, 'Mot de passe actuel'), mdp,
      h('p', null, h('button', { class: 'btn', onclick: async () => {
        const r = await api('POST', '/api/totp/nouveau', { motDePasse: mdp.value })
        if (!r.ok) return dire('erreur', r.json?.erreur ?? 'Impossible.')
        zone.replaceChildren(h('p', null, 'Scannez ce QR code avec votre application, puis saisissez le code affiché :'), dessinerQr(r.json.modules), h('p', { class: 'doux' }, 'Saisie manuelle : ', h('code', null, r.json.secret)),
          h('label', { for: 'codeTotp' }, 'Code à 6 chiffres'), code,
          h('p', null, h('button', { class: 'btn primaire', onclick: async () => { const c = await api('POST', '/api/totp/confirmer', { code: code.value }); dire(c.ok ? 'succes' : 'erreur', c.ok ? 'Double authentification renouvelée.' : (c.json?.erreur ?? 'Code incorrect.')) } }, 'Confirmer')))
      } }, 'Générer un nouveau secret'))), zone)
}

// ---------------------------------------------------------------- affichage
let compteur = 0
async function afficher() {
  const mien = ++compteur
  let contenu
  if (etat.etape === 'aucune') contenu = ecranConnexion()
  else if (etat.etape === 'totp') contenu = ecranTotp()
  else if (etat.etape === 'mdp') contenu = formulaireMotDePasse({ force: true })
  else {
    const corps = vue.onglet === 'detail' ? await ecranDetail() : vue.onglet === 'nouvelle' ? ecranNouvelle() : vue.onglet === 'sessions' ? await ecranSessions() : vue.onglet === 'journal' ? await ecranJournal() : vue.onglet === 'compte' ? ecranCompte() : await ecranPropositions()
    if (mien !== compteur) return // un affichage plus récent a pris le relais
    if (etat.etape !== 'ok') return afficher()
    contenu = h('div', null, enTete(), onglets(), h('main', null, corps))
  }
  if (mien === compteur) racine.replaceChildren(contenu)
}

recharger()

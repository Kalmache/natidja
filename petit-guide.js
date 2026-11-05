// Petit guide de première visite (M.M.B.T, 2026).
// Des bulles « Suivant / Passer » montrent les choses importantes de l'écran, une seule fois par téléphone.
// Le lien « Revoir le petit guide » le relance. Sans ce script, l'appli marche exactement pareil.
// Réglages : chaque page met avant ce fichier un objet window.PETIT_GUIDE = {
//   cle: 'nom-unique',                      // mémorisé dans le téléphone une fois le guide vu
//   etapes: [{ cible: '#bouton', texte: '…', dessin: '<svg…>', si: function () {…} }], // cible, dessin, si facultatifs ; texte peut être { fr: '…', ar: '…' }
//   pret: function () { return true; },     // facultatif : attendre que l'écran soit prêt (code saisi, connexion…)
//   couleur: '#0d3b66',                     // couleur des boutons
//   lien: { cible: 'footer', place: 'avant' } // où mettre « Revoir le petit guide » (avant, apres, dedans)
// }
// Aucun mouvement : les bulles apparaissent et disparaissent sans animation.
(function () {
  var R = window.PETIT_GUIDE;
  if (!R || !R.etapes || !R.etapes.length) return;
  var MOTS = {
    fr: { suivant: 'Suivant', passer: 'Passer', fin: 'Terminer', revoir: 'Revoir le petit guide', nom: 'Petit guide' },
    ar: { suivant: 'التالي', passer: 'تخطي', fin: 'إنهاء', revoir: 'إعادة عرض الدليل', nom: 'دليل صغير' }
  };
  function langue() { return (document.documentElement.lang || 'fr').slice(0, 2) === 'ar' ? 'ar' : 'fr'; }
  function mot(m) { return MOTS[langue()][m]; }
  function texte(t) { return typeof t === 'string' ? t : (t[langue()] || t.fr); }
  var CLE = 'guide-vu-' + R.cle;
  function vu() { try { return localStorage.getItem(CLE) === '1'; } catch (e) { return true; } }
  function marquer() { try { localStorage.setItem(CLE, '1'); } catch (e) {} }

  // Un élément compte seulement s'il est vraiment visible à l'écran.
  function trouver(sel) {
    if (!sel) return null;
    var l = document.querySelectorAll(sel);
    for (var k = 0; k < l.length; k++) { var r = l[k].getBoundingClientRect(); if (r.width > 0 && r.height > 0) return l[k]; }
    return null;
  }
  function existe(e) { if (e.si && !e.si()) return false; return !e.cible || !!trouver(e.cible); }

  // Bulle claire ou sombre selon le fond de l'appli (qui a parfois son propre bouton de thème).
  function sombre() {
    var els = [document.body, document.documentElement];
    for (var k = 0; k < els.length; k++) {
      var c = getComputedStyle(els[k]).backgroundColor.match(/[\d.]+/g);
      if (c && (c.length < 4 || +c[3] > 0)) return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) < 128;
    }
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }
  var C = R.couleur || '#0d3b66';
  var css = '.pg-trou{position:fixed;z-index:9990;border-radius:14px;box-shadow:0 0 0 9999px rgba(0,0,0,.6);outline:3px solid #ffca28;pointer-events:none}'
    + '.pg-plein{position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,.6)}'
    + '.pg-fond{position:fixed;inset:0;z-index:9989}'
    + '.pg-bulle{position:fixed;z-index:9991;left:16px;right:16px;max-width:380px;margin:0 auto;background:#fff;color:#1b1f24;border-radius:16px;padding:16px 16px 12px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:1.05rem/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:start}'
    + '.pg-bulle.pg-sombre{background:#1e252d;color:#eef2f6;border:1px solid #3a4550}'
    + '.pg-bulle p{margin:0 0 12px}.pg-dessin{display:flex;justify-content:center;margin:0 0 10px}.pg-dessin svg{width:96px;height:96px}'
    + '.pg-bas{display:flex;align-items:center;gap:10px}.pg-num{opacity:.7;font-size:.9rem}.pg-bulle[dir=ltr] .pg-num{margin-right:auto}.pg-bulle[dir=rtl] .pg-num{margin-left:auto}'
    + '.pg-passer{background:none;border:0;color:inherit;opacity:.75;font:inherit;font-weight:600;cursor:pointer;padding:10px 8px}'
    + '.pg-suivant{background:' + C + ';color:#fff;border:0;border-radius:10px;font:inherit;font-weight:700;padding:10px 18px;cursor:pointer;min-height:44px}'
    + '.pg-sombre .pg-suivant{outline:1px solid rgba(255,255,255,.35)}'
    + '.pg-revoir{text-align:center;margin:14px 0;font-size:.9rem}.pg-revoir a{color:inherit;opacity:.85}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var trou, bulle, fond, i;
  function fermer() {
    marquer();
    [trou, bulle, fond].forEach(function (x) { if (x) x.remove(); });
    trou = bulle = fond = null;
    window.removeEventListener('resize', placer); window.removeEventListener('scroll', placer, true);
    document.removeEventListener('keydown', clavier);
  }
  function clavier(e) { if (e.key === 'Escape') fermer(); }
  function placer() {
    if (!bulle) return;
    var e = R.etapes[i], cible = e && trouver(e.cible), h = window.innerHeight, hb = bulle.offsetHeight;
    if (!cible) { // étape sans élément : bulle au milieu, tout l'écran assombri
      trou.className = 'pg-plein'; trou.removeAttribute('style');
      bulle.style.top = Math.max(12, (h - hb) / 2) + 'px'; return;
    }
    var r = cible.getBoundingClientRect(), m = 6;
    trou.className = 'pg-trou';
    trou.style.top = (r.top - m) + 'px'; trou.style.left = (r.left - m) + 'px';
    trou.style.width = (r.width + 2 * m) + 'px'; trou.style.height = (r.height + 2 * m) + 'px';
    // La bulle se met sous l'élément s'il y a la place, sinon au-dessus, sinon par-dessus en bas.
    if (r.bottom + m + 12 + hb < h) bulle.style.top = (r.bottom + m + 12) + 'px';
    else if (r.top - m - 12 - hb > 0) bulle.style.top = (r.top - m - 12 - hb) + 'px';
    else bulle.style.top = Math.max(12, h - hb - 12) + 'px';
  }
  function montrer(n) {
    // Une étape dont l'élément n'est pas à l'écran (ex. aucun bateau) est sautée.
    while (n < R.etapes.length && !existe(R.etapes[n])) n++;
    if (n >= R.etapes.length) return fermer();
    i = n;
    var e = R.etapes[n], total = R.etapes.filter(existe).length, rang = R.etapes.slice(0, n).filter(existe).length + 1;
    var dernier = !R.etapes.slice(n + 1).some(existe);
    bulle.className = 'pg-bulle' + (sombre() ? ' pg-sombre' : '');
    bulle.dir = langue() === 'ar' ? 'rtl' : 'ltr';
    bulle.innerHTML = (e.dessin ? '<div class="pg-dessin" aria-hidden="true">' + e.dessin + '</div>' : '')
      + '<p>' + texte(e.texte) + '</p><div class="pg-bas"><span class="pg-num" dir="ltr">' + rang + ' / ' + total + '</span>'
      + (dernier ? '' : '<button type="button" class="pg-passer">' + mot('passer') + '</button>')
      + '<button type="button" class="pg-suivant">' + mot(dernier ? 'fin' : 'suivant') + '</button></div>';
    bulle.querySelector('.pg-suivant').onclick = function () { montrer(i + 1); };
    var p = bulle.querySelector('.pg-passer'); if (p) p.onclick = fermer;
    var c = trouver(e.cible);
    if (c && getComputedStyle(c).position !== 'fixed') {
      var r = c.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) c.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    placer(); setTimeout(placer, 80);
    bulle.querySelector('.pg-suivant').focus({ preventScroll: true });
  }
  window.petitGuide = function () {
    if (bulle) return;
    fond = document.createElement('div'); fond.className = 'pg-fond';
    trou = document.createElement('div'); trou.className = 'pg-trou';
    bulle = document.createElement('div'); bulle.setAttribute('role', 'dialog'); bulle.setAttribute('aria-label', mot('nom'));
    document.body.append(fond, trou, bulle);
    window.addEventListener('resize', placer); window.addEventListener('scroll', placer, { passive: true, capture: true });
    document.addEventListener('keydown', clavier);
    montrer(0);
  };

  // Lien « Revoir le petit guide » : remis en place si l'appli redessine son écran.
  var L = R.lien || { cible: 'footer', place: 'avant' };
  function poserLien() {
    if (document.querySelector('.pg-revoir')) return;
    var ref = trouver(L.cible) || document.querySelector(L.cible);
    if (!ref) return;
    var p = document.createElement('p'); p.className = 'pg-revoir';
    p.innerHTML = '<a href="#">' + mot('revoir') + '</a>';
    p.firstChild.onclick = function (ev) { ev.preventDefault(); window.petitGuide(); };
    if (L.place === 'dedans') ref.appendChild(p);
    else ref.parentNode.insertBefore(p, L.place === 'apres' ? ref.nextSibling : ref);
  }

  function pret() {
    if (document.getElementById('accueil')) return false; // écran d'ouverture encore affiché
    try { if (R.pret && !R.pret()) return false; } catch (e) { return false; }
    return existe(R.etapes[0]);
  }
  function demarrer() {
    poserLien();
    var t = 0;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(poserLien, 200); }).observe(document.body, { childList: true, subtree: true });
    if (vu()) return;
    var essais = 0, attente = setInterval(function () {
      if (++essais > 240 || vu()) return clearInterval(attente); // on abandonne après 2 minutes
      if (pret()) { clearInterval(attente); setTimeout(window.petitGuide, 400); }
    }, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();

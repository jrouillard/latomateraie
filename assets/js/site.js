// La Tomateraie — scripts communs (FR + EN)

// ---------- En-tête : bordure au défilement + lien actif ----------
(() => {
  const entete = document.getElementById('entete');
  const liens = [...document.querySelectorAll('.nav a')];
  const cibles = liens.map(a => document.querySelector(a.getAttribute('href')));
  function majNav() {
    entete.classList.toggle('defile', scrollY > 10);
    let actif = 0;
    cibles.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) actif = i; });
    liens.forEach((a, i) => a.classList.toggle('actif', i === actif));
  }
  addEventListener('scroll', majNav, { passive: true });
  majNav();
})();

// ---------- Diaporama automatique ----------
document.querySelectorAll('[data-diaporama]').forEach(racine => {
  const slides = [...racine.querySelectorAll('.slide')];
  const points = racine.querySelector('.diapo-points');
  const delai = Number(racine.dataset.delai) || 5000;
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0, minuteur = null, enPause = false;

  // Points de navigation
  const boutons = slides.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `${racine.dataset.libelle || 'Photo'} ${i + 1} / ${slides.length}`);
    b.addEventListener('click', () => { aller(i); relancer(); });
    points.appendChild(b);
    return b;
  });

  function aller(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, j) => {
      const actif = j === index;
      s.classList.toggle('active', actif);
      s.setAttribute('aria-hidden', String(!actif));
    });
    boutons.forEach((b, j) => b.setAttribute('aria-current', String(j === index)));
    // Précharge l'image suivante
    const suivante = slides[(index + 1) % slides.length].querySelector('img');
    if (suivante && suivante.loading === 'lazy') suivante.loading = 'eager';
  }

  function demarrer() {
    arreter();
    if (!enPause && !reduit && !document.hidden) minuteur = setInterval(() => aller(index + 1), delai);
  }
  function arreter() { clearInterval(minuteur); minuteur = null; }
  function relancer() { demarrer(); }

  racine.querySelector('.diapo-prec').addEventListener('click', () => { aller(index - 1); relancer(); });
  racine.querySelector('.diapo-suiv').addEventListener('click', () => { aller(index + 1); relancer(); });

  // Pause au survol / au focus, et quand l'onglet est caché
  racine.addEventListener('mouseenter', () => { enPause = true; arreter(); });
  racine.addEventListener('mouseleave', () => { enPause = false; demarrer(); });
  racine.addEventListener('focusin', () => { enPause = true; arreter(); });
  racine.addEventListener('focusout', () => { enPause = false; demarrer(); });
  document.addEventListener('visibilitychange', demarrer);

  // Clavier
  racine.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { aller(index - 1); }
    if (e.key === 'ArrowRight') { aller(index + 1); }
  });

  // Glisser au doigt
  let x0 = null;
  racine.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  racine.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) { aller(index + (dx < 0 ? 1 : -1)); relancer(); }
    x0 = null;
  });

  // Entrée / Espace : ouvre la photo affichée en plein écran
  racine.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === racine) {
      e.preventDefault();
      slides[index].querySelector('img').click();
    }
  });

  racine.diapo = { aller, get index() { return index; } };
  aller(0);
  demarrer();
});

// ---------- Visionneuse plein écran ----------
(() => {
  const en = document.documentElement.lang.startsWith('en');
  const t = en
    ? { fermer: 'Close', prec: 'Previous photo', suiv: 'Next photo', ouvrir: 'View full screen' }
    : { fermer: 'Fermer', prec: 'Photo précédente', suiv: 'Photo suivante', ouvrir: 'Voir en plein écran' };

  // Les plans (SVG intégrés) sont convertis en images pour la visionneuse
  const plans = [...document.querySelectorAll('.plan-svg')].map(svg => {
    const copie = svg.cloneNode(true);
    const [, , w, h] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    copie.setAttribute('width', Math.round(w * 2));
    copie.setAttribute('height', Math.round(h * 2));
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      .plan-etiquette { font-family: Jost, Arial, sans-serif; font-size: 11px; font-weight: 600; fill: #3a3027;
        paint-order: stroke; stroke: rgba(255,255,255,.85); stroke-width: 3px; stroke-linejoin: round; }
      .plan-surface { font-weight: 400; font-size: 10px; }
      .plan-etiquette.petit { font-size: 9.5px; } .plan-etiquette.vert { fill: #3f7a35; font-size: 12px; }
      .plan-etiquette.gris { fill: #7b746a; } .plan-etiquette.entree { fill: #7a5636; }`;
    copie.insertBefore(style, copie.firstChild);
    const blob = new Blob([new XMLSerializer().serializeToString(copie)], { type: 'image/svg+xml' });
    svg.src = URL.createObjectURL(blob);
    const legende = svg.closest('figure')?.querySelector('figcaption');
    svg.alt = legende ? legende.textContent.trim() : '';
    return svg;
  });

  // Trois galeries : le diaporama, les photos des pièces, puis les plans
  const groupes = [
    [...document.querySelectorAll('.diaporama .slide img')],
    [...document.querySelectorAll('.piece img')],
    plans,
  ].filter(g => g.length);
  if (!groupes.length) return;

  const dlg = document.createElement('dialog');
  dlg.className = 'visionneuse';
  dlg.setAttribute('aria-label', t.ouvrir);
  dlg.innerHTML = `
    <figure>
      <img alt="">
      <figcaption><span class="vis-legende"></span><span class="vis-compteur"></span></figcaption>
    </figure>
    <button class="vis-fermer" type="button" aria-label="${t.fermer}">×</button>
    <button class="vis-prec" type="button" aria-label="${t.prec}">‹</button>
    <button class="vis-suiv" type="button" aria-label="${t.suiv}">›</button>`;
  document.body.appendChild(dlg);

  const img = dlg.querySelector('img');
  const legende = dlg.querySelector('.vis-legende');
  const compteur = dlg.querySelector('.vis-compteur');
  let groupe = [], pos = 0;

  const titre = el => {
    const piece = el.closest('.piece');
    const nom = piece && piece.querySelector('figcaption');
    return nom ? nom.textContent.trim() : el.alt;
  };

  function afficher(i) {
    pos = (i + groupe.length) % groupe.length;
    const source = groupe[pos];
    img.src = source.currentSrc || source.src;
    img.alt = source.alt;
    legende.textContent = titre(source);
    compteur.textContent = `${pos + 1} / ${groupe.length}`;
    // Précharge les voisines
    [pos - 1, pos + 1].forEach(j => { new Image().src = groupe[(j + groupe.length) % groupe.length].src; });
  }

  function ouvrir(g, i) {
    groupe = g;
    afficher(i);
    dlg.showModal();
    document.body.classList.add('sans-defilement');
  }

  function nettoyer() {
    if (!document.body.classList.contains('sans-defilement')) return;
    document.body.classList.remove('sans-defilement');
    // Synchronise le diaporama avec la dernière photo vue
    const diapo = document.querySelector('[data-diaporama]');
    if (diapo && diapo.diapo && groupe === groupes[0]) diapo.diapo.aller(pos);
  }
  function fermer() { dlg.close(); nettoyer(); }
  dlg.addEventListener('close', nettoyer); // touche Échap

  dlg.querySelector('.vis-fermer').addEventListener('click', fermer);
  dlg.querySelector('.vis-prec').addEventListener('click', () => afficher(pos - 1));
  dlg.querySelector('.vis-suiv').addEventListener('click', () => afficher(pos + 1));
  // Clic sur le fond (hors photo et boutons) : fermer
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.tagName === 'FIGURE') fermer(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') afficher(pos - 1);
    if (e.key === 'ArrowRight') afficher(pos + 1);
  });
  let x0 = null;
  dlg.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) afficher(pos + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  // Rend chaque photo cliquable
  groupes.forEach(g => g.forEach((el, i) => {
    el.classList.add('agrandissable');
    el.addEventListener('click', () => ouvrir(g, i));
    if (!el.closest('.diaporama')) {
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${t.ouvrir} : ${el.alt}`);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(g, i); }
      });
    }
  }));
})();

/* Commandes tactiles (v017, iPhone / tablette) : joystick à gauche (remplace la souris et W,A,S,D),
 * PROPULSION à maintenir (remplace Espace), FEU (remplace le clic gauche : tir / réapparition),
 * MENU (Échap) et R (recommencer). Couché : commandes par-dessus la vue 16:9 ; debout : vue 3:4 en haut, commandes dessous.
 * Actives seulement sur un écran tactile, ou avec #touch / ?touch=1 dans l'adresse.
 * Les menus du jeu restent utilisables en touchant l'écran (le navigateur transforme le toucher en clic). */
(function () {
  function wanted() {
    if (/(^|[#&])touch\b/.test(location.hash) || /[?&]touch=1\b/.test(location.search)) return true;
    return (navigator.maxTouchPoints || 0) > 0 && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  }

  function el(tag, cls, text, parent) {
    const e = document.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    parent.appendChild(e);
    return e;
  }

  function attach(game) {
    if (!wanted()) return null;
    const input = game.input;
    CC.Touch.active = true;
    const T = input.touch = { sx: 0, sy: 0, thrust: false };
    document.body.classList.add('cc-touch');
    // le joystick et PROPULSION couvrent les coins bas : jauge d'essence au centre, SPEED en haut à droite (sous TIME)
    const H = CC.CONFIG.hud;
    H.fuel.x0 = 0.5 - H.fuel.w / 2;
    H.speed = Object.assign({}, H.speed, { y: 0.13 });

    const pad = el('div', 'cc-pad', '', document.body);
    const wake = () => { game.audio.init(); game.audio.resume(); };   // iOS : le son ne démarre qu'après un geste

    // --- joystick : suit un seul doigt, déviation normalisée [-1, 1] avec zone morte et réponse progressive ---
    const stick = el('div', 'cc-stick', '', pad);
    const knob = el('div', 'cc-knob', '', stick);
    let stickId = null;
    const setStick = (t) => {
      const r = stick.getBoundingClientRect();
      const R = r.width / 2;
      let dx = (t.clientX - (r.left + R)) / R, dy = (t.clientY - (r.top + R)) / R;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      knob.style.transform = 'translate(' + (dx * R * 0.55) + 'px,' + (dy * R * 0.55) + 'px)';
      const cfg = CC.CONFIG.input.touch;
      const shape = (v) => { const a = Math.abs(v); return a < cfg.deadZone ? 0 : Math.sign(v) * Math.pow((a - cfg.deadZone) / (1 - cfg.deadZone), cfg.curve); };
      T.sx = shape(dx); T.sy = shape(dy);
    };
    const releaseStick = () => { stickId = null; T.sx = 0; T.sy = 0; knob.style.transform = ''; stick.classList.remove('on'); };
    stick.addEventListener('touchstart', (e) => {
      e.preventDefault(); wake();
      if (stickId !== null) return;
      const t = e.changedTouches[0];
      stickId = t.identifier; stick.classList.add('on'); setStick(t);
    }, { passive: false });
    stick.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === stickId) setStick(t);
    }, { passive: false });
    const endStick = (e) => { for (const t of e.changedTouches) if (t.identifier === stickId) releaseStick(); };
    stick.addEventListener('touchend', endStick);
    stick.addEventListener('touchcancel', endStick);

    // --- boutons ---
    const button = (cls, label, onDown, onUp) => {
      const b = el('div', 'cc-btn ' + cls, label, pad);
      b.setAttribute('role', 'button');
      b.addEventListener('touchstart', (e) => { e.preventDefault(); wake(); b.classList.add('on'); onDown(); }, { passive: false });
      const up = (e) => { e.preventDefault(); if (!e.touches || ![...e.touches].some((t) => b.contains(t.target))) { b.classList.remove('on'); if (onUp) onUp(); } };
      b.addEventListener('touchend', up, { passive: false });
      b.addEventListener('touchcancel', up, { passive: false });
      return b;
    };
    button('cc-thrust', 'PROPULSION', () => { T.thrust = true; }, () => { T.thrust = false; });
    button('cc-fire', 'FEU', () => {
      // en pause : reprendre ; sinon tir (au lanceur) ou réapparition (après un crash)
      if (game.paused && !game.ui.overlay) game.resume(); else input.fireEdge = true;
    });
    button('cc-menu', 'MENU', () => game.onKey('Escape'));
    button('cc-reset', 'R', () => game.onKey('KeyR'));


    // les commandes de vol n'ont de sens qu'en partie ; au menu, on touche directement l'écran du jeu
    const sync = () => {
      const inGame = ['AIM', 'FLIGHT', 'IMPACT', 'CRASHED', 'RESPAWN'].includes(game.state) && !game.ui.overlay;
      pad.classList.toggle('menu', !inGame);
      if (!inGame && stickId !== null) releaseStick();
      if (!inGame) T.thrust = false;
      requestAnimationFrame(sync);
    };
    requestAnimationFrame(sync);
    // un doigt qui glisse hors d'un bouton ne doit pas faire défiler ni zoomer la page
    document.addEventListener('touchmove', (e) => { if (e.target.closest && e.target.closest('.cc-pad')) e.preventDefault(); }, { passive: false });
    game.resize();   // passe en cadrage vertical si le téléphone est tenu droit
    return T;
  }

  CC.Touch = { attach, wanted };
})();

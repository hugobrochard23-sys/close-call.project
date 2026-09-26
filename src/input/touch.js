/* Commandes tactiles (v022, iPhone / tablette) — aucun bouton à l'écran sauf la pause :
 *  - glisser le doigt n'importe où : dirige la roquette (comme la souris : droite = tourne à droite, haut = monte) ;
 *  - toucher (tap) : tir depuis le lanceur, ou réapparition après un crash ;
 *  - double toucher en vol : allume le moteur, qui reste allumé ; un nouveau double toucher l'éteint ;
 *  - gros bouton pause en haut à droite : menu pause (reprendre, son, musique, recommencer, menu principal).
 * Plein écran, affichage allégé et rendu moins coûteux (fluidité). Les menus se touchent directement.
 * Actives seulement sur un écran tactile, ou avec #touch / ?touch=1 dans l'adresse (essai sur ordinateur). */
(function () {
  function wanted() {
    if (/(^|[#&])touch\b/.test(location.hash) || /[?&]touch=1\b/.test(location.search)) return true;
    return (navigator.maxTouchPoints || 0) > 0 && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  }

  const FLY = ['AIM', 'FLIGHT', 'IMPACT', 'CRASHED', 'RESPAWN'];

  function attach(game) {
    if (!wanted()) return null;
    const input = game.input, cfg = CC.CONFIG.input.touch;
    const T = input.touch = { thrust: false };
    CC.Touch.active = true;
    document.body.classList.add('cc-touch');

    // fluidité : rendu à la définition de l'écran (pas de sur-échantillonnage) et ombres plus légères
    CC.CONFIG.render.maxPixelRatio = cfg.pixelRatio;
    game.sun.shadow.mapSize.set(cfg.shadowMapSize, cfg.shadowMapSize);

    const wake = () => { game.audio.init(); game.audio.resume(); };   // iOS : le son ne démarre qu'après un geste
    const playing = () => FLY.includes(game.state) && !game.paused && !game.ui.overlay;

    // --- bouton pause (le seul bouton) ---
    const pause = document.createElement('div');
    pause.className = 'cc-pause'; pause.setAttribute('role', 'button'); pause.setAttribute('aria-label', 'Pause');
    document.body.appendChild(pause);
    pause.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); wake(); game.pause(); }, { passive: false });

    // --- glisser / toucher / double toucher ---
    let finger = null, lastTap = 0;
    const scale = () => cfg.dragGain / Math.max(1, Math.min(window.innerWidth, window.innerHeight));
    document.addEventListener('touchstart', (e) => {
      wake();
      if (!playing() || e.target === pause) return;   // menus, pause : le toucher devient un clic sur le jeu
      e.preventDefault();
      if (finger) return;                            // un seul doigt pilote
      const t = e.changedTouches[0];
      finger = { id: t.identifier, x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t0: performance.now(), moved: false };
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (!finger) return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== finger.id) continue;
        const k = scale();
        input.addAim(-(t.clientX - finger.x) * k, -(t.clientY - finger.y) * k);
        finger.x = t.clientX; finger.y = t.clientY;
        if (Math.hypot(t.clientX - finger.x0, t.clientY - finger.y0) > cfg.tapMaxMove) finger.moved = true;
      }
    }, { passive: false });
    const end = (e) => {
      if (!finger) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== finger.id) continue;
        const tap = !finger.moved && performance.now() - finger.t0 < cfg.tapMaxMs;
        finger = null;
        if (!tap || !playing()) return;
        e.preventDefault();
        const now = performance.now();
        if (game.state === 'FLIGHT') {
          if (now - lastTap < cfg.doubleTapMs) { T.thrust = !T.thrust; lastTap = 0; game.audio.play('toggle'); }
          else lastTap = now;
        } else { input.fireEdge = true; lastTap = 0; }    // lanceur : tir ; après un crash : réapparition
      }
    };
    document.addEventListener('touchend', end, { passive: false });
    document.addEventListener('touchcancel', end, { passive: false });

    // à chaque image du jeu : moteur coupé hors vol ; bouton pause visible seulement en partie
    const tick = game.tick.bind(game);
    game.tick = (dt) => {
      tick(dt);
      if (game.state !== 'FLIGHT') T.thrust = false;
      pause.hidden = !playing();
    };
    game.resize();   // plein écran
    return T;
  }

  CC.Touch = { attach, wanted };
})();

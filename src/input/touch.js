/* Commandes tactiles (v022, iPhone / tablette) — aucun bouton à l'écran sauf la pause :
 *  - glisser le doigt n'importe où : dirige la roquette (comme la souris : droite = tourne à droite, haut = monte) ;
 *  - toucher (tap) : tir depuis le lanceur, ou réapparition après un crash ;
 *  - appui long (doigt immobile ≥ 0,4 s) en vol : boost tant que le doigt reste posé, avec vibration continue (v024) ;
 *    boost relâché → pendant 0,6 s (v029), reposer le doigt relance le boost aussitôt (v026) ; mini vibration à chaque toucher (v026) ;
 *  - doigt dans la bande gauche / droite de l'écran : virage sans fin (v024) ; au lanceur, la vue ne bouge pas (v024) ;
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
    const T = input.touch = { thrust: false, reboostUntil: 0 };   // reboostUntil : fin de la fenêtre de relance du boost (v026)
    CC.Touch.active = true;
    document.body.classList.add('cc-touch');

    // fluidité : définition, ombres et effets réglés par le niveau de qualité (src/core/quality.js, v030)

    const wake = () => { game.audio.init(); game.audio.resume(); };   // iOS : le son ne démarre qu'après un geste
    const playing = () => FLY.includes(game.state) && !game.paused && !game.ui.overlay;

    // --- vibrations (réglage enregistré, 2 = MEDIUM par défaut) ---
    const Hap = CC.Haptics;
    if (Hap) Hap.setLevel(game.settings.vibration !== undefined ? game.settings.vibration : 2);
    const buzz = (k) => { if (Hap) Hap.tick(k); };

    // --- bouton pause (le seul bouton) ---
    const pause = document.createElement('div');
    pause.className = 'cc-pause'; pause.setAttribute('role', 'button'); pause.setAttribute('aria-label', 'Pause');
    document.body.appendChild(pause);
    pause.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); wake(); buzz('button'); game.pause(); }, { passive: false });

    // --- glisser / toucher / appui long ---
    let finger = null, uiTouch = null;
    Object.defineProperties(T, { down: { get: () => !!finger }, dragPx: { get: () => (finger && finger.dist) || 0 } });   // v091 : lus par le tutoriel (doigt posé ? distance glissée depuis la pose)
    const SENS = [0.7, 1, 1.4];   // v093 : réglage SENSIBILITE (douce / normale / vive)
    const scale = () => cfg.dragGain * SENS[game.settings.touchSens !== undefined ? game.settings.touchSens : 1] / Math.max(1, Math.min(window.innerWidth, window.innerHeight));
    const boostOff = () => { if (T.thrust) { T.thrust = false; if (Hap) Hap.boostStop(); } };
    const boostOn = () => { T.thrust = true; if (Hap) Hap.boostStart(); };   // v034 : le son du boost est joué par Game.onBoostStart
    document.addEventListener('touchstart', (e) => {
      wake();
      // v034 : au lanceur, le lancement part dès que le doigt TOUCHE (pas au relâchement) — sauf sur une icône de l'interface
      if (game.state === 'MENU' && game.padMode && !game.ui.overlay && !game.pendingHome && e.target !== pause) {
        const t0 = e.changedTouches[0], p = input.uiCoords(t0.clientX, t0.clientY);
        if (!game.ui.hitTest(p.x, p.y)) { e.preventDefault(); buzz('touch'); game.beginLaunch(); return; }
      }
      // v087 : dans les menus, on traite le toucher NOUS-MEMES (au relâchement, avec une tolérance de 28 px) au lieu d'attendre le clic synthétique du navigateur
      // qui disparaissait si le doigt bougeait un peu ou restait posé trop longtemps (boutons pub, fermer...)
      if (!playing() && e.target !== pause) { const t0 = e.changedTouches[0]; uiTouch = { id: t0.identifier, x0: t0.clientX, y0: t0.clientY, x: t0.clientX, y: t0.clientY }; return; }
      if (!playing() || e.target === pause) return;   // menus, pause : le toucher devient un clic sur le jeu
      e.preventDefault();
      buzz('touch');                                 // v026 : mini vibration dès que le doigt touche l'écran en partie
      if (finger) return;                            // un seul doigt pilote
      const t = e.changedTouches[0];
      finger = { id: t.identifier, x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t0: performance.now(), moved: false };
      // v026 : dans la seconde qui suit la fin d'un boost, reposer le doigt relance le boost tout de suite (sans appui long)
      if (game.state === 'FLIGHT' && performance.now() < T.reboostUntil) { finger.boost = true; T.reboostUntil = 0; boostOn(); }
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (uiTouch) for (const t of e.changedTouches) if (t.identifier === uiTouch.id) { uiTouch.x = t.clientX; uiTouch.y = t.clientY; }
      if (!finger) return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== finger.id) continue;
        // v024 : au lanceur, la vue ne bouge pas ; en vol, le glissé dirige
        finger.dist = (finger.dist || 0) + Math.hypot(t.clientX - finger.x, t.clientY - finger.y);
        if (game.state === 'FLIGHT') { const k = scale(); const rx = (t.clientX - finger.x) * k, ry = (t.clientY - finger.y) * k; finger.sx = (finger.sx || 0) * 0.4 + rx * 0.6; finger.sy = (finger.sy || 0) * 0.4 + ry * 0.6; input.addAim(-finger.sx, -finger.sy); }   // v088 : sensibilité 3.0 → 2.3 + lissage (les nouveaux joueurs sur-corrigeaient)
        finger.x = t.clientX; finger.y = t.clientY;
        if (Math.hypot(t.clientX - finger.x0, t.clientY - finger.y0) > cfg.tapMaxMove) finger.moved = true;
      }
    }, { passive: false });
    const end = (e) => {
      if (uiTouch) {
        for (const t of e.changedTouches) {
          if (t.identifier !== uiTouch.id) continue;
          const u = uiTouch; uiTouch = null;
          if (e.type === 'touchend' && Math.hypot(t.clientX - u.x0, t.clientY - u.y0) < 28) {
            if (e.cancelable) e.preventDefault();   // pas de clic synthétique en double
            wake();
            const p = input.uiCoords(u.x0, u.y0);
            input.uiPress(p.x, p.y, 0);
          }
          return;
        }
      }
      if (!finger) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== finger.id) continue;
        const tap = !finger.moved && !finger.boost && performance.now() - finger.t0 < cfg.tapMaxMs;
        if (finger.boost && game.state === 'FLIGHT') T.reboostUntil = performance.now() + cfg.reboostMs;   // v026
        finger = null;
        boostOff();                                  // v024 : doigt levé → boost coupé
        if (!tap || !playing()) return;
        e.preventDefault();
        if (game.state !== 'FLIGHT') { input.fireEdge = true; if (game.state === 'AIM') buzz('fire'); }   // tir (ou réapparition)
      }
    };
    document.addEventListener('touchend', end, { passive: false });
    document.addEventListener('touchcancel', end, { passive: false });

    // à chaque image du jeu : appui long → boost ; doigt dans une bande latérale → virage continu ; pause visible en partie
    const tick = game.tick.bind(game);
    game.tick = (dt) => {
      tick(dt);
      const flying = game.state === 'FLIGHT' && playing();
      if (finger && flying) {
        // v024 : appui long (doigt immobile ≥ longPressMs) → boost, maintenu tant que le doigt reste posé (il peut alors bouger)
        if (!finger.boost && !finger.moved && performance.now() - finger.t0 >= cfg.longPressMs) {
          finger.boost = true; boostOn();
        }
        // v024 : virage sans fin quand le doigt est dans la bande de gauche ou de droite (plus vite près du bord) ;
        // haut / bas : inchangés (glissé relatif)
        const x = finger.x / Math.max(1, window.innerWidth), b = cfg.edgeBand;
        const push = x < b ? -(b - x) / b : x > 1 - b ? (x - (1 - b)) / b : 0;
        if (push) input.addAim(-push * cfg.edgeTurnRate * dt, 0);
      }
      if (!flying) { boostOff(); if (game.state !== 'FLIGHT') T.reboostUntil = 0; }   // pause : la fenêtre reste ouverte
      pause.hidden = !playing() || !!(CC.Tutorial && CC.Tutorial.hold);   // v091 : pas de bouton pause pendant les consignes du tuto
    };
    game.resize();   // plein écran
    return T;
  }

  CC.Touch = { attach, wanted };
})();

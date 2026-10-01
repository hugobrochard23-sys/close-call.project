/* HUD en 3 variantes (MESURÉES, voir ANALYSE §8) :
 *  A (ville)           : BINDS/SETTINGS/MENU, chrono + STYLE, THRUST:45 + COOLDOWN...
 *  B (briques, forêts) : chrono (+ TARGETS n/4), SCORE
 *  C (canyon, grotte, chantier) : RESET/MENU/SETTINGS, chrono + STYLE, TIME:∞, SPEED:N */
(function () {
  const U = CC.U;
  const V = THREE.Vector3;

  class HUD {
    constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false; this._v = new V(); }

    // v017 : tailles de texte rapportées à refH (= hauteur, sauf en vertical où la largeur limite : les textes du HUD,
    // pensés pour un écran 16:9, tiennent ainsi dans la largeur du téléphone)
    text(str, x, y, pxFrac, color, opts) {
      return CC.Font.draw(this.ctx, str, x, y, pxFrac * this.refH, color, Object.assign({ pixel: !this.modern }, opts));   // HUD des niveaux d'origine : police pixel de la vidéo
    }

    draw(game, dt) {
      this.dt = dt;
      const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
      this.portrait = !!game.portrait; this.modern = !!game.endlessRun;   // CLASSIQUE : police moderne ; niveaux d'origine : police pixel de la vidéo
      this.refH = this.portrait ? Math.min(H, W * 0.95) : H;
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false;
      const s = game.state;
      const inGame = CC.INGAME.includes(s) || (s === 'RESULTS');
      if (inGame && game.level && game.showHud) this.drawGame(game);
      if (game.ui) {
        // v017 : en vertical, les menus (pensés en 16:9) sont dessinés dans une bande centrée de hauteur refH
        const Hv = this.refH, off = Math.round((H - Hv) / 2);
        game.ui.portrait = this.portrait; game.ui.offsetY = off; game.ui.fullH = H;
        ctx.save(); ctx.translate(0, off);
        game.ui.draw(ctx, game, W, Hv);
        ctx.restore();
      }
      if (game.debug) this.text('FPS ' + Math.round(game.fps), 0.01 * W, 0.965 * H, 0.0018, '#8f8', {});
    }

    drawGame(game) {
      const W = this.canvas.width, H = this.canvas.height, C = CC.CONFIG.hud, col = C.colors;
      const v = game.level.hud, rk = game.rocket;
      if (game.endlessRun) {   // v034 : mode CLASSIQUE — HUD épuré (score, essence, record, journal, éclats, mission)
        if (game.state !== 'RESULTS' && !game.paused && game.ui.overlay !== 'revive') { this.drawClassic(game, W, H, C, col, rk); this.drawGameRest(game, W, H, C, col, v, rk, document.body.classList.contains('cc-touch')); }
        return;
      }
      // v017 : en vertical, les textes du coin haut droit sont alignés à droite sur le bord (sinon ils débordent)
      const R = this.portrait ? { x: () => 0.97 * W, o: { align: 'right' } } : { x: (c) => c.x * W, o: undefined };
      // v022 : écran tactile → affichage minimal (jauge d'essence, réticule, repères de cibles, alerte missile, aide au lancement)
      const lite = document.body.classList.contains('cc-touch');
      if (!lite) this.drawInfo(game, W, H, C, col, v, rk, R);
      this.drawGameRest(game, W, H, C, col, v, rk, lite);
    }

    // Textes d'information du HUD (raccourcis, chrono, STYLE, THRUST, TIME, SPEED…), absents sur écran tactile (v022).
    drawInfo(game, W, H, C, col, v, rk, R) {
      if (v === 'A' || v === 'C') {
        const b = C.binds[v];
        const lines = v === 'A' ? ['BINDS:F1', 'SETTINGS:TAB', 'MENU:ESC'] : ['RESET:R', 'MENU:ESC', 'SETTINGS:TAB'];
        lines.forEach((l, i) => this.text(l, b.x * W, (b.y + i * b.pitch) * H, b.px, col.white));
      }
      // chrono (format MESURÉ 0:08,27)
      const tm = C.timer[v] || C.timer;
      if (!game.endlessRun) this.text(U.formatTime(game.runTime), 0.5 * W, C.timer.y * H, tm.px, col.white, { align: 'center', cw: tm.cw });   // v033 : distance à la place (drawEndless)
      if (v === 'A' || v === 'C') {
        const st = C.style[v];
        this.text('STYLE ' + U.formatInt(game.style.total), 0.5 * W, st.y * H, st.px, col.white, { align: 'center' });
      } else if (game.level.mode === 'targets') {
        this.text('TARGETS ' + game.targetsDone + '/' + game.targets.filter((t) => !t.guard).length, 0.5 * W, C.targets.y * H, C.targets.px, col.white, { align: 'center' });
      }
      if (v === 'A') {
        this.text('THRUST:' + Math.round(CC.CONFIG.rocket.thrustHud), R.x(C.topRight), C.topRight.y * H, C.topRight.px, col.white, R.o);
        this.text('COOLDOWN...', R.x(C.cooldown), C.cooldown.y * H, C.cooldown.px, col.yellow, R.o);
      } else if (v === 'B') {
        this.text('SCORE', R.x(C.score), C.score.y * H, C.score.px, col.white, R.o);
      } else {
        this.text('TIME:∞', R.x(C.time), C.time.y * H, C.time.px, col.white, R.o);
        if (!game.level.hideSpeed) this.text('SPEED:' + Math.round(rk && rk.active ? rk.speed : (game.state === 'AIM' ? 0 : game.lastSpeed)), R.x(C.speed), C.speed.y * H, C.speed.px, col.white, R.o);
      }
    }

    /* v034 : HUD du mode CLASSIQUE, façon jeu mobile (pastilles arrondies, pause en haut à gauche, compteur en haut à droite) :
     *   haut : PAUSE (gauche) · pastille SCORE (centre, avec ×2 quand actif) · pastille ÉCLATS (droite)
     *   côté droit : JAUGE D'ESSENCE verticale (comme la jauge de bonus des jeux de course infinie) — jamais sous le pouce
     *   sous le score : une seule ligne de journal (« FROLE +12 ») ; « NOUVEAU RECORD » quand on bat son record
     * Rien d'autre : ni chrono, ni vitesse, ni record permanent, ni mission (elle n'apparaît qu'une fois accomplie), ni touches. */
    drawClassic(game, W, H, C, col, rk) {
      const ctx = this.ctx, run = game.endlessRun, F = CC.Font, s = game.state;
      const flying = s === 'FLIGHT' || s === 'IMPACT' || s === 'CRASHED' || s === 'RESPAWN' || s === 'REVIVE' || s === 'AIM';
      if (!flying) return;
      const alive = s === 'FLIGHT' || s === 'AIM', U2 = Math.min(W, H * 0.62), pillH = Math.max(34, Math.min(W * 0.115, H * 0.062)), top = Math.max(8, H * 0.014);
      const speedK = alive && rk.active ? Math.max(game.boostK, U.clamp((rk.speed - 45) / 60, 0, 0.35)) : 0;
      if (speedK > 0.02) this.drawSpeedLines(W, H, speedK);
      const rec = game.progress.P.best, broke = rec > 0 && run.score > rec, Home = CC.Home;
      // ---- pastille du score (centre) ; ×2 collé à gauche quand actif
      const px = pillH * 0.075, sc = U.formatInt(run.score), sw = Math.max(F.measure('0.000', px), F.measure(sc, px)), pw = sw + pillH * 1.0;
      let bump = 1 + 0.1 * Math.min(1, game.cellBump);
      ctx.save(); ctx.translate(W / 2, top + pillH / 2); ctx.scale(bump, bump); ctx.translate(-W / 2, -(top + pillH / 2));
      Home.pill(ctx, W / 2 - pw / 2, top, pw, pillH, broke ? 'rgba(90,70,0,0.72)' : 'rgba(10,16,28,0.66)', broke ? '#ffd23a' : 'rgba(255,255,255,0.35)');
      F.draw(ctx, sc, W / 2, top + pillH / 2 - px * 3.6, px, broke ? '#ffe45a' : '#ffffff', { align: 'center', outline: '#0a0e16' });
      ctx.restore();
      if (run.multT > 0) {
        const mh = pillH * 0.8, mw = pillH * 1.5, mx = W / 2 - pw / 2 - mw - pillH * 0.15, my = top + (pillH - mh) / 2;
        Home.pill(ctx, mx, my, mw, mh, '#c020a8', '#ffb0f0');
        F.draw(ctx, 'X2', mx + mw / 2, my + mh / 2 - px * 3.3, px * 0.9, '#ffffff', { align: 'center', outline: '#500848' });
        ctx.fillStyle = '#ffd0f4'; ctx.fillRect(mx + mh * 0.3, my + mh - mh * 0.14, (mw - mh * 0.6) * (run.multT / CC.CONFIG.score.multTime), Math.max(2, mh * 0.08));
      }
      // ---- pastille des éclats (haut droite)
      const gw = pillH * 2.3, gx = W - gw - Math.max(10, W * 0.03), gr = pillH * 0.3 * (1 + 0.25 * Math.min(1.6, game.cellBump));
      Home.pill(ctx, gx, top, gw, pillH, 'rgba(10,16,28,0.66)', 'rgba(255,255,255,0.35)');
      Home.icon.nut(ctx, gx + pillH * 0.55, top + pillH / 2, gr * 1.15, '#ffc820');
      this.cx = gx + pillH * 0.55; this.cy = top + pillH / 2;
      F.draw(ctx, String(Math.round(run.shown)), gx + gw - pillH * 0.4, top + pillH / 2 - px * 3.6, px * 0.95, '#ffffff', { align: 'right', outline: '#0a0e16' });
      // ---- écrous volants (mur cassé) : jaillissent, puis rejoignent le compteur
      if (game.flyers.length) {
        const dt2 = this.dt || 0.016, tx = this.cx, ty = this.cy, keep = [];
        for (const f of game.flyers) {
          f.t += dt2; if (f.t < 0) { keep.push(f); continue; }
          const burst = 0.28, k = (f.t - burst) / 0.55;
          if (f.t < burst) { f.x += f.vx * dt2; f.y += f.vy * dt2; f.vx *= 0.93; f.vy *= 0.93; f.sx = f.x; f.sy = f.y; }
          else { const e = Math.min(1, Math.max(0, k)), ee = e * e * (3 - 2 * e); f.x = f.sx + (tx - f.sx) * ee; f.y = f.sy + (ty - f.sy) * ee; }
          if (f.t >= burst + 0.55) { game.onFlyerArrive(f.val); continue; }
          Home.icon.nut(ctx, f.x, f.y, pillH * 0.3 * (1 - 0.35 * Math.max(0, k)), '#ffc820'); keep.push(f);
        }
        game.flyers = keep;
      }
      // ---- jauge d'essence verticale (bord droit, sous la pastille des éclats)
      const gh = Math.min(H * 0.34, 300), gwid = Math.max(20, pillH * 0.56), gxx = W - gwid - Math.max(14, W * 0.045), gy = top + pillH + H * 0.03;
      this.drawFuelBar(game, rk, gxx, gy, gwid, gh);
      // ---- une ligne de journal, sous le score
      const fpx = pillH * 0.05, f = game.hudFeed[0], fy = top + pillH + H * 0.012;
      if (broke) { if (Math.floor(performance.now() / 350) % 2 === 0) F.draw(ctx, 'NOUVEAU RECORD', W / 2, fy, fpx * 1.15, '#ffe45a', { align: 'center', outline: '#0a0e16' }); }
      else if (f) {
        const a = f.t < 0.12 ? f.t / 0.12 : 1 - U.clamp((f.t - 1.2) / 0.6, 0, 1);
        if (a > 0) { ctx.globalAlpha = a; F.draw(ctx, f.text, W / 2, fy - (1 - Math.min(1, f.t * 6)) * fpx * 3, fpx * 1.1, f.color, { align: 'center', outline: '#0a0e16' }); ctx.globalAlpha = 1; }
      }
      // ---- mission accomplie (bandeau)
      for (const t of game.progress.toasts) {
        const a = Math.min(1, t.t * 6, (2.4 - t.t) * 3), bh = pillH * 1.7, y = H * 0.27, bw = Math.min(W * 0.86, pillH * 9);
        ctx.globalAlpha = a;
        Home.pill(ctx, W / 2 - bw / 2, y, bw, bh, 'rgba(8,60,20,0.88)', '#56ff5a');
        Home.icon.check(ctx, W / 2 - bw / 2 + bh * 0.5, y + bh / 2, bh * 0.26, '#56ff5a');
        F.draw(ctx, t.text, W / 2 + bh * 0.3, y + bh * 0.16, Math.min(px * 1.15, (bw - bh * 1.3) / Math.max(1, F.measure(t.text, 1))), '#ffffff', { align: 'center', outline: '#0a0e16' });
        F.draw(ctx, t.sub, W / 2 + bh * 0.3, y + bh * 0.58, px * 0.95, '#56ff5a', { align: 'center', outline: '#0a0e16' });
        ctx.globalAlpha = 1;
      }
      // ---- bureau : rappel des commandes pendant les premiers vols seulement
      if (!document.body.classList.contains('cc-touch') && s === 'FLIGHT' && (game.progress.P.launches || 0) <= 3 && game.flightTime < 6) {
        const hint = 'SOURIS OU ZQSD : DIRIGER    ESPACE : BOOST';
        F.draw(ctx, hint, W / 2, H * 0.23, Math.min(px * 0.9, W * 0.9 / F.measure(hint, 1)), '#ffffff', { align: 'center', outline: '#0a0e16' });
      }
      // ---- alarme d'altitude
      if (run.altT > 0 && s === 'FLIGHT' && Math.floor(run.altT * 6) % 2 === 0) F.draw(ctx, 'TROP HAUT !', W / 2, H * 0.3, px * 1.6, C.colors.red, { align: 'center', outline: '#0a0e16' });
    }

    // v038j : jauge d'essence en habillage PIXEL — cadre métal à coins en escalier, fenêtre sombre, liquide en aplats, 3 séparateurs, flamme pixelisée
    fuelPixel(game, rk, x, y, w, h, k, c1, c2, boosting, low, blink, fuel) {
      const ctx = this.ctx, C = CC.CONFIG.hud.colors, Home = CC.Home, st = Home.stair, R = Math.round;
      const u = Math.max(2, R(w * 0.11)), c = Math.max(2, R(w * 0.2));
      st(ctx, x - u, y - u, w + 2 * u, h + 2 * u, c); ctx.fillStyle = '#04060c'; ctx.fill();
      st(ctx, x, y, w, h, c); ctx.fillStyle = low && blink ? '#8a2018' : '#5a6270'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(R(x + u * 0.5), R(y + c * 2), u, R(h - c * 4));
      const ix = R(x + u * 1.7), iw = R(w - u * 3.4), iy = R(y + u * 1.7), ih = R(h - u * 1.7 - w * 0.95);
      ctx.fillStyle = '#0a0f1a'; ctx.fillRect(ix, iy, iw, ih);
      const fh = R(ih * k);
      if (fh > 0) { ctx.fillStyle = c2; ctx.fillRect(ix, iy + ih - fh, iw, fh); ctx.fillStyle = c1; ctx.fillRect(ix, iy + ih - fh, R(iw * 0.55), fh); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(ix, iy + ih - fh, iw, u); }
      ctx.fillStyle = '#04060c'; for (let i = 1; i < 4; i++) ctx.fillRect(ix, R(iy + ih * i / 4 - u / 2), iw, u);
      Home.icon.flame(ctx, x + w / 2, y + h - w * 0.5, w * 0.36, blink ? '#ffffff' : (low ? '#ff5a3a' : boosting ? '#ffe45a' : '#7fe0ff'));
      if (rk.active && fuel <= 0) CC.Font.draw(ctx, 'PANNE', x + w / 2, y - w * 1.0, w * 0.075, '#ffffff', { align: 'center', outline: '#ff3b2e' });
      const T = game.input.touch, left = T && T.reboostUntil ? (T.reboostUntil - performance.now()) / CC.CONFIG.input.touch.reboostMs : 0;
      if (rk.active && left > 0 && left <= 1) { ctx.fillStyle = C.yellow; ctx.fillRect(R(x - w * 0.35), R(y + h * (1 - left)), Math.max(3, R(w * 0.12)), R(h * left)); }
    }

    // jauge d'essence VERTICALE v038f — une batterie : capsule métallique, fenêtre sombre à 4 compartiments, liquide cyan qui monte (reflet sur le dessus),
    // halo de la couleur de l'état ; or pendant le boost, rouge qui clignote quand le réservoir est presque vide ; petite flamme dans le culot
    drawFuelBar(game, rk, x, y, w, h) {
      const ctx = this.ctx, C = CC.CONFIG.hud.colors, Home = CC.Home;
      const max = rk.fuelMax || 20, fuel = rk.active ? rk.fuel : max, k = U.clamp(fuel / max, 0, 1);
      const free = rk.active && rk.freeBoost, boosting = rk.active && rk.thrusting && !free, low = k < 0.25 && !free;
      const blink = low && Math.floor(performance.now() / 220) % 2 === 0;
      let c1 = '#b4f4ff', c2 = '#18b4f0', glow = 'rgba(90,220,255,0.55)';
      if (free) { c1 = '#c8ecff'; c2 = '#2a90ff'; glow = 'rgba(100,170,255,0.6)'; } else if (boosting) { c1 = '#fff6a0'; c2 = '#ffb020'; glow = 'rgba(255,210,70,0.75)'; } else if (low) { c1 = blink ? '#ffffff' : '#ff9a8a'; c2 = '#ff2a1a'; glow = 'rgba(255,60,40,0.7)'; }
      if (Home.skin === 'pixel') { this.fuelPixel(game, rk, x, y, w, h, k, c1, c2, boosting, low, blink, fuel); return; }
      const r = w * 0.34, pulse = boosting ? 0.75 + 0.25 * Math.sin(performance.now() * 0.02) : 1;
      ctx.save();
      // halo extérieur (trois liserés translucides : pas de flou, redessiné à chaque image) puis contour sombre
      for (let i = 3; i >= 1; i--) { ctx.strokeStyle = glow.replace(/[\d.]+\)$/, (0.16 * pulse) + ')'); ctx.lineWidth = w * 0.16 * i; Home.rr(ctx, x, y, w, h, r); ctx.stroke(); }
      Home.rr(ctx, x - w * 0.05, y - w * 0.05, w * 1.1, h + w * 0.1, r + w * 0.05); ctx.fillStyle = Home.EDGE; ctx.fill();
      ctx.fillStyle = '#2a303a'; Home.rr(ctx, x, y, w, h, r); ctx.fill();
      // corps métallique (dégradé horizontal) et liseré
      const mg = ctx.createLinearGradient(x, 0, x + w, 0); mg.addColorStop(0, '#4a525e'); mg.addColorStop(0.28, '#c4ccd8'); mg.addColorStop(0.55, '#7c8592'); mg.addColorStop(1, '#3c424c');
      ctx.fillStyle = mg; Home.rr(ctx, x, y, w, h, r); ctx.fill();
      ctx.strokeStyle = low && blink ? '#ff5a4a' : 'rgba(150,230,255,0.9)'; ctx.lineWidth = Math.max(1.5, w * 0.07); Home.rr(ctx, x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, r); ctx.stroke();
      // fenêtre
      const ix = x + w * 0.2, iw = w * 0.6, iy = y + w * 0.2, ih = h - w * 0.2 - w * 1.05, ir = iw * 0.28;
      ctx.fillStyle = '#0a0f16'; Home.rr(ctx, ix, iy, iw, ih, ir); ctx.fill();
      ctx.save(); Home.rr(ctx, ix, iy, iw, ih, ir); ctx.clip();
      const fh = ih * k;
      if (fh > 0.5) {
        const g = ctx.createLinearGradient(0, iy + ih - fh, 0, iy + ih); g.addColorStop(0, c1); g.addColorStop(0.18, c2); g.addColorStop(1, c2);
        ctx.fillStyle = g; ctx.fillRect(ix, iy + ih - fh, iw, fh);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(ix, iy + ih - fh, iw, Math.max(1.5, ih * 0.012));      // surface du liquide
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(ix + iw * 0.14, iy + ih - fh, iw * 0.14, fh);          // reflet vertical
      }
      // compartiments : 3 séparateurs sombres (4 quarts de réservoir)
      ctx.fillStyle = '#0a0f16'; const sw = Math.max(2, ih * 0.034);
      for (let i = 1; i < 4; i++) ctx.fillRect(ix, iy + ih * i / 4 - sw / 2, iw, sw);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(ix, iy, iw * 0.2, ih);                                      // vitre
      ctx.restore();
      // culot : petite flamme
      Home.icon.flame(ctx, x + w / 2, y + h - w * 0.55, w * 0.34, blink ? '#ffffff' : (low ? '#ff5a3a' : boosting ? '#ffe45a' : '#7fe0ff'));
      ctx.restore();
      if (rk.active && fuel <= 0) CC.Font.draw(ctx, 'PANNE', x + w / 2, y - w * 1.0, w * 0.075, '#ffffff', { align: 'center', outline: '#ff3b2e' });
      // fine barre jaune : reposer le doigt relance le boost aussitôt (tactile)
      const T = game.input.touch, left = T && T.reboostUntil ? (T.reboostUntil - performance.now()) / CC.CONFIG.input.touch.reboostMs : 0;
      if (rk.active && left > 0 && left <= 1) { ctx.fillStyle = C.yellow; ctx.fillRect(x - w * 0.35, y + h * (1 - left), Math.max(3, w * 0.12), h * left); }
    }

    // rayons qui filent du centre : lignes fines déterministes qui avancent vers les bords
    drawSpeedLines(W, H, k) {
      const ctx = this.ctx, B = CC.CONFIG.boost, t = performance.now() * 0.001, cx = W / 2, cy = H * 0.42, R = Math.hypot(W, H) * 0.55;
      ctx.save(); ctx.lineCap = 'round';
      const n = Math.round(B.speedLines * (0.5 + 0.5 * k));
      for (let i = 0; i < n; i++) {
        const seed = i * 12.9898, a = (Math.sin(seed) * 43758.5453 % 1 + 1) % 1 * 6.283, sp = 1.6 + ((Math.sin(seed * 1.7) * 9871.3 % 1 + 1) % 1) * 1.6;
        const f = (t * sp + i * 0.137) % 1, r0 = R * (0.3 + 0.7 * f * f), len = R * (0.04 + 0.16 * f) * (0.6 + k);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * k * Math.sin(Math.PI * f)) + ')'; ctx.lineWidth = Math.max(1, H * (0.0012 + 0.003 * f));
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 1.1); ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len) * 1.1); ctx.stroke();
      }
      ctx.restore();
    }

    drawGameRest(game, W, H, C, col, v, rk, lite) {
      // jauge de capacité (MESURÉE : barre jaune sur gris, sous la roquette)
      if (rk && rk.active && (rk.gaugeShowT > 0 || rk.retroActive || rk.grapple.active)) {
        const g = C.gauge, ctx = this.ctx;
        const x0 = g.x0 * W, x1 = g.x1 * W, y0 = g.y0 * H, y1 = g.y1 * H;
        ctx.fillStyle = '#7d7d7d'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillStyle = col.yellow; ctx.fillRect(x0, y0, (x1 - x0) * U.clamp(rk.gauge, 0, 1), y1 - y0);
      }
      if (!game.endlessRun) this.drawFuel(game);   // v034 : la jauge du mode CLASSIQUE est dans drawClassic
      // réticule "x" (MESURÉ 50 % / 40,2 %)
      let cross = (game.state === 'AIM' || game.state === 'FLIGHT') && !lite;   // v024 : pas de curseur sur mobile
      let cx = C.crosshair.x * W, cy = C.crosshair.y * H;
      if (game.state === 'FLIGHT' && rk.active) {
        // v010 : la caméra suit la trajectoire, le réticule indique où la roquette est dirigée
        const p = CC.Curve.apply(this._v.copy(rk.pos).addScaledVector(game.rig.aimDir, 60), game.camera).project(game.camera);
        if (p.z > 1) cross = false;
        else { cx = U.clamp((p.x * 0.5 + 0.5) * W, 0, W); cy = U.clamp((0.5 - p.y * 0.5) * H, 0, H); }
      }
      if (cross) {
        const ctx = this.ctx, sz = C.crosshair.size * this.refH / 2;
        ctx.strokeStyle = col.crosshair; ctx.lineWidth = Math.max(1, H / 540);
        ctx.beginPath(); ctx.moveTo(cx - sz, cy - sz); ctx.lineTo(cx + sz, cy + sz); ctx.moveTo(cx + sz, cy - sz); ctx.lineTo(cx - sz, cy + sz); ctx.stroke();
      }
      if (v !== 'B' && !lite && !game.endlessRun) this.drawPopups(game);   // OBSERVÉ : aucune annonce de style dans les séquences au HUD B
      this.drawIndicators(game);
      this.drawMissileWarning(game);
      if (lite) this.drawTutorial(game, W, H);
      const msg = game.centerMsg || (lite && game.state === 'AIM' && !game.endlessRun ? 'TOUCHE POUR TIRER    MAINTIENS : BOOST' : null);
      // v032 : réduit si le message dépasse la largeur de l'écran (brief de mission long, téléphone en portrait)
      const cpx = msg ? Math.min(C.center.px, 0.94 * W / Math.max(1, CC.Font.measure(msg, this.refH, !this.modern))) : 0;
      if (msg && !game.paused) this.text(msg, 0.5 * W, C.center.y * H, cpx, '#101010', { align: 'center', outline: '#f0f0f0' });   // v024 : pas par-dessus le menu pause
    }

    /* v030 : tutoriel du premier vol (écran tactile, jusqu'au premier niveau terminé) : trois consignes courtes, une à la
     * fois, dans un cartouche en haut de l'écran (hors de la trajectoire), avec un pictogramme animé du geste. */
    drawTutorial(game, W, H) {
      if (game.settings.tutorialDone || (game.settings.tutorialFlights || 0) > 3 || game.state !== 'FLIGHT' || game.paused) return;
      const t = game.flightTime || 0, steps = [['GLISSE POUR DIRIGER', 'drag'], ['MAINTIENS : BOOST', 'hold'], ['DOIGT SUR LE BORD : VIRAGE', 'edge']];
      const i = Math.floor(t / 3.2);
      if (i >= steps.length) return;
      const [label, kind] = steps[i], k = (t % 3.2) / 3.2, a = Math.min(1, k * 6, (1 - k) * 6);
      const ctx = this.ctx, px = this.refH * 0.0042, w = CC.Font.measure(label, px, !this.modern) + px * 14, h = px * 16, x = W / 2 - w / 2, y = H * 0.23;
      ctx.globalAlpha = a;
      CC.Home.pill(ctx, x, y, w, h, 'rgba(10,16,28,0.78)', 'rgba(111,226,255,0.8)');   // v038i : cartouche de verre arrondi
      // pictogramme : doigt (rond) qui glisse, reste posé (anneau qui grossit), ou se place au bord
      const cx = x + px * 6, cy = y + h / 2, r = px * 2.2;
      ctx.fillStyle = '#f4f4f4';
      const ox = kind === 'drag' ? Math.sin(k * Math.PI * 4) * px * 2.5 : kind === 'edge' ? px * 2.5 : 0;
      ctx.beginPath(); ctx.arc(cx + ox, cy, r, 0, Math.PI * 2); ctx.fill();
      if (kind === 'hold') { ctx.strokeStyle = '#fdfd02'; ctx.beginPath(); ctx.arc(cx, cy, r + px * (1 + 2 * ((k * 3) % 1)), 0, Math.PI * 2); ctx.stroke(); }
      this.text(label, x + px * 11, y + h / 2 - px * 3.5, 0.0042, '#f4f4f4', {});
      ctx.globalAlpha = 1;
    }

    // Jauge d'essence (v009) : longueur du cadre proportionnelle au réservoir du niveau, remplissage = essence restante.
    /* v033 : mode CLASSIQUE — distance (le score) en haut au centre, record dessous (jaune une fois battu), palier de
     * difficulté, essence gagnée (+2,4 S) au-dessus de la jauge, alarme ALTITUDE! au-dessus du plafond du couloir. */
    drawEndless(game, W, H, C, col, lite) {
      const run = game.endlessRun, rec = (game.save.endless && game.save.endless.best) || 0, d = Math.round(run.dist);
      const y0 = (lite ? 0.045 : C.timer.y) * H;
      this.text(d + ' M', 0.5 * W, y0, lite ? 0.0052 : 0.0046, col.white, { align: 'center', outline: '#101010' });
      if (rec > 0) this.text(d > rec ? 'NOUVEAU RECORD' : 'RECORD ' + rec + ' M', 0.5 * W, y0 + this.refH * (lite ? 0.068 : 0.098), 0.0021, d > rec ? col.yellow : '#d8d8d8', { align: 'center', outline: '#101010' });
      const D = run.stageLabel();
      this.text(D.label, (this.portrait ? 0.04 : 0.03) * W, y0 + (lite ? 0 : this.refH * 0.1), 0.0024, D.color, { outline: '#101010' });
      if (run.fuelGainT > 0 && game.state === 'FLIGHT') {
        const F = C.fuel, a = Math.min(1, run.fuelGainT / 0.4);
        this.ctx.globalAlpha = a;
        this.text('+' + U.formatDec(run.fuelGain, 1) + ' S', F.x0 * W, (F.labelY - 0.05) * H, 0.0032, col.green, { outline: '#101010' });
        this.ctx.globalAlpha = 1;
      }
      if (run.altT > 0 && game.state === 'FLIGHT' && Math.floor(run.altT * 6) % 2 === 0) this.text('ALTITUDE! DESCENDS', 0.5 * W, 0.3 * H, 0.0036, col.red, { align: 'center', outline: '#101010' });
    }

    drawFuel(game) {
      if (game.state !== 'AIM' && game.state !== 'FLIGHT') return;
      const W = this.canvas.width, H = this.canvas.height, ctx = this.ctx, F = CC.CONFIG.hud.fuel, col = CC.CONFIG.hud.colors;
      const rk = game.rocket, rc = CC.CONFIG.rocket;
      const max = rk.fuelMax || (game.level.fuel || rc.fuelDefault);
      const fuel = rk.active ? rk.fuel : max;
      const frac = U.clamp(fuel / max, 0, 1);
      const x0 = F.x0 * W, y0 = F.y0 * H, h = (F.y1 - F.y0) * H;
      const w = F.w * W * Math.min(1, max / rc.fuelBarMax);
      const boostLeft = rk.active ? rc.ignitionDelay + rc.freeBoost - rk.age : rc.freeBoost;
      let label = 'FUEL ' + U.formatDec(fuel, 1) + 'S', color = frac < 0.25 ? col.red : col.orange;
      if (rk.active && rk.freeBoost) { label = 'FREE BOOST ' + U.formatDec(Math.max(0, boostLeft), 1) + 'S'; color = col.blue; }
      else if (rk.active && fuel <= 0) { label = 'NO FUEL'; color = col.red; }
      if (!document.body.classList.contains('cc-touch') || label === 'NO FUEL') this.text(label, x0, F.labelY * H, F.px, color);   // v022 : au doigt, la barre suffit
      ctx.fillStyle = col.outline; ctx.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
      ctx.fillStyle = '#7d7d7d'; ctx.fillRect(x0, y0, w, h);
      ctx.fillStyle = color; ctx.fillRect(x0, y0, w * frac, h);
      if (rk.active && rk.thrusting && !rk.freeBoost) { ctx.fillStyle = col.white; ctx.fillRect(x0 + w * frac - 2, y0, 2, h); }   // curseur blanc : l'essence brûle
      // v026 (tactile) : fine barre qui se vide pendant la seconde où reposer le doigt relance le boost aussitôt
      const T = game.input.touch, left = T && T.reboostUntil ? (T.reboostUntil - performance.now()) / CC.CONFIG.input.touch.reboostMs : 0;
      if (rk.active && left > 0) { ctx.fillStyle = col.yellow; ctx.fillRect(x0, y0 + h + 4, w * Math.min(1, left), Math.max(2, h * 0.35)); }
    }

    drawPopups(game) {
      const W = this.canvas.width, H = this.canvas.height, P = CC.CONFIG.hud.popups, cfg = CC.CONFIG.style;
      for (const p of game.style.popups) {
        let alpha = 1, rise = 0;
        if (p.live) alpha = 0.92;
        else if (p.age > cfg.popupHold) { const f = (p.age - cfg.popupHold) / cfg.popupFade; alpha = 1 - f; rise = f * cfg.popupRise; }
        if (alpha <= 0) continue;
        const x = this.portrait ? 0.5 + (p.x - P.cx) * 0.3 : p.x;   // v017 : en vertical, annonces recentrées (sinon elles débordent à droite)
        this.text(p.segments, x * W, (p.y - rise) * H, P.px, '#ffffff', { align: 'center', skew: P.skew, alpha });
      }
    }

    // v020 : « MISSILE! » clignotant quand un missile ennemi approche, pour laisser au joueur le temps de manœuvrer ;
    // v026 : « LOW FUEL » clignotant sous le seuil d'essence (état calculé par game.updateWarnings)
    drawMissileWarning(game) {
      const rk = game.rocket, w = game.warn;
      if (game.state !== 'FLIGHT' || !rk.active || !w || game.paused) return;
      const W = this.canvas.width, H = this.canvas.height, col = CC.CONFIG.hud.colors;
      if (w.missile && !(Math.floor(performance.now() / 180) % 2)) this.text('MISSILE!', 0.5 * W, 0.2 * H, 0.0058, col.red, { align: 'center', outline: col.outline });
      // design : repère de chaque missile ennemi proche — crochets rouges autour de lui s'il est à l'écran, flèche au bord
      // de l'écran sinon (on voit d'où vient la menace pour l'esquiver)
      const ctx = this.ctx, cam = game.camera, lw = Math.max(2, H / 360);
      for (const m of game.missiles) {
        if (!m.alive || m.pos.distanceTo(rk.pos) > CC.CONFIG.aa.warnDist) continue;
        const p = CC.Curve.apply(this._v.copy(m.pos), cam).project(cam), behind = p.z > 1;
        if (!behind && Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95) {
          const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H, r = Math.max(7, this.refH * 0.018), c = r * 0.45;
          ctx.strokeStyle = col.red; ctx.lineWidth = lw;
          ctx.beginPath();
          for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(sx + dx * r, sy + dy * (r - c)); ctx.lineTo(sx + dx * r, sy + dy * r); ctx.lineTo(sx + dx * (r - c), sy + dy * r); }
          ctx.stroke();
          continue;
        }
        let x = p.x, y = p.y;
        if (behind) { x = -x; y = -y; }
        const a = Math.atan2(-y, x), m2 = Math.max(Math.abs(x), Math.abs(y)) || 1;
        const ex = U.clamp((x / m2 * 0.5 + 0.5) * W, W * 0.08, W * 0.92), ey = U.clamp((-y / m2 * 0.5 + 0.5) * H, H * 0.16, H * 0.84);   // hors des coins du HUD
        const s = Math.max(8, this.refH * 0.022);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
        ctx.fillStyle = col.red; ctx.strokeStyle = col.outline; ctx.lineWidth = lw * 0.6;
        ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.6, -s * 0.7); ctx.lineTo(-s * 0.25, 0); ctx.lineTo(-s * 0.6, s * 0.7); ctx.closePath();
        ctx.fill(); ctx.stroke(); ctx.restore();
      }
      if (w.lowFuel && !game.endlessRun && !(Math.floor(performance.now() / 300) % 2)) this.text('LOW FUEL', 0.5 * W, 0.2 * H + 0.075 * this.refH, 0.0046, col.orange, { align: 'center', outline: col.outline });
    }

    // Point rouge au bord de l'écran vers les cibles hors champ (ESTIMATION, vu séq. 3/4).
    drawIndicators(game) {
      if (game.state !== 'FLIGHT' && game.state !== 'AIM') return;
      if (game.guideLevel(game.levelIndex, game.level)) return;   // v023 : niveaux 1 à 3 → flèches vertes à la place
      const W = this.canvas.width, H = this.canvas.height, ctx = this.ctx, cam = game.camera;
      for (const t of game.targets) {
        if (!t.alive || t.guard) continue;   // v021 : pas de repère vers les tanks de garde
        const p = CC.Curve.apply(this._v.copy(t.obb.c), cam).project(cam);
        const behind = p.z > 1;
        if (!behind && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) {
          // v023 : cible à l'écran → repère rouge permanent sur elle (il ne disparaît plus quand on fonce dessus)
          const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H, r = Math.max(5, H * 0.012);
          // v038i : repère en crochets d'angle arrondis (contour sombre + rouge vif) et point central
          const lw = Math.max(2, H / 330), k = r * 0.62;
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (const [col, w] of [['rgba(4,8,16,0.9)', lw * 2.1], ['#ff3b2e', lw]]) {
            ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
            for (const [ax, ay] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(sx + ax * r, sy + ay * (r - k)); ctx.lineTo(sx + ax * r, sy + ay * r); ctx.lineTo(sx + ax * (r - k), sy + ay * r); }
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
          ctx.fillStyle = 'rgba(4,8,16,0.9)'; ctx.beginPath(); ctx.arc(sx, sy, lw * 1.9, 0, 6.283); ctx.fill();
          ctx.fillStyle = '#ff3b2e'; ctx.beginPath(); ctx.arc(sx, sy, lw * 1.1, 0, 6.283); ctx.fill();
          continue;
        }
        let x = p.x, y = p.y;
        if (behind) { x = -x; y = -y; }
        const m = Math.max(Math.abs(x), Math.abs(y)) || 1;
        x /= m; y /= m;
        const sx = (x * 0.5 + 0.5) * W, sy = (-y * 0.5 + 0.5) * H;
        const s = Math.max(5, H * 0.011), ex = U.clamp(sx, s * 2, W - s * 2), ey = U.clamp(sy, s * 2, H - s * 2), ang = Math.atan2(-y, x);   // v038i : flèche vers la cible hors champ
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, -s * 0.8); ctx.lineTo(-s * 0.35, 0); ctx.lineTo(-s * 0.7, s * 0.8); ctx.closePath();
        ctx.fillStyle = '#ff3b2e'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.5, s * 0.22); ctx.strokeStyle = 'rgba(4,8,16,0.9)'; ctx.stroke(); ctx.restore();
      }
    }
  }

  CC.HUD = HUD;
})();

/* v075 : écrans du MODE NIVEAUX (style pixel) — carte des niveaux, indication du niveau sur l'accueil, résultat d'un niveau (coffre / progression). */
(function () {
  const Home = CC.Home, U = CC.U, F = CC.Font, GOLD = '#d9a441', CY = '#7be8ff', GREEN = '#56d98b';
  const text = (ctx, s, x, y, px, color, o) => F.draw(ctx, s, x, y, px, color, o || {});
  const R = Math.round;

  // ---------- carte des niveaux : 30 cases, la dernière ouverte clignote ; SANS FIN en bas
  Home.drawMap = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { u, Y } = L; ui.dim(ctx, W, H, 0.9);
    const lv = game.save.lvl || { cur: 1, max: 1, done: {} }, max = lv.max || 1, cur = lv.cur || 1, done = lv.done || {};
    const tp = ui.fitPx(['NIVEAUX'], W * 0.7, u * 0.011);
    text(ctx, 'NIVEAUX', W / 2, Y(0.05), tp, '#ffffff', { align: 'center', skew: -0.2 });
    const cols = 5, gw = W * 0.9, cell = gw / cols, gap = cell * 0.14, size = cell - gap, x0 = W * 0.05 + gap / 2, y0 = Y(0.14), t = performance.now() / 1000;
    for (let n = 1; n <= CC.LM.count; n++) {
      const col = (n - 1) % cols, row = Math.floor((n - 1) / cols), x = R(x0 + col * cell), y = R(y0 + row * cell), open = n <= max, isDone = !!done[n], isCur = n === cur && lv.mode !== 'endless';
      const blink = isCur && Math.floor(t * 2.5) % 2 === 0;
      Home.pill(ctx, x, y, size, size, isDone ? 'rgba(20,70,40,0.95)' : open ? (blink ? 'rgba(90,70,24,0.97)' : 'rgba(38,45,54,0.97)') : 'rgba(18,22,28,0.95)', isCur ? GOLD : isDone ? GREEN : open ? '#5a6674' : '#2a313a', size * 0.14);
      if (open) text(ctx, String(n), x + size / 2, y + size * 0.3, ui.fitPx([String(n)], size * 0.6, size * 0.03), isDone ? GREEN : '#ffffff', { align: 'center' });
      else if (Home.icon.lock) Home.icon.lock(ctx, x + size / 2, y + size / 2, size * 0.16, '#5a6674');
      if (open) ui.buttons.push({ x, y, w: size, h: size, action: () => { game.setLevel(n); ui.overlay = null; game.goHome({}); } });
    }
    // zone du niveau choisi
    const def = CC.LM.def(cur), zn = (CC.Zones.meta[def.zone] && CC.Zones.meta[def.zone].label) || def.zone.toUpperCase();
    const info = 'NIVEAU ' + cur + '   ' + zn, ip = ui.fitPx([info], W * 0.86, u * 0.0042);
    text(ctx, info, W / 2, Y(0.14) + 6 * (size + gap) + u * 0.02, ip, '#c8d0dc', { align: 'center' });
    // mode sans fin
    const bw = W * 0.6, bh = Math.max(u * 0.11, 44 * ui.pixelRatio()), bx = W / 2 - bw / 2, by = Y(0.79), endless = lv.mode === 'endless';
    Home.pill(ctx, bx, by, bw, bh, endless ? 'rgba(90,70,24,0.97)' : 'rgba(38,45,54,0.97)', endless ? GOLD : '#5a6674', bh * 0.3);
    text(ctx, 'SANS FIN', W / 2, by + bh / 2 - ui.fitPx(['SANS FIN'], bw * 0.7, bh * 0.04) * 3.6, ui.fitPx(['SANS FIN'], bw * 0.7, bh * 0.04), '#ffffff', { align: 'center' });
    ui.buttons.push({ x: bx, y: by, w: bw, h: bh, action: () => { const S = (game.save.lvl = game.save.lvl || { cur: 1, max: 1, done: {}, tries: {}, mode: 'level' }); S.mode = 'endless'; game.writeSave(); ui.overlay = null; game.goHome({}); } });
    Home.backButton(ui, ctx, L, ui.key('RETOUR', 'ESC'), () => { ui.overlay = null; });
  };

  // ---------- accueil : niveau en cours + accès à la carte
  const oldHome = Home.drawHome;
  Home.drawHome = function (ui, ctx, game, W, H) {
    oldHome.apply(this, arguments);
    const L = Home.layout(ui, W, H), { u, Y } = L, lv = game.levelRun;
    const label = lv ? 'NIVEAU ' + lv.n : 'SANS FIN', lp = ui.fitPx([label], W * 0.6, u * 0.009);
    text(ctx, label, W / 2, Y(0.27), lp, '#ffffff', { align: 'center' });
    const bw = W * 0.4, bh = Math.max(u * 0.1, 40 * ui.pixelRatio()), bx = W * 0.05, by = Y(0.9) - bh;
    Home.pill(ctx, bx, by, bw, bh, 'rgba(38,45,54,0.97)', '#5a6674', bh * 0.3);
    const bp = ui.fitPx(['NIVEAUX'], bw * 0.75, bh * 0.04);
    text(ctx, 'NIVEAUX', bx + bw / 2, by + bh / 2 - bp * 3.6, bp, '#ffffff', { align: 'center' });
    ui.buttons.push({ x: bx, y: by, w: bw, h: bh, action: () => { ui.overlay = 'map'; } });
  };

  // ---------- résultat d'un niveau
  const oldResults = Home.drawResults;
  Home.drawResults = function (ui, ctx, game, W, H) {
    const r = game.results; if (!r || !r.level) return oldResults.apply(this, arguments);
    const L = Home.layout(ui, W, H), { u, Y } = L, lv = r.level, t = r.t || 0, win = lv.win, cx = W / 2;
    ui.dim(ctx, W, H, 0.82);
    const title = win ? 'NIVEAU ' + lv.n + ' REUSSI !' : 'NIVEAU ' + lv.n, tp = ui.fitPx([title], W * 0.9, u * 0.01);
    text(ctx, title, cx, Y(0.1), tp, win ? GOLD : '#ffffff', { align: 'center', skew: -0.2 });
    if (win) {
      // coffre : le couvercle s'ouvre, les écrous jaillissent et se comptent
      const s = u * 0.035, ccx = cx, ccy = Y(0.3), open = U.clamp((t - 0.5) / 0.4, 0, 1);
      ctx.fillStyle = '#6a4a22'; ctx.fillRect(R(ccx - s * 5), R(ccy), R(s * 10), R(s * 5)); ctx.fillStyle = '#8a6a32'; ctx.fillRect(R(ccx - s * 5), R(ccy), R(s * 10), R(s * 1.2));
      ctx.fillStyle = GOLD; ctx.fillRect(R(ccx - s * 0.8), R(ccy + s * 1.4), R(s * 1.6), R(s * 2));
      ctx.save(); ctx.translate(ccx - s * 5, ccy); ctx.rotate(-open * 1.0); ctx.fillStyle = '#8a6a32'; ctx.fillRect(0, R(-s * 2), R(s * 10), R(s * 2)); ctx.fillStyle = GOLD; ctx.fillRect(0, R(-s * 2), R(s * 10), R(s * 0.4)); ctx.restore();
      if (open > 0.99) for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (i / 14 - 0.5) * 2.2, k = U.clamp((t - 0.9 - i * 0.03) / 0.7, 0, 1); if (k <= 0) continue; const px = ccx + Math.cos(a) * u * 0.45 * k, py = ccy - Math.sin(-a) * 0 + Math.sin(a) * u * 0.45 * k + u * 0.45 * k * k * 0.9; ctx.globalAlpha = 1 - k * k; ctx.fillStyle = i % 2 ? '#ffc52b' : '#fff2a8'; ctx.fillRect(R(px), R(py), R(s * 1.1), R(s * 1.1)); ctx.globalAlpha = 1; }
      const shown = Math.round(lv.chest * U.clamp((t - 1.0) / 0.9, 0, 1)), np = ui.fitPx(['+000'], W * 0.5, u * 0.012);
      text(ctx, '+' + shown, cx, Y(0.5), np, GOLD, { align: 'center' });
      if (t < 1.9 && (r.tickAt || 0) + 0.07 < t && t > 1.0) { r.tickAt = t; game.audio.play('xpTick', null, Math.floor(shown / Math.max(1, lv.chest) * 8)); }
      if (!r.cheered && t > 0.5) { r.cheered = true; game.audio.play('levelUp'); if (CC.Haptics) CC.Haptics.pattern('levelUp'); }
    } else {
      // progression : barre large + pourcentage
      const bw = W * 0.8, bh = Math.max(u * 0.07, 28), bx = cx - bw / 2, by = Y(0.34), pct = lv.pct * U.clamp(t / 0.8, 0, 1);
      ctx.fillStyle = 'rgba(8,12,18,0.6)'; ctx.fillRect(R(bx), R(by), R(bw), R(bh)); ctx.fillStyle = lv.boss ? '#ff3b2e' : GOLD; ctx.fillRect(R(bx), R(by), R(bw * pct), R(bh));
      const pp = ui.fitPx(['100 %'], W * 0.5, u * 0.014);
      text(ctx, Math.round(pct * 100) + ' %', cx, by + bh + u * 0.04, pp, '#ffffff', { align: 'center' });
      if (lv.boss) text(ctx, 'BOSS ATTEINT', cx, Y(0.56), ui.fitPx(['BOSS ATTEINT'], W * 0.8, u * 0.006), '#ff6a5a', { align: 'center' });
    }
    // boutons
    const bw = W * 0.8, bx = cx - bw / 2, bh1 = Math.max(u * 0.17, 60 * ui.pixelRatio()), bh0 = Math.max(u * 0.1, 40 * ui.pixelRatio()), yMain = Y(0.975) - bh1, yMap = yMain - bh0 - u * 0.03;
    const lbl = win ? 'SUIVANT' : 'REJOUER', lp = ui.fitPx([lbl], bw * 0.7, bh1 * 0.045), on = ui.mouse && ui.mouse.y >= yMain && ui.mouse.y <= yMain + bh1;
    if (t > 0.5) {
      Home.button3d(ctx, bx, yMain, bw, bh1, on ? '#f0d28a' : GOLD, GOLD, '#9a7126', 1 + 0.02 * Math.sin(t * 5));
      text(ctx, lbl, cx, yMain + bh1 / 2 - lp * 3.6 - bh1 * 0.03, lp, '#14181d', { align: 'center' });
      ui.buttons.push({ x: bx, y: yMain, w: bw, h: bh1, action: () => { const go = () => game.goHome({ autoLaunch: !win }); game.ads ? game.ads.beforeContinue(go) : go(); } });
      Home.pill(ctx, bx, yMap, bw, bh0, 'rgba(38,45,54,0.97)', '#5a6674', bh0 * 0.3);
      const mp = ui.fitPx(['NIVEAUX'], bw * 0.6, bh0 * 0.04); text(ctx, 'NIVEAUX', cx, yMap + bh0 / 2 - mp * 3.6, mp, '#ffffff', { align: 'center' });
      ui.buttons.push({ x: bx, y: yMap, w: bw, h: bh0, action: () => { game.goHome({}); ui.overlay = 'map'; } });
    }
  };
})();

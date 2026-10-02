/* v075 : écrans du MODE NIVEAUX (style pixel) — carte des niveaux, indication du niveau sur l'accueil, résultat d'un niveau (coffre / progression).
 * v078 : 60 niveaux en 2 pages, vrai coffre pixel animé (il tombe, tremble, s'ouvre sur une gerbe de pièces), pictogrammes pixel de l'écrou-pièce et des réglages. */
(function () {
  const Home = CC.Home, U = CC.U, F = CC.Font, GOLD = '#d9a441', GREEN = '#56d98b';
  const text = (ctx, s, x, y, px, color, o) => F.draw(ctx, s, x, y, px, color, o || {});
  const R = Math.round, OUT = '#2a1608';

  // ---------- sprites pixel dessinés par le code (petite grille agrandie sans lissage, mise en cache)
  const cache = {};
  function sprite(key, w, h, fn, outline) {
    if (!cache[key]) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }, g, w, h);
      if (outline) {   // contour sombre d'un pixel autour de la forme
        const id = g.getImageData(0, 0, w, h), d = id.data, a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]), add = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) add.push(x, y);
        g.fillStyle = OUT; for (let i = 0; i < add.length; i += 2) g.fillRect(add[i], add[i + 1], 1, 1);
      }
      cache[key] = c;
    }
    return cache[key];
  }
  function blit(ctx, c, cx, cy, wTarget, anchorBottom) {
    const s = Math.max(1, Math.round(wTarget / c.width)), w = c.width * s, h = c.height * s;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(c, R(cx - w / 2), R(anchorBottom ? cy - h : cy - h / 2), w, h);
  }
  // pièces d'or empilées (monnaie)
  const coinSprite = () => sprite('coins', 22, 22, (px) => {
    const coin = (cx, cy) => {
      for (let y = -5; y <= 5; y++) { const k = Math.sqrt(Math.max(0, 1 - (y / 5.2) * (y / 5.2))), hw = R(9.5 * k); px(cx - hw, cy + y, 2 * hw + 1, 1, y < 0 ? '#ffe27a' : '#ffd23a'); }
      for (let y = 0; y <= 3; y++) { const k = Math.sqrt(Math.max(0, 1 - (5.2 * 0 / 5.2))), hw = R(9.5 * k); px(cx - hw, cy + 5 + y, 2 * hw + 1, 1, y === 3 ? '#8a5a10' : '#c98a1c'); }
      px(cx - 5, cy - 1, 11, 2, '#f0a81e'); px(cx - 3, cy - 2, 7, 1, '#fff2a8');
    };
    coin(11, 6); coin(11, 11); coin(11, 16);
    px(5, 4, 3, 1, '#fffbe0'); px(5, 9, 2, 1, '#fffbe0');
  }, true);
  // engrenage acier à trois tons
  const gearSprite = () => sprite('gear', 26, 26, (px) => {
    const c = 12.5, n = 8, mask = (x, y) => { const dx = x - c, dy = y - c, r = Math.hypot(dx, dy); if (r < 3.4) return 0; const a = Math.atan2(dy, dx), tooth = Math.cos(a * n) > 0.15 ? 1 : 0; return r < 7.7 + 3.4 * tooth ? 1 : 0; };
    for (let y = 0; y < 26; y++) for (let x = 0; x < 26; x++) {
      if (!mask(x, y)) continue;
      const edge = !mask(x - 1, y) || !mask(x + 1, y) || !mask(x, y - 1) || !mask(x, y + 1), dx = x - c, dy = y - c, lit = dx + dy < -2, dark = dx + dy > 4, r = Math.hypot(dx, dy);
      px(x, y, 1, 1, edge ? '#1d2b53' : r < 5.4 ? '#83769c' : lit ? '#f4f6f8' : dark ? '#7d8795' : '#c2c3c7');
    }
    for (let y = 8; y <= 17; y++) for (let x = 8; x <= 17; x++) { const r = Math.hypot(x - c, y - c); if (r < 3.4 && r > 2.4) px(x, y, 1, 1, '#1d2b53'); else if (r <= 2.4) px(x, y, 1, 1, '#0c1220'); }
  });
  Home.drawCoinIcon = (ctx, cx, cy, size) => blit(ctx, coinSprite(), cx, cy, size);
  Home.drawGearIcon = (ctx, cx, cy, size, hover) => { if (hover) ctx.globalAlpha = 1; blit(ctx, gearSprite(), cx, cy, size); };

  // coffre : corps, couvercle fermé, couvercle ouvert (derrière) + trésor
  const chestBody = () => sprite('chestBody', 26, 14, (px) => {
    px(1, 0, 24, 14, OUT); px(2, 1, 22, 12, '#8a5a2a');
    for (let y = 4; y < 13; y += 4) px(2, y, 22, 1, '#6a4220');
    px(2, 1, 22, 1, '#a8743a');
    for (const x of [5, 18]) { px(x - 1, 0, 5, 14, OUT); px(x, 1, 3, 12, '#aab4c0'); px(x, 1, 1, 12, '#e8ecef'); px(x + 2, 1, 1, 12, '#6f7a88'); }
    px(10, 0, 6, 8, OUT); px(11, 1, 4, 6, '#ffd23a'); px(11, 1, 4, 1, '#fff2a8'); px(12, 3, 2, 3, '#3a2000');
    px(1, 13, 24, 1, OUT);
  });
  const chestLid = () => sprite('chestLid', 26, 9, (px) => {
    px(3, 0, 20, 1, OUT); px(1, 1, 24, 8, OUT); px(1, 1, 1, 1, '#0000'); px(2, 1, 22, 7, '#a8743a'); px(4, 1, 18, 1, '#c88e4a');
    px(2, 4, 22, 1, '#8a5a2a'); px(2, 7, 22, 1, '#6a4220');
    for (const x of [5, 18]) { px(x - 1, 0, 5, 9, OUT); px(x, 1, 3, 8, '#aab4c0'); px(x, 1, 1, 8, '#e8ecef'); }
    px(0, 0, 3, 1, '#0000');
  });
  const chestGlow = () => sprite('chestGlow', 26, 6, (px) => {
    px(0, 0, 26, 6, OUT); px(1, 1, 24, 5, '#3a2000');
    for (let i = 0; i < 12; i++) { const h = 1 + ((i * 7) % 3), x = 2 + i * 2; px(x, 5 - h - 1, 2, h + 1, i % 2 ? '#ffd23a' : '#fff2a8'); }
  });

  const rnd = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- carte des niveaux : 60 niveaux en 2 pages de 30 ; la dernière ouverte clignote
  Home.drawMap = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { u, Y } = L; ui.dim(ctx, W, H, 0.9);
    const lv = game.save.lvl || { cur: 1, max: 1, done: {} }, max = lv.max || 1, cur = lv.cur || 1, done = lv.done || {}, PAGE = 30, pages = Math.ceil(CC.LM.count / PAGE);
    if (ui.mapPage === undefined || ui.mapPage === null) ui.mapPage = Math.floor((cur - 1) / PAGE);
    const pg = U.clamp(ui.mapPage, 0, pages - 1);
    const tp = ui.fitPx(['NIVEAUX'], W * 0.7, u * 0.011);
    text(ctx, 'NIVEAUX', W / 2, Y(0.05), tp, '#ffffff', { align: 'center', skew: -0.2 });
    const cols = 5, gw = W * 0.9, cell = gw / cols, gap = cell * 0.14, size = cell - gap, x0 = W * 0.05 + gap / 2, y0 = Y(0.14), t = performance.now() / 1000;
    for (let i = 0; i < PAGE; i++) {
      const n = pg * PAGE + i + 1; if (n > CC.LM.count) break;
      const col = i % cols, row = Math.floor(i / cols), x = R(x0 + col * cell), y = R(y0 + row * cell), open = n <= max, isDone = !!done[n], isCur = n === cur;
      const blink = isCur && Math.floor(t * 2.5) % 2 === 0;
      Home.pill(ctx, x, y, size, size, isDone ? 'rgba(20,70,40,0.95)' : open ? (blink ? 'rgba(90,70,24,0.97)' : 'rgba(38,45,54,0.97)') : 'rgba(18,22,28,0.95)', isCur ? GOLD : isDone ? GREEN : open ? '#5a6674' : '#2a313a', size * 0.14);
      if (open) text(ctx, String(n), x + size / 2, y + size * 0.3, ui.fitPx([String(n)], size * 0.6, size * 0.03), isDone ? GREEN : '#ffffff', { align: 'center' });
      else if (Home.icon.lock) Home.icon.lock(ctx, x + size / 2, y + size / 2, size * 0.16, '#5a6674');
      if (open) ui.buttons.push({ x, y, w: size, h: size, action: () => { game.setLevel(n); ui.overlay = null; game.goHome({}); } });
    }
    const yb = y0 + 6 * cell + u * 0.01, bh = Math.max(u * 0.07, 30 * ui.pixelRatio()), bw = bh * 1.6;
    const arrow = (x, dir, ok) => {
      Home.pill(ctx, x, yb, bw, bh, ok ? 'rgba(38,45,54,0.97)' : 'rgba(18,22,28,0.9)', ok ? '#5a6674' : '#2a313a', bh * 0.3);
      const s = Math.max(3, R(bh * 0.09)), cx = x + bw / 2, cy = yb + bh / 2; ctx.fillStyle = ok ? '#ffffff' : '#3a424c';
      const tipX = cx + dir * 1.5 * s;
      for (let k = 0; k < 4; k++) { const ax = R(tipX - dir * k * s - s / 2); ctx.fillRect(ax, R(cy - k * s - s / 2), s, s); if (k) ctx.fillRect(ax, R(cy + k * s - s / 2), s, s); }
      if (ok) ui.buttons.push({ x, y: yb, w: bw, h: bh, action: () => { ui.mapPage = pg + dir; } });
    };
    arrow(W * 0.05, -1, pg > 0); arrow(W * 0.95 - bw, 1, pg < pages - 1);
    const pgl = (pg + 1) + ' / ' + pages; text(ctx, pgl, W / 2, yb + bh / 2 - ui.fitPx([pgl], W * 0.2, u * 0.004) * 3.6, ui.fitPx([pgl], W * 0.2, u * 0.004), '#8a96a8', { align: 'center' });
    // zone du niveau choisi
    const def = CC.LM.def(cur), zn = (CC.Zones.meta[def.zone] && CC.Zones.meta[def.zone].label) || def.zone.toUpperCase();
    const info = 'NIVEAU ' + cur + '   ' + zn, ip = ui.fitPx([info], W * 0.86, u * 0.0042), iy = yb + bh + u * 0.025;
    text(ctx, info, W / 2, iy, ip, '#c8d0dc', { align: 'center' });
    text(ctx, def.theme.name, W / 2, iy + ip * 9, ui.fitPx([def.theme.name], W * 0.86, u * 0.0034), GOLD, { align: 'center' });
    Home.backButton(ui, ctx, L, ui.key('RETOUR', 'ESC'), () => { ui.overlay = null; ui.mapPage = null; });
  };

  // ---------- accueil : niveau en cours (plus de bouton NIVEAUX : la carte s'ouvre par l'onglet MAP)
  const oldHome = Home.drawHome;
  Home.drawHome = function (ui, ctx, game, W, H) {
    oldHome.apply(this, arguments);
    const L = Home.layout(ui, W, H), { u, Y } = L, lv = game.levelRun;
    const label = lv ? 'NIVEAU ' + lv.n : '', lp = ui.fitPx([label], W * 0.6, u * 0.009);
    text(ctx, label, W / 2, Y(0.27), lp, '#ffffff', { align: 'center' });
    if (lv && lv.theme) { const th = lv.theme.name, tp2 = ui.fitPx([th], W * 0.8, u * 0.0042); text(ctx, th, W / 2, Y(0.27) + lp * 9, tp2, GOLD, { align: 'center' }); }
  };

  // ---------- résultat d'un niveau : le coffre tombe, tremble, s'ouvre sur un jet de pièces
  const oldResults = Home.drawResults;
  Home.drawResults = function (ui, ctx, game, W, H) {
    const r = game.results; if (!r || !r.level) return oldResults.apply(this, arguments);
    const L = Home.layout(ui, W, H), { u, Y } = L, lv = r.level, t = r.t || 0, win = lv.win, cx = W / 2;
    ui.dim(ctx, W, H, 0.84);
    const title = win ? 'NIVEAU ' + lv.n + ' REUSSI !' : 'NIVEAU ' + lv.n, tp = ui.fitPx([title], W * 0.9, u * 0.01);
    text(ctx, title, cx, Y(0.1) - (win ? Math.max(0, 1 - t * 4) * u * 0.1 : 0), tp, win ? GOLD : '#ffffff', { align: 'center', skew: -0.2 });
    if (win) {
      const cw = u * 0.56, s = cw / 26, ccx = cx, floor = Y(0.46), shakeT = U.clamp((t - 0.45) / 0.55, 0, 1), opened = t > 1.0, ot = t - 1.0;
      // chute avec rebond
      const dropK = U.clamp(t / 0.45, 0, 1), drop = (1 - dropK) * (1 - dropK) * -u * 0.6 - (t > 0.45 && t < 0.62 ? Math.sin((t - 0.45) / 0.17 * Math.PI) * u * 0.03 : 0);
      const sh = opened ? 0 : Math.sin(t * 60) * shakeT * s * 1.2, cy = floor + drop, bodyY = cy - 14 * s, ccxs = ccx + sh;
      // lueur et rayons
      if (opened) {
        const a = U.clamp(ot * 4, 0, 1) * (0.42 - 0.18 * U.clamp(ot / 2, 0, 1)), gx = ccx, gy = bodyY;
        ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * 0.5);
        for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = i % 2 ? 'rgba(255,210,58,' + a + ')' : 'rgba(255,242,168,' + a * 0.8 + ')'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.9, -W * 0.05); ctx.lineTo(W * 0.9, W * 0.05); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        const fl = U.clamp(1 - ot * 5, 0, 1); if (fl > 0) { ctx.fillStyle = 'rgba(255,248,210,' + fl * 0.8 + ')'; ctx.fillRect(0, 0, W, H); }
      }
      // ombre au sol
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(R(ccx - cw * 0.5), R(floor + s), R(cw), R(s * 1.6));
      // le couvercle : fermé, soulevé par à-coups puis rabattu derrière
      const lidFrames = opened ? (ot < 0.08 ? 1 : ot < 0.16 ? 2 : 3) : 0;
      const body = chestBody(), lid = chestLid(), glow = chestGlow();
      if (lidFrames === 3 || lidFrames === 2) {   // couvercle ouvert : dressé derrière le corps
        const ly = bodyY - (lidFrames === 3 ? 10 : 7) * s; ctx.imageSmoothingEnabled = false; ctx.drawImage(lid, R(ccxs - 13 * s), R(ly), R(26 * s), R(lidFrames === 3 ? 7 * s : 9 * s));
      }
      blit(ctx, body, ccxs, bodyY + 7 * s, 26 * s);
      if (opened && lidFrames >= 2) blit(ctx, glow, ccxs, bodyY - 3 * s, 26 * s);
      if (lidFrames === 0) blit(ctx, lid, ccxs, bodyY - 4.5 * s, 26 * s);
      else if (lidFrames === 1) { ctx.imageSmoothingEnabled = false; ctx.drawImage(lid, R(ccxs - 13 * s), R(bodyY - 8 * s), R(26 * s), R(9 * s)); }
      // étincelles pendant que ça tremble
      if (!opened && shakeT > 0.2) for (let i = 0; i < 4; i++) { const q = (t * 3 + i * 0.37) % 1, ax = ccx + (rnd(i, 3) - 0.5) * cw * 0.9, ay = bodyY - q * u * 0.1; ctx.globalAlpha = 1 - q; ctx.fillStyle = '#fff2a8'; ctx.fillRect(R(ax), R(ay), R(s), R(s)); ctx.globalAlpha = 1; }
      // jet de pièces
      if (opened) {
        const N = 26, g = u * 1.7;
        for (let i = 0; i < N; i++) {
          const tt = ot - 0.12 - i * 0.022; if (tt <= 0 || tt > 2.6) continue;
          const a = -Math.PI / 2 + (rnd(i, 1) - 0.5) * 1.5, v = u * (0.55 + rnd(i, 2) * 0.5);
          let px0 = ccx + Math.cos(a) * v * tt, py0 = bodyY + Math.sin(a) * v * tt + 0.5 * g * tt * tt; const fy = floor + s * 2;
          if (py0 > fy) py0 = fy - (py0 - fy) * 0.3 - Math.abs(Math.sin(tt * 9)) * 0; if (py0 > fy) py0 = fy;
          const wk = Math.abs(Math.cos(tt * 11 + i)), cwid = Math.max(s, R(s * 4.2 * wk)), chh = R(s * 4.2), al = tt > 2.1 ? 1 - (tt - 2.1) / 0.5 : 1;
          ctx.globalAlpha = al; ctx.fillStyle = OUT; ctx.fillRect(R(px0 - cwid / 2 - s * 0.6), R(py0 - chh / 2 - s * 0.6), R(cwid + s * 1.2), R(chh + s * 1.2)); ctx.fillStyle = i % 3 ? '#ffd23a' : '#fff2a8'; ctx.fillRect(R(px0 - cwid / 2), R(py0 - chh / 2), R(cwid), R(chh)); ctx.fillStyle = '#c98a1c'; ctx.fillRect(R(px0 - cwid / 2), R(py0 + chh / 2 - s), R(cwid), R(s)); ctx.globalAlpha = 1;
        }
        for (let i = 0; i < 9; i++) { const q = (ot * 1.4 + rnd(i, 5)) % 1, ax = ccx + (rnd(i, 6) - 0.5) * W * 0.8, ay = bodyY - rnd(i, 7) * u * 0.5, sz = R(s * (1 + Math.sin(q * Math.PI) * 1.6)); ctx.globalAlpha = Math.sin(q * Math.PI); ctx.fillStyle = '#ffffff'; ctx.fillRect(R(ax - sz / 2), R(ay - sz * 1.5), sz, sz * 3); ctx.fillRect(R(ax - sz * 1.5), R(ay - sz / 2), sz * 3, sz); ctx.globalAlpha = 1; }
      }
      // total d'écrous : compte à rebours, pièce pixel à gauche
      const shown = Math.round(lv.chest * U.clamp((t - 1.25) / 1.0, 0, 1)), np = ui.fitPx(['+000'], W * 0.5, u * 0.012);
      if (t > 1.2) {
        const lbl = '+' + shown, wl = F.measure(lbl, np), ic = np * 8, gx2 = cx - (wl + ic + np * 3) / 2, pop = t < 2.3 ? 1 + 0.06 * Math.sin(t * 40) : 1;
        Home.drawCoinIcon(ctx, gx2 + ic / 2, Y(0.63) + np * 3.5, ic);
        text(ctx, lbl, gx2 + ic + np * 3, Y(0.63) - (pop - 1) * np * 8, np * pop, GOLD, {});
      }
      if (t < 2.3 && (r.tickAt || 0) + 0.06 < t && t > 1.25) { r.tickAt = t; game.audio.play('xpTick', null, Math.floor(shown / Math.max(1, lv.chest) * 8)); }
      if (!r.cheered && t > 1.0) { r.cheered = true; game.audio.play('levelUp'); if (CC.Haptics) CC.Haptics.pattern('levelUp'); }
      if (!r.thump && t > 0.45) { r.thump = true; game.audio.play('boom'); }
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
    if (t > (win ? 2.0 : 0.5)) {
      Home.button3d(ctx, bx, yMain, bw, bh1, on ? '#f0d28a' : GOLD, GOLD, '#9a7126', 1 + 0.02 * Math.sin(t * 5));
      text(ctx, lbl, cx, yMain + bh1 / 2 - lp * 3.6 - bh1 * 0.03, lp, '#14181d', { align: 'center' });
      ui.buttons.push({ x: bx, y: yMain, w: bw, h: bh1, action: () => { const go = () => game.goHome({ autoLaunch: !win }); game.ads ? game.ads.beforeContinue(go) : go(); } });
      Home.pill(ctx, bx, yMap, bw, bh0, 'rgba(38,45,54,0.97)', '#5a6674', bh0 * 0.3);
      const mp = ui.fitPx(['NIVEAUX'], bw * 0.6, bh0 * 0.04); text(ctx, 'NIVEAUX', cx, yMap + bh0 / 2 - mp * 3.6, mp, '#ffffff', { align: 'center' });
      ui.buttons.push({ x: bx, y: yMap, w: bw, h: bh0, action: () => { game.goHome({}); ui.overlay = 'map'; } });
    }
  };
})();

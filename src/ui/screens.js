/* v043 : NOUVELLE DA DES ECRANS (d'après les maquettes du joueur) — en-tête marine (avatar + niveau + record), fond bleu acier, panneaux marine à coins en
 * escalier, pastilles vertes « + » / « ACHETER », barre de trois onglets à grosses icônes qui dépassent (GARAGE · MAP · BOUTIQUE).
 *   ACCUEIL  : en-tête, roquette, « APPUYER POUR JOUER », barre d'onglets
 *   GARAGE   : la roquette de profil, 4 emplacements, 4 jauges à segments avec « + » (les améliorations payées en écrous)
 *   MAP      : la mission, les décors (ouverts ou verrouillés) et l'entrée DEFIS
 *   BOUTIQUE : bandeau, onglets par rareté, grille de fiches (icône, nom, prix, ACHETER), solde dans la colonne de droite
 * Les icônes sont dessinées en pixels (grille 16×16, plusieurs couleurs) dans un petit canevas mis en cache puis agrandies sans lissage. */
(function () {
  const U = CC.U, F = CC.Font, Home = CC.Home;
  const NAVY = '#1d232b', PANEL = '#262d36', DARK = '#14181d', EDGE = '#5a6674', STEEL = '#3b4652', STEEL2 = '#505d6b', CREAM = '#e8ecef', GOLD = '#d9a441', DIM = '#8995a1', GREEN = '#d9a441', GREEN_D = '#9a7126', RED = '#d0473e';
  const hit = (ui, x, y, w, h, action) => ui.buttons.push({ x, y, w, h, action });
  const inRect = (ui, x, y, w, h) => !ui.isTouch() && ui.mouse.x >= x && ui.mouse.x <= x + w && ui.mouse.y >= y && ui.mouse.y <= y + h;
  // texte ajusté à une largeur maximale (police à chasse fixe : la mesure est exacte)
  function txt(ctx, s, x, y, maxW, px, color, align) { s = String(s); const p = Math.min(px, maxW / Math.max(1, F.measure(s, 1))); F.draw(ctx, s, x, y, p, color, { align: align || 'left' }); return p; }
  const panel = (ctx, x, y, w, h, fill, edge, c) => Home.pill(ctx, x, y, w, h, fill || PANEL, edge || EDGE, c === undefined ? Math.min(h * 0.18, 14) : c);
  function btnGreen(ctx, x, y, w, h, on) { Home.button3d(ctx, x, y, w, h, '', '', '', 1); if (on) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(Math.round(x + 2), Math.round(y + 2), Math.round(w - 4), Math.round(h - 6)); } }

  // ---------- icônes multicolores 16×16 ----------
  const ICONS = {};
  function mk(draw) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); draw((x, y, w, h, col) => { if (col === null) g.clearRect(x, y, w, h); else { g.fillStyle = col; g.fillRect(x, y, w, h); } }); return c; }
  const L = '#b9c0c8', M = '#7f8b97', K = '#14181d', Rr = '#a8473f', Y = '#d9a441', O = '#c98a3a', B = '#8fb4c8', Gg = '#7f9a6f', Nn = '#b79a78';
  ICONS.wrench = mk((R) => { for (let i = 0; i < 9; i++) R(2 + i, 12 - i, 3, 3, L); for (let i = 0; i < 9; i++) R(4 + i, 12 - i, 1, 1, M); R(9, 1, 6, 6, L); R(11, 3, 2, 2, null); R(13, 1, 2, 3, null); R(2, 12, 1, 1, null); R(3, 13, 1, 1, K); });
  ICONS.pin = mk((R) => { R(5, 1, 6, 1, '#d9a441'); R(4, 2, 8, 1, '#d9a441'); R(3, 3, 10, 4, '#d9a441'); R(4, 7, 8, 1, '#d9a441'); R(5, 8, 6, 1, '#d9a441'); R(6, 9, 4, 1, '#d9a441'); R(7, 10, 2, 3, '#d9a441'); R(11, 3, 2, 4, '#9a7126'); R(6, 4, 4, 3, '#14181d'); });
  ICONS.shop = mk((R) => { for (let x = 1; x < 15; x += 2) { R(x, 2, 2, 4, (x / 2 | 0) % 2 ? CREAM : '#7f8b97'); R(x, 6, 2, 1, (x / 2 | 0) % 2 ? CREAM : '#7f8b97'); } R(1, 1, 14, 1, M); R(2, 7, 12, 8, Nn); R(4, 9, 5, 4, B); R(4, 9, 5, 1, M); R(10, 9, 3, 6, '#8a5a2a'); R(2, 14, 12, 1, '#a8703a'); });
  ICONS.engine = mk((R) => { R(2, 4, 12, 9, M); R(2, 4, 12, 2, L); R(6, 4, 2, 9, Y); R(0, 6, 3, 5, '#8fb4c8'); R(13, 6, 2, 5, O); R(2, 12, 12, 1, '#6c7885'); });
  ICONS.boost = mk((R) => { R(1, 3, 6, 10, M); R(9, 3, 6, 10, M); R(1, 3, 6, 2, L); R(9, 3, 6, 2, L); R(1, 11, 6, 2, O); R(9, 11, 6, 2, O); R(3, 5, 1, 6, '#6c7885'); R(11, 5, 1, 6, '#6c7885'); });
  ICONS.body = mk((R) => { R(2, 5, 12, 6, CREAM); R(2, 9, 12, 2, L); R(10, 5, 2, 6, Y); R(0, 6, 2, 4, M); });
  ICONS.paint = mk((R) => { R(4, 4, 8, 10, M); R(3, 3, 10, 2, L); R(4, 7, 8, 1, '#8995a1'); R(4, 8, 8, 1, '#aab4bf'); R(4, 9, 8, 1, '#7f8b97'); R(4, 10, 8, 1, '#5a6674'); R(5, 1, 6, 2, L); });
  ICONS.coins = mk((R) => { for (const [x, y] of [[2, 10], [8, 10], [5, 6], [5, 12]]) { R(x, y, 6, 3, '#d9a441'); R(x, y, 6, 1, '#f0d28a'); R(x, y + 2, 6, 1, '#9a7126'); } R(5, 2, 6, 3, '#d9a441'); R(5, 2, 6, 1, '#f0d28a'); R(5, 4, 6, 1, '#9a7126'); });
  ICONS.pilot = mk((R) => { R(3, 5, 10, 9, '#d7b79a'); R(2, 2, 12, 4, '#5b6b7b'); R(2, 5, 12, 1, '#3c4856'); R(2, 6, 2, 6, '#6b5b7b'); R(12, 6, 2, 6, '#6b5b7b'); R(5, 8, 2, 2, K); R(9, 8, 2, 2, K); R(7, 12, 2, 1, '#a05040'); R(6, 0, 4, 2, '#5b6b7b'); });
  ICONS.star = mk((R) => { R(7, 0, 2, 3, Y); R(6, 3, 4, 2, Y); R(0, 5, 16, 3, Y); R(2, 8, 12, 2, Y); R(3, 10, 10, 2, O); R(2, 12, 4, 3, O); R(10, 12, 4, 3, O); R(7, 4, 2, 3, '#f0d28a'); });
  ICONS.trophy = mk((R) => { R(3, 1, 10, 2, Y); R(4, 3, 8, 5, Y); R(1, 2, 3, 4, Y); R(12, 2, 3, 4, Y); R(2, 3, 1, 2, null); R(13, 3, 1, 2, null); R(6, 8, 4, 3, '#9a7126'); R(4, 11, 8, 2, Y); R(5, 3, 2, 4, '#f0d28a'); });
  // v045 : icônes 3D (CC.Icons3D) en priorité ; l'ancienne grille 16×16 sert de repli le temps du rendu
  const ALIAS = { coins: 'nut' };
  Home.bigIcon = function (ctx, name, cx, cy, size, opts) {
    opts = opts || {};
    const I3 = CC.Icons3D, key = opts.frame !== undefined ? name + '@' + ((opts.frame % 12) + 12) % 12 : (ALIAS[name] || name), c3 = I3 && I3.get(key);
    if (c3) {
      const d = size * 1.35;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.52, size * 0.36, size * 0.09, 0, 0, 6.283); ctx.fill();
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c3, cx - d / 2, cy - d / 2 - size * 0.04, d, d); ctx.restore(); return;
    }
    const c = ICONS[name]; if (!c) return; const s = Math.max(1, Math.round(size / 16)), d = 16 * s; ctx.imageSmoothingEnabled = false; ctx.drawImage(c, Math.round(cx - d / 2), Math.round(cy - d / 2), d, d); };

  // ---------- en-tête ----------
  // mode 'home' : avatar + niveau + barre ; mode 'sub' : flèche retour + DISTANCE totale, puis bandeau SCORE / COMBO. Retourne le bas de la zone utilisée.
  Home.drawTop = function (ui, ctx, game, L, mode) {
    const { W, HH, T, u } = L, prog = game.progress, P = prog.P, hh = HH * 0.1, m = u * 0.035;
    ctx.fillStyle = NAVY; ctx.fillRect(0, T, W, hh); ctx.fillStyle = EDGE; ctx.fillRect(0, Math.round(T + hh - 3), W, 3);
    const best = U.formatInt(P.best || 0);
    // record (droite) : coupe + chiffre
    const rw = u * 0.3; Home.bigIcon(ctx, 'trophy', W - m - u * 0.05, T + hh / 2, hh * 0.52);
    txt(ctx, 'RECORD', W - m - u * 0.115, T + hh * 0.18, rw, 1.5, GOLD, 'right'); txt(ctx, best, W - m - u * 0.115, T + hh * 0.5, rw, 2.4, GOLD, 'right');
    if (mode === 'home') {
      const s = hh * 0.74, ax = m, ay = T + (hh - s) / 2;
      panel(ctx, ax, ay, s, s, DARK, EDGE, s * 0.16); Home.bigIcon(ctx, 'pilot', ax + s / 2, ay + s / 2, s * 0.8);
      const xx = ax + s + u * 0.03, bw = Math.min(W * 0.36, W - xx - rw - u * 0.1), by = T + hh * 0.5, bh2 = hh * 0.2, k = U.clamp(prog.xp / prog.need(prog.level), 0, 1);
      txt(ctx, prog.rank(prog.level) + '  NIV ' + prog.level, xx, T + hh * 0.14, bw, 1.5, CREAM);
      ctx.fillStyle = EDGE; ctx.fillRect(Math.round(xx - 2), Math.round(by - 2), Math.round(bw + 4), Math.round(bh2 + 4)); ctx.fillStyle = DARK; ctx.fillRect(Math.round(xx), Math.round(by), Math.round(bw), Math.round(bh2));
      ctx.fillStyle = GOLD; ctx.fillRect(Math.round(xx), Math.round(by), Math.round(k * bw), Math.round(bh2));
      txt(ctx, prog.xp + ' / ' + prog.need(prog.level), xx, by + bh2 + hh * 0.07, bw, 1, DIM);
      hit(ui, ax, T, bw + s + u * 0.05, hh, () => { ui.overlay = 'garage'; });
      return T + hh;
    }
    // sous-écran : retour + distance totale
    const bk = hh * 0.5, bx = m, byy = T + hh / 2 - bk / 2, on = inRect(ui, bx, byy, bk, bk);
    ctx.fillStyle = on ? '#ffffff' : CREAM; { const q = Math.max(2, Math.round(bk * 0.14)); for (let i = 0; i < 4; i++) { const x = Math.round(bx + bk * 0.2 + (3 - Math.abs(i - 3 + 0) ) * 0), dx = Math.round(bk * 0.55 - i * q); ctx.fillRect(Math.round(bx + bk * 0.25 + (3 - i) * q), Math.round(byy + bk * 0.5 - (4 - i) * q * 0.9), q, q); ctx.fillRect(Math.round(bx + bk * 0.25 + (3 - i) * q), Math.round(byy + bk * 0.5 + (3 - i) * q * 0.9), q, q); } }
    hit(ui, 0, T, hh * 1.2, hh, () => { ui.overlay = null; });
    txt(ctx, 'DISTANCE: ' + U.formatInt(Math.round(P.stats.dist || 0)) + ' M', bk + m * 2.2, T + hh * 0.36, W - rw - bk - m * 5, 2, CREAM);
    // bandeau SCORE / COMBO
    const sh = HH * 0.05, sy = T + hh + 2;
    ctx.fillStyle = NAVY; ctx.fillRect(0, sy, W * 0.58, sh); ctx.fillRect(W * 0.78, sy, W * 0.22, sh);
    txt(ctx, 'SCORE: ', m, sy + sh * 0.3, W * 0.2, 1.5, CREAM); txt(ctx, U.formatInt(P.best || 0), m + F.measure('SCORE: ', 1.5), sy + sh * 0.3, W * 0.3, 1.5, GOLD);
    return sy + sh;
  };

  // ---------- barre de trois onglets ----------
  Home.drawTabs = function (ui, ctx, game, L, active) {
    const { W, HH, T, u } = L, lvl = game.progress.level;
    const list = [{ id: 'garage', icon: 'wrench', label: 'GARAGE', lv: 2 }, { id: 'pass', icon: 'star', label: 'PASS', lv: 2 }, { id: 'map', icon: 'pin', label: 'MAP', lv: 3 }, { id: 'shop', icon: 'shop', label: 'BOUTIQUE', lv: 5 }];   // v085 : toujours visibles (avant : cachés tant que le niveau de pilote était trop bas)
    if (!list.length) return 0;
    const bh = HH * 0.085, bw = Math.min(W * 0.94, W * 0.31 * list.length), bx = (W - bw) / 2, by = T + HH - bh - HH * 0.03, cw = bw / list.length;
    panel(ctx, bx, by, bw, bh, NAVY, EDGE, bh * 0.14);
    list.forEach((t, i) => {
      const cx = bx + cw * (i + 0.5), on = active === t.id, hot = inRect(ui, bx + cw * i, by - bh * 0.5, cw, bh * 1.5);
      if (i) { ctx.fillStyle = EDGE; ctx.fillRect(Math.round(bx + cw * i - 1), Math.round(by + bh * 0.12), 2, Math.round(bh * 0.76)); }
      if (on) { Home.stair(ctx, bx + cw * i + 3, by + 3, cw - 6, bh - 6, 3); ctx.strokeStyle = '#e0c690'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = 'rgba(90,102,116,0.35)'; ctx.fill(); }
      Home.bigIcon(ctx, t.icon, cx, by + bh * 0.05 - (hot ? 3 : 0), bh * 0.95, t.icon === 'shop' && on ? { frame: Math.floor(performance.now() / 160) } : undefined);
      txt(ctx, t.label, cx, by + bh * 0.66, cw * 0.92, 1.5, on ? '#f0dcae' : CREAM, 'center');
      hit(ui, bx + cw * i, by - bh * 0.55, cw, bh * 1.55, () => { ui.overlay = on ? null : t.id; });
    });
    return bh + HH * 0.03;
  };

  function backdrop(ctx, L) { ctx.fillStyle = STEEL; ctx.fillRect(0, L.T, L.W, L.HH); }
  function titlePanel(ctx, L, y, label, right) {
    const { W, u } = L, m = u * 0.04, h = L.HH * 0.062;
    panel(ctx, m, y, W - 2 * m, h, NAVY, EDGE, h * 0.14);
    txt(ctx, label, W / 2, y + h * 0.3, W * 0.5, 3, CREAM, 'center');
    return h;
  }
  function nutPill(ui, ctx, x, y, h, n) {
    const nl = U.formatInt(n), w = F.measure(nl, 1.5) + h * 1.5;
    panel(ctx, x - w, y, w, h, DARK, EDGE, h * 0.3); Home.bigIcon(ctx, 'coins', x - w + h * 0.55, y + h / 2, h * 0.8);
    F.draw(ctx, nl, x - h * 0.3, y + h / 2 - 6, 1.5, GOLD, { align: 'right' });
  }

  // ---------- fusée de profil (illustration du garage) ----------
  function rocketSide(ctx, x, y, w, h, t) {
    const gw = 34, gh = 16, s = Math.max(1, Math.floor(Math.min(w / gw, h / gh))), ox = Math.round(x + (w - gw * s) / 2), oy = Math.round(y + (h - gh * s) / 2);
    const R = (cx, cy, cw, ch, col) => { ctx.fillStyle = col; ctx.fillRect(ox + cx * s, oy + cy * s, cw * s, ch * s); };
    R(0, 13, 34, 3, '#2b3239'); for (let i = 0; i < 34; i += 6) R(i, 13, 3, 3, '#6c7885');          // rail à bandes jaunes
    R(4, 5, 5, 6, '#6c7885'); R(3, 6, 2, 4, '#3a4270');                                            // tuyère
    R(9, 4, 17, 8, CREAM); R(9, 9, 17, 3, '#c2c3c7'); R(15, 4, 2, 8, Y); R(21, 4, 1, 8, '#c2c3c7'); // corps
    R(26, 5, 3, 6, CREAM); R(29, 6, 2, 4, '#9a7126'); R(31, 7, 2, 2, '#9a7126');                                 // ogive
    R(8, 0, 6, 4, '#8995a1'); R(10, 1, 4, 3, '#aab4bf'); R(8, 12, 6, 3, '#8995a1');                  // ailerons
    const fl = (Math.sin(t * 14) > 0 ? 3 : 2); R(4 - fl, 6, fl, 4, '#c98a3a'); R(4 - Math.max(1, fl - 1), 7, Math.max(1, fl - 1), 2, '#f0d28a');
  }

  // ============================================================================================================
  //   GARAGE
  // ============================================================================================================
  Home.drawGarage = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T, HH, u, Y } = L, prog = game.progress, m = u * 0.04, t = performance.now() * 0.001;
    backdrop(ctx, L);
    const top = Home.drawTop(ui, ctx, game, L, 'sub');
    const ty = top + HH * 0.018; const th = titlePanel(ctx, L, ty, 'GARAGE');
    nutPill(ui, ctx, W - m * 1.8, ty + th * 0.2, th * 0.6, prog.P.materials || 0);
    // vitrine : la fusée à gauche, quatre emplacements à droite
    const vy = ty + th + HH * 0.014, vh = HH * 0.25, vw = W - 2 * m;
    panel(ctx, m, vy, vw, vh, PANEL, EDGE, 12);
    const pw = vw * 0.55;
    ctx.fillStyle = STEEL2; ctx.fillRect(Math.round(m + 5), Math.round(vy + 5), Math.round(pw - 5), Math.round(vh - 10));
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(Math.round(m + 5), Math.round(vy + vh * 0.62), Math.round(pw - 5), Math.round(vh * 0.38 - 5));
    if (CC.Icons3D && CC.Icons3D.ready('rocket_big')) { const d = Math.min(pw - 5, vh - 10) * 1.15; ctx.imageSmoothingEnabled = true; ctx.drawImage(CC.Icons3D.get('rocket_big'), m + 5 + (pw - 5 - d) / 2, vy + 5 + (vh - 10 - d) / 2 + Math.sin(t * 2) * 2, d, d); } else rocketSide(ctx, m + 5, vy + 5, pw - 5, vh - 10, t);
    const slots = [['tank', 'engine', 'ESSENCE'], ['eff', 'boost', 'RENDEMENT'], ['hull', 'body', 'POINTS'], ['mult', 'paint', 'PRECISION']];
    const gx0 = m + pw + 8, sw = (vw - pw - 8 - 8) / 2, sh = (vh - 24) / 2;
    slots.forEach(([up, ic, lab], i) => {
      const sx = gx0 + (i % 2) * (sw + 4), sy = vy + 8 + Math.floor(i / 2) * (sh + 8), lv = prog.upLevel(up);
      panel(ctx, sx, sy, sw, sh, DARK, EDGE, 8);
      Home.bigIcon(ctx, ic, sx + sw / 2, sy + sh * 0.46, sh * 0.55);
      txt(ctx, lab, sx + sw / 2, sy + 4, sw - 4, 1, CREAM, 'center');
      txt(ctx, 'NIV ' + lv, sx + sw / 2, sy + sh - 11, sw - 4, 1, lv ? GOLD : DIM, 'center');
    });
    // jauges
    const ry = vy + vh + HH * 0.014, rh = HH * 0.3;
    panel(ctx, m, ry, vw, rh, PANEL, EDGE, 12);
    const rows = [['ESSENCE', 'tank'], ['RENDEMENT', 'eff'], ['POINTS', 'hull'], ['PRECISION', 'mult']], rowH = rh / rows.length;
    rows.forEach(([lab, id], i) => {
      const up = CC.Progress.UPG.find((q) => q.id === id), lv = prog.upLevel(id), cost = prog.upCost(id), can = prog.canBuy(id), y0 = ry + i * rowH;
      const lw = vw * 0.3, bx = m + 8 + lw, bwid = vw - lw - 16 - vw * 0.2, bh = rowH * 0.34, byy = y0 + (rowH - bh) / 2;
      txt(ctx, lab + ':', m + 8, y0 + rowH * 0.36, 1e9, Math.min(1.5, (lw - 4) / 80), CREAM);
      ctx.fillStyle = DARK; ctx.fillRect(Math.round(bx - 2), Math.round(byy - 2), Math.round(bwid + 4), Math.round(bh + 4));
      const sg = bwid / up.max;
      for (let k = 0; k < up.max; k++) { ctx.fillStyle = k < lv ? GOLD : '#2d343d'; ctx.fillRect(Math.round(bx + k * sg + 1), Math.round(byy), Math.max(1, Math.round(sg - 3)), Math.round(bh)); if (k < lv) { ctx.fillStyle = '#f0d28a'; ctx.fillRect(Math.round(bx + k * sg + 1), Math.round(byy), Math.max(1, Math.round(sg - 3)), Math.max(1, Math.round(bh * 0.25))); } }
      const px2 = bx + bwid + 10, pbw = vw * 0.17, pbh = rowH * 0.62, pby = y0 + (rowH - pbh) / 2;
      if (cost === null) txt(ctx, 'MAX', px2 + pbw / 2, y0 + rowH * 0.36, pbw, 1.5, GOLD, 'center');
      else {
        if (can) btnGreen(ctx, px2, pby, pbw, pbh, inRect(ui, px2, pby, pbw, pbh)); else panel(ctx, px2, pby, pbw, pbh, DARK, EDGE, 6);
        txt(ctx, '+' + cost, px2 + pbw / 2, pby + pbh * 0.32, pbw - 6, 1.5, can ? DARK : DIM, 'center');
        hit(ui, px2 - 6, y0, pbw + 12, rowH, () => { if (prog.buy(id)) { game.audio.play('levelUp'); if (CC.Haptics) CC.Haptics.pattern('mission'); } else game.audio.play('warnFuel'); });
      }
    });
    Home.drawTabs(ui, ctx, game, L, 'garage');
  };

  // ============================================================================================================
  //   MAP
  // ============================================================================================================
  Home.drawMap = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T, HH, u } = L, prog = game.progress, m = u * 0.04, cfg = CC.CONFIG.progress;
    backdrop(ctx, L);
    const top = Home.drawTop(ui, ctx, game, L, 'sub');
    const ty = top + HH * 0.018, th = titlePanel(ctx, L, ty, 'MAP');
    // mission en cours
    const my = ty + th + HH * 0.014, mh = HH * 0.1, mw = W - 2 * m, mi = prog.tracked();
    panel(ctx, m, my, mw, mh, PANEL, EDGE, 10);
    Home.icon.target(ctx, m + mh * 0.5, my + mh * 0.5, mh * 0.27, GOLD);
    if (mi) {
      const tx = m + mh * 1.0, tw = mw - mh * 1.1 - 12;
      txt(ctx, prog.missionText(mi), tx, my + mh * 0.16, tw, 1.5, CREAM);
      const bw = tw - 60, by = my + mh * 0.58, bh = mh * 0.2, k = U.clamp(mi.progress / mi.target, 0, 1);
      ctx.fillStyle = EDGE; ctx.fillRect(Math.round(tx - 2), Math.round(by - 2), Math.round(bw + 4), Math.round(bh + 4)); ctx.fillStyle = DARK; ctx.fillRect(Math.round(tx), Math.round(by), Math.round(bw), Math.round(bh)); ctx.fillStyle = GOLD; ctx.fillRect(Math.round(tx), Math.round(by), Math.round(k * bw), Math.round(bh));
      txt(ctx, mi.progress + '/' + mi.target, tx + tw, by - 1, 56, 1, DIM, 'right');
      txt(ctx, '+' + mi.xp, tx + tw, my + mh * 0.16, 56, 1.5, GOLD, 'right');
    }
    // décors : grille de 2 colonnes (+ DEFIS)
    const order = ['city', 'forest', 'usine', 'port', 'eau', 'tour', 'sky', 'chute', 'metro', 'mini'], gy = my + mh + HH * 0.014, cols = 2, gap = 6, cw = (mw - gap) / 2, ch = HH * 0.062;
    const cells = order.map((z) => ({ z, need: cfg.worlds[z], open: prog.level >= cfg.worlds[z] })).concat([{ z: 'defis', open: prog.level >= 4, need: 4 }]);
    cells.forEach((c, i) => {
      const x = m + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (ch + gap), on = inRect(ui, x, y, cw, ch);
      panel(ctx, x, y, cw, ch, c.open ? (on ? '#323b46' : PANEL) : DARK, c.open ? EDGE : '#2d343d', 8);
      const nm = c.z === 'defis' ? 'DEFIS' : ({ sky: 'BASE AIR', mini: 'MINIATURE' }[c.z] || prog.worldName(c.z));
      if (c.open) { if (c.z === 'defis') Home.icon.star(ctx, x + ch * 0.5, y + ch / 2, ch * 0.22, GOLD); else Home.bigIcon(ctx, 'pin', x + ch * 0.5, y + ch / 2, ch * 0.7); }
      else Home.icon.lock(ctx, x + ch * 0.5, y + ch / 2, ch * 0.22, DIM);
      txt(ctx, nm, x + ch * 1.0, y + ch * (c.open ? 0.36 : 0.22), cw - ch * 1.1, 1.5, c.open ? CREAM : DIM);
      if (!c.open) txt(ctx, 'NIVEAU ' + c.need, x + ch * 1.0, y + ch * 0.58, cw - ch * 1.1, 1, GOLD);
      if (c.open && c.z === 'defis') hit(ui, x, y, cw, ch, () => { ui.overlay = 'defi'; });
    });
    Home.drawTabs(ui, ctx, game, L, 'map');
  };

  // ============================================================================================================
  //   BOUTIQUE (cosmétiques de la roquette)
  // ============================================================================================================
  const TABS = [['COMMUNES', (s) => s.tier === 'base' || s.tier === 'common'], ['RARES', (s) => s.tier === 'rare'], ['ULTRA', (s) => s.tier === 'ultra']];
  CC.Shop.prototype.draw = function (ctx, game, W, H) {
    const ui = this.ui, L = Home.layout(ui, W, H), { T, HH, u } = L, m = u * 0.04, col = CC.CONFIG.hud.colors;
    backdrop(ctx, L);
    const top = Home.drawTop(ui, ctx, game, L, 'sub');
    // bandeau
    const by = top + HH * 0.016, bh = HH * 0.065, bw = W * 0.84, bx = (W - bw) / 2;
    panel(ctx, bx, by, bw, bh, NAVY, '#e0c690', bh * 0.2);
    ctx.fillStyle = '#e0c690'; ctx.fillRect(Math.round(bx - m * 0.9), Math.round(by + bh * 0.2), Math.round(m * 0.9), Math.round(bh * 0.6)); ctx.fillRect(Math.round(bx + bw), Math.round(by + bh * 0.2), Math.round(m * 0.9), Math.round(bh * 0.6));
    txt(ctx, 'BOUTIQUE', W / 2 + bh * 0.4, by + bh * 0.28, bw * 0.6, 3, GOLD, 'center');
    Home.bigIcon(ctx, 'shop', bx + bh * 0.62, by + bh * 0.52, bh * 0.95, { frame: Math.floor(performance.now() / 160) });
    // onglets par rareté
    this.tab = this.tab || 0; this.page = this.page || 0;
    const ty = by + bh + HH * 0.014, th = HH * 0.044, tw = (W - 2 * m - 8) / 3;
    TABS.forEach(([lab], i) => { const x = m + i * (tw + 4), on = i === this.tab; panel(ctx, x, ty, tw, th, on ? NAVY : '#33404d', on ? '#e0c690' : EDGE, 6); txt(ctx, lab, x + tw / 2, ty + th * 0.3, tw - 6, 1.5, on ? CREAM : DIM, 'center'); hit(ui, x, ty, tw, th, () => { this.tab = i; this.page = 0; }); });
    // grille
    const list = CC.Skins.list.filter(TABS[this.tab][1]), per = 4, pages = Math.max(1, Math.ceil(list.length / per)); this.page = Math.min(this.page, pages - 1);
    const gy = ty + th + HH * 0.012, rw = (W - 2 * m) * 0.7, cw = (rw - 6) / 2, ch = HH * 0.215, gap = 6;
    list.slice(this.page * per, this.page * per + per).forEach((s, i) => {
      const x = m + (i % 2) * (cw + gap), y = gy + Math.floor(i / 2) * (ch + gap), owned = !!game.save.owned[s.id], eq = game.save.equipped === s.id;
      panel(ctx, x, y, cw, ch, NAVY, eq ? '#e0c690' : EDGE, 8);
      panel(ctx, x + 4, y + 4, cw - 8, ch * 0.36, DARK, EDGE, 6);
      CC.Shop.icon(ctx, s, x + cw / 2 - 6, y + 4 + ch * 0.18, ch * 0.3);
      txt(ctx, s.short || s.name, x + cw / 2, y + ch * 0.46, cw - 8, 1.5, CREAM, 'center');
      txt(ctx, eq ? 'EQUIPEE' : owned ? 'A TOI' : CC.Skins.formatPrice(s.price), x + cw / 2, y + ch * 0.6, cw - 8, 1.5, eq ? GOLD : owned ? '#e8bd62' : GOLD, 'center');
      const bx2 = x + 6, bw2 = cw - 12, bh2 = ch * 0.22, by2 = y + ch - bh2 - 6;
      if (eq) { panel(ctx, bx2, by2, bw2, bh2, DARK, EDGE, 6); txt(ctx, 'OK', bx2 + bw2 / 2, by2 + bh2 * 0.3, bw2, 1.5, DIM, 'center'); }
      else { btnGreen(ctx, bx2, by2, bw2, bh2, inRect(ui, bx2, by2, bw2, bh2)); txt(ctx, owned ? 'EQUIPER' : 'ACHETER', bx2 + bw2 / 2, by2 + bh2 * 0.28, bw2 - 6, 1.5, DARK, 'center'); hit(ui, bx2, by2, bw2, bh2, () => (owned ? this.pick(game, s.id) : this.buy(game, s.id))); }
      if (!owned) { const pw = cw * 0.5; txt(ctx, 'PUB 1 MIN', x + cw / 2, by2 - 12, cw - 8, 1, '#8fb4c8', 'center'); hit(ui, x + 4, by2 - 16, cw - 8, 14, () => this.watch(game, s.id)); }
    });
    // colonne de droite : solde + pages
    const rx = m + rw + 6, rww = W - m - rx;
    panel(ctx, rx, gy, rww, ch * 0.9, NAVY, EDGE, 8);
    Home.bigIcon(ctx, 'coins', rx + rww / 2, gy + ch * 0.28, ch * 0.4);
    txt(ctx, 'ECROUS', rx + rww / 2, gy + ch * 0.52, rww - 6, 1, CREAM, 'center'); txt(ctx, U.formatInt(game.progress.P.materials || 0), rx + rww / 2, gy + ch * 0.68, rww - 6, 2, GOLD, 'center');
    const ay = gy + ch * 0.9 + gap;
    panel(ctx, rx, ay, rww, ch * 0.75, NAVY, EDGE, 8);
    txt(ctx, 'OFFRE', rx + rww / 2, ay + 6, rww - 6, 1, GOLD, 'center'); txt(ctx, CC.Skins.formatPrice(CC.CONFIG.shop.priceCents), rx + rww / 2, ay + ch * 0.2, rww - 6, 1.5, CREAM, 'center'); txt(ctx, 'OU 1 MIN', rx + rww / 2, ay + ch * 0.36, rww - 6, 1, DIM, 'center'); txt(ctx, 'DE PUB', rx + rww / 2, ay + ch * 0.5, rww - 6, 1, DIM, 'center');
    const py = gy + 2 * ch + gap * 2 + 6;
    txt(ctx, (this.page + 1) + ' / ' + pages, W / 2, py + 4, 80, 1.5, CREAM, 'center');
    for (const [lab, dx, dp] of [['<', -1, -1], ['>', 1, 1]]) { const bx3 = W / 2 + dx * 56 - 18, on = inRect(ui, bx3, py - 6, 36, 26); panel(ctx, bx3, py - 6, 36, 26, on ? '#323b46' : NAVY, EDGE, 6); txt(ctx, lab, bx3 + 18, py + 1, 20, 2, CREAM, 'center'); hit(ui, bx3, py - 6, 36, 26, () => { this.page = (this.page + dp + pages) % pages; }); }
    if (this.flash) txt(ctx, this.flash, W / 2, py + 26, W * 0.92, 1, GOLD, 'center');
    Home.drawTabs(ui, ctx, game, L, 'shop');
  };
})();

/* v082 : écrans de la méta-progression — PASS (palier + 2 pistes), QUOTIDIEN (cadeau 7 jours, missions du jour, coffre 4 h), page MODULES du garage,
 * et petits éléments communs (étoiles, icônes de modules, caisse verte, notification). Même charte pixel que screens.js. */
(function () {
  const U = CC.U, F = CC.Font, Home = CC.Home, Meta = CC.Meta;
  const NAVY = '#1d232b', PANEL = '#262d36', DARK = '#14181d', EDGE = '#5a6674', STEEL = '#3b4652', CREAM = '#e8ecef', GOLD = '#d9a441', DIM = '#8995a1', GREEN = '#56d98b', RED = '#d0473e';
  const R = Math.round;
  const hit = (ui, x, y, w, h, action) => ui.buttons.push({ x, y, w, h, action });
  const inRect = (ui, x, y, w, h) => !ui.isTouch() && ui.mouse.x >= x && ui.mouse.x <= x + w && ui.mouse.y >= y && ui.mouse.y <= y + h;
  function txt(ctx, s, x, y, maxW, px, color, align) { s = String(s); const p = Math.min(px, maxW / Math.max(1, F.measure(s, 1))); F.draw(ctx, s, x, y, p, color, { align: align || 'left' }); return p; }
  const panel = (ctx, x, y, w, h, fill, edge, c) => Home.pill(ctx, x, y, w, h, fill || PANEL, edge || EDGE, c === undefined ? Math.min(h * 0.18, 14) : c);
  const greenBtn = (ctx, x, y, w, h, on) => { Home.button3d(ctx, x, y, w, h, '', '', '', 1); if (on) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(R(x + 2), R(y + 2), R(w - 4), R(h - 6)); } };
  const backdrop = (ctx, L) => { ctx.fillStyle = STEEL; ctx.fillRect(0, L.T, L.W, L.HH); };
  function titlePanel(ctx, L, y, label) { const { W, u } = L, m = u * 0.04, h = L.HH * 0.062; panel(ctx, m, y, W - 2 * m, h, NAVY, EDGE, h * 0.14); txt(ctx, label, W / 2, y + h * 0.3, W * 0.5, 3, CREAM, 'center'); return h; }

  // ---------- éléments communs ----------
  Home.drawStars = function (ctx, cx, cy, size, n, max, dim) {   // n étoiles pleines sur max, en pixels
    max = max || 3; const gap = size * 1.15, x0 = cx - gap * (max - 1) / 2;
    for (let i = 0; i < max; i++) Home.gridDraw(ctx, 'star', x0 + i * gap, cy, size, i < n ? '#ffd23a' : (dim || '#3a424c'));
  };
  Home.modIcon = function (ctx, id, cx, cy, size, col) { const md = Meta.MODS[id]; Home.gridDraw(ctx, md.icon, cx, cy, size, col || md.col); };
  Home.crateIcon = function (ctx, cx, cy, s) {   // caisse verte (module à trouver)
    const u = Math.max(2, R(s / 12)), x = R(cx - 6 * u), y = R(cy - 6 * u);
    ctx.fillStyle = '#0e3a1c'; ctx.fillRect(x, y, 12 * u, 12 * u); ctx.fillStyle = '#2a8a4a'; ctx.fillRect(x + u, y + u, 10 * u, 10 * u); ctx.fillStyle = '#4ad07a'; ctx.fillRect(x + u, y + u, 10 * u, 2 * u); ctx.fillStyle = '#9affbe'; ctx.fillRect(x + u, y + u, 2 * u, 10 * u);
    ctx.fillStyle = '#0e3a1c'; ctx.fillRect(x, y + 5 * u, 12 * u, 2 * u); ctx.fillRect(x + 5 * u, y, 2 * u, 12 * u); ctx.fillStyle = '#d8ffe4'; ctx.fillRect(x + 5 * u + R(u * 0.3), y + 5 * u + R(u * 0.3), R(1.4 * u), R(1.4 * u));
  };
  function rewardIcon(ctx, r, cx, cy, s) {   // retourne le libellé court
    if (r.t === 'nuts') { Home.drawCoinIcon(ctx, cx, cy, s * 0.9); return '+' + r.n; }
    if (r.t === 'crate') { Home.crateIcon(ctx, cx, cy, s * 0.8); return 'CAISSE' + (r.n > 1 ? ' X' + r.n : ''); }
    if (r.t === 'mod') { Home.modIcon(ctx, r.id, cx, cy, s * 0.8); return Meta.MODS[r.id].name; }
    if (r.t === 'skin') { Home.gridDraw(ctx, 'rocket', cx, cy, s * 0.9, '#e8ecef'); return 'APPARENCE'; }
    return '';
  }
  // notification en bas de l'écran (2,6 s)
  Home.toast = function (ui, text) { ui._toast = { text, t0: performance.now() }; };
  function drawToast(ui, ctx, L) {
    const q = ui._toast; if (!q) return; const a = (performance.now() - q.t0) / 2600; if (a >= 1) { ui._toast = null; return; }
    const w = Math.min(L.W * 0.9, F.measure(q.text, 2) + 40), h = L.HH * 0.06, x = (L.W - w) / 2, y = L.T + L.HH * 0.8 - a * L.HH * 0.04;
    ctx.globalAlpha = a > 0.8 ? (1 - a) / 0.2 : 1; panel(ctx, x, y, w, h, NAVY, GOLD, 8); txt(ctx, q.text, L.W / 2, y + h * 0.3, w - 16, 2, GOLD, 'center'); ctx.globalAlpha = 1;
  }
  const say = (ui, out) => { if (!out) return; const arr = Array.isArray(out) ? out : [out]; Home.toast(ui, arr.map((o) => o.text).join('  ')); };

  // ============================================================================================================
  //   PASS DE SAISON
  // ============================================================================================================
  Home.drawPass = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T, HH, u } = L, m = u * 0.04, meta = game.meta, tier = meta.tier, P = meta.M.pass, game_ = game;
    backdrop(ctx, L); const top = Home.drawTop(ui, ctx, game, L, 'sub');
    const ty = top + HH * 0.018, th = titlePanel(ctx, L, ty, 'PASS');
    // palier + barre d'XP
    const py = ty + th + HH * 0.014, ph = HH * 0.115, pw = W - 2 * m; panel(ctx, m, py, pw, ph, PANEL, EDGE, 10);
    txt(ctx, 'SAISON ' + P.season, m + 12, py + ph * 0.1, pw * 0.5, 1, DIM);
    txt(ctx, 'PALIER ' + tier + ' / ' + Meta.TIERS, m + 12, py + ph * 0.28, pw * 0.7, 2.6, CREAM);
    const bx = m + 12, bw = pw - 24, by = py + ph * 0.66, bh = ph * 0.2, k = tier >= Meta.TIERS ? 1 : (P.xp % Meta.XP_PER) / Meta.XP_PER;
    ctx.fillStyle = EDGE; ctx.fillRect(R(bx - 2), R(by - 2), R(bw + 4), R(bh + 4)); ctx.fillStyle = DARK; ctx.fillRect(R(bx), R(by), R(bw), R(bh)); ctx.fillStyle = GOLD; ctx.fillRect(R(bx), R(by), R(k * bw), R(bh)); ctx.fillStyle = '#f0d28a'; ctx.fillRect(R(bx), R(by), R(k * bw), Math.max(1, R(bh * 0.25)));
    txt(ctx, tier >= Meta.TIERS ? 'COMPLET' : (P.xp % Meta.XP_PER) + ' / ' + Meta.XP_PER + ' XP', bx + bw, by - bh * 1.15, bw * 0.5, 1, DIM, 'right');
    // grille : 5 paliers par page, deux pistes
    const per = 5, pages = Math.ceil(Meta.TIERS / per); if (ui.passPage === undefined || ui.passPage === null) ui.passPage = Math.min(pages - 1, Math.floor(Math.max(0, tier - 1) / per));
    const pg = U.clamp(ui.passPage, 0, pages - 1), gap = 5, cw = (W - 2 * m - gap * (per - 1)) / per, gy = py + ph + HH * 0.016, rowH = HH * 0.14, labW = 0;
    for (let i = 0; i < per; i++) {
      const t = pg * per + i + 1, x = m + i * (cw + gap), rw = Meta.prototype.rewards.call(meta, t), cur = t <= tier;
      txt(ctx, 'PALIER ' + t, x + cw / 2, gy, cw, 1, cur ? GOLD : DIM, 'center');
      [['free', 'GRATUIT', gy + HH * 0.02], ['prem', 'PREMIUM', gy + HH * 0.02 + rowH + gap]].forEach(([tr, lab, y]) => {
        const r = rw[tr], got = meta.claimed(tr, t), can = meta.canClaim(tr, t), locked = tr === 'prem' && !P.premium;
        panel(ctx, x, y, cw, rowH, got ? '#1a3a2a' : can ? '#3a3320' : NAVY, can ? GOLD : got ? GREEN : EDGE, 8);
        ctx.globalAlpha = cur ? 1 : 0.5; const label = rewardIcon(ctx, r, x + cw / 2, y + rowH * 0.3, rowH * 0.4); ctx.globalAlpha = 1;
        txt(ctx, label, x + cw / 2, y + rowH * 0.52, cw - 6, 1.2, got ? GREEN : CREAM, 'center');
        if (got) Home.icon.check(ctx, x + cw / 2, y + rowH * 0.82, rowH * 0.09, GREEN);
        else if (can) { greenBtn(ctx, x + 4, y + rowH * 0.68, cw - 8, rowH * 0.26, inRect(ui, x, y, cw, rowH)); txt(ctx, 'PRENDRE', x + cw / 2, y + rowH * 0.74, cw - 12, 1.1, DARK, 'center'); hit(ui, x, y, cw, rowH, () => { const o = meta.claim(tr, t); if (o) { game.audio.play('levelUp'); say(ui, o); } }); }
        else if (locked) Home.icon.lock(ctx, x + cw / 2, y + rowH * 0.82, rowH * 0.08, DIM);
        else txt(ctx, t > tier ? 'VERROUILLE' : '', x + cw / 2, y + rowH * 0.76, cw - 6, 0.9, DIM, 'center');
      });
    }
    txt(ctx, 'GRATUIT', m, gy + HH * 0.02 - 1, 1, 0.001, DIM);
    // pages
    const ay = gy + HH * 0.02 + 2 * rowH + gap + HH * 0.016, ab = HH * 0.05;
    for (const [lab, dx] of [['<', -1], ['>', 1]]) { const bx2 = W / 2 + dx * 70 - 22, on = inRect(ui, bx2, ay, 44, ab); panel(ctx, bx2, ay, 44, ab, on ? '#323b46' : NAVY, EDGE, 6); txt(ctx, lab, bx2 + 22, ay + ab * 0.3, 30, 2, CREAM, 'center'); hit(ui, bx2, ay, 44, ab, () => { ui.passPage = (pg + dx + pages) % pages; }); }
    txt(ctx, (pg + 1) + ' / ' + pages, W / 2, ay + ab * 0.32, 70, 1.5, CREAM, 'center');
    // boutons du bas
    const by2 = ay + ab + HH * 0.016, bh2 = HH * 0.07, n = meta.claimableCount(), bw2 = (W - 2 * m - 8) / 2;
    if (n > 0) { greenBtn(ctx, m, by2, bw2, bh2, inRect(ui, m, by2, bw2, bh2)); txt(ctx, 'TOUT PRENDRE ' + n, m + bw2 / 2, by2 + bh2 * 0.34, bw2 - 10, 1.6, DARK, 'center'); hit(ui, m, by2, bw2, bh2, () => { const o = meta.claimAll(); game.audio.play('levelUp'); say(ui, o.slice(0, 3)); }); }
    else { panel(ctx, m, by2, bw2, bh2, DARK, EDGE, 8); txt(ctx, 'RIEN A PRENDRE', m + bw2 / 2, by2 + bh2 * 0.34, bw2 - 10, 1.3, DIM, 'center'); }
    const px2 = m + bw2 + 8;
    if (P.premium) { panel(ctx, px2, by2, bw2, bh2, '#3a3320', GOLD, 8); txt(ctx, 'PREMIUM ACTIF', px2 + bw2 / 2, by2 + bh2 * 0.34, bw2 - 10, 1.4, GOLD, 'center'); }
    else { panel(ctx, px2, by2, bw2, bh2, NAVY, GOLD, 8); txt(ctx, 'PASS PREMIUM', px2 + bw2 / 2, by2 + bh2 * 0.34, bw2 - 10, 1.5, GOLD, 'center'); hit(ui, px2, by2, bw2, bh2, () => { const r = meta.buyPremium(); if (r === 'no-link') Home.toast(ui, 'PREMIUM BIENTOT DISPONIBLE'); }); }
    txt(ctx, 'LE PASS MONTE EN JOUANT : NIVEAUX, ETOILES, QUOTIDIEN', W / 2, by2 + bh2 + HH * 0.012, W - 2 * m, 0.95, DIM, 'center');
    Home.drawTabs(ui, ctx, game, L, 'pass'); drawToast(ui, ctx, L);
  };

  // ============================================================================================================
  //   QUOTIDIEN : cadeau, missions du jour, coffre
  // ============================================================================================================
  const fmtTime = (ms) => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60); return h + ' H ' + (mi < 10 ? '0' : '') + mi + ' M'; };
  Home.drawDaily = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T, HH, u } = L, m = u * 0.04, meta = game.meta;
    backdrop(ctx, L); const top = Home.drawTop(ui, ctx, game, L, 'sub');
    const ty = top + HH * 0.018, th = titlePanel(ctx, L, ty, 'QUOTIDIEN');
    // cadeau de connexion : 7 cases
    const gy = ty + th + HH * 0.014, gh = HH * 0.2, gw = W - 2 * m; panel(ctx, m, gy, gw, gh, PANEL, EDGE, 10);
    const ready = meta.giftReady(), next = meta.giftNextIndex(), G = meta.giftRewards(), cw = (gw - 16 - 6 * 4) / 7, cy0 = gy + gh * 0.22;
    txt(ctx, 'CADEAU DE CONNEXION', m + 10, gy + gh * 0.06, gw * 0.7, 1.3, CREAM);
    for (let i = 0; i < 7; i++) {
      const x = m + 8 + i * (cw + 4), isNext = i === next, done = !ready && i <= next || (i < next), r = G[i];
      panel(ctx, x, cy0, cw, gh * 0.4, done ? '#1a3a2a' : isNext && ready ? '#3a3320' : NAVY, isNext && ready ? GOLD : done ? GREEN : EDGE, 6);
      rewardIcon(ctx, r, x + cw / 2, cy0 + gh * 0.17, gh * 0.22); txt(ctx, 'J' + (i + 1), x + cw / 2, cy0 + gh * 0.31, cw, 0.9, DIM, 'center');
    }
    const bw = gw * 0.5, bh = gh * 0.2, bx = m + gw / 2 - bw / 2, by = gy + gh * 0.72;
    if (ready) { greenBtn(ctx, bx, by, bw, bh, inRect(ui, bx, by, bw, bh)); txt(ctx, 'PRENDRE LE CADEAU', bx + bw / 2, by + bh * 0.3, bw - 10, 1.4, DARK, 'center'); hit(ui, bx, by, bw, bh, () => { const o = meta.claimGift(); if (o) { game.audio.play('levelUp'); say(ui, o); } }); }
    else txt(ctx, 'REVIENS DEMAIN POUR LE SUIVANT', m + gw / 2, by + bh * 0.3, gw - 20, 1.2, DIM, 'center');
    // missions du jour
    const my = gy + gh + HH * 0.014, mh = HH * 0.34; panel(ctx, m, my, gw, mh, PANEL, EDGE, 10);
    txt(ctx, 'MISSIONS DU JOUR', m + 10, my + mh * 0.04, gw * 0.7, 1.3, CREAM);
    const rowH = mh * 0.3;
    meta.missions().forEach((q, i) => {
      const y = my + mh * 0.14 + i * rowH, ok = q.progress >= q.target;
      panel(ctx, m + 6, y, gw - 12, rowH - 6, NAVY, q.claimed ? GREEN : ok ? GOLD : EDGE, 6);
      txt(ctx, meta.missionText(q), m + 14, y + rowH * 0.12, gw * 0.62, 1.3, q.claimed ? DIM : CREAM);
      const bx2 = m + 14, bw2 = gw * 0.5, by2 = y + rowH * 0.5, bh2 = rowH * 0.16, kk = U.clamp(q.progress / q.target, 0, 1);
      ctx.fillStyle = DARK; ctx.fillRect(R(bx2), R(by2), R(bw2), R(bh2)); ctx.fillStyle = ok ? GREEN : GOLD; ctx.fillRect(R(bx2), R(by2), R(kk * bw2), R(bh2));
      txt(ctx, q.progress + '/' + q.target, bx2 + bw2 + 8, by2 - 2, gw * 0.12, 1, DIM);
      const cx2 = m + gw - 12 - gw * 0.2, cw2 = gw * 0.2, chh = rowH * 0.56;
      if (q.claimed) Home.icon.check(ctx, cx2 + cw2 / 2, y + rowH * 0.45, rowH * 0.14, GREEN);
      else if (ok) { greenBtn(ctx, cx2, y + rowH * 0.1, cw2, chh, inRect(ui, cx2, y, cw2, rowH)); txt(ctx, '+' + q.nuts, cx2 + cw2 / 2, y + rowH * 0.2, cw2 - 6, 1.3, DARK, 'center'); hit(ui, cx2, y, cw2, rowH, () => { const o = meta.claimMission(i); if (o) { game.audio.play('levelUp'); say(ui, o); } }); }
      else { Home.drawCoinIcon(ctx, cx2 + cw2 * 0.22, y + rowH * 0.34, rowH * 0.3); txt(ctx, '+' + q.nuts, cx2 + cw2 * 0.9, y + rowH * 0.24, cw2 * 0.7, 1.2, GOLD, 'right'); }
    });
    // coffre gratuit
    const cy = my + mh + HH * 0.014, chh2 = HH * 0.12; panel(ctx, m, cy, gw, chh2, PANEL, EDGE, 10);
    Home.crateIcon(ctx, m + chh2 * 0.5, cy + chh2 * 0.5, chh2 * 0.55);
    txt(ctx, 'COFFRE GRATUIT', m + chh2 * 1.0, cy + chh2 * 0.2, gw * 0.36, 1.5, CREAM);
    const rd = meta.chestReady();
    txt(ctx, rd ? 'PRET !' : 'PROCHAIN DANS ' + fmtTime(meta.chestIn()), m + chh2 * 1.0, cy + chh2 * 0.55, gw * 0.5, 1.1, rd ? GREEN : DIM);
    if (rd) { const bx3 = m + gw - gw * 0.3 - 10, bw3 = gw * 0.3, bh3 = chh2 * 0.5, by3 = cy + chh2 * 0.25; greenBtn(ctx, bx3, by3, bw3, bh3, inRect(ui, bx3, by3, bw3, bh3)); txt(ctx, 'OUVRIR', bx3 + bw3 / 2, by3 + bh3 * 0.3, bw3 - 8, 1.5, DARK, 'center'); hit(ui, bx3, by3, bw3, bh3, () => { const o = meta.openChest(); if (o) { game.audio.play('levelUp'); say(ui, o); } }); }
    drawToast(ui, ctx, L);
  };

  // ============================================================================================================
  //   GARAGE : page MODULES (ajoutée à l'écran GARAGE existant par un petit bouton à gauche du titre)
  // ============================================================================================================
  Home.drawModules = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T, HH, u } = L, m = u * 0.04, meta = game.meta, prog = game.progress;
    backdrop(ctx, L); const top = Home.drawTop(ui, ctx, game, L, 'sub');
    const ty = top + HH * 0.018, th = titlePanel(ctx, L, ty, 'MODULES');
    // emplacements équipés
    const sy = ty + th + HH * 0.014, sh = HH * 0.09, sw = (W - 2 * m - 8) / 2, eq = meta.eq();
    for (let i = 0; i < Meta.SLOTS; i++) {
      const x = m + i * (sw + 8), id = eq[i]; panel(ctx, x, sy, sw, sh, id ? '#1f3326' : DARK, id ? GREEN : EDGE, 8);
      if (id) { Home.modIcon(ctx, id, x + sh * 0.5, sy + sh * 0.5, sh * 0.55); txt(ctx, Meta.MODS[id].name, x + sh * 1.0, sy + sh * 0.2, sw - sh * 1.1, 1.5, CREAM); txt(ctx, 'NIV ' + meta.lvl(id), x + sh * 1.0, sy + sh * 0.56, sw - sh * 1.1, 1.2, GOLD); }
      else txt(ctx, 'EMPLACEMENT ' + (i + 1), x + sw / 2, sy + sh * 0.4, sw - 8, 1.2, DIM, 'center');
    }
    // liste des modules
    const ly = sy + sh + HH * 0.012, rowH = HH * 0.092;
    Meta.IDS.forEach((id, i) => {
      const md = Meta.MODS[id], lvl = meta.lvl(id), y = ly + i * (rowH + 4), on = meta.isEq(id), x = m, w = W - 2 * m;
      panel(ctx, x, y, w, rowH, lvl ? NAVY : DARK, on ? GREEN : EDGE, 8);
      if (lvl) Home.modIcon(ctx, id, x + rowH * 0.5, y + rowH * 0.5, rowH * 0.55); else { Home.modIcon(ctx, id, x + rowH * 0.5, y + rowH * 0.5, rowH * 0.55, '#2d343d'); }
      txt(ctx, lvl ? md.name : '???', x + rowH * 1.0, y + rowH * 0.1, w * 0.4, 1.5, lvl ? CREAM : DIM);
      txt(ctx, md.rar, x + rowH * 1.0, y + rowH * 0.34, w * 0.3, 0.95, Meta.RAR[md.rar]);
      txt(ctx, lvl ? md.desc(lvl) : 'ABATS DES HELICOS DORES', x + rowH * 1.0, y + rowH * 0.58, w * 0.62, 1.0, lvl ? '#bfe8cc' : DIM);
      if (lvl) {
        const n = meta.need(id), kk = lvl >= 5 ? 1 : U.clamp(meta.dup(id) / n, 0, 1), bx = x + rowH * 1.0, bw = w * 0.34, by = y + rowH * 0.8, bh = rowH * 0.1;
        ctx.fillStyle = DARK; ctx.fillRect(R(bx), R(by), R(bw), R(bh)); ctx.fillStyle = '#6aff9a'; ctx.fillRect(R(bx), R(by), R(kk * bw), R(bh));
        txt(ctx, 'NIV ' + lvl + (lvl >= 5 ? ' MAX' : '  ' + meta.dup(id) + '/' + n), bx + bw + 8, by - 3, w * 0.2, 0.95, DIM);
        const cw = w * 0.2, bx2 = x + w - cw - 8, bh2 = rowH * 0.5, by2 = y + rowH * 0.25;
        if (on) { panel(ctx, bx2, by2, cw, bh2, '#1f3326', GREEN, 6); txt(ctx, 'RETIRER', bx2 + cw / 2, by2 + bh2 * 0.32, cw - 6, 1.1, GREEN, 'center'); }
        else { greenBtn(ctx, bx2, by2, cw, bh2, inRect(ui, bx2, by2, cw, bh2)); txt(ctx, 'EQUIPER', bx2 + cw / 2, by2 + bh2 * 0.32, cw - 6, 1.1, DARK, 'center'); }
        hit(ui, bx2, by2, cw, bh2, () => { meta.toggle(id); game.audio.play('ui'); });
      }
    });
    txt(ctx, 'DES CAISSES VERTES TOMBENT DES HELICOS DORES', W / 2, ly + 5 * (rowH + 4) + 1, W - 2 * m, 1, DIM, 'center');
    Home.drawTabs(ui, ctx, game, L, 'garage'); drawToast(ui, ctx, L);
  };
  // garage : bascule entre AMELIORATIONS et MODULES (petit bouton dans le titre)
  const oldGarage = Home.drawGarage;
  Home.drawGarage = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T, HH, u } = L, m = u * 0.04;
    if (ui.garagePage === 'mods') Home.drawModules(ui, ctx, game, W, H); else oldGarage.apply(this, arguments);
    const top = T + HH * 0.1 + 2 + HH * 0.05 + HH * 0.018, th = HH * 0.062, bw = Math.min(W * 0.3, 120), bh = th * 0.7, bx = m * 1.6, by = top + (th - bh) / 2, mods = ui.garagePage === 'mods';
    panel(ctx, bx, by, bw, bh, mods ? '#3a3320' : '#2f4a3a', mods ? GOLD : GREEN, 6); txt(ctx, mods ? '< AMELIO.' : 'MODULES >', bx + bw / 2, by + bh * 0.3, bw - 8, 1.3, mods ? GOLD : GREEN, 'center');
    hit(ui, bx, by, bw, bh, () => { ui.garagePage = mods ? null : 'mods'; });
  };
})();

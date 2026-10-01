/* v050 : ECRANS « PREMIUM ARCADE » — accueil, game over, garage, monde, missions, boutique, réglages, pause, continuer ?
 * Tous construits avec les composants de CC.DS (ds.js) ; ils remplacent les écrans pixel de home.js / screens.js (mêmes noms de fonctions : le reste du jeu
 * n'a pas changé). Hiérarchie de chaque écran : 1 élément principal, 2–3 secondaires, le reste tertiaire.
 *   ACCUEIL : fusée 3D au centre (la scène) · PLAY (ENDLESS) très dominant · MISSIONS secondaire · GARAGE / WORLD / SHOP
 *   GAME OVER : distance · record · RETRY dominant · pub secondaire · accueil. */
(function () {
  const U = CC.U, DS = CC.DS, T = DS.T, Home = CC.Home;
  const hit = (ui, x, y, w, h, action) => ui.buttons.push({ x, y, w, h, action });
  const fmt = (n) => U.formatInt(Math.round(n));
  const ease = (k) => 1 - Math.pow(1 - U.clamp(k, 0, 1), 3);
  const absXp = (prog, level, xp) => { let a = xp; for (let l = 1; l < level; l++) a += prog.need(l); return a; };
  const levelOf = (prog, abs) => { let l = 1; while (abs >= prog.need(l)) { abs -= prog.need(l); l++; } return { level: l, xp: abs }; };
  const colW = (L, k) => Math.min(L.W - 20 * k, 440 * k);

  // ---------- fonds et en-têtes ----------
  function backdrop(ctx, L) {
    const { W, HH, T: top } = L, g = ctx.createLinearGradient(0, top, 0, top + HH); g.addColorStop(0, '#0B2238'); g.addColorStop(1, '#050E18'); ctx.fillStyle = g; ctx.fillRect(0, top, W, HH);
    const r = ctx.createRadialGradient(W / 2, top + HH * 0.16, 0, W / 2, top + HH * 0.16, W * 0.95); r.addColorStop(0, 'rgba(24,200,255,0.17)'); r.addColorStop(1, 'rgba(24,200,255,0)'); ctx.fillStyle = r; ctx.fillRect(0, top, W, HH);
    ctx.strokeStyle = 'rgba(65,200,255,0.05)'; ctx.lineWidth = 1; const st = 38 * DS.kOf(L); ctx.beginPath(); for (let x = (W / 2) % st; x < W; x += st) { ctx.moveTo(x, top); ctx.lineTo(x, top + HH); } for (let y = top; y < top + HH; y += st) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
  }
  function header(ui, ctx, L, k, title, game, opts) {
    opts = opts || {}; const { W, T: top } = L, m = 12 * k, cy = top + 40 * k;
    DS.iconButton(ui, ctx, m + 22 * k, cy, 42 * k, opts.back || 'back', () => { ui.overlay = null; }, { k });
    DS.text(ctx, title, W / 2, cy + 1 * k, 30 * k, T.white, { align: 'center', weight: 700, ls: 1.5 });
    if (opts.currency !== false) DS.currency(ui, ctx, W - m, cy - 17 * k, 34 * k, game.progress.P.materials || 0, k);
    return top + 76 * k;
  }

  // ============================================================================================================
  //   ACCUEIL
  // ============================================================================================================
  Home.drawHome = function (ui, ctx, game, W, H) {
    DS.release3d();
    const L = Home.layout(ui, W, H), { T: top, HH } = L, k = DS.kOf(L), prog = game.progress, P = prog.P, m = 12 * k;
    const arm = game.state === 'LAUNCH' ? U.clamp(1 - game.launchT / 0.3, 0, 1) : 1;   // l'interface s'efface dès que la charge commence
    if (arm <= 0) return;
    ctx.save(); ctx.globalAlpha = arm;
    // voile bas (le décor ne doit jamais concurrencer le bouton PLAY)
    const vg = ctx.createLinearGradient(0, top + HH * 0.5, 0, top + HH); vg.addColorStop(0, 'rgba(6,17,29,0)'); vg.addColorStop(1, 'rgba(6,17,29,0.85)'); ctx.fillStyle = vg; ctx.fillRect(0, top + HH * 0.5, W, HH * 0.5);
    const tg = ctx.createLinearGradient(0, top, 0, top + 190 * k); tg.addColorStop(0, 'rgba(6,17,29,0.7)'); tg.addColorStop(1, 'rgba(6,17,29,0)'); ctx.fillStyle = tg; ctx.fillRect(0, top, W, 190 * k);
    // --- haut : avatar, niveau, monnaie, réglages
    const ay = top + 12 * k, as = 50 * k;
    DS.avatar(ctx, m, ay, as); hit(ui, m, ay, as, as, () => { ui.overlay = 'garage'; });
    DS.level(ctx, m + as + 8 * k, ay + 2 * k, 96 * k, 46 * k, prog.level, U.clamp(prog.xp / prog.need(prog.level), 0, 1), k);
    DS.currency(ui, ctx, W - m - 50 * k, ay + 8 * k, 34 * k, P.materials || 0, k);
    DS.iconButton(ui, ctx, W - m - 22 * k, ay + 25 * k, 42 * k, 'gear', () => { ui.overlay = 'msettings'; }, { k, shadow: false, color: '#FFFFFF' });
    // --- bas : navigation, MISSIONS, PLAY (de bas en haut)
    const lvl = prog.level, items = [];
    if (lvl >= 2) items.push({ id: 'garage', icon: 'garage', label: 'GARAGE' });
    if (lvl >= 3) items.push({ id: 'map', icon: 'world', label: 'WORLD' });
    if (lvl >= 5) items.push({ id: 'shop', icon: 'shop', label: 'SHOP' });
    let bottom = top + HH;
    const gutter = Math.max(14 * k, (W - colW(L, k)) / 2);
    if (items.length) { const nh = DS.nav(ui, ctx, L, items, null, (id) => { ui.overlay = id; }); bottom -= nh; } else bottom -= 14 * k;
    DS.text(ctx, 'TOUCHE LA FUSEE', W / 2, bottom - 26 * k, 22 * k, T.white, { align: 'center', weight: 700, ls: 2, alpha: 0.75 + 0.25 * Math.sin(performance.now() / 1000 * Math.PI), shadow: 'rgba(0,0,0,0.55)' });   // v053 : plus de bouton PLAY
    const ph = 0, gutter2 = gutter; bottom -= 24 * k;
    if ((P.launches || 0) < 3) { const msg = 'PASSE LES TROUS  ·  VISE LES RESERVOIRS'; DS.text(ctx, msg, W / 2, bottom - 14 * k, DS.fit(ctx, msg, 14 * k, W - 2 * gutter), T.white, { align: 'center', weight: 700, shadow: 'rgba(0,0,0,0.6)', ls: 1 }); }
    
    ctx.restore();
  };

  // ============================================================================================================
  //   GAME OVER
  // ============================================================================================================
  Home.drawResults = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T: top, HH } = L, k = DS.kOf(L), r = game.results, prog = game.progress, t = r.t, m = 12 * k;
    ctx.fillStyle = 'rgba(4,12,22,0.72)'; ctx.fillRect(0, top, W, HH);
    const cw = Math.min(W - 24 * k, 400 * k), cx = W / 2, x0 = cx - cw / 2, al = (t0, d) => U.clamp((t - t0) / (d || 0.3), 0, 1);
    const dist = Math.round(r.dist || 0);
    // --- titre
    let y = top + 56 * k;
    { const a = ease(al(0, 0.35)); ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, y); const s = 0.8 + 0.2 * a; ctx.scale(s, s); DS.text(ctx, 'GAME OVER', 0, 0, 44 * k, T.white, { align: 'center', weight: 700, italic: true, stroke: '#0A2540', ls: 2 }); ctx.restore(); }
    // --- distance (compteur)
    y += 40 * k; const ph = 118 * k, shown = Math.round(dist * ease((t - 0.2) / 0.9));
    if (t > 0.2 && shown < dist && (r.tickAt || 0) + 0.07 < t) { r.tickAt = t; game.audio.play('xpTick', null, Math.floor(shown / Math.max(1, dist) * 8)); }
    if (shown >= dist && !r.scoreDone && t > 1.1) { r.scoreDone = true; if (r.newRecord) { game.audio.play('record'); if (CC.Haptics) CC.Haptics.pattern('record'); } }
    ctx.save(); ctx.globalAlpha = ease(al(0.15, 0.3)); DS.panel(ctx, x0, y, cw, ph, { k, accent: T.cyan, glow: true });
    DS.icon(ctx, 'trophy', x0 + 40 * k, y + 36 * k, 36 * k, T.gold, { shadow: true });
    DS.text(ctx, 'DISTANCE', x0 + 70 * k, y + 28 * k, 16 * k, T.text2, { weight: 500, ls: 2 });
    DS.text(ctx, fmt(shown) + ' m', cx, y + 78 * k, DS.fit(ctx, fmt(dist) + ' m', 54 * k, cw - 30 * k), T.white, { align: 'center', weight: 700 });
    ctx.restore();
    y += ph + 10 * k;
    // --- record
    if (t > 1.1) {
      const a = ease(al(1.1, 0.4)); ctx.save(); ctx.globalAlpha = a;
      if (r.newRecord) { const pulse = 1 + 0.04 * Math.sin(t * 8); ctx.translate(cx, y + 20 * k); ctx.scale(pulse, pulse); DS.panel(ctx, -cw * 0.4, -20 * k, cw * 0.8, 40 * k, { k, r: 20 * k, accent: T.gold, glow: true, shadow: false }); DS.icon(ctx, 'trophy', -cw * 0.4 + 26 * k, 0, 24 * k, T.gold); DS.text(ctx, 'NEW RECORD!', 6 * k, 1 * k, 24 * k, T.gold, { align: 'center', weight: 700, ls: 1.5 }); }
      else { const best = Math.round(game.progress.P.bestDist || 0), miss = Math.max(0, best - dist); DS.text(ctx, 'BEST ' + fmt(best) + ' m', cx, y + 8 * k, 20 * k, T.text2, { align: 'center', weight: 700, ls: 1 }); if (miss > 0) DS.text(ctx, 'IL T\'A MANQUE ' + fmt(miss) + ' m', cx, y + 32 * k, 20 * k, T.gold, { align: 'center', weight: 700, ls: 1 }); }
      ctx.restore();
    }
    y += 52 * k;
    // --- cartes de gains : écrous · cibles · cause
    const cs = [['coin', 'ECROUS', '+' + (r.materials || 0), T.gold], ['target', 'RESERVOIRS', '+' + ((r.runStats && r.runStats.targets) || 0), T.cyanL], ['speed', 'TOUCHE', r.cause ? r.cause : 'CRASH', T.danger]];
    const gap = 8 * k, cwid = (cw - gap * 2) / 3, chh = 76 * k;
    cs.forEach(([ic, lab, val, col], i) => { const a = ease(al(0.9 + i * 0.12, 0.3)); ctx.save(); ctx.globalAlpha = a; const cxx = x0 + i * (cwid + gap); DS.panel(ctx, cxx, y + (1 - a) * 12 * k, cwid, chh, { k, shadow: false }); const yy = y + (1 - a) * 12 * k; DS.icon(ctx, ic === 'speed' ? 'close' : ic, cxx + cwid / 2, yy + 20 * k, 24 * k, col); DS.text(ctx, lab, cxx + cwid / 2, yy + 42 * k, DS.fit(ctx, lab, 13 * k, cwid - 8 * k), T.text2, { align: 'center', weight: 500, ls: 1 }); DS.text(ctx, val, cxx + cwid / 2, yy + 62 * k, DS.fit(ctx, val, 20 * k, cwid - 8 * k), col === T.danger ? T.danger : T.white, { align: 'center', weight: 700 }); ctx.restore(); });
    y += chh + 10 * k;
    // --- niveau : barre d'XP animée
    { const a = ease(al(1.2, 0.3)); ctx.save(); ctx.globalAlpha = a;
      const tBar = 1.3, dur0 = U.clamp(0.7 + r.gained / 14, 0.8, 2.2), from = absXp(prog, r.before.level, r.before.xp), to = absXp(prog, r.after.level, r.after.xp);
      const cur = from + (to - from) * ease((t - tBar) / dur0), at = levelOf(prog, cur);
      if (r.lvShown === undefined) r.lvShown = r.before.level;
      if (at.level > r.lvShown) { r.lvShown = at.level; r.lvFlash = t; game.audio.play('levelUp'); if (CC.Haptics) CC.Haptics.pattern('levelUp'); }
      DS.panel(ctx, x0, y, cw, 50 * k, { k, shadow: false });
      DS.text(ctx, 'LV ' + at.level, x0 + 16 * k, y + 25 * k, 24 * k, T.white, { weight: 700 });
      DS.bar(ctx, x0 + 92 * k, y + 19 * k, cw - 150 * k, 13 * k, at.xp / prog.need(at.level), { k, c1: T.cyanL, c2: T.blue, glow: true });
      DS.text(ctx, '+' + (r.gained + (r.xpDoubled ? r.gained : 0)), x0 + cw - 14 * k, y + 25 * k, 20 * k, T.cyanL, { align: 'right', weight: 700 });
      ctx.restore();
      if (r.lvFlash !== undefined && t - r.lvFlash < 2) { const kk = t - r.lvFlash, aa = Math.min(1, kk * 6, (2 - kk) * 2); DS.text(ctx, 'LEVEL UP!', cx, y - 12 * k - 12 * k * kk, 26 * k, T.gold, { align: 'center', weight: 700, italic: true, alpha: aa, stroke: '#0A2540', ls: 1 }); } }
    // --- boutons (de bas en haut) : RETRY dominant, pub, accueil
    const ready = t > 0.6, gutter = Math.max(14 * k, (W - cw) / 2), bottom = top + HH - 18 * k;
    const rh = 70 * k, ah = 54 * k, ry = bottom - rh, ay = ry - ah - 10 * k;
    const adOk = game.ads && game.ads.enabled() && !r.xpDoubled && r.gained >= 3 && !game.testMode && t > 1.8;
    if (adOk) DS.btn(ui, ctx, gutter, ay, W - 2 * gutter - 62 * k, ah, { k, kind: 'secondary', label: 'WATCH AD  X2', icon: 'ad', iconColor: T.cyanL, color: T.white, size: ah * 0.38, glow: true, key: 'ad', action: () => game.ads.rewarded(() => Home.doubleXp(game), null, 'xp') });
    if (ready) {
      DS.btn(ui, ctx, gutter, ry, W - 2 * gutter - 62 * k, rh, { k, kind: 'primary', label: 'RETRY', icon: 'retry', size: rh * 0.44, breathe: true, glow: true, key: 'retry', action: () => { const go = () => game.goHome({ autoLaunch: false }); game.ads ? game.ads.beforeContinue(go) : go(); } });
      DS.iconButton(ui, ctx, W - gutter - 26 * k, ry + rh / 2, 52 * k, 'home', () => { game.goHome({ autoLaunch: false }); }, { k });
      if ((prog.P.launches || 0) >= 2) ui.buttons.push({ x: 0, y: top, w: W, h: HH, action: () => { const go = () => game.goHome({ autoLaunch: false }); game.ads ? game.ads.beforeContinue(go) : go(); } });   // dès le 3e vol : toucher n'importe où relance
    }
    ui.buttons.push({ x: 0, y: top, w: W, h: HH, action: () => { r.t = Math.max(r.t, 6); } });
  };

  // ============================================================================================================
  //   GARAGE
  // ============================================================================================================
  const UPICON = { tank: 'fuel', eff: 'upgrade', hull: 'armor', mult: 'speed' };
  Home.drawGarage = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T: top, HH } = L, k = DS.kOf(L), prog = game.progress, cw = colW(L, k), x0 = W / 2 - cw / 2, t = performance.now() / 1000;
    backdrop(ctx, L);
    let y = header(ui, ctx, L, k, 'GARAGE', game);
    // vitrine : fusée sur un plateau
    const sh = Math.min(210 * k, (L.HH - 76 * k - 4 * 80 * k - 120 * k) ); DS.panel(ctx, x0, y, cw, sh, { k, accent: T.cyan, glow: true });
    ctx.save(); rrClip(ctx, x0, y, cw, sh, 16 * k);
    const g = ctx.createRadialGradient(W / 2, y + sh * 0.7, 0, W / 2, y + sh * 0.7, cw * 0.55); g.addColorStop(0, 'rgba(24,200,255,0.3)'); g.addColorStop(1, 'rgba(24,200,255,0)'); ctx.fillStyle = g; ctx.fillRect(x0, y, cw, sh);
    ctx.beginPath(); ctx.ellipse(W / 2, y + sh * 0.9, cw * 0.3, 10 * k, 0, 0, 6.2832); ctx.fillStyle = 'rgba(10,50,80,0.7)'; ctx.fill(); ctx.strokeStyle = 'rgba(24,200,255,0.7)'; ctx.lineWidth = 2 * k; ctx.stroke();
    if (!DS.rocket3d(ctx, game, x0, y, cw, sh * 0.92, t)) DS.rocket(ctx, W / 2, y + sh * 0.5 + Math.sin(t * 1.6) * 3 * k, 190 * k, -0.28);
    ctx.restore();
    y += sh + 12 * k;
    // améliorations
    const rows = CC.Progress.UPG, rh = 76 * k, gap = 9 * k;
    rows.forEach((up, i) => {
      const lv = prog.upLevel(up.id), cost = prog.upCost(up.id), can = prog.canBuy(up.id), maxed = cost === null, yy = y + i * (rh + gap);
      DS.panel(ctx, x0, yy, cw, rh, { k, shadow: false });
      DS.panel(ctx, x0 + 8 * k, yy + 12 * k, 52 * k, 52 * k, { k, r: 12 * k, shadow: false, accent: T.borderSoft });
      DS.icon(ctx, UPICON[up.id] || 'upgrade', x0 + 34 * k, yy + 38 * k, 30 * k, T.cyanL);
      DS.text(ctx, up.name, x0 + 70 * k, yy + 21 * k, DS.fit(ctx, up.name, 19 * k, cw * 0.5 - 70 * k), T.white, { weight: 700, ls: 0.5 });
      DS.bar(ctx, x0 + 70 * k, yy + 38 * k, cw * 0.34, 11 * k, lv / up.max, { k, c1: T.cyanL, c2: T.blue, ticks: up.max });
      DS.text(ctx, 'LV ' + lv, x0 + 70 * k + cw * 0.34 + 10 * k, yy + 44 * k, 14 * k, T.text2, { weight: 700 });
      DS.text(ctx, maxed ? up.desc(lv) : up.desc(lv + 1), x0 + 70 * k, yy + 62 * k, DS.fit(ctx, maxed ? up.desc(lv) : up.desc(lv + 1), 12 * k, cw * 0.46), T.muted, { weight: 500 });
      const bw = cw * 0.28, bh = 48 * k, bx = x0 + cw - bw - 10 * k, by = yy + (rh - bh) / 2;
      if (maxed) DS.text(ctx, 'MAX', bx + bw / 2, by + bh / 2, 22 * k, T.gold, { align: 'center', weight: 700 });
      else DS.btn(ui, ctx, bx, by, bw, bh, { k, kind: can ? 'primary' : 'secondary', label: fmt(cost), icon: 'coin', iconColor: T.gold, color: can ? '#fff' : T.text2, size: bh * 0.46, shadow: false, key: 'up' + up.id, action: () => { if (prog.buy(up.id)) { game.audio.play('levelUp'); if (CC.Haptics) CC.Haptics.pattern('mission'); } else game.audio.play('warnFuel'); } });
    });
    y += rows.length * (rh + gap);
    DS.text(ctx, 'TOUCHE UN RESERVOIR EN VOL POUR GAGNER DES ECROUS', W / 2, y + 6 * k, DS.fit(ctx, 'TOUCHE UN RESERVOIR EN VOL POUR GAGNER DES ECROUS', 13 * k, cw), T.muted, { align: 'center', weight: 500, ls: 0.6 });
    navBar(ui, ctx, L, game, 'garage');
  };
  function rrClip(ctx, x, y, w, h, r) { DS.rr(ctx, x, y, w, h, r); ctx.clip(); }
  function navBar(ui, ctx, L, game, active) {
    const lvl = game.progress.level, items = [{ id: 'garage', icon: 'garage', label: 'GARAGE', lv: 2 }, { id: 'map', icon: 'world', label: 'WORLD', lv: 3 }, { id: 'shop', icon: 'shop', label: 'SHOP', lv: 5 }].filter((i) => lvl >= i.lv);
    if (items.length) DS.nav(ui, ctx, L, items, active, (id) => { ui.overlay = id === active ? null : id; });
  }
  Home.drawProgress = Home.drawUpgrades = Home.drawGarage;

  // ============================================================================================================
  //   WORLD (décors)
  // ============================================================================================================
  const ZONES = {
    city: ['AVENUE', ['#7FB6E8', '#DCEBF7'], '#33506E', 'bldg'], forest: ['FORET', ['#8FC4E6', '#DFF0DC'], '#2F6B3E', 'tri'], usine: ['USINE', ['#6A6258', '#B8AC98'], '#3A342E', 'bldg'],
    port: ['PORT', ['#6FA9D8', '#EAF2F6'], '#2A5278', 'wave'], eau: ['PROFONDEUR', ['#0A4A5A', '#04303A'], '#0A6A7A', 'wave'], tour: ['ASCENSION', ['#5A86C0', '#C8DCF0'], '#2E4A6E', 'bldg'],
    sky: ['BASE AERIENNE', ['#3A5E9E', '#F0B890'], '#7A8AA4', 'tri'], chute: ['CHUTE LIBRE', ['#2A2A6A', '#FFB080'], '#33406A', 'bldg'], metro: ['METRO', ['#10202C', '#26404E'], '#5A7684', 'arch'], mini: ['MINIATURE', ['#D8C8A8', '#E8DCC4'], '#B8905C', 'blocks'],
  };
  function zoneArt(ctx, x, y, w, h, z, open) {
    ctx.save(); rrClip(ctx, x, y, w, h, 12); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, z[1][0]); g.addColorStop(1, z[1][1]); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = z[2]; const kind = z[3], n = 7;
    if (kind === 'bldg') for (let i = 0; i < n; i++) { const bw = w / n, bh = h * (0.3 + 0.45 * ((i * 37 % 7) / 7)); ctx.fillRect(x + i * bw + 2, y + h - bh, bw - 2, bh); }
    else if (kind === 'tri') for (let i = 0; i < n; i++) { const bw = w / (n - 1), bh = h * (0.4 + 0.3 * ((i * 53 % 5) / 5)); ctx.beginPath(); ctx.moveTo(x + i * bw - bw * 0.6, y + h); ctx.lineTo(x + i * bw, y + h - bh); ctx.lineTo(x + i * bw + bw * 0.6, y + h); ctx.fill(); }
    else if (kind === 'wave') { ctx.beginPath(); ctx.moveTo(x, y + h); for (let i = 0; i <= 20; i++) ctx.lineTo(x + w * i / 20, y + h * 0.66 + Math.sin(i * 0.9) * h * 0.06); ctx.lineTo(x + w, y + h); ctx.fill(); ctx.fillRect(x + w * 0.62, y + h * 0.25, 3, h * 0.45); ctx.fillRect(x + w * 0.5, y + h * 0.25, w * 0.2, 3); }
    else if (kind === 'arch') { ctx.fillRect(x, y, w, h); ctx.fillStyle = '#0A141C'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h, w * 0.4, h * 0.8, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#FFD070'; ctx.fillRect(x + w / 2 - 2, y + h * 0.3, 4, h * 0.7); }
    else for (let i = 0; i < 5; i++) { ctx.fillStyle = ['#C0422E', '#3E78B8', '#E8B83A', '#4A9A5A', '#8A6AC8'][i]; ctx.fillRect(x + w * (0.05 + i * 0.18), y + h - h * (0.3 + 0.08 * i % 3), w * 0.14, h * (0.3 + 0.08 * i % 3)); }
    if (!open) { ctx.fillStyle = 'rgba(4,12,22,0.62)'; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }
  Home.drawMap = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T: top, HH } = L, k = DS.kOf(L), prog = game.progress, cfg = CC.CONFIG.progress, cw = colW(L, k), x0 = W / 2 - cw / 2;
    backdrop(ctx, L);
    let y = header(ui, ctx, L, k, 'WORLD', game);
    const ids = ['city', 'forest', 'usine', 'port', 'eau', 'tour', 'sky', 'chute', 'metro', 'mini'], gap = 8 * k, cwid = (cw - gap) / 2, chh = Math.min(104 * k, (HH - 76 * k - 100 * k - 6 * 8 * k) / 5);
    ids.forEach((id, i) => {
      const z = ZONES[id], open = prog.level >= cfg.worlds[id], x = x0 + (i % 2) * (cwid + gap), yy = y + Math.floor(i / 2) * (chh + gap);
      DS.panel(ctx, x, yy, cwid, chh, { k, shadow: false, accent: open ? T.border : T.borderSoft, glow: open && i === 0 });
      zoneArt(ctx, x + 5 * k, yy + 5 * k, cwid - 10 * k, chh * 0.56, z, open);
      if (!open) DS.icon(ctx, 'lock', x + cwid / 2, yy + 5 * k + chh * 0.28, 26 * k, T.text2);
      DS.text(ctx, String(i + 1).padStart(2, '0') + '  ' + z[0], x + 10 * k, yy + chh * 0.8, DS.fit(ctx, String(i + 1).padStart(2, '0') + '  ' + z[0], 15 * k, cwid - 20 * k), open ? T.white : T.muted, { weight: 700, ls: 0.5 });
      if (!open) DS.text(ctx, 'LV ' + cfg.worlds[id], x + cwid - 10 * k, yy + chh * 0.8, 13 * k, T.gold, { align: 'right', weight: 700 });
    });
    // accès aux 9 niveaux d'origine
    { const by = y + 5 * (chh + gap) + 2 * k; DS.btn(ui, ctx, x0, by, cw, 52 * k, { k, kind: 'secondary', label: 'NIVEAUX 1 A 9', icon: 'rocket', iconColor: T.cyanL, color: T.white, size: 20 * k, glow: true, key: 'lv9', action: () => { ui.overlay = 'levels'; } }); }
    navBar(ui, ctx, L, game, 'map');
  };
  Home.drawLevels = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T: top, HH } = L, k = DS.kOf(L), cw = colW(L, k), x0 = W / 2 - cw / 2, best = game.save.best || {};
    backdrop(ctx, L);
    let y = header(ui, ctx, L, k, 'NIVEAUX', game, { currency: false });
    const n = CC.Levels.length, gap = 7 * k, rh = Math.min(58 * k, (HH - 76 * k - 70 * k - gap * n) / n);
    CC.Levels.forEach((lv, i) => {
      const open = game.isUnlocked(i), b = best[lv.id], yy = y + i * (rh + gap);
      DS.panel(ctx, x0, yy, cw, rh, { k, shadow: false, accent: open ? undefined : T.borderSoft });
      DS.panel(ctx, x0 + 8 * k, yy + (rh - 38 * k) / 2, 38 * k, 38 * k, { k, r: 10 * k, shadow: false, accent: T.borderSoft }); DS.text(ctx, String(i + 1), x0 + 27 * k, yy + rh / 2 + 1 * k, 22 * k, open ? T.cyanL : T.muted, { align: 'center', weight: 700 });
      DS.text(ctx, lv.name, x0 + 58 * k, yy + rh / 2, 21 * k, open ? T.white : T.muted, { weight: 700, ls: 1 });
      if (open) { DS.text(ctx, b ? U.formatTime(b.time) : '--:--', x0 + cw - 62 * k, yy + rh / 2, 17 * k, b ? T.gold : T.muted, { align: 'right', weight: 700 }); DS.icon(ctx, 'play', x0 + cw - 30 * k, yy + rh / 2, 22 * k, T.cyanL); hit(ui, x0, yy, cw, rh, () => game.startLevel(i)); }
      else DS.icon(ctx, 'lock', x0 + cw - 30 * k, yy + rh / 2, 22 * k, T.muted);
    });
    DS.btn(ui, ctx, x0, y + n * (rh + gap) + 2 * k, cw, 48 * k, { k, kind: 'secondary', label: 'DEFIS ET MISSIONS LIBRES', size: 17 * k, color: T.white, key: 'defis', action: () => { ui.overlay = 'defi'; } });
  };

  // ============================================================================================================
  //   MISSIONS (mission en cours + entrée EXPEDITIONS)
  // ============================================================================================================
  Home.drawQuests = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T: top, HH } = L, k = DS.kOf(L), prog = game.progress, cw = colW(L, k), x0 = W / 2 - cw / 2;
    backdrop(ctx, L);
    let y = header(ui, ctx, L, k, 'MISSIONS', game);
    DS.text(ctx, 'OBJECTIF DU JOUR', x0, y + 6 * k, 15 * k, T.cyanL, { weight: 700, ls: 2 }); y += 24 * k;
    prog.P.missions.forEach((mi) => {
      const done = mi.done, h = 92 * k; DS.panel(ctx, x0, y, cw, h, { k, accent: done ? T.green : T.border, glow: !done });
      DS.panel(ctx, x0 + 10 * k, y + 14 * k, 56 * k, 56 * k, { k, r: 14 * k, shadow: false, accent: T.borderSoft }); DS.icon(ctx, done ? 'check' : 'mission', x0 + 38 * k, y + 42 * k, 32 * k, done ? T.green : T.cyanL);
      const label = prog.missionText(mi); DS.text(ctx, label, x0 + 78 * k, y + 24 * k, DS.fit(ctx, label, 19 * k, cw - 160 * k), T.white, { weight: 700 });
      DS.bar(ctx, x0 + 78 * k, y + 46 * k, cw - 160 * k, 12 * k, mi.progress / mi.target, { k, c1: done ? '#9FF0C0' : T.cyanL, c2: done ? T.green : T.blue, ticks: 0 });
      DS.text(ctx, mi.progress + ' / ' + mi.target, x0 + 78 * k, y + 74 * k, 13 * k, T.text2, { weight: 500 });
      DS.text(ctx, done ? 'TERMINEE' : '+' + mi.xp, x0 + cw - 14 * k, y + 24 * k, 20 * k, done ? T.green : T.gold, { align: 'right', weight: 700 });
      y += h + 10 * k;
    });
    DS.text(ctx, 'UNE NOUVELLE MISSION APRES CHAQUE VOL', W / 2, y + 4 * k, DS.fit(ctx, 'UNE NOUVELLE MISSION APRES CHAQUE VOL', 13 * k, cw), T.muted, { align: 'center', weight: 500, ls: 0.6 }); y += 36 * k;
    DS.text(ctx, 'EXPEDITIONS', x0, y, 15 * k, T.cyanL, { weight: 700, ls: 2 }); y += 20 * k;
    const eh = 128 * k; DS.panel(ctx, x0, y, cw, eh, { k, accent: T.orange, glow: true });
    DS.text(ctx, 'NIVEAUX A OBJECTIF', x0 + 16 * k, y + 26 * k, 22 * k, T.white, { weight: 700, ls: 0.5 }); DS.text(ctx, 'Atteins la cible, gagne des etoiles', x0 + 16 * k, y + 50 * k, DS.fit(ctx, 'Atteins la cible, gagne des etoiles', 14 * k, cw - 30 * k), T.text2, { weight: 500 });
    DS.btn(ui, ctx, x0 + 14 * k, y + eh - 54 * k, cw - 28 * k, 42 * k, { k, kind: 'primary', label: 'OUVRIR', icon: 'play', size: 17 * k, shadow: false, key: 'exp', action: () => { ui.overlay = 'defi'; } });
  };

  // ============================================================================================================
  //   REGLAGES
  // ============================================================================================================
  Home.drawSettings = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), k = DS.kOf(L), cw = colW(L, k), x0 = W / 2 - cw / 2, s = game.settings;
    backdrop(ctx, L);
    let y = header(ui, ctx, L, k, 'SETTINGS', game, { currency: false });
    const vib = ['OFF', 'LOW', 'MED', 'HIGH'], vibV = s.vibration !== undefined ? s.vibration : 2;
    const rows = [['SON', s.sfx > 0, () => ui.toggleVolume(game, 'sfx')], ['MUSIQUE', s.music > 0, () => ui.toggleVolume(game, 'music')], ['VIBRATION', vib[vibV], () => { s.vibration = (vibV + 1) % 4; if (CC.Haptics) { CC.Haptics.setLevel(s.vibration); CC.Haptics.tick('fire'); } game.applySettings(); }],
      ['GRAPHISMES', ui.graphicsLabel(game), () => ui.cycleGraphics(game)], ['PUBS D\'EXEMPLE', s.ads !== false, () => { s.ads = s.ads === false; game.applySettings(); }], ['REVOIR LE TUTO', 'GO', () => { s.tutorialDone = false; s.tutorialFlights = 0; game.progress.P.launches = 0; game.applySettings(); ui.overlay = null; }]];
    const rh = 58 * k, gap = 9 * k;
    rows.forEach(([lab, v, act], i) => {
      const yy = y + i * (rh + gap), hot = !ui.isTouch() && ui.mouse.x >= x0 && ui.mouse.x <= x0 + cw && ui.mouse.y >= yy && ui.mouse.y <= yy + rh;
      DS.panel(ctx, x0, yy, cw, rh, { k, shadow: false, accent: hot ? T.cyanL : undefined });
      DS.text(ctx, lab, x0 + 18 * k, yy + rh / 2, 20 * k, T.white, { weight: 700, ls: 0.8 });
      if (typeof v === 'boolean') { const sw = 56 * k, sh = 28 * k, sx = x0 + cw - sw - 16 * k, sy = yy + (rh - sh) / 2; DS.rr(ctx, sx, sy, sw, sh, sh / 2); ctx.fillStyle = v ? T.cyan : 'rgba(255,255,255,0.14)'; ctx.fill(); ctx.beginPath(); ctx.arc(v ? sx + sw - sh / 2 : sx + sh / 2, sy + sh / 2, sh / 2 - 3 * k, 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill(); }
      else DS.text(ctx, v, x0 + cw - 18 * k, yy + rh / 2, 20 * k, v === 'GO' ? T.orange : T.cyanL, { align: 'right', weight: 700 });
      hit(ui, x0, yy, cw, rh, act);
    });
  };

  // ============================================================================================================
  //   CONTINUER ?  (publicité récompensée après un crash)
  // ============================================================================================================
  Home.drawRevive = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T: top, HH } = L, k = DS.kOf(L), run = game.endlessRun, RC = CC.CONFIG.revive, cw = colW(L, k);
    ctx.fillStyle = 'rgba(4,12,22,0.74)'; ctx.fillRect(0, top, W, HH);
    const kf = U.clamp(game.reviveT / RC.window, 0, 1), cx = W / 2, cy = top + HH * 0.3, r = 74 * k;
    ctx.lineCap = 'round'; ctx.lineWidth = 12 * k; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = kf < 0.3 ? T.danger : T.cyan; ctx.shadowColor = kf < 0.3 ? T.danger : T.cyan; ctx.shadowBlur = 12 * k; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * kf); ctx.stroke(); ctx.shadowBlur = 0;
    DS.text(ctx, String(Math.ceil(game.reviveT)), cx, cy + 2 * k, 70 * k, T.white, { align: 'center', weight: 700 });
    DS.text(ctx, 'CONTINUER ?', cx, top + HH * 0.3 + r + 44 * k, 40 * k, T.white, { align: 'center', weight: 700, italic: true, stroke: '#0A2540', ls: 1.5 });
    DS.text(ctx, fmt(run.dist) + ' m', cx, top + HH * 0.3 + r + 84 * k, 30 * k, T.gold, { align: 'center', weight: 700 });
    const gutter = Math.max(14 * k, (W - cw) / 2), by = top + HH * 0.7;
    DS.btn(ui, ctx, gutter, by, W - 2 * gutter, 72 * k, { k, kind: 'primary', label: 'WATCH AD', sub: 'RESTART PROTECTED', icon: 'ad', size: 30 * k, breathe: true, glow: true, key: 'revive', action: () => game.ads.rewarded(() => game.revive(), null, 'revive') });
    DS.btn(ui, ctx, gutter + 30 * k, by + 88 * k, W - 2 * gutter - 60 * k, 46 * k, { k, kind: 'ghost', label: 'NON MERCI', color: T.text2, size: 18 * k, shadow: false, key: 'nothanks', action: () => { ui.overlay = null; game.finishEndless(); } });
  };

  // ============================================================================================================
  //   BOUTIQUE (cosmétiques)
  // ============================================================================================================
  const TABS = [['COMMUNES', (s) => s.tier === 'base' || s.tier === 'common'], ['RARES', (s) => s.tier === 'rare'], ['ULTRA', (s) => s.tier === 'ultra']];
  CC.Shop.prototype.draw = function (ctx, game, W, H) {
    const ui = this.ui, L = Home.layout(ui, W, H), k = DS.kOf(L), cw = colW(L, k), x0 = W / 2 - cw / 2, prog = game.progress;
    backdrop(ctx, L);
    let y = header(ui, ctx, L, k, 'SHOP', game);
    this.tab = this.tab || 0; this.page = this.page || 0;
    const th = 40 * k, tw = (cw - 12 * k) / 3;
    TABS.forEach(([lab], i) => { const on = i === this.tab, x = x0 + i * (tw + 6 * k); DS.panel(ctx, x, y, tw, th, { k, shadow: false, r: 12 * k, accent: on ? T.cyanL : T.borderSoft, glow: on }); if (on) { DS.rr(ctx, x, y, tw, th, 12 * k); ctx.fillStyle = 'rgba(24,200,255,0.16)'; ctx.fill(); } DS.text(ctx, lab, x + tw / 2, y + th / 2, 16 * k, on ? T.cyanL : T.text2, { align: 'center', weight: 700, ls: 1 }); hit(ui, x, y, tw, th, () => { this.tab = i; this.page = 0; }); });
    y += th + 10 * k;
    const list = CC.Skins.list.filter(TABS[this.tab][1]), per = 4, pages = Math.max(1, Math.ceil(list.length / per)); this.page = Math.min(this.page, pages - 1);
    const gap = 8 * k, cwid = (cw - gap) / 2, ch = Math.min(196 * k, (L.HH - 76 * k - 50 * k - 150 * k) / 2);
    list.slice(this.page * per, this.page * per + per).forEach((s, i) => {
      const x = x0 + (i % 2) * (cwid + gap), yy = y + Math.floor(i / 2) * (ch + gap), owned = !!game.save.owned[s.id], eq = game.save.equipped === s.id;
      DS.panel(ctx, x, yy, cwid, ch, { k, shadow: false, accent: eq ? T.gold : undefined, glow: eq });
      DS.panel(ctx, x + 6 * k, yy + 6 * k, cwid - 12 * k, ch * 0.36, { k, r: 12 * k, shadow: false, accent: T.borderSoft });
      ctx.save(); ctx.translate(x + cwid / 2 - 10 * k, yy + 6 * k + ch * 0.18); ctx.scale(k * 2.2, k * 2.2); CC.Shop.icon(ctx, s, 0, 0, 24); ctx.restore();
      DS.text(ctx, s.short || s.name, x + cwid / 2, yy + ch * 0.5, DS.fit(ctx, s.short || s.name, 17 * k, cwid - 14 * k), T.white, { align: 'center', weight: 700, ls: 0.5 });
      DS.text(ctx, eq ? 'EQUIPEE' : owned ? 'A TOI' : CC.Skins.formatPrice(s.price), x + cwid / 2, yy + ch * 0.62, 15 * k, eq ? T.gold : owned ? T.green : T.cyanL, { align: 'center', weight: 700 });
      const bh = 34 * k, by = yy + ch - bh - 8 * k, bx = x + 8 * k, bw2 = cwid - 16 * k;
      if (eq) DS.btn(ui, ctx, bx, by, bw2, bh, { k, kind: 'secondary', label: 'OK', color: T.text2, size: bh * 0.46, shadow: false, key: 'eq' + s.id });
      else DS.btn(ui, ctx, bx, by, bw2, bh, { k, kind: owned ? 'success' : 'primary', label: owned ? 'EQUIPER' : 'ACHETER', size: bh * 0.46, shadow: false, key: 'buy' + s.id, action: () => (owned ? this.pick(game, s.id) : this.buy(game, s.id)) });
      if (!owned) { DS.text(ctx, 'OU 1 MIN DE PUB', x + cwid / 2, by - 11 * k, 11 * k, T.cyanL, { align: 'center', weight: 500, ls: 0.5 }); hit(ui, x + 4 * k, by - 18 * k, cwid - 8 * k, 14 * k, () => this.watch(game, s.id)); }
    });
    y += 2 * (ch + gap);
    DS.text(ctx, (this.page + 1) + ' / ' + pages, W / 2, y + 12 * k, 16 * k, T.text2, { align: 'center', weight: 700 });
    DS.iconButton(ui, ctx, W / 2 - 62 * k, y + 12 * k, 38 * k, 'back', () => { this.page = (this.page - 1 + pages) % pages; }, { k, shadow: false });
    ctx.save(); ctx.translate(W / 2 + 62 * k, y + 12 * k); ctx.scale(-1, 1); ctx.translate(-(W / 2 + 62 * k), -(y + 12 * k)); DS.iconButton(ui, ctx, W / 2 + 62 * k, y + 12 * k, 38 * k, 'back', null, { k, shadow: false }); ctx.restore();
    hit(ui, W / 2 + 62 * k - 22 * k, y - 10 * k, 44 * k, 44 * k, () => { this.page = (this.page + 1) % pages; });
    if (this.flash) DS.text(ctx, this.flash, W / 2, y + 44 * k, DS.fit(ctx, this.flash, 14 * k, cw), T.gold, { align: 'center', weight: 700 });
    navBar(ui, ctx, L, game, 'shop');
  };

  // ============================================================================================================
  //   PAUSE + boutons génériques (anciens écrans : défis, générateur, pubs…)
  // ============================================================================================================
  const UI = CC.UI;
  UI.prototype.dim = function (ctx, W, H, a) { ctx.fillStyle = 'rgba(4,12,22,' + Math.max(a, 0.5) + ')'; ctx.fillRect(0, -(this.offsetY || 0), W, this.fullH || H); };
  UI.prototype.button = function (ctx, label, x, y, px, action, opts) {
    opts = opts || {}; const touch = this.isTouch(), k = Math.max(0.7, (this.portrait ? ctx.canvas.width : Math.min(ctx.canvas.width, (this.fullH || ctx.canvas.height) * 0.62)) / 390);
    const size = Math.max(13 * k, px * 7.2), tw = DS.measure(ctx, label, size), w = opts.hitW || tw + size * 2.2; let h = Math.max(size * 2.1, touch ? 44 * this.pixelRatio() : 0);
    const bx = opts.align === 'left' ? x - size : x - w / 2, by = y - h / 2 + size * 0.45, hot = !touch && this.mouse.x >= bx && this.mouse.x <= bx + w && this.mouse.y >= by && this.mouse.y <= by + h;
    if (hot) this.hover = this.buttons.length; this.buttons.push({ x: bx, y: by, w, h, action });
    const primary = !!opts.primary || /REPRENDRE|RETRY|REJOUER/.test(label);
    DS.btn({ buttons: [], isTouch: () => touch, mouse: this.mouse }, ctx, bx, by, w, h, { k, kind: primary ? 'primary' : 'secondary', label, size, color: T.white, shadow: false, key: 'ub' + label });
  };
  UI.prototype.drawPause = function (ctx, game, W, H) {
    const L = Home.layout(this, W, H), { T: top, HH } = L, k = DS.kOf(L), touch = this.isTouch(), s = game.settings, endless = !!game.endlessRun;
    ctx.fillStyle = 'rgba(4,12,22,0.78)'; ctx.fillRect(0, top, W, HH);
    DS.text(ctx, 'PAUSE', W / 2, top + 70 * k, 46 * k, T.white, { align: 'center', weight: 700, italic: true, stroke: '#0A2540', ls: 3 });
    const vib = ['OFF', 'LOW', 'MED', 'HIGH'], vv = s.vibration !== undefined ? s.vibration : 2, rows = [['RESUME', () => game.resume(), 'primary', 'play']];
    if (endless) { rows.push(['RESTART', () => { game.resume(); game.restartLevel(); }, 'secondary', 'retry']); rows.push(['FINISH & SEE REWARDS', () => { game.resume(); game.finishEndless(); }, 'secondary', 'trophy']); }
    else { rows.push(['RESTART', () => { game.resume(); game.restartLevel(); }, 'secondary', 'retry']); const next = game.nextUnlocked(); if (next >= 0) rows.push(['NEXT LEVEL', () => { game.resume(); game.startLevel(next); }, 'secondary', 'play']); }
    rows.push(['SOUND : ' + (s.sfx > 0 ? 'ON' : 'OFF'), () => this.toggleVolume(game, 'sfx'), 'ghost']); rows.push(['MUSIC : ' + (s.music > 0 ? 'ON' : 'OFF'), () => this.toggleVolume(game, 'music'), 'ghost']);
    if (touch) rows.push(['VIBRATION : ' + vib[vv], () => { s.vibration = (vv + 1) % 4; if (CC.Haptics) { CC.Haptics.setLevel(s.vibration); CC.Haptics.tick('fire'); } game.applySettings(); }, 'ghost']);
    rows.push(['HOME', () => { if (endless) game.goHome({}); else game.toMenu(); }, 'secondary', 'home']);
    const cw = Math.min(W - 40 * k, 360 * k), x0 = W / 2 - cw / 2, rh = 54 * k, gap = 10 * k, y0 = top + 110 * k;
    rows.forEach(([lab, act, kind, ic], i) => DS.btn(this, ctx, x0, y0 + i * (rh + gap), cw, rh, { k, kind, label: lab, icon: ic, iconColor: kind === 'primary' ? '#fff' : T.cyanL, color: kind === 'ghost' ? T.text2 : T.white, size: rh * 0.38, shadow: false, key: 'pause' + lab, action: act }));
  };
})();

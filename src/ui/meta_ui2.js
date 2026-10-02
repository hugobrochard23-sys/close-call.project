/* v086 : GARAGE à 6 paliers de couleur (gris → vert → bleu → violet → orange → rouge, « PROMOUVOIR » au niveau 5), onglets verrouillés avec cadenas
 * (GARAGE niveau 2, PASS niveau 5, COFFRE DES ETOILES niveau 10), animation de DEBLOQUAGE + mini-guide, ouverture ANIMEE des caisses et coffres (secousse, éclat, cartes). */
(function () {
  const U = CC.U, F = CC.Font, Home = CC.Home, Meta = CC.Meta;
  const NAVY = '#1d232b', PANEL = '#262d36', DARK = '#14181d', EDGE = '#5a6674', STEEL = '#3b4652', CREAM = '#e8ecef', GOLD = '#d9a441', DIM = '#8995a1', GREEN = '#56d98b', CY = '#8fd0ff';
  const R = Math.round, now = () => performance.now() / 1000;
  const hit = (ui, x, y, w, h, action) => ui.buttons.push({ x, y, w, h, action });
  const inRect = (ui, x, y, w, h) => !ui.isTouch() && ui.mouse.x >= x && ui.mouse.x <= x + w && ui.mouse.y >= y && ui.mouse.y <= y + h;
  function txt(ctx, s, x, y, maxW, px, color, align) { s = String(s); const p = Math.min(px, maxW / Math.max(1, F.measure(s, 1))); F.draw(ctx, s, x, y, p, color, { align: align || 'left' }); return p; }
  const panel = (ctx, x, y, w, h, fill, edge, c) => Home.pill(ctx, x, y, w, h, fill || PANEL, edge || EDGE, c === undefined ? Math.min(h * 0.18, 14) : c);
  const greenBtn = (ctx, x, y, w, h, on) => { Home.button3d(ctx, x, y, w, h, '', '', '', 1); if (on) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(R(x + 2), R(y + 2), R(w - 4), R(h - 6)); } };
  const rnd = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const backdrop = (ctx, L) => { ctx.fillStyle = STEEL; ctx.fillRect(0, L.T, L.W, L.HH); };
  const bounce = (k) => { k = U.clamp(k, 0, 1); const n1 = 7.5625, d1 = 2.75; if (k < 1 / d1) return n1 * k * k; if (k < 2 / d1) return n1 * (k -= 1.5 / d1) * k + 0.75; if (k < 2.5 / d1) return n1 * (k -= 2.25 / d1) * k + 0.9375; return n1 * (k -= 2.625 / d1) * k + 0.984375; };
  const FEAT = { garage: { name: 'GARAGE', icon: 'wrench' }, pass: { name: 'PASS', icon: 'star' }, chest: { name: 'COFFRE DES ETOILES', icon: 'chest' } };

  // ============================================================================================================
  //   ONGLETS : GARAGE · PASS · BOUTIQUE (verrouillés tant que le niveau n'est pas atteint)
  // ============================================================================================================
  Home.drawTabs = function (ui, ctx, game, L, active) {
    const { W, HH, T, u } = L, meta = game.meta;
    const list = [{ id: 'garage', icon: 'wrench', label: 'GARAGE' }, { id: 'pass', icon: 'star', label: 'PASS' }, { id: 'shop', icon: 'shop', label: 'BOUTIQUE' }];
    const bh = HH * 0.085, bw = Math.min(W * 0.94, W * 0.31 * list.length), bx = (W - bw) / 2, by = T + HH - bh - HH * 0.03, cw = bw / list.length;
    panel(ctx, bx, by, bw, bh, NAVY, EDGE, bh * 0.14);
    const px = Math.min.apply(null, list.map((t) => Math.min(1.5, (cw * 0.92) / Math.max(1, F.measure(t.label, 1)))));
    list.forEach((t, i) => {
      const cx = bx + cw * (i + 0.5), on = active === t.id, open = t.id === 'shop' || !meta || meta.isOpen(t.id), hot = inRect(ui, bx + cw * i, by - bh * 0.5, cw, bh * 1.5);
      if (i) { ctx.fillStyle = EDGE; ctx.fillRect(R(bx + cw * i - 1), R(by + bh * 0.12), 2, R(bh * 0.76)); }
      if (on) { const lift = bh * 0.28; Home.stair(ctx, bx + cw * i + 3, by + 3, cw - 6, bh - 6, 3); ctx.strokeStyle = '#e0c690'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = 'rgba(90,102,116,0.35)'; ctx.fill(); }
      if (!open) ctx.globalAlpha = 0.3;
      Home.bigIcon(ctx, t.icon, cx, by + bh * 0.05 - (hot && open ? 3 : 0), bh * 0.95, t.icon === 'shop' && on ? { frame: Math.floor(performance.now() / 160) } : undefined);
      ctx.globalAlpha = 1;
      if (!open) Home.icon.lock(ctx, cx, by + bh * 0.08, bh * 0.34, '#d8dde2');
      F.draw(ctx, open ? t.label : 'NIVEAU ' + meta.unlockAt(t.id), cx, by + bh * 0.66, open ? px : Math.min(1.3, (cw * 0.92) / Math.max(1, F.measure('NIVEAU 00', 1))), open ? (on ? '#f0dcae' : CREAM) : GOLD, { align: 'center' });
      hit(ui, bx + cw * i, by - bh * 0.55, cw, bh * 1.55, () => {
        if (open) ui.overlay = on ? null : t.id;
        else { game.audio.play('uiLock'); Home.toast(ui, t.label + ' : DEBLOQUE AU NIVEAU ' + meta.unlockAt(t.id)); }
      });
    });
    return bh + HH * 0.03;
  };

  // ============================================================================================================
  //   GARAGE : quatre pièces, six paliers de couleur
  // ============================================================================================================
  const oldDrawModules = Home.drawModules;
  Home.drawGarage = function (ui, ctx, game, W, H) {
    if (ui.garagePage === 'mods') { Home.drawModules(ui, ctx, game, W, H); garageToggle(ui, ctx, game, W, H, true); return; }
    const L = Home.layout(ui, W, H), { T, HH, u } = L, m = u * 0.04, prog = game.progress, TI = CC.Progress.TIERS, t = now();
    backdrop(ctx, L); const top = Home.drawTop(ui, ctx, game, L, 'sub');
    const ty = top + HH * 0.018, th = HH * 0.062;
    panel(ctx, m, ty, W - 2 * m, th, NAVY, EDGE, th * 0.14); txt(ctx, 'GARAGE', W / 2, ty + th * 0.3, W * 0.36, 3, CREAM, 'center');
    // écrous (même icône que l'accueil)
    { const nl = U.formatInt(prog.P.materials || 0), nh = th * 0.62, nw = F.measure(nl, 1.6) + nh * 1.5, nx = W - m * 1.8, ny = ty + (th - nh) / 2;
      panel(ctx, nx - nw, ny, nw, nh, DARK, EDGE, nh * 0.3); Home.drawCoinIcon(ctx, nx - nw + nh * 0.6, ny + nh / 2, nh * 0.95); F.draw(ctx, nl, nx - nh * 0.3, ny + nh / 2 - 6, Math.min(1.6, (nw - nh * 1.2) / Math.max(1, F.measure(nl, 1))), GOLD, { align: 'right' }); }
    // vitrine
    const vy = ty + th + HH * 0.012, vh = HH * 0.115; panel(ctx, m, vy, W - 2 * m, vh, PANEL, EDGE, 10);
    Home.gridDraw(ctx, 'rocket', m + vh * 0.7, vy + vh * 0.5 + Math.sin(t * 2) * 2, vh * 0.8, '#e8ecef');
    let tot = 0; for (const up of CC.Progress.UPG) tot += prog.upLevel(up.id);
    txt(ctx, 'NIVEAU DE LA FUSEE', m + vh * 1.45, vy + vh * 0.18, W - 2 * m - vh * 1.6, 1.3, DIM);
    txt(ctx, tot + ' / ' + CC.Progress.UPG.length * 30, m + vh * 1.45, vy + vh * 0.42, W - 2 * m - vh * 1.6, 2.4, GOLD);
    txt(ctx, 'ECROUS : ACHETE DES AMELIORATIONS', m + vh * 1.45, vy + vh * 0.78, W - 2 * m - vh * 1.6, 1.1, CY);
    // cartes d'amélioration
    const rh = HH * 0.118, gap = HH * 0.008, ry = vy + vh + HH * 0.012;
    CC.Progress.UPG.forEach((up, i) => {
      const id = up.id, tier = prog.upTier(id), lv = prog.upLv(id), tcol = TI[tier].col, total = prog.upLevel(id), cost = prog.upCost(id), maxed = prog.isMaxed(id), promo = prog.needsPromote(id), can = prog.canBuy(id);
      const y = ry + i * (rh + gap), x = m, w = W - 2 * m, pulse = 0.5 + 0.5 * Math.sin(t * 6);
      panel(ctx, x, y, w, rh, NAVY, promo && can ? TI[Math.min(5, tier + 1)].col : tcol, 8);
      const ib = rh * 0.72, ix = x + rh * 0.1, iy = y + (rh - ib) / 2;
      panel(ctx, ix, iy, ib, ib, DARK, tcol, 6); Home.gridDraw(ctx, up.icon, ix + ib / 2, iy + ib / 2, ib * 0.62, tcol);
      const bw = w * 0.27, bx2 = x + w - bw - 8, x0 = ix + ib + 10, tw = bx2 - x0 - 6;
      txt(ctx, up.name, x0, y + rh * 0.1, tw * 0.62, 1.6, CREAM); txt(ctx, TI[tier].name, x0 + tw, y + rh * 0.12, tw * 0.36, 1.2, tcol, 'right');
      const sg = tw / 5; for (let k = 0; k < 5; k++) { const filled = k < lv || (promo && !maxed), col = promo && !maxed ? TI[Math.min(5, tier + 1)].col : tcol; ctx.fillStyle = '#2d343d'; ctx.fillRect(R(x0 + k * sg), R(y + rh * 0.4), R(sg - 4), R(rh * 0.14)); if (filled) { ctx.globalAlpha = promo ? 0.55 + 0.45 * pulse : 1; ctx.fillStyle = col; ctx.fillRect(R(x0 + k * sg), R(y + rh * 0.4), R(sg - 4), R(rh * 0.14)); ctx.globalAlpha = 1; } }
      const effTxt = maxed ? up.desc(total) + '  MAX' : promo ? 'PROMEUS LA PIECE : ' + TI[tier + 1].name : 'ACTUEL ' + up.desc(total).replace(/^[+-]?/, (a) => a);
      txt(ctx, effTxt, x0, y + rh * 0.62, tw, 1.0, promo && !maxed ? TI[Math.min(5, tier + 1)].col : '#bfc8d4');
      if (!maxed && !promo) txt(ctx, 'SUIVANT ' + up.desc(total + 1), x0, y + rh * 0.8, tw, 0.9, DIM);
      // bouton
      const bh = rh * 0.62, by = y + (rh - bh) / 2;
      if (maxed) { panel(ctx, bx2, by, bw, bh, DARK, tcol, 6); txt(ctx, 'MAX', bx2 + bw / 2, by + bh * 0.34, bw - 8, 1.6, tcol, 'center'); }
      else {
        const label = promo ? 'PROMOUVOIR' : 'AMELIORER', ncol = TI[Math.min(5, tier + 1)].col, on = inRect(ui, bx2, by, bw, bh);
        if (can) { if (promo) { Home.button3d(ctx, bx2, by, bw, bh, ncol, ncol, '#3a2a10', 1 + 0.04 * pulse); } else greenBtn(ctx, bx2, by, bw, bh, on); } else panel(ctx, bx2, by, bw, bh, DARK, EDGE, 6);
        txt(ctx, label, bx2 + bw / 2, by + bh * 0.14, bw - 8, 1.0, can ? '#14181d' : DIM, 'center');
        const cl = String(cost), cs = Math.min(1.5, (bw * 0.5) / Math.max(1, F.measure(cl, 1)));
        Home.drawCoinIcon(ctx, bx2 + bw * 0.22, by + bh * 0.68, bh * 0.5); F.draw(ctx, cl, bx2 + bw * 0.9, by + bh * 0.6 - 3, cs, can ? '#14181d' : DIM, { align: 'right' });
        hit(ui, bx2 - 4, y, bw + 12, rh, () => {
          const res = prog.buy(id);
          if (res === 'level') { game.audio.play('uiBuy'); if (CC.Haptics) CC.Haptics.pattern('mission'); }
          else if (res === 'promote') { game.audio.play('uiPromote'); if (CC.Haptics) CC.Haptics.pattern('levelUp'); ui.promoFx = { id, t0: now(), col: TI[prog.upTier(id)].col, name: TI[prog.upTier(id)].name }; }
          else { game.audio.play('uiLock'); Home.toast(ui, "PAS ASSEZ D'ECROUS"); }
        });
      }
      // animation de promotion : gerbe de pixels dans la couleur du nouveau palier
      const fx = ui.promoFx; if (fx && fx.id === id) {
        const k = (now() - fx.t0) / 1.3; if (k >= 1) ui.promoFx = null; else {
          const cx = ix + ib / 2, cy = iy + ib / 2, s = Math.max(3, R(rh * 0.07));
          ctx.fillStyle = fx.col; for (let n = 0; n < 28; n++) { const a = rnd(n, 1) * 6.283, d = k * rh * (0.6 + rnd(n, 2) * 1.6); ctx.globalAlpha = 1 - k; ctx.fillRect(R(cx + Math.cos(a) * d), R(cy + Math.sin(a) * d), s, s); } ctx.globalAlpha = 1;
          ctx.strokeStyle = fx.col; ctx.lineWidth = 3; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(cx, cy, k * rh * 1.1, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1;
          txt(ctx, 'PIECE ' + fx.name + ' !', x + w / 2, y - k * rh * 0.25, w * 0.6, 2, fx.col, 'center');
        }
      }
    });
    garageToggle(ui, ctx, game, W, H, false);
    Home.drawTabs(ui, ctx, game, L, 'garage'); Home.drawToast(ui, ctx, L);
  };
  function garageToggle(ui, ctx, game, W, H, mods) {
    const L = Home.layout(ui, W, H), { T, HH, u } = L, m = u * 0.04, top = T + HH * 0.1 + 2 + HH * 0.05 + HH * 0.018, th = HH * 0.062, bw = W * 0.24, bh = th * 0.7, bx = m * 1.6, by = top + (th - bh) / 2;
    panel(ctx, bx, by, bw, bh, mods ? '#3a3320' : '#2f4a3a', mods ? GOLD : GREEN, 6); txt(ctx, mods ? '< AMELIO.' : 'MODULES >', bx + bw / 2, by + bh * 0.3, bw - 8, 1.3, mods ? GOLD : GREEN, 'center');
    hit(ui, bx, by, bw, bh, () => { ui.garagePage = mods ? null : 'mods'; });
  }

  // ============================================================================================================
  //   DEBLOQUAGE : cadenas qui tremble puis éclate, fonction qui apparaît, mini-guide en 3 cartes
  // ============================================================================================================
  const GUIDE = {
    garage: [['GAGNE DES ECROUS', 'CHAQUE NIVEAU FINI ET CHAQUE CIBLE DETRUITE EN RAPPORTENT', 'coin'], ['AMELIORE TA FUSEE', 'ESSENCE, RENDEMENT, POINTS ET PRECISION : TOUCHE LE BOUTON AMELIORER', 'wrench'], ['PROMEUS LA PIECE', 'AU NIVEAU 5, PROMOUVOIR : GRIS, VERT, BLEU, VIOLET, ORANGE, ROUGE', 'bolt']],
    pass: [['LE PASS MONTE EN JOUANT', 'NIVEAUX FINIS, ETOILES ET QUOTIDIEN FONT GAGNER DE L XP', 'star'], ['PRENDS TES RECOMPENSES', 'CHAQUE PALIER DONNE ECROUS, CAISSES ET APPARENCES : TOUCHE PRENDRE', 'crate'], ['LE PREMIUM EN PLUS', 'UNE DEUXIEME PISTE DE RECOMPENSES POUR TOUT LE MOIS', 'trophy']],
    chest: [['REFAIS DES NIVEAUX', 'CHOISIS UN NIVEAU DEJA FINI POUR GAGNER PLUS D ETOILES', 'rocket'], ['3 ETOILES = 1 RECOMPENSE', 'LE COFFRE SE REMPLIT TOUT SEUL, TOUCHE PRENDRE QUAND IL EST PRET', 'star'], ['LA 5E EST UNE CAISSE', 'ELLE CONTIENT DES MODULES POUR TA FUSEE', 'crate']],
  };
  function stepIcon(ctx, name, cx, cy, s) { if (name === 'coin') Home.drawCoinIcon(ctx, cx, cy, s); else if (name === 'crate') Home.crateIcon(ctx, cx, cy, s * 0.8); else if (name === 'wrench') Home.bigIcon(ctx, 'wrench', cx, cy, s); else Home.gridDraw(ctx, name, cx, cy, s * 0.8, name === 'trophy' || name === 'star' ? '#ffd23a' : '#e8ecef'); }
  function wrap(s, maxChars) { const out = []; let line = ''; for (const w of s.split(' ')) { if ((line + ' ' + w).trim().length > maxChars) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; }
  Home.drawUnlock = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { u, Y } = L, q = ui.unlock; if (!q) { ui.overlay = null; return; }
    const t = now() - q.t0, f = FEAT[q.feat], cx = W / 2, cy = Y(0.27), r = u * 0.16;
    ui.dim(ctx, W, H, 0.9);
    if (t < 1.6) {   // le cadenas tremble de plus en plus fort
      const sh = Math.sin(t * 55) * Math.min(1, t / 1.1) * u * 0.014; Home.icon.lock(ctx, cx + sh, cy, r * 1.5, '#d8dde2');
      if (Math.floor(t * 9) !== q.lastTick) { q.lastTick = Math.floor(t * 9); game.audio.play('chestShake', null, Math.floor(t * 4)); }
    } else {
      const k = t - 1.6;
      if (!q.burst) { q.burst = true; game.audio.play('unlock'); if (CC.Haptics) CC.Haptics.pattern('levelUp'); }
      // rayons et onde de choc
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.6); const ra = Math.max(0, 0.34 - k * 0.1);
      for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI / 7); ctx.fillStyle = i % 2 ? 'rgba(255,210,58,' + ra + ')' : 'rgba(255,244,176,' + ra * 0.8 + ')'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, -W * 0.05); ctx.lineTo(W, W * 0.05); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,240,170,' + Math.max(0, 1 - k * 1.6) + ')'; ctx.lineWidth = u * 0.02; ctx.beginPath(); ctx.arc(cx, cy, k * u * 0.9, 0, 6.283); ctx.stroke();
      // les deux moitiés du cadenas s'écartent et s'effacent
      if (k < 0.7) { const d = k * u * 0.5, al = 1 - k / 0.7; ctx.globalAlpha = al; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, cy); ctx.clip(); ctx.translate(-d * 0.6, -d); ctx.rotate(-k * 1.4); Home.icon.lock(ctx, cx, cy, r * 1.5, '#d8dde2'); ctx.restore(); ctx.save(); ctx.beginPath(); ctx.rect(0, cy, W, H); ctx.clip(); ctx.translate(d * 0.6, d); ctx.rotate(k * 1.4); Home.icon.lock(ctx, cx, cy, r * 1.5, '#d8dde2'); ctx.restore(); ctx.globalAlpha = 1; }
      // la fonction apparaît en rebondissant
      const sc = bounce(k / 0.6), sz = r * 2.3 * sc;
      if (q.feat === 'chest') Home.drawChestIcon(ctx, cx, cy, sz * 1.2); else Home.bigIcon(ctx, f.icon, cx, cy, sz);
      for (let n = 0; n < 12; n++) { const a = rnd(n, 3) * 6.283, d = (0.2 + k) * u * (0.25 + rnd(n, 4) * 0.4), s = Math.max(3, R(u * 0.012)); ctx.globalAlpha = Math.max(0, 1 - k * 0.8); ctx.fillStyle = n % 2 ? '#ffd23a' : '#ffffff'; ctx.fillRect(R(cx + Math.cos(a) * d), R(cy + Math.sin(a) * d), s, s); ctx.globalAlpha = 1; }
      ctx.globalAlpha = U.clamp(k / 0.3, 0, 1); txt(ctx, f.name + ' DEBLOQUE !', cx, Y(0.46), W * 0.9, u * 0.0072, GOLD, 'center'); ctx.globalAlpha = 1;
      if (k < 0.18) { ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - k / 0.18)) + ')'; ctx.fillRect(0, L.T, W, L.HH); }
    }
    // mini-guide : trois cartes, une à la fois
    if (t > 2.5) {
      const steps = GUIDE[q.feat], s = steps[q.step], cw = W * 0.88, ch = L.HH * 0.27, x = (W - cw) / 2, y = Y(0.52);
      panel(ctx, x, y, cw, ch, NAVY, GOLD, 10);
      stepIcon(ctx, s[2], x + ch * 0.4, y + ch * 0.36, ch * 0.42);
      txt(ctx, (q.step + 1) + '/' + steps.length + '  ' + s[0], x + ch * 0.8, y + ch * 0.12, cw - ch * 0.9, 1.8, GOLD);
      wrap(s[1], 26).slice(0, 4).forEach((ln, i) => txt(ctx, ln, x + ch * 0.8, y + ch * 0.36 + i * ch * 0.14, cw - ch * 0.9, 1.15, CREAM));
      const last = q.step === steps.length - 1, bw = cw * 0.5, bh = L.HH * 0.075, bx = W / 2 - bw / 2, by = y + ch + L.HH * 0.02, on = inRect(ui, bx, by, bw, bh);
      greenBtn(ctx, bx, by, bw, bh, on); txt(ctx, last ? 'COMPRIS' : 'SUIVANT', bx + bw / 2, by + bh * 0.32, bw - 10, 1.8, DARK, 'center');
      hit(ui, bx, by, bw, bh, () => { if (!last) { q.step++; return; } game.meta.markSeen(q.feat); const ft = q.feat; ui.unlock = null; ui.overlay = ft === 'chest' ? 'map' : ft; });
      for (let i = 0; i < steps.length; i++) { ctx.fillStyle = i === q.step ? GOLD : '#3a424c'; ctx.fillRect(R(W / 2 - steps.length * 9 + i * 18), R(by + bh + 8), 10, 10); }
    }
    Home.drawToast(ui, ctx, L);
  };
  // l'accueil déclenche l'animation dès qu'une fonction vient d'être atteinte
  const prevHome = Home.drawHome;
  Home.drawHome = function (ui, ctx, game, W, H) {
    prevHome.apply(this, arguments);
    if (game.meta && !ui.overlay && !ui.reveal && game.state === 'MENU' && !game.testMode) { const f = game.meta.pendingUnlock(); if (f) { ui.unlock = { feat: f, t0: now(), step: 0 }; ui.overlay = 'unlock'; } }
  };

  // ============================================================================================================
  //   OUVERTURE ANIMEE : la caisse tombe, tremble de plus en plus fort, explose en lumière, puis les récompenses sortent en cartes
  // ============================================================================================================
  Home.reveal = function (ui, outs, box) {
    const arr = Array.isArray(outs) ? outs : [outs], items = [];
    for (const o of arr) {
      if (!o) continue;
      if (o.kind === 'crate') for (const g of o.got) items.push({ k: 'mod', id: g.id, lvl: g.lvl, up: g.up }); else if (o.kind === 'mod') items.push({ k: 'mod', id: o.id, lvl: o.lvl, up: o.up });
      else if (o.kind === 'nuts') items.push({ k: 'nuts', n: o.n }); else if (o.kind === 'skin') items.push({ k: 'skin', text: o.text });
    }
    if (!items.length) return;
    const crate = arr.some((o) => o && (o.kind === 'crate' || o.kind === 'mod'));
    ui.reveal = { t0: now(), items, box: box || (crate ? 'crate' : 'chest'), snd: {} };
  };
  Home.revealClick = function (ui) { const q = ui.reveal; if (!q) return; const t = now() - q.t0; if (t > 1.7 + q.items.length * 0.28 + 0.4) ui.reveal = null; else q.t0 -= 0.6; };   // un toucher accélère, puis ferme
  Home.drawReveal = function (ui, ctx, game, W, H) {
    const q = ui.reveal; if (!q) return; const L = Home.layout(ui, W, H), { u, Y } = L, t = now() - q.t0, cx = W / 2, by = Y(0.4), w = u * 0.5;
    ui.dim(ctx, W, H, 0.88);
    const OPEN = 1.5;
    if (t < OPEN) {   // chute puis secousse
      const drop = t < 0.45 ? (1 - bounce(t / 0.45)) * -u * 0.7 : 0, amp = t > 0.55 ? ((t - 0.55) / (OPEN - 0.55)) * u * 0.03 : 0, sx = Math.sin(t * 58) * amp;
      if (t > 0.55 && Math.floor(t * 11) !== q.lastTick) { q.lastTick = Math.floor(t * 11); game.audio.play('chestShake', null, Math.floor((t - 0.55) * 8)); if (CC.Haptics && q.lastTick % 2 === 0) CC.Haptics.tick('touch'); }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(R(cx - w * 0.5), R(by + 2), R(w), R(u * 0.02));
      if (q.box === 'crate') Home.crateIcon(ctx, cx + sx, by - w * 0.35 + drop, w * 0.8); else Home.drawChestAt(ctx, cx + sx, by + drop, w, 0);
      if (t > OPEN - 0.25) { ctx.fillStyle = 'rgba(255,255,255,' + (t - (OPEN - 0.25)) * 3 + ')'; ctx.beginPath(); ctx.arc(cx, by - w * 0.3, w * 0.9 * (t - (OPEN - 0.25)) * 4, 0, 6.283); ctx.fill(); }
    } else {
      const k = t - OPEN;
      if (!q.burst) { q.burst = true; game.audio.play('chestOpen'); if (CC.Haptics) CC.Haptics.pattern('levelUp'); }
      // rayons rotatifs, onde de choc, éclat
      ctx.save(); ctx.translate(cx, by - w * 0.3); ctx.rotate(t * 0.5); const ra = Math.max(0.12, 0.4 - k * 0.12);
      for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? 'rgba(255,210,58,' + ra + ')' : 'rgba(255,244,176,' + ra * 0.8 + ')'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, -W * 0.045); ctx.lineTo(W, W * 0.045); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,240,170,' + Math.max(0, 1 - k * 1.4) + ')'; ctx.lineWidth = u * 0.025; ctx.beginPath(); ctx.arc(cx, by - w * 0.3, k * u * 1.0, 0, 6.283); ctx.stroke();
      if (q.box === 'crate') { const d = Math.min(1, k * 3); ctx.save(); ctx.beginPath(); ctx.rect(0, by - w * 0.35, W, H); ctx.clip(); Home.crateIcon(ctx, cx, by - w * 0.35, w * 0.8); ctx.restore(); ctx.globalAlpha = 1 - d; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, by - w * 0.35); ctx.clip(); ctx.translate(0, -d * w * 0.9); ctx.rotate(d * 0.5); Home.crateIcon(ctx, cx, by - w * 0.35, w * 0.8); ctx.restore(); ctx.globalAlpha = 1; }
      else Home.drawChestAt(ctx, cx, by, w, 2);
      for (let n = 0; n < 40; n++) { const a = rnd(n, 5) * 6.283, sp = 0.35 + rnd(n, 6) * 0.9, d = k * u * sp, g = k * k * u * 0.5, s = Math.max(3, R(u * 0.014)); ctx.globalAlpha = Math.max(0, 1 - k * 0.55); ctx.fillStyle = n % 3 ? '#ffd23a' : '#ffffff'; ctx.fillRect(R(cx + Math.cos(a) * d), R(by - w * 0.3 + Math.sin(a) * d * 0.8 + g), s, s); } ctx.globalAlpha = 1;
      if (k < 0.2) { ctx.fillStyle = 'rgba(255,255,255,' + 0.75 * (1 - k / 0.2) + ')'; ctx.fillRect(0, L.T, W, L.HH); }
      // les récompenses sortent en cartes
      const n = q.items.length, per = Math.min(3, n), cw = Math.min(W * 0.28, (W * 0.92) / per - 8), ch = cw * 1.15, rows = Math.ceil(n / per), y0 = Y(0.58);
      q.items.forEach((it, i) => {
        const ta = (k - 0.25 - i * 0.28) / 0.35; if (ta <= 0) return;
        if (!q.snd[i]) { q.snd[i] = 1; game.audio.play('card', null, i); }
        const sc = bounce(ta), row = Math.floor(i / per), inRow = Math.min(per, n - row * per), col = i - row * per, x = W / 2 - (inRow * (cw + 8) - 8) / 2 + col * (cw + 8), y = y0 + row * (ch + 8), cs = ctx;
        cs.save(); cs.translate(x + cw / 2, y + ch / 2); cs.scale(sc, sc); cs.translate(-(x + cw / 2), -(y + ch / 2));
        const md = it.k === 'mod' ? Meta.MODS[it.id] : null, edge = it.k === 'mod' ? Meta.RAR[md.rar] : GOLD;
        panel(ctx, x, y, cw, ch, NAVY, edge, 8);
        if (it.k === 'nuts') { Home.drawCoinIcon(ctx, x + cw / 2, y + ch * 0.38, cw * 0.55); txt(ctx, '+' + it.n, x + cw / 2, y + ch * 0.74, cw - 10, 2, GOLD, 'center'); }
        else if (it.k === 'mod') { Home.modIcon(ctx, it.id, x + cw / 2, y + ch * 0.36, cw * 0.5); txt(ctx, md.name, x + cw / 2, y + ch * 0.64, cw - 8, 1.3, CREAM, 'center'); txt(ctx, it.up ? (it.lvl > 1 ? 'NIV ' + it.lvl + ' !' : 'NOUVEAU !') : '+1 COPIE', x + cw / 2, y + ch * 0.8, cw - 8, 1.1, it.up ? '#6aff9a' : DIM, 'center'); }
        else { Home.gridDraw(ctx, 'rocket', x + cw / 2, y + ch * 0.4, cw * 0.6, '#e8ecef'); txt(ctx, it.text || 'APPARENCE', x + cw / 2, y + ch * 0.76, cw - 8, 1.1, CREAM, 'center'); }
        cs.restore();
      });
      if (k > 0.25 + n * 0.28 + 0.4 && Math.floor(t * 2.5) % 2 === 0) txt(ctx, 'TOUCHE POUR CONTINUER', cx, Y(0.93), W * 0.9, 1.6, CREAM, 'center');
    }
  };
})();

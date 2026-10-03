/* v092 : HANGAR — la boutique devient un carrousel façon Subway Surfers : la fusée tourne en 3D, flèches gauche / droite pour changer de modèle,
 * un seul gros bouton (prix en écrous / équiper), une pub pour gagner des écrous, et le prix en euros en petit. Aperçu 3D = un second
 * rendu WebGL hors écran (CC.Hangar.preview), réutilisé par l'écran du pass. */
(function () {
  const U = CC.U, F = CC.Font, Home = CC.Home;
  const NAVY = '#1d232b', PANEL = '#262d36', DARK = '#14181d', EDGE = '#5a6674', STEEL = '#3b4652', CREAM = '#e8ecef', GOLD = '#d9a441', DIM = '#8995a1';
  const TCOL = { base: '#9aa4ae', common: '#e8ecef', rare: '#6ab8ff', ultra: '#ffb02a' };
  const R = Math.round;
  const AD_COINS = 150;
  const hit = (ui, x, y, w, h, action) => ui.buttons.push({ x, y, w, h, action });
  const inRect = (ui, x, y, w, h) => !ui.isTouch() && ui.mouse.x >= x && ui.mouse.x <= x + w && ui.mouse.y >= y && ui.mouse.y <= y + h;
  function txt(ctx, s, x, y, maxW, px, color, align) { s = String(s); const p = Math.min(px, maxW / Math.max(1, F.measure(s, 1))); F.draw(ctx, s, x, y, p, color, { align: align || 'left' }); return p; }
  const panel = (ctx, x, y, w, h, fill, edge, c) => Home.pill(ctx, x, y, w, h, fill || PANEL, edge || EDGE, c === undefined ? Math.min(h * 0.18, 14) : c);

  // ---------- aperçu 3D ----------
  const Hg = CC.Hangar = { models: {}, r: null, ok: true };
  Hg.init = function () {
    if (Hg.r || !Hg.ok) return !!Hg.r;
    try {
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1); r.setSize(512, 384, false); r.setClearColor(0x000000, 0);
      const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 512 / 384, 0.1, 50);
      cam.position.set(0, 0.3, 4.6); cam.lookAt(0, 0, 0);
      sc.add(new THREE.HemisphereLight(0xdfeaff, 0x40342a, 0.95));
      const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3, 4, 5); sc.add(key);
      const rim = new THREE.DirectionalLight(0x88aaff, 0.7); rim.position.set(-4, 1, -3); sc.add(rim);
      Hg.r = r; Hg.sc = sc; Hg.cam = cam; Hg.holder = new THREE.Group(); sc.add(Hg.holder);
    } catch (e) { Hg.ok = false; return false; }
    return true;
  };
  Hg.model = function (id) {
    if (Hg.models[id]) return Hg.models[id];
    const g = CC.Models.rocket(CC.Skins.get(id)), box = new THREE.Box3().setFromObject(g), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const k = 2.7 / Math.max(sz.x, sz.y, sz.z, 0.1), w = new THREE.Group(); g.position.sub(c); w.add(g); w.scale.setScalar(k);
    return (Hg.models[id] = w);
  };
  // dessine la fusée `id` dans le rectangle (x, y, w, h) ; renvoie faux si le rendu 3D est indisponible
  Hg.preview = function (ctx, id, x, y, w, h, t, spin) {
    if (!Hg.init()) return false;
    try {
      const m = Hg.model(id);
      Hg.holder.clear(); Hg.holder.add(m);
      Hg.holder.rotation.set(-0.22, (spin === undefined ? t * 0.8 : spin) + 1.0, 0.0, 'YXZ');
      Hg.r.render(Hg.sc, Hg.cam);
      const a = 512 / 384, dw = Math.min(w, h * a), dh = dw / a;
      ctx.imageSmoothingEnabled = true; ctx.drawImage(Hg.r.domElement, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      return true;
    } catch (e) { Hg.ok = false; return false; }
  };

  // ---------- carrousel ----------
  CC.Shop.prototype.draw = function (ctx, game, W, H) {
    const ui = this.ui, L = Home.layout(ui, W, H), { T, HH, u } = L, m = u * 0.04, prog = game.progress, t = performance.now() / 1000;
    const list = CC.Skins.showcase || CC.Skins.list;
    if (this.idx === undefined) this.idx = Math.max(0, list.findIndex((s) => s.id === game.save.equipped));
    this.idx = (this.idx + list.length) % list.length;
    const s = list[this.idx], owned = !!game.save.owned[s.id], eq = game.save.equipped === s.id, tc = TCOL[s.tier] || CREAM, mats = prog.P.materials || 0;
    ctx.fillStyle = STEEL; ctx.fillRect(0, T, W, HH);
    const top = Home.drawTop(ui, ctx, game, L, 'sub');
    // nom + rareté + solde
    const ty = top + HH * 0.014, th = HH * 0.075; panel(ctx, m, ty, W - 2 * m, th, NAVY, EDGE, th * 0.14);
    txt(ctx, s.name, m + (W - 2 * m) * 0.04, ty + th * 0.2, (W - 2 * m) * 0.5, 2.6, CREAM); txt(ctx, s.tierLabel || 'STOCK', m + (W - 2 * m) * 0.04, ty + th * 0.66, (W - 2 * m) * 0.4, 1.3, tc);
    { const nl = U.formatInt(mats), nh = th * 0.62, nw = F.measure(nl, 1.7) + nh * 2.3, nx = W - m * 1.8, ny = ty + (th - nh) / 2;
      panel(ctx, nx - nw, ny, nw, nh, DARK, EDGE, nh * 0.3); Home.drawCoinIcon(ctx, nx - nw + nh * 0.6, ny + nh / 2, nh * 0.95); F.draw(ctx, nl, nx - nh * 0.3, ny + nh / 2 - 6, Math.min(1.7, (nw - nh * 1.2) / Math.max(1, F.measure(nl, 1))), GOLD, { align: 'right' }); }
    // vitrine : projecteur coloré + fusée 3D qui tourne
    const vy = ty + th + HH * 0.012, vh = HH * 0.4, vw = W - 2 * m; panel(ctx, m, vy, vw, vh, '#10151b', tc, 12);
    const g = ctx.createRadialGradient(W / 2, vy + vh * 0.55, 4, W / 2, vy + vh * 0.55, vw * 0.55); g.addColorStop(0, tc + '55'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(m + 4, vy + 4, vw - 8, vh - 8);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(W / 2, vy + vh * 0.86, vw * 0.26, vh * 0.045, 0, 0, 6.283); ctx.fill();   // ombre au sol
    if (!Hg.preview(ctx, s.id, m + vw * 0.1, vy + vh * 0.05, vw * 0.8, vh * 0.85, t)) { CC.Shop.icon(ctx, s, W / 2, vy + vh / 2, vh * 0.5); }
    if (!owned) { Home.icon.lock(ctx, m + vw * 0.9, vy + vh * 0.12, vh * 0.06, '#d8dde2'); }
    // flèches gauche / droite
    for (const dir of [-1, 1]) {
      const bw = vw * 0.15, bh = vh * 0.34, bx = dir < 0 ? m + 6 : m + vw - bw - 6, by = vy + (vh - bh) / 2, on = inRect(ui, bx, by, bw, bh);
      panel(ctx, bx, by, bw, bh, on ? '#323b46' : 'rgba(29,35,43,0.85)', tc, 10);
      const q = Math.max(3, R(bh * 0.07)), cx = bx + bw / 2, cy = by + bh / 2; ctx.fillStyle = tc;
      ctx.beginPath(); ctx.moveTo(cx - dir * q * 1.8, cy - q * 3); ctx.lineTo(cx + dir * q * 2.2, cy); ctx.lineTo(cx - dir * q * 1.8, cy + q * 3); ctx.closePath(); ctx.fill();
      hit(ui, bx - 6, by - 16, bw + 12, bh + 32, () => { this.idx += dir; game.audio.play('uiTick'); });
    }
    // position dans la vitrine
    txt(ctx, (this.idx + 1) + ' / ' + list.length, W / 2, vy + vh - HH * 0.034, vw * 0.3, 1.3, DIM, 'center');
    // gros bouton : équipée / équiper / prix en écrous
    const by1 = vy + vh + HH * 0.016, bh1 = HH * 0.085, bw1 = W - 2 * m;
    if (eq) { panel(ctx, m, by1, bw1, bh1, DARK, tc, 12); txt(ctx, 'EQUIPEE', W / 2, by1 + bh1 * 0.34, bw1 * 0.6, 2.4, tc, 'center'); Home.icon.check(ctx, m + bw1 * 0.2, by1 + bh1 / 2, bh1 * 0.2, tc); }
    else if (owned) { Home.button3d(ctx, m, by1, bw1, bh1, '', '', '', 1); txt(ctx, 'EQUIPER', W / 2, by1 + bh1 * 0.34, bw1 * 0.6, 2.4, '#14181d', 'center'); hit(ui, m, by1, bw1, bh1, () => { game.equipCosmetic(s.id); game.audio.play('uiBuy'); }); }
    else {
      const can = mats >= s.coins;
      if (can) Home.button3d(ctx, m, by1, bw1, bh1, '', '', '', 1 + 0.02 * Math.sin(t * 6)); else panel(ctx, m, by1, bw1, bh1, NAVY, EDGE, 12);
      const cl = U.formatInt(s.coins), cs = Math.min(2.8, (bw1 * 0.4) / Math.max(1, F.measure(cl, 1))), tw = F.measure(cl, cs) + bh1 * 0.8, x0 = W / 2 - tw / 2;
      Home.drawCoinIcon(ctx, x0 + bh1 * 0.3, by1 + bh1 / 2, bh1 * 0.62); F.draw(ctx, cl, x0 + bh1 * 0.75, by1 + bh1 * 0.5 - cs * 3.5, cs, can ? '#14181d' : DIM, {});
      hit(ui, m, by1, bw1, bh1, () => {
        if (prog.P.materials >= s.coins) { prog.P.materials -= s.coins; game.unlockCosmetic(s.id); game.audio.play('uiPromote'); if (CC.Haptics) CC.Haptics.pattern('levelUp'); if (Home.reveal) Home.reveal(ui, [{ kind: 'skin', text: s.name }]); }
        else { game.audio.play('uiLock'); Home.toast(ui, 'IL TE MANQUE ' + U.formatInt(s.coins - mats) + ' ECROUS'); }
      });
    }
    // pub → écrous ; prix en euros (petit)
    const by2 = by1 + bh1 + HH * 0.012, bh2 = HH * 0.065, adOk = game.ads && game.ads.enabled && game.ads.enabled() && !game.testMode;
    const half = (bw1 - 8) / 2;
    if (adOk) {
      panel(ctx, m, by2, owned ? bw1 : half, bh2, 'rgba(38,45,54,0.97)', GOLD, bh2 * 0.25);
      const ax = m + (owned ? bw1 : half) / 2; Home.icon.play(ctx, ax - half * 0.42, by2 + bh2 / 2, bh2 * 0.2, GOLD);
      txt(ctx, '+' + AD_COINS, ax + half * 0.02, by2 + bh2 * 0.32, half * 0.36, 1.9, GOLD, 'center'); Home.drawCoinIcon(ctx, ax + half * 0.36, by2 + bh2 / 2, bh2 * 0.6);
      hit(ui, m, by2, owned ? bw1 : half, bh2, () => game.ads.rewarded(() => { prog.P.materials = (prog.P.materials || 0) + AD_COINS; game.writeSave(); game.audio.play('uiBuy'); Home.toast(ui, '+' + AD_COINS + ' ECROUS'); }, 15, 'coins'));
    }
    if (!owned) {
      const ex = adOk ? m + half + 8 : m, ew = adOk ? half : bw1;
      panel(ctx, ex, by2, ew, bh2, 'rgba(38,45,54,0.97)', EDGE, bh2 * 0.25); txt(ctx, CC.Skins.formatPrice(s.price), ex + ew / 2, by2 + bh2 * 0.32, ew * 0.8, 1.7, CREAM, 'center');
      hit(ui, ex, by2, ew, bh2, () => this.buy(game, s.id));
    }
    if (this.flash) txt(ctx, this.flash, W / 2, by2 + bh2 + HH * 0.012, W * 0.92, 1, GOLD, 'center');
    Home.drawTabs(ui, ctx, game, L, 'shop'); if (Home.drawToast) Home.drawToast(ui, ctx, L);
  };
})();

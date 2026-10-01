/* v050 : DESIGN SYSTEM « PREMIUM ARCADE » de COLD IMPACT (canvas 2D).
 * Direction : arcade 3D moderne (60 %) · UI futuriste premium (25 %) · industriel / expédition (15 %).
 * Marine profond + cyan (information, progression, sélection) + orange / or (action principale, récompense), rouge réservé au danger.
 * Tout passe par des JETONS (CC.DS.T : couleurs, rayons, durées) et des COMPOSANTS (panneau, boutons, barres, badges, navigation, icônes vectorielles)
 * dessinés avec la même grammaire : coins arrondis, liseré clair, reflet haut, ombre douce, relief léger. Aucun pixel art, aucune 3D dans l'interface.
 * Les tailles sont exprimées en « px de conception » (écran de 390 px de large) puis multipliées par k = u / 390 : l'interface est proportionnelle.
 * Police : Rajdhani (assets/fonts, licence OFL) — géométrique, légèrement condensée, chiffres très lisibles. */
(function () {
  const U = CC.U;
  const T = {
    bgDeep: '#06111D', dark: '#0A1D2E', blue: '#0878C9', cyan: '#18C8FF', cyanL: '#7BE8FF', orange: '#FF9D18', gold: '#FFC52B', warn: '#FF7043', danger: '#F04444',
    white: '#F5FAFF', text2: '#AFC5D8', muted: '#66839A', green: '#55D98B',
    panelTop: 'rgba(10,34,56,0.9)', panelBot: 'rgba(4,15,27,0.92)', border: 'rgba(65,200,255,0.45)', borderSoft: 'rgba(65,200,255,0.22)',
    radius: 16, radiusL: 20, family: 'Rajdhani, "Exo 2", "Segoe UI", Arial, sans-serif',
    dur: { press: 140, panel: 300, reward: 500, count: 600 },
  };
  const DS = { T, press: {}, kOf: (L) => Math.max(0.6, L.u / 390) };
  CC.DS = DS;

  // ---------- chargement de la police ----------
  DS.loadFonts = function () { try { for (const w of [500, 700]) document.fonts.load(w + ' 20px Rajdhani'); } catch (e) { /* repli sur la police système */ } };

  // ---------- texte ----------
  // opts : align, base ('alphabetic' | 'middle'), weight (500|700), italic, shadow ('#hex'), stroke ('#hex'), alpha, ls (espacement, px)
  DS.text = function (ctx, s, x, y, size, color, o) {
    o = o || {}; s = String(s);
    ctx.save();
    ctx.font = (o.italic ? 'italic ' : '') + (o.weight || 700) + ' ' + Math.max(6, size).toFixed(1) + 'px ' + T.family;
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle'; ctx.lineJoin = 'round';
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.ls && 'letterSpacing' in ctx) ctx.letterSpacing = o.ls + 'px';
    if (o.stroke) { ctx.lineWidth = Math.max(2, size * 0.14); ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
    if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(s, x, y + Math.max(1.5, size * 0.07)); }
    ctx.fillStyle = color; ctx.fillText(s, x, y);
    ctx.restore();
  };
  DS.measure = function (ctx, s, size, o) { o = o || {}; ctx.save(); ctx.font = (o.italic ? 'italic ' : '') + (o.weight || 700) + ' ' + size.toFixed(1) + 'px ' + T.family; const w = ctx.measureText(String(s)).width; ctx.restore(); return w; };
  // plus grande taille ≤ size pour que le texte tienne dans maxW
  DS.fit = function (ctx, s, size, maxW, o) { const w = DS.measure(ctx, s, size, o); return w > maxW ? size * maxW / w : size; };

  // ---------- formes ----------
  const rr = DS.rr = function (ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, h / 2, w / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  // couleur CSS (#hex ou rgba) -> rgba avec un autre alpha
  const withA = (c, a) => { if (c[0] === '#') { const n = parseInt(c.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; } return c.replace(/rgba?\(([^)]+)\)/, (m, p) => { const q = p.split(','); return 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',' + a + ')'; }); };
  DS.withA = withA;
  // contour éclairé : plus lumineux en haut qu'en bas (le seul effet de lumière des panneaux et boutons)
  const edge = (ctx, y, h, c, top, bot) => { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, withA(c, top)); g.addColorStop(1, withA(c, bot)); return g; };
  DS.edge = edge;
  const lg = (ctx, y0, y1, stops) => { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  DS.lg = lg;

  // ---------- PANNEAU (verre sombre léger, liseré cyan, reflet, ombre douce) ----------
  // o : r, shadow (false pour le HUD : aucun flou), glow, border, fill ('flat' pour un aplat), accent (couleur du liseré), alpha
  DS.panel = function (ctx, x, y, w, h, o) {
    o = o || {}; const k = o.k || 1, r = o.r !== undefined ? o.r : T.radius * k;
    ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.38)'; ctx.shadowBlur = 16 * k; ctx.shadowOffsetY = 6 * k; }
    rr(ctx, x, y, w, h, r); ctx.fillStyle = 'rgba(5,20,34,0.9)'; ctx.fill();   // aplat : aucune ombre en haut
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if (o.glow) { rr(ctx, x, y, w, h, r); ctx.strokeStyle = withA(o.accent || T.cyan, 0.3); ctx.lineWidth = 5 * k; ctx.stroke(); }
    rr(ctx, x + 0.75 * k, y + 0.75 * k, w - 1.5 * k, h - 1.5 * k, r); ctx.strokeStyle = edge(ctx, y, h, o.border || o.accent || T.cyan, 0.95, 0.22); ctx.lineWidth = 1.7 * k; ctx.stroke();
    ctx.restore();
  };

  // ---------- BOUTONS ----------
  const KIND = {
    primary: { top: '#FFC85A', mid: '#FF9D18', bot: '#E7700A', rim: 'rgba(255,255,255,0.28)', lip: '#A84A00', text: '#FFFFFF', shade: 'rgba(125,45,0,0.7)' },
    gold: { top: '#FFE27A', mid: '#FFC52B', bot: '#E0A010', rim: 'rgba(255,255,255,0.3)', lip: '#8A6000', text: '#FFFFFF', shade: 'rgba(110,70,0,0.7)' },
    danger: { top: '#FF7A6A', mid: '#F04444', bot: '#C32626', rim: 'rgba(255,255,255,0.25)', lip: '#7A1414', text: '#FFFFFF', shade: 'rgba(90,10,10,0.7)' },
    success: { top: '#8CF0B4', mid: '#55D98B', bot: '#30A864', rim: 'rgba(255,255,255,0.28)', lip: '#176038', text: '#FFFFFF', shade: 'rgba(8,70,35,0.7)' },
  };
  // pressed : 0..1 (enfoncé), disabled
  DS.button = function (ctx, x, y, w, h, o) {
    o = o || {}; const k = o.k || 1, kind = o.kind || 'primary', P = Math.max(0, Math.min(1, o.pressed || 0)), r = Math.min(h * 0.3, T.radiusL * k);
    ctx.save();
    const sc = 1 - 0.04 * P, cx = x + w / 2, cy = y + h / 2 + 2.5 * k * P; ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -(y + h / 2));
    if (o.disabled) ctx.globalAlpha = 0.45;
    if (kind === 'secondary' || kind === 'ghost') {
      DS.panel(ctx, x, y, w, h, { k, r, accent: o.accent || T.cyan, glow: kind === 'secondary' && o.glow, shadow: o.shadow !== false });
      if (o.hot) { rr(ctx, x, y, w, h, r); ctx.fillStyle = 'rgba(24,200,255,0.12)'; ctx.fill(); }
    } else {
      const C = KIND[kind] || KIND.primary, lip = 5 * k * (1 - 0.6 * P);
      if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.42)'; ctx.shadowBlur = 14 * k; ctx.shadowOffsetY = 6 * k * (1 - 0.5 * P); }
      rr(ctx, x, y + lip, w, h - lip * 0.2, r); ctx.fillStyle = C.lip; ctx.fill();                                   // lèvre sombre (relief)
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      rr(ctx, x, y, w, h - lip, r); ctx.fillStyle = C.mid; ctx.fill();   // aplat
      if (o.glow) { rr(ctx, x - 1, y - 1, w + 2, h - lip + 2, r + 1); ctx.strokeStyle = withA(C.mid, 0.35); ctx.lineWidth = 6 * k; ctx.stroke(); }
      rr(ctx, x + 1 * k, y + 1 * k, w - 2 * k, h - lip - 2 * k, r); ctx.strokeStyle = edge(ctx, y, h - lip, '#FFFFFF', 0.85, 0.12); ctx.lineWidth = 2 * k; ctx.stroke();   // contour plus éclairé en haut
      o._text = C;
    }
    ctx.restore();
  };
  // bouton complet : fond + icône + libellé (+ sous-libellé) + zone de toucher ; retourne true si survolé
  DS.btn = function (ui, ctx, x, y, w, h, o) {
    const k = o.k || 1, key = o.key || (o.label + x.toFixed(0) + y.toFixed(0)), now = performance.now(), t = DS.press[key] ? now - DS.press[key] : 1e9, P = t < T.dur.press ? 1 - t / T.dur.press : 0;
    const hot = !ui.isTouch() && ui.mouse.x >= x && ui.mouse.x <= x + w && ui.mouse.y >= y && ui.mouse.y <= y + h;
    let pulse = 1; if (o.breathe) pulse = 1 + 0.015 * Math.sin(now / 1000 * Math.PI * 2 / 2);
    ctx.save(); if (pulse !== 1) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(pulse, pulse); ctx.translate(-(x + w / 2), -(y + h / 2)); }
    DS.button(ctx, x, y, w, h, Object.assign({}, o, { pressed: P, hot, disabled: o.disabled }));
    const kind = o.kind || 'primary', C = KIND[kind], big = o.size || h * 0.42, lbl = o.label ? String(o.label).toUpperCase() : '';
    const col = C ? C.text : (o.color || T.white), icoS = o.iconSize || h * 0.5, gap = 10 * k;
    const tw = lbl ? DS.measure(ctx, lbl, big, { weight: 700 }) : 0, iw = o.icon ? icoS : 0, tot = tw + iw + (tw && iw ? gap : 0), cy = y + (h - (C ? 5 * k : 0)) / 2 - (o.sub ? h * 0.1 : 0);
    let cx = x + w / 2 - tot / 2;
    if (o.disabled) ctx.globalAlpha = 0.5;
    if (o.icon) { DS.icon(ctx, o.icon, cx + iw / 2, cy, icoS, o.iconColor || (C ? '#FFFFFF' : T.cyanL), { shadow: !!C }); cx += iw + gap; }
    if (lbl) DS.text(ctx, lbl, cx, cy + 1 * k, big, col, { weight: 700, shadow: C ? C.shade : undefined, stroke: C ? C.shade : undefined, ls: 1 });
    if (o.sub) DS.text(ctx, o.sub, x + w / 2, y + h * 0.78, h * 0.2, C ? 'rgba(255,255,255,0.85)' : T.text2, { align: 'center', weight: 500, ls: 1.5 });
    ctx.restore();
    if (!o.disabled && o.action) ui.buttons.push({ x, y, w, h, action: () => { DS.press[key] = performance.now(); o.action(); } });
    return hot;
  };
  DS.iconButton = function (ui, ctx, cx, cy, d, icon, action, o) {
    o = o || {}; const k = o.k || 1, key = o.key || icon + cx.toFixed(0) + cy.toFixed(0), t = DS.press[key] ? performance.now() - DS.press[key] : 1e9, P = t < T.dur.press ? 1 - t / T.dur.press : 0, r = d / 2;
    const hot = !ui.isTouch() && Math.hypot(ui.mouse.x - cx, ui.mouse.y - cy) <= r;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1 - 0.06 * P, 1 - 0.06 * P); ctx.translate(-cx, -cy);
    if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.38)'; ctx.shadowBlur = 10 * k; ctx.shadowOffsetY = 4 * k; }
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fillStyle = 'rgba(5,20,34,0.92)'; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.beginPath(); ctx.arc(cx, cy, r - 0.8 * k, 0, 6.2832); ctx.strokeStyle = edge(ctx, cy - r, 2 * r, hot ? T.cyanL : (o.accent || T.cyan), 0.95, 0.22); ctx.lineWidth = 1.8 * k; ctx.stroke();
    DS.icon(ctx, icon, cx, cy, d * 0.52, o.color || T.cyanL);
    ctx.restore();
    if (action) ui.buttons.push({ x: cx - Math.max(r, 22 * k), y: cy - Math.max(r, 22 * k), w: Math.max(d, 44 * k), h: Math.max(d, 44 * k), action: () => { DS.press[key] = performance.now(); action(); } });
  };

  // ---------- BARRES ----------
  // o : c1, c2 (dégradé), bg, glow, ticks, blink
  DS.bar = function (ctx, x, y, w, h, kf, o) {
    o = o || {}; const k = o.k || 1, f = Math.max(0, Math.min(1, kf)), r = h / 2;
    rr(ctx, x, y, w, h, r); ctx.fillStyle = o.bg || 'rgba(2,10,18,0.7)'; ctx.fill();
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1 * k; ctx.stroke();
    const fw = Math.max(f > 0 ? h : 0, f * w);
    if (f > 0) {
      ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
      rr(ctx, x, y, fw, h, r); ctx.fillStyle = lg(ctx, y, y + h, [[0, o.c1 || T.cyanL], [1, o.c2 || T.blue]]); ctx.fill();
      if (o.glow) { ctx.shadowColor = o.c1 || T.cyan; ctx.shadowBlur = 8 * k; rr(ctx, x, y, fw, h, r); ctx.strokeStyle = (o.c1 || T.cyan) + '99'; ctx.lineWidth = 1.2 * k; ctx.stroke(); }
      ctx.restore();
    }
    if (o.ticks) { ctx.fillStyle = 'rgba(2,10,18,0.55)'; for (let i = 1; i < o.ticks; i++) ctx.fillRect(x + w * i / o.ticks - 0.75 * k, y, 1.5 * k, h); }
  };
  // jauge de carburant : cyan > 40 %, orange 40–20 %, rouge-orange < 20 % (clignote)
  DS.fuelColors = function (kf, now) {
    if (kf > 0.4) return { c1: T.cyanL, c2: T.blue };
    if (kf > 0.2) return { c1: '#FFC070', c2: T.orange };
    const b = Math.floor((now || performance.now()) / 220) % 2 === 0; return { c1: b ? '#FFB090' : '#FF7043', c2: T.danger };
  };

  // ---------- BADGES ----------
  DS.avatar = function (ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    rr(ctx, 0, 0, s, s, s * 0.24); ctx.fillStyle = lg(ctx, 0, s, [[0, '#3C7FC0'], [1, '#143A66']]); ctx.fill();
    ctx.save(); rr(ctx, 0, 0, s, s, s * 0.24); ctx.clip();
    ctx.fillStyle = '#E2A47E'; ctx.beginPath(); ctx.ellipse(s * 0.5, s * 0.56, s * 0.27, s * 0.3, 0, 0, 6.2832); ctx.fill();                       // visage
    ctx.fillStyle = '#C9825C'; ctx.beginPath(); ctx.ellipse(s * 0.5, s * 0.64, s * 0.2, s * 0.14, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#2A1A14'; ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.5); ctx.quadraticCurveTo(s * 0.2, s * 0.14, s * 0.52, s * 0.14); ctx.quadraticCurveTo(s * 0.84, s * 0.14, s * 0.8, s * 0.5); ctx.quadraticCurveTo(s * 0.7, s * 0.3, s * 0.5, s * 0.34); ctx.quadraticCurveTo(s * 0.32, s * 0.32, s * 0.2, s * 0.5); ctx.fill();   // cheveux
    ctx.fillStyle = '#FF9D18'; ctx.beginPath(); ctx.moveTo(s * 0.18, s * 0.34); ctx.quadraticCurveTo(s * 0.5, s * 0.02, s * 0.84, s * 0.34); ctx.lineTo(s * 0.8, s * 0.4); ctx.quadraticCurveTo(s * 0.5, s * 0.2, s * 0.2, s * 0.4); ctx.closePath(); ctx.fill();   // casquette
    ctx.fillStyle = '#FFFFFF'; for (const ex of [0.4, 0.6]) { ctx.beginPath(); ctx.ellipse(s * ex, s * 0.56, s * 0.065, s * 0.075, 0, 0, 6.2832); ctx.fill(); }
    ctx.fillStyle = '#16202C'; for (const ex of [0.41, 0.61]) { ctx.beginPath(); ctx.arc(s * ex, s * 0.57, s * 0.035, 0, 6.2832); ctx.fill(); }
    ctx.strokeStyle = '#9C5A40'; ctx.lineWidth = Math.max(1.2, s * 0.025); ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(s * 0.5, s * 0.66, s * 0.07, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
    rr(ctx, 0.75, 0.75, s - 1.5, s - 1.5, s * 0.24); ctx.strokeStyle = T.border; ctx.lineWidth = Math.max(1.5, s * 0.035); ctx.stroke();
    ctx.restore();
  };
  // pastille de monnaie : pièce + nombre + bouton « + »
  DS.currency = function (ui, ctx, xr, y, h, value, k, action) {
    const n = U.formatInt(value), fs = h * 0.5, nw = DS.measure(ctx, n, fs), plus = action ? h * 0.78 : 0, w = h * 1.15 + nw + (plus ? plus + h * 0.2 : h * 0.35), x = xr - w;
    DS.panel(ctx, x, y, w, h, { k, r: h / 2, shadow: false, fill: 'flat' });
    DS.icon(ctx, 'coin', x + h * 0.55, y + h / 2, h * 0.7, T.gold);
    DS.text(ctx, n, x + h * 1.05, y + h / 2 + 1 * k, fs, T.white, { weight: 700 });
    if (plus) { const px = x + w - plus / 2 - h * 0.12; ctx.beginPath(); ctx.arc(px, y + h / 2, plus / 2, 0, 6.2832); ctx.fillStyle = lg(ctx, y, y + h, [[0, T.cyanL], [1, T.blue]]); ctx.fill(); DS.icon(ctx, 'plus', px, y + h / 2, plus * 0.55, '#FFFFFF'); if (action) ui.buttons.push({ x: px - plus, y: y - 4, w: plus * 2, h: h + 8, action }); }
    return w;
  };
  // badge de niveau « LV 25 » + barre d'XP
  DS.level = function (ctx, x, y, w, h, level, kf, k) {
    DS.panel(ctx, x, y, w, h, { k, r: h * 0.28, shadow: false, fill: 'flat' });
    DS.text(ctx, 'LV ' + level, x + w * 0.5, y + h * 0.36, h * 0.38, T.white, { align: 'center', weight: 700 });
    DS.bar(ctx, x + w * 0.1, y + h * 0.66, w * 0.8, h * 0.16, kf, { k, c1: T.cyanL, c2: T.blue });
  };

  // ---------- NAVIGATION DU BAS ----------
  // items : [{id, icon, label, badge}] ; active : id ; retourne la hauteur occupée
  DS.nav = function (ui, ctx, L, items, active, onSelect) {
    const { W, HH, T: top } = L, k = DS.kOf(L), h = 74 * k, m = 10 * k, w = Math.min(W - 2 * m, 480 * k), x = (W - w) / 2, y = top + HH - h - m;
    DS.panel(ctx, x, y, w, h, { k, r: 20 * k, shadow: true });
    const cw = w / items.length;
    items.forEach((it, i) => {
      const cx = x + cw * (i + 0.5), on = it.id === active, now = performance.now(), key = 'nav' + it.id, t = DS.press[key] ? now - DS.press[key] : 1e9, P = t < T.dur.press ? 1 - t / T.dur.press : 0;
      if (on) { rr(ctx, x + cw * i + 5 * k, y + 5 * k, cw - 10 * k, h - 10 * k, 15 * k); ctx.fillStyle = 'rgba(24,200,255,0.16)'; ctx.fill(); rr(ctx, x + cw * i + 5 * k, y + 5 * k, cw - 10 * k, h - 10 * k, 15 * k); ctx.strokeStyle = 'rgba(123,232,255,0.7)'; ctx.lineWidth = 1.5 * k; ctx.stroke(); }
      ctx.save(); ctx.translate(cx, y + h * 0.42); ctx.scale(1 - 0.08 * P, 1 - 0.08 * P); ctx.translate(-cx, -(y + h * 0.42));
      if (on) { ctx.shadowColor = T.cyan; ctx.shadowBlur = 10 * k; }
      DS.icon(ctx, it.icon, cx, y + h * 0.42, h * 0.4, on ? T.cyanL : T.text2);
      ctx.restore();
      DS.text(ctx, it.label, cx, y + h * 0.82, h * 0.2, on ? T.cyanL : T.text2, { align: 'center', weight: 700, ls: 0.8 });
      if (it.badge) { ctx.beginPath(); ctx.arc(cx + h * 0.28, y + h * 0.2, 8 * k, 0, 6.2832); ctx.fillStyle = T.danger; ctx.fill(); DS.text(ctx, String(it.badge), cx + h * 0.28, y + h * 0.2 + 0.5, 10 * k, '#fff', { align: 'center' }); }
      ui.buttons.push({ x: x + cw * i, y: y - 6 * k, w: cw, h: h + 12 * k, action: () => { DS.press[key] = now; onSelect(it.id); } });
    });
    return h + m * 2;
  };

  // ---------- LOGO ----------
  DS.logo = function (ctx, cx, cy, size) {
    ctx.save();
    const sk = -0.22;
    for (const [word, dy, col1, col2, glow] of [['COLD', 0, '#FFFFFF', '#9FE6FF', '#18C8FF'], ['IMPACT', 0.86, '#FFE27A', '#FF8A10', '#FF9D18']]) {
      ctx.save(); ctx.translate(cx, cy + dy * size); ctx.transform(1, 0, sk, 1, 0, 0);
      const fs = size * (word === 'COLD' ? 0.95 : 1.12); ctx.font = 'italic 700 ' + fs + 'px ' + T.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      if ('letterSpacing' in ctx) ctx.letterSpacing = (size * 0.03) + 'px';
      ctx.shadowColor = glow; ctx.shadowBlur = size * 0.3; ctx.fillStyle = glow; ctx.fillText(word, 0, 0); ctx.shadowBlur = 0;
      ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#0A2540'; ctx.strokeText(word, 0, 0);
      const g = ctx.createLinearGradient(0, -fs * 0.4, 0, fs * 0.4); g.addColorStop(0, col1); g.addColorStop(1, col2); ctx.fillStyle = g; ctx.fillText(word, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------- FUSEE VECTORIELLE (garage, boutique, cartes) ----------
  DS.rocket = function (ctx, cx, cy, len, angle, o) {
    o = o || {}; const L = len, R = L * 0.15;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle === undefined ? -0.35 : angle);
    const body = o.body || ['#FFD46A', '#FFAA1E', '#D77A08'], nose = o.nose || ['#FF6A5A', '#E02A2A'];
    if (o.flame !== false) { const f = ctx.createLinearGradient(-L * 0.62, 0, -L * 0.3, 0); f.addColorStop(0, 'rgba(24,200,255,0)'); f.addColorStop(0.5, 'rgba(24,200,255,0.8)'); f.addColorStop(1, '#FFFFFF'); ctx.fillStyle = f; ctx.beginPath(); ctx.moveTo(-L * 0.3, -R * 0.55); ctx.quadraticCurveTo(-L * 0.62, 0, -L * 0.3, R * 0.55); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = lg(ctx, -R * 2.2, R * 2.2, [[0, '#6B3A08'], [1, '#2A1604']]); ctx.beginPath(); ctx.moveTo(-L * 0.28, -R * 0.4); ctx.lineTo(-L * 0.45, -R * 2.2); ctx.lineTo(-L * 0.16, -R * 1.2); ctx.lineTo(-L * 0.12, -R * 0.4); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-L * 0.28, R * 0.4); ctx.lineTo(-L * 0.45, R * 2.2); ctx.lineTo(-L * 0.16, R * 1.2); ctx.lineTo(-L * 0.12, R * 0.4); ctx.closePath(); ctx.fill();   // ailerons
    ctx.fillStyle = lg(ctx, -R, R, [[0, body[0]], [0.5, body[1]], [1, body[2]]]); rr(ctx, -L * 0.32, -R, L * 0.64, R * 2, R * 0.9); ctx.fill();   // corps
    for (const bx of [-0.12, 0.14]) { ctx.fillStyle = '#1B1B1F'; ctx.fillRect(L * bx, -R, L * 0.045, R * 2); ctx.fillStyle = '#6E6E78'; ctx.fillRect(L * bx, -R, L * 0.012, R * 2); }   // bandes noires
    ctx.fillStyle = lg(ctx, -R, R, [[0, nose[0]], [1, nose[1]]]); ctx.beginPath(); ctx.moveTo(L * 0.3, -R); ctx.quadraticCurveTo(L * 0.52, -R * 0.4, L * 0.58, 0); ctx.quadraticCurveTo(L * 0.52, R * 0.4, L * 0.3, R); ctx.closePath(); ctx.fill();   // nez
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, -L * 0.3, -R * 0.86, L * 0.58, R * 0.34, R * 0.17); ctx.fill();   // reflet
    ctx.fillStyle = '#6E6E78'; ctx.fillRect(-L * 0.34, -R * 0.55, L * 0.05, R * 1.1);   // tuyère
    ctx.restore();
  };

  // ---------- ICONES VECTORIELLES (même famille : formes simples, arrondies, épaisseur homogène) ----------
  const I = {};
  const stroke = (ctx, s, c) => { ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.5, s * 0.1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
  I.play = (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.42); c.lineTo(s * 0.46, 0); c.lineTo(-s * 0.3, s * 0.42); c.closePath(); stroke(c, s, col); c.lineWidth = s * 0.14; c.fill(); c.stroke(); };
  I.pause = (c, s, col) => { c.fillStyle = col; rr(c, -s * 0.32, -s * 0.38, s * 0.22, s * 0.76, s * 0.07); c.fill(); rr(c, s * 0.1, -s * 0.38, s * 0.22, s * 0.76, s * 0.07); c.fill(); };
  I.bolt = (c, s, col) => { c.fillStyle = col; stroke(c, s, col); c.lineWidth = s * 0.08; c.beginPath(); c.moveTo(s * 0.12, -s * 0.5); c.lineTo(-s * 0.3, s * 0.06); c.lineTo(-s * 0.02, s * 0.06); c.lineTo(-s * 0.12, s * 0.5); c.lineTo(s * 0.3, -s * 0.08); c.lineTo(s * 0.02, -s * 0.08); c.closePath(); c.fill(); c.stroke(); };
  I.fuel = (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, -s * 0.5); c.bezierCurveTo(s * 0.5, -s * 0.05, s * 0.4, s * 0.5, 0, s * 0.5); c.bezierCurveTo(-s * 0.4, s * 0.5, -s * 0.5, -s * 0.05, 0, -s * 0.5); c.fill(); c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(-s * 0.13, s * 0.14, s * 0.07, s * 0.16, 0.3, 0, 6.2832); c.fill(); };
  I.flame = (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(s * 0.04, -s * 0.5); c.bezierCurveTo(s * 0.5, -s * 0.1, s * 0.42, s * 0.5, 0, s * 0.5); c.bezierCurveTo(-s * 0.46, s * 0.5, -s * 0.46, s * 0.04, -s * 0.12, -s * 0.2); c.bezierCurveTo(-s * 0.1, -s * 0.05, s * 0.0, -s * 0.05, s * 0.04, -s * 0.5); c.fill(); c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(0, s * 0.22, s * 0.12, s * 0.2, 0, 0, 6.2832); c.fill(); };
  I.trophy = (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.42); c.lineTo(s * 0.3, -s * 0.42); c.lineTo(s * 0.26, -s * 0.05); c.quadraticCurveTo(s * 0.2, s * 0.2, 0, s * 0.22); c.quadraticCurveTo(-s * 0.2, s * 0.2, -s * 0.26, -s * 0.05); c.closePath(); c.fill(); stroke(c, s, col); c.lineWidth = s * 0.08; c.beginPath(); c.arc(-s * 0.32, -s * 0.2, s * 0.14, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(s * 0.32, -s * 0.2, s * 0.14, -Math.PI * 0.5, Math.PI * 0.5); c.stroke(); c.fillRect(-s * 0.05, s * 0.2, s * 0.1, s * 0.14); rr(c, -s * 0.2, s * 0.32, s * 0.4, s * 0.12, s * 0.04); c.fill(); };
  I.gear = (c, s, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, w1 = Math.PI / 16, w2 = Math.PI / 11; for (const [ang, rad] of [[a - w2, 0.36], [a - w1, 0.5], [a + w1, 0.5], [a + w2, 0.36]]) c.lineTo(Math.cos(ang) * rad * s, Math.sin(ang) * rad * s); } c.closePath(); c.moveTo(s * 0.17, 0); c.arc(0, 0, s * 0.17, 0, 6.2832, true); c.fill('evenodd'); };
  I.lock = (c, s, col) => { c.fillStyle = col; rr(c, -s * 0.34, -s * 0.06, s * 0.68, s * 0.5, s * 0.1); c.fill(); stroke(c, s, col); c.lineWidth = s * 0.11; c.beginPath(); c.arc(0, -s * 0.1, s * 0.22, Math.PI, 0); c.stroke(); c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.arc(0, s * 0.18, s * 0.06, 0, 6.2832); c.fill(); };
  I.wrench = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.17; c.beginPath(); c.moveTo(-s * 0.4, s * 0.4); c.lineTo(s * 0.06, -s * 0.06); c.stroke(); c.lineWidth = s * 0.15; c.beginPath(); c.arc(s * 0.2, -s * 0.2, s * 0.2, -Math.PI / 4 + 0.65, -Math.PI / 4 + 6.2832 - 0.65); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(-s * 0.4, s * 0.4, s * 0.1, 0, 6.2832); c.fill(); };
  I.globe = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.09; c.beginPath(); c.arc(0, 0, s * 0.4, 0, 6.2832); c.stroke(); c.beginPath(); c.ellipse(0, 0, s * 0.17, s * 0.4, 0, 0, 6.2832); c.stroke(); c.beginPath(); c.moveTo(-s * 0.4, 0); c.lineTo(s * 0.4, 0); c.stroke(); c.beginPath(); c.moveTo(-s * 0.32, -s * 0.2); c.quadraticCurveTo(0, -s * 0.13, s * 0.32, -s * 0.2); c.moveTo(-s * 0.32, s * 0.2); c.quadraticCurveTo(0, s * 0.13, s * 0.32, s * 0.2); c.stroke(); };
  I.shop = (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(-s * 0.36, -s * 0.18); c.lineTo(s * 0.36, -s * 0.18); c.lineTo(s * 0.31, s * 0.42); c.quadraticCurveTo(s * 0.3, s * 0.46, s * 0.26, s * 0.46); c.lineTo(-s * 0.26, s * 0.46); c.quadraticCurveTo(-s * 0.3, s * 0.46, -s * 0.31, s * 0.42); c.closePath(); c.fill(); stroke(c, s, col); c.lineWidth = s * 0.09; c.beginPath(); c.arc(0, -s * 0.18, s * 0.19, Math.PI, 0); c.stroke(); };
  I.upgrade = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.14; c.beginPath(); c.moveTo(0, s * 0.4); c.lineTo(0, -s * 0.34); c.moveTo(-s * 0.3, -s * 0.06); c.lineTo(0, -s * 0.36); c.lineTo(s * 0.3, -s * 0.06); c.stroke(); };
  I.home = (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, -s * 0.44); c.lineTo(s * 0.46, 0); c.lineTo(s * 0.34, 0); c.lineTo(s * 0.34, s * 0.4); c.lineTo(-s * 0.34, s * 0.4); c.lineTo(-s * 0.34, 0); c.lineTo(-s * 0.46, 0); c.closePath(); c.moveTo(-s * 0.09, s * 0.12); c.lineTo(-s * 0.09, s * 0.4); c.lineTo(s * 0.09, s * 0.4); c.lineTo(s * 0.09, s * 0.12); c.closePath(); c.fill('evenodd'); };
  I.speed = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.13; for (const dx of [-0.18, 0.1]) { c.beginPath(); c.moveTo(s * dx - s * 0.12, -s * 0.34); c.lineTo(s * dx + s * 0.14, 0); c.lineTo(s * dx - s * 0.12, s * 0.34); c.stroke(); } };
  I.armor = (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, -s * 0.48); c.lineTo(s * 0.38, -s * 0.34); c.lineTo(s * 0.36, s * 0.06); c.quadraticCurveTo(s * 0.3, s * 0.34, 0, s * 0.5); c.quadraticCurveTo(-s * 0.3, s * 0.34, -s * 0.36, s * 0.06); c.lineTo(-s * 0.38, -s * 0.34); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.moveTo(0, -s * 0.34); c.lineTo(s * 0.24, -s * 0.24); c.lineTo(s * 0.22, s * 0.04); c.quadraticCurveTo(s * 0.18, s * 0.22, 0, s * 0.34); c.closePath(); c.fill(); };
  I.mission = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.09; c.beginPath(); c.arc(0, 0, s * 0.4, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(0, 0, s * 0.22, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(0, 0, s * 0.06, 0, 6.2832); c.fillStyle = col; c.fill(); c.beginPath(); c.moveTo(0, -s * 0.5); c.lineTo(0, -s * 0.3); c.moveTo(0, s * 0.3); c.lineTo(0, s * 0.5); c.moveTo(-s * 0.5, 0); c.lineTo(-s * 0.3, 0); c.moveTo(s * 0.3, 0); c.lineTo(s * 0.5, 0); c.stroke(); };
  I.star = (c, s, col) => { c.fillStyle = col; stroke(c, s, col); c.lineWidth = s * 0.08; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.2 : 0.46; c.lineTo(Math.cos(a) * r * s, Math.sin(a) * r * s); } c.closePath(); c.fill(); c.stroke(); };
  I.coin = (c, s, col) => { const g = c.createLinearGradient(0, -s * 0.5, 0, s * 0.5); g.addColorStop(0, '#FFE27A'); g.addColorStop(1, '#E0A010'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, s * 0.46, 0, 6.2832); c.fill(); c.strokeStyle = '#A8730A'; c.lineWidth = s * 0.07; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = s * 0.05; c.beginPath(); c.arc(0, 0, s * 0.3, Math.PI * 1.1, Math.PI * 1.75); c.stroke(); c.fillStyle = '#B9810F'; c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c.lineTo(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2); } c.closePath(); c.fill(); c.fillStyle = '#FFE9A0'; c.beginPath(); c.arc(0, 0, s * 0.08, 0, 6.2832); c.fill(); };
  I.plus = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.22; c.beginPath(); c.moveTo(-s * 0.3, 0); c.lineTo(s * 0.3, 0); c.moveTo(0, -s * 0.3); c.lineTo(0, s * 0.3); c.stroke(); };
  I.check = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.16; c.beginPath(); c.moveTo(-s * 0.34, 0); c.lineTo(-s * 0.08, s * 0.28); c.lineTo(s * 0.36, -s * 0.26); c.stroke(); };
  I.close = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.16; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.3); c.lineTo(s * 0.3, s * 0.3); c.moveTo(s * 0.3, -s * 0.3); c.lineTo(-s * 0.3, s * 0.3); c.stroke(); };
  I.back = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.16; c.beginPath(); c.moveTo(s * 0.18, -s * 0.34); c.lineTo(-s * 0.2, 0); c.lineTo(s * 0.18, s * 0.34); c.stroke(); };
  I.retry = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.14; c.beginPath(); c.arc(0, 0, s * 0.34, -Math.PI * 0.35, Math.PI * 1.55); c.stroke(); c.fillStyle = col; c.beginPath(); c.moveTo(s * 0.18, -s * 0.46); c.lineTo(s * 0.46, -s * 0.2); c.lineTo(s * 0.1, -s * 0.12); c.closePath(); c.fill(); };
  I.ad = (c, s, col) => { stroke(c, s, col); c.lineWidth = s * 0.09; rr(c, -s * 0.42, -s * 0.3, s * 0.84, s * 0.6, s * 0.12); c.stroke(); c.fillStyle = col; c.beginPath(); c.moveTo(-s * 0.08, -s * 0.14); c.lineTo(s * 0.16, 0); c.lineTo(-s * 0.08, s * 0.14); c.closePath(); c.fill(); };
  I.rocket = (c, s, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(s * 0.5, 0); c.quadraticCurveTo(s * 0.3, -s * 0.2, -s * 0.2, -s * 0.2); c.lineTo(-s * 0.4, -s * 0.4); c.lineTo(-s * 0.36, 0); c.lineTo(-s * 0.4, s * 0.4); c.lineTo(-s * 0.2, s * 0.2); c.quadraticCurveTo(s * 0.3, s * 0.2, s * 0.5, 0); c.closePath(); c.fill(); };
  I.target = I.mission;
  I.settings = I.gear; I.events = I.star; I.garage = I.wrench; I.world = I.globe;
  // DS.icon(ctx, nom, cx, cy, taille, couleur, {shadow})
  DS.icon = function (ctx, name, cx, cy, size, color, o) {
    const f = I[name]; if (!f) return; o = o || {};
    ctx.save(); ctx.translate(cx, cy);
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = size * 0.12; ctx.shadowOffsetY = size * 0.06; }
    f(ctx, size, color || '#FFFFFF'); ctx.restore();
  };
  DS.icons = I;
})();

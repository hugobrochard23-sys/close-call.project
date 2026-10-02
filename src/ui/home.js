/* v034 : INTERFACE MOBILE du mode CLASSIQUE — accueil sur le lanceur, missions, progression, réglages, offre de « continuer »,
 * écran de récompenses. Tout est dessiné dans le canvas du HUD avec la police pixel du jeu, en plein écran (portrait comme
 * paysage), boutons ≥ 44 points.
 *
 * Hiérarchie de l'accueil (par ordre d'importance) :
 *   1. la roquette sur son rail (la scène 3D ; un anneau qui pulse et un doigt qui touche montrent où appuyer) — un toucher lance ;
 *   2. la progression : niveau + barre d'XP en haut à gauche ;
 *   3. la mission la plus avancée, en bas ;
 *   4. quatre petites icônes rondes (missions, progression, défis, boutique) et l'engrenage des réglages.
 * Aucun bouton « JOUER » : la roquette est le bouton. */
(function () {
  const U = CC.U, F = CC.Font;
  const C = () => CC.CONFIG.hud.colors;
  // v039 : palette réduite en habillage pixel — blanc, jaune (seul accent), orange (essence), rouge (danger), bleu nuit (fonds)
  const PXL = (new URLSearchParams(location.search).get('skin') || CC.CONFIG.hud.skin || 'pixel') === 'pixel';
  const CY = PXL ? '#e8ecef' : '#39d4ff', GOLD = PXL ? '#d9a441' : '#d9a441', GREEN = PXL ? '#d9a441' : '#56ff5a', RED = PXL ? '#d0473e' : '#ff3b2e', ORANGE = PXL ? '#d9a441' : '#ff7c1f', MAG = PXL ? '#e8ecef' : '#ff5be0', INK = '#14181d';   // palette « nuit + jaune »

  const Home = {};

  // ---------- mise en page commune ----------
  // T : haut du canvas plein écran dans le repère de l'UI, HH : hauteur pleine ; u : unité de taille (largeur en portrait)
  Home.layout = function (ui, W, H) {
    const T = -(ui.offsetY || 0), HH = ui.fullH || H, P = HH > W, u = P ? W : Math.min(W, HH * 0.62);
    return { W, HH, T, P, u, Y: (f) => T + HH * f };
  };
  const text = (ui, ctx, s, x, y, px, color, o) => F.draw(ctx, s, x, y, px, color, o || {});
  const tw = (s, px) => F.measure(s, px);

  // ---------- formes arrondies « jeu mobile » : pastilles, boutons 3D, jauges ----------
  // v038j : deux habillages — 'pixel' (par défaut : coins en escalier, aplats, police 5×7, icônes pixelisées) et 'glass' (?skin=glass : verre arrondi)
  const SKIN = (new URLSearchParams(location.search).get('skin') || CC.CONFIG.hud.skin || 'pixel');
  const PIX = SKIN === 'pixel';
  if (PIX) { CC.Font.skinPixel = true; const mark = () => document.body && document.body.classList.add('cc-skin-pixel'); if (document.body) mark(); else document.addEventListener('DOMContentLoaded', mark); }
  // forme à coins en escalier (deux marches) : c = taille d'une marche
  function stair(ctx, x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    c = Math.max(1, Math.min(Math.round(c), Math.floor(Math.min(w, h) / 4)));
    ctx.beginPath(); ctx.moveTo(x + 2 * c, y); ctx.lineTo(x + w - 2 * c, y); ctx.lineTo(x + w - 2 * c, y + c); ctx.lineTo(x + w - c, y + c); ctx.lineTo(x + w - c, y + 2 * c); ctx.lineTo(x + w, y + 2 * c);
    ctx.lineTo(x + w, y + h - 2 * c); ctx.lineTo(x + w - c, y + h - 2 * c); ctx.lineTo(x + w - c, y + h - c); ctx.lineTo(x + w - 2 * c, y + h - c); ctx.lineTo(x + w - 2 * c, y + h);
    ctx.lineTo(x + 2 * c, y + h); ctx.lineTo(x + 2 * c, y + h - c); ctx.lineTo(x + c, y + h - c); ctx.lineTo(x + c, y + h - 2 * c); ctx.lineTo(x, y + h - 2 * c);
    ctx.lineTo(x, y + 2 * c); ctx.lineTo(x + c, y + 2 * c); ctx.lineTo(x + c, y + c); ctx.lineTo(x + 2 * c, y + c); ctx.closePath();
  }
  function rr(ctx, x, y, w, h, r) { if (PIX) stair(ctx, x, y, w, h, Math.min(r, h / 2, w / 2) / 3.2); else roundRR(ctx, x, y, w, h, r); }
  function roundRR(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  /* v038i — STYLE « VERRE & ARCADE ». Choix (voir analysis/REFONTE_MOBILE.md) : pixel = daté et illisible en petit ; 100 % « bonbon » (Subway Surfers) =
   * trop criard sur les nuits néon et les fonds marins ; 100 % futuriste (traits fins) = perd en lisibilité sur une scène 3D chargée et en tactilité.
   * On garde donc : des capsules de verre sombre (lisibles sur tout fond), un CONTOUR SOMBRE extérieur + un liseré clair intérieur (le contour détache
   * l'élément d'un décor éblouissant), une ombre portée nette (sans flou : peu coûteux, redessiné à chaque image), un reflet sur la moitié haute ;
   * des boutons principaux épais et brillants avec une lèvre (on les « presse ») ; des pictogrammes pleins en dégradé, contour sombre ; un seul accent
   * froid (cyan) pour l'interface, l'or pour la monnaie, le vert pour valider, le rouge pour l'alerte. */
  const EDGE = PIX ? 'rgba(0,0,0,0)' : 'rgba(4,8,16,0.95)';   // v038k : en pixel, plus aucun contour noir
  const hexMix = (hex, to, t) => { const a = U.hexToRgb(hex), b = U.hexToRgb(to); return '#' + [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, '0')).join(''); };
  const lighter = (c, t) => hexMix(c, '#ffffff', t === undefined ? 0.45 : t), darker = (c, t) => hexMix(c, '#000000', t === undefined ? 0.4 : t);
  function drop(ctx, x, y, w, h, r, d, a) { rr(ctx, x, y + d, w, h, r); ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fill(); }
  // pastille : verre sombre, contour extérieur, liseré intérieur (couleur d'accent), reflet haut
  function glassPill(ctx, x, y, w, h, fill, stroke, r) {
    r = r === undefined ? h / 2 : r;
    const lw = Math.max(1.5, h * 0.045);
    drop(ctx, x, y, w, h, r, h * 0.07, 0.3);
    rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0.2)'); g.addColorStop(0.48, 'rgba(255,255,255,0.04)'); g.addColorStop(1, 'rgba(0,0,0,0.16)');
    rr(ctx, x, y, w, h, r); ctx.fillStyle = g; ctx.fill();
    rr(ctx, x - lw * 0.5, y - lw * 0.5, w + lw, h + lw, r + lw * 0.5); ctx.strokeStyle = EDGE; ctx.lineWidth = lw; ctx.stroke();
    if (stroke) { rr(ctx, x + lw * 0.7, y + lw * 0.7, w - lw * 1.4, h - lw * 1.4, Math.max(0, r - lw * 0.7)); ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, lw * 0.8); ctx.stroke(); }
  }
  // ancien nom conservé : rectangle arrondi (le paramètre `n` ne sert plus)
  function pxRect(ctx, x, y, w, h, fill, stroke, n, lw) { pill(ctx, x, y, w, h, fill || 'rgba(0,0,0,0)', stroke, Math.min(h * 0.26, 22)); }
  // bouton principal 3D : contour sombre, lèvre dessous, dégradé, grand reflet, liseré clair
  function glassButton3d(ctx, x, y, w, h, c1, c2, lip, pulse) {
    const r = h * 0.3, d = h * 0.1, hh = h - d, lw = Math.max(2, h * 0.04);
    ctx.save(); if (pulse && pulse !== 1) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(pulse, pulse); ctx.translate(-(x + w / 2), -(y + h / 2)); }
    drop(ctx, x, y + d * 0.6, w, hh, r, d * 0.9, 0.3);
    rr(ctx, x - lw, y - lw, w + 2 * lw, h + 2 * lw, r + lw); ctx.fillStyle = EDGE; ctx.fill();
    rr(ctx, x, y + d, w, hh, r); ctx.fillStyle = lip; ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, c1); g.addColorStop(1, c2);
    rr(ctx, x, y, w, hh, r); ctx.fillStyle = g; ctx.fill();
    const gl = ctx.createLinearGradient(0, y, 0, y + hh * 0.55); gl.addColorStop(0, 'rgba(255,255,255,0.6)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    rr(ctx, x + w * 0.025, y + hh * 0.06, w * 0.95, hh * 0.46, r * 0.8); ctx.fillStyle = gl; ctx.fill();
    rr(ctx, x + lw * 0.6, y + lw * 0.6, w - lw * 1.2, hh - lw * 1.2, Math.max(0, r - lw * 0.6)); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = Math.max(1.2, lw * 0.6); ctx.stroke();
    ctx.restore();
  }
  // jauge arrondie : rail sombre contouré, remplissage en dégradé avec reflet
  function glassMeter(ctx, x, y, w, h, k, c1, c2) {
    const lw = Math.max(1.5, h * 0.12);
    rr(ctx, x - lw, y - lw, w + 2 * lw, h + 2 * lw, h); ctx.fillStyle = EDGE; ctx.fill();
    rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(14,22,38,0.95)'; ctx.fill();
    const f = Math.max(0, Math.min(1, k)) * w;
    if (f > 1) {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, lighter(c1, 0.35)); g.addColorStop(0.5, c1); g.addColorStop(1, c2);
      rr(ctx, x, y, Math.max(f, h), h, h / 2); ctx.fillStyle = g; ctx.fill();
      rr(ctx, x + h * 0.18, y + h * 0.12, Math.max(f, h) - h * 0.36, h * 0.3, h * 0.15); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
    }
  }
  // badge de niveau : carré arrondi doré contouré avec le numéro
  function glassBadge(ctx, x, y, size, level, ui) {
    const lw = Math.max(2, size * 0.04);
    drop(ctx, x, y, size, size, size * 0.26, size * 0.06, 0.32);
    rr(ctx, x - lw, y - lw, size + 2 * lw, size + 2 * lw, size * 0.26 + lw); ctx.fillStyle = EDGE; ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + size); g.addColorStop(0, '#fff07a'); g.addColorStop(0.55, '#ffbe1a'); g.addColorStop(1, '#e07a00');
    rr(ctx, x, y, size, size, size * 0.26); ctx.fillStyle = g; ctx.fill();
    rr(ctx, x + size * 0.04, y + size * 0.04, size * 0.92, size * 0.4, size * 0.2); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    rr(ctx, x + lw * 0.7, y + lw * 0.7, size - lw * 1.4, size - lw * 1.4, size * 0.24); ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = Math.max(1.5, size * 0.03); ctx.stroke();
    text(ui, ctx, 'NIV', x + size / 2, y + size * 0.1, size * 0.026, '#7a4a00', { align: 'center', outline: null });
    const s = String(level), px = Math.min(size * 0.075, size * 0.66 / Math.max(1, F.measure(s, 1)));
    text(ui, ctx, s, x + size / 2, y + size * 0.36, px, '#ffffff', { align: 'center', outline: '#6a3c00' });
  }
  // ---------- habillage PIXEL : aplats, contour noir, bords en escalier, ombre dure ----------
  // fond opaque : un fond translucide est fondu sur le bleu nuit de l'interface (les voiles blancs très transparents ne deviennent pas des blocs blancs)
  const solid2 = (c) => {
    const m = typeof c === 'string' && c.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/);
    if (!m) return c;
    const a = Math.min(1, +m[4] * 1.15), base = [28, 35, 66];
    return 'rgb(' + [1, 2, 3].map((i) => Math.round(+m[i] * a + base[i - 1] * (1 - a))).join(',') + ')';
  };
  function pixPill(ctx, x, y, w, h, fill, stroke, r) {   // panneau : matière sombre légèrement dégradée, biseau (lumière en haut à gauche), liseré gris-bleu
    const u = Math.max(2, Math.round(h * 0.05)), c = Math.max(1, Math.round(Math.min(r === undefined ? h / 2 : r, h / 2) / 3.2));
    stair(ctx, x, y + u * 1.5, w, h, c); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    stair(ctx, x, y, w, h, c); ctx.fillStyle = solid2(fill); ctx.fill();
    ctx.save(); stair(ctx, x, y, w, h, c); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0.09)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.2)'); ctx.fillStyle = g; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), u); ctx.fillRect(Math.round(x), Math.round(y), u, Math.round(h));
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(x), Math.round(y + h - u), Math.round(w), u); ctx.fillRect(Math.round(x + w - u), Math.round(y), u, Math.round(h));
    ctx.restore();
    stair(ctx, x + u * 0.5, y + u * 0.5, w - u, h - u, Math.max(1, c - 1)); ctx.strokeStyle = (stroke && stroke !== 'rgba(255,255,255,0.35)' && stroke !== 'rgba(255,255,255,0.3)') ? stroke : '#5a6674'; ctx.lineWidth = Math.max(1, u * 0.8); ctx.stroke();
  }
  function pixButton3d(ctx, x, y, w, h, c1, c2, lip, pulse) {   // bouton principal : laiton mat (accent) en biseau — dégradé, arête claire en haut, lèvre sombre dessous
    const u = Math.max(2, Math.round(h * 0.055)), c = Math.max(2, Math.round(h * 0.09)), hh = h - 2 * u;
    ctx.save(); if (pulse && pulse !== 1) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(pulse, pulse); ctx.translate(-(x + w / 2), -(y + h / 2)); }
    stair(ctx, x, y + 2.5 * u, w, hh, c); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    stair(ctx, x, y + 2 * u, w, hh, c); ctx.fillStyle = '#7a5a1e'; ctx.fill();
    stair(ctx, x, y, w, hh, c); ctx.fillStyle = '#c4912f'; ctx.fill();
    ctx.save(); stair(ctx, x, y, w, hh, c); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, '#ecc874'); g.addColorStop(0.5, '#d9a441'); g.addColorStop(1, '#bc8a2c'); ctx.fillStyle = g; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(hh));
    ctx.fillStyle = '#f6e0a4'; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), u); ctx.fillRect(Math.round(x), Math.round(y), u, Math.round(hh));
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(Math.round(x), Math.round(y + hh - u), Math.round(w), u); ctx.fillRect(Math.round(x + w - u), Math.round(y), u, Math.round(hh));
    ctx.restore(); ctx.restore();
  }
  function pixMeter(ctx, x, y, w, h, k, c1, c2) {   // barre : cadre de liseré, fond sombre, remplissage jaune plat
    const u = Math.max(2, Math.round(h * 0.2));
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.fillStyle = '#5a6674'; ctx.fillRect(x - u, y - u, w + 2 * u, h + 2 * u);
    ctx.fillStyle = '#14181d'; ctx.fillRect(x, y, w, h);
    const f = Math.round(Math.max(0, Math.min(1, k)) * w);
    if (f > 0) { ctx.fillStyle = '#d9a441'; ctx.fillRect(x, y, f, h); }
  }
  function pixBadge(ctx, x, y, size, level, ui) {   // niveau : petit panneau, numéro jaune
    pixPill(ctx, x, y, size, size, 'rgba(38,45,54,1)', '#5a6674', size * 0.28);
    text(ui, ctx, 'NIV', x + size / 2, y + size * 0.1, size * 0.026, '#8995a1', { align: 'center' });
    const s2 = String(level), px = Math.min(size * 0.075, size * 0.66 / Math.max(1, F.measure(s2, 1)));
    text(ui, ctx, s2, x + size / 2, y + size * 0.4, px, '#d9a441', { align: 'center' });
  }
  let pill = glassPill, button3d = glassButton3d, meter = glassMeter, badge = glassBadge;
  if (PIX) { pill = pixPill; button3d = pixButton3d; meter = pixMeter; badge = pixBadge; }
  Home.skin = SKIN; Home.stair = stair;
  Home.rr = rr; Home.pill = (...a) => pill(...a); Home.button3d = (...a) => button3d(...a); Home.meter = (...a) => meter(...a); Home.badge = (...a) => badge(...a); Home.EDGE = EDGE; Home.lighter = lighter; Home.darker = darker;
  const F2 = F;

  const hit = (ui, x, y, w, h, action) => ui.buttons.push({ x, y, w, h, action });
  const inRect = (ui, x, y, w, h) => !ui.isTouch() && ui.mouse.x >= x && ui.mouse.x <= x + w && ui.mouse.y >= y && ui.mouse.y <= y + h;

  // barre de progression (alias de meter)
  function bar(ctx, x, y, w, h, k, color) { meter(ctx, x, y, w, h, k, color, color); }
  Home.bar = bar;

  // ---------- pictogrammes ----------
  // pictogrammes v038i : formes pleines en dégradé (clair en haut, foncé en bas), contour sombre, petit reflet
  const gfill = (ctx, y0, y1, col) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, lighter(col, 0.5)); g.addColorStop(0.5, col); g.addColorStop(1, darker(col, 0.35)); return g; };
  const solid = (ctx, cy, r, col, lw) => { ctx.fillStyle = gfill(ctx, cy - r, cy + r, col); ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = lw === undefined ? Math.max(1.5, r * 0.14) : lw; ctx.strokeStyle = PIX ? darker(col, 0.45) : EDGE; ctx.stroke(); };
  const ICON = {
    gear(ctx, cx, cy, r, col) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, w1 = Math.PI / 16, w2 = Math.PI / 11;
        for (const [ang, rad] of [[a - w2, 0.78], [a - w1, 1], [a + w1, 1], [a + w2, 0.78]]) ctx.lineTo(cx + Math.cos(ang) * rad * r, cy + Math.sin(ang) * rad * r);
      }
      ctx.closePath(); solid(ctx, cy, r, col);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.34, 0, 6.283); ctx.fillStyle = '#0c1220'; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.stroke();
    },
    target(ctx, cx, cy, r, col) {
      const lw = Math.max(2, r * 0.18);
      for (const [pass, w] of [[EDGE, lw + Math.max(2, r * 0.12)], [col, lw]]) {
        ctx.strokeStyle = pass; ctx.lineWidth = w; ctx.lineCap = 'butt';
        for (const k of [1, 0.58]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, 6.283); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(cx - r * 1.2, cy); ctx.lineTo(cx - r * 0.7, cy); ctx.moveTo(cx + r * 0.7, cy); ctx.lineTo(cx + r * 1.2, cy); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, 6.283); solid(ctx, cy, r * 0.2, col, Math.max(1, r * 0.06));
    },
    rocket(ctx, cx, cy, r, col) {
      ctx.save(); ctx.translate(cx, cy);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-r * 0.2, s * r * 0.3); ctx.lineTo(-r * 0.78, s * r * 0.9); ctx.lineTo(-r * 0.78, s * r * 0.3); ctx.closePath(); solid(ctx, 0, r, '#e0402c'); }
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.quadraticCurveTo(r * 0.5, -r * 0.42, -r * 0.2, -r * 0.34); ctx.lineTo(-r * 0.74, -r * 0.34); ctx.lineTo(-r * 0.74, r * 0.34); ctx.lineTo(-r * 0.2, r * 0.34); ctx.quadraticCurveTo(r * 0.5, r * 0.42, r, 0); ctx.closePath(); solid(ctx, 0, r * 0.5, col);
      ctx.beginPath(); ctx.arc(r * 0.05, 0, r * 0.15, 0, 6.283); ctx.fillStyle = '#39b8ff'; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1, r * 0.07); ctx.stroke();
      ctx.restore();
    },
    nut(ctx, cx, cy, r, col) {   // écrou hexagonal doré (la monnaie : les MATERIAUX)
      const hex = (rad) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } ctx.closePath(); };
      hex(r); ctx.fillStyle = '#6a3c00'; ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.stroke();
      const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, '#fff6b0'); g.addColorStop(0.45, '#d9a441'); g.addColorStop(1, '#9a7126');
      hex(r * 0.86); ctx.fillStyle = g; ctx.fill(); hex(r * 0.86); ctx.strokeStyle = 'rgba(255,248,200,0.9)'; ctx.lineWidth = Math.max(1, r * 0.07); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.36, 0, 6.283); ctx.fillStyle = '#5a3400'; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.22, 0, 6.283); ctx.fillStyle = '#1c1000'; ctx.fill();
    },
    gem(ctx, cx, cy, r, col) {
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.8, cy - r * 0.15); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.8, cy - r * 0.15); ctx.closePath(); solid(ctx, cy, r, col);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.92); ctx.lineTo(cx - r * 0.7, cy - r * 0.15); ctx.lineTo(cx - r * 0.05, cy - r * 0.05); ctx.closePath(); ctx.fill();
    },
    flame(ctx, cx, cy, r, col) {
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 0.1, cx + r * 0.55, cy + r * 0.55); ctx.quadraticCurveTo(cx, cy + r * 1.05, cx - r * 0.55, cy + r * 0.55); ctx.quadraticCurveTo(cx - r * 0.9, cy - r * 0.1, cx, cy - r); ctx.closePath(); solid(ctx, cy, r, col, Math.max(1, r * 0.1));
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.15); ctx.quadraticCurveTo(cx + r * 0.38, cy + r * 0.25, cx + r * 0.2, cy + r * 0.6); ctx.quadraticCurveTo(cx, cy + r * 0.8, cx - r * 0.2, cy + r * 0.6); ctx.quadraticCurveTo(cx - r * 0.38, cy + r * 0.25, cx, cy - r * 0.15); ctx.fill();
    },
    play(ctx, cx, cy, r, col) { ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.85); ctx.lineTo(cx + r * 0.95, cy); ctx.lineTo(cx - r * 0.6, cy + r * 0.85); ctx.closePath(); solid(ctx, cy, r, col); },
    check(ctx, cx, cy, r, col) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [c, w] of [[EDGE, Math.max(3, r * 0.5)], [col, Math.max(2, r * 0.3)]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy); ctx.lineTo(cx - r * 0.15, cy + r * 0.55); ctx.lineTo(cx + r * 0.8, cy - r * 0.6); ctx.stroke(); }
      ctx.lineCap = 'butt';
    },
    lock(ctx, cx, cy, r, col) {
      ctx.lineCap = 'round';
      for (const [c, w] of [[EDGE, Math.max(3, r * 0.4)], [lighter(col, 0.25), Math.max(2, r * 0.22)]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.45, Math.PI, 0); ctx.stroke(); }
      rr(ctx, cx - r * 0.72, cy - r * 0.05, r * 1.44, r * 1.0, r * 0.2); solid(ctx, cy, r * 0.6, col);
      ctx.fillStyle = '#0c1220'; ctx.beginPath(); ctx.arc(cx, cy + r * 0.36, r * 0.14, 0, 6.283); ctx.fill(); ctx.lineCap = 'butt';
    },
    home(ctx, cx, cy, r, col) { ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + r * 0.65, cy); ctx.lineTo(cx + r * 0.65, cy + r * 0.85); ctx.lineTo(cx - r * 0.65, cy + r * 0.85); ctx.lineTo(cx - r * 0.65, cy); ctx.lineTo(cx - r, cy); ctx.closePath(); solid(ctx, cy, r, col); },
  };
  // v038j : en habillage pixel, chaque pictogramme vectoriel est dessiné sur une toute petite grille puis agrandi sans lissage, alpha durci : vrai rendu « pixel art »
  let inPix = false; const pixCache = new Map();
  function pixDraw(ctx, fn, key, cx, cy, r, col, big, mono) {
    const cell = Math.max(2, Math.round(r * (big ? 0.1 : 0.13))), n = Math.max(8, Math.round(r * 2.7 / cell)), k = key + '|' + col + '|' + cell + '|' + n;
    let c = pixCache.get(k);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
      inPix = true; try { fn(g, n / 2, n / 2, r / cell, col); } finally { inPix = false; }
      const id = g.getImageData(0, 0, n, n), d = id.data;
      for (let i = 3; i < d.length; i += 4) {
        d[i] = d[i] >= 120 ? 255 : 0;
        if (mono && d[i]) { const l = d[i - 3] * 0.3 + d[i - 2] * 0.59 + d[i - 1] * 0.11, c = l > 150 ? [255, 241, 232] : l > 80 ? [131, 118, 156] : [29, 43, 83]; d[i - 3] = c[0]; d[i - 2] = c[1]; d[i - 1] = c[2]; }   // v039 : icônes d'onglets en trois teintes (blanc, gris-violet, bleu nuit)
      }
      g.putImageData(id, 0, 0);
      if (pixCache.size > 400) pixCache.clear(); pixCache.set(k, c);
    }
    ctx.imageSmoothingEnabled = false; ctx.drawImage(c, Math.round(cx - n * cell / 2), Math.round(cy - n * cell / 2), n * cell, n * cell);
  }
  const GLASS_ICON = Object.assign({}, ICON);
  if (PIX) for (const k of Object.keys(GLASS_ICON)) ICON[k] = (ctx, cx, cy, r, col) => (inPix ? GLASS_ICON[k](ctx, cx, cy, r, col) : pixDraw(ctx, GLASS_ICON[k], k, cx, cy, r, col));
  if (PIX) ICON.lock = function (ctx, cx, cy, r, col) {   // cadenas dessiné directement en gros pixels (trop petit pour être pixelisé)
    const u = Math.max(2, Math.round(r * 0.22)), R = Math.round, x0 = R(cx - 2.5 * u), y0 = R(cy - 3 * u);
    for (const [pad, c] of [[u, EDGE], [0, col]]) {
      ctx.fillStyle = c;
      ctx.fillRect(x0 + R(u * 0.5) - pad, y0 - pad, R(u * 4) + 2 * pad, u + 2 * pad); ctx.fillRect(x0 + R(u * 0.5) - pad, y0 - pad, u + 2 * pad, R(u * 3) + 2 * pad); ctx.fillRect(x0 + R(u * 3.5) - pad, y0 - pad, u + 2 * pad, R(u * 3) + 2 * pad);
      ctx.fillRect(x0 - pad, y0 + R(u * 2.5) - pad, R(u * 5) + 2 * pad, R(u * 3.5) + 2 * pad);
    }
    ctx.fillStyle = '#0c1220'; ctx.fillRect(R(cx - u * 0.5), R(y0 + u * 3.7), u, R(u * 1.4));
  };
  // v040 : icônes en GRILLE 11×11 (un pixel = un carré), couleurs de la palette ; remplace l'ancien rendu vectoriel pixelisé
  const GR = {
    rocket: ['.....r.....', '....rrr....', '...wwwww...', '...wwbww...', '...wwwww...', '...wwwww...', '..rwwwwwr..', '.rrwwwwwrr.', '.r.wwwww.r.', '...ooyoo...', '....y.y....'],
    trophy: ['.#########.', '##.#####.##', '#..#####..#', '#..#####..#', '.##.###.##.', '...#####...', '....###....', '.....#.....', '.....#.....', '...#####...', '...#####...'],
    star:   ['.....#.....', '.....#.....', '....###....', '###########', '.#########.', '..#######..', '..#######..', '.####.####.', '.###...###.', '.##.....##.', '.#.......#.'],
    play:   ['...........', '.##........', '.####......', '.######....', '.########..', '.#########.', '.########..', '.######....', '.####......', '.##........', '...........'],
    lock:   ['...#####...', '..##...##..', '..#.....#..', '..#.....#..', '.#########.', '.#########.', '.####.####.', '.####.####.', '.#########.', '.#########.', '...........'],
    check:  ['...........', '..........#', '.........##', '........##.', '#......##..', '##....##...', '.##..##....', '..####.....', '...##......', '...........', '...........'],
    home:   ['.....#.....', '....###....', '...#####...', '..#######..', '.#########.', '###########', '.###...###.', '.###...###.', '.###...###.', '.###...###.', '.#########.'],
    cart:   ['..#........', '..#........', '..########.', '..#.#####..', '..#.#####..', '...#####...', '...#####...', '...........', '..##...##..', '..##...##..', '...........'],
    flame:  ['.....#.....', '....##.....', '....###....', '...####.#..', '..######.#.', '..#######..', '.#########.', '.####.####.', '.###...###.', '..###.###..', '...#####...'],
    nut:    ['...#####...', '..#######..', '.####.####.', '###.....###', '##.......##', '##.......##', '##.......##', '###.....###', '.####.####.', '..#######..', '...#####...'],
    mult:   ['##.......##', '.##.....##.', '..##...##..', '...##.##...', '....###....', '....###....', '...##.##...', '..##...##..', '.##.....##.', '##.......##', '...........'],
    tank:   ['..###......', '..#.#......', '.#########.', '.#########.', '.##.....##.', '.##.....##.', '.##.....##.', '.##.....##.', '.#########.', '.#########.', '...........'],
    bolt:   ['.....###...', '....###....', '...###.....', '..#####....', '....###....', '...###.....', '..###......', '.###.......', '.##........', '.#.........', '...........'],
    shield: ['.#########.', '###########', '###########', '###########', '###########', '.#########.', '.#########.', '..#######..', '...#####...', '....###....', '.....#.....'],
    gear:   ['....###....', '.#..###..#.', '.####.####.', '..##...##..', '###.....###', '###.....###', '###.....###', '..##...##..', '.####.####.', '.#..###..#.', '....###....'],
    target: ['...#####...', '..##...##..', '.#.......#.', '#..#####..#', '#..#...#..#', '#..#.#.#..#', '#..#...#..#', '#..#####..#', '.#.......#.', '..##...##..', '...#####...'],
  };
  const GCOL = { r: '#9a4d44', w: '#e8ecef', b: '#8fb4c8', o: '#8995a1', y: '#d9a441' };
  function gridDraw(ctx, name, cx, cy, size, col) {
    const g = GR[name]; if (!g) return;
    const s = Math.max(1, Math.round(size / 11)), n = g.length, x0 = Math.round(cx - n * s / 2), y0 = Math.round(cy - n * s / 2);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const ch = g[y][x]; if (ch === '.') continue; ctx.fillStyle = ch === '#' ? col : (GCOL[ch] || col); ctx.fillRect(x0 + x * s, y0 + y * s, s, s); }
  }
  if (PIX) {
    const alias = { gem: 'star', play: 'play', home: 'home' };
    for (const k of Object.keys(GR)) ICON[k] = (ctx, cx, cy, r, col) => gridDraw(ctx, k, cx, cy, r * 2.3, col || '#e8ecef');
    ICON.gem = ICON.star;
  }
  // v045 : en habillage pixel, les icônes courantes passent en 3D (repli : la grille, le temps du rendu)
  if (PIX) for (const [k, n] of [['gear', 'gear'], ['nut', 'nut'], ['trophy', 'trophy'], ['star', 'star'], ['lock', 'lock'], ['rocket', 'rocket']]) {
    const old = ICON[k]; ICON[k] = (ctx, cx, cy, r, col) => { if (CC.Icons3D && CC.Icons3D.ready(n)) Home.bigIcon(ctx, n, cx, cy, r * (k === 'gear' ? 3.1 : 2.4)); else old(ctx, cx, cy, r, col); };
  }
  Home.gridDraw = gridDraw;
  Home.pixDraw = pixDraw;
  Home.icon = ICON;

  // ---------- icônes colorées de la barre d'onglets (dégradés, reflets) ----------
  const grad = (ctx, y0, y1, c0, c1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
  const TABICON = {
    mission(ctx, cx, cy, r) {   // bloc-notes avec pince orange et coche verte
      rr(ctx, cx - r * 0.7, cy - r * 0.85, r * 1.4, r * 1.75, r * 0.18); ctx.fillStyle = grad(ctx, cy - r, cy + r, '#ffffff', '#c8d2e0'); ctx.fill(); ctx.strokeStyle = '#3a4a64'; ctx.lineWidth = r * 0.09; ctx.stroke();
      rr(ctx, cx - r * 0.35, cy - r * 1.05, r * 0.7, r * 0.36, r * 0.12); ctx.fillStyle = grad(ctx, cy - r, cy - r * 0.6, '#ffb24a', '#e06a00'); ctx.fill(); ctx.stroke();
      ICON.check(ctx, cx, cy + r * 0.12, r * 0.42, '#20b040');
      ctx.fillStyle = '#9fb0c8'; ctx.fillRect(cx - r * 0.45, cy + r * 0.6, r * 0.9, r * 0.1);
    },
    trophy(ctx, cx, cy, r) {
      ctx.strokeStyle = '#b87800'; ctx.lineWidth = r * 0.16; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * r * 0.62, cy - r * 0.3, r * 0.3, s > 0 ? -1.2 : Math.PI - 1.9 + 0.7, s > 0 ? 1.9 : Math.PI + 1.2 - 0.7, s < 0); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(cx - r * 0.62, cy - r * 0.75); ctx.lineTo(cx + r * 0.62, cy - r * 0.75); ctx.lineTo(cx + r * 0.42, cy + r * 0.15); ctx.quadraticCurveTo(cx, cy + r * 0.45, cx - r * 0.42, cy + r * 0.15); ctx.closePath();
      ctx.fillStyle = grad(ctx, cy - r, cy + r * 0.4, '#fff3a0', '#e89a00'); ctx.fill(); ctx.strokeStyle = '#8a5200'; ctx.lineWidth = r * 0.08; ctx.stroke();
      ctx.fillStyle = '#9a7126'; ctx.fillRect(cx - r * 0.1, cy + r * 0.3, r * 0.2, r * 0.3); rr(ctx, cx - r * 0.45, cy + r * 0.58, r * 0.9, r * 0.3, r * 0.08); ctx.fillStyle = grad(ctx, cy + r * 0.5, cy + r * 0.9, '#d9a441', '#b87800'); ctx.fill(); ctx.stroke();
    },
    home(ctx, cx, cy, r) {   // la roquette (l'accueil, c'est le lanceur)
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#ff6a10'; ctx.beginPath(); ctx.moveTo(-r * 0.25, r * 0.55); ctx.quadraticCurveTo(0, r * 1.25, r * 0.25, r * 0.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e02a1c'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.3, r * 0.1); ctx.lineTo(s * r * 0.75, r * 0.65); ctx.lineTo(s * r * 0.28, r * 0.55); ctx.closePath(); ctx.fill(); }
      rr(ctx, -r * 0.34, -r * 0.6, r * 0.68, r * 1.25, r * 0.3); ctx.fillStyle = grad(ctx, -r * 0.6, r * 0.65, '#ffffff', '#b8c4d4'); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.34, -r * 0.55); ctx.quadraticCurveTo(0, -r * 1.35, r * 0.34, -r * 0.55); ctx.closePath(); ctx.fillStyle = '#e02a1c'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.17, 0, 6.283); ctx.fillStyle = '#39b8ff'; ctx.fill(); ctx.strokeStyle = '#1a4a7a'; ctx.lineWidth = r * 0.06; ctx.stroke();
      ctx.restore();
    },
    star(ctx, cx, cy, r) {
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r * 1.0; ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } ctx.closePath();
      ctx.fillStyle = grad(ctx, cy - r, cy + r, '#fff3a0', '#ff9a00'); ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = '#8a4a00'; ctx.lineWidth = r * 0.12; ctx.stroke();
    },
    shop(ctx, cx, cy, r) {   // étal : auvent rayé et caisse
      rr(ctx, cx - r * 0.75, cy - r * 0.05, r * 1.5, r * 0.95, r * 0.1); ctx.fillStyle = grad(ctx, cy, cy + r, '#e0a060', '#9a5a20'); ctx.fill(); ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = r * 0.08; ctx.stroke();
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - r * 0.85 + i * r * 0.34, cy - r * 0.75); ctx.lineTo(cx - r * 0.85 + (i + 1) * r * 0.34, cy - r * 0.75); ctx.lineTo(cx - r * 0.85 + (i + 1) * r * 0.3 - r * 0.04, cy - r * 0.1); ctx.lineTo(cx - r * 0.85 + i * r * 0.3 - r * 0.04, cy - r * 0.1); ctx.closePath(); ctx.fillStyle = i % 2 ? '#ffffff' : '#e02a3c'; ctx.fill(); }
      ICON.nut(ctx, cx, cy + r * 0.45, r * 0.26, '#d9a441');
    },
  };
  if (PIX) { TABICON.mission = (ctx, cx, cy, r) => gridDraw(ctx, 'target', cx, cy, r * 2.2, '#d9a441'); TABICON.trophy = (ctx, cx, cy, r) => gridDraw(ctx, 'trophy', cx, cy, r * 2.2, '#e8ecef'); TABICON.home = (ctx, cx, cy, r) => gridDraw(ctx, 'rocket', cx, cy, r * 2.2, '#e8ecef'); TABICON.star = (ctx, cx, cy, r) => gridDraw(ctx, 'star', cx, cy, r * 2.2, '#d9a441'); TABICON.shop = (ctx, cx, cy, r) => gridDraw(ctx, 'cart', cx, cy, r * 2.2, '#e8ecef'); }
  // barre d'onglets du bas : MISSION · PROGRES · [ACCUEIL surélevé, jaune] · DEFIS · BOUTIQUE (comme les jeux mobiles)
  function tabBar(ui, ctx, L, tabs) {
    const { W, HH, T, u } = L, bh = Math.min(u * 0.2, HH * 0.11), y0 = T + HH - bh, tw = W / tabs.length;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + bh); g.addColorStop(0, PIX ? 'rgba(38,45,54,1)' : 'rgba(24,34,56,0.94)'); g.addColorStop(1, PIX ? 'rgba(38,45,54,1)' : 'rgba(8,12,22,0.97)');
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, bh); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(0, y0, W, 2);
    const px = Math.min.apply(null, tabs.map((t) => ui.fitPx([t.label], tw * 0.92, 1.5)));
    tabs.forEach((t, i) => {
      const cx = tw * (i + 0.5), r = bh * 0.3;
      if (t.active) {
        const lift = bh * 0.28;
        rr(ctx, cx - tw * 0.46, y0 - lift, tw * 0.92, bh + lift, bh * 0.2); ctx.fillStyle = PIX ? '#d9a441' : grad(ctx, y0 - lift, y0 + bh, '#ffe860', '#ffb800'); ctx.fill(); ctx.strokeStyle = PIX ? '#f0d28a' : '#fff8c0'; ctx.lineWidth = PIX ? 3 : 2; ctx.stroke();
        TABICON[t.icon](ctx, cx, y0 - lift - bh * 0.02, r * 1.0);   // l'icône sort de la case, vers le haut
        text(ui, ctx, t.label, cx, y0 + bh * 0.6, px, PIX ? '#14181d' : '#ffffff', { align: 'center', outline: PIX ? null : '#8a5200' });
      } else {
        const on = inRect(ui, cx - tw / 2, y0, tw, bh);
        if (on) { rr(ctx, cx - tw * 0.45, y0 + 4, tw * 0.9, bh - 8, bh * 0.2); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill(); }
        TABICON[t.icon](ctx, cx, y0 + bh * 0.12, r * 0.85);   // idem : l'icône dépasse du haut de la barre
        text(ui, ctx, t.label, cx, y0 + bh * 0.68, px, '#e6edf8', { align: 'center', outline: PIX ? null : '#05080e' });
        hit(ui, cx - tw / 2, y0 - bh * 0.4, tw, bh * 1.4, t.action);
      }
    });
    return bh;
  }

  // bouton rond d'icône avec libellé dessous (accueil)
  function roundBtn(ui, ctx, cx, cy, r, icon, label, color, action, badge, slotW, labelPx) {
    const on = inRect(ui, cx - r, cy - r, 2 * r, 2 * r + r * 0.9);
    const y0 = cy - r;
    pxRect(ctx, cx - r, y0, 2 * r, 2 * r, on ? 'rgba(255,255,255,0.22)' : 'rgba(8,12,20,0.78)', color, Math.round(r * 0.28), Math.max(2, r * 0.07));
    if (icon === 'star') ui.star(ctx, cx, cy, r * 0.6, true, color);
    else if (icon === 'trophy') ui.trophy(ctx, cx, cy - r * 0.05, r * 1.1, color, true);
    else ICON[icon](ctx, cx, cy, r * 0.55, color);
    const px = labelPx || ui.fitPx([label], Math.max(r * 2.2, (slotW || r * 3.4) * 0.96), r * 0.075);   // le libellé tient dans sa case : jamais de chevauchement entre icônes
    text(ui, ctx, label, cx, cy + r + r * 0.18, px, '#dfe6f0', { align: 'center' });
    if (badge) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(cx + r * 0.8, cy - r * 0.8, r * 0.26, 0, 6.283); ctx.fill(); }
    hit(ui, cx - r * 1.05, y0 - r * 0.05, r * 2.1, r * 2.3, action);
  }

  // ---------- badge de niveau + barre d'XP ----------
  function levelBadge(ui, ctx, game, L, x, y, size, action) {
    badge(ctx, x, y, size, game.progress.level, ui);
    if (action) hit(ui, x, y, size, size, action);
  }
  Home.levelBadge = levelBadge;

  // ============================================================================================================
  //   ACCUEIL (état MENU, aucune surcouche)
  // ============================================================================================================
  Home.drawHome = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T, HH, P, u, Y } = L, pad = game.pad, prog = game.progress, touch = ui.isTouch();
    const arm = game.state === 'LAUNCH' ? U.clamp(1 - game.launchT / 0.3, 0, 1) : 1;   // l'interface s'efface dès que la charge commence
    if (arm <= 0) return;
    ctx.save(); ctx.globalAlpha = arm;
    const margin = u * 0.04, ic = u * 0.1;
    // v043 : en-tête marine (avatar, niveau, record) ; réglages et écrous dessous, à droite
    const hdrBottom = Home.drawTop(ui, ctx, game, L, 'home');
    const gr = u * 0.055, gx = W - margin - gr, gy = hdrBottom + margin * 0.8 + gr;
    ICON.gear(ctx, gx, gy, gr * 0.95, inRect(ui, gx - gr, gy - gr, 2 * gr, 2 * gr) ? '#ffffff' : '#c2c3c7');
    hit(ui, gx - gr * 1.1, gy - gr * 1.1, gr * 2.2, gr * 2.2, () => { ui.overlay = 'msettings'; });
    { const nl = U.formatInt(prog.P.materials || 0), nh = gr * 1.5, npx = nh * 0.075, nw = F.measure(nl, npx) + nh * 1.4, nx = gx - gr * 0.2, ny = gy + gr * 1.4;
      pill(ctx, nx - nw + gr * 1.2, ny, nw, nh, 'rgba(38,45,54,0.97)', '#5a6674', nh * 0.3);
      Home.bigIcon(ctx, 'coins', nx - nw + gr * 1.2 + nh * 0.55, ny + nh / 2, nh * 0.85);
      text(ui, ctx, nl, nx + gr * 1.2 - nh * 0.3, ny + nh / 2 - npx * 3.6, npx, '#e8ecef', { align: 'right' }); }
    // APPUYER POUR JOUER (sous la roquette)
    { const pj = 'APPUYER POUR JOUER'; text(ui, ctx, pj, W / 2, Y(0.66), ui.fitPx([pj], W * 0.8, u * 0.0075 + Math.sin(performance.now() * 0.005) * 0), '#e8ecef', { align: 'center', alpha: 0.75 + 0.25 * Math.sin(performance.now() * 0.006) }); }
    // 1. la roquette : anneau pulsant + doigt qui touche (les 3 premiers vols : consigne écrite en plus)
    // 4. barre d'onglets en bas (style jeu mobile) et 3. mission la plus avancée juste au-dessus
    const barH = Home.drawTabs(ui, ctx, game, L, null);   // v043 : GARAGE · MAP · BOUTIQUE (au fil des niveaux)
    // v040 : plus de mission affichée sur l'accueil (elle reste dans l'onglet MISSION) ; aux 3 premiers vols, le but en trois lignes
    if ((prog.P.launches || 0) < 3) {
      const base = Y(0.72), lines2 = [['TOUCHE LA ROQUETTE', '#e8ecef'], ['PASSE LES TROUS', '#d9a441'], ['FONCE SUR LES CHARS', '#d9a441']];
      lines2.slice(1).forEach(([g2, c2], i) => text(ui, ctx, g2, W / 2, base + i * u * 0.07, ui.fitPx([g2], W * 0.86, u * 0.005), c2, { align: 'center' }));
    }
    if (!touch) text(ui, ctx, 'ESPACE OU CLIC : LANCER    F1 : TOUCHES', W / 2, T + HH - barH - u * 0.035, ui.fitPx(['ESPACE OU CLIC : LANCER    F1 : TOUCHES'], W * 0.8, u * 0.0032), '#8a96a8', { align: 'center' });
    
    ctx.restore();
  };

  // repère « touche la roquette » : projeté à l'écran depuis la position 3D de la roquette
  Home.cue = function (ui, ctx, game, L, touch) {
    const { T, HH, W, u } = L, v = this._v || (this._v = new THREE.Vector3());
    v.copy(game.pad.origin).project(game.camera);
    if (v.z > 1) return;
    const sx = (v.x * 0.5 + 0.5) * W, sy = T + (0.5 - v.y * 0.5) * HH;
    const t = performance.now() * 0.001, k = (t * 0.9) % 1, learn = (game.progress.P.launches || 0) < 3;
    // onde qui s'élargit depuis la roquette
    ctx.strokeStyle = 'rgba(143,228,255,' + (0.75 * (1 - k)) + ')'; ctx.lineWidth = Math.max(2, u * 0.008);
    ctx.setLineDash([u * 0.03, u * 0.02]); ctx.beginPath(); ctx.arc(sx, sy, u * (0.11 + 0.16 * k), 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
    if (learn) {
      // doigt : un rond blanc qui appuie (s'enfonce puis se relève) sous la roquette
      const press = 0.5 + 0.5 * Math.sin(t * 5), fy = sy + u * 0.3 - press * u * 0.025, fr = u * 0.04 * (1 - 0.12 * press);
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(sx, fy, fr, 0, 6.283); ctx.fill();
      ctx.fillRect(sx - fr * 0.55, fy, fr * 1.1, fr * 2.2);
      ctx.strokeStyle = 'rgba(11,14,20,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, fy, fr, 0, 6.283); ctx.stroke();
      const msg = touch ? 'TOUCHE POUR LANCER' : 'CLIC OU ESPACE POUR LANCER';
      text(ui, ctx, msg, W / 2, sy + u * 0.47, ui.fitPx([msg], W * 0.84, u * 0.0058), '#ffffff', { align: 'center', outline: '#0b0e14' });
      for (const [i, g2] of ['PASSE LES TROUS', 'FONCE SUR LES CHARS'].entries()) text(ui, ctx, g2, W / 2, sy + u * (0.56 + i * 0.065), ui.fitPx([g2], W * 0.8, u * 0.0046), '#d9a441', { align: 'center' });
    }
  };

  // ============================================================================================================
  //   SURCOUCHES : MISSIONS, PROGRESSION, REGLAGES, OFFRE DE CONTINUER
  // ============================================================================================================
  function frame(ui, ctx, game, W, H, title, color) {
    const L = Home.layout(ui, W, H), { T, HH, u, Y } = L;
    ui.dim(ctx, W, H, 0.9);
    const px = ui.fitPx([title], W * 0.7, u * 0.011);
    text(ui, ctx, title, W / 2, Y(0.05), px, color || '#ffffff', { align: 'center', skew: -0.2 });
    ctx.fillStyle = color || '#ffffff'; ctx.globalAlpha = 0.5; ctx.fillRect(W * 0.2, Y(0.05) + px * 9.2, W * 0.6, Math.max(2, u * 0.006)); ctx.globalAlpha = 1;
    return L;
  }
  function backButton(ui, ctx, L, label, action) {
    const { W, u, Y } = L, bw = W * 0.6, bh = Math.max(u * 0.12, 48 * ui.pixelRatio()), bx = W / 2 - bw / 2, by = Y(0.935) - bh / 2;
    const on = inRect(ui, bx, by, bw, bh);
    pxRect(ctx, bx, by, bw, bh, on ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)', '#dfe6f0');
    const px = ui.fitPx([label], bw * 0.7, bh * (PIX ? 0.04 : 0.026));
    text(ui, ctx, label, W / 2, by + bh / 2 - px * 3.5, px, '#ffffff', { align: 'center' });
    hit(ui, bx, by, bw, bh, action);
  }
  Home.backButton = backButton;

  // MISSIONS : trois lignes (libellé, barre, récompense)
  Home.drawQuests = function (ui, ctx, game, W, H) {
    const L = frame(ui, ctx, game, W, H, 'MISSION', ORANGE), { HH, u, Y, P } = L, prog = game.progress;
    const rowH = Math.min(u * 0.34, HH * 0.19), x0 = W * 0.06, w = W * 0.88;
    text(ui, ctx, 'CHAQUE MISSION FAIT MONTER TON NIVEAU', W / 2, Y(0.115), ui.fitPx(['CHAQUE MISSION FAIT MONTER TON NIVEAU'], w, u * 0.0052), '#9fb0c8', { align: 'center' });
    prog.P.missions.forEach((m, i) => {
      const y = Y(0.16) + i * (rowH + HH * 0.02), done = m.done;
      pxRect(ctx, x0, y, w, rowH, 'rgba(12,18,30,0.85)', done ? GREEN : 'rgba(159,176,200,0.5)');
      ICON.target(ctx, x0 + rowH * 0.42, y + rowH * 0.5, rowH * 0.2, done ? GREEN : ORANGE);
      const label = prog.missionText(m), tx = x0 + rowH * 0.85, tW = w - rowH * 0.85 - rowH * 0.3;
      const lp = ui.fitPx([label], tW, rowH * 0.02);
      text(ui, ctx, label, tx, y + rowH * 0.15, lp, '#f4f4f4', {});
      bar(ctx, tx, y + rowH * 0.52, tW * 0.62, rowH * 0.15, m.progress / m.target, done ? GREEN : ORANGE);
      const cnt = m.progress + '/' + m.target, np = ui.fitPx([cnt], tW * 0.34, rowH * 0.03);
      text(ui, ctx, cnt, tx + tW * 0.66, y + rowH * 0.595 - np * 3.5, np, '#dfe6f0', {});
      text(ui, ctx, done ? 'TERMINEE' : '+' + m.xp, tx, y + rowH * 0.76, ui.fitPx(['+000'], tW * 0.5, rowH * 0.028), done ? GREEN : CY, {});
    });
    const tip = 'UNE NOUVELLE MISSION APRES CHAQUE VOL';
    text(ui, ctx, tip, W / 2, Y(0.16) + 3 * (rowH + HH * 0.02) + HH * 0.01, ui.fitPx([tip], w, u * 0.0048), '#7f8da3', { align: 'center' });
    backButton(ui, ctx, L, ui.key('RETOUR', 'ESC'), () => { ui.overlay = null; });
  };

  // PROGRESSION : niveau, rang, décors, statistiques
  Home.drawProgress = function (ui, ctx, game, W, H) {
    const L = frame(ui, ctx, game, W, H, 'PROGRESSION', GOLD), { HH, u, Y, P } = L, prog = game.progress, S = prog.P, cfg = CC.CONFIG.progress;
    const bs = u * 0.2, bx = W * 0.07, by = Y(0.12);
    levelBadge(ui, ctx, game, L, bx, by, bs);
    const xw = W - bx * 2 - bs - u * 0.04, xx = bx + bs + u * 0.04;
    text(ui, ctx, prog.rank(S.level), xx, by + bs * 0.08, ui.fitPx(['COMMANDANT'], xw, bs * 0.026), '#ffffff', {});
    bar(ctx, xx, by + bs * 0.42, xw, bs * 0.2, S.xp / prog.need(S.level), CY);
    text(ui, ctx, S.xp + ' / ' + prog.need(S.level) + ' XP', xx, by + bs * 0.72, ui.fitPx(['0000 / 0000 XP'], xw, bs * 0.022), '#9fb0c8', {});
    // décors
    const wy = Y(0.12) + bs + HH * 0.03;
    text(ui, ctx, 'DECORS', W * 0.07, wy, u * 0.0062, '#9fb0c8', {});
    const allIds = Object.keys(cfg.worlds), nextLocked = allIds.find((k) => S.level < cfg.worlds[k]), ids = allIds.filter((k) => S.level >= cfg.worlds[k] || k === nextLocked), n = ids.length, rw = W * 0.86, rh = Math.min(u * 0.075, HH * 0.044);
    ids.forEach((id, i) => {
      const y = wy + HH * 0.03 + i * (rh + HH * 0.008), open = S.level >= cfg.worlds[id];
      pxRect(ctx, W * 0.07, y, rw, rh, 'rgba(12,18,30,0.8)', open ? 'rgba(86,255,90,0.6)' : 'rgba(159,176,200,0.25)', Math.round(rh * 0.14));
      const nm = prog.worldName(id), np = ui.fitPx([nm], rw * 0.6, rh * 0.04);
      text(ui, ctx, nm, W * 0.07 + rh * 1.1, y + rh * 0.5 - np * 3.5, np, open ? '#f4f4f4' : '#6f7c90', {});
      if (open) ICON.check(ctx, W * 0.07 + rh * 0.55, y + rh * 0.5, rh * 0.28, GREEN);
      else { ICON.lock(ctx, W * 0.07 + rh * 0.55, y + rh * 0.5, rh * 0.26, '#6f7c90'); text(ui, ctx, 'NIVEAU ' + cfg.worlds[id], W * 0.07 + rw - rh * 0.3, y + rh * 0.5 - np * 3.5, np, GOLD, { align: 'right' }); }
    });
    // statistiques
    const sy = wy + HH * 0.03 + n * (rh + HH * 0.008) + HH * 0.02;
    const st = [['VOLS', S.runs], ['MEILLEUR SCORE', U.formatInt(S.best)], ['DISTANCE TOTALE', U.formatInt(S.stats.dist) + ' M'], ['CIBLES', S.stats.targets], ['ECLATS', S.stats.cells]];
    const sp = Math.min(ui.fitPx(['DISTANCE TOTALE   000.000 M'], rw, u * 0.0056), Math.max(1, (Y(0.935) - u * 0.07 - sy) / (st.length * 11)));   // v038i : les statistiques ne passent plus sous le bouton RETOUR
    st.forEach((r2, i) => { const y = sy + i * sp * 11; text(ui, ctx, r2[0], W * 0.07, y, sp, '#9fb0c8', {}); text(ui, ctx, String(r2[1]), W * 0.93, y, sp, '#ffffff', { align: 'right' }); });
    backButton(ui, ctx, L, ui.key('RETOUR', 'ESC'), () => { ui.overlay = null; });
  };

  // REGLAGES : interrupteurs à gros boutons
  Home.drawSettings = function (ui, ctx, game, W, H) {
    const L = frame(ui, ctx, game, W, H, 'REGLAGES', '#dfe6f0'), { HH, u, Y } = L, s = game.settings;
    const vib = ['NON', 'FAIBLE', 'MOYEN', 'FORT'], vibV = s.vibration !== undefined ? s.vibration : 2;
    const rows = [
      ['SON', s.sfx > 0 ? 'OUI' : 'NON', () => ui.toggleVolume(game, 'sfx')],
      ['MUSIQUE', s.music > 0 ? 'OUI' : 'NON', () => ui.toggleVolume(game, 'music')],
      ['VIBRATION', vib[vibV], () => { s.vibration = (vibV + 1) % 4; if (CC.Haptics) { CC.Haptics.setLevel(s.vibration); CC.Haptics.tick('fire'); } game.applySettings(); }],
      ['GRAPHISMES', ui.graphicsLabel(game), () => ui.cycleGraphics(game)],
      ['PUBS D\'EXEMPLE', s.ads === false ? 'NON' : 'OUI', () => { s.ads = s.ads === false; game.applySettings(); }],
      ['REINITIALISER', ui._rst && performance.now() - ui._rst < 4000 ? 'SUR ?' : 'GO', () => {   // v068 : remet la progression à zéro (deux touches)
        if (ui._rst && performance.now() - ui._rst < 4000) { try { localStorage.removeItem('coldimpact.save'); localStorage.removeItem('closecall.save'); } catch (e) { /* ignoré */ } location.reload(); } else ui._rst = performance.now();
      }],
      ['REVOIR LE TUTO', 'GO', () => { s.tutorialDone = false; s.tutorialFlights = 0; game.progress.P.launches = 0; game.applySettings(); ui.overlay = null; }],
    ];
    const rh = Math.min(u * 0.15, HH * 0.085), gap = HH * 0.016, y0 = Y(0.13), x0 = W * 0.06, w = W * 0.88;
    rows.forEach((r, i) => {
      const y = y0 + i * (rh + gap), on = inRect(ui, x0, y, w, rh);
      pxRect(ctx, x0, y, w, rh, on ? 'rgba(255,255,255,0.16)' : 'rgba(12,18,30,0.85)', 'rgba(159,176,200,0.55)');
      const lp = ui.fitPx([r[0]], w * 0.5, rh * 0.04), vp = ui.fitPx([r[1]], w * 0.34, rh * 0.04);
      text(ui, ctx, r[0], x0 + rh * 0.35, y + rh / 2 - lp * 3.5, lp, '#f4f4f4', {});
      text(ui, ctx, r[1], x0 + w - rh * 0.35, y + rh / 2 - vp * 3.5, vp, r[1] === 'NON' ? '#8a96a8' : CY, { align: 'right' });
      hit(ui, x0, y, w, rh, r[2]);
    });
    backButton(ui, ctx, L, ui.key('RETOUR', 'ESC'), () => { ui.overlay = null; });
  };

  // OFFRE DE CONTINUER (publicité récompensée) : compte à rebours en anneau
  Home.drawRevive = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { HH, u, Y } = L, run = game.endlessRun, RC = CC.CONFIG.revive;
    ui.dim(ctx, W, H, 0.55);
    const k = U.clamp(game.reviveT / RC.window, 0, 1), cx = W / 2, cy = Y(0.33), r = u * 0.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = u * 0.03; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = k < 0.3 ? RED : CY; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 6.283 * k); ctx.stroke();
    const n = String(Math.ceil(game.reviveT)), np = u * 0.03;
    text(ui, ctx, n, cx, cy - np * 3.5, np, '#ffffff', { align: 'center' });
    text(ui, ctx, 'CONTINUER ?', W / 2, Y(0.52), ui.fitPx(['CONTINUER ?'], W * 0.8, u * 0.013), '#ffffff', { align: 'center', skew: -0.2 });
    const sub = 'REPARS ' + Math.max(0, Math.round(RC.back)) + ' M AVANT, PROTEGE';
    text(ui, ctx, sub, W / 2, Y(0.585), ui.fitPx([sub], W * 0.8, u * 0.0054), '#c8d0dc', { align: 'center' });
    const sc = 'SCORE ' + U.formatInt(run.score);
    text(ui, ctx, sc, W / 2, Y(0.63), ui.fitPx([sc], W * 0.6, u * 0.0064), GOLD, { align: 'center' });
    // gros bouton : regarder une publicité
    const bw = W * 0.84, bh = Math.max(u * 0.2, 60 * ui.pixelRatio()), bx = W / 2 - bw / 2, by = Y(0.7);
    const on = inRect(ui, bx, by, bw, bh);
    pxRect(ctx, bx, by, bw, bh, on ? 'rgba(86,255,90,0.35)' : 'rgba(86,255,90,0.2)', GREEN, undefined, Math.max(3, bh * 0.05));
    ICON.play(ctx, bx + bh * 0.55, by + bh / 2, bh * 0.22, GREEN);
    const lp = ui.fitPx(['REGARDER UNE PUB'], bw - bh * 1.2, bh * 0.028);
    text(ui, ctx, 'REGARDER UNE PUB', bx + bh * 1.0, by + bh / 2 - lp * 3.5, lp, '#ffffff', {});
    hit(ui, bx, by, bw, bh, () => game.ads.rewarded(() => game.revive(), null, 'revive'));
    // « non merci » : discret mais large
    const nw = W * 0.5, nh = Math.max(u * 0.11, 46 * ui.pixelRatio()), nx = W / 2 - nw / 2, ny = Y(0.87);
    const np2 = ui.fitPx(['NON MERCI'], nw * 0.8, nh * 0.04);
    text(ui, ctx, 'NON MERCI', W / 2, ny + nh / 2 - np2 * 3.5, np2, '#9fb0c8', { align: 'center' });
    hit(ui, nx, ny, nw, nh, () => { ui.overlay = null; game.finishEndless(); });
  };

  // ============================================================================================================
  //   ECRAN DE RECOMPENSES (état RESULTS du mode CLASSIQUE)
  // ============================================================================================================
  const absXp = (prog, level, xp) => { let a = xp; for (let l = 1; l < level; l++) a += prog.need(l); return a; };
  const levelOf = (prog, abs) => { let l = 1; while (abs >= prog.need(l)) { abs -= prog.need(l); l++; } return { level: l, xp: abs }; };
  const ease = (k) => 1 - Math.pow(1 - U.clamp(k, 0, 1), 3);


  // v071 : animation de NOUVEAU RECORD — la fusée fait un looping (pixels), laisse une traînée, et le mot RECORD pulse
  Home.recordAnim = function (ctx, cx, cy, w, h, t, S, fitq) {
    const b = h * 0.34, c = b * 0.62, per = 3.2, ph = ((t * 0.9) % per) / per, th = (-2.4 + ph * 4.8) * Math.PI, px = Math.max(3, Math.round(h * 0.045));
    const m = (w * 0.4) / (c * 2.4 * Math.PI + b), P = (a) => ({ x: cx + m * (c * a - b * Math.sin(a)), y: cy - h * 0.12 - b * Math.cos(a) * 0.9 });
    const col = ['#ffd23a', '#ff8a2a', '#ff5a3a', '#7be8ff'];
    for (let i = 26; i >= 1; i--) {   // traînée : carrés qui s'éteignent
      const q = P(th - i * 0.05), a = 1 - i / 26; if (th - i * 0.05 < -2.4 * Math.PI) continue;
      ctx.globalAlpha = a * 0.9; ctx.fillStyle = col[i % 3]; const s = Math.max(2, Math.round(px * (1.3 - i * 0.03))); ctx.fillRect(Math.round(q.x - s / 2), Math.round(q.y - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
    const p0 = P(th), p1 = P(th + 0.02), ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    ctx.save(); ctx.translate(Math.round(p0.x), Math.round(p0.y)); ctx.rotate(ang);
    const R = (x, y, ww, hh, cc) => { ctx.fillStyle = cc; ctx.fillRect(Math.round(x * px), Math.round(y * px), Math.round(ww * px), Math.round(hh * px)); };
    R(-4, -1, 6, 2, '#f4f6f8'); R(2, -1, 2, 2, '#ff3b2e'); R(-4, -2, 2, 1, '#9aa6b4'); R(-4, 1, 2, 1, '#9aa6b4'); R(-3, -1, 1, 2, '#2a7ad0');
    R(-6, -1, 2, 2, Math.floor(t * 18) % 2 ? '#ffd23a' : '#ff8a2a');
    ctx.restore();
    // étincelles
    for (let i = 0; i < 8; i++) { const a = t * 2 + i * 0.8, rr = h * (0.35 + 0.15 * Math.sin(t * 5 + i)); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 9 + i * 2); ctx.fillStyle = '#ffd23a'; ctx.fillRect(Math.round(cx + Math.cos(a) * rr * 2.2), Math.round(cy + Math.sin(a * 1.3) * rr), px, px); }
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 8);
    const lbl = 'RECORD !', lp = Math.min(S(6.2), (w * 0.8) / Math.max(1, F.measure(lbl, 1)));
    text(null, ctx, lbl, cx, cy + h * 0.2, lp, '#ffd23a', { align: 'center' });
    ctx.globalAlpha = 1;
  };

  // ÉCRAN DE FIN — volontairement minimal : SCORE, niveau + barre d'XP (« +39 XP »), UNE mission, deux boutons.
  Home.drawResults = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T, HH, P, u, Y } = L, r = game.results, prog = game.progress;
    ui.dim(ctx, W, H, 0.8);
    const t = r.t, al = (t0, dur) => U.clamp((t - t0) / (dur || 0.25), 0, 1);
    const q = P ? Math.min(W / 390, HH / 760) : Math.min(HH / 440, W / 900), S = (v) => v * q;
    const colA = P ? { x: W / 2, w: W * 0.9 } : { x: W * 0.27, w: W * 0.44 };
    const colB = P ? colA : { x: W * 0.74, w: W * 0.42 };
    const fitq = (label, w, px) => Math.min(S(px), w / Math.max(1, F.measure(label, 1)));
    let y = T + S(P ? 40 : 26);
    // -- SCORE : compte depuis 0
    const sk = ease((t - 0.15) / 1.0), shown = Math.round(r.score * sk);
    if (t > 0.15 && sk < 1 && (r.tickAt || 0) + 0.07 < t) { r.tickAt = t; game.audio.play('xpTick', null, Math.floor(sk * 8)); }
    if (sk >= 1 && !r.scoreDone) { r.scoreDone = true; if (r.newRecord) { game.audio.play('record'); if (CC.Haptics) CC.Haptics.pattern('record'); } }
    text(ui, ctx, 'SCORE', colA.x, y, S(2.0), '#9fb0c8', { align: 'center' }); y += S(2.0) * 7 + S(8);
    const spx = fitq('000.000', colA.w * 0.8, 8.5);
    text(ui, ctx, U.formatInt(shown), colA.x, y, spx, '#ffffff', { align: 'center', outline: '#0b0e14' }); y += spx * 7 + S(14);
    ctx.globalAlpha = al(1.1, 0.3);
    if (r.newRecord) { const ah = S(P ? 110 : 80); Home.recordAnim(ctx, colA.x, y + ah * 0.5, colA.w, ah, t, S, fitq); y += ah + S(8); }   // v071 : nouveau record = looping de la fusée, rien d'autre
    if (r.materials > 0) { const nl = '+' + r.materials, nplx = fitq(nl, colA.w * 0.4, 3.0), nw2 = F.measure(nl, nplx) + nplx * 9; ICON.nut(ctx, colA.x - nw2 / 2 + nplx * 3, y + nplx * 3.6, nplx * 3.4, '#d9a441'); text(ui, ctx, nl, colA.x - nw2 / 2 + nplx * 9, y, nplx, '#d9a441', {}); y += nplx * 7 + S(8); }
    ctx.globalAlpha = 1;
    y += S(P ? 26 : 16);
    // -- XP : niveau + barre qui se remplit (et monte de niveau)
    const tBar = 1.3, dur0 = U.clamp(0.7 + r.gained / 140, 0.8, 2.2);
    const segs = [{ from: absXp(prog, r.before.level, r.before.xp), to: absXp(prog, r.after.level, r.after.xp), t0: tBar, dur: dur0 }];
    if (r.dbl) segs.push({ from: segs[0].to, to: absXp(prog, r.dbl.after.level, r.dbl.after.xp), t0: r.dbl.t0, dur: dur0 });
    let cur = segs[0].from;
    for (const s of segs) if (t >= s.t0) cur = s.from + (s.to - s.from) * ease((t - s.t0) / s.dur);
    const at = levelOf(prog, cur), tot = r.gained + (r.xpDoubled ? r.gained : 0);
    if (r.lvShown === undefined) r.lvShown = r.before.level;
    if (at.level > r.lvShown) { r.lvShown = at.level; r.lvFlash = t; game.audio.play('levelUp'); if (CC.Haptics) CC.Haptics.pattern('levelUp'); r.lvNew = at.level; }
    const bs = S(64), bx0 = colA.x - colA.w / 2, bh = S(26), bxx = bx0 + bs + S(12), bww = colA.w - bs - S(12);
    ctx.globalAlpha = al(tBar - 0.2, 0.3);
    Home.badge(ctx, bx0, y, bs, at.level, ui);
    text(ui, ctx, '+' + tot, bxx, y + bs * 0.02, fitq('+000', bww, 3.4), CY, { outline: '#0b0e14' });
    Home.meter(ctx, bxx, y + bs - bh - S(2), bww, bh, at.xp / prog.need(at.level), CY, '#1a7ad0');
    ctx.globalAlpha = 1;
    y += bs + S(P ? 36 : 20);
    // -- UNE mission
    const m = null, tM = tBar + dur0 * 0.6;   // v071 : plus de mission sur l'écran de fin
    let my = P ? y : T + S(40);
    if (m) {
      const a = al(tM, 0.3), mx = colB.x - colB.w / 2, mh = S(74);
      ctx.globalAlpha = a;
      Home.pill(ctx, mx, my, colB.w, mh, 'rgba(12,20,34,0.9)', m.justDone ? GREEN : 'rgba(255,255,255,0.3)', S(14));
      Home.icon.target(ctx, mx + mh * 0.5, my + mh * 0.5, mh * 0.24, m.justDone ? GREEN : ORANGE);
      const tx = mx + mh * 0.95, tw2 = colB.w - mh * 0.95 - S(16);
      text(ui, ctx, m.text, tx, my + S(12), fitq(m.text, tw2, 2.4), '#ffffff', {});
      Home.meter(ctx, tx, my + mh - S(30), tw2 - S(58), S(14), m.progress / m.target, m.justDone ? GREEN : ORANGE, m.justDone ? '#20a030' : '#d05a10');
      if (m.justDone) { Home.icon.check(ctx, tx + tw2 - S(30), my + mh - S(23), S(11), GREEN); }
      else text(ui, ctx, m.progress + '/' + m.target, tx + tw2, my + mh - S(30) - S(2.2) * 1.5, S(2.2), '#dfe6f0', { align: 'right' });
      if (m.justDone) text(ui, ctx, '+' + m.xp, tx + tw2, my + S(12), S(2.2), GREEN, { align: 'right' });
      ctx.globalAlpha = 1;
    }
    // niveau gagné : bandeau qui claque (avec le décor débloqué)
    if (r.lvFlash !== undefined && t - r.lvFlash < 2.2) {
      const k = t - r.lvFlash, a = Math.min(1, k * 8, (2.2 - k) * 3), sc = 1 + 0.25 * Math.max(0, 1 - k * 5);
      ctx.save();
      const bh2 = S(120), by2 = Y(0.4); ctx.globalAlpha = a * 0.95; ctx.fillStyle = 'rgba(6,8,14,0.95)'; ctx.fillRect(0, by2, W, bh2);
      ctx.fillStyle = GOLD; ctx.fillRect(0, by2, W, 3); ctx.fillRect(0, by2 + bh2 - 3, W, 3);
      ctx.globalAlpha = a;
      const s1 = 'NIVEAU ' + r.lvNew + ' !';
      text(ui, ctx, s1, W / 2, by2 + bh2 * 0.12, fitq(s1, W * 0.85, 9 * sc), GOLD, { align: 'center', skew: -0.2, outline: '#0b0e14' });
      const nw = r.newWorlds && r.newWorlds.length && r.lvNew === r.after.level ? r.newWorlds : [];
      const s2 = (nw.length ? 'NOUVEAU DECOR : ' + nw.map((w) => prog.worldName(w)).join(', ') + '   ' : '') + '';
      text(ui, ctx, s2, W / 2, by2 + bh2 * 0.68, fitq(s2, W * 0.92, 3), '#ffffff', { align: 'center' });
      ctx.restore();
    }
    // -- boutons ancrés en bas : XP x2 (publicité), REJOUER
    const ready = t > 0.6, xpDone = t > segs[0].t0 + segs[0].dur;
    const bw2 = P ? W * 0.9 : colB.w, bxb = P ? W * 0.05 : colB.x - colB.w / 2;
    const adOk = game.ads && game.ads.enabled() && !r.xpDoubled && r.gained >= 3 && !game.testMode;
    const bh1 = Math.max(S(72), 60 * ui.pixelRatio()), bh0 = Math.max(S(54), 48 * ui.pixelRatio());
    const yRe = Y(0.975) - bh1 - (P ? S(8) : 0), yAd = yRe - S(12) - bh0;
    if (adOk && xpDone) {
      const on = inRect(ui, bxb, yAd, bw2, bh0), pl = 0.92 + 0.08 * Math.sin(t * 5);
      if (PXL) pill(ctx, bxb, yAd, bw2, bh0, on ? 'rgba(52,62,74,0.97)' : 'rgba(38,45,54,0.97)', '#5a6674', bh0 * 0.3); else Home.button3d(ctx, bxb, yAd, bw2, bh0, on ? '#e8bd62' : '#ffec27', '#ffa300', '#ab5236', pl);
      Home.icon.play(ctx, bxb + bh0 * 0.55, yAd + bh0 / 2 - bh0 * 0.03, bh0 * 0.2, PXL ? '#d9a441' : '#ffffff');
      const lbl = 'X2', lpx = fitq(lbl, bw2 - bh0 * 1.2, 3.6);
      text(ui, ctx, lbl, bxb + bh0 * 1.0, yAd + bh0 / 2 - lpx * 3.6 - bh0 * 0.03, lpx, '#ffffff', { outline: '#0e4a80' });
      text(ui, ctx, 'PUB', bxb + bw2 - bh0 * 0.4, yAd + bh0 / 2 - S(2.6) * 3.6 - bh0 * 0.03, S(2.6), PXL ? '#d9a441' : '#d6f4ff', { align: 'right', outline: PXL ? null : '#0e4a80' });
      hit(ui, bxb, yAd, bw2, bh0, () => game.ads.rewarded(() => Home.doubleXp(game), null, 'xp'));
    }
    if (ready) {
      const on = inRect(ui, bxb, yRe, bw2, bh1, 0), pl = 1 + 0.02 * Math.sin(t * 5), w = bw2 * pl, x = bxb - (w - bw2) / 2;
      if (PXL) Home.button3d(ctx, x, yRe, w, bh1, on ? '#f0d28a' : '#d9a441', '#d9a441', '#9a7126', 1); else Home.button3d(ctx, x, yRe, w, bh1, on ? '#4dff7a' : '#00e436', '#009e3a', '#00632a', 1);
      const lpx = fitq('REJOUER', bw2 * 0.7, 5.2);
      text(ui, ctx, 'REJOUER', bxb + bw2 / 2, yRe + bh1 / 2 - lpx * 3.6 - bh1 * 0.03, lpx, PXL ? '#14181d' : '#ffffff', { align: 'center', outline: PXL ? null : '#8a5200' });
      hit(ui, x, yRe, w, bh1, () => { const go = () => game.goHome({ autoLaunch: false }); game.ads ? game.ads.beforeContinue(go) : go(); });
    }
    // taper ailleurs : termine les animations d'un coup
    // dès le 3e vol : toucher n'importe où relance tout de suite (sauf le bouton pub, plus haut dans la liste)
    if ((prog.P.launches || 0) >= 2 && ready) ui.buttons.push({ x: 0, y: T, w: W, h: HH, action: () => { const go = () => game.goHome({ autoLaunch: false }); game.ads ? game.ads.beforeContinue(go) : go(); } });
    else ui.buttons.push({ x: 0, y: T, w: W, h: HH, action: () => { r.t = Math.max(r.t, 6); } });
  };

  // ============================================================================================================
  //   FUSEE (onglet PROGRES) : on améliore la roquette avec les écrous gagnés en touchant les réservoirs
  // ============================================================================================================
  Home.drawUpgrades = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T, HH, P, u, Y } = L, prog = game.progress, nuts = prog.P.materials || 0;
    ui.dim(ctx, W, H, 0.9);
    const mx = W * 0.05, mw = W * 0.9, t = performance.now() * 0.001;
    // titre + écrous
    text(ui, ctx, 'FUSEE', mx, Y(0.04), ui.fitPx(['FUSEE'], W * 0.4, u * 0.012), '#d9a441', {});
    { const nl = U.formatInt(nuts), nh = u * 0.09, npx = nh * 0.075, nw = F.measure(nl, npx) + nh * 1.4, nx = W - mx - nw, ny = Y(0.036);
      pill(ctx, nx, ny, nw, nh, 'rgba(38,45,54,0.97)', '#5a6674', nh * 0.3); ICON.nut(ctx, nx + nh * 0.55, ny + nh / 2, nh * 0.3, '#d9a441'); text(ui, ctx, nl, nx + nw - nh * 0.3, ny + nh / 2 - npx * 3.6, npx, '#e8ecef', { align: 'right' }); }
    // vitrine : la roquette en grand, ses caractéristiques de chaque côté
    const py = Y(0.115), ph = HH * 0.2;
    pill(ctx, mx, py, mw, ph, 'rgba(38,45,54,0.97)', '#5a6674', ph * 0.1);
    Home.gridDraw(ctx, 'rocket', W / 2, py + ph / 2 + Math.sin(t * 2) * 2, ph * 0.78, '#e8ecef');
    const stat = (label, val, x, y, align) => { const lp = ui.fitPx([label], mw * 0.28, u * 0.004); text(ui, ctx, label, x, y, lp, '#8995a1', { align }); text(ui, ctx, val, x, y + lp * 11, ui.fitPx([val], mw * 0.28, u * 0.0075), '#d9a441', { align }); };
    const E = CC.CONFIG.endless;
    stat('ESSENCE', (E.fuelStart + prog.fuelBonus()) + ' S', mx + mw * 0.05, py + ph * 0.16, 'left');
    stat('MULTI MAX', 'X' + prog.multCap(), mx + mw * 0.05, py + ph * 0.58, 'left');
    stat('RENDEMENT', Math.round((1 - prog.drainK()) * 100) + '%', mx + mw * 0.95, py + ph * 0.16, 'right');
    stat('COQUE', String(prog.hullCharges()), mx + mw * 0.95, py + ph * 0.58, 'right');
    // cartes d'amélioration
    const cy0 = Y(0.34), chh = HH * 0.112, gap = HH * 0.014;
    CC.Progress.UPG.forEach((up, i) => {
      const y = cy0 + i * (chh + gap), lv = prog.upLevel(up.id), cost = prog.upCost(up.id), can = prog.canBuy(up.id), maxed = cost === null;
      pill(ctx, mx, y, mw, chh, 'rgba(38,45,54,0.97)', '#5a6674', chh * 0.14);
      // icône dans sa case
      const ib = chh * 0.74, ix = mx + chh * 0.13, iy = y + (chh - ib) / 2;
      pill(ctx, ix, iy, ib, ib, 'rgba(20,24,29,1)', '#5a6674', ib * 0.2);
      ICON[up.icon](ctx, ix + ib / 2, iy + ib / 2, ib * 0.28, '#d9a441');
      const bw = mw * 0.26, bh = chh * 0.6, bx2 = mx + mw - bw - chh * 0.14, by2 = y + (chh - bh) / 2;
      const tx = ix + ib + chh * 0.16, tw2 = bx2 - tx - chh * 0.1;
      text(ui, ctx, up.name, tx, y + chh * 0.15, ui.fitPx(['MULTIPLICATEUR'], tw2, chh * 0.026), '#e8ecef', {});
      // pastilles de niveau
      const pw = chh * 0.1, pg = chh * 0.05;
      for (let k = 0; k < up.max; k++) { ctx.fillStyle = k < lv ? '#d9a441' : '#14181d'; ctx.fillRect(Math.round(tx + k * (pw + pg)), Math.round(y + chh * 0.46), Math.round(pw), Math.round(pw)); if (k >= lv) { ctx.strokeStyle = '#5a6674'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(tx + k * (pw + pg)) + 0.5, Math.round(y + chh * 0.46) + 0.5, Math.round(pw) - 1, Math.round(pw) - 1); } }
      const dl = up.desc(maxed ? lv : lv + 1), dp = ui.fitPx(['-40% CONSOMMATION'], tw2, chh * 0.02);
      text(ui, ctx, maxed ? up.desc(lv) : dl, tx, y + chh * 0.7, dp, maxed ? '#8995a1' : '#d9a441', {});
      // bouton prix
      if (maxed) { text(ui, ctx, 'MAX', bx2 + bw / 2, by2 + bh / 2 - ui.fitPx(['MAX'], bw, bh * 0.04) * 3.6, ui.fitPx(['MAX'], bw, bh * 0.04), '#d9a441', { align: 'center' }); }
      else {
        if (can) Home.button3d(ctx, bx2, by2, bw, bh, '#d9a441', '#d9a441', '#9a7126', 1); else pill(ctx, bx2, by2, bw, bh, 'rgba(20,24,29,1)', '#5a6674', bh * 0.25);
        const cl = String(cost), cp = ui.fitPx([cl], bw * 0.5, bh * 0.03);
        ICON.nut(ctx, bx2 + bw * 0.22, by2 + bh * 0.47, bh * 0.18, can ? '#14181d' : '#8995a1');
        text(ui, ctx, cl, bx2 + bw * 0.86, by2 + bh * 0.46 - cp * 3.6, cp, can ? '#14181d' : '#8995a1', { align: 'right' });
        hit(ui, mx, y, mw, chh, () => { if (prog.buy(up.id)) { game.audio.play('levelUp'); if (CC.Haptics) CC.Haptics.pattern('mission'); } else game.audio.play('warnFuel'); });
      }
    });
    const hint = 'DETRUIS LES CHARS POUR GAGNER DES ECROUS', hp = ui.fitPx([hint], mw, u * 0.0036);
    text(ui, ctx, hint, W / 2, Y(0.87), hp, '#8995a1', { align: 'center' });
    backButton(ui, ctx, L, ui.key('RETOUR', 'ESC'), () => { ui.overlay = null; });
  };

  // XP ×2 : la publicité a été regardée jusqu'au bout → même gain ajouté, barre qui repart
  Home.doubleXp = function (game) {
    const r = game.results; if (!r || r.xpDoubled) return;
    const d = game.progress.doubleXp(r);
    r.xpDoubled = true; r.dbl = { after: d.after, t0: r.t + 0.15 }; r.levelUps += d.levelUps;
    if (d.newWorlds.length) r.newWorlds = (r.newWorlds || []).concat(d.newWorlds);
    r.after = r.after; game.writeSave();
    game.audio.play('target');
  };

  CC.Home = Home;
})();

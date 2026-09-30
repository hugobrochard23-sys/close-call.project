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
  const CY = '#39d4ff', GOLD = '#ffd23a', GREEN = '#56ff5a', RED = '#ff3b2e', ORANGE = '#ff7c1f', MAG = '#ff5be0', INK = '#0b0e14';

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
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // pastille : fond translucide, reflet léger sur la moitié haute, liseré
  function pill(ctx, x, y, w, h, fill, stroke, r) {
    r = r === undefined ? h / 2 : r;
    rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.5, 'rgba(255,255,255,0.03)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
    rr(ctx, x, y, w, h, r); ctx.fillStyle = g; ctx.fill();
    if (stroke) { rr(ctx, x, y, w, h, r); ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1.5, h * 0.045); ctx.stroke(); }
  }
  // ancien nom conservé : rectangle arrondi (le paramètre `n` ne sert plus)
  function pxRect(ctx, x, y, w, h, fill, stroke, n, lw) { pill(ctx, x, y, w, h, fill || 'rgba(0,0,0,0)', stroke, Math.min(h * 0.26, 22)); }
  // bouton 3D : lèvre sombre dessous, dégradé, reflet brillant, léger liseré clair
  function button3d(ctx, x, y, w, h, c1, c2, lip, pulse) {
    const r = h * 0.3, d = h * 0.09, hh = h - d;
    ctx.save(); if (pulse && pulse !== 1) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(pulse, pulse); ctx.translate(-(x + w / 2), -(y + h / 2)); }
    rr(ctx, x, y + d, w, hh, r); ctx.fillStyle = lip; ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, c1); g.addColorStop(1, c2);
    rr(ctx, x, y, w, hh, r); ctx.fillStyle = g; ctx.fill();
    const gl = ctx.createLinearGradient(0, y, 0, y + hh * 0.55); gl.addColorStop(0, 'rgba(255,255,255,0.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    rr(ctx, x + w * 0.02, y + hh * 0.05, w * 0.96, hh * 0.5, r * 0.8); ctx.fillStyle = gl; ctx.fill();
    rr(ctx, x, y, w, hh, r); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1.5, h * 0.03); ctx.stroke();
    ctx.restore();
  }
  // jauge arrondie : rail sombre, remplissage en dégradé avec reflet
  function meter(ctx, x, y, w, h, k, c1, c2) {
    rr(ctx, x - 2, y - 2, w + 4, h + 4, h); ctx.fillStyle = 'rgba(4,8,16,0.85)'; ctx.fill();
    const f = Math.max(0, Math.min(1, k)) * w;
    if (f > 1) {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2);
      rr(ctx, x, y, Math.max(f, h), h, h / 2); ctx.fillStyle = g; ctx.fill();
      rr(ctx, x + h * 0.15, y + h * 0.12, Math.max(f, h) - h * 0.3, h * 0.32, h * 0.16); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
    }
  }
  // badge de niveau : carré arrondi doré avec le numéro
  function badge(ctx, x, y, size, level, ui) {
    const g = ctx.createLinearGradient(0, y, 0, y + size); g.addColorStop(0, '#ffe45a'); g.addColorStop(1, '#e08a00');
    rr(ctx, x, y, size, size, size * 0.26); ctx.fillStyle = g; ctx.fill(); rr(ctx, x, y, size, size, size * 0.26); ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = Math.max(2, size * 0.05); ctx.stroke();
    text(ui, ctx, 'NIV', x + size / 2, y + size * 0.1, size * 0.026, '#7a4a00', { align: 'center', outline: null });
    const s = String(level), px = Math.min(size * 0.075, size * 0.66 / Math.max(1, F.measure(s, 1)));
    text(ui, ctx, s, x + size / 2, y + size * 0.36, px, '#ffffff', { align: 'center', outline: '#8a5200' });
  }
  Home.rr = rr; Home.pill = pill; Home.button3d = button3d; Home.meter = meter; Home.badge = badge;
  const F2 = F;

  const hit = (ui, x, y, w, h, action) => ui.buttons.push({ x, y, w, h, action });
  const inRect = (ui, x, y, w, h) => !ui.isTouch() && ui.mouse.x >= x && ui.mouse.x <= x + w && ui.mouse.y >= y && ui.mouse.y <= y + h;

  // barre de progression (alias de meter)
  function bar(ctx, x, y, w, h, k, color) { meter(ctx, x, y, w, h, k, color, color); }
  Home.bar = bar;

  // ---------- pictogrammes ----------
  const ICON = {
    gear(ctx, cx, cy, r, col) {
      ctx.fillStyle = col;
      for (let i = 0; i < 8; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * Math.PI / 4); ctx.fillRect(-r * 0.15, -r, r * 0.3, r * 0.45); ctx.restore(); }
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.68, 0, 6.283); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, 6.283); ctx.fill();
    },
    target(ctx, cx, cy, r, col) {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, r * 0.16);
      for (const k of [1, 0.62]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, 6.283); ctx.stroke(); }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r * 0.22, 0, 6.283); ctx.fill();
      ctx.fillRect(cx - r * 1.1, cy - r * 0.06, r * 0.5, r * 0.12); ctx.fillRect(cx + r * 0.6, cy - r * 0.06, r * 0.5, r * 0.12);
    },
    rocket(ctx, cx, cy, r, col) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(cx + r, cy); ctx.lineTo(cx + r * 0.25, cy - r * 0.32); ctx.lineTo(cx - r * 0.7, cy - r * 0.32); ctx.lineTo(cx - r * 0.7, cy + r * 0.32); ctx.lineTo(cx + r * 0.25, cy + r * 0.32); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy - r * 0.3); ctx.lineTo(cx - r * 0.75, cy - r * 0.85); ctx.lineTo(cx - r * 0.75, cy - r * 0.3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy + r * 0.3); ctx.lineTo(cx - r * 0.75, cy + r * 0.85); ctx.lineTo(cx - r * 0.75, cy + r * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(cx - r * 0.05, cy - r * 0.1, r * 0.22, r * 0.2);
    },
    nut(ctx, cx, cy, r, col) {   // écrou hexagonal doré (la monnaie : les MATERIAUX)
      const hex = (rr) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); };
      hex(r); ctx.fillStyle = '#7a4a00'; ctx.fill();
      const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ffc820'); g.addColorStop(1, '#c87800');
      hex(r * 0.88); ctx.fillStyle = g; ctx.fill(); hex(r * 0.88); ctx.strokeStyle = '#fff8c8'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.36, 0, 6.283); ctx.fillStyle = '#5a3400'; ctx.fill();
    },
    gem(ctx, cx, cy, r, col) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.8, cy - r * 0.15); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.8, cy - r * 0.15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx - r * 0.8, cy - r * 0.15); ctx.lineTo(cx - r * 0.05, cy - r * 0.05); ctx.closePath(); ctx.fill();
    },
    flame(ctx, cx, cy, r, col) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 0.1, cx + r * 0.55, cy + r * 0.55); ctx.quadraticCurveTo(cx, cy + r * 1.05, cx - r * 0.55, cy + r * 0.55); ctx.quadraticCurveTo(cx - r * 0.9, cy - r * 0.1, cx, cy - r); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.15); ctx.quadraticCurveTo(cx + r * 0.38, cy + r * 0.25, cx + r * 0.2, cy + r * 0.6); ctx.quadraticCurveTo(cx, cy + r * 0.8, cx - r * 0.2, cy + r * 0.6); ctx.quadraticCurveTo(cx - r * 0.38, cy + r * 0.25, cx, cy - r * 0.15); ctx.fill();
    },
    play(ctx, cx, cy, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.8); ctx.lineTo(cx + r * 0.9, cy); ctx.lineTo(cx - r * 0.6, cy + r * 0.8); ctx.closePath(); ctx.fill(); },
    check(ctx, cx, cy, r, col) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, r * 0.28); ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy); ctx.lineTo(cx - r * 0.15, cy + r * 0.55); ctx.lineTo(cx + r * 0.8, cy - r * 0.6); ctx.stroke(); },
    lock(ctx, cx, cy, r, col) { ctx.fillStyle = col; ctx.fillRect(cx - r * 0.7, cy - r * 0.05, r * 1.4, r * 0.95); ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, r * 0.22); ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.45, Math.PI, 0); ctx.stroke(); },
    home(ctx, cx, cy, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + r * 0.65, cy); ctx.lineTo(cx + r * 0.65, cy + r * 0.85); ctx.lineTo(cx - r * 0.65, cy + r * 0.85); ctx.lineTo(cx - r * 0.65, cy); ctx.lineTo(cx - r, cy); ctx.closePath(); ctx.fill(); },
  };
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
      ctx.fillStyle = '#c87800'; ctx.fillRect(cx - r * 0.1, cy + r * 0.3, r * 0.2, r * 0.3); rr(ctx, cx - r * 0.45, cy + r * 0.58, r * 0.9, r * 0.3, r * 0.08); ctx.fillStyle = grad(ctx, cy + r * 0.5, cy + r * 0.9, '#ffd23a', '#b87800'); ctx.fill(); ctx.stroke();
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
      ICON.nut(ctx, cx, cy + r * 0.45, r * 0.26, '#ffc820');
    },
  };
  // barre d'onglets du bas : MISSION · PROGRES · [ACCUEIL surélevé, jaune] · DEFIS · BOUTIQUE (comme les jeux mobiles)
  function tabBar(ui, ctx, L, tabs) {
    const { W, HH, T, u } = L, bh = Math.min(u * 0.2, HH * 0.11), y0 = T + HH - bh, tw = W / tabs.length;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + bh); g.addColorStop(0, 'rgba(24,34,56,0.94)'); g.addColorStop(1, 'rgba(8,12,22,0.97)');
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, bh); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(0, y0, W, 2);
    const px = Math.min.apply(null, tabs.map((t) => ui.fitPx([t.label], tw * 0.92, bh * 0.05)));
    tabs.forEach((t, i) => {
      const cx = tw * (i + 0.5), r = bh * 0.3;
      if (t.active) {
        const lift = bh * 0.28;
        rr(ctx, cx - tw * 0.46, y0 - lift, tw * 0.92, bh + lift, bh * 0.2); ctx.fillStyle = grad(ctx, y0 - lift, y0 + bh, '#ffe860', '#ffb800'); ctx.fill(); ctx.strokeStyle = '#fff8c0'; ctx.lineWidth = 2; ctx.stroke();
        TABICON[t.icon](ctx, cx, y0 - lift + bh * 0.42, r * 1.25);
        text(ui, ctx, t.label, cx, y0 + bh * 0.6, px, '#ffffff', { align: 'center', outline: '#8a5200' });
      } else {
        const on = inRect(ui, cx - tw / 2, y0, tw, bh);
        if (on) { rr(ctx, cx - tw * 0.45, y0 + 4, tw * 0.9, bh - 8, bh * 0.2); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill(); }
        TABICON[t.icon](ctx, cx, y0 + bh * 0.36, r);
        text(ui, ctx, t.label, cx, y0 + bh * 0.68, px, '#e6edf8', { align: 'center', outline: '#05080e' });
        hit(ui, cx - tw / 2, y0, tw, bh, t.action);
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
    // 2. niveau et XP (haut gauche) ; tout le bloc mène à l'écran PROGRESSION
    const bs = u * 0.135, bx = margin, by = Y(0.028) + (P ? 0 : 0);
    levelBadge(ui, ctx, game, L, bx, by, bs, () => { ui.overlay = 'progress'; });
    const xw = u * (P ? 0.38 : 0.3), xx = bx + bs + u * 0.03, xk = prog.xp / prog.need(prog.level);
    bar(ctx, xx, by + bs * 0.52, xw, bs * 0.2, xk, CY);
    text(ui, ctx, prog.rank(prog.level), xx, by + bs * 0.06, ui.fitPx(['COMMANDANT'], xw, bs * 0.04), '#e8eef8', {});
    text(ui, ctx, prog.xp + ' / ' + prog.need(prog.level) + ' XP', xx, by + bs * 0.8, ui.fitPx(['0000 / 0000 XP'], xw, bs * 0.03), '#9fb0c8', {});
    // matériaux possédés (à gauche de l'engrenage)
    { const mat = U.formatInt(prog.P.materials || 0), mh = u * 0.085, mpx = mh * 0.062, mw = F.measure(mat, mpx) + mh * 1.4, mx = W - margin - u * 0.11 - u * 0.03 - mw;
      pill(ctx, mx, by + bs * 0.5 - mh / 2 + 2, mw, mh, 'rgba(10,16,28,0.7)', 'rgba(255,255,255,0.35)');
      ICON.nut(ctx, mx + mh * 0.55, by + bs * 0.5 + 2, mh * 0.3, '#ffc820');
      text(ui, ctx, mat, mx + mw - mh * 0.35, by + bs * 0.5 + 2 - mpx * 3.6, mpx, '#ffffff', { align: 'right', outline: '#0a0e16' }); }
    // réglages (haut droite)
    const gr = u * 0.055, gx = W - margin - gr, gy = by + gr;
    pxRect(ctx, gx - gr, gy - gr, 2 * gr, 2 * gr, inRect(ui, gx - gr, gy - gr, 2 * gr, 2 * gr) ? 'rgba(255,255,255,0.2)' : 'rgba(8,12,20,0.7)', '#9fb0c8', Math.round(gr * 0.28), 2);
    ICON.gear(ctx, gx, gy, gr * 0.58, '#c8d4e6');
    hit(ui, gx - gr * 1.1, gy - gr * 1.1, gr * 2.2, gr * 2.2, () => { ui.overlay = 'msettings'; });
    // logo
    const logo = 'COLD IMPACT', lpx = ui.fitPx([logo], W * (P ? 0.78 : 0.42), u * 0.0155);
    const ly = Y(P ? 0.135 : 0.03);
    text(ui, ctx, 'COLD', W / 2 - tw(logo, lpx) / 2, ly, lpx, '#8fe4ff', { skew: -0.22 });
    text(ui, ctx, 'IMPACT', W / 2 - tw(logo, lpx) / 2 + tw('COLD ', lpx), ly, lpx, '#ffffff', { skew: -0.22 });
    const best = prog.P.best;
    if (best > 0) text(ui, ctx, 'RECORD ' + U.formatInt(best), W / 2, ly + lpx * 9.5, ui.fitPx(['RECORD 000.000'], W * 0.5, u * 0.0058), '#ffd23a', { align: 'center' });
    // 1. la roquette : anneau pulsant + doigt qui touche (les 3 premiers vols : consigne écrite en plus)
    // 4. barre d'onglets en bas (style jeu mobile) et 3. mission la plus avancée juste au-dessus
    const barH = tabBar(ui, ctx, L, [
      { icon: 'mission', label: 'MISSION', action: () => { ui.overlay = 'quests'; } },
      { icon: 'trophy', label: 'PROGRES', action: () => { ui.overlay = 'progress'; } },
      { icon: 'home', label: 'ACCUEIL', active: true },
      { icon: 'star', label: 'DEFIS', action: () => { ui.overlay = 'defi'; } },
      { icon: 'shop', label: 'BOUTIQUE', action: () => { ui.overlay = 'shop'; } }]);
    const m = prog.tracked();
    if (m) {
      const mw = W - margin * 2, mh = u * 0.115, mx = margin, my = T + HH - barH - mh - u * 0.06;
      const on = inRect(ui, mx, my, mw, mh);
      pill(ctx, mx, my, mw, mh, on ? 'rgba(255,255,255,0.2)' : 'rgba(8,12,20,0.78)', 'rgba(255,255,255,0.35)', mh * 0.3);
      ICON.target(ctx, mx + mh * 0.5, my + mh * 0.5, mh * 0.27, ORANGE);
      const tx = mx + mh * 1.0, mp = ui.fitPx([prog.missionText(m)], mw - mh * 1.1 - mh * 1.7, mh * 0.04);
      text(ui, ctx, prog.missionText(m), tx, my + mh * 0.14, mp, '#ffffff', {});
      meter(ctx, tx, my + mh * 0.62, mw - mh * 1.1 - mh * 1.7, mh * 0.16, m.progress / m.target, '#ffa040', '#ff6a10');
      text(ui, ctx, m.progress + '/' + m.target, mx + mw - mh * 0.3, my + mh * 0.14, mp, '#dfe6f0', { align: 'right' });
      text(ui, ctx, '+' + m.xp + ' XP', mx + mw - mh * 0.3, my + mh * 0.54, mp, CY, { align: 'right' });
      hit(ui, mx, my, mw, mh, () => { ui.overlay = 'quests'; });
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
    const px = ui.fitPx([label], bw * 0.7, bh * 0.026);
    text(ui, ctx, label, W / 2, by + bh / 2 - px * 3.5, px, '#ffffff', { align: 'center' });
    hit(ui, bx, by, bw, bh, action);
  }
  Home.backButton = backButton;

  // MISSIONS : trois lignes (libellé, barre, récompense)
  Home.drawQuests = function (ui, ctx, game, W, H) {
    const L = frame(ui, ctx, game, W, H, 'MISSION', ORANGE), { HH, u, Y, P } = L, prog = game.progress;
    const rowH = Math.min(u * 0.34, HH * 0.19), x0 = W * 0.06, w = W * 0.88;
    text(ui, ctx, 'CHAQUE MISSION FINIE RAPPORTE DE L\'XP', W / 2, Y(0.115), ui.fitPx(['CHAQUE MISSION FINIE RAPPORTE DE L\'XP'], w, u * 0.0052), '#9fb0c8', { align: 'center' });
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
      text(ui, ctx, done ? 'TERMINEE' : '+' + m.xp + ' XP', tx, y + rowH * 0.76, ui.fitPx(['+000 XP'], tW * 0.5, rowH * 0.028), done ? GREEN : CY, {});
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
    const ids = Object.keys(cfg.worlds), n = ids.length, rw = W * 0.86, rh = Math.min(u * 0.085, HH * 0.052);
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
    const sp = ui.fitPx(['DISTANCE TOTALE   000.000 M'], rw, u * 0.0056);
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
    const rk = r.newRecord ? 'NOUVEAU RECORD !' : 'MEILLEUR  ' + U.formatInt(r.best), rp = fitq(rk, colA.w, 2.8), pulse = r.newRecord ? 0.75 + 0.25 * Math.sin(t * 8) : 1;
    ctx.globalAlpha = al(1.1, 0.3) * pulse;
    text(ui, ctx, rk, colA.x, y, rp, r.newRecord ? GOLD : '#c8d0dc', { align: 'center' }); ctx.globalAlpha = 1;
    y += rp * 7 + S(P ? 40 : 26);
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
    text(ui, ctx, '+' + tot + ' XP', bxx, y + bs * 0.02, fitq('+000 XP', bww, 3.4), CY, { outline: '#0b0e14' });
    Home.meter(ctx, bxx, y + bs - bh - S(2), bww, bh, at.xp / prog.need(at.level), CY, '#1a7ad0');
    ctx.globalAlpha = 1;
    y += bs + S(P ? 36 : 20);
    // -- UNE mission
    const m = r.mission, tM = tBar + dur0 * 0.6;
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
      if (m.justDone) text(ui, ctx, '+' + m.xp + ' XP', tx + tw2, my + S(12), S(2.2), GREEN, { align: 'right' });
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
      const s2 = (nw.length ? 'NOUVEAU DECOR : ' + nw.map((w) => prog.worldName(w)).join(', ') + '   ' : '') + '+' + CC.CONFIG.progress.levelMaterials + ' MATERIAUX';
      text(ui, ctx, s2, W / 2, by2 + bh2 * 0.68, fitq(s2, W * 0.92, 3), '#ffffff', { align: 'center' });
      ctx.restore();
    }
    // -- boutons ancrés en bas : XP x2 (publicité), REJOUER
    const ready = t > 0.9, xpDone = t > segs[0].t0 + segs[0].dur;
    const bw2 = P ? W * 0.9 : colB.w, bxb = P ? W * 0.05 : colB.x - colB.w / 2;
    const adOk = game.ads && game.ads.enabled() && !r.xpDoubled && r.gained >= 25 && !game.testMode;
    const bh1 = Math.max(S(72), 60 * ui.pixelRatio()), bh0 = Math.max(S(54), 48 * ui.pixelRatio());
    const yRe = Y(0.975) - bh1 - (P ? S(8) : 0), yAd = yRe - S(12) - bh0;
    if (adOk && xpDone) {
      const on = inRect(ui, bxb, yAd, bw2, bh0), pl = 0.92 + 0.08 * Math.sin(t * 5);
      Home.button3d(ctx, bxb, yAd, bw2, bh0, on ? '#5ee0ff' : '#39c0f0', '#1a86d0', '#0e5a95', pl);
      Home.icon.play(ctx, bxb + bh0 * 0.55, yAd + bh0 / 2 - bh0 * 0.03, bh0 * 0.2, '#ffffff');
      const lbl = 'XP X2', lpx = fitq(lbl, bw2 - bh0 * 1.2, 3.6);
      text(ui, ctx, lbl, bxb + bh0 * 1.0, yAd + bh0 / 2 - lpx * 3.6 - bh0 * 0.03, lpx, '#ffffff', { outline: '#0e4a80' });
      text(ui, ctx, 'PUB', bxb + bw2 - bh0 * 0.4, yAd + bh0 / 2 - S(2.6) * 3.6 - bh0 * 0.03, S(2.6), '#d6f4ff', { align: 'right', outline: '#0e4a80' });
      hit(ui, bxb, yAd, bw2, bh0, () => game.ads.rewarded(() => Home.doubleXp(game), null, 'xp'));
    }
    if (ready) {
      const on = inRect(ui, bxb, yRe, bw2, bh1, 0), pl = 1 + 0.02 * Math.sin(t * 5), w = bw2 * pl, x = bxb - (w - bw2) / 2;
      Home.button3d(ctx, x, yRe, w, bh1, on ? '#fff06a' : '#ffe040', '#ffb000', '#b87800', 1);
      const lpx = fitq('REJOUER', bw2 * 0.7, 5.2);
      text(ui, ctx, 'REJOUER', bxb + bw2 / 2, yRe + bh1 / 2 - lpx * 3.6 - bh1 * 0.03, lpx, '#ffffff', { align: 'center', outline: '#8a5200' });
      hit(ui, x, yRe, w, bh1, () => { const go = () => game.goHome({ autoLaunch: false }); game.ads ? game.ads.beforeContinue(go) : go(); });
    }
    // taper ailleurs : termine les animations d'un coup
    ui.buttons.push({ x: 0, y: T, w: W, h: HH, action: () => { r.t = Math.max(r.t, 6); } });
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

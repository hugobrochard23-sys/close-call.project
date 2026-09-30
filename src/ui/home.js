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

  // rectangle « pixel » : coins échancrés d'un cran (identité du jeu), fond + liseré
  function pxRect(ctx, x, y, w, h, fill, stroke, n, lw) {
    n = n === undefined ? Math.max(2, Math.round(h * 0.09)) : n; lw = lw || Math.max(1.5, h * 0.045);
    const path = () => { ctx.beginPath(); ctx.moveTo(x + n, y); ctx.lineTo(x + w - n, y); ctx.lineTo(x + w, y + n); ctx.lineTo(x + w, y + h - n); ctx.lineTo(x + w - n, y + h); ctx.lineTo(x + n, y + h); ctx.lineTo(x, y + h - n); ctx.lineTo(x, y + n); ctx.closePath(); };
    if (fill) { path(); ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { path(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  Home.pxRect = pxRect;
  const hit = (ui, x, y, w, h, action) => ui.buttons.push({ x, y, w, h, action });
  const inRect = (ui, x, y, w, h) => !ui.isTouch() && ui.mouse.x >= x && ui.mouse.x <= x + w && ui.mouse.y >= y && ui.mouse.y <= y + h;

  // barre de progression pixel (fond sombre, remplissage, reflet)
  function bar(ctx, x, y, w, h, k, color, back) {
    ctx.fillStyle = '#05070b'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = back || '#2a2f3a'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color; ctx.fillRect(x, y, Math.max(0, w * U.clamp(k, 0, 1)), h);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x, y, Math.max(0, w * U.clamp(k, 0, 1)), Math.max(1, h * 0.28));
  }
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

  // bouton rond d'icône avec libellé dessous (accueil)
  function roundBtn(ui, ctx, cx, cy, r, icon, label, color, action, badge) {
    const on = inRect(ui, cx - r, cy - r, 2 * r, 2 * r + r * 0.9);
    const y0 = cy - r;
    pxRect(ctx, cx - r, y0, 2 * r, 2 * r, on ? 'rgba(255,255,255,0.22)' : 'rgba(8,12,20,0.78)', color, Math.round(r * 0.28), Math.max(2, r * 0.07));
    if (icon === 'star') ui.star(ctx, cx, cy, r * 0.6, true, color);
    else if (icon === 'trophy') ui.trophy(ctx, cx, cy - r * 0.05, r * 1.1, color, true);
    else ICON[icon](ctx, cx, cy, r * 0.55, color);
    const px = Math.max(ui.fitPx([label], r * 3.4, r * 0.075), Math.min(1.5, r * 0.06));
    text(ui, ctx, label, cx, cy + r + r * 0.18, px, '#dfe6f0', { align: 'center' });
    if (badge) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(cx + r * 0.8, cy - r * 0.8, r * 0.26, 0, 6.283); ctx.fill(); }
    hit(ui, cx - r * 1.05, y0 - r * 0.05, r * 2.1, r * 2.3, action);
  }

  // ---------- badge de niveau + barre d'XP ----------
  function levelBadge(ui, ctx, game, L, x, y, size, action) {
    const P = game.progress, lv = P.level;
    pxRect(ctx, x, y, size, size, 'rgba(8,12,20,0.85)', GOLD, Math.round(size * 0.16), Math.max(2, size * 0.06));
    text(ui, ctx, 'NIV', x + size / 2, y + size * 0.13, size * 0.03, '#c8d0dc', { align: 'center' });
    const s = String(lv), px = Math.min(size * 0.075, size * 0.72 / (s.length * 8.4));
    text(ui, ctx, s, x + size / 2, y + size * 0.42, px, GOLD, { align: 'center' });
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
    if (game.state === 'MENU' && pad.mode === 'idle') this.cue(ui, ctx, game, L, touch);
    // 3. mission la plus avancée
    const m = prog.tracked();
    if (m) {
      const mw = W - margin * 2 - (P ? 0 : u * 0.5), mh = u * 0.115, mx = margin, my = Y(P ? 0.79 : 0.855);
      const on = inRect(ui, mx, my, mw, mh);
      pxRect(ctx, mx, my, mw, mh, on ? 'rgba(255,255,255,0.18)' : 'rgba(8,12,20,0.78)', 'rgba(159,176,200,0.6)', Math.round(mh * 0.14));
      ICON.target(ctx, mx + mh * 0.5, my + mh * 0.5, mh * 0.27, ORANGE);
      const tx = mx + mh * 1.0, mp = ui.fitPx([prog.missionText(m)], mw - mh * 1.1 - mh * 1.7, mh * 0.04);
      text(ui, ctx, prog.missionText(m), tx, my + mh * 0.16, mp, '#f4f4f4', {});
      bar(ctx, tx, my + mh * 0.6, mw - mh * 1.1 - mh * 1.7, mh * 0.16, m.progress / m.target, ORANGE);
      text(ui, ctx, m.progress + '/' + m.target, mx + mw - mh * 0.25, my + mh * 0.16, mp, '#c8d0dc', { align: 'right' });
      text(ui, ctx, '+' + m.xp + ' XP', mx + mw - mh * 0.25, my + mh * 0.56, mp, CY, { align: 'right' });
      hit(ui, mx, my, mw, mh, () => { ui.overlay = 'quests'; });
    }
    // 4. icônes secondaires (paysage : colonne à droite ; portrait : rangée en bas)
    const items = [['target', 'MISSIONS', ORANGE, () => { ui.overlay = 'quests'; }], ['trophy', 'PROGRES', GOLD, () => { ui.overlay = 'progress'; }],
      ['star', 'DEFIS', '#8fd0ff', () => { ui.overlay = 'defi'; }], ['rocket', 'BOUTIQUE', GREEN, () => { ui.overlay = 'shop'; }]];
    const r = u * (P ? 0.085 : 0.105);
    items.forEach((it, i) => {
      if (P) roundBtn(ui, ctx, W * (0.14 + i * 0.24), Y(0.925) - r * 0.2, r, it[0], it[1], it[2], it[3]);
      else roundBtn(ui, ctx, W - margin - r * 1.4 - (i % 2) * (r * 3.0), Y(0.3 + Math.floor(i / 2) * 0.33), r, it[0], it[1], it[2], it[3]);
    });
    if (!touch) text(ui, ctx, 'ESPACE OU CLIC : LANCER    F1 : TOUCHES', W / 2, Y(0.975), ui.fitPx(['ESPACE OU CLIC : LANCER    F1 : TOUCHES'], W * 0.8, u * 0.0032), '#8a96a8', { align: 'center' });
    text(ui, ctx, CC.CONFIG.version.toUpperCase(), W - margin, Y(0.985), u * 0.0022, '#5d6878', { align: 'right' });
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
    const L = frame(ui, ctx, game, W, H, 'MISSIONS', ORANGE), { HH, u, Y, P } = L, prog = game.progress;
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
    const tip = 'ELLES SE RENOUVELLENT APRES CHAQUE VOL';
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

  Home.drawResults = function (ui, ctx, game, W, H) {
    const L = Home.layout(ui, W, H), { T, HH, P, u, Y } = L, r = game.results, prog = game.progress;
    ui.dim(ctx, W, H, 0.78);
    const t = r.t, al = (t0, dur) => U.clamp((t - t0) / (dur || 0.25), 0, 1);
    // échelle : tailles pensées pour un écran de 390 points de large ; réduites si la hauteur manque
    const q = P ? Math.min(W / 390, HH / 780) : Math.min(HH / 470, W / 900), S = (v) => v * q;
    const colA = P ? { x: W / 2, w: W * 0.92 } : { x: W * 0.27, w: W * 0.46 };
    const colB = P ? colA : { x: W * 0.74, w: W * 0.44 };
    const fitq = (label, w, px) => Math.min(S(px), w / Math.max(1, F.measure(label, 1)));
    let y = T + S(P ? 16 : 14);
    // -- titre
    const ttl = 'PARTIE TERMINEE  -  ' + r.cause, tp = fitq(ttl, colA.w, 1.7);
    text(ui, ctx, ttl, colA.x, y, tp, '#9fb0c8', { align: 'center' }); y += tp * 7 + S(12);
    // -- score : compte à rebours depuis 0
    const sk = ease((t - 0.15) / 1.0), shown = Math.round(r.score * sk);
    if (t > 0.15 && sk < 1 && (r.tickAt || 0) + 0.07 < t) { r.tickAt = t; game.audio.play('xpTick', null, Math.floor(sk * 8)); }
    if (sk >= 1 && !r.scoreDone) { r.scoreDone = true; if (r.newRecord) { game.audio.play('record'); if (CC.Haptics) CC.Haptics.pattern('record'); } }
    text(ui, ctx, 'SCORE', colA.x, y, S(1.6), '#9fb0c8', { align: 'center' }); y += S(1.6) * 7 + S(6);
    const spx = fitq('000.000', colA.w * 0.8, 5.4);
    text(ui, ctx, U.formatInt(shown), colA.x, y, spx, '#ffffff', { align: 'center', outline: '#0b0e14' }); y += spx * 7 + S(12);
    const rk = r.newRecord ? 'NOUVEAU RECORD !' : r.first ? 'PREMIER VOL !' : 'MEILLEUR ' + U.formatInt(r.best);
    const rp = fitq(rk, colA.w, 2.4), pulse = r.newRecord ? 0.75 + 0.25 * Math.sin(t * 8) : 1;
    ctx.globalAlpha = al(1.1, 0.3) * pulse;
    text(ui, ctx, rk, colA.x, y, rp, r.newRecord || r.first ? GOLD : '#c8d0dc', { align: 'center' }); ctx.globalAlpha = 1;
    y += rp * 7 + S(14);
    // -- pastilles : distance, éclats, cibles
    const chips = [['rocket', U.formatInt(r.dist) + ' M', '#8fd0ff'], ['gem', String(r.stats.cells), CY], ['target', String(r.stats.targets), ORANGE]];
    const gap = colA.w * 0.03, chw = (colA.w - gap * 2) / 3, chh = S(46);
    chips.forEach((c, i) => {
      const x = colA.x - colA.w / 2 + i * (chw + gap);
      ctx.globalAlpha = al(1.0 + i * 0.12, 0.25);
      pxRect(ctx, x, y, chw, chh, 'rgba(12,18,30,0.9)', 'rgba(159,176,200,0.5)', Math.round(chh * 0.14));
      ICON[c[0]](ctx, x + chh * 0.5, y + chh * 0.5, chh * 0.24, c[2]);
      const cp = fitq(c[1], chw - chh * 0.95, 2.0);
      text(ui, ctx, c[1], x + chh * 0.92, y + chh * 0.5 - cp * 3.5, cp, '#ffffff', {});
    });
    ctx.globalAlpha = 1; y += chh + S(16);
    // -- XP : lignes qui apparaissent une à une, puis total et barre (qui se remplit et monte de niveau)
    const tL = 1.3, lp = fitq('NOUVEAU RECORD   +000', colA.w * 0.9, 2.0), lineH = lp * 7 + S(7);
    r.lines.forEach((l, i) => {
      const a = al(tL + i * 0.3, 0.2); if (a <= 0) return;
      ctx.globalAlpha = a; const ly = y + i * lineH;
      text(ui, ctx, l.label, colA.x - colA.w * 0.45, ly, lp, '#dfe6f0', {});
      text(ui, ctx, '+' + l.v, colA.x + colA.w * 0.45, ly, lp, CY, { align: 'right' });
      if (!r['ln' + i]) { r['ln' + i] = true; game.audio.play('xpTick', null, i); }
    });
    ctx.globalAlpha = 1; y += r.lines.length * lineH + S(8);
    const tBar = tL + r.lines.length * 0.3 + 0.25, tot = r.gained + (r.xpDoubled ? r.gained : 0);
    ctx.globalAlpha = al(tBar - 0.2, 0.3);
    const xp = fitq('XP +0000', colA.w * 0.7, 3.8);
    text(ui, ctx, 'XP  +' + tot, colA.x, y, xp, CY, { align: 'center', outline: '#0b0e14' }); ctx.globalAlpha = 1;
    y += xp * 7 + S(12);
    // segments de la barre : [avant → après] puis [après → après la pub]
    const dur0 = U.clamp(0.7 + r.gained / 140, 0.8, 2.2);
    const segs = [{ from: absXp(prog, r.before.level, r.before.xp), to: absXp(prog, r.after.level, r.after.xp), t0: tBar, dur: dur0 }];
    if (r.dbl) segs.push({ from: segs[0].to, to: absXp(prog, r.dbl.after.level, r.dbl.after.xp), t0: r.dbl.t0, dur: dur0 });
    let cur = segs[0].from;
    for (const s of segs) if (t >= s.t0) cur = s.from + (s.to - s.from) * ease((t - s.t0) / s.dur);
    const at = levelOf(prog, cur);
    if (r.lvShown === undefined) r.lvShown = r.before.level;
    if (at.level > r.lvShown) { r.lvShown = at.level; r.lvFlash = t; game.audio.play('levelUp'); if (CC.Haptics) CC.Haptics.pattern('levelUp'); r.lvNew = at.level; }
    // badge de niveau (niveau animé) + barre
    const bs = S(50), bx0 = colA.x - colA.w / 2;
    pxRect(ctx, bx0, y, bs, bs, 'rgba(8,12,20,0.9)', GOLD, Math.round(bs * 0.16), Math.max(2, bs * 0.06));
    text(ui, ctx, 'NIV', bx0 + bs / 2, y + bs * 0.12, bs * 0.03, '#c8d0dc', { align: 'center' });
    { const s = String(at.level), px = Math.min(bs * 0.08, bs * 0.7 / (s.length * 8.4)); text(ui, ctx, s, bx0 + bs / 2, y + bs * 0.4, px, GOLD, { align: 'center' }); }
    const bxx = bx0 + bs + S(10), bww = colA.w - bs - S(10), bh = S(20);
    bar(ctx, bxx, y + bs * 0.5 - bh / 2, bww, bh, at.xp / prog.need(at.level), CY);
    { const lab = Math.round(at.xp) + ' / ' + prog.need(at.level); text(ui, ctx, lab, bxx + bww / 2, y + bs * 0.5 - S(1.6) * 3.5, S(1.6), '#ffffff', { align: 'center', outline: '#0b0e14' }); }
    y += bs + S(16);
    // -- missions (paysage : colonne de droite)
    let my = P ? y : T + S(24);
    const tM = tBar + dur0 * 0.6;
    text(ui, ctx, 'MISSIONS', colB.x - colB.w / 2, my, S(1.7), '#9fb0c8', {}); my += S(1.7) * 7 + S(8);
    const mrh = S(50);
    r.missions.forEach((m, i) => {
      const a = al(tM + i * 0.15, 0.25); if (a <= 0) return;
      ctx.globalAlpha = a; const yy = my + i * (mrh + S(7)), mx = colB.x - colB.w / 2;
      pxRect(ctx, mx, yy, colB.w, mrh, 'rgba(12,18,30,0.9)', m.justDone ? GREEN : 'rgba(159,176,200,0.45)', Math.round(mrh * 0.12));
      const tp2 = fitq(m.text, colB.w - S(104), 1.9);
      text(ui, ctx, m.text, mx + S(10), yy + S(8), tp2, '#f4f4f4', {});
      bar(ctx, mx + S(10), yy + mrh - S(18), colB.w - S(104), S(9), m.progress / m.target, m.done ? GREEN : ORANGE);
      const np = S(1.7);
      if (m.justDone) { ICON.check(ctx, mx + colB.w - S(30), yy + mrh * 0.36, S(11), GREEN); text(ui, ctx, '+' + m.xp + ' XP', mx + colB.w - S(30), yy + mrh - S(20), np * 0.9, GREEN, { align: 'center' }); }
      else text(ui, ctx, m.progress + '/' + m.target, mx + colB.w - S(10), yy + mrh * 0.5 - np * 3.5, np, '#c8d0dc', { align: 'right' });
      ctx.globalAlpha = 1;
    });
    my += 3 * (mrh + S(7));
    // niveau gagné : bandeau qui claque (avec les décors débloqués)
    if (r.lvFlash !== undefined && t - r.lvFlash < 2.2) {
      const k = t - r.lvFlash, a = Math.min(1, k * 8, (2.2 - k) * 3), sc = 1 + 0.25 * Math.max(0, 1 - k * 5);
      ctx.save();
      const bh2 = S(120), by2 = Y(0.4); ctx.globalAlpha = a * 0.94; ctx.fillStyle = 'rgba(6,8,14,0.95)'; ctx.fillRect(0, by2, W, bh2);
      ctx.fillStyle = GOLD; ctx.fillRect(0, by2, W, 3); ctx.fillRect(0, by2 + bh2 - 3, W, 3);
      ctx.globalAlpha = a;
      const s1 = 'NIVEAU ' + r.lvNew + ' !';
      text(ui, ctx, s1, W / 2, by2 + bh2 * 0.14, fitq(s1, W * 0.85, 6.4 * sc), GOLD, { align: 'center', skew: -0.2, outline: '#0b0e14' });
      const nw = r.newWorlds && r.newWorlds.length && r.lvNew === r.after.level ? r.newWorlds : [];
      const s2 = nw.length ? 'NOUVEAU DECOR : ' + nw.map((w) => prog.worldName(w)).join(', ') : prog.rank(r.lvNew);
      text(ui, ctx, s2, W / 2, by2 + bh2 * 0.68, fitq(s2, W * 0.92, 2.3), '#ffffff', { align: 'center' });
      ctx.restore();
    }
    // -- boutons : XP ×2 (publicité récompensée), REJOUER — ancrés en bas de l'écran
    const ready = t > 0.9, xpDone = t > segs[0].t0 + segs[0].dur;
    const bw2 = P ? W * 0.9 : colB.w, bxb = P ? W * 0.05 : colB.x - colB.w / 2;
    const adOk = game.ads && game.ads.enabled() && !r.xpDoubled && r.gained >= 25 && !game.testMode;
    const bh1 = Math.max(S(64), 56 * ui.pixelRatio()), bh0 = Math.max(S(46), 46 * ui.pixelRatio());
    const yRe = Y(0.975) - bh1 - (P ? S(6) : 0), yAd = yRe - S(10) - bh0;
    if (adOk && xpDone) {
      const on = inRect(ui, bxb, yAd, bw2, bh0), pl = 0.85 + 0.15 * Math.sin(t * 5);
      pxRect(ctx, bxb, yAd, bw2, bh0, on ? 'rgba(57,212,255,0.4)' : 'rgba(57,212,255,' + (0.16 * pl) + ')', CY, undefined, Math.max(2.5, bh0 * 0.05));
      ICON.play(ctx, bxb + bh0 * 0.5, yAd + bh0 / 2, bh0 * 0.2, CY);
      const lbl = 'XP X2  +' + r.gained + '   PUB', lpx = fitq(lbl, bw2 - bh0 * 1.2, 2.3);
      text(ui, ctx, lbl, bxb + bh0 * 0.95, yAd + bh0 / 2 - lpx * 3.5, lpx, '#ffffff', {});
      hit(ui, bxb, yAd, bw2, bh0, () => game.ads.rewarded(() => Home.doubleXp(game), null, 'xp'));
    }
    if (ready) {
      const on = inRect(ui, bxb, yRe, bw2, bh1), pl = 1 + 0.025 * Math.sin(t * 5), w = bw2 * pl, x = bxb - (w - bw2) / 2;
      pxRect(ctx, x, yRe, w, bh1, on ? '#ffe45a' : GOLD, '#fff6b0', undefined, Math.max(3, bh1 * 0.05));
      const lpx = fitq('REJOUER', bw2 * 0.6, 4.2);
      text(ui, ctx, 'REJOUER', bxb + bw2 / 2, yRe + bh1 / 2 - lpx * 3.5, lpx, '#1a1a1a', { align: 'center', skew: -0.15, outline: 'rgba(255,255,255,0)' });
      hit(ui, x, yRe, w, bh1, () => { const go = () => game.goHome({ autoLaunch: false }); game.ads ? game.ads.beforeContinue(go) : go(); });
    }
    // taper ailleurs : termine les animations d'un coup (REJOUER reste le seul geste qui quitte l'écran)
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

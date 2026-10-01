/* Menus (absents de la vidéo → conception minimale dans le style du HUD, CHOIX validé) :
 * sélection de niveau, pause, résultats, réglages (TAB), liste des touches (F1). */
(function () {
  const U = CC.U;

  class UI {
    constructor(game) { this.game = game; this.buttons = []; this.hover = -1; this.mouse = { x: -1, y: -1 }; this.overlay = null; }

    text(ctx, s, x, y, px, color, opts) { return CC.Font.draw(ctx, s, x, y, px, color, opts || {}); }

    // v030 : sur écran tactile, zone de toucher d'au moins 44 points de haut (recommandation iOS / Android) et bouton
    // encadré (opts.box ou tactile) pour qu'il se lise comme un bouton ; opts.hitW : largeur de zone imposée (lignes de menu)
    button(ctx, label, x, y, px, action, opts) {
      opts = opts || {};
      const touch = this.isTouch();
      let w = opts.hitW || (CC.Font.measure(label, px) + px * 6), h = px * 11;
      const minH = touch ? 44 * this.pixelRatio() : 0;
      let bx = opts.align === 'left' ? x - px * 3 : x - w / 2, by = y - px * 2;
      if (h < minH) { by -= (minH - h) / 2; h = minH; }
      const idx = this.buttons.length;
      const hot = !touch && this.mouse.x >= bx && this.mouse.x <= bx + w && this.mouse.y >= by && this.mouse.y <= by + h;
      if (hot) this.hover = idx;
      this.buttons.push({ x: bx, y: by, w, h, action });
      const col = hot ? CC.CONFIG.hud.colors.yellow : (opts.color || '#f4f4f4');
      if (opts.primary && (opts.box || touch)) {   // v038i : bouton principal épais, vert, brillant (REPRENDRE, ...)
        const pxl = CC.Home.skin === 'pixel';
        CC.Home.button3d(ctx, bx, by, w, h + Math.max(2, px) * 0.4, pxl ? (hot ? '#f0d28a' : '#d9a441') : (hot ? '#4dff7a' : '#00e436'), pxl ? '#d9a441' : '#009e3a', pxl ? '#9a7126' : '#00632a');
        this.text(ctx, label, x, y - px * 0.2, px, pxl ? '#14181d' : '#ffffff', { align: 'center', outline: pxl ? null : '#00501f' });
        return;
      }
      if ((opts.box || touch) && opts.box !== false) {
        const pad = Math.max(2, px);
        CC.Home.pill(ctx, bx, by + pad * 0.5, w, h - pad, hot ? 'rgba(255,255,255,0.22)' : (opts.fill || 'rgba(20,30,50,0.72)'), opts.color || 'rgba(244,244,244,0.6)', Math.min((h - pad) * 0.3, 22));   // v034 : bouton arrondi
      }
      if (hot) this.text(ctx, '>', bx - px * 6, y, px, col);
      this.text(ctx, label, opts.align === 'left' ? x : x, y, px, col, { align: opts.align || 'center' });
    }
    isTouch() { return document.body.classList.contains('cc-touch'); }
    // v030 : plus grande taille de police (≤ maxPx) pour que tous les libellés tiennent dans maxW (police monospace)
    fitPx(labels, maxW, maxPx) { let m = 0; for (const l of labels) m = Math.max(m, CC.Font.measure(l, 1)); return Math.min(maxPx, maxW / Math.max(1, m)); }
    pixelRatio() { return this.game.renderer ? this.game.renderer.getPixelRatio() : 1; }
    // libellé sans raccourci clavier sur écran tactile (« RETRY (CLICK) » → « RETRY »)
    key(label, hint) { return this.isTouch() ? label : label + ' (' + hint + ')'; }

    dim(ctx, W, H, a) { ctx.fillStyle = 'rgba(8,8,12,' + a + ')'; ctx.fillRect(0, -(this.offsetY || 0), W, this.fullH || H); }   // v017 : tout l'écran, pas seulement la bande

    draw(ctx, game, W, H) {
      this.buttons = []; this.hover = -1;
      const col = CC.CONFIG.hud.colors;
      if (game.state === 'MENU' && !this.overlay && game.padMode) CC.Home.drawHome(this, ctx, game, W, H);   // v034 : accueil = le lanceur
      else if (game.state === 'MENU' && !game.padMode) this.drawMenu(ctx, game, W, H);
      else if (game.state === 'LAUNCH') CC.Home.drawHome(this, ctx, game, W, H);                            // s'efface pendant la charge
      else if (game.state === 'RESULTS' && !this.overlay) this.drawResults(ctx, game, W, H);
      else if (game.paused && !this.overlay) this.drawPause(ctx, game, W, H);
      if (this.overlay === 'settings') this.drawSettings(ctx, game, W, H);
      else if (this.overlay === 'binds') this.drawBinds(ctx, game, W, H);
      // Surcouches exclusives : elles repartent d'une liste de boutons vide (aucun clic ne doit passer au travers).
      else if (this.overlay === 'missions' || this.overlay === 'difficulty') { this.buttons = []; this.drawMissions(ctx, game, W, H); }
      else if (this.overlay === 'defi') { this.buttons = []; this.drawDefi(ctx, game, W, H); }   // v033
      else if (this.overlay === 'quests') { this.buttons = []; CC.Home.drawQuests(this, ctx, game, W, H); }        // v034
      else if (this.overlay === 'progress') { this.buttons = []; CC.Home.drawGarage(this, ctx, game, W, H); }
      else if (this.overlay === 'garage') { this.buttons = []; CC.Home.drawGarage(this, ctx, game, W, H); }
      else if (this.overlay === 'levels') { this.buttons = []; CC.Home.drawLevels(this, ctx, game, W, H); }
      else if (this.overlay === 'map') { this.buttons = []; CC.Home.drawMap(this, ctx, game, W, H); }
      else if (this.overlay === 'msettings') { this.buttons = []; CC.Home.drawSettings(this, ctx, game, W, H); }
      else if (this.overlay === 'revive') { this.buttons = []; CC.Home.drawRevive(this, ctx, game, W, H); }
      else if (this.overlay === 'generating') { this.buttons = []; this.drawGenerating(ctx, game, W, H); }
      else if (this.overlay === 'shop') { this.buttons = []; if (!this.shop) this.shop = new CC.Shop(this); this.shop.draw(ctx, game, W, H); }
      else if (this.overlay === 'ad' && game.ads) { this.buttons = []; game.ads.draw(ctx, game, W, H, this); }
      if (game.state === 'MENU' && !this.overlay && game.ads && CC.CONFIG.ads.banner && !game.padMode) this.drawMenuBanner(ctx, game, W, H);
      if (game.notice) {   // v031 : message passager (achat confirmé au retour du paiement)
        const T = -(this.offsetY || 0), HH = this.fullH || H, px = this.fitPx([game.notice], W * 0.86, HH * 0.004);
        ctx.fillStyle = 'rgba(10,40,14,0.9)'; ctx.fillRect(W * 0.04, T + HH * 0.012, W * 0.92, px * 13);
        ctx.strokeStyle = CC.CONFIG.hud.colors.green; ctx.lineWidth = Math.max(1, px * 0.5); ctx.strokeRect(W * 0.04, T + HH * 0.012, W * 0.92, px * 13);
        this.text(ctx, game.notice, W / 2, T + HH * 0.012 + px * 3, px, CC.CONFIG.hud.colors.green, { align: 'center' });
      }
      if (game.state === 'BOOT') { this.dim(ctx, W, H, 1); this.text(ctx, 'CHARGEMENT...', W / 2, H / 2, H * 0.004, col.white, { align: 'center' }); }
      if (game.genDebug && game.level && game.level.plan && CC.Gen.drawDebugOverlay && !this.overlay) CC.Gen.drawDebugOverlay(ctx, game, W, H, this);   // v032
      // v034 : fondu au noir (retour à l'accueil : le temps de bâtir un nouveau couloir, puis la scène réapparaît)
      const fa = game.pendingHome ? 1 : game.fadeIn > 0 ? Math.min(1, game.fadeIn / 0.45) : 0;
      if (fa > 0) { ctx.fillStyle = 'rgba(4,6,10,' + fa + ')'; ctx.fillRect(0, -(this.offsetY || 0), W, this.fullH || H); }
    }

    /* v033 : menu d'accueil à trois gros boutons (façon Block Blast) : CLASSIQUE (couloir infini), DÉFI (cartes numérotées
     * à étoiles + les 9 niveaux d'origine), BOUTIQUE. Plein écran, portrait comme paysage ; boutons ≥ 44 points. */
    drawMenu(ctx, game, W, H) {
      this.dim(ctx, W, H, 0.5);
      const col = CC.CONFIG.hud.colors, T = -(this.offsetY || 0), HH = this.fullH || H, P = this.portrait, touch = this.isTouch();
      const Y = (f) => T + HH * f, banner = touch && P && game.ads && game.ads.enabled() ? HH * 0.075 : 0;
      const tag = 'PILOTE. FROLE. PULVERISE.';
      this.text(ctx, tag, W / 2, Y(P ? 0.135 : 0.2), this.fitPx([tag], W * 0.8, HH * 0.003), col.yellow, { align: 'center' });
      const rec = game.save.endless && game.save.endless.best, maxStars = CC.Gen.difficultyIds().length * CC.CONFIG.challenge.maps * 3;
      const stars = CC.Gen.difficultyIds().reduce((a, d) => a + game.challengeStars(d), 0);
      const items = [
        ['CLASSIQUE', rec ? 'RECORD ' + rec + ' M' : 'VA LE PLUS LOIN POSSIBLE', col.green, () => game.startEndless()],
        ['DÉFI', stars + ' / ' + maxStars + ' ETOILES', '#8fd0ff', () => { this.overlay = 'defi'; }, true],
        ['BOUTIQUE', 'APPARENCES DE ROQUETTE', col.yellow, () => { this.overlay = 'shop'; }],
      ];
      const bw = W * (P ? 0.84 : 0.42), bh = HH * (P ? 0.14 : 0.165), gap = HH * (P ? 0.035 : 0.03);
      const top = P ? Y(0.24) : Y(0.29);
      const lp = this.fitPx(items.map((it) => it[0]), bw * 0.8, bh * 0.06);   // même taille pour les trois libellés
      items.forEach((it, i) => this.bigButton(ctx, W / 2 - bw / 2, top + i * (bh + gap), bw, bh, it[0], it[1], it[2], it[3], it[4], lp));
      const foot = T + HH - banner - HH * (P ? 0.05 : 0.07);
      if (!touch) this.text(ctx, 'F1: TOUCHES    TAB: REGLAGES', W / 2, foot, HH * 0.0024, '#bdbdbd', { align: 'center' });
      this.text(ctx, CC.CONFIG.version.toUpperCase(), W * 0.97, foot + HH * 0.035, HH * 0.0018, '#808080', { align: 'right' });
    }

    // v033 : gros bouton encadré avec un sous-titre ; `stars` : petite étoile devant le sous-titre
    bigButton(ctx, x, y, w, h, label, sub, color, action, stars, labelPx) {
      const idx = this.buttons.length, touch = this.isTouch();
      const hot = !touch && this.mouse.x >= x && this.mouse.x <= x + w && this.mouse.y >= y && this.mouse.y <= y + h;
      if (hot) this.hover = idx;
      this.buttons.push({ x, y, w, h, action });
      ctx.fillStyle = hot ? 'rgba(255,255,255,0.16)' : 'rgba(8,10,14,0.74)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = color; ctx.globalAlpha = 0.18; ctx.fillRect(x, y, w * 0.025, h); ctx.globalAlpha = 1;
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, h * 0.03); ctx.strokeRect(x, y, w, h);
      const lp = labelPx || this.fitPx([label], w * 0.8, h * 0.06), sp = this.fitPx([sub + '    '], w * 0.8, h * 0.022);
      const block = lp * 7 + h * 0.1 + sp * 7, y0 = y + (h - block) / 2;
      this.text(ctx, label, x + w / 2, y0, lp, hot ? CC.CONFIG.hud.colors.yellow : color, { align: 'center', skew: -0.18 });
      const sy = y0 + lp * 7 + h * 0.1;
      if (stars) {
        const sw = CC.Font.measure(sub, sp), sx = x + w / 2 - sw / 2;
        this.star(ctx, sx - sp * 6, sy + sp * 3.5, sp * 4, true, '#fdfd02');
        this.text(ctx, sub, sx + sp * 0.5, sy, sp, '#dcdcdc', {});
      } else this.text(ctx, sub, x + w / 2, sy, sp, '#dcdcdc', { align: 'center' });
    }

    // v033 : étoile à cinq branches (pleine ou en creux)
    star(ctx, cx, cy, r, filled, color) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      ctx.closePath();
      if (filled) { ctx.fillStyle = color; ctx.fill(); }
      else { ctx.strokeStyle = 'rgba(200,200,200,0.55)'; ctx.lineWidth = Math.max(1, r * 0.16); ctx.stroke(); }
    }
    // v033 : coupe de trophée (BRONZE / ARGENT / OR), grisée tant qu'elle n'est pas gagnée
    trophy(ctx, cx, cy, s, color, won) {
      ctx.fillStyle = won ? color : 'rgba(120,120,120,0.35)';
      ctx.beginPath(); ctx.moveTo(cx - s * 0.5, cy - s * 0.5); ctx.lineTo(cx + s * 0.5, cy - s * 0.5); ctx.lineTo(cx + s * 0.3, cy + s * 0.05); ctx.lineTo(cx - s * 0.3, cy + s * 0.05); ctx.closePath(); ctx.fill();
      ctx.fillRect(cx - s * 0.07, cy + s * 0.05, s * 0.14, s * 0.25); ctx.fillRect(cx - s * 0.28, cy + s * 0.3, s * 0.56, s * 0.12);
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1, s * 0.08);
      for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + e * s * 0.5, cy - s * 0.3, s * 0.16, e < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, e < 0 ? Math.PI * 1.5 : Math.PI * 0.5, e > 0); ctx.stroke(); }
    }

    /* v033 : écran DÉFI — onglets FACILE / MOYEN / DIFFICILE / IMPOSSIBLE (20 cartes numérotées chacune, 1 à 3 étoiles,
     * trophées à 10, 20 et 40 étoiles) et NIVEAUX (les 9 niveaux d'origine). MISSIONS LIBRES : l'ancien générateur. */
    drawDefi(ctx, game, W, H) {
      this.dim(ctx, W, H, 1);
      const G = CC.Gen, col = CC.CONFIG.hud.colors, T = -(this.offsetY || 0), HH = this.fullH || H, P = this.portrait, touch = this.isTouch();
      const Y = (f) => T + HH * f, pr = this.pixelRatio(), CH = CC.CONFIG.challenge;
      this.text(ctx, 'DÉFI', W / 2, Y(0.035), this.fitPx(['DÉFI'], W * 0.4, HH * 0.008), col.white, { align: 'center', skew: -0.2 });
      const ids = G.difficultyIds(), tabs = ids.concat(['levels']);
      const tab = this.defiTab && tabs.includes(this.defiTab) ? this.defiTab : 'easy';
      const lab = (id) => (id === 'levels' ? 'NIVEAUX' : G.Difficulties.get(id).label);
      const tcol = (id) => (id === 'levels' ? '#cfcfcf' : G.Difficulties.get(id).color);
      // onglets : une rangée (paysage) ou deux (portrait : FACILE MOYEN DIFFICILE / IMPOSSIBLE NIVEAUX, libellés lisibles)
      const th = Math.max(HH * (P ? 0.05 : 0.06), touch ? 44 * pr : 0), rowsT = P ? [[0, 1, 2], [3, 4]] : [[0, 1, 2, 3, 4]];
      const rects = [];
      rowsT.forEach((row, ri) => row.forEach((ti, ci) => { const tw = W * 0.94 / row.length; rects[ti] = { x: W * 0.03 + ci * tw, y: Y(P ? 0.095 : 0.11) + ri * (th + HH * 0.008), w: tw }; }));
      const tpx = Math.min(...tabs.map((id, i) => this.fitPx([lab(id)], rects[i].w * 0.84, th * 0.07)));
      const ty = rects[tabs.length - 1].y;
      tabs.forEach((id, i) => {
        const x = rects[i].x, tw = rects[i].w, ty = rects[i].y, on = id === tab;
        this.buttons.push({ x, y: ty, w: tw, h: th, action: () => { this.defiTab = id; } });
        ctx.fillStyle = on ? tcol(id) : 'rgba(255,255,255,0.05)'; ctx.globalAlpha = on ? 0.28 : 1; ctx.fillRect(x + 2, ty, tw - 4, th); ctx.globalAlpha = 1;
        ctx.strokeStyle = on ? tcol(id) : 'rgba(244,244,244,0.3)'; ctx.lineWidth = Math.max(1, th * (on ? 0.05 : 0.02)); ctx.strokeRect(x + 2, ty, tw - 4, th);
        this.text(ctx, lab(id), x + tw / 2, ty + th / 2 - tpx * 3.5, tpx, on ? tcol(id) : '#bdbdbd', { align: 'center' });
      });
      const areaTop = ty + th + HH * 0.03, areaBot = Y(P ? 0.86 : 0.85);
      if (tab === 'levels') this.drawDefiLevels(ctx, game, W, areaTop, areaBot);
      else {
        const stars = game.challengeStars(tab), D = G.Difficulties.get(tab);
        // total d'étoiles et trophées
        const spx = this.fitPx(['00 / 60'], W * 0.22, HH * 0.0034), sy = areaTop;
        this.star(ctx, W * 0.06 + spx * 3, sy + spx * 3.5, spx * 4.2, true, col.yellow);
        this.text(ctx, stars + ' / ' + CH.maps * 3, W * 0.06 + spx * 9, sy, spx, col.white, {});
        const names = ['BRONZE', 'ARGENT', 'OR'], tc = ['#d08a4a', '#d0d8e0', '#d9a441'], ts = spx * 10;
        CH.trophies.forEach((need, i) => {
          const cx = W * (P ? 0.6 : 0.62) + i * W * (P ? 0.13 : 0.1), won = stars >= need;
          this.trophy(ctx, cx, sy + ts * 0.35, ts, tc[i], won);
          this.text(ctx, won ? names[i] : String(need), cx, sy + ts * 0.95, spx * 0.6, won ? tc[i] : '#8a8a8a', { align: 'center' });
        });
        // grille des cartes
        const cols = P ? 4 : 5, rows = Math.ceil(CH.maps / cols), gTop = sy + ts * 1.55, gh = areaBot - gTop;
        const cw = W * 0.94 / cols, chh = Math.min(gh / rows, cw * 1.05), gx = W * 0.03, npx = this.fitPx(['20'], cw * 0.5, chh * 0.05);
        for (let n = 1; n <= CH.maps; n++) {
          const c = (n - 1) % cols, rr = Math.floor((n - 1) / cols), x = gx + c * cw + 3, y = gTop + rr * chh + 3, w = cw - 6, h = chh - 6;
          const open = game.challengeOpen(tab, n), rec = game.challengeRec(tab, n);
          ctx.fillStyle = open ? (rec ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)') : 'rgba(255,255,255,0.015)'; ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = open ? D.color : 'rgba(120,120,120,0.35)'; ctx.globalAlpha = open ? (rec ? 1 : 0.6) : 1; ctx.lineWidth = Math.max(1, h * 0.025); ctx.strokeRect(x, y, w, h); ctx.globalAlpha = 1;
          if (open) this.buttons.push({ x, y, w, h, action: () => game.startChallenge(tab, n) });
          this.text(ctx, String(n), x + w / 2, y + h * 0.18, npx, open ? col.white : '#505050', { align: 'center' });
          const sr = Math.min(w * 0.12, h * 0.12);
          for (let k = 0; k < 3; k++) this.star(ctx, x + w / 2 + (k - 1) * sr * 2.3, y + h * 0.74, sr, rec && rec.s > k, col.yellow);
        }
      }
      // pied : missions libres (générateur à graine), retour
      const by = Y(P ? 0.915 : 0.905), bpx = this.fitPx(['MISSIONS LIBRES'], W * (P ? 0.36 : 0.2), HH * 0.0034);
      this.button(ctx, 'MISSIONS LIBRES', W * (P ? 0.29 : 0.38), by, bpx, () => { this.overlay = 'missions'; }, { box: true, hitW: W * (P ? 0.44 : 0.24), color: '#8fd0ff' });
      this.button(ctx, this.key('RETOUR', 'ESC'), W * (P ? 0.76 : 0.62), by, bpx, () => { this.overlay = null; }, { box: true, hitW: W * (P ? 0.36 : 0.18) });
    }

    // v033 : les 9 niveaux d'origine (onglet NIVEAUX du DÉFI) : une ligne par niveau, record à droite, cadenas sinon
    drawDefiLevels(ctx, game, W, top, bottom) {
      const best = game.save.best, n = CC.Levels.length, rowH = (bottom - top) / n, x0 = W * 0.05, w = W * 0.9;
      const names = CC.Levels.map((lv, i) => (i + 1) + '  ' + lv.name);
      const px = this.fitPx(names, w * 0.6, rowH * 0.055), sub = px * 0.65;
      CC.Levels.forEach((lv, i) => {
        const open = game.isUnlocked(i), b = best[lv.id], y = top + i * rowH + rowH * 0.2;
        if (open) this.button(ctx, names[i], x0 + px * 3, y, px, () => game.startLevel(i), { align: 'left', hitW: w, box: true });
        else { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(x0, y - px * 2, w, Math.max(px * 11, 44 * this.pixelRatio())); this.text(ctx, names[i], x0 + px * 3, y, px, '#5a5a5a'); }
        const info = b ? U.formatTime(b.time) : open ? '--:--,--' : 'VERROUILLE';
        this.text(ctx, info, x0 + w - px * 3, y + px * 1.6, sub, open ? (b ? '#cfcfcf' : '#8a8a8a') : '#6a6a6a', { align: 'right' });
      });
    }

    // v030 : bannière publicitaire d'exemple, en bas du menu principal
    drawMenuBanner(ctx, game, W, H) {
      if (!game.ads.enabled()) return;
      const T = -(this.offsetY || 0), HH = this.fullH || H;
      if (this.portrait && this.isTouch()) { const h = HH * 0.068; game.ads.drawBanner(ctx, this, W * 0.03, T + HH - h - HH * 0.006, W * 0.94, h); }
      else { const h = H * 0.08; game.ads.drawBanner(ctx, this, W * 0.745, H * 0.905, W * 0.24, h); }   // à droite du bouton de la boutique
    }

    /* v032 : GÉNÉRATEUR DE MISSIONS — quatre difficultés, mission du jour, graine choisie ou aléatoire, dernières missions.
     * Plein écran (portrait comme paysage), boutons encadrés ≥ 44 points sur écran tactile. */
    drawMissions(ctx, game, W, H) {
      this.dim(ctx, W, H, 1);
      const G = CC.Gen, col = CC.CONFIG.hud.colors, T = -(this.offsetY || 0), HH = this.fullH || H;
      const touch = this.isTouch(), P = this.portrait;
      const fit = (t, w, m) => this.fitPx([t], W * w, m);
      const Y = (f) => T + HH * f;
      this.text(ctx, 'GÉNÉRATEUR DE MISSIONS', W / 2, Y(0.085), fit('GÉNÉRATEUR DE MISSIONS', 0.9, HH * (P ? 0.006 : 0.0085)), col.white, { align: 'center', skew: -0.2 });
      const seedTxt = this.seedChoice !== undefined && this.seedChoice !== null ? 'GRAINE ' + this.seedChoice : 'GRAINE ALEATOIRE - CHAQUE MISSION EST UNIQUE';
      this.text(ctx, seedTxt, W / 2, Y(0.16), fit(seedTxt, 0.9, HH * 0.0026), this.seedChoice != null ? col.yellow : '#c8c8c8', { align: 'center' });
      // quatre difficultés
      const ids = G.difficultyIds(), top = 0.22, gap = P ? 0.1 : 0.095;
      const bpx = this.fitPx(ids.map((id) => '  ' + G.Difficulties.get(id).label + '  '), W * (P ? 0.5 : 0.28), HH * 0.0048);
      ids.forEach((id, i) => {
        const D = G.Difficulties.get(id), y = Y(top + i * gap);
        const go = () => { const sd = this.seedChoice != null ? this.seedChoice : null; game.requestMission(id, sd); };
        if (P) {
          this.button(ctx, D.label, W / 2, y, bpx, go, { color: D.color, box: true, hitW: W * 0.84 });
          const bh = Math.max(bpx * 11, touch ? 44 * this.pixelRatio() : 0);   // hauteur réelle du bouton (≥ 44 points au doigt)
          this.text(ctx, D.blurb, W / 2, y - bpx * 2 + bh + bpx * 0.8, fit(D.blurb, 0.84, HH * 0.0021), '#a8a8a8', { align: 'center' });
        } else {
          this.button(ctx, D.label, W * 0.36, y, bpx, go, { color: D.color, box: true, hitW: W * 0.26 });
          this.text(ctx, D.blurb, W * 0.51, y + bpx * 1.2, HH * 0.0024, '#b8b8b8', { align: 'left' });
        }
      });
      // mission du jour
      const dl = G.daily(), dD = G.Difficulties.get(dl.difficulty), done = game.save.daily && game.save.daily[dl.id];
      const dy = Y(top + 4 * gap + 0.02);
      const dLabel = 'MISSION DU JOUR  ' + dl.label + '  ' + dD.label;
      this.button(ctx, dLabel, W / 2, dy, fit(dLabel, 0.8, HH * 0.0034), () => game.requestMission(dl.difficulty, dl.seed, { daily: dl.id }), { color: '#8fd0ff', box: true, hitW: W * (P ? 0.84 : 0.6) });
      this.text(ctx, 'GRAINE ' + dl.seed + (done !== undefined ? '   RECORD ' + U.formatTime(done) : '   MEME CARTE POUR TOUS'), W / 2, dy + HH * 0.042, fit('GRAINE 000000000   MEME CARTE POUR TOUS', 0.8, HH * 0.0022), '#9ab8cc', { align: 'center' });
      // graine : saisir / revenir à l'aléatoire
      const sy = dy + HH * 0.095, spx = fit('CHOISIR UNE GRAINE', P ? 0.36 : 0.22, HH * 0.003);
      this.button(ctx, 'CHOISIR UNE GRAINE', W * (P ? 0.29 : 0.4), sy, spx, () => this.openSeedInput(game), { box: true, hitW: W * (P ? 0.44 : 0.24) });
      this.button(ctx, 'ALEATOIRE', W * (P ? 0.76 : 0.62), sy, spx, () => { this.seedChoice = null; }, { box: true, hitW: W * (P ? 0.36 : 0.14), color: this.seedChoice == null ? '#7a7a7a' : undefined });
      // dernières missions jouées (rejouer une graine)
      const hist = (game.save.missions || []).slice(0, P ? 3 : 2);
      if (hist.length) this.text(ctx, 'DERNIERES MISSIONS', W / 2, sy + HH * 0.075, fit('DERNIERES MISSIONS', 0.5, HH * 0.0024), '#8a8a8a', { align: 'center' });
      hist.forEach((h, i) => {
        const D = G.Difficulties.get(h.d) || G.Difficulties.get('easy'), lbl = h.seed + '  ' + D.label + '  ' + U.formatTime(h.t);
        this.button(ctx, lbl, W / 2, sy + HH * (0.115 + i * 0.058), fit(lbl, 0.7, HH * 0.0028), () => game.requestMission(h.d, h.seed), { box: true, hitW: W * (P ? 0.84 : 0.5), color: '#cfcfcf' });
      });
      this.button(ctx, this.key('RETOUR', 'ESC'), W / 2, Y(0.93), fit('RETOUR (ESC)', 0.5, HH * 0.004), () => { this.overlay = game.state === 'MENU' ? 'defi' : null; this.closeSeedInput(); }, { box: touch });   // v033 : retour à l'écran DÉFI
      if (this.diffChoice && G.Difficulties.has(this.diffChoice) && this.seedChoice != null) {   // lien partagé : difficulté suggérée
        this.text(ctx, 'MISSION PARTAGEE : ' + G.Difficulties.get(this.diffChoice).label, W / 2, Y(0.19), fit('MISSION PARTAGEE : IMPOSSIBLE', 0.6, HH * 0.0024), '#8fd0ff', { align: 'center' });
      }
    }

    // Écran de génération (une image avant le calcul, puis lancement immédiat)
    drawGenerating(ctx, game, W, H) {
      this.dim(ctx, W, H, 0.96);
      const pm = game.pendingMission, T = -(this.offsetY || 0), HH = this.fullH || H;
      const D = pm && CC.Gen.Difficulties.get(pm.diffId);
      this.text(ctx, 'GÉNÉRATION...', W / 2, T + HH * 0.44, this.fitPx(['GÉNÉRATION...'], W * 0.8, HH * 0.009), '#f4f4f4', { align: 'center', skew: -0.2 });
      if (D) this.text(ctx, D.label + (pm.seed != null ? '   GRAINE ' + pm.seed : ''), W / 2, T + HH * 0.54, this.fitPx(['IMPOSSIBLE   GRAINE 0000000000'], W * 0.8, HH * 0.0032), D.color, { align: 'center' });
    }

    // Saisie d'une graine : petit champ de texte (le clavier du téléphone s'ouvre) ; un mot est aussi une graine
    openSeedInput(game) {
      let box = document.getElementById('cc-seedbox');
      if (!box) {
        box = document.createElement('div'); box.id = 'cc-seedbox';
        box.innerHTML = '<span>GRAINE</span><input id="cc-seed" maxlength="14" autocomplete="off" spellcheck="false" enterkeyhint="go"><button id="cc-seed-ok">OK</button><button id="cc-seed-x">X</button>';
        document.body.appendChild(box);
        const ok = () => { const v = CC.Gen.parseSeed(document.getElementById('cc-seed').value); if (v !== null) this.seedChoice = v; this.closeSeedInput(); };
        document.getElementById('cc-seed-ok').onclick = ok;
        document.getElementById('cc-seed-x').onclick = () => this.closeSeedInput();
        document.getElementById('cc-seed').onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') ok(); if (e.key === 'Escape') this.closeSeedInput(); };
      }
      box.style.display = 'flex';
      const inp = document.getElementById('cc-seed');
      inp.value = this.seedChoice != null ? String(this.seedChoice) : '';
      setTimeout(() => inp.focus(), 30);
    }
    closeSeedInput() { const box = document.getElementById('cc-seedbox'); if (box) { box.style.display = 'none'; const i = document.getElementById('cc-seed'); if (i) i.blur(); } }

    // v022 : son et musique coupés / remis d'un geste (le volume précédent est conservé) ; sur écran tactile, pas de
    // rappel de touches clavier et des boutons plus gros
    toggleVolume(game, key) {
      const s = game.settings, keep = '_' + key;
      if (s[key] > 0) { s[keep] = s[key]; s[key] = 0; } else s[key] = s[keep] || CC.CONFIG.audio[key];
      game.applySettings();
    }
    drawPause(ctx, game, W, H) {
      this.dim(ctx, W, H, 0.7);
      const touch = document.body.classList.contains('cc-touch'), s = game.settings, endless = !!game.endlessRun;
      const T = -(this.offsetY || 0), HH = this.fullH || H, u = this.portrait ? W : Math.min(W, HH * 0.62);
      this.text(ctx, 'PAUSE', W / 2, T + HH * 0.09, this.fitPx(['PAUSE'], W * 0.6, u * 0.013), '#f4f4f4', { align: 'center', skew: -0.2 });
      const vib = ['NON', 'FAIBLE', 'MOYEN', 'FORT'], vv = s.vibration !== undefined ? s.vibration : 2;
      const rows = [['REPRENDRE', () => game.resume(), CC.CONFIG.hud.colors.yellow]];
      if (endless) {
        rows.push(['RECOMMENCER', () => { game.resume(); game.restartLevel(); }]);
        rows.push(['TERMINER ET VOIR MES GAINS', () => { game.resume(); game.finishEndless(); }]);   // quitter n'efface pas la progression : le vol rapporte de l'XP
      } else {
        rows.push([touch ? 'RECOMMENCER' : 'RECOMMENCER (R)', () => { game.resume(); game.restartLevel(); }]);
        const next = game.nextUnlocked();
        if (next >= 0) rows.push(['NIVEAU SUIVANT', () => { game.resume(); game.startLevel(next); }]);
        if (game.generated && game.mission && !game.mission.challenge) rows.push(['NOUVELLE MISSION', () => { game.resume(); game.requestMission(game.mission.difficulty); }]);
      }
      rows.push(['SON : ' + (s.sfx > 0 ? 'OUI' : 'NON'), () => this.toggleVolume(game, 'sfx')]);
      rows.push(['MUSIQUE : ' + (s.music > 0 ? 'OUI' : 'NON'), () => this.toggleVolume(game, 'music')]);
      if (touch) rows.push(['VIBRATION : ' + vib[vv], () => { s.vibration = (vv + 1) % 4; if (CC.Haptics) { CC.Haptics.setLevel(s.vibration); CC.Haptics.tick('fire'); } game.applySettings(); }]);
      else rows.push(['REGLAGES (TAB)', () => { this.overlay = 'settings'; }]);
      rows.push(['ACCUEIL', () => { if (endless) game.goHome({}); else game.toMenu(); }]);
      if (game.generated && game.mission) {   // v032 : graine visible (partage, défi)
        const m = game.mission, t = m.challenge ? 'DÉFI ' + m.label + '  CARTE ' + m.challenge.n + '/' + CC.CONFIG.challenge.maps : 'GRAINE ' + m.seed + '  ' + m.label + '  ' + m.biome;
        this.text(ctx, t, W / 2, T + HH * 0.145, this.fitPx([t], W * 0.9, HH * 0.0028), CC.CONFIG.hud.colors.yellow, { align: 'center' });
      }
      const top = T + HH * 0.2, gap = Math.min(HH * 0.085, (HH * 0.74) / rows.length), bpx = this.fitPx(rows.map((r) => r[0]), W * 0.78, gap * 0.07);
      rows.forEach((r, i) => this.button(ctx, r[0], W / 2, top + i * gap, bpx, r[1], { hitW: W * 0.86, box: true, color: r[2], primary: i === 0 }));
    }

    // v030 : GRAPHICS : AUTO (niveau choisi par le jeu, affiché entre parenthèses) → HIGH → MEDIUM → LOW → AUTO
    graphicsLabel(game) {
      const g = game.settings.graphics || 'auto', t = game.quality ? game.quality.tier : null;
      const short = { high: 'HIGH', medium: 'MED', low: 'LOW' };
      return g === 'auto' ? 'AUTO' + (t ? ' (' + short[t] + ')' : '') : g.toUpperCase();
    }
    cycleGraphics(game) {
      const order = ['auto', 'high', 'medium', 'low'], s = game.settings;
      s.graphics = order[(order.indexOf(s.graphics || 'auto') + 1) % order.length];
      if (game.quality) game.quality.apply(s.graphics === 'auto' ? game.quality.initial() : s.graphics);
      game.applySettings();
    }

    drawResults(ctx, game, W, H) {
      if (game.results && game.results.endless) { CC.Home.drawResults(this, ctx, game, W, H); return; }   // v034 : récompenses animées
      if (game.results && game.results.challenge) { this.drawResultsV33(ctx, game, W, H); return; }
      this.dim(ctx, W, H, 0.5);
      const r = game.results, col = CC.CONFIG.hud.colors;
      // v030 : en portrait sur téléphone, toute la hauteur de l'écran et des boutons ≥ 44 points bien espacés
      const full = this.portrait && this.isTouch(), T = full ? -(this.offsetY || 0) : 0, HH = full ? (this.fullH || H) : H;
      const Y = (f) => T + HH * f, fit = (t, maxPx) => this.fitPx([t], W * 0.9, maxPx);
      this.text(ctx, r.title, W / 2, Y(full ? 0.14 : 0.2), fit(r.title, H * (this.portrait ? 0.0055 : 0.008)), col.white, { align: 'center', skew: -0.2 });   // v017 : « ALL TARGETS DESTROYED » tient dans la largeur
      const px = full ? fit('BEST  0:00,00  NEW RECORD!', H * 0.0042) : H * 0.0042;
      this.text(ctx, 'TIME  ' + U.formatTime(r.time), W / 2, Y(full ? 0.25 : 0.36), px, col.white, { align: 'center' });
      this.text(ctx, 'STYLE ' + U.formatInt(r.style), W / 2, Y(full ? 0.3 : 0.43), px, col.white, { align: 'center' });
      if (r.bestTime) this.text(ctx, 'BEST  ' + U.formatTime(r.bestTime) + (r.newRecord ? '  NEW RECORD!' : ''), W / 2, Y(full ? 0.35 : 0.5), px * 0.72, r.newRecord ? col.yellow : '#bdbdbd', { align: 'center' });
      // v031 : plus d'argent gagné en jouant (les cosmétiques se débloquent dans la boutique : paiement ou publicité)
      const ads = game.ads, via = (fn) => () => (ads ? ads.beforeContinue(fn) : fn());
      const labels = [], acts = [];
      labels.push(this.key('RETRY', 'CLICK')); acts.push([via(() => game.restartLevel()), col.yellow]);
      if (game.generated && game.mission) {   // v032 : enchaîner une nouvelle mission de même difficulté, ou changer
        labels.push('NOUVELLE MISSION'); acts.push([via(() => game.requestMission(game.mission.difficulty)), null]);
        labels.push('MISSIONS'); acts.push([via(() => { this.overlay = 'missions'; }), null]);
        const m = game.mission, t = 'GRAINE ' + m.seed + '  ' + m.label + (r.seedBest !== undefined ? '   RECORD ' + U.formatTime(r.seedBest) : '');
        this.text(ctx, t, W / 2, Y(full ? 0.405 : 0.555), this.fitPx([t], W * 0.9, H * 0.0028), r.seedRecord ? col.yellow : '#bdbdbd', { align: 'center' });
      }
      else if (game.levelIndex < CC.Levels.length - 1) { labels.push(this.key('NEXT LEVEL', 'N')); acts.push([via(() => game.startLevel(game.levelIndex + 1)), null]); }
      labels.push(this.key('MAIN MENU', 'ESC')); acts.push([via(() => game.toMenu()), null]);
      const top = Y(full ? 0.48 : 0.63), gap = full ? HH * 0.09 : H * 0.08;
      const bpx = full ? this.fitPx(labels, W * 0.78, px) : px;
      labels.forEach((l, i) => this.button(ctx, l, W / 2, top + i * gap, i === 0 && acts[0][1] === '#8fd0ff' && !full ? px * 0.8 : bpx, acts[i][0], { color: acts[i][1] || undefined, box: acts[i][1] === '#8fd0ff' || undefined, hitW: full ? W * 0.84 : undefined }));
    }

    /* v033 : résultats du mode CLASSIQUE (distance, record, cause) et du DÉFI (étoiles, temps visé pour la suivante,
     * trophée gagné). Plein écran en portrait ; le premier bouton (REJOUER) est le plus visible. */
    drawResultsV33(ctx, game, W, H) {
      this.dim(ctx, W, H, 0.62);
      const r = game.results, col = CC.CONFIG.hud.colors, full = this.portrait && this.isTouch();
      const T = full ? -(this.offsetY || 0) : 0, HH = full ? (this.fullH || H) : H, Y = (f) => T + HH * f;
      const fit = (t, w, m) => this.fitPx([t], W * w, m);
      const ads = game.ads, via = (fn) => () => (ads ? ads.beforeContinue(fn) : fn());
      const acts = [];
      if (r.endless) {
        this.text(ctx, r.title, W / 2, Y(0.12), fit(r.title, 0.9, HH * 0.009), col.white, { align: 'center', skew: -0.2 });
        const rl = r.newRecord || r.firstRun ? 'NOUVEAU RECORD !' : 'RECORD ' + r.best + ' M';
        this.text(ctx, rl, W / 2, Y(0.25), fit(rl, 0.8, HH * 0.005), r.newRecord || r.firstRun ? col.yellow : '#cfcfcf', { align: 'center' });
        const l2 = 'PALIER ' + r.stage.label + '    CAUSE : ' + r.cause;
        this.text(ctx, l2, W / 2, Y(0.33), fit(l2, 0.9, HH * 0.003), '#dcdcdc', { align: 'center' });
        const l3 = 'STYLE ' + U.formatInt(r.style) + '    TEMPS ' + U.formatTime(r.time);
        this.text(ctx, l3, W / 2, Y(0.39), fit(l3, 0.9, HH * 0.003), '#bdbdbd', { align: 'center' });
        acts.push(['REJOUER', col.yellow, via(() => game.restartLevel())], ['MENU', null, via(() => game.toMenu())]);
      } else {
        const c = r.challenge, D = CC.Gen.Difficulties.get(c.diff), ttl = 'CARTE ' + c.n + ' TERMINÉE';
        this.text(ctx, ttl, W / 2, Y(0.08), fit(ttl, 0.9, HH * 0.008), col.white, { align: 'center', skew: -0.2 });
        this.text(ctx, 'DÉFI ' + D.label, W / 2, Y(0.165), fit('DÉFI IMPOSSIBLE', 0.6, HH * 0.0032), D.color, { align: 'center' });
        const sr = Math.min(W * 0.07, HH * 0.045);
        for (let k = 0; k < 3; k++) this.star(ctx, W / 2 + (k - 1) * sr * 2.6, Y(0.27), sr, c.stars > k, col.yellow);
        const l1 = 'TEMPS ' + U.formatTime(r.time) + '    MEILLEUR ' + U.formatTime(c.best);
        this.text(ctx, l1, W / 2, Y(0.35), fit(l1, 0.9, HH * 0.0034), col.white, { align: 'center' });
        const l2 = c.next ? (c.stars + 1) + ' ETOILES EN ' + U.formatTime(c.next) : 'PARFAIT !';
        this.text(ctx, l2, W / 2, Y(0.41), fit(l2, 0.8, HH * 0.003), c.next ? '#cfcfcf' : col.yellow, { align: 'center' });
        if (c.trophyAfter > c.trophyBefore) {
          const tn = ['BRONZE', 'ARGENT', 'OR'][c.trophyAfter - 1], tl = 'NOUVEAU TROPHÉE : ' + tn;
          this.text(ctx, tl, W / 2, Y(0.465), fit(tl, 0.9, HH * 0.0034), ['#d08a4a', '#d0d8e0', '#d9a441'][c.trophyAfter - 1], { align: 'center' });
        }
        acts.push(['REJOUER', col.yellow, via(() => game.restartLevel())]);
        if (c.n < CC.CONFIG.challenge.maps) acts.push(['CARTE SUIVANTE', D.color, via(() => game.startChallenge(c.diff, c.n + 1))]);
        acts.push(['DÉFI', '#8fd0ff', via(() => { game.toMenu(); this.overlay = 'defi'; this.defiTab = c.diff; })], ['MENU', null, via(() => game.toMenu())]);
      }
      const top = Y(r.endless ? 0.5 : 0.54), gap = HH * (full ? 0.095 : 0.1);
      const bpx = this.fitPx(acts.map((a) => a[0]), W * (full ? 0.7 : 0.3), HH * 0.0045);
      acts.forEach((a, i) => this.button(ctx, a[0], W / 2, top + i * gap, bpx, a[2], { color: a[1] || undefined, box: true, hitW: W * (full ? 0.84 : 0.4) }));
    }

    drawSettings(ctx, game, W, H) {
      this.dim(ctx, W, H, 0.7);
      const s = game.settings, px = H * 0.0036;
      this.text(ctx, 'SETTINGS', W / 2, H * 0.12, H * 0.008, '#f4f4f4', { align: 'center', skew: -0.2 });
      const rows = [
        ['SENSITIVITY', U.formatDec(s.sensitivity * 1000, 1), (d) => { s.sensitivity = U.clamp(s.sensitivity + d * 0.0002, 0.0004, 0.006); }],
        ['INVERT Y', s.invertY ? 'ON' : 'OFF', () => { s.invertY = !s.invertY; }],
        ['MUSIC', Math.round(s.music * 100) + '%', (d) => { s.music = U.clamp(Math.round((s.music + d * 0.1) * 10) / 10, 0, 1); }],
        ['SOUND FX', Math.round(s.sfx * 100) + '%', (d) => { s.sfx = U.clamp(Math.round((s.sfx + d * 0.1) * 10) / 10, 0, 1); }],
        ['POST FX', s.postfx ? 'ON' : 'OFF', () => { s.postfx = !s.postfx; }],
        ['SHOW FPS', game.debug ? 'ON' : 'OFF', () => { game.debug = !game.debug; }],
        ['GRAPHICS', this.graphicsLabel(game), () => this.cycleGraphics(game)],
        ['SAMPLE ADS', s.ads === false ? 'OFF' : 'ON', () => { s.ads = s.ads === false; }],
      ];
      rows.forEach((row, i) => {
        const y = H * (0.26 + i * 0.07);
        this.text(ctx, row[0], W * 0.3, y, px, '#d8d8d8');
        this.button(ctx, '< ' + row[1] + ' >', W * 0.68, y, px, (dir) => { row[2](dir); game.applySettings(); });
      });
      this.button(ctx, 'BACK (TAB)', W / 2, H * 0.84, px, () => { this.overlay = null; });
    }

    drawBinds(ctx, game, W, H) {
      this.dim(ctx, W, H, 0.7);
      const px = H * 0.0032;
      this.text(ctx, 'BINDS', W / 2, H * 0.1, H * 0.008, '#f4f4f4', { align: 'center', skew: -0.2 });
      const b = [['W,A,S,D', 'STEER 360 (ALSO Z,Q,S,D OR ARROWS)'], ['SPACE (HOLD)', 'ENGINE (0,5S FREE, THEN FUEL)'], ['MOUSE', 'AIM (OPTIONAL)'],
        ['LEFT CLICK', 'FIRE / RESPAWN AT LAUNCHER'], ['RIGHT CLICK (HOLD)', 'GRAPPLE HOOK'], ['SHIFT (HOLD)', 'RETRO BURNERS'], ['R', 'RESET'], ['ESC', 'MENU / PAUSE'], ['TAB', 'SETTINGS'], ['F1', 'BINDS']];
      b.forEach((row, i) => {
        const y = H * (0.25 + i * 0.058);
        this.text(ctx, row[0], W * 0.1, y, px, CC.CONFIG.hud.colors.yellow);   // v010 : 0,2 → 0,1, « RIGHT CLICK (HOLD) » chevauchait sa description
        this.text(ctx, row[1], W * 0.45, y, px, '#e8e8e8');
      });
      this.button(ctx, 'BACK (F1)', W / 2, H * 0.88, px, () => { this.overlay = null; });
    }

    // v034 : un bouton est-il sous ce point ? (le toucher sur le lanceur ne doit pas passer à travers les icônes)
    hitTest(x, y) { return this.buttons.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h); }

    click(x, y) {
      for (const b of this.buttons) {
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          const dir = x < b.x + b.w * 0.35 ? -1 : 1;
          this.game.audio.play('ui');
          if (CC.Touch && CC.Touch.active && CC.Haptics) CC.Haptics.tick('button');   // v024 : chaque bouton vibre (mobile)
          b.action(dir);
          return true;
        }
      }
      return false;
    }
  }

  CC.UI = UI;
})();

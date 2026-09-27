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
      if ((opts.box || touch) && opts.box !== false) {
        const pad = Math.max(2, px);
        ctx.fillStyle = opts.fill || 'rgba(255,255,255,0.07)'; ctx.fillRect(bx, by + pad * 0.5, w, h - pad);
        ctx.strokeStyle = opts.color || 'rgba(244,244,244,0.55)'; ctx.lineWidth = Math.max(1, px * 0.45); ctx.strokeRect(bx, by + pad * 0.5, w, h - pad);
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
      if (game.state === 'MENU') this.drawMenu(ctx, game, W, H);
      else if (game.state === 'RESULTS') this.drawResults(ctx, game, W, H);
      else if (game.paused && !this.overlay) this.drawPause(ctx, game, W, H);
      if (this.overlay === 'settings') this.drawSettings(ctx, game, W, H);
      else if (this.overlay === 'binds') this.drawBinds(ctx, game, W, H);
      // Surcouches exclusives : elles repartent d'une liste de boutons vide (aucun clic ne doit passer au travers).
      else if (this.overlay === 'difficulty') { this.buttons = []; this.drawDifficulty(ctx, game, W, H); }
      else if (this.overlay === 'shop') { this.buttons = []; if (!this.shop) this.shop = new CC.Shop(this); this.shop.draw(ctx, game, W, H); }
      else if (this.overlay === 'ad' && game.ads) { this.buttons = []; game.ads.draw(ctx, game, W, H, this); }
      if (game.state === 'MENU' && !this.overlay && game.ads) this.drawMenuBanner(ctx, game, W, H);
      if (game.notice) {   // v031 : message passager (achat confirmé au retour du paiement)
        const T = -(this.offsetY || 0), HH = this.fullH || H, px = this.fitPx([game.notice], W * 0.86, HH * 0.004);
        ctx.fillStyle = 'rgba(10,40,14,0.9)'; ctx.fillRect(W * 0.04, T + HH * 0.012, W * 0.92, px * 13);
        ctx.strokeStyle = CC.CONFIG.hud.colors.green; ctx.lineWidth = Math.max(1, px * 0.5); ctx.strokeRect(W * 0.04, T + HH * 0.012, W * 0.92, px * 13);
        this.text(ctx, game.notice, W / 2, T + HH * 0.012 + px * 3, px, CC.CONFIG.hud.colors.green, { align: 'center' });
      }
      if (game.state === 'BOOT') { this.dim(ctx, W, H, 1); this.text(ctx, 'LOADING...', W / 2, H / 2, H * 0.004, col.white, { align: 'center' }); }
    }

    drawMenu(ctx, game, W, H) {
      if (this.portrait && this.isTouch()) { this.drawMenuPortrait(ctx, game, W, H); return; }
      this.dim(ctx, W, H, 0.45);
      const col = CC.CONFIG.hud.colors;
      const P = this.portrait;   // v017 : en vertical, colonnes élargies (noms à gauche, records au bord droit), titre réduit
      this.text(ctx, 'COLD IMPACT', W / 2, H * 0.09, H * (P ? 0.0095 : 0.0125), col.white, { align: 'center', skew: -0.22 });
      this.text(ctx, 'STEER THE MISSILE. HIT THE TARGET. FLY CLOSE FOR STYLE.', W / 2, H * 0.2, H * (P ? 0.0019 : 0.0024), col.yellow, { align: 'center' });
      const best = game.save.best, px = H * 0.0036;
      const rowStep = Math.min(0.068, 0.56 / (CC.Levels.length + 1));   // v023 : 9 niveaux + AUTOMAP tiennent au-dessus de la boutique
      CC.Levels.forEach((lv, i) => {
        const y = H * (0.275 + i * rowStep);
        const open = game.isUnlocked(i);   // v023 : niveau verrouillé tant que le précédent n'est pas terminé
        if (open) this.button(ctx, (i + 1) + '  ' + lv.name, W * (P ? 0.07 : 0.3), y, px, () => game.startLevel(i), { align: 'left' });
        else this.text(ctx, (i + 1) + '  ' + lv.name, W * (P ? 0.07 : 0.3), y, px, '#5a5a5a');
        const b = best[lv.id];
        const info = b ? U.formatTime(b.time) + '   STYLE ' + U.formatInt(b.style) : open ? '--:--,--' : 'LOCKED';
        // colonne assez à droite : un temps enregistré ("0:12,27   STYLE 1.234") ne doit pas toucher le nom du niveau
        this.text(ctx, info, W * (P ? 0.97 : 0.88), y + px * 1.2, H * 0.0026, b ? '#cfcfcf' : '#7a7a7a', { align: 'right' });
      });
      // v007 : dernière carte = carte aléatoire (le clic ouvre le choix de difficulté)
      const ny = H * (0.275 + CC.Levels.length * rowStep);
      this.button(ctx, (CC.Levels.length + 1) + '  AUTOMAP', W * (P ? 0.07 : 0.3), ny, px, () => { this.overlay = 'difficulty'; }, { align: 'left', color: '#8fd0ff' });
      this.text(ctx, 'RANDOM - 3 DIFFICULTIES', W * (P ? 0.97 : 0.88), ny + px * 1.2, H * 0.0026, '#8fd0ff', { align: 'right' });
      this.button(ctx, 'ROCKET SHOP', W / 2, H * 0.92, px, () => { this.overlay = 'shop'; }, { color: '#fdfd02' });
      this.text(ctx, document.body.classList.contains('cc-touch') ? 'TAP A LEVEL' : 'CLICK A LEVEL    F1: BINDS    TAB: SETTINGS', W / 2, H * 0.85, H * 0.0024, '#bdbdbd', { align: 'center' });
      this.text(ctx, CC.CONFIG.version.toUpperCase(), W * 0.985, game.ads && game.ads.enabled() ? H * 0.875 : H * 0.955, H * 0.0018, '#808080', { align: 'right' });
    }

    /* v030 : menu principal en portrait sur téléphone — toute la hauteur de l'écran (avant : bande 16:9 centrée, lignes de
     * ~14 px), une ligne par niveau de ≥ 44 points, record sous le nom, boutique en bas, bannière d'exemple tout en bas. */
    drawMenuPortrait(ctx, game, W, H) {
      this.dim(ctx, W, H, 0.5);
      const col = CC.CONFIG.hud.colors, T = -(this.offsetY || 0), HH = this.fullH || H;
      const banner = game.ads && game.ads.enabled() ? HH * 0.075 : 0;
      this.text(ctx, 'COLD IMPACT', W / 2, T + HH * 0.04, this.fitPx(['COLD IMPACT'], W * 0.86, HH * 0.009), col.white, { align: 'center', skew: -0.22 });
      this.text(ctx, 'STEER. FLY CLOSE. HIT THE TARGET.', W / 2, T + HH * 0.1, this.fitPx(['STEER. FLY CLOSE. HIT THE TARGET.'], W * 0.9, HH * 0.003), col.yellow, { align: 'center' });
      const best = game.save.best, n = CC.Levels.length + 1;
      const top = T + HH * 0.14, bottom = T + HH - banner - HH * 0.12, rowH = (bottom - top) / n;
      const x0 = W * 0.05, w = W * 0.9;
      const names = CC.Levels.map((lv, i) => (i + 1) + '  ' + lv.name).concat([n + '  AUTOMAP']);
      const px = this.fitPx(names, w * 0.62, rowH * 0.05), sub = px * 0.6;
      const row = (i, name, info, open, color, action) => {
        const y = top + i * rowH + rowH * 0.18;
        if (open) this.button(ctx, name, x0 + px * 3, y, px, action, { align: 'left', hitW: w, color, box: true });
        else { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(x0, y - px * 2, w, Math.max(px * 11, 44 * this.pixelRatio())); this.text(ctx, name, x0 + px * 3, y, px, '#5a5a5a'); }
        this.text(ctx, info, x0 + w - px * 3, y + px * 1.6, sub, open ? (info.startsWith('--') ? '#8a8a8a' : '#cfcfcf') : '#6a6a6a', { align: 'right' });
      };
      CC.Levels.forEach((lv, i) => {
        const open = game.isUnlocked(i), b = best[lv.id];
        row(i, names[i], b ? U.formatTime(b.time) : open ? '--:--,--' : 'LOCKED', open, null, () => game.startLevel(i));
      });
      row(CC.Levels.length, names[CC.Levels.length], 'RANDOM', true, '#8fd0ff', () => { this.overlay = 'difficulty'; });
      const shop = 'ROCKET SHOP';
      this.button(ctx, shop, W / 2, T + HH - banner - HH * 0.08, this.fitPx([shop], W * 0.8, px * 1.1), () => { this.overlay = 'shop'; }, { color: '#fdfd02', box: true });
      this.text(ctx, CC.CONFIG.version.toUpperCase(), W * 0.97, T + HH - banner - HH * 0.022, px * 0.5, '#808080', { align: 'right' });
    }

    // v030 : bannière publicitaire d'exemple, en bas du menu principal
    drawMenuBanner(ctx, game, W, H) {
      if (!game.ads.enabled()) return;
      const T = -(this.offsetY || 0), HH = this.fullH || H;
      if (this.portrait && this.isTouch()) { const h = HH * 0.068; game.ads.drawBanner(ctx, this, W * 0.03, T + HH - h - HH * 0.006, W * 0.94, h); }
      else { const h = H * 0.08; game.ads.drawBanner(ctx, this, W * 0.745, H * 0.905, W * 0.24, h); }   // à droite du bouton de la boutique
    }

    /* Choix de difficulté de la carte aléatoire (v007). */
    drawDifficulty(ctx, game, W, H) {
      this.dim(ctx, W, H, 1);
      const col = CC.CONFIG.hud.colors, px = H * 0.0042;
      this.text(ctx, 'GENERATED MAP', W / 2, H * 0.17, H * 0.009, col.white, { align: 'center', skew: -0.2 });
      this.text(ctx, 'PICK A DIFFICULTY - THE MAP IS BUILT INSTANTLY', W / 2, H * 0.25, H * 0.0026, '#c8c8c8', { align: 'center' });
      ['easy', 'medium', 'hard'].forEach((id, i) => {
        const D = CC.GEN_DIFFS[id], y = H * (0.4 + i * 0.12);
        const info = D.kinds.length + ' TARGETS   ' + D.length + ' M OF STREET   ' + (D.soldiers ? D.soldiers + ' HOSTILE' + (D.soldiers > 1 ? 'S' : '') : 'NO HOSTILES');
        if (this.portrait) {   // v017 : en vertical, la description passe sous le bouton
          this.button(ctx, D.label, W / 2, y - H * 0.02, px, () => { this.overlay = null; game.startGenerated(id); });
          this.text(ctx, info, W / 2, y + H * 0.045, H * 0.0024, '#bdbdbd', { align: 'center' });
        } else {
          this.button(ctx, D.label, W / 2, y, px, () => { this.overlay = null; game.startGenerated(id); });
          this.text(ctx, info, W / 2 + W * 0.13, y, H * 0.0026, '#bdbdbd', { align: 'left' });
        }
      });
      this.button(ctx, this.key('BACK', 'ESC'), W / 2, H * 0.85, px, () => { this.overlay = null; });
    }

    // v022 : son et musique coupés / remis d'un geste (le volume précédent est conservé) ; sur écran tactile, pas de
    // rappel de touches clavier et des boutons plus gros
    toggleVolume(game, key) {
      const s = game.settings, keep = '_' + key;
      if (s[key] > 0) { s[keep] = s[key]; s[key] = 0; } else s[key] = s[keep] || CC.CONFIG.audio[key];
      game.applySettings();
    }
    drawPause(ctx, game, W, H) {
      this.dim(ctx, W, H, 0.55);
      const touch = document.body.classList.contains('cc-touch'), s = game.settings;
      const px = H * (touch ? 0.0056 : 0.0042), step = touch ? 0.115 : 0.09;
      const pT = touch && this.portrait ? -(this.offsetY || 0) : 0, pH = touch && this.portrait ? (this.fullH || H) : H;
      this.text(ctx, 'PAUSED', W / 2, pT + pH * (touch ? 0.09 : 0.2), this.fitPx(['PAUSED'], W * 0.6, H * 0.009), '#f4f4f4', { align: 'center', skew: -0.2 });
      const rows = [
        ['RESUME', () => game.resume()],
        ['SOUND: ' + (s.sfx > 0 ? 'ON' : 'OFF'), () => this.toggleVolume(game, 'sfx')],
        ['MUSIC: ' + (s.music > 0 ? 'ON' : 'OFF'), () => this.toggleVolume(game, 'music')],
        [touch ? 'RESTART' : 'RESTART (R)', () => { game.resume(); game.restartLevel(); }],
      ];
      // v023 : niveau suivant, seulement s'il est débloqué (niveau en cours déjà terminé une fois)
      const next = game.nextUnlocked();
      if (next >= 0) rows.push(['NEXT LEVEL', () => { game.resume(); game.startLevel(next); }]);
      if (!touch) rows.push(['SETTINGS (TAB)', () => { this.overlay = 'settings'; }]);
      if (touch) {   // v024 : intensité des vibrations (OFF / LOW / MEDIUM / HIGH)
        const names = ['OFF', 'LOW', 'MEDIUM', 'HIGH'], v = s.vibration !== undefined ? s.vibration : 2;
        rows.splice(3, 0, ['VIBRATION: ' + names[v], () => {
          s.vibration = (v + 1) % 4;
          if (CC.Haptics) { CC.Haptics.setLevel(s.vibration); CC.Haptics.tick('fire'); }   // on sent tout de suite la nouvelle force
          game.applySettings();
        }]);
      }
      if (touch) {   // v030 : qualité graphique et publicités d'exemple, réglables en partie
        rows.push(['GRAPHICS: ' + this.graphicsLabel(game), () => this.cycleGraphics(game)]);
        rows.push(['SAMPLE ADS: ' + (s.ads === false ? 'OFF' : 'ON'), () => { s.ads = s.ads === false; game.applySettings(); }]);
      }
      rows.push(['MAIN MENU', () => game.toMenu()]);
      if (touch) {   // v030 : pleine hauteur de l'écran, police ajustée à la largeur, un bouton ≥ 44 points par ligne
        const T = this.portrait ? -(this.offsetY || 0) : 0, HH = this.portrait ? (this.fullH || H) : H;
        const top = T + HH * 0.2, gap = Math.min(HH * 0.085, (HH * 0.74) / rows.length);
        const bpx = this.fitPx(rows.map((r) => r[0]), W * 0.8, Math.min(px, gap * 0.07));
        rows.forEach((r, i) => this.button(ctx, r[0], W / 2, top + i * gap, bpx, r[1], { hitW: W * 0.84 }));
        return;
      }
      const top = 0.36, gap = Math.min(step, (0.95 - top) / rows.length);   // v024 : 7 lignes tiennent à l'écran
      rows.forEach((r, i) => this.button(ctx, r[0], W / 2, H * (top + i * gap), px, r[1]));
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
      if (game.generated) { labels.push('NEW MAP'); acts.push([via(() => { this.overlay = 'difficulty'; }), null]); }
      else if (game.levelIndex < CC.Levels.length - 1) { labels.push(this.key('NEXT LEVEL', 'N')); acts.push([via(() => game.startLevel(game.levelIndex + 1)), null]); }
      labels.push(this.key('MAIN MENU', 'ESC')); acts.push([via(() => game.toMenu()), null]);
      const top = Y(full ? 0.48 : 0.63), gap = full ? HH * 0.09 : H * 0.08;
      const bpx = full ? this.fitPx(labels, W * 0.78, px) : px;
      labels.forEach((l, i) => this.button(ctx, l, W / 2, top + i * gap, i === 0 && acts[0][1] === '#8fd0ff' && !full ? px * 0.8 : bpx, acts[i][0], { color: acts[i][1] || undefined, box: acts[i][1] === '#8fd0ff' || undefined, hitW: full ? W * 0.84 : undefined }));
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

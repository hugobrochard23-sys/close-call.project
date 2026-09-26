/* Boutique de cosmétiques (v007) : grille de fiches, achat avec le solde gagné en jouant, équipement immédiat.
 * Les prix sont fictifs (le jeu n'encaisse rien) ; le solde s'obtient en terminant des niveaux.
 * Le dessin passe par CC.UI (police du HUD) et enregistre ses zones cliquables dans ui.buttons. */
(function () {
  const TIER_COLOR = { base: '#9a9a9a', common: '#e8e8e8', rare: '#fdfd02', ultra: '#ff7c1f' };

  // Icône 2D : silhouette bâtie sur les mêmes dimensions que le modèle 3D (nez = droite).
  function icon(ctx, s, xc, yc, h) {
    const d = s.dims, c = s.c;
    const len = h * (0.55 + 0.45 * Math.min(d.len / 0.86, 1.5));
    const rr = h * 0.11 * Math.max(0.55, d.r / 0.1);
    const x0 = xc - len * 0.45, x1 = xc + len * 0.2;
    // ailerons
    if (d.fins) {
      ctx.fillStyle = c.fin;
      ctx.fillRect(x0 - rr * 0.2, yc - rr * 2.1, rr * 1.1, rr * 1.4);
      ctx.fillRect(x0 - rr * 0.2, yc + rr * 0.7, rr * 1.1, rr * 1.4);
    }
    // corps
    ctx.fillStyle = c.body; ctx.fillRect(x0, yc - rr, x1 - x0, rr * 2);
    // collier
    ctx.fillStyle = c.band; ctx.fillRect(x0 + len * 0.22, yc - rr, rr * 0.7, rr * 2);
    // nez
    ctx.fillStyle = c.nose;
    ctx.beginPath();
    ctx.moveTo(x1, yc - rr); ctx.lineTo(x1 + len * 0.22, yc - rr * 0.45);
    ctx.lineTo(x1 + len * 0.24, yc + rr * 0.45); ctx.lineTo(x1, yc + rr);
    ctx.closePath(); ctx.fill();
    // pointe
    ctx.fillStyle = c.tip;
    ctx.fillRect(x1 + len * 0.2, yc - rr * 0.5, Math.max(2, rr * 0.5), rr);
  }

  // Tronque un libellé trop large pour sa colonne (la police est monospace, la mesure est exacte).
  function fit(text, px, maxW) {
    if (CC.Font.measure(text, px) <= maxW) return text;
    let t = text;
    while (t.length > 2 && CC.Font.measure(t + '.', px) > maxW) t = t.slice(0, -1);
    return t + '.';
  }

  class Shop {
    constructor(ui) { this.ui = ui; this.sel = 'stock'; this.flash = null; }

    draw(ctx, game, W, H) {
      const ui = this.ui, col = CC.CONFIG.hud.colors, list = CC.Skins.list;
      ui.dim(ctx, W, H, 1);              // opaque : le menu ne doit pas dépasser derrière la grille
      const px = H * 0.0032, small = H * 0.0026;
      // v017 : téléphone tenu droit → toute la hauteur de la vue (T = haut, HH = hauteur), 2 colonnes, solde sous le titre.
      // Couché : T = 0 et HH = H, les formules redonnent exactement la disposition d'origine.
      const P = ui.portrait, T = P ? -(ui.offsetY || 0) : 0, HH = P ? (ui.fullH || H) : H;
      ui.text(ctx, 'ROCKET SHOP', W * 0.5, T + HH * (P ? 0.03 : 0.05), H * 0.0085, col.white, { align: 'center', skew: -0.2 });
      ui.text(ctx, 'COSMETICS FOR THE MISSILE', W * 0.5, T + HH * (P ? 0.085 : 0.118), small, '#bdbdbd', { align: 'center' });
      if (P) ui.text(ctx, 'CASH ' + CC.Skins.formatPrice(game.save.cash) + '   (FICTIONAL PRICES)', W * 0.5, T + HH * 0.115, small, col.yellow, { align: 'center' });
      else {
        ui.text(ctx, 'CASH ' + CC.Skins.formatPrice(game.save.cash), W * 0.95, H * 0.055, px, col.yellow, { align: 'right' });
        ui.text(ctx, 'FICTIONAL PRICES', W * 0.95, H * 0.095, small * 0.85, '#8a8a8a', { align: 'right' });
      }

      const cols = P ? 2 : 3, colW = W * (P ? 0.455 : 0.3), x0 = W * 0.035, y0 = T + HH * (P ? 0.15 : 0.165), rowH = HH * (P ? 0.065 : 0.099);
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        const cx = x0 + (i % cols) * (colW + W * (P ? 0.02 : 0.017)), cy = y0 + Math.floor(i / cols) * rowH;
        const hot = ui.mouse.x >= cx && ui.mouse.x <= cx + colW && ui.mouse.y >= cy && ui.mouse.y <= cy + rowH * 0.88;
        const owned = !!game.save.owned[s.id], equipped = game.save.equipped === s.id;
        if (hot) this.sel = s.id;
        const bg = equipped ? 'rgba(253,253,2,0.10)' : hot ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.035)';
        ctx.fillStyle = bg; ctx.fillRect(cx, cy, colW, rowH * 0.88);
        ctx.strokeStyle = equipped ? col.yellow : hot ? '#cfcfcf' : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = Math.max(1, H / 540);
        ctx.strokeRect(cx, cy, colW, rowH * 0.88);
        icon(ctx, s, cx + colW * 0.1, cy + rowH * 0.4, H * (P ? 0.034 : 0.04));
        const right = equipped ? 'EQUIPPED' : owned ? 'OWNED' : CC.Skins.formatPrice(s.price);
        const rightX = cx + colW - W * 0.014, nameX = cx + colW * 0.22;
        const avail = rightX - nameX;
        // nom complet si la place le permet, sinon nom court, sinon tronqué
        const label = CC.Font.measure(s.name, small) <= avail ? s.name : fit(s.short || s.name, small, avail);
        ui.text(ctx, label, nameX, cy + rowH * 0.24, small, TIER_COLOR[s.tier], {});
        ui.text(ctx, s.tierLabel, nameX, cy + rowH * 0.6, small * 0.82, '#9a9a9a', {});
        ui.text(ctx, right, rightX, cy + rowH * 0.6, small, equipped ? col.yellow : owned ? col.green : '#e8e8e8', { align: 'right' });
        ui.buttons.push({ x: cx, y: cy, w: colW, h: rowH * 0.88, action: () => this.pick(game, s.id) });
      }

      // panneau de détail : chaque ligne est coupée à la largeur réellement disponible
      const s = CC.Skins.get(this.sel);
      const py = T + HH * (P ? 0.87 : 0.875), lx = W * 0.05, rx = W * 0.95;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(W * 0.035, py, W * 0.93, H * 0.1);
      const state = game.save.equipped === s.id ? 'EQUIPPED' : game.save.owned[s.id] ? 'OWNED - CLICK TO EQUIP' : game.save.cash >= s.price ? 'CLICK TO BUY' : 'NOT ENOUGH CASH';
      const hint = this.flash || 'ESC: BACK';
      const head = s.name + '   -   ' + s.tierLabel + '   ' + (s.price ? CC.Skins.formatPrice(s.price) : 'OFFERT');
      ui.text(ctx, fit(head, px, rx - lx - CC.Font.measure(state, small) - W * 0.02), lx, py + H * 0.035, px, TIER_COLOR[s.tier], {});
      ui.text(ctx, state, rx, py + H * 0.035, small, '#bdbdbd', { align: 'right' });
      ui.text(ctx, fit(s.tagline, small, rx - lx - CC.Font.measure(hint, small * 0.9) - W * 0.02), lx, py + H * 0.072, small, '#d8d8d8', {});
      ui.text(ctx, hint, rx, py + H * 0.072, small * 0.9, this.flash ? col.orange : '#8a8a8a', { align: 'right' });
    }

    pick(game, id) {
      const s = CC.Skins.byId[id];
      if (!s) return;
      if (game.save.owned[id]) {
        game.equipCosmetic(id);
        this.flash = id === 'stock' ? 'BACK TO THE STOCK MISSILE' : (s.short || s.name) + ' EQUIPPED';
        game.audio.play('ui');
      } else if (game.save.cash >= s.price) {
        game.buyCosmetic(id);
        this.flash = (s.short || s.name) + ' BOUGHT - ' + CC.Skins.formatPrice(s.price);
        game.audio.play('target');
      } else {
        this.flash = 'NOT ENOUGH CASH';
        game.audio.play('ui');
      }
      this.sel = id;
    }
  }

  CC.Shop = Shop;
})();

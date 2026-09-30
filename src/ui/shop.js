/* Boutique de cosmétiques (v007, refaite en v031) : grille de fiches ; un cosmétique se débloque en payant 2,29 € (lien de
 * paiement Stripe, retour automatique dans le jeu) ou en regardant une minute de publicité en entier ; équipement immédiat.
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
      ui.text(ctx, 'BOUTIQUE', W * 0.5, T + HH * (P ? 0.03 : 0.05), ui.fitPx(['BOUTIQUE'], W * (ui.isTouch() ? 0.56 : 0.9), H * 0.0085), col.white, { align: 'center', skew: -0.2 });   // v031 : place pour BACK à gauche
      const offer = CC.Skins.formatPrice(CC.CONFIG.shop.priceCents) + ' OR 1 MIN OF ADS EACH';
      ui.text(ctx, 'COSMETICS FOR THE MISSILE', W * 0.5, T + HH * (P ? 0.085 : 0.118), small, '#bdbdbd', { align: 'center' });
      if (P) ui.text(ctx, offer, W * 0.5, T + HH * 0.115, ui.fitPx([offer], W * 0.9, small), col.yellow, { align: 'center' });
      else ui.text(ctx, offer, W * 0.97, H * 0.06, ui.fitPx([offer], W * 0.24, small), col.yellow, { align: 'right' });   // à droite du titre

      const cols = P ? 2 : 3, colW = W * (P ? 0.455 : 0.3), x0 = W * 0.035, y0 = T + HH * (P ? 0.15 : 0.165), rowH = HH * (P ? 0.065 : 0.099);
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        const cx = x0 + (i % cols) * (colW + W * (P ? 0.02 : 0.017)), cy = y0 + Math.floor(i / cols) * rowH;
        const hot = ui.mouse.x >= cx && ui.mouse.x <= cx + colW && ui.mouse.y >= cy && ui.mouse.y <= cy + rowH * 0.88;
        const owned = !!game.save.owned[s.id], equipped = game.save.equipped === s.id;
        // v031 : la sélection se fait au clic (le survol ne change plus la fiche : on vise ses boutons sans la perdre)
        const bg = equipped ? 'rgba(253,253,2,0.10)' : hot ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.035)';
        ctx.fillStyle = bg; ctx.fillRect(cx, cy, colW, rowH * 0.88);
        ctx.strokeStyle = equipped ? col.yellow : this.sel === s.id ? '#8fd0ff' : hot ? '#cfcfcf' : 'rgba(255,255,255,0.18)';   // v031 : fiche choisie en bleu
        ctx.lineWidth = Math.max(1, H / 540);
        ctx.strokeRect(cx, cy, colW, rowH * 0.88);
        icon(ctx, s, cx + colW * 0.1, cy + rowH * 0.4, H * (P ? 0.034 : 0.04));
        const right = equipped ? 'EQUIPEE' : owned ? 'A TOI' : CC.Skins.formatPrice(s.price);
        const rightX = cx + colW - W * 0.014, nameX = cx + colW * 0.22;
        const avail = rightX - nameX;
        // nom complet si la place le permet, sinon nom court, sinon tronqué
        const label = CC.Font.measure(s.name, small) <= avail ? s.name : fit(s.short || s.name, small, avail);
        ui.text(ctx, label, nameX, cy + rowH * 0.24, small, TIER_COLOR[s.tier], {});
        ui.text(ctx, s.tierLabel, nameX, cy + rowH * 0.6, small * 0.82, '#9a9a9a', {});
        ui.text(ctx, right, rightX, cy + rowH * 0.6, small, equipped ? col.yellow : owned ? col.green : '#e8e8e8', { align: 'right' });
        ui.buttons.push({ x: cx, y: cy, w: colW, h: rowH * 0.88, action: () => this.pick(game, s.id) });
      }

      // panneau de détail du cosmétique choisi : nom, phrase, et pour un cosmétique à débloquer deux gros boutons
      // (payer / regarder une minute de publicité) ; un cosmétique possédé s'équipe d'un simple toucher sur sa fiche
      const s = CC.Skins.get(this.sel);
      const ph = HH * (P ? 0.115 : 0.105), py = T + HH * (P ? 0.87 : 0.875) - (P ? HH * 0.01 : 0), lx = W * 0.05, rx = W * 0.95;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(W * 0.035, py, W * 0.93, ph);
      const owned = !!game.save.owned[s.id], eq = game.save.equipped === s.id;
      const state = eq ? 'EQUIPEE' : owned ? (ui.isTouch() ? 'A TOI - TOUCHE POUR EQUIPER' : 'A TOI - CLIC POUR EQUIPER') : '';
      // message passager (achat, erreur de lien) à la place du nom : dans le panneau, jamais sur la grille
      if (this.flash) ui.text(ctx, fit(this.flash, small, (rx - lx) * (owned ? 0.55 : 0.95)), lx, py + ph * 0.12, small, col.orange, {});
      else ui.text(ctx, fit(s.name + '  -  ' + s.tierLabel, px, (rx - lx) * (owned ? 0.55 : 0.95)), lx, py + ph * 0.1, px, TIER_COLOR[s.tier], {});
      if (owned) {
        ui.text(ctx, state, rx, py + ph * 0.1, small, eq ? col.yellow : col.green, { align: 'right' });
        ui.text(ctx, fit(s.tagline, small, rx - lx), lx, py + ph * 0.45, small, '#d8d8d8', {});
      } else {
        const bw = (rx - lx - W * 0.03) / 2, by = py + ph * 0.42, bpx = ui.fitPx(['ACHETER ' + CC.Skins.formatPrice(s.price), '1 MIN DE PUB'], bw * 0.85, px);
        ui.button(ctx, 'ACHETER ' + CC.Skins.formatPrice(s.price), lx + bw / 2, by, bpx, () => this.buy(game, s.id), { box: true, color: col.yellow, hitW: bw });
        ui.button(ctx, '1 MIN DE PUB', rx - bw / 2, by, bpx, () => this.watch(game, s.id), { box: true, color: '#8fd0ff', hitW: bw });
      }
      if (!ui.isTouch()) ui.text(ctx, 'ECHAP : RETOUR', W * 0.03, T + HH * (P ? 0.03 : 0.06), small * 0.9, '#8a8a8a', {});   // à gauche du titre
      else ui.button(ctx, 'RETOUR', W * 0.11, T + HH * (P ? 0.035 : 0.055), ui.fitPx(['RETOUR'], W * 0.14, small * 1.4), () => { ui.overlay = null; }, { box: true, hitW: W * 0.17 });
    }

    pick(game, id) {
      const s = CC.Skins.byId[id];
      if (!s) return;
      this.sel = id; this.flash = null;
      if (game.save.owned[id]) {
        game.equipCosmetic(id);
        this.flash = id === 'stock' ? 'RETOUR A LA ROQUETTE D ORIGINE' : (s.short || s.name) + ' EQUIPEE';
      }
    }

    /* Paiement : redirection vers le lien Stripe (même onglet : au retour, Stripe renvoie vers le jeu qui débloque le
     * cosmétique — voir CC.Shop.handleReturn). Le cosmétique voyage dans utm_content (Stripe le recopie dans l'adresse de
     * retour) et dans client_reference_id (visible dans le Dashboard et les webhooks). */
    buy(game, id) {
      const link = CC.CONFIG.shop.stripeLink;
      if (!link) { this.flash = 'LIEN DE PAIEMENT NON REGLE (CONFIG SHOP.STRIPELINK)'; return; }
      game.save.pendingPurchase = id; game.writeSave();
      const url = link + (link.indexOf('?') < 0 ? '?' : '&') + 'client_reference_id=' + encodeURIComponent(id) + '&utm_content=' + encodeURIComponent(id) + '&utm_source=coldimpact';
      game.telemetry.event('purchase', { id });
      if (window.top === window) window.location.href = url;          // page du jeu : même onglet, retour automatique
      else { const w = window.open(url, '_blank'); if (!w) this.flash = 'OUVRE LE JEU DANS UN NAVIGATEUR POUR PAYER'; }   // jeu intégré dans une autre page
    }

    // Publicité : une minute entière (annonces de 15 s enchaînées) ; fermer avant la fin ne débloque rien
    watch(game, id) {
      const s = CC.Skins.byId[id];
      game.ads.rewarded(() => { game.unlockCosmetic(id); this.flash = (s.short || s.name) + ' DEBLOQUEE ET EQUIPEE'; game.audio.play('target'); }, CC.CONFIG.shop.adSeconds);
      this.flash = null;
    }
  }

  /* Retour du paiement Stripe : l'adresse contient ?paid=1 (réglé dans le Dashboard) et utm_content=<cosmétique>. Le
   * cosmétique est débloqué et équipé, puis ces paramètres sont retirés de l'adresse (un rechargement ne rejoue rien).
   * LIMITE : sans serveur, le jeu ne peut pas vérifier le paiement auprès de Stripe (il faudrait vérifier session_id avec la
   * clé secrète) ; quelqu'un qui recopie l'adresse de retour obtient le cosmétique. */
  Shop.handleReturn = function (game) {
    const P = new URLSearchParams(location.search);
    if (P.get('paid') !== '1') return null;
    const id = P.get('utm_content') || game.save.pendingPurchase;
    const s = id && CC.Skins.byId[id];
    ['paid', 'session_id', 'utm_content', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term'].forEach((k) => P.delete(k));
    try { history.replaceState(null, '', location.pathname + (P.toString() ? '?' + P : '') + location.hash); } catch (e) { /* adresse inchangée */ }
    if (!s) return null;
    delete game.save.pendingPurchase;
    game.unlockCosmetic(id);
    game.writeSave();
    return (s.short || s.name) + ' DEBLOQUEE - MERCI !';
  };

  CC.Shop = Shop;
})();

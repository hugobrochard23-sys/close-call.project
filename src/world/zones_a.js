/* v035 : zones AVENUE et METRO.
 *
 * AVENUE — une vraie avenue de ville vue d'en haut : chaussée avec marquages, trottoirs, lampadaires, arbres, voitures garées ;
 *   rangées d'immeubles d'un même quartier (même style, même bande de hauteur) séparées par des rues transversales.
 *   Scènes : boulevard · carrefour (feux, passage piéton, viaduc au-dessus) · viaduc (autoroute qui longe l'avenue) · chantier (un côté
 *   en construction, grue, échafaudages) · marché (maisons basses, auvents rayés, étals, guirlandes) · passage (on traverse un immeuble)
 *   · SIGNATURE : la tour en construction, que l'on traverse étage par étage.
 * METRO — sous le sol (−44 m), tunnel carré sous un plafond, rails, lampes ; on y entre par une tranchée et une bouche.
 *   Scènes : tunnel · station (quais, colonnes, rame à l'arrêt) · embranchement · éboulement · puits de ventilation (respiration : on voit
 *   le ciel au bout) · SIGNATURE : la rame qui fonce en face (on passe au-dessus). */
(function () {
  const U = CC.U, G = CC.Gen, Z = CC.Zones, DEG = 180 / Math.PI;
  const NEON_PAL = ['#ff3ad8', '#2be8ff', '#ffb02b', '#8a6aff'];
  const PAST = ['#ffffff', '#f2d6c4', '#d8e4f0', '#e8e0b8', '#d8c8e0', '#c8e0d0', '#f0c8c8'];

  // ============================================================== AVENUE
  // un quartier : style de façade, plage de hauteur, largeur des immeubles
  function district(S, lo, hi) {
    const sr = S.sr, side = S.dark ? 'facadeDark' : sr.pick(['facade', 'facadePink', 'facadeTan']);
    return { mat: { side, top: 'concrete', bottom: 'concreteDark' }, tints: [sr.pick(['#ffffff', '#f2eee8', '#e8ecf0']), sr.pick(['#f2eee8', '#e8ecf0', '#ffffff'])], lo, hi };
  }
  // rues transversales : positions (distance) et largeur
  function crossStreets(S, every) {
    const out = []; let d = S.d0 + S.sr.between([30, 60]);
    while (d < S.d1 - 30) { out.push(d); d += every * S.sr.between([0.8, 1.25]); }
    return out;
  }
  function avenueRoad(S, crosses) {
    const T = S.T;
    // marquages : ligne centrale en pointillés, lignes de rive
    S.rows(S.d0, S.d1, 12, 0, (dc) => { S.bx(dc, 0, 0.07, 0.3, 0.06, 5, 'col:#e8e2c8', undefined, false, { shadow: false }); });
    for (const s of [-1, 1]) S.rows(S.d0, S.d1, 22, 0, (dc) => S.bx(dc, s * (S.vol(dc) - 10), 0.07, 0.25, 0.06, 14, 'col:#e8e2c8', undefined, false, { shadow: false }));
    // rues transversales et passages piétons
    for (const c of crosses) {
      for (let k = -3; k <= 3; k++) S.bx(c - 11, k * 3.2, 0.08, 1.6, 0.06, 4, 'col:#e8e8e0', undefined, false, { shadow: false });
      S.bx(c, 0, 0.055, 2 * (S.vol(c) + 40), 0.05, 14, 'asphalt', '#c8c8c8', false, { shadow: false });
    }
  }
  function furniture(S, crosses, opts) {
    opts = opts || {};
    const cs = (dc) => crosses.some((c) => Math.abs(c - dc) < 12);
    // lampadaires (rythme régulier) et arbres d'alignement
    for (const s of [-1, 1]) {
      S.rows(S.d0, S.d1, 26, 0.04, (dc) => { if (cs(dc)) return; S.item(dc, (r) => {
        const lx = s * (S.vol(dc) - 2.2), h = 9;
        S.cyl(dc, lx, 0, 0.2, h, 'col:#2c2f33', undefined, 6, 0.14);
        S.bx(dc, lx - s * 1.3, h, 2.6, 0.22, 0.22, 'col:#3a3d42', undefined, false);
        S.bx(dc, lx - s * 2.5, h - 0.15, 0.9, 0.22, 0.6, S.dark ? 'basic:#ffe8b0' : 'col:#dcdcd4', undefined, false);
        if (S.dark) S.glow(dc, lx - s * 2.5, h - 0.4, '#ffb864', 7);
      }); });
      if (!opts.noTrees) S.rows(S.d0 + 8, S.d1, 15, 0.12, (dc) => { if (cs(dc)) return; S.item(dc, (r) => {
        const p = S.at(dc, s * (S.vol(dc) - 5.2), 0);
        S.kit('tree', r, { t: 'tree', x: p[0], z: p[2], y0: p[1], h: r.between([6.5, 9]), rad: 0.3, broad: true });
      }); });
      if (!opts.noCars) S.rows(S.d0 + 4, S.d1, 11, 0.45, (dc) => { if (cs(dc) || S.sr() < 0.35) return; S.item(dc, (r) => {
        const p = S.at(dc, s * (S.vol(dc) - 11.5), 0);
        S.kit('car', r, { t: 'car', x: p[0], z: p[2], y0: p[1], yaw: S.yaw(dc) / DEG, col: r.pick(['#b8382c', '#2a5a8a', '#e8e8e4', '#3a3a40', '#c8a020', '#3a7a4a', '#8a8a90']) });
      }); });
    }
  }
  // rangée d'immeubles d'un côté : dans la bande de hauteur du quartier, avec retraits, rez-de-chaussée commerçant, toits équipés
  function buildingRow(S, s, dist, crosses, off, opts) {
    opts = opts || {};
    let dc = S.d0;
    while (dc < S.d1) {
      const dd = S.sr.between(opts.dd || [16, 26]), cx = dc + dd / 2, h = S.sr.between([dist.lo, dist.hi]), set = S.sr.between([0, 2.2]), tint = S.sr.pick(dist.tints), roll = S.sr();
      const cross = crosses.some((c) => Math.abs(c - cx) < dd / 2 + 8);
      if (!cross && !(opts.skip && opts.skip(cx))) {
        S.item(cx, (r) => {
          const w = r.between([14, 22]), v = S.vol(cx) + off + set;
          S.bx(cx, s * (v + w / 2), h / 2 - 0.5, w, h, dd - 0.6, dist.mat, tint);
          if (opts.shops) S.bx(cx, s * (v - 0.12 + w / 2), 2.1, w + 0.25, 4.2, dd - 0.4, 'storefront', tint, false);
          if (S.dark) {          // enseignes néon : une barre au-dessus de la vitrine, parfois une enseigne verticale en potence ; palette limitée (cyan, magenta, ambre)
            const pal = NEON_PAL, c1 = r.pick(pal);
            if (r() < 0.65) S.neon(cx, s * (v - 0.4), 5.3, 0.3, 1.0, dd * 0.6, c1, 9);
            if (r() < 0.4) S.neon(cx, s * (v - 1.2), r.between([9, 16]), 0.5, r.between([5, 9]), 1.3, r.pick(pal), 10);
            if (r() < 0.25) S.neon(cx, s * (v + w * 0.5), h + 1.6, 0.4, 2.4, dd * 0.7, r.pick(pal), 12);
          }
          if (h > 34 && roll < 0.4) { const w2 = w * 0.6, h2 = r.between([6, 14]); S.bx(cx, s * (v + w / 2 + 2), h + h2 / 2 - 0.5, w2, h2, dd * 0.6, dist.mat, tint); }
          if (roll > 0.72) { S.cyl(cx, s * (v + w * 0.65), h - 0.5, 1.7, 3, 'planks', undefined, 10, 1.7, false); for (const a of [-1, 1]) for (const c of [-1, 1]) S.bx(cx + c, s * (v + w * 0.65) + a, h + 1, 0.2, 2, 0.2, 'col:#3a3028', undefined, false); }
          else if (roll > 0.5) S.bx(cx, s * (v + w * 0.6), h + 4, 0.25, 8, 0.25, 'col:#2a2a2e', undefined, false);
        });
      }
      dc += dd;
    }
  }
  function farTowers(S, lo, hi, n) {
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const dc = S.d0 + S.sr() * S.len, h = S.sr.between([lo, hi]), off = S.sr.between([30, 90]), w = S.sr.between([18, 34]), tint = S.sr.pick(PAST);
      S.item(dc, (r) => S.bx(dc, s * (S.vol(dc) + off), h / 2 - 0.5, w, h, S.sr.between([16, 30]), { side: 'facade', top: 'concrete', bottom: 'concreteDark' }, tint, false));
    }
  }

  const city = { signature: 'tower', scenes: {}, dress: null };
  Z.defs.city = city;
  city.scenes.boulevard = { len: [220, 320], build(S) {
    const sr = S.sr, crosses = crossStreets(S, 82), dist = district(S, sr.between([26, 40]), sr.between([46, 76]));
    avenueRoad(S, crosses); furniture(S, crosses);
    for (const s of [-1, 1]) buildingRow(S, s, dist, crosses, 0, { shops: true });
    farTowers(S, 70, 170, 4);
  } };
  city.scenes.carrefour = { len: [170, 230], build(S) {
    const sr = S.sr, c = S.mid, crosses = [c], dist = district(S, sr.between([30, 52]), sr.between([50, 80]));
    avenueRoad(S, crosses); furniture(S, crosses);
    for (const s of [-1, 1]) buildingRow(S, s, dist, crosses, 0, { shops: true, skip: (cx) => Math.abs(cx - c) < 38 });
    // feux tricolores suspendus à un mât (quatre coins) ; passages piétons
    for (const s of [-1, 1]) for (const dz of [-1, 1]) S.item(c + dz * 14, (r) => {
      const lx = s * (S.vol(c) - 2.6), dc = c + dz * 14;
      S.cyl(dc, lx, 0, 0.25, 7.4, 'col:#3a3d42', undefined, 6, 0.2);
      S.bx(dc, lx - s * 3, 7.4, 6, 0.24, 0.24, 'col:#3a3d42', undefined, false);
      S.bx(dc, lx - s * 5.6, 6.6, 0.8, 1.9, 0.7, 'col:#1c1e22', undefined, false);
      S.bx(dc, lx - s * 5.6, 7.15, 0.5, 0.5, 0.72, 'basic:#ff3b2e', undefined, false);
    });
    // viaduc routier au-dessus du carrefour (route transversale surélevée)
    const L = S.lane(c), yb = U.clamp(L.y + S.R + 3.5, 18, 44), span = 2 * (S.vol(c) + 34), pins = true;
    S.item(c, (r) => {
      S.bx(c, 0, yb + 1.6, span, 3.2, 16, { side: 'concreteDark', top: 'asphalt', bottom: 'concreteDark' }, '#c8c8c8');
      for (const s of [-1, 1]) { S.bx(c, 0, yb + 3.9, span, 1.4, 0.4, 'concrete', undefined, false, {}); }
      for (const s of [-1, 1]) for (const k of [0, 1]) S.bx(c, s * (S.vol(c) + 10 + k * 16), yb / 2, 4, yb, 5, { side: 'concreteDark', top: 'concrete' }, '#b8b8b4');
      for (let i = -4; i <= 4; i++) S.bx(c, i * (span / 10), yb + 3.25, 0.3, 0.05, 11, 'col:#e8e2c8', undefined, false);
    });
    S.reserve(c, 0, span, 18); S.gate(c, L.lx, L.y);
    farTowers(S, 80, 180, 5);
  }, pin(T, sc) { const L = T.laneX0(sc.d0 + (sc.d1 - sc.d0) / 2), y = T.laneY0(sc.d0 + (sc.d1 - sc.d0) / 2); return { lx: U.clamp(L, -5, 5), y: U.clamp(y, 10, 26), from: (sc.d1 - sc.d0) / 2 - 25, to: (sc.d1 - sc.d0) / 2 + 25 }; } };
  city.scenes.viaduc = { len: [200, 280], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -4, 4), y: U.clamp(T.laneY0(mid), 10, 16), from: 40, to: sc.d1 - sc.d0 - 40 }; },
    build(S) {
      const sr = S.sr, crosses = crossStreets(S, 95), dist = district(S, sr.between([24, 36]), sr.between([44, 66]));
      avenueRoad(S, crosses); furniture(S, crosses, { noTrees: true });
      for (const s of [-1, 1]) buildingRow(S, s, dist, crosses, 0, { shops: true });
      // autoroute surélevée qui longe l'avenue, posée sur des piles : on vole en dessous, comme dans une nef
      const a = S.d0 + 40, b = S.d1 - 40, yb = 10 + 2 * S.R * 0.45 + 4.2;
      const hole = S.lane(S.mid);
      for (let dc = a; dc < b; dc += 20) S.item(dc + 10, (r) => {
        S.bx(dc + 10, 0, yb + 1.4, 2 * S.vol(dc) - 2, 2.8, 20.4, { side: 'concreteDark', top: 'asphalt', bottom: 'concreteDark' }, '#c8c8c8');
        for (const s of [-1, 1]) S.bx(dc + 10, s * (S.vol(dc) - 2.6), yb + 3.3, 0.5, 1.0, 20.4, 'concrete', undefined, false);
        if (r() < 0.6) { const p = S.at(dc + 10, (r() < 0.5 ? -1 : 1) * r.between([2, 9]), yb + 2.8); S.kit('car', r, { t: 'car', x: p[0], z: p[2], y0: p[1], yaw: S.yaw(dc) / DEG, col: r.pick(['#b8382c', '#2a5a8a', '#e8e8e4', '#3a3a40']) }); }
      });
      for (let dc = a; dc <= b; dc += 20) S.item(dc, (r) => { for (const s of [-1, 1]) S.bx(dc, s * (S.vol(dc) - 8), yb / 2, 3.2, yb, 3.2, { side: 'concreteDark', top: 'concrete' }, '#b0b0ac'); });
      S.reserve(S.mid, 0, 2 * S.vol(S.mid), b - a);
      farTowers(S, 70, 150, 4);
    } };
  city.scenes.chantier = { len: [220, 300], build(S) {
    const sr = S.sr, crosses = [], dist = district(S, sr.between([26, 40]), sr.between([44, 66])), open = sr() < 0.5 ? -1 : 1;
    avenueRoad(S, crosses); furniture(S, crosses, { noTrees: true });
    buildingRow(S, -open, dist, crosses, 0, { shops: true });
    // côté chantier : palissade, terre, grue à tour, squelette de bâtiment, échafaudages, conteneurs
    const off = S.vol(S.mid);
    S.rows(S.d0, S.d1, 14, 0, (dc) => S.bx(dc, open * (S.vol(dc) + 0.6), 1.3, 0.4, 2.6, 14.4, 'corrugated', '#c8b89a', true));
    S.bx(S.mid, open * (off + 34), 0.1, 68, 0.22, S.len, 'dirt', '#b89a78', false, { shadow: false });
    const tw = (dc, hgt) => S.item(dc, (r) => {          // grue à tour
      const lx = open * (S.vol(dc) + 18), col = 'col:#e0b020', arm = r.between([34, 46]);
      S.bx(dc, lx, hgt / 2, 2.4, hgt, 2.4, col);
      S.bx(dc, lx - open * arm / 2 + open * 6, hgt + 1.4, arm, 1.6, 1.8, col, undefined, false);
      S.bx(dc, lx + open * 8, hgt + 1.4, 9, 2.4, 2.6, 'col:#8a8a88', undefined, false);
      S.bx(dc, lx, hgt + 4.4, 1.8, 5, 1.8, col, undefined, false);
      const hx = lx - open * arm * 0.8; S.bx(dc, hx, hgt - 14, 0.12, 26, 0.12, 'col:#1a1a1a', undefined, false); S.bx(dc, hx, hgt - 28, 4, 2.4, 3, 'corrugated', '#b8382c', false);
    });
    tw(S.d0 + S.len * 0.3, r0(S, 56, 70)); tw(S.d0 + S.len * 0.78, r0(S, 48, 62));
    for (let i = 0; i < 2; i++) { const dc = S.d0 + S.len * (0.2 + i * 0.5), lx = open * (S.vol(dc) + 30 + i * 6);
      S.place(dc, lx, 20, 24, 0, 46, (r) => {        // squelette : poteaux + dalles
        const h = r.between([30, 46]);
        for (const a of [-1, 1]) for (const c of [-1, 1]) S.bx(dc + c * 9, lx + a * 7, h / 2, 1.2, h, 1.2, 'concrete', '#b8b8b4');
        for (let y = 7; y <= h; y += 7.5) S.bx(dc, lx, y, 17, 0.8, 21, 'concrete', '#c8c8c4');
        S.bx(dc, lx + open * 8.6, h / 2, 0.2, h, 22, 'glass', undefined, false);
        for (const c of [-1, 1]) S.bx(dc + c * 10.6, lx, h / 2, 16, h, 0.15, 'col:#3a6a3a', undefined, false);   // filet vert
      }, { vol: 90 }); }
    S.rows(S.d0 + 10, S.d1, 26, 0.3, (dc) => S.item(dc, (r) => { const p = S.at(dc, open * (S.vol(dc) + r.between([4, 12])), 0); S.kit(r() < 0.5 ? 'container' : 'pallets', r, { t: 'container', x: p[0], z: p[2], y0: p[1], yaw: S.yaw(dc) / DEG, n: 1 + Math.floor(r() * 2), col: r.pick(['#b8382c', '#2a5a8a', '#c89a20', '#3a7a4a']) }); }));
    farTowers(S, 60, 130, 3);
  } };
  function r0(S, a, b) { return S.sr.between([a, b]); }
  city.scenes.marche = { len: [180, 250], build(S) {
    const sr = S.sr, crosses = crossStreets(S, 70);
    avenueRoad(S, crosses); furniture(S, crosses, { noCars: true });
    const dist = { mat: { side: sr.pick(['brick', 'concreteWarm', 'facadeTan']), top: 'concreteDark', bottom: 'concreteDark' }, tints: [sr.pick(PAST), sr.pick(PAST)], lo: 7, hi: 13 };
    for (const s of [-1, 1]) {
      buildingRow(S, s, dist, crosses, 0, { shops: true });
      // auvents rayés
      S.rows(S.d0 + 6, S.d1, 10, 0.05, (dc) => { if (crosses.some((c) => Math.abs(c - dc) < 10)) return; S.item(dc, (r) => { const col = r.pick(['#e02a3c', '#2a6ac8', '#e8a020', '#2aa060']);
        S.bx(dc, s * (S.vol(dc) - 1.2), 5.2, 3.6, 0.3, 8.4, 'col:' + col, undefined, false, { r: [0, S.yaw(dc), s * 14] });
        S.bx(dc, s * (S.vol(dc) - 1.2), 5.12, 3.4, 0.1, 2.6, 'col:#f4f4ee', undefined, false, { r: [0, S.yaw(dc), s * 14] }); }); });
      // étals : table + parasol
      S.rows(S.d0 + 12, S.d1, 15, 0.2, (dc) => { if (crosses.some((c) => Math.abs(c - dc) < 12)) return; S.item(dc, (r) => { const lx = s * (S.vol(dc) - 4.6), col = r.pick(['#e02a3c', '#2a6ac8', '#e8a020', '#2aa060', '#e8e8e0']);
        S.bx(dc, lx, 1, 2.2, 0.2, 3.6, 'planks', undefined, false); for (const a of [-1, 1]) S.bx(dc + a * 1.5, lx, 0.5, 0.15, 1, 0.15, 'col:#3a3028', undefined, false);
        S.cyl(dc, lx, 1, 0.08, 3.6, 'col:#5a5a5a', undefined, 6, 0.08, false); S.cyl(dc, lx, 4.2, 2.6, 0.6, 'col:' + col, undefined, 10, 0.05, false);
        for (let k = 0; k < 4; k++) S.bx(dc + (k - 1.5) * 0.7, lx, 1.35, 0.5, 0.4, 0.5, 'col:' + r.pick(['#d83a2a', '#e8a020', '#58a83a', '#d8c02a']), undefined, false); }); });
    }
    // guirlandes de fanions en travers de l'avenue (décor, sans collision)
    if (S.sr() < 0.25) S.rows(S.d0 + 20, S.d1, 34, 0.15, (dc) => S.item(dc, (r) => { const y = 14 + r.between([0, 4]); S.bx(dc, 0, y, 2 * S.vol(dc), 0.06, 0.06, 'col:#2a2a2a', undefined, false); for (let k = -8; k <= 8; k++) S.bx(dc, k * S.vol(dc) / 8.5, y - 0.6, 0.7, 1.0, 0.05, 'col:' + r.pick(['#e02a3c', '#2a6ac8', '#e8a020', '#2aa060']), undefined, false); }));   // v039 : fanions rares (décor optionnel)
    farTowers(S, 50, 120, 6);
  } };
  city.scenes.passage = { len: [200, 270], noDoor: true, pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -6, 6), y: U.clamp(T.laneY0(mid), 13, 22), from: (sc.d1 - sc.d0) / 2 - 50, to: (sc.d1 - sc.d0) / 2 + 50 }; },
    build(S) {
      const sr = S.sr, crosses = [], dist = district(S, sr.between([28, 42]), sr.between([48, 70])), c = S.mid;
      avenueRoad(S, crosses); furniture(S, crosses);
      for (const s of [-1, 1]) buildingRow(S, s, dist, crosses, 0, { shops: true, skip: (cx) => Math.abs(cx - c) < 22 });
      // un immeuble barre l'avenue : on le traverse par un passage intérieur éclairé
      const L = S.lane(c), hh = S.R * 2 + 4, hw = S.R + 3.5, yc = U.clamp(L.y, hh / 2 + 1.2, 30), H = Math.max(yc + hh / 2 + 18, 46), v = S.vol(c) + 26, tint = S.sr.pick(dist.tints);
      S.item(c, (r) => {
        const lo = yc - hh / 2, hi = yc + hh / 2;
        const left = -v, right = v, lx0 = L.lx - hw, lx1 = L.lx + hw;
        S.bx(c, (left + lx0) / 2, H / 2 - 0.5, lx0 - left, H, 34, dist.mat, tint);
        S.bx(c, (lx1 + right) / 2, H / 2 - 0.5, right - lx1, H, 34, dist.mat, tint);
        S.bx(c, L.lx, (hi + H) / 2 - 0.25, hw * 2 + 0.2, H - hi, 34, dist.mat, tint);
        if (lo > 0.8) S.bx(c, L.lx, lo / 2 - 0.25, hw * 2 + 0.2, lo + 0.5, 34, 'concreteDark', '#b0b0ac');
        S.bx(c, L.lx, hi - 0.25, hw * 2, 0.3, 30, 'emis:#fff2d0', undefined, false);
        S.bx(c, L.lx, hi + 0.8, hw * 2 + 3, 0.7, 34.4, 'hazard', undefined, false);
        for (const s of [-1, 1]) S.bx(c, L.lx + s * hw, yc, 0.15, hh, 33, 'col:#1c1e22', undefined, false);
      });
      S.reserve(c, 0, 2 * v, 36); S.gate(c, L.lx, L.y);
      farTowers(S, 80, 170, 4);
    } };
  city.scenes.tower = { len: [200, 260], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -4, 4), y: 22, from: (sc.d1 - sc.d0) / 2 - 45, to: (sc.d1 - sc.d0) / 2 + 45 }; },
    build(S) {
      const sr = S.sr, crosses = [], dist = district(S, sr.between([28, 42]), sr.between([48, 70])), c = S.mid;
      avenueRoad(S, crosses); furniture(S, crosses, { noTrees: true });
      for (const s of [-1, 1]) buildingRow(S, s, dist, crosses, 0, { shops: true, skip: (cx) => Math.abs(cx - c) < 34 });
      // la tour en construction : on la traverse, dalle après dalle, entre les poteaux et les filets
      const yL = 22, fh = 22, top = 92, L = S.lane(c), half = S.vol(c), len = 56;
      S.item(c, (r) => {
        for (const a of [-1, 1]) for (const k of [-2, -1, 0, 1, 2]) S.bx(c + k * 12, a * (half - 1.4), top / 2, 2.6, top, 2.6, 'concrete', '#b4b4b0');
        for (const a of [-1, 1]) S.bx(c, a * (half - 1.4), 0.6, 2.8, 1.2, len, 'hazard', undefined, false);
        for (let lv = -1; lv <= 3; lv++) {
          const y = yL + (lv + 0.5) * fh; if (y < 1) continue;
          S.bx(c, 0, y, 2 * half, 1.4, len, 'concrete', '#c8c8c4');
          if (lv >= 0) for (const a of [-1, 1]) S.bx(c, a * (half - 0.2), y + 1.4, 0.15, 2.2, len, 'col:#3a6a3a', undefined, false);   // filets de sécurité
        }
        const yt = yL + 3.5 * fh;
        for (let k = 0; k < 6; k++) S.bx(c + r.between([-22, 22]), r.between([-half + 4, half - 4]), yt + 3, 0.12, 6, 0.12, 'col:#7a4a2a', undefined, false);   // fers à béton
      });
      S.place(c + 62, (r0(S, 0, 1) < 0.5 ? -1 : 1) * (half + 14), 10, 10, 0, 100, (r) => {       // grue de chantier collée à la tour
        const lx = (c % 2 < 1 ? -1 : 1) * (half + 14), col = 'col:#e0b020'; S.bx(c + 62, lx, 50, 2.4, 100, 2.4, col);
        S.bx(c + 62, lx - Math.sign(lx) * 16, 102, 40, 1.6, 1.8, col, undefined, false); S.bx(c + 62, lx + Math.sign(lx) * 10, 102, 12, 2.4, 2.6, 'col:#8a8a88', undefined, false);
      }, { vol: 120 });
      S.reserve(c, 0, 2 * half, len + 6); S.gate(c, L.lx, yL);
      farTowers(S, 90, 190, 5);
    } };


  // ---------- v054 : VILLE PLUS VARIEE — ruelle serrée · plongée entre des poteaux · enfilade de façades percées ----------
  // RUELLE : deux murs d'immeubles très hauts qui se resserrent (≈ 2 × rayon + 12 m), passerelles et enseignes en travers, la trajectoire est verrouillée au milieu
  city.scenes.ruelle = { len: [230, 300], noDoor: true,
    pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -5, 5), y: U.clamp(T.laneY0(mid), 12, 26), from: 40, to: sc.d1 - sc.d0 - 40 }; },
    build(S) {
      const sr = S.sr, dist = district(S, sr.between([70, 100]), sr.between([100, 150])), L0 = S.lane(S.mid), half = S.R + 5.5;
      avenueRoad(S, []);
      S.rows(S.d0 + 8, S.d1, 30, 0.05, (dc) => S.item(dc, () => { for (const s of [-1, 1]) { const lx = L0.lx + s * (half - 1.2); S.cyl(dc, lx, 0, 0.18, 8.5, 'col:#2c2f33', undefined, 6, 0.13, false); S.bx(dc, lx - s * 1.0, 8.5, 2, 0.2, 0.2, 'col:#3a3d42', undefined, false); } }));
      for (let dc = S.d0 + 44; dc < S.d1 - 44; dc += 17) S.item(dc + 8, (r) => {
        for (const s of [-1, 1]) {
          const w = r.between([16, 26]), set = r.between([0, 1.8]), h = r.between([dist.lo, dist.hi]), tint = r.pick(dist.tints), x = L0.lx + s * (half + set + w / 2);
          S.bx(dc + 8, x, h / 2 - 0.5, w, h, 16.6, dist.mat, tint);
          for (let k = 0; k < 4; k++) if (r() < 0.55) { const y = r.between([6, h - 8]); S.bx(dc + 8, L0.lx + s * (half + set - 0.7), y, 1.4, 0.18, r.between([6, 12]), 'col:#2a2a2e', undefined, false); }   // escaliers de secours / balcons (sans collision)
          if (r() < 0.22) S.bx(dc + 8, L0.lx + s * (half + set - 0.4), r.between([8, 22]), 0.3, 3.2, 5, 'emis:' + r.pick(['#d83a2a', '#e8a020', '#2a9ac8']), undefined, false);
        }
      });
      // passerelles vitrées et câbles en travers, toujours au-dessus ou au-dessous du couloir libre
      for (const f of [0.28, 0.58, 0.84]) { const dc = S.d0 + S.len * f, Lc = S.lane(dc); S.item(dc, (r) => { const above = r() < 0.5, y = above ? Lc.y + S.R + 4.5 : Math.max(1.5, Lc.y - S.R - 3.5); if (!above && y < 3) return; S.bx(dc, Lc.lx, y, 2 * half + 6, 2.4, 6, above ? 'concreteDark' : 'metal', '#b8b8b4'); S.bx(dc, Lc.lx, y + 1.4, 2 * half + 6.4, 0.5, 6.4, 'hazard', undefined, false); }); S.gate(dc, Lc.lx, Lc.y); }
      farTowers(S, 90, 190, 3);
    } };
  // PLONGEE : on entre très haut par un portique ; il faut piquer entre des paires de poteaux (mâts d'antenne) jusqu'à la rue
  city.scenes.plongee = { len: [260, 330], noDoor: true,
    pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -5, 5), y: 60, y2: 12, from: 34, to: sc.d1 - sc.d0 - 46 }; },
    build(S) {
      const sr = S.sr, dist = district(S, sr.between([90, 130]), sr.between([130, 190])), c0 = S.d0 + 60;
      avenueRoad(S, []);
      for (const s of [-1, 1]) buildingRow(S, s, dist, [], 0, {});
      // portique d'entrée, très haut : un mur d'immeuble percé à la hauteur de la trajectoire
      { const dc = c0, L = S.lane(dc), hh = S.R * 1.9 + 3, v = S.vol(dc) + 1, tint = sr.pick(dist.tints);
        S.item(dc, () => S.wall(dc, -v, v, 0, L.y + 50, 6, dist.mat, tint, { lx: L.lx, yc: L.y, w: hh, h: hh })); S.gate(dc, L.lx, L.y); S.reserve(dc, 0, 2 * v, 8); }
      // paires de poteaux : la trajectoire descend entre eux
      for (let dc = S.d0 + 100; dc < S.d1 - 30; dc += 15) S.item(dc, (r) => {
        const L = S.lane(dc), top = L.y + 70, g = S.R + 3.2;
        for (const s of [-1, 1]) { S.cyl(dc, L.lx + s * g, 0, 0.55, top, 'col:#2c2f33', undefined, 8, 0.4); S.bx(dc, L.lx + s * g, L.y + 6, 3.2, 0.4, 0.4, 'col:#e0b020', undefined, false); if (r() < 0.5) S.bx(dc, L.lx + s * g, top + 0.4, 0.5, 2.6, 0.5, 'emis:#d83a2a', undefined, false); }
        S.gate(dc, L.lx, L.y);
      });
      // un dernier portique bas en fin de descente (on passe dessous)
      { const dc = S.d1 - 18, L = S.lane(dc); S.item(dc, () => { const g = S.R + 3.2, h = L.y + S.R + 6; S.bx(dc, L.lx, h, 2 * g + 5, 2, 2.6, 'concreteDark', '#b8b8b4'); S.bx(dc, L.lx, h + 1.2, 2 * g + 5, 0.4, 2.8, 'hazard', undefined, false); }); }
      farTowers(S, 110, 200, 3);
    } };
  // ENFILADE : cinq façades successives, chacune percée d'une fenêtre à la hauteur de la trajectoire (qui monte et descend d'une à l'autre)
  city.scenes.enfilade = { len: [200, 250], noDoor: true,
    build(S) {
      const sr = S.sr, dist = district(S, sr.between([60, 90]), sr.between([90, 130])), n = 3, step = (S.len - 70) / n;
      avenueRoad(S, []); furniture(S, [], { noTrees: true });
      for (const s of [-1, 1]) buildingRow(S, s, dist, [], 0, { shops: true });
      for (let i = 0; i < n; i++) {
        const dc = S.d0 + 46 + i * step, L = S.lane(dc), hh = S.R * 2 + 3.5, hw = S.R * 2.3 + 4, v = S.vol(dc) + 1, tint = sr.pick(dist.tints), top = L.y + 46 + sr() * 16;
        S.item(dc, () => { S.wall(dc, -v, v, 0, top, 6, dist.mat, tint, { lx: L.lx, yc: L.y, w: hw, h: hh }); S.bx(dc, L.lx, L.y + hh / 2 + 0.6, hw + 3, 0.6, 6.4, 'hazard', undefined, false); S.bx(dc, L.lx, L.y - hh / 2 - 0.3, hw + 3, 0.6, 6.4, 'hazard', undefined, false); });
        S.reserve(dc, 0, 2 * v, 8); S.gate(dc - 20, L.lx, L.y); S.gate(dc - 9, L.lx, L.y); S.gate(dc, L.lx, L.y); S.gate(dc + 9, L.lx, L.y);
      }
      farTowers(S, 90, 180, 3);
    } };

  // ---------- v055 : VILLE EN 4 DIMENSIONS — chute libre · cheminée · slalom latéral · toits ----------
  // CHUTE LIBRE : on entre très haut par le toit, on tombe dans un puits entre deux murs d'immeubles, poutres et câbles en travers
  function shaft(S, half, h, dist) {
    avenueRoad(S, []);
    for (let dc = S.d0 + 6; dc < S.d1; dc += 22) S.item(dc + 11, (r) => {
      const L = S.lane(dc + 11), tint = r.pick(dist.tints);
      for (const s of [-1, 1]) {
        const w = r.between([16, 24]), set = r.between([0, 1.5]);
        S.bx(dc + 11, L.lx + s * (half + set + w / 2), h / 2 - 0.5, w, h, 21.6, dist.mat, tint);
        for (let k = 0; k < 3; k++) if (r() < 0.6) S.bx(dc + 11, L.lx + s * (half + set - 0.4), r.between([4, h - 6]), 0.3, 3, r.between([3, 8]), 'emis:' + r.pick(['#e8a020', '#2a9ac8', '#d83a2a']), undefined, false);
      }
    });
  }
  function beams(S, half, step, off0) {
    let k = 0;
    for (let dc = S.d0 + off0; dc < S.d1 - 30; dc += step, k++) S.item(dc, (r) => {
      const L = S.lane(dc), above = k % 2 === 0, y = above ? L.y + S.R + 7 : Math.max(2.5, L.y - S.R - 7);
      if (!above && y < 3.5) return;
      S.bx(dc, L.lx, y, 2 * half + 4, 1.6, 2.4, 'metal', '#9a9a96'); S.bx(dc, L.lx, y + 0.9, 2 * half + 4, 0.3, 2.6, 'hazard', undefined, false);
      for (let c = 0; c < 3; c++) S.bx(dc + r.between([-4, 4]), L.lx + r.between([-half + 2, half - 2]), y + (above ? 5 : -5), 0.12, 10, 0.12, 'col:#222', undefined, false);   // câbles pendants
      S.gate(dc, L.lx, L.y);
    });
  }
  // CHEMINEE : l'inverse, on remonte le long du puits jusqu'au-dessus des toits
  city.scenes.cheminee = { len: [260, 330],
    pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -4, 4), y: 12, y2: 72, from: 20, to: sc.d1 - sc.d0 - 62 }; },
    build(S) {
      const dist = district(S, S.sr.between([100, 130]), S.sr.between([130, 180])), half = S.R + 6.5;
      shaft(S, half, 200, dist); cableWeb(S, half, S.d0 + 70, S.d1 - 30, 40); ledges(S, half, 12);
      farTowers(S, 110, 200, 3);
    } };
  // SLALOM : la trajectoire tourne de gauche à droite, un bloc d'immeuble barre alternativement chaque côté du couloir
  city.scenes.slalom = { len: [240, 320],
    pin(T, sc) {
      const a = 11, per = 76, o = sc.d0 + 34; sc.slal = { a, per, o };
      return { lx: 0, y: U.clamp(T.laneY0((sc.d0 + sc.d1) / 2), 12, 24), fx: (d) => a * Math.sin(2 * Math.PI * (d - o) / per) * U.clamp((sc.d1 - 30 - d) / 50, 0, 1), from: 34, to: sc.d1 - sc.d0 - 34 };
    },
    build(S) {
      const sr = S.sr, dist = district(S, sr.between([60, 90]), sr.between([80, 120])), sl = S.sc.slal || { a: 11, per: 76, o: S.d0 + 34 };
      avenueRoad(S, []); furniture(S, [], { noTrees: true });
      for (const s of [-1, 1]) buildingRow(S, s, dist, [], 0, { shops: true });
      for (let k = 0, dc = sl.o + sl.per / 4; dc < S.d1 - 40; dc += sl.per / 2, k++) {
        const sg = k % 2 === 0 ? 1 : -1, L = S.lane(dc), v = S.vol(dc) + 6, tint = sr.pick(dist.tints), edge = L.lx - sg * (S.R + 3.4);
        S.item(dc, () => {
          const x0 = sg > 0 ? -v : edge, x1 = sg > 0 ? edge : v;
          if (x1 - x0 < 1) return;
          S.bx(dc, (x0 + x1) / 2, 40, x1 - x0, 80, 12, dist.mat, tint);
          S.bx(dc, edge + sg * 0.3, 40, 0.5, 80, 12.4, 'hazard', undefined, false);
        });
        S.reserve(dc, 0, 2 * v, 14); S.gate(dc, L.lx, L.y);
      }
      farTowers(S, 80, 160, 3);
    } };
  // TOITS : on rase les toits d'un quartier bas, les antennes et les pylônes sur les côtés
  city.scenes.toits = { len: [220, 290],
    pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -6, 6), y: 40, from: 26, to: sc.d1 - sc.d0 - 26 }; },
    build(S) {
      const tints = ['#e8e4dc', '#d8dce0', '#e8d8c8', '#d0d8e0'];
      avenueRoad(S, []);
      for (let dc = S.d0; dc < S.d1; dc += 20) S.item(dc + 10, (r) => {
        const L = S.lane(dc + 10), ceil = Math.max(8, L.y - S.R - 2.6), v = S.vol(dc + 10) + 6;
        for (let k = -1; k <= 1; k++) {
          const w = v * 2 / 3, h = r.between([ceil * 0.4, ceil]);
          S.bx(dc + 10, k * w, h / 2 - 0.5, w - 0.6, h, 19.4, { side: 'facade', top: 'concrete', bottom: 'concreteDark' }, r.pick(tints));
        }
        for (const s of [-1, 1]) if (r() < 0.55) S.cyl(dc + 10, L.lx + s * (S.R + 6 + r.between([0, 6])), 0, 0.4, r.between([48, 90]), 'col:#2c2f33', undefined, 6, 0.2);
      });
      for (let dc = S.d0 + 50; dc < S.d1 - 40; dc += 48) S.gate(dc, S.lane(dc).lx, S.lane(dc).y);
      farTowers(S, 90, 190, 6);
    } };

  // ---------- v057 : COPIES DU NIVEAU CITY (rue étroite, bâtiments traversés, vitres brisées, panneau, grue, puits à câbles) et DU CHANTIER (escalier) ----------
  const pw = (pts, s) => { if (s <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (s <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (s - a[0]) / (b[0] - a[0]); } return pts[pts.length - 1][1]; };
  // toile de câbles noirs en diagonale entre les deux parois du puits (comme le niveau City) : on garde ceux qui laissent la trajectoire libre
  function cableWeb(S, half, da, db, n) {
    for (let k = 0; k < n; k++) {
      const dm = da + (db - da) * (k + 0.5) / n;
      S.item(dm, (r) => {
        for (let t = 0; t < 40; t++) {
          const dA = dm + r.between([-12, 12]), dB = dA + r.between([-16, 16]), yA = S.lane(dA).y + r.between([-26, 26]), yB = yA + r.between([-14, 14]);
          if (yA < 4 || yB < 4) continue;
          const sg = r() < 0.5 ? -1 : 1, la = S.lane(dA).lx + sg * half, lb = S.lane(dB).lx - sg * half;
          let ok = true;
          for (let q = 0; q <= 12; q++) { const f = q / 12, d = dA + (dB - dA) * f, y = yA + (yB - yA) * f, x = la + (lb - la) * f, L = S.lane(d); if (Math.hypot(x - L.lx, y - L.y) < 5.8) { ok = false; break; } }
          if (!ok) continue;
          if (!S.inClip(dA)) return;
          S.b.cable(S.at(dA, la, yA), S.at(dB, lb, yB), 0.12);
          return;
        }
      });
    }
  }
  // poutres en I qui dépassent des parois
  function ledges(S, half, n) {
    for (let k = 0; k < n; k++) {
      const dm = S.d0 + 60 + (S.len - 100) * (k + 0.5) / n;
      S.item(dm, (r) => { const L = S.lane(dm), sg = r() < 0.5 ? -1 : 1, x = L.lx + sg * (half - 1.4), y = L.y + r.between([-16, 16]), roll = r.between([-30, 30]);
        if (y < 4) return;
        S.bxr(dm, x, y, 3, 0.5, 2.6, 'col:#2e2e30', undefined, roll, 0, true); S.bxr(dm, x, y + 1.4, 3, 0.5, 2.6, 'col:#2e2e30', undefined, roll, 0, false); S.bxr(dm, x, y + 0.7, 0.5, 1.4, 2.6, 'col:#2e2e30', undefined, roll, 0, false); });
    }
  }
  // montée en escalier de toits : des immeubles dont le toit reste ~10 m sous la trajectoire (on prend de la hauteur avant la chute)
  function climbRoofs(S, A, pts, s0, s1, seg) {
    const sr = S.sr, TINTS = ['#e8e4dc', '#d8dce0', '#e8d8c8', '#d0d8e0'];
    for (let s = s0; s < s1; s += seg) {
      const e = Math.min(s + seg, s1), top = Math.min(pw(pts, s), pw(pts, e)) - 10, dc = A((s + e) / 2);
      if (top < 8) continue;
      S.item(dc, (r) => { S.bx(dc, 0, top / 2 - 0.4, 62, top, e - s - 0.4, { side: r.pick(['facade', 'facadePink', 'facadeTan']), top: 'concrete', bottom: 'concreteDark' }, r.pick(TINTS));
        for (const sg of [-1, 1]) if (r() < 0.6) S.cyl(dc, sg * r.between([34, 44]), 0, 0.5, r.between([top + 20, top + 70]), 'col:#2c2f33', undefined, 6, 0.25); });
    }
  }
  // CITY 1 : copie de la séquence du niveau d'origine : rue de 18 m, bâtiment tunnel, bâtiment à vitres, toits bas + panneau + grue,
  // montée sur les toits, bloc du disque d'accroche, puis la CHUTE LIBRE VERTICALE dans le puits (70 câbles et 18 poutres en I aux positions exactes) et le couloir de sortie
  const PIT = 800, SHIFT = 190;   // début du puits (m dans la scène) ; altitude du fond du puits d'origine (y = -190) ramenée au sol (0)
  const C1 = [[0, 23], [215, 23], [245, 23], [268, 19], [290, 17], [321, 17], [PIT - 50, 266], [PIT - 12, 250], [PIT - 5, 240], [PIT, 214], [PIT + 3, 150], [PIT + 6, 70], [PIT + 9, 30], [PIT + 14, 12], [PIT + 30, 10], [PIT + 60, 10], [PIT + 200, 10]];
  city.scenes.city1 = { len: [PIT + 90, PIT + 90], noDoor: true,
    pin(T, sc) { return { lx: 0, fy: (d) => pw(C1, d - sc.d0), from: 20, to: sc.d1 - sc.d0 - 20 }; },
    build(S) {
      const sr = S.sr, A = (s) => S.d0 + s, SIDES = ['facade', 'facadePink', 'facadeTan'], TINTS = ['#ffffff', '#f6f2f0', '#eeeeee', '#f7f5f3'];
      const blk = (s0, s1, x0, x1, h, y0, o) => { const dc = A((s0 + s1) / 2); S.item(dc, (r) => S.bx(dc, (x0 + x1) / 2, (y0 || 0) + h / 2 - 0.4, x1 - x0, h, s1 - s0, { side: r.pick(SIDES), top: 'concrete', bottom: 'concreteDark' }, r.pick(TINTS), true, o)); };
      avenueRoad(S, []);
      for (let s = 20; s < 215; s += 32) { const e = Math.min(s + 31, 215); for (const sg of [-1, 1]) { const h = S.sr.between([55, 90]); const dc = A((s + e) / 2); S.item(dc, (r) => S.bx(dc, sg * 20, h / 2 - 0.4, 22, h, e - s, { side: r.pick(SIDES), top: 'concrete', bottom: 'concreteDark' }, r.pick(TINTS))); } }
      { const s0 = 215, s1 = 245, dc = A(230);        // B : tunnel y 18..28, trois vitres à la sortie
        blk(s0, s1, -40, -5, 46); blk(s0, s1, 5, 40, 46); blk(s0, s1, -5, 5, 18); blk(s0, s1, -5, 5, 18, 28);
        S.item(dc, () => { for (const x of [-4.8, 4.8]) S.bx(dc, x, 23, 0.4, 10, 30, 'concreteDark', undefined, true); S.bx(dc, 0, 18.2, 9.2, 0.4, 30, 'concreteDark', undefined, true, { ground: true }); S.bx(dc, 0, 27.8, 9.2, 0.4, 30, 'concreteDark', undefined, true);
          for (const x of [-3, 0, 3]) S.b.glass(S.at(A(s1 - 0.4), x, 23), [3, 9.6, 0.12], [0, S.yaw(A(s1 - 0.4)), 0]); });
        S.gate(A(s0 - 8), 0, 23); S.gate(dc, 0, 23); S.gate(A(s1 + 8), 0, 22); }
      blk(245, 290, -60, -14, S.sr.between([40, 60])); blk(245, 290, 14, 60, S.sr.between([40, 60]));
      { const s0 = 290, s1 = 321, dc = A(305.5);       // C : ouverture vitrée y 12..22, vitres à l'entrée et à la sortie
        blk(s0, s1, -30, -5, 34); blk(s0, s1, 5, 30, 34); blk(s0, s1, -5, 5, 12); blk(s0, s1, -5, 5, 12, 22);
        S.item(dc, () => { for (const x of [-4.8, 4.8]) S.bx(dc, x, 17, 0.4, 10, 31, 'concreteDark', undefined, true); S.bx(dc, 0, 12.2, 9.2, 0.4, 31, 'concreteDark', undefined, true, { ground: true }); S.bx(dc, 0, 21.8, 9.2, 0.4, 31, 'concreteDark', undefined, true);
          for (const z of [s0 + 0.2, s1 - 0.2]) S.b.glass(S.at(A(z), 0, 17), [9.6, 9.6, 0.12], [0, S.yaw(A(z)), 0]); });
        S.gate(A(s0 - 8), 0, 17); S.gate(dc, 0, 17); S.gate(A(s1 + 8), 0, 17); }
      blk(321, 357, -45, -8, 20); blk(321, 357, 8, 45, 16);     // toits bas, panneau publicitaire, grue jaune
      { const dc = A(335);
        S.item(dc, () => {
          S.bx(dc, -20, 29, 16, 8, 0.4, 'col:#2a2a2a', undefined, true, { render: false });
          const bb = CC.Textures.special('billboard'), dark = new THREE.MeshLambertMaterial({ color: '#2a2a2a' });
          const board = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 0.4), [dark, dark, dark, dark, new THREE.MeshLambertMaterial({ map: bb }), dark]);
          const p = S.at(dc, -20, 29); board.position.set(p[0], p[1], p[2]); board.rotation.y = S.yaw(dc) * Math.PI / 180; S.b.add(board);
          S.bx(dc - 0.4, -24, 22.5, 0.4, 5, 0.4, 'col:#303030', undefined, true); S.bx(dc - 0.4, -16, 22.5, 0.4, 5, 0.4, 'col:#303030', undefined, true);
        });
        const dcg = A(337);
        S.item(dcg, () => { S.bx(dcg, 22, 30, 2.2, 60, 2.2, 'col:#d8a820'); S.bx(dcg, 8, 59, 34, 1.6, 1.6, 'col:#d8a820'); S.bx(dcg, 34, 59, 12, 1.6, 1.6, 'col:#d8a820'); S.bx(dcg, 36, 56, 4, 4, 3, 'concreteDark'); }); }
      climbRoofs(S, A, C1, 357, PIT - 23, 44);                    // on prend de la hauteur par-dessus quelques immeubles
      // bloc sud (toit à y 20 + 190) et disque d'accroche (décor)
      { const dc = A(PIT - 11.5); S.item(dc, () => { S.bx(dc, 0, (SHIFT + 20) / 2, 50, SHIFT + 20, 23, { side: 'facadePink', top: 'concrete', bottom: 'concreteDark' }, undefined);
          if (S.b.grapplePoint) S.b.grapplePoint(S.at(A(PIT - 0.1), 6, 22.2 + SHIFT), [0, 0, -1], 1.6); }); }
      // le puits : parois (x ±15 → ±40), bloc nord percé d'un couloir de 10 m (y 4..20)
      { const dc = A(PIT + 15), H = 70 + SHIFT;
        S.item(dc, () => { S.bx(dc, -27.5, H / 2, 25, H, 30, { side: 'facade', top: 'concrete' }); S.bx(dc, 27.5, H / 2, 25, H, 30, { side: 'facadeTan', top: 'concrete' }); });
        const dn = A(PIT + 40);
        S.item(dn, () => { S.bx(dn, -22.5, H / 2, 35, H, 20, { side: 'facade', top: 'concrete' }); S.bx(dn, 22.5, H / 2, 35, H, 20, { side: 'facade', top: 'concrete' });
          S.bx(dn, 0, 2, 10, 4, 20, 'concreteDark', undefined, true, { ground: true }); S.bx(dn, 0, (20 + 76 + SHIFT) / 2, 10, 76 + SHIFT - 20, 20, { side: 'facade', top: 'concrete' }); });
      }
      // câbles et poutres : positions exactes du niveau d'origine (repère d'origine : puits à z -365 → -395, fond à y -190)
      const P = CC.CityPit, pd = (z) => A(PIT + (-365 - z));
      P.cables.forEach((c, i) => { const dm = pd((c[0][2] + c[1][2]) / 2); S.item(dm, () => { S.b.cable(S.at(pd(c[0][2]), c[0][0], c[0][1] + SHIFT), S.at(pd(c[1][2]), c[1][0], c[1][1] + SHIFT), 0.12); }); });
      P.ledges.forEach((l) => { const dm = pd(l.p[2]); S.item(dm, () => S.b.box({ p: S.at(dm, l.p[0], l.p[1] + SHIFT), s: l.s, r: [0, S.yaw(dm) + l.r[1], l.r[2]], mat: 'col:#2e2e30', collide: l.c })); });
      farTowers(S, 90, 180, 6);
    } };
  // ESCALIER : copie de la cage d'escalier du niveau CHANTIER (dalle de béton à piliers, trémie de 16 × 20 m, volées alternées sur les murs est / ouest, fenêtre de sortie)
  const SH = 425, T2 = 148, W2 = 8;   // trémie (m dans la scène), niveau de la dalle (160 − 12), demi-largeur
  const ESCP = [[0, 23], [25, 23], [SH - 130, 152], [SH - 6, 151], [SH + 8, 144], [SH + 11, 118], [SH + 12, 78], [SH + 13, 28], [SH + 17, 14], [SH + 28, 8], [SH + 60, 10], [SH + 200, 10]];
  const ESCX = [[0, 0], [SH - 130, 0], [SH - 113, 4], [SH - 73, -4], [SH - 38, 3], [SH - 18, 0], [SH + 200, 0]];
  city.scenes.escalier = { len: [SH + 100, SH + 100], noDoor: true,
    pin(T, sc) { return { lx: 0, fx: (d) => pw(ESCX, d - sc.d0), fy: (d) => pw(ESCP, d - sc.d0), from: 20, to: sc.d1 - sc.d0 - 20 }; },
    build(S) {
      const A = (s) => S.d0 + s, side = { side: 'concreteWarm', top: 'concrete', bottom: 'concreteDark' };
      const Z = (z) => SH + (-368 - z);   // repère d'origine (z) → m dans la scène
      avenueRoad(S, []);
      climbRoofs(S, A, ESCP, 30, SH - 130, 44);
      // masse du bâtiment : blocs est et ouest (x 8 → 30), bloc avant (x ±8) jusqu'à la trémie, linteau de la fenêtre de sortie (y 21 → dalle)
      for (let s = SH - 130; s < SH + 42; s += 20) { const e = Math.min(s + 20, SH + 42), dc = A((s + e) / 2);
        S.item(dc, () => { for (const sg of [-1, 1]) S.bx(dc, sg * (30 + W2) / 2, T2 / 2, 30 - W2, T2, e - s, side, '#e8e0d0');
          if (e <= SH) S.bx(dc, 0, T2 / 2, 2 * W2, T2, e - s, side, '#e8e0d0');
          if (s >= SH + 20) S.bx(dc, 0, (21 + T2) / 2, 2 * W2, T2 - 21, e - s, side, '#e8e0d0'); }); }
      { const dc = A(SH - 65); S.item(dc, () => S.bx(dc, 0, T2 + 0.25, 60, 0.5, 130, 'concrete', '#d8d4cc', false)); }   // dalle de béton
      // cage d'escalier : volées alternées (exactement la construction d'origine, y décalé de −12)
      for (let k = 0; k * 9 < 160 - 20; k++) {
        const east = k % 2 === 0, x = east ? W2 - 2.5 : -W2 + 2.5;
        for (let i = 0; i < 10; i++) {
          const y = 160 - 1 - (k * 10 + i) * 0.9 - 12; if (y < 2) break;
          const z = east ? -368 - 1 - i * 1.8 : -388 + 1 + i * 1.8, dc = A(Z(z));
          S.item(dc, () => S.bx(dc, x, y, 5, 0.5, 1.8, 'concreteWarm', undefined, true, { ground: true }));
        }
      }
      // piliers et poutres de la dalle (fenêtre z -240 → -368 de l'original)
      for (const x of [-24, -12, 12, 24]) for (let z = -240; z > -368; z -= 15) { const dc = A(Z(z)); S.item(dc, () => S.bx(dc, x, T2 + 6.5, 2, 12, 2, 'concrete')); }
      for (const [x, z] of [[-8, -255], [8, -295], [-8, -330]]) { const dc = A(Z(z)); S.item(dc, () => S.bx(dc, x, T2 + 6.5, 2, 12, 2, 'concrete')); }
      for (let z = -240; z > -368; z -= 15) { const dc = A(Z(z)); S.item(dc, () => S.bx(dc, 0, T2 + 12.8, 50, 1.4, 1.4, 'concrete')); }
      { const dc = A(Z(-402)); S.item(dc, () => S.bx(dc, 0, T2 + 3, 30, 5, 8, 'concreteWarm')); }
      { const dc = A(Z(-378)); S.item(dc, () => { if (S.b.arrow) S.b.arrow(S.at(dc, 0, T2 + 6), 0); }); }
      farTowers(S, 90, 170, 4);
    } };
  // v060 : un RESERVOIR à la fin de chaque grande section (les scènes à trajectoire imposée n'en reçoivent pas du générateur)
  function endTank(S, sEnd) {
    const dc = sEnd !== undefined ? S.d0 + sEnd : S.d1 - 22, L = S.lane(dc);
    S.item(dc, () => { S.b.target('fuel', S.at(dc, L.lx, 0), S.yaw(dc), { unarmed: true }); S.gate(dc - 22, L.lx, 9); S.gate(dc, L.lx, 3.5); if (S.ctx.busy) S.ctx.busy.push(dc); });
  }
  for (const nm of ['ruelle', 'slalom', 'plongee', 'enfilade']) { const b0 = city.scenes[nm].build; city.scenes[nm].build = function (S) { b0.call(this, S); endTank(S); }; }
  { const b1 = city.scenes.city1.build; city.scenes.city1.build = function (S) { b1.call(this, S); endTank(S, PIT + 68); }; }
  { const b2 = city.scenes.escalier.build; city.scenes.escalier.build = function (S) { b2.call(this, S); endTank(S, SH + 66); }; }

  // ---------- v067 : MISSIONS MILITAIRES dans la ville — des groupes de cibles à détruire en série (combo) ----------
  const TS = { tank: 2.4, truck: 2.4, sam: 2.4, radar: 2.4, heli: 2.2 };
  function tgt(S, type, dc, lx, y, yawAdd) {
    S.item(dc, () => { S.b.target(type, S.at(dc, lx, y || 0), S.yaw(dc) + (yawAdd || 0) + (type === 'truck' ? 90 : type === 'tank' ? 180 : 0), { unarmed: false, scale: TS[type] || 2.4 }); S.gate(dc - 14, S.lane(dc - 14).lx, 8); S.gate(dc, lx, Math.max(4, y || 5)); });
  }
  function sandbags(S, dc, lx, n) { for (let i = 0; i < n; i++) S.item(dc + i * 3.2, () => S.bx(dc + i * 3.2, lx, 0.8, 3, 1.6, 1.4, 'col:#8a7a58', undefined, true)); }
  // CONVOI : une colonne de camions et de chars sur l'avenue, un hélicoptère de couverture au bout
  city.scenes.convoi = { len: [250, 300], minD: 700, noDoor: true, noChaos: true, build(S) {
    const sr = S.sr, dist = district(S, sr.between([30, 44]), sr.between([48, 70]));
    avenueRoad(S, []); furniture(S, [], {});
    for (const s of [-1, 1]) buildingRow(S, s, dist, [], 0, { shops: true });
    const rp = U.clamp(S.d0 / 7000, 0, 1), n = 2 + Math.round(4 * rp); for (let i = 0; i < n; i++) { const dc = S.d0 + 62 + i * 30, L = S.lane(dc); tgt(S, i % 3 === 1 ? 'tank' : 'truck', dc, U.clamp(L.lx + (i % 2 ? 5 : -5), -9, 9)); sandbags(S, dc - 6, i % 2 ? -14 : 14, 3); }
    tgt(S, 'heli', S.d1 - 40, S.lane(S.d1 - 40).lx + 6, 22);
    farTowers(S, 80, 170, 4);
  } };
  // CAMP : une place dégagée avec un anneau de chars, des lance-missiles et un radar au centre
  city.scenes.camp = { len: [230, 280], minD: 700, noDoor: true, noChaos: true, build(S) {
    const sr = S.sr, dist = district(S, sr.between([30, 44]), sr.between([48, 70])), c = S.mid;
    avenueRoad(S, []); furniture(S, [], { noTrees: true });
    for (const s of [-1, 1]) buildingRow(S, s, dist, [], 0, { shops: true, skip: (cx) => Math.abs(cx - c) < 60 });
    const rp = U.clamp(S.d0 / 7000, 0, 1), nt = 2 + Math.round(2 * rp);
    for (const [i, a] of [[0, -1], [1, 1], [2, -1], [3, 1]].slice(0, nt)) { const dc = c - 54 + i * 36; tgt(S, 'tank', dc, a * 13); sandbags(S, dc - 4, a * 22, 3); }
    if (rp > 0.25) tgt(S, 'sam', c - 30, -22); if (rp > 0.5) tgt(S, 'sam', c + 34, 22); tgt(S, 'radar', c, 0);
    for (let i = 0; i < 5; i++) S.item(c - 70 + i * 34, () => S.bx(c - 70 + i * 34, i % 2 ? 30 : -30, 2.6, 8, 5.2, 9, 'col:#6a7a4a', undefined, true));   // tentes
    farTowers(S, 80, 170, 4);
  } };
  // HELICOPTERES : un couloir d'immeubles hauts, trois hélicoptères en vol stationnaire et deux lance-missiles sur les toits
  city.scenes.helis = { len: [230, 280], minD: 700, noDoor: true, noChaos: true, build(S) {
    const sr = S.sr, dist = district(S, sr.between([60, 84]), sr.between([84, 110]));
    avenueRoad(S, []); furniture(S, [], {});
    for (const s of [-1, 1]) buildingRow(S, s, dist, [], 0, { shops: true });
    const rp = U.clamp(S.d0 / 7000, 0, 1), nh = 1 + Math.round(2 * rp);
    for (let i = 0; i < nh; i++) { const dc = S.d0 + 70 + i * 52, L = S.lane(dc); tgt(S, 'heli', dc, U.clamp(L.lx + (i % 2 ? 9 : -9), -12, 12), U.clamp(L.y + (i - 1) * 4, 14, 34)); }
    for (const s of (rp > 0.3 ? [-1, 1] : [])) { const dc = S.d0 + 110 + (s > 0 ? 40 : 0), v = S.vol(dc) + 12; S.item(dc, () => { S.bx(dc, s * v, 24, 14, 48, 14, dist.mat, '#e8ecf0'); }); tgt(S, 'sam', dc, s * v, 48); }
    farTowers(S, 90, 180, 4);
  } };
  city.scenes.convoi2 = Object.assign({}, city.scenes.convoi); city.scenes.camp2 = Object.assign({}, city.scenes.camp); city.scenes.helis2 = Object.assign({}, city.scenes.helis);
  city.notFirst = ['toits'];
  city.early = [['city1', 'escalier'], ['virage', 'chicane', 'epingle']];


  // ---------- v063 : VIRAGES — le couloir tourne (le décor et les obstacles suivent) ----------
  function turnScene(S, opt) {
    const sr = S.sr, dist = district(S, sr.between(opt.lo || [26, 40]), sr.between(opt.hi || [46, 76]));
    avenueRoad(S, []); furniture(S, [], { noTrees: !!opt.noTrees });
    for (const s of [-1, 1]) buildingRow(S, s, dist, [], 0, { shops: true, dd: [8, 12] });
    // portiques jaunes en travers du virage (la trajectoire passe dessous)
    if (opt.gantry) for (let dc = S.d0 + S.len * 0.2; dc < S.d1 - S.len * 0.15; dc += S.len * 0.2) S.item(dc, () => {
      const L = S.lane(dc), w = S.vol(dc) - 2, h = Math.max(L.y + S.R + 4, 18);
      for (const sg of [-1, 1]) S.bx(dc, sg * w, h / 2, 2, h, 2, 'concreteDark', '#c8ccd0');
      S.bx(dc, 0, h, 2 * w + 2, 2, 2.4, 'concreteDark', '#c8ccd0'); S.bx(dc, 0, h - 1.2, 2 * w, 0.5, 2.6, 'hazard', undefined, false); S.gate(dc, L.lx, L.y);
    });
    farTowers(S, 80, 170, 4);
  }
  city.scenes.virage = { len: [240, 290], turns: [[0.1, 0.9, 60]], build(S) { turnScene(S, { gantry: true }); } };
  city.scenes.chicane = { len: [270, 330], turns: [[0.06, 0.46, 35], [0.54, 0.94, -35]], build(S) { turnScene(S, { gantry: true, noTrees: true }); } };
  city.scenes.epingle = { len: [290, 350], turns: [[0.08, 0.92, 90]], build(S) { turnScene(S, { lo: [34, 50], hi: [60, 90] }); } };

  // ============================================================== METRO
  const H = 24;
  // enveloppe du tunnel : plafond, parois, carrelage, lampes, rails ; wv(dc) : demi-largeur intérieure
  function shell(S, wv, opts) {
    opts = opts || {};
    const T = S.T, sr = S.sr;
    for (let dc = S.d0; dc < S.d1; dc += 10) S.item(dc + 5, (r) => {
      const w = wv(dc + 5), m = dc + 5;
      for (const s of [-1, 1]) {
        S.bx(m, s * (w + 3.5), H / 2 + 8, 7, H + 18, 10.4, 'concrete', '#b4bcc0');
        S.bx(m, s * (w - 0.1), 2.2, 0.3, 4.4, 10.3, 'col:#2a6a7a', undefined, false);                 // carrelage bleu-vert
        S.bx(m, s * (w - 0.1), 4.6, 0.3, 0.3, 10.3, 'col:#dcdcd4', undefined, false);
      }
      if (!opts.open) S.bx(m, 0, H + 4, 2 * (w + 7), 8, 10.4, 'concrete', '#a4acb0');
      // rails : deux files, traverses, cailloux
      for (const s of [-0.72, 0.72]) S.bx(m, s, 0.45, 0.16, 0.36, 10.4, 'metal', '#9a9ea4', false);
      S.bx(m, 0, 0.12, 3.2, 0.14, 10.4, 'dirt', '#4a4440', false, { shadow: false });
      for (let k = 0; k < 5; k++) S.bx(m + (k - 2) * 2, 0, 0.3, 2.9, 0.2, 0.55, 'col:#4a3a2c', undefined, false, { shadow: false });
    });
    // lampes en plafond (blanc chaud, sobres) et contreforts rythmés
    if (!opts.open) S.rows(S.d0 + 6, S.d1, 15, 0, (dc) => S.item(dc, () => { S.bx(dc, 0, H - 0.5, 1.6, 0.3, 5, 'emis:#fff0cc', undefined, false, { shadow: false }); for (const s of [-1, 1]) S.bx(dc, s * (wv(dc) - 0.8), H * 0.6, 0.6, 0.9, 1.8, 'emis:#fff0cc', undefined, false, { shadow: false }); }));
    S.rows(S.d0 + 10, S.d1, 20, 0, (dc) => S.item(dc, () => { for (const s of [-1, 1]) S.bx(dc, s * (wv(dc) - 0.9), H / 2, 1.8, H, 1.6, 'concrete', '#c0c4c8'); }));
  }
  function mouth(S, dc) {      // bouche du tunnel : grand mur percé (ferme la tranchée)
    const w = S.vol(dc), T = S.T, topRel = 14 - T.base(dc) + 6;
    S.item(dc, () => {
      const hole = 2 * w, totW = 2 * (w + 26);
      S.bx(dc, -(w + 13), topRel / 2, 26, topRel, 6, { side: 'concreteDark', top: 'concrete' }, '#b0b0b0');
      S.bx(dc, (w + 13), topRel / 2, 26, topRel, 6, { side: 'concreteDark', top: 'concrete' }, '#b0b0b0');
      S.bx(dc, 0, (H + topRel) / 2, hole + 0.4, topRel - H, 6, { side: 'concreteDark', top: 'concrete' }, '#b0b0b0');
      S.bx(dc, 0, H - 0.6, hole, 1.2, 6.4, 'hazard', undefined, false);
      S.bx(dc, 0, H + 4, 4, 4, 0.5, 'emis:#2a7ac0', undefined, false, { r: [0, S.yaw(dc), 45] });   // enseigne du métro (losange bleu)
    });
  }
  const metro = { signature: 'rame', tight: true, scenes: {}, dress(S) {
    const wv = S.sc.name === 'station' ? (dc) => S.vol(dc) + 13 : (dc) => S.vol(dc);
    S.wv = wv;
    shell(S, wv, { open: S.sc.name === 'puits' });
    // v037 : plus de « bouche » murale aux extrémités (elle séparait les lieux comme un mur) ; mouth() n'est plus utilisée
  } };
  Z.defs.metro = metro;
  metro.scenes.tunnel = { len: [200, 280], build(S) {
    const sr = S.sr;
    // chemins de câbles, tuyaux, signaux, niches de service, panneaux de sortie
    for (const s of [-1, 1]) {
      S.rows(S.d0, S.d1, 12, 0, (dc) => S.item(dc, (r) => { S.bx(dc, s * (S.vol(dc) - 1.2), 10.4, 1.2, 0.3, 11.6, 'col:#3a3a3e', undefined, false); S.bx(dc, s * (S.vol(dc) - 1.1), 13.2, 0.9, 0.9, 11.6, 'col:#6a5a4a', undefined, false); }));
      S.rows(S.d0 + 20, S.d1, 70, 0.3, (dc) => S.item(dc, (r) => { const w = S.vol(dc); S.bx(dc, s * (w - 0.5), 8, 0.6, 1.0, 7, 'col:#20c060', undefined, false); S.bx(dc, s * (w - 0.6), 5, 0.4, 3.4, 4, 'col:#101214', undefined, false);
        S.bx(dc, s * (w - 0.6), 11.6, 0.35, 0.35, 0.35, r() < 0.5 ? 'emis:#30c060' : 'emis:#d83a2a', undefined, false); }));
    }
    // voûtes de renfort rythmées (on vole « dans » le tunnel)
    S.rows(S.d0 + 20, S.d1, 46, 0.2, (dc) => S.item(dc, () => { const w = S.vol(dc); S.bx(dc, 0, H - 1.2, 2 * w, 1.6, 1.4, 'col:#8a9096', undefined, false); for (const s of [-1, 1]) S.bx(dc, s * (w - 0.7), H / 2, 1.4, H, 1.4, 'col:#8a9096', undefined, false); }));
  } };
  function train(S, dc, lx, len, col, r) {          // rame à l'arrêt (décor collidable, en dessous de la trajectoire)
    const n = Math.max(1, Math.round(len / 14));
    for (let i = 0; i < n; i++) {
      const d = dc + (i - (n - 1) / 2) * 14.3;
      S.bx(d, lx, 2.6, 3.3, 4.2, 14, 'metal', col);
      S.bx(d, lx, 3.5, 3.4, 1.3, 13.4, 'emis:#a8c4d4', undefined, false, { shadow: false });
      S.bx(d, lx, 1.3, 3.4, 0.5, 14, 'col:#2a2a2e', undefined, false);
    }
  }
  metro.scenes.station = { len: [220, 300], build(S) {
    const sr = S.sr, c = S.mid, hold = S.lane(c);
    const w = (dc) => S.vol(dc) + 13;
    for (const s of [-1, 1]) {
      // quais (surélevés de 1,4 m), bande jaune, colonnes, bancs, panneaux suspendus
      for (let dc = S.d0; dc < S.d1; dc += 20) S.item(dc + 10, () => { S.bx(dc + 10, s * (11.4 + (w(dc) - 11.4) / 2), 0.7, w(dc) - 11.4, 1.4, 20.4, 'concrete', '#b8bcc0'); S.bx(dc + 10, s * 11.6, 1.45, 0.5, 0.06, 20.4, 'col:#e8c020', undefined, false, { shadow: false }); });
      S.rows(S.d0 + 6, S.d1, 12, 0, (dc) => S.item(dc, (r) => { S.bx(dc, s * 12.5, H / 2, 1.5, H, 1.5, 'concrete', '#d0d4d8'); S.bx(dc, s * 12.5, 8, 1.6, 1.0, 1.6, 'col:#2a6a7a', undefined, false); }));
      S.rows(S.d0 + 18, S.d1, 36, 0.3, (dc) => S.item(dc, (r) => { S.kit('bench', r, { t: 'bench', x: S.at(dc, s * 16, 1.4)[0], z: S.at(dc, s * 16, 1.4)[2], y0: S.at(dc, s * 16, 1.4)[1], yaw: (S.yaw(dc) + 90) / DEG }); }));
      S.rows(S.d0 + 25, S.d1, 55, 0.25, (dc) => S.item(dc, (r) => { S.bx(dc, s * 11.2, 17.8, 5, 1.6, 0.3, 'emis:#2a7ac0', undefined, false); S.bx(dc, s * 11.2, 19.5, 0.12, 2, 0.12, 'col:#2a2a2e', undefined, false); }));
    }
    // une rame à l'arrêt sur la voie centrale ; la trajectoire passe au-dessus
    const lx = hold.lx;
    // v036b : plus de rame à l'arrêt au milieu (elle formait un mur infranchissable) : les voies restent dégagées
    S.gate(c, lx, Math.max(11, hold.y));
    // grandes affiches lumineuses sur le mur du fond des quais
    for (const s of [-1, 1]) S.rows(S.d0 + 15, S.d1, 26, 0.2, (dc) => S.item(dc, (r) => { S.bx(dc, s * (w(dc) - 0.3), 11, 0.3, 6, 7, 'col:' + r.pick(['#d8d0c0', '#c8d8e0', '#e0c8c0']), undefined, false); S.bx(dc, s * (w(dc) - 0.4), 11, 0.2, 5.2, 6.2, dark(S) ? 'emis:#d8e8f0' : 'col:#f4f0e8', undefined, false); }));
  }, pin(T, sc) { return { lx: U.clamp(T.laneX0((sc.d0 + sc.d1) / 2), -6, 6), y: 11.5, from: 30, to: sc.d1 - sc.d0 - 30 }; } };
  const dark = () => true;
  metro.scenes.embranchement = { len: [180, 250], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2, s = T.laneX0(mid) > 0 ? 1 : -1; return { lx: s * 9, y: 9.5, from: 20, to: sc.d1 - sc.d0 - 20 }; },
    build(S) {
      const c = S.mid, L = S.lane(c), s = L.lx > 0 ? 1 : -1;
      // mur de séparation entre les deux tunnels : la voie libre est de notre côté ; l'autre est une voie de garage avec une rame noire
      // v036b : une rangée de piliers (et non plus un mur plein) : on voit et on peut passer d'un tunnel à l'autre
      S.rows(S.d0 + 20, S.d1 - 20, 15, 0, (dc) => S.item(dc, () => { S.bx(dc, -s * 2, H / 2, 1.4, H, 1.4, 'concrete', '#a8aeb2'); }));
      S.rows(S.d0 + 20, S.d1 - 20, 16, 0, (dc) => S.item(dc, () => { S.bx(dc, -s * 0.6, 15, 0.3, 1.2, 1.2, 'emis:#d83a2a', undefined, false); S.bx(dc, -s * 0.6, 11, 0.4, 7, 0.4, 'col:#1c1e22', undefined, false); }));
      S.item(c, (r) => { train(S, c, -s * 10, 56, '#3a3e46', r); });
      S.rows(S.d0, S.d1, 20, 0.2, (dc) => S.item(dc, () => { S.bx(dc, s * (S.vol(dc) - 1.2), 10.4, 1.2, 0.3, 11.6, 'col:#3a3a3e', undefined, false); }));
    } };
  metro.scenes.eboulement = { len: [170, 230], build(S) {
    const sr = S.sr;
    // plafond effondré : blocs de béton, barres d'armature, tuyaux qui pendent, terre ; un couloir reste libre
    for (let i = 0; i < 26; i++) {
      const dc = S.d0 + 16 + sr() * (S.len - 32), lx = sr.between([-1, 1]) * (S.vol(dc) - 3), y0 = sr() < 0.6 ? 0 : sr.between([10, 20]), w = sr.between([3, 8]);
      S.place(dc, lx, w, w, y0, w * 0.7, (r) => { S.bxr(dc, lx, y0 + w * 0.3, w, w * 0.65, w * r.between([0.8, 1.2]), r() < 0.5 ? 'concrete' : 'concreteDark', r.pick(['#a8a8a4', '#908c88', '#b4b0a8']), r.between([-25, 25]), r.between([-30, 30]));
        if (r() < 0.4) S.bx(dc, lx, y0 + w * 0.9, 0.12, w * 0.9, 0.12, 'col:#7a4a2a', undefined, false); }, { m: 0.5 });
    }
    S.rows(S.d0 + 10, S.d1 - 10, 18, 0.4, (dc) => S.item(dc, (r) => { S.bx(dc, r.between([-8, 8]), H - 3, 0.35, r.between([4, 8]), 0.35, 'col:#6a7078', undefined, false); if (r() < 0.5) S.bx(dc, r.between([-8, 8]), H - 1.2, 0.2, 3, 0.2, 'col:#7a4a2a', undefined, false); }));
    for (const dc of [S.mid - 30, S.mid + 25]) S.item(dc, () => { S.bx(dc, 7, 3, 0.7, 0.7, 0.7, 'emis:#ffb040', undefined, false); S.bx(dc, -7, 3, 0.7, 0.7, 0.7, 'emis:#ffb040', undefined, false); });
  } };
  metro.scenes.puits = { len: [120, 170], build(S) {
    // puits de ventilation : le plafond s'ouvre, les murs montent, on voit le ciel tout en haut (respiration)
    const c = S.mid, w = S.vol(c), top = 130;
    S.item(c, () => {
      for (const s of [-1, 1]) S.bx(c, s * (w + 3.5), top / 2, 7, top, 50, 'concrete', '#b0b8bc');
      for (const k of [-1, 1]) S.bx(c + k * 25.5, 0, top / 2, 2 * w + 14, top, 4, 'concrete', '#b0b8bc');
      S.bx(c, 0, top - 4 + 0.5, 2 * w + 14, 1, 54, 'basic:#eef4ff', undefined, false, { shadow: false });
      for (let y = 26; y < top - 10; y += 26) for (const s of [-1, 1]) S.bx(c, s * (w - 0.3), y, 0.5, 0.5, 46, 'col:#5a5e64', undefined, false);        // passerelles d'entretien
      S.bx(c, 0, 50, 2 * w - 2, 0.6, 0.6, 'col:#4a4e54', undefined, false);
    });
    for (const s of [-1, 1]) S.rows(S.d0, S.d1, 26, 0, (dc) => S.item(dc, () => S.bx(dc, s * (w - 0.5), 30, 0.7, 40, 0.9, 'col:#6a6e74', undefined, false)));   // échelles
  } };
  // rame qui fonce en face (signature) : entité mobile qui ne démarre que quand la roquette approche
  class Train {
    constructor(d0, lx, T, speed, col) {
      this.type = 'train'; this.alive = true; this.hazard = true; this.guard = true; this.unarmed = true;
      this.T = T; this.d = d0; this.lx = lx; this.speed = speed; this.started = false; this.len = 46;
      this.object = new THREE.Group();
      const lam = CC.Models.kit.lam, box = CC.Models.kit.box;
      box(3.5, 4.2, this.len, lam(col), 0, 2.4, 0, this.object); box(3.6, 1.2, this.len - 1, new THREE.MeshBasicMaterial({ color: '#a8c4d4' }), 0, 3.3, 0, this.object);
      box(3.4, 0.5, this.len, lam('#2a2a2e'), 0, 0.5, 0, this.object);
      for (const s of [-1, 1]) box(0.7, 0.5, 0.3, new THREE.MeshBasicMaterial({ color: '#fffbe0' }), s * 1.1, 1.8, -this.len / 2 - 0.05, this.object);
      this.size = [3.5, 4.6, this.len]; this.center = [0, 2.4, 0];
      this.obb = { c: new THREE.Vector3(), ux: new THREE.Vector3(1, 0, 0), uy: new THREE.Vector3(0, 1, 0), uz: new THREE.Vector3(0, 0, 1), hx: 1.85, hy: 2.3, hz: this.len / 2 };
      this.place();
    }
    place() {
      const p = this.T.at(this.d, this.lx, 0), o = this.object; o.position.set(p[0], p[1], p[2]); o.rotation.y = this.T.yawAcross(this.d) * Math.PI / 180;
      o.updateMatrixWorld(true); this.obb.c.set(p[0], p[1] + 2.4, p[2]);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, o.rotation.y, 0)); this.obb.ux.set(1, 0, 0).applyQuaternion(q); this.obb.uz.set(0, 0, 1).applyQuaternion(q);
    }
    update(dt, game) {
      const rk = game.rocket, dist = game.endlessRun ? game.endlessRun.dist : 0;
      if (!this.started && rk.active && this.d - dist < 250) this.started = true;
      if (this.started) { this.d -= this.speed * dt; this.place(); }
    }
    updateObb() {} reset() {} kill() {} clearWreck() {}
  }
  CC.Train = Train;
  metro.scenes.rame = { len: [230, 290], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -4, 4), y: 11.5, from: 10, to: sc.d1 - sc.d0 - 10 }; },
    build(S) {
      // un tunnel droit, deux rames qui arrivent en face, à intervalles : on passe au-dessus (le plafond est à 24 m, les rames font 4,6 m)
      const sr = S.sr;
      for (const k of [0.45, 0.8]) { const dc = S.d0 + S.len * k, lx = sr.between([-1.5, 1.5]); if (S.inClip(dc)) S.item(dc, (r) => { const t = new Train(dc + 60, lx, S.T, 34, r.pick(['#c84a3a', '#2a6ab0', '#d8b82a'])); S.b.entity(t); S.b.targets.push(t); }); }
      S.rows(S.d0, S.d1, 18, 0, (dc) => S.item(dc, () => { for (const s of [-1, 1]) S.bx(dc, s * (S.vol(dc) - 1.1), 12, 0.6, 1.1, 1.0, 'emis:#fff0cc', undefined, false, { shadow: false }); }));
      S.gate(S.mid, S.lane(S.mid).lx, 11.5);
    } };
})();

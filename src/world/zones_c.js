/* v035 : zone MONDE MINIATURE — la roquette vole dans une maison : tout est géant (un verre fait 22 m, une fourchette 60 m).
 * On y entre par une FENETRE ouverte (portail), on en sort par une porte entrebâillée. Le plafond est à 130 m (pièce haute), les murs sont
 * tapissés d'un papier peint propre à chaque pièce.
 *   Scènes : cuisine (carrelage, bocaux, bouteilles, assiettes, tasses) · sous la table (pieds de table et de chaises, nappe) · chambre
 *   d'enfant (briques, train électrique, ours en peluche, dés, billes) · bureau (livres, crayons, lampe, règle, feuilles) ·
 *   SIGNATURE : la tasse de thé dont l'anse est un anneau à traverser. */
(function () {
  const U = CC.U, G = CC.Gen, Z = CC.Zones, DEG = 180 / Math.PI;
  const TOYS = ['#d83a2a', '#2a6ac8', '#e8c020', '#2aa060', '#e87a20', '#8a3aa8', '#f0f0ea'];
  const CEIL = 130;

  // enveloppe de la pièce : murs tapissés (bandes verticales), plinthe, plafond ; palette propre à la scène
  function room(S, pal) {
    const T = S.T;
    for (let dc = S.d0; dc < S.d1; dc += 20) S.item(dc + 10, (r) => {
      const m = dc + 10, w = S.vol(m) + 11;
      for (const s of [-1, 1]) {
        S.bx(m, s * (w + 3), CEIL / 2, 6, CEIL + 4, 20.6, 'col:' + pal.wall);
        const k = Math.floor(m / 20) % 2; if (k) S.bx(m, s * (w - 0.1), CEIL / 2 - 4, 0.3, CEIL - 8, 9, 'col:' + pal.stripe, undefined, false);
        S.bx(m, s * (w - 0.6), 3, 1.4, 6, 20.6, 'col:' + pal.base, undefined, false);            // plinthe
        S.bx(m, s * (w - 0.3), 26, 0.6, 1.1, 20.6, 'col:' + pal.base, undefined, false);          // lambris
      }
      if (!pal.noCeiling) S.bx(m, 0, CEIL + 2, 2 * (w + 6), 4, 20.6, 'col:' + pal.ceil);
    });
    if (pal.floor) {       // revêtement de sol propre à la pièce (damier, tapis…), posé sur le parquet
      const sq = pal.sq || 12;
      for (let dc = S.d0; dc < S.d1; dc += sq) S.item(dc + sq / 2, () => {
        const w = S.vol(dc) + 11, n = Math.ceil(2 * w / sq);
        if (pal.check) for (let i = 0; i < n; i++) S.bx(dc + sq / 2, -w + (i + 0.5) * sq, 0.06, sq, 0.12, sq, 'col:' + ((i + Math.floor(dc / sq)) % 2 ? pal.floor : pal.floor2), undefined, false, { shadow: false });
        else S.bx(dc + sq / 2, 0, 0.06, 2 * w, 0.12, sq + 0.2, 'col:' + pal.floor, undefined, false, { shadow: false });
      });
    }
  }
  function scatter(S, n, kinds, lane) {
    for (let i = 0; i < n; i++) {
      const dc = S.d0 + 12 + S.sr() * (S.len - 24), lx = (S.sr() * 2 - 1) * (S.vol(dc) + 4), name = S.sr.pick(kinds), f = OBJ[name];
      if (f) f(S, dc, lx);
    }
  }
  const OBJ = {};
  OBJ.jar = (S, dc, lx) => { const rad = S.sr.between([3.6, 6]), h = S.sr.between([10, 22]); S.place(dc, lx, rad * 2, rad * 2, 0, h + 2, (r) => { const col = r.pick(TOYS); S.cyl(dc, lx, 0, rad, h, 'col:' + col, undefined, 14, rad); S.cyl(dc, lx, h, rad * 1.05, 1.6, 'col:#d8d8d4', undefined, 14, rad * 1.05, false); S.cyl(dc, lx, h * 0.3, rad * 1.02, h * 0.3, 'col:#f4f0e4', undefined, 14, rad * 1.02, false); }); };
  OBJ.bottle = (S, dc, lx) => { const rad = S.sr.between([2.6, 4]), h = S.sr.between([20, 34]); S.place(dc, lx, rad * 2, rad * 2, 0, h, (r) => { const col = r.pick(['#2a8a4a', '#8a5a2a', '#2a5a8a', '#d8d8c8']); S.cyl(dc, lx, 0, rad, h * 0.6, 'col:' + col, undefined, 12, rad); S.cyl(dc, lx, h * 0.6, rad, h * 0.15, 'col:' + col, undefined, 12, rad * 0.4, false); S.cyl(dc, lx, h * 0.75, rad * 0.4, h * 0.25, 'col:' + col, undefined, 10, rad * 0.4, false); S.cyl(dc, lx, h - 0.6, rad * 0.5, 1.2, 'col:#c8382c', undefined, 10, rad * 0.5, false); }); };
  OBJ.plates = (S, dc, lx) => { const rad = S.sr.between([10, 16]), n = 2 + Math.floor(S.sr() * 4); S.place(dc, lx, rad * 2, rad * 2, 0, n * 1.6, (r) => { for (let k = 0; k < n; k++) S.cyl(dc, lx, k * 1.6, rad - k * 0.3, 1.6, 'col:' + r.pick(['#f4f4ee', '#e8e0d0', '#d8e4f0']), undefined, 18, rad - k * 0.3 - 0.6); }); };
  OBJ.cup = (S, dc, lx) => { const rad = S.sr.between([5, 8]), h = S.sr.between([8, 13]); S.place(dc, lx, rad * 2 + 4, rad * 2, 0, h, (r) => { const col = r.pick(TOYS); S.cyl(dc, lx, 0, rad * 0.8, h, 'col:' + col, undefined, 14, rad); S.cyl(dc, lx, h - 0.4, rad * 0.9, 0.5, 'col:#3a2a1a', undefined, 14, rad * 0.9, false); S.bx(dc, lx + rad + 1.4, h * 0.55, 1.2, h * 0.5, 2, 'col:' + col, undefined, false); }); };
  OBJ.cereal = (S, dc, lx) => { const w = S.sr.between([12, 16]), h = S.sr.between([22, 30]); S.place(dc, lx, w, 7, 0, h, (r) => { S.bx(dc, lx, h / 2, w, h, 7, 'col:' + r.pick(['#e8a020', '#d83a2a', '#2a8ad8', '#58b83a']), undefined, true, { r: [0, S.yaw(dc) + r.between([-20, 20]), 0] }); S.bx(dc, lx, h * 0.6, w * 0.8, h * 0.3, 7.2, 'col:#f4f0e0', undefined, false, { r: [0, S.yaw(dc), 0] }); }); };
  OBJ.toaster = (S, dc, lx) => { S.place(dc, lx, 26, 18, 0, 16, (r) => { S.bx(dc, lx, 7, 26, 14, 18, 'metal', '#c8ccd0'); S.bx(dc, lx, 14.2, 20, 0.6, 4, 'col:#1c1e22', undefined, false); S.bx(dc, lx, 14.2, 20, 0.6, 4, 'col:#1c1e22', undefined, false); S.bx(dc, lx + 13.2, 8, 0.6, 4, 2, 'col:#d83a2a', undefined, false); }); };
  OBJ.book = (S, dc, lx) => { const n = 2 + Math.floor(S.sr() * 4), w = S.sr.between([22, 30]), d = S.sr.between([30, 40]); S.place(dc, lx, w + 6, d + 6, 0, n * 5 + 2, (r) => { for (let k = 0; k < n; k++) S.bx(dc, lx + r.between([-2, 2]), 2.5 + k * 5, w, 5, d, 'col:' + r.pick(['#8a2a2a', '#2a4a8a', '#2a6a4a', '#8a6a2a', '#5a2a7a', '#d8d0b8']), undefined, true, { r: [0, S.yaw(dc) + r.between([-14, 14]), 0] }); S.bx(dc, lx, n * 5 - 2.5, w - 1, 3.4, d + 0.4, 'col:#f4f0e0', undefined, false); }); };
  OBJ.pencil = (S, dc, lx) => { const len = S.sr.between([44, 66]), rad = 1.7; S.place(dc, lx, len, rad * 3, 0, rad * 2.4, (r) => { const col = r.pick(['#e8c020', '#d83a2a', '#2a6ac8', '#2aa060']); S.b.cylinder({ p: S.at(dc, lx, rad), rad, h: len, seg: 6, mat: 'col:' + col, r: [0, S.yaw(dc) + 90, 90], colSize: [len, rad * 2, rad * 2] }); S.b.cylinder({ p: S.at(dc, lx + len / 2 + 2.2, rad), rBot: rad, rTop: 0.2, h: 5, seg: 6, mat: 'col:#e8d0a0', collide: false, r: [0, S.yaw(dc) + 90, -90] }); }); };
  OBJ.lego = (S, dc, lx) => { const n = 2 + Math.floor(S.sr() * 5); S.place(dc, lx, 14, 10, 0, n * 8 + 3, (r) => { const col = r.pick(TOYS); for (let k = 0; k < n; k++) { const c = k % 2 ? r.pick(TOYS) : col; S.bx(dc, lx + (k % 2) * r.between([-1.5, 1.5]), 4 + k * 8, 12, 8, 8, 'col:' + c); } for (const a of [-1, 1]) for (const b of [-1, 1]) S.cyl(dc + b * 2.4, lx + a * 3.2, n * 8, 1.6, 1.8, 'col:' + col, undefined, 8, 1.6, false); }); };
  OBJ.block = (S, dc, lx) => { const s = S.sr.between([8, 13]); S.place(dc, lx, s * 1.4, s * 1.4, 0, s, (r) => { S.bx(dc, lx, s / 2, s, s, s, 'col:' + r.pick(TOYS), undefined, true, { r: [0, S.yaw(dc) + r.between([0, 60]), 0] }); S.bx(dc, lx, s + 0.05, s * 0.6, 0.12, s * 0.6, 'col:#f4f0e0', undefined, false, { r: [0, S.yaw(dc), 0] }); }); };
  OBJ.marble = (S, dc, lx) => { const rad = S.sr.between([3.5, 6]); S.place(dc, lx, rad * 2, rad * 2, 0, rad * 2, (r) => S.ball(dc, lx, rad, rad, 'col:' + r.pick(['#2a8ad8', '#58b83a', '#d83a2a', '#e8c020', '#8a3aa8']), undefined, true)); };
  OBJ.dice = (S, dc, lx) => { const s = S.sr.between([11, 14]); S.place(dc, lx, s * 1.4, s * 1.4, 0, s, (r) => { S.bx(dc, lx, s / 2, s, s, s, 'col:#f4f2ea', undefined, true, { r: [0, S.yaw(dc) + r.between([0, 60]), 0] }); for (const [a, b] of [[-2.4, -2.4], [2.4, 2.4], [0, 0], [-2.4, 2.4], [2.4, -2.4]]) S.bx(dc + b, lx + a, s + 0.05, 1.6, 0.14, 1.6, 'col:#1c1c20', undefined, false, { r: [0, S.yaw(dc), 0] }); }); };
  OBJ.paper = (S, dc, lx) => { S.place(dc, lx, 30, 40, 0, 1.4, (r) => S.bx(dc, lx, 0.35, 30, 0.6, 40, 'col:#f6f4ee', undefined, true, { r: [0, S.yaw(dc) + r.between([-25, 25]), 0] })); };
  OBJ.eraser = (S, dc, lx) => { S.place(dc, lx, 14, 7, 0, 5, (r) => { S.bx(dc, lx, 2.5, 14, 5, 7, 'col:#f4f0f0', undefined, true, { r: [0, S.yaw(dc) + r.between([-30, 30]), 0] }); S.bx(dc, lx, 2.5, 14.2, 5.2, 3, 'col:#2a6ac8', undefined, false, { r: [0, S.yaw(dc), 0] }); }); };

  const mini = { signature: 'tasse', scenes: {}, dress(S) {
    const pal = S.sc.name === 'cuisine' ? { wall: '#eef2f4', stripe: '#d8e4ec', base: '#2a6aa8', ceil: '#f8f8f4', floor: '#eeeae0', floor2: '#2a3a4a', check: true, sq: 12 }
      : S.sc.name === 'table' ? { wall: '#d8b888', stripe: '#c8a878', base: '#6a4a2a', ceil: '#f2e8d0', floor: null }
      : S.sc.name === 'chambre' ? { wall: '#d8e4f4', stripe: '#c0d4ec', base: '#f4f0e8', ceil: '#f8f4ec', floor: '#8aaed4', sq: 20 }
      : S.sc.name === 'bureau' ? { wall: '#c8d8c0', stripe: '#b4c8ac', base: '#5a4a3a', ceil: '#f2eee4', floor: null }
      : { wall: '#ecdcc0', stripe: '#dccbaa', base: '#f4f0e8', ceil: '#f4ecdc', floor: null };
    S.pal = pal; room(S, pal);
    if (S.sc.last) {          // porte entrebâillée au bout de la pièce : on sort vers la zone suivante
      const L = S.lane(S.d1 - 4), w = S.vol(S.d1) + 12;
      S.item(S.d1 - 4, () => { S.frame(S.d1 - 4, L.lx, 15, 38, 30, 2 * w + 10, CEIL, 4, 'col:' + pal.wall, undefined, 0); S.bx(S.d1 - 4, L.lx, 31, 44, 2.4, 5, 'col:#f4f0e8', undefined, false); });
    }
  } };
  Z.defs.mini = mini;
  mini.scenes.cuisine = { len: [220, 300], build(S) { scatter(S, 34, ['jar', 'jar', 'bottle', 'bottle', 'plates', 'cup', 'cereal', 'cereal', 'toaster'], true); } };
  mini.scenes.table = { len: [200, 280], build(S) {
    const sr = S.sr, top = 58;
    // le dessous d'une table : plateau en bois au-dessus de la tête, pieds carrés, barres, nappe qui pend sur les côtés, miettes
    for (let dc = S.d0; dc < S.d1; dc += 20) S.item(dc + 10, () => { S.bx(dc + 10, 0, top + 3, 2 * (S.vol(dc) + 11) + 8, 6, 20.6, 'planks', '#c89a68', true, { tile: [14, 14] }); });
    S.rows(S.d0 + 25, S.d1, 70, 0.2, (dc) => S.item(dc, () => { for (const s of [-1, 1]) { const lx = s * (S.vol(dc) - 2); S.bx(dc, lx, top / 2, 9, top, 9, 'planks', '#b48a58'); S.bx(dc, lx, top - 4, 12, 3, 12, 'planks', '#b48a58', false); } S.bx(dc, 0, top - 6, 2 * S.vol(dc), 2.4, 4, 'planks', '#b48a58', false); }));
    for (const s of [-1, 1]) S.rows(S.d0, S.d1, 9, 0, (dc) => S.item(dc, (r) => { S.bx(dc, s * (S.vol(dc) + 9.4), top - 14 + 6, 1.2, 36, 9.2, 'col:' + (Math.floor(dc / 9) % 2 ? '#d83a3a' : '#f4f0ea'), undefined, false); }));
    // chaises : quatre pieds fins, barreau et bas de dossier
    for (let i = 0; i < 5; i++) { const dc = S.d0 + 20 + sr() * (S.len - 40), lx = (sr() * 2 - 1) * (S.vol(dc) - 6); S.place(dc, lx, 16, 16, 0, 30, (r) => { for (const a of [-1, 1]) for (const c of [-1, 1]) S.bx(dc + c * 6, lx + a * 6, 15, 2.2, 30, 2.2, 'planks', '#a87848'); S.bx(dc, lx, 30, 16, 1.6, 16, 'planks', '#a87848', false); S.bx(dc - 7, lx, 36, 1.2, 12, 14, 'planks', '#a87848', false); }); }
    scatter(S, 18, ['block', 'marble', 'pencil', 'paper', 'eraser']);
    // miettes et raisins secs
    S.rows(S.d0 + 6, S.d1, 6, 0.6, (dc) => S.item(dc, (r) => S.bx(dc, r.between([-1, 1]) * S.vol(dc), 0.4, r.between([0.6, 1.4]), 0.8, r.between([0.6, 1.4]), 'col:#d8b878', undefined, false)));
  } };
  mini.scenes.chambre = { len: [230, 310], build(S) {
    const sr = S.sr;
    // la voie du train électrique serpente au milieu ; locomotive et wagons posés dessus (décor collidable à 6 m de haut)
    for (let dc = S.d0; dc < S.d1; dc += 8) S.item(dc + 4, () => { for (const s of [-1, 1]) S.bx(dc + 4, s * 4.2, 0.6, 0.7, 1.2, 8.4, 'col:#8a8e94', undefined, false); S.bx(dc + 4, 0, 0.25, 11, 0.5, 1.6, 'col:#6a4a2a', undefined, false); });
    const tc = S.d0 + S.len * sr.between([0.3, 0.7]); S.place(tc, 0, 12, 60, 0, 12, (r) => { const cols = [r.pick(TOYS), r.pick(TOYS), r.pick(TOYS), r.pick(TOYS)]; for (let k = 0; k < 4; k++) S.bx(tc + (k - 1.5) * 13, 0, 3.6, 8, 6, 12, 'col:' + cols[k]); S.bx(tc - 19.5, 0, 9.2, 4, 6, 4, 'col:#2a2a2e', undefined, false); S.cyl(tc - 19.5, 0, 8, 1.8, 5, 'col:#2a2a2e', undefined, 10, 1.4, false); }, { m: 4 });
    // ours en peluche : un point de repère visible de loin
    const bc = S.d0 + S.len * sr.between([0.15, 0.85]), bs = sr() < 0.5 ? -1 : 1, bl = bs * (S.vol(bc) - 14);
    S.place(bc, bl, 30, 30, 0, 42, (r) => { S.ball(bc, bl, 12, 13, 'col:#a87a48', undefined, true, 1.05); S.ball(bc, bl, 32, 9, 'col:#b88a58', undefined, false); for (const a of [-1, 1]) { S.ball(bc, bl + a * 7, 40, 3.4, 'col:#a87a48', undefined, false); S.ball(bc, bl + a * 13, 14, 4.4, 'col:#b88a58', undefined, false, 1.7); S.ball(bc + a * 7, bl, 4, 5, 'col:#b88a58', undefined, false, 1.2); } S.ball(bc - 8.6, bl, 31, 3, 'col:#2a1a10', undefined, false); S.bx(bc - 7.6, bl, 12, 9, 7, 2, 'col:#e8cfa0', undefined, false); }, { vol: 60 });
    scatter(S, 34, ['lego', 'lego', 'block', 'block', 'dice', 'marble', 'marble']);
  } };
  mini.scenes.bureau = { len: [220, 290], build(S) {
    const sr = S.sr;
    scatter(S, 34, ['book', 'book', 'pencil', 'pencil', 'paper', 'eraser', 'cup']);
    // règle graduée posée à plat (très longue) et lampe de bureau
    for (let i = 0; i < 2; i++) { const dc = S.d0 + S.len * (0.25 + 0.5 * i), lx = (i ? 1 : -1) * (S.vol(dc) - 8); S.place(dc, lx, 8, S.len * 0.5, 0, 1.2, (r) => { S.bx(dc, lx, 0.5, 6, 1, S.len * 0.45, 'col:#e8d8a0', undefined, true); for (let k = 0; k < 28; k++) S.bx(dc - S.len * 0.22 + k * S.len * 0.45 / 27, lx - 2.2, 1.1, 1.6, 0.14, 0.4, 'col:#2a2a2a', undefined, false); }, { m: 0 }); }
    const lc = S.d0 + S.len * sr.between([0.3, 0.7]), ls = sr() < 0.5 ? -1 : 1, ll = ls * (S.vol(lc) - 12);
    S.place(lc, ll, 26, 26, 0, 76, (r) => { S.cyl(lc, ll, 0, 11, 2.6, 'col:#2a2a30', undefined, 16, 10); S.bx(lc, ll - ls * 6, 20, 2.2, 38, 2.2, 'col:#3a3a40', undefined, false, { r: [0, S.yaw(lc), ls * 12] }); S.bx(lc, ll - ls * 14, 56, 18, 2.2, 2.2, 'col:#3a3a40', undefined, false); S.cyl(lc, ll - ls * 22, 50, 9, 11, 'col:#d8a020', undefined, 14, 4, false); S.cyl(lc, ll - ls * 22, 49.4, 3.4, 2.4, 'basic:#fff2c8', undefined, 10, 3.4, false); }, { vol: 60 });
  } };
  mini.scenes.tasse = { len: [230, 290], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -14, 14), y: 15, from: (sc.d1 - sc.d0) / 2 - 45, to: (sc.d1 - sc.d0) / 2 + 45 }; },
    build(S) {
      const sr = S.sr, c = S.mid, L = S.lane(c), ms = L.lx > 0 ? 1 : -1, rad = 14, h = 30, ring = 12, hole = 8;
      // SIGNATURE : une tasse de thé géante sur sa soucoupe ; l'anse est un anneau de 16 m de vide à traverser
      const mx = L.lx - ms * (rad + ring - 1);
      S.item(c, (r) => {
        const col = r.pick(['#f4f0ea', '#e8f0f8', '#f8e8e8']), trim = r.pick(['#2a6ac8', '#d83a2a', '#2aa060']);
        S.cyl(c, mx, 0, 28, 1.8, 'col:' + col, undefined, 24, 26);                                            // soucoupe
        S.cyl(c, mx, 1.8, rad * 0.9, h, 'col:' + col, undefined, 20, rad);                                     // tasse
        S.cyl(c, mx, 1.8 + h * 0.4, rad * 0.94, 3, 'col:' + trim, undefined, 20, rad * 0.96, false);           // filet de couleur
        S.cyl(c, mx, h + 1.4, rad * 0.98, 0.6, 'col:#6a3a1a', undefined, 20, rad * 0.98, false);               // thé
        // anse : anneau fait de 8 segments, trou de 16 m centré sur la trajectoire
        const ax = mx + ms * (rad + ring - 1), ay = 1.8 + h * 0.5;
        for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, a2 = (k + 1) / 10 * Math.PI * 2, x1 = Math.cos(a) * (hole + 2), y1 = Math.sin(a) * (hole + 2), x2 = Math.cos(a2) * (hole + 2), y2 = Math.sin(a2) * (hole + 2);
          S.bxr(c, ax + (x1 + x2) / 2, ay + (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) + 1.2, 4, 5, 'col:' + col, undefined, Math.atan2(y2 - y1, x2 - x1) * DEG, 0, true); }
        // cuillère, sucres, sachet
        S.bx(c - 38, mx + ms * 6, 1.0, 5, 1.6, 34, 'metal', '#d8dce0', true, { r: [0, S.yaw(c) + 12, 0] }); S.cyl(c - 54, mx + ms * 9, 0, 6, 1.8, 'metal', '#d8dce0', 12, 6, false);
        for (let k = 0; k < 4; k++) S.bx(c + 40, mx - ms * 14 + (k % 2) * 5.4, 2.4 + Math.floor(k / 2) * 4.8, 5, 4.8, 5, 'col:#f8f8f4', undefined, true);
        S.bx(c + 22, mx + ms * 26, 0.5, 6, 0.3, 9, 'col:#e8d8a0', undefined, false);
      });
      S.reserve(c, mx, 2 * (rad + ring + 12), 70); S.gate(c, L.lx, 15);
      scatter(S, 10, ['cup', 'cereal', 'jar', 'plates']);
    } };
  // portail : une fenêtre ouverte dans un mur (on vient de dehors), rideaux, rebord
  Z.portals.mini = (S, B, lx, y, open) => {
    const hw = 24, hh = 21;
    S.item(B, () => {
      S.frame(B, lx, Math.max(y, hh + 2), hw * 2, hh * 2, 300, 210, 6, { side: 'concreteWarm', top: 'concrete' }, '#e4d8c0', 0);
      S.bx(B, lx, Math.max(y, hh + 2) - hh - 1, hw * 2 + 10, 2.4, 14, 'col:#f4f0e8', undefined, false);
      for (const s of [-1, 1]) { S.bx(B - 2, lx + s * (hw - 1), Math.max(y, hh + 2) + 4, 9, hh * 2 + 10, 1.2, 'col:#d86a5a', undefined, false); S.bx(B - 2, lx + s * (hw + 4), Math.max(y, hh + 2) + 4, 1.4, hh * 2 + 14, 1.6, 'col:#b84a3a', undefined, false); }
      S.bx(B, lx, Math.max(y, hh + 2) + hh + 4, hw * 2 + 14, 1.4, 1.6, 'col:#6a4a2a', undefined, false);
    });
  };
})();

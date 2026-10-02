/* v079 : RELIEF — des niveaux qui ne sont plus plats. Chaque scène « relief » donne un PROFIL DE TERRAIN (fn(d) en mètres, nul aux deux bouts) : le sol
 * lui-même monte et descend (T.rel dans endless.js), et la trajectoire le suit. Les scènes sont les mêmes dans toutes les zones mais habillées par la
 * zone (matériaux de paroi, accessoires propres : grue jaune en ville, arbres géants en forêt, conteneurs au port, cheminées à l'usine…).
 *   colline · soussol (rampe, tunnel couvert, remontée) · chuteLibre (falaise + puits à barres) · montee (cheminée) · pontPlongeon (canyon et pont)
 *   · gradins (marches géantes) · montagnesRusses (vagues + portiques) · defile (slalom dans une tranchée) · salle (hall fermé spécial).
 * Les zones où le sol ne peut pas descendre (port : l'eau est plate ; mer : fond fixe) n'ont que les variantes adaptées. */
(function () {
  const U = CC.U, Z = CC.Zones, G = CC.Gen;
  const ss = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const clampLx = (T, mid, k) => U.clamp(T.laneX0(mid), -k, k);

  // réglages par zone : sg = +1 le sol ne fait que monter (port), −1 il ne fait que descendre (mer), 0 les deux ; amp = échelle d'amplitude (zones fermées : plus petite)
  const ZK = {
    city: { sg: 0, amp: 1.0, acc: '#e0b020' }, forest: { sg: 0, amp: 1.0, acc: '#c8a050' }, port: { sg: 1, amp: 0.9, acc: '#e0b020' }, usine: { sg: 0, amp: 0.55, acc: '#ff8a1a' },
    tour: { sg: 0, amp: 0.9, acc: '#2be8ff' }, sky: { sg: 0, amp: 0.9, acc: '#e8f0ff' }, metro: { sg: 0, amp: 0.5, acc: '#30c060' }, mini: { sg: 0, amp: 0.6, acc: '#ff5a3a' },
    eau: { sg: -1, amp: 0.8, acc: '#4ab8a8' }, chute: { sg: 0, amp: 1.0, acc: '#ff3ad8' },
  };
  const kA = (T, zone) => U.clamp(0.8 + 0.14 * ((T.difK || 1) - 0.7), 0.8, 1.45) * ZK[zone].amp;   // la hauteur des reliefs grandit avec le niveau
  const dir = (zone, r) => ZK[zone].sg || (r() < 0.5 ? 1 : -1);                                        // +1 : le sol monte d'abord, −1 : il descend d'abord

  // ---------- accessoires par zone : liste de pièces [type, dx, y, taille…, matériau] ----------
  // 'b' boîte (dx, yCentre, w, h, d, mat) · 'c' cylindre (dx, y0, rayon, hauteur, mat, rayonHaut) · 's' sphère (dx, yCentre, rayon, mat, aplatissement)
  const TOYS = ['#e8c020', '#d83a2a', '#2a6ac8', '#2aa060', '#8a3aa8', '#ff8a1a'];
  const PROPS = {
    city: [
      (r) => { const h = r.between([40, 62]); return [['b', 0, h / 2, 2.2, h, 2.2, 'col:#e0b020'], ['b', 10, h + 1, 30, 1.6, 1.6, 'col:#e0b020'], ['b', -9, h + 1, 5, 4, 4, 'col:#5a5a5e'], ['b', 20, h - 6, 0.12, 14, 0.12, 'col:#222'], ['b', 20, h - 14, 2.4, 2, 2.4, 'col:#d83a2a']]; },   // grue jaune
      (r) => [['b', -6, 7, 0.8, 14, 0.8, 'col:#3a3d42'], ['b', 6, 7, 0.8, 14, 0.8, 'col:#3a3d42'], ['b', 0, 17, 22, 12, 1.2, 'emis:' + r.pick(['#d83a2a', '#2a9ac8', '#e8a020', '#8a3aa8'])]],                                                         // panneau géant
      (r) => { const h = r.between([26, 44]); return [['b', 0, h / 2, 12, h, 12, { side: 'facade', top: 'concrete', bottom: 'concreteDark' }], ['b', 2, h + 4, 0.4, 8, 0.4, 'col:#2a2a2e']]; },
    ],
    forest: [
      (r) => { const h = r.between([14, 26]), c = r.pick(['#3f6a38', '#4a7a3a', '#35603a']); return [['c', 0, 0, 1.6, h, 'col:#6a4a2a', 1.2], ['s', 0, h + 3, r.between([6, 9]), 'col:' + c, 1.1], ['s', 3, h - 1, 5, 'col:' + c, 1]]; },
      (r) => { const s = r.between([5, 9]); return [['s', 0, s * 0.45, s, 'rock', 0.7]]; },
      (r) => [['c', 0, 0, 2.2, 22, 'col:#6a4a2a', 1.6], ['c', 3, 14, 1, 8, 'col:#6a4a2a', 0.6], ['s', 0, 26, 8, 'col:#2f5a34', 1.1]],
    ],
    port: [
      (r) => { const out = []; for (let i = 0; i < 3; i++) out.push(['b', 0, 1.35 + i * 2.7, 12, 2.6, 2.7, 'col:' + r.pick(['#c8382c', '#2a5a8a', '#e0a020', '#3a7a4a', '#d8d8d4'])]); return out; },
      (r) => [['b', -10, 11, 1.4, 22, 1.4, 'col:#e0b020'], ['b', 10, 11, 1.4, 22, 1.4, 'col:#e0b020'], ['b', 0, 23, 24, 1.8, 2, 'col:#e0b020']],
      (r) => [['c', 0, 0, 1.2, 4, 'col:#2a2a30', 1.2], ['c', 0, 4, 0.5, 14, 'col:#e8e8e4', 0.4], ['b', 0, 18.4, 3, 2.4, 3, 'basic:#fff0a0']],
    ],
    usine: [
      (r) => { const h = r.between([36, 56]); return [['c', 0, 0, 3.2, h, 'col:#7a6a5a', 2.4], ['c', 0, h * 0.7, 3.3, 2, 'col:#d83a2a', 3.3]]; },
      (r) => [['c', 0, 0, 7, 14, 'col:#8a9096', 7], ['b', 0, 15, 14, 0.8, 14, 'col:#5a5e64']],
      (r) => [['b', 0, 6, 1, 12, 1, 'col:#6a6e74'], ['b', 4, 6, 1, 12, 1, 'col:#6a6e74'], ['b', 2, 12.5, 6, 1, 1, 'col:#d8a020']],
    ],
    tour: [
      (r) => { const h = r.between([36, 60]); return [['b', 0, h / 2, 1.2, h, 1.2, 'col:#8a8e96'], ['b', 0, h * 0.7, 9, 0.4, 0.4, 'col:#8a8e96'], ['b', 0, h + 1, 0.5, 2, 0.5, 'emis:#d83a2a']]; },
      (r) => { const h = r.between([24, 40]); return [['b', 0, h / 2, 12, h, 12, { side: 'facade', top: 'concrete', bottom: 'concreteDark' }]]; },
    ],
    sky: [
      (r) => [['c', 0, 0, 1.4, 9, 'col:#5a5e66', 1.4], ['s', 0, 11, 6, 'col:#f0f2f4', 0.8]],
      (r) => [['b', 0, 6, 30, 12, 20, 'metal'], ['b', 0, 12.4, 31, 0.8, 21, 'col:#8a8e96']],
      (r) => [['c', 0, 0, 5, 12, 'col:#d8dce2', 5], ['b', 0, 13, 10, 1, 10, 'col:#d83a2a']],
    ],
    metro: [
      (r) => [['b', 0, 7, 2, 14, 2, 'col:#8a9096'], ['b', 0, 12.5, 4, 0.6, 1, 'emis:#30c060']],
      (r) => [['b', 0, 3, 8, 6, 3, 'col:#4a4e54'], ['b', 0, 6.4, 6, 0.5, 0.5, 'emis:#d83a2a']],
    ],
    mini: [
      (r) => { const n = 2 + Math.floor(r() * 4), c = r.pick(TOYS), out = []; for (let i = 0; i < n; i++) out.push(['b', 0, 4 + i * 8, 12, 8, 8, 'col:' + (i % 2 ? r.pick(TOYS) : c)]); return out; },
      (r) => { const s = r.between([8, 13]); return [['b', 0, s / 2, s, s, s, 'col:#f4f2ea'], ['b', 0, s + 0.05, 1.6, 0.14, 1.6, 'col:#1c1c20']]; },
      (r) => [['c', 0, 0, r.between([4, 6]), r.between([10, 20]), 'col:' + r.pick(TOYS), 4.4]],
    ],
    eau: [
      (r) => { const h = r.between([6, 18]), c = r.pick(['#d8604a', '#e8a04a', '#c84a9a', '#4ab8a8', '#8a6ad8']); return [['c', 0, 0, 2, h, 'col:' + c, 0.9], ['c', 2.2, 0, 1, h * 0.7, 'col:' + c, 0.4], ['c', -2, 0, 1, h * 0.6, 'col:' + c, 0.4]]; },
      (r) => [['b', 0, 8, 0.5, 16, 0.5, 'col:#3a9a5a'], ['b', 1.4, 6, 0.5, 12, 0.5, 'col:#3a9a5a']],
      (r) => { const s = r.between([5, 9]); return [['s', 0, s * 0.5, s, 'col:#5a7a80', 0.7]]; },
    ],
    chute: [
      (r) => { const h = r.between([30, 50]); return [['b', 0, h / 2, 1, h, 1, 'col:#3a3d42'], ['b', 0, h * 0.8, 8, 0.3, 0.3, 'col:#3a3d42'], ['b', 0, h + 1, 0.5, 2, 0.5, 'emis:#d83a2a']]; },
    ],
  };
  function buildProp(S, dc, lx, parts) {
    for (const p of parts) {
      if (p[0] === 'b') S.bx(dc, lx + p[1], p[2], p[3], p[4], p[5], p[6] && p[6].side ? p[6] : p[6], undefined, true);
      else if (p[0] === 'c') S.cyl(dc, lx + p[1], p[2], p[3], p[4], p[5], undefined, 10, p[6]);
      else if (p[0] === 's') S.ball(dc, lx + p[1], p[2], p[3], p[4], undefined, true, p[5]);
    }
  }
  // un semis d'accessoires de la zone sur les côtés (jamais sur la trajectoire : S.place vérifie le dégagement)
  function scatterProps(S, n, minOff) {
    const list = PROPS[S.zone] || PROPS.city;
    for (let i = 0; i < n; i++) {
      const dc = S.d0 + 14 + S.sr() * (S.len - 28), sg = S.sr() < 0.5 ? -1 : 1, v = S.vol(dc), lx = S.T.laneX(dc) + sg * (minOff + S.sr() * Math.max(6, v - minOff - 8)), k = S.sr.pick(list);
      S.place(dc, lx, 16, 16, 0, 70, (r) => buildProp(S, dc, lx, k(r)), { vol: v + 20, pad: 3, m: 4 });
    }
  }

  // ---------- briques de décor ----------
  // paroi continue des deux côtés : de la cote absolue a (par rapport au sol de la zone) à b ; le centre suit le sol (T.rel)
  function walls(S, half, a, b, step, from, to, wMat, wTint, lxFn) {
    for (let dc = from; dc < to - 0.1; dc += step) S.item(dc + step / 2, (r) => {
      const m = dc + step / 2, fl = S.T.rel(m), L = S.lane(m);
      for (const s of [-1, 1]) S.bx(m, (lxFn ? lxFn(m, s) : L.lx + s * (half + 12)), (a + b) / 2 - fl, 24, b - a, step + 0.8, wMat, wTint);
    });
  }
  // portique : deux poteaux et une poutre au-dessus de la trajectoire
  function gantry(S, dc, k, mat) {
    S.item(dc, (r) => {
      const L = S.lane(dc), g = S.R + 3.4, top = L.y + S.R + 4;
      for (const s of [-1, 1]) S.bx(dc, L.lx + s * g, top / 2, 1.8, top, 1.8, mat || 'concreteDark', '#c8c8c4');
      S.bx(dc, L.lx, top + 0.9, 2 * g + 3.6, 1.8, 2.4, mat || 'concreteDark', '#c8c8c4'); S.bx(dc, L.lx, top + 1.9, 2 * g + 3.6, 0.3, 2.6, 'hazard', undefined, false);
      const col = ZK[S.zone].acc; S.bx(dc, L.lx, top - 0.4, 2 * g, 0.3, 0.3, 'basic:' + col, undefined, false);
    });
    S.reserve(dc, S.lane(dc).lx, 2 * (S.R + 6), 6); S.gate(dc - 14, S.lane(dc - 14).lx, S.lane(dc - 14).y); S.gate(dc, S.lane(dc).lx, S.lane(dc).y);
  }
  // barres de fer en travers du puits (une au-dessus, une au-dessous de la trajectoire, en alternance) + câbles pendants
  function bars(S, half, step, from, to, k0) {
    let k = k0 || 0;
    for (let dc = from; dc < to; dc += step, k++) S.item(dc, (r) => {
      const L = S.lane(dc), above = k % 2 === 0, y = above ? L.y + S.R + 7 : Math.max(2.5, L.y - S.R - 7);
      if (!above && y < 3.5) return;
      S.bx(dc, L.lx, y, 2 * half + 4, 1.6, 2.4, 'metal', '#9a9a96'); S.bx(dc, L.lx, y + 0.9, 2 * half + 4, 0.3, 2.6, 'hazard', undefined, false);
      for (let c = 0; c < 3; c++) S.bx(dc + r.between([-4, 4]), L.lx + r.between([-half + 2, half - 2]), y + (above ? 5 : -5), 0.12, 10, 0.12, 'col:#222', undefined, false);
      S.gate(dc, L.lx, L.y);
    });
  }
  // fenêtres lumineuses sur les parois d'un puits (hauteur dans le repère absolu)
  function windows(S, half, a, b, from, to) {
    for (let dc = from; dc < to; dc += 26) S.item(dc, (r) => {
      const fl = S.T.rel(dc), L = S.lane(dc);
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) if (r() < 0.6) S.bx(dc, L.lx + s * (half + 0.2), r.between([a + 4, b - 4]) - fl, 0.3, 3, r.between([3, 8]), 'emis:' + r.pick(['#e8a020', '#2a9ac8', '#d83a2a', ZK[S.zone].acc]), undefined, false);
    });
  }
  const pinFor = (Y, k) => (T, sc) => ({ lx: clampLx(T, (sc.d0 + sc.d1) / 2, 5), y: Y, from: 24, to: sc.d1 - sc.d0 - 24 });
  // enregistre les bornes du profil (pour dimensionner les parois)
  const sample = (fn, d0, d1) => { let lo = 0, hi = 0; for (let d = d0; d <= d1; d += 4) { const v = fn(d); lo = Math.min(lo, v); hi = Math.max(hi, v); } return { lo, hi }; };
  const mkRel = (sc, fn, A, up) => { sc.A = A; sc.up = up; const b = sample(fn, sc.d0, sc.d1); sc.rlo = b.lo; sc.rhi = b.hi; return { fn }; };

  const SC = {};

  // ===== COLLINE : le sol monte puis redescend, trois portiques sur la pente, accessoires de la zone
  SC.colline = { len: [260, 340], noDoor: true, noChaos: true,
    relief(T, sc, r) { const A = 38 * kA(T, sc.zone), sg = dir(sc.zone, r), L = sc.d1 - sc.d0; return mkRel(sc, (d) => sg * A * Math.pow(Math.sin(Math.PI * U.clamp((d - sc.d0) / L, 0, 1)), 2), A, sg > 0); },
    build(S) {
      for (const f of [0.22, 0.5, 0.78]) gantry(S, S.d0 + S.len * f);
      scatterProps(S, 12, S.R + 10);
    } };

  // ===== SOUS-SOL : rampe vers le bas, tunnel couvert (toit à la cote 0), remontée à l'air libre
  SC.soussol = { len: [300, 380], noDoor: true, noChaos: true, sg: -1,
    relief(T, sc, r) { const A = Math.max(26, 30 * kA(T, sc.zone)), L = sc.d1 - sc.d0; return mkRel(sc, (d) => { const u = (d - sc.d0) / L; return -A * ss(0.05, 0.3, u) * (1 - ss(0.72, 0.97, u)); }, A, false); },
    pin: pinFor(9.5),
    build(S) {
      const half = S.R + 5.5, A = S.sc.A, L = S.len, u0 = S.d0 + L * 0.27, u1 = S.d0 + L * 0.75, yb = -A - 12, yt = 0, sk = skin(S);
      walls(S, half, yb, yt + 3, 12, S.d0 + L * 0.05, S.d1 - L * 0.03, sk.wm, sk.wt);
      // toit du tunnel à la cote 0, avec des puits de lumière tous les 60 m
      for (let dc = u0; dc < u1; dc += 12) S.item(dc + 6, () => { const m = dc + 6, fl = S.T.rel(m), L0 = S.lane(m), light = Math.floor((m - u0) / 12) % 5 === 2; if (light) return; S.bx(m, L0.lx, 3 + (-1.5) - fl, 2 * half + 24, 3, 12.8, sk.wm, sk.wt); });
      // rangées de lampes et colonnes de soutien sur les côtés
      for (let dc = u0 + 6; dc < u1; dc += 18) S.item(dc, () => { const m = dc, fl = S.T.rel(m), L0 = S.lane(m); for (const s of [-1, 1]) { S.bx(m, L0.lx + s * (half - 0.4), -A + 5 + 0, 0.5, 0.5, 6, 'basic:#fff0c0', undefined, false); S.bx(m, L0.lx + s * (half - 0.8), (-A + yt) / 2 - fl, 1.2, A - 1, 1.2, 'col:#8a9096'); } });
      for (let dc = S.d0 + L * 0.2; dc < S.d1 - L * 0.2; dc += 40) { const L0 = S.lane(dc); S.gate(dc, L0.lx, L0.y); }
    } };

  // ===== CHUTE LIBRE : falaise, puits à barres de fer, remontée (ou l'inverse : plateau puis chute)
  SC.chuteLibre = { len: [330, 400], noDoor: true, noChaos: true, hard: true,
    relief(T, sc, r) {
      const A = U.clamp(46 * kA(T, sc.zone), 40, 66), up = dir(sc.zone, r) > 0, L = sc.d1 - sc.d0;
      const fn = up ? (d) => { const u = (d - sc.d0) / L; return A * ss(0.05, 0.46, u) * (1 - ss(0.58, 0.58 + 100 / L, u)); } : (d) => { const u = (d - sc.d0) / L; return -A * ss(0.14, 0.14 + 100 / L, u) * (1 - ss(0.56, 0.96, u)); };
      return mkRel(sc, fn, A, up);
    },
    pin: pinFor(19),
    build(S) {
      const half = S.R + 5.5, L = S.len, sk = skin(S), a = S.sc.rlo - 14, b = S.sc.rhi + 70, up = S.sc.up;
      walls(S, half, a, b, 12, S.d0 + L * 0.04, S.d1 - L * 0.02, sk.wm, sk.wt);
      const dropA = up ? S.d0 + L * 0.56 : S.d0 + L * 0.12, dropB = dropA + 112;
      bars(S, half, 22, dropA + 6, dropB, 0);
      windows(S, half, a, b, S.d0 + 20, S.d1 - 20);
      gantry(S, S.d0 + L * 0.04 + 8); gantry(S, S.d1 - L * 0.04 - 8);
    } };

  // ===== MONTEE : cheminée (on remonte le long du puits) puis plateau et descente douce
  SC.montee = { len: [330, 400], noDoor: true, noChaos: true, hard: true,
    relief(T, sc, r) {
      const A = U.clamp(46 * kA(T, sc.zone), 40, 66), up = dir(sc.zone, r) > 0, L = sc.d1 - sc.d0;
      const fn = up ? (d) => { const u = (d - sc.d0) / L; return A * ss(0.14, 0.14 + 120 / L, u) * (1 - ss(0.56, 0.96, u)); } : (d) => { const u = (d - sc.d0) / L; return -A * ss(0.05, 0.46, u) * (1 - ss(0.58, 0.58 + 120 / L, u)); };
      return mkRel(sc, fn, A, up);
    },
    pin: pinFor(17),
    build(S) {
      const half = S.R + 5.5, L = S.len, sk = skin(S), a = S.sc.rlo - 14, b = S.sc.rhi + 70, up = S.sc.up;
      walls(S, half, a, b, 12, S.d0 + L * 0.04, S.d1 - L * 0.02, sk.wm, sk.wt);
      const clA = up ? S.d0 + L * 0.14 : S.d0 + L * 0.58, clB = clA + 124;
      // corniches qui dépassent des parois (on les frôle) tous les 18 m pendant la montée
      for (let dc = clA; dc < clB; dc += 18) S.item(dc, (r) => { const L0 = S.lane(dc), s = r() < 0.5 ? -1 : 1; S.bx(dc, L0.lx + s * (half - 1.4), L0.y - 4, 3.6, 0.9, 9, 'concreteDark', '#c0c0bc'); });
      bars(S, half, 30, clA + 14, clB, 1);
      windows(S, half, a, b, S.d0 + 20, S.d1 - 20);
      gantry(S, S.d0 + L * 0.04 + 8); gantry(S, S.d1 - L * 0.04 - 8);
    } };

  // ===== PONT : canyon, on plonge dessous (le tablier est à la cote 0), on remonte de l'autre côté
  SC.pontPlongeon = { len: [320, 390], noDoor: true, noChaos: true, hard: true, sg: -1,
    relief(T, sc, r) { const A = Math.max(34, 40 * kA(T, sc.zone)), L = sc.d1 - sc.d0; return mkRel(sc, (d) => { const u = (d - sc.d0) / L; return -A * ss(0.08, 0.36, u) * (1 - ss(0.64, 0.92, u)); }, A, false); },
    pin: pinFor(13),
    build(S) {
      const half = S.R + 7, A = S.sc.A, L = S.len, sk = skin(S), yb = -A - 14, mid = S.d0 + L / 2;
      walls(S, half, yb, 22, 12, S.d0 + L * 0.06, S.d1 - L * 0.02, sk.wm, sk.wt, (m, s) => S.lane(m).lx + s * (half + 12));
      // le tablier : dalle, garde-corps hachurés, deux pylônes à haubans
      S.item(mid, () => { const L0 = S.lane(mid), fl = S.T.rel(mid), w = 2 * (half + 24); S.bx(mid, L0.lx, -1.5 - fl, w, 3, 26, 'concreteDark', '#b8b8b4'); for (const s of [-1, 1]) { S.bx(mid, L0.lx + s * (half + 8), 1.6 - fl, 1.2, 3.2, 26, 'hazard', undefined, false); S.bx(mid - 10, L0.lx + s * (half + 6), 14 - fl, 2.4, 28, 2.4, 'col:' + ZK[S.zone].acc); S.bx(mid + 10, L0.lx + s * (half + 6), 14 - fl, 2.4, 28, 2.4, 'col:' + ZK[S.zone].acc); } });
      S.reserve(mid, S.lane(mid).lx, 2 * (half + 24), 30);
      for (const f of [0.38, 0.62]) { const dc = S.d0 + L * f; S.item(dc, () => { const L0 = S.lane(dc), fl = S.T.rel(dc); for (const s of [-1, 1]) S.bx(dc, L0.lx + s * (half - 1), (yb + 20) / 2 - fl, 1, 20 - yb, 1, 'col:#8a9096'); }); }
      for (let dc = S.d0 + L * 0.3; dc < S.d1 - L * 0.25; dc += 36) S.gate(dc, S.lane(dc).lx, S.lane(dc).y);
    } };

  // ===== GRADINS : marches géantes (le sol descend en escalier puis remonte par une longue rampe)
  SC.gradins = { len: [340, 400], noDoor: true, noChaos: true, hard: true,
    relief(T, sc, r) {
      const st = Math.round(U.clamp(10 * kA(T, sc.zone), 8, 13)), sg = dir(sc.zone, r), L = sc.d1 - sc.d0, n = 4, tot = st * n; sc.stp = st;
      return mkRel(sc, (d) => { const u = (d - sc.d0) / L; let h = 0; for (let k = 0; k < n; k++) h += st * ss(0.07 + k * 0.1, 0.07 + k * 0.1 + 24 / L, u); return sg * (h - tot * ss(0.64, 0.97, u)); }, tot, sg > 0);
    },
    pin: pinFor(14),
    build(S) {
      const half = S.R + 6, L = S.len, sk = skin(S), a = S.sc.rlo - 12, b = S.sc.rhi + 50;
      walls(S, half, a, b, 12, S.d0 + L * 0.03, S.d1 - L * 0.02, sk.wm, sk.wt);
      // liseré lumineux sur chaque marche + portique en haut
      for (let k = 0; k < 4; k++) { const dc = S.d0 + L * (0.07 + k * 0.1) + 14; S.item(dc, () => { const L0 = S.lane(dc), fl = S.T.rel(dc); S.bx(dc, L0.lx, 0.2, 2 * half, 0.3, 3, 'basic:' + ZK[S.zone].acc, undefined, false); }); }
      gantry(S, S.d0 + L * 0.04 + 6); gantry(S, S.d1 - L * 0.04 - 6);
      for (let dc = S.d0 + 30; dc < S.d1 - 30; dc += 45) S.gate(dc, S.lane(dc).lx, S.lane(dc).y);
    } };

  // ===== MONTAGNES RUSSES : le sol ondule, un portique à chaque crête et à chaque creux
  SC.montagnesRusses = { len: [330, 400], noDoor: true, noChaos: true,
    relief(T, sc, r) { const A = 13 * kA(T, sc.zone), L = sc.d1 - sc.d0, k = 2; return mkRel(sc, (d) => { const u = (d - sc.d0) / L; return A * Math.sin(2 * Math.PI * k * u) * ss(0, 0.12, u) * (1 - ss(0.88, 1, u)); }, A, true); },
    build(S) {
      const L = S.len, per = L / 2;
      for (let i = 0; i < 4; i++) gantry(S, S.d0 + per * (0.25 + i * 0.5) + (i === 0 ? 8 : 0));
      scatterProps(S, 10, S.R + 12);
    } };

  // ===== DEFILE : tranchée en S, des blocs barrent un côté puis l'autre (slalom dans un creux)
  SC.defile = { len: [300, 370], noDoor: true, noChaos: true,
    relief(T, sc, r) { const A = Math.max(12, 14 * kA(T, sc.zone)), L = sc.d1 - sc.d0; return mkRel(sc, (d) => -A * Math.pow(Math.sin(Math.PI * U.clamp((d - sc.d0) / L, 0, 1)), 2), A, false); },
    pin(T, sc) { const a = 11, per = 74, o = sc.d0 + 36; sc.slal = { a, per, o }; return { lx: 0, y: 14, fx: (d) => a * Math.sin(2 * Math.PI * (d - o) / per) * U.clamp((sc.d1 - 34 - d) / 50, 0, 1), from: 34, to: sc.d1 - sc.d0 - 34 }; },
    build(S) {
      const sk = skin(S), sl = S.sc.slal || { a: 11, per: 74, o: S.d0 + 36 }, A = S.sc.A;
      for (let k = 0, dc = sl.o + sl.per / 4; dc < S.d1 - 40; dc += sl.per / 2, k++) {
        const sg = k % 2 === 0 ? 1 : -1, L0 = S.lane(dc), v = S.vol(dc) + 6, edge = L0.lx - sg * (S.R + 3.4);
        S.item(dc, () => { const fl = S.T.rel(dc), x0 = sg > 0 ? -v : edge, x1 = sg > 0 ? edge : v; if (x1 - x0 < 1) return; S.bx(dc, (x0 + x1) / 2, 30 - fl, x1 - x0, 120, 12, sk.wm, sk.wt); S.bx(dc, edge + sg * 0.3, 30 - fl, 0.5, 120, 12.4, 'hazard', undefined, false); });
        S.reserve(dc, 0, 2 * v, 14); S.gate(dc, L0.lx, L0.y);
      }
      scatterProps(S, 6, S.R + 16);
    } };

  // ===== SALLE SPECIALE : un hall fermé (entrée et sortie percées), colonnes en quinconce, décor propre à la zone
  const HALL = {
    city: 'GLASS', usine: 'VATS', port: 'CONT', forest: 'CAVE', tour: 'RACK', sky: 'RIBS', metro: 'COL', mini: 'TOY', eau: 'RIBS', chute: 'RING',
  };
  SC.salle = { len: [300, 360], noDoor: true, noChaos: true,
    pin(T, sc) { const a = 7, per = 50, o = sc.d0 + 70; sc.slal = { a, per, o }; return { lx: 0, y: 14, fx: (d) => a * Math.sin(2 * Math.PI * (d - o) / per) * U.clamp((sc.d1 - 70 - d) / 40, 0, 1), from: 30, to: sc.d1 - sc.d0 - 30 }; },
    build(S) {
      const sk = skin(S), sl = S.sc.slal, L = S.len, v = Math.min(34, S.vol(S.mid) + 4), hh = S.R * 2 + 12, ceil = 46, kind = HALL[S.zone] || 'COL', d0 = S.d0 + 40, d1 = S.d1 - 40;
      // entrée et sortie : un mur percé à la hauteur de la trajectoire
      for (const dc of [d0, d1]) S.item(dc, () => { const L0 = S.lane(dc); S.wall(dc, L0.lx - v - 20, L0.lx + v + 20, 0, ceil + 8, 4, sk.wm, sk.wt, { lx: L0.lx, yc: L0.y, w: S.R * 2 + 12, h: S.R * 2 + 10 }); S.bx(dc, L0.lx, L0.y + S.R + 5.4, S.R * 2 + 12, 0.6, 4.4, 'hazard', undefined, false); S.reserve(dc, L0.lx, 2 * v, 8); S.gate(dc - 8, L0.lx, L0.y); S.gate(dc, L0.lx, L0.y); });
      // parois latérales et plafond de la salle
      for (let dc = d0; dc < d1; dc += 12) S.item(dc + 6, () => { const m = dc + 6, L0 = S.lane(m); for (const s of [-1, 1]) S.bx(m, s * (v + 6), ceil / 2, 12, ceil + 8, 12.8, sk.wm, sk.wt); S.bx(m, 0, ceil + 4, 2 * v + 24, 8, 12.8, sk.wm, sk.wt); S.bx(m, 0, ceil - 1, 2 * v, 0.4, 3, 'basic:' + (S.dark ? '#ffe0a8' : '#fff4d0'), undefined, false); });
      // colonnes en quinconce (comme le slalom de la ville) : un bloc barre un côté, puis l'autre
      for (let k = 0, dc = sl.o + sl.per / 4; dc < d1 - 20; dc += sl.per / 2, k++) {
        const sg = k % 2 === 0 ? 1 : -1, L0 = S.lane(dc), edge = L0.lx - sg * (S.R + 3);
        S.item(dc, () => { const x0 = sg > 0 ? -v : edge, x1 = sg > 0 ? edge : v; if (x1 - x0 < 1) return; S.bx(dc, (x0 + x1) / 2, ceil / 2, x1 - x0, ceil, 8, sk.bm, sk.bt); S.bx(dc, edge + sg * 0.3, 20, 0.5, 40, 8.4, 'hazard', undefined, false); });
        S.reserve(dc, 0, 2 * v, 12); S.gate(dc, L0.lx, L0.y);
      }
      // décor de salle selon la zone (hors de la trajectoire)
      for (let dc = d0 + 20; dc < d1 - 20; dc += 26) S.item(dc, (r) => {
        const L0 = S.lane(dc), s = r() < 0.5 ? -1 : 1, x = L0.lx + s * (S.R + 12 + r() * 6);
        if (Math.abs(x) > v - 3) return;
        if (kind === 'GLASS') { if (Math.abs(dc - S.mid) < 14) { S.b.glass(S.at(dc, L0.lx, ceil / 2), [2 * v, ceil, 0.3], [0, S.yaw(dc), 0]); } S.bx(dc, x, 8, 2, 16, 2, 'col:#8a9096'); }
        else if (kind === 'VATS') { S.cyl(dc, x, 0, 6, 18, 'col:#7a7e84', undefined, 12, 6); S.bx(dc, x, 18.3, 10, 0.5, 10, 'basic:#ff7a1a', undefined, false); }
        else if (kind === 'CONT') { for (let i = 0; i < 3; i++) S.bx(dc, x, 1.35 + i * 2.7, 12, 2.6, 2.7, 'col:' + r.pick(['#c8382c', '#2a5a8a', '#e0a020', '#3a7a4a'])); }
        else if (kind === 'CAVE') { S.cyl(dc, x, ceil - 12, 0.2, 12, 'rock', undefined, 6, 2.6, false); S.cyl(dc, x + 3 * s, 0, 3, 9, 'rock', undefined, 6, 0.4); }
        else if (kind === 'RACK') { S.bx(dc, x, 6, 4, 12, 10, 'col:#2a2e34'); S.bx(dc, x - s * 2.05, 6, 0.1, 10, 8, 'emis:#2be8ff', undefined, false); }
        else if (kind === 'RIBS') { S.bx(dc, L0.lx, ceil - 3, 2 * v, 1.2, 1.2, 'col:#8a9096', undefined, false); S.bx(dc, x, 8, 1.2, 16, 1.2, 'col:#8a9096'); }
        else if (kind === 'TOY') { S.bx(dc, x, 5, 10, 10, 10, 'col:' + r.pick(TOYS)); }
        else if (kind === 'RING') { S.bx(dc, x, 10, 1.4, 20, 1.4, 'col:#d8dce2'); S.bx(dc, x, 20.4, 7, 0.6, 7, 'basic:#ff3ad8', undefined, false); }
        else { S.bx(dc, x, 7, 2, 14, 2, 'col:#8a9096'); S.bx(dc, x, 14.3, 4, 0.5, 1, 'emis:#30c060', undefined, false); }
      });
    } };

  // habillage par zone des parois et des barres
  function skin(S) {
    const m = Z.meta[S.zone] || Z.meta.city, w = m.wall(S.sr), o = m.obstacle || 'concrete';
    return { wm: w.mat, wt: w.tint, bm: o, bt: m.obstacleTint };
  }

  // ---------- inscription dans toutes les zones ----------
  const ALL = Object.keys(SC), ENCL = { metro: 1, usine: 1, mini: 1 };
  for (const zone of Object.keys(ZK)) {
    if (zone === 'tour' || zone === 'chute') continue;   // ces deux zones sont déjà verticales (ascension, chute continue)
    const def = Z.defs[zone]; if (!def) continue;
    def.notFirst = (def.notFirst || []).concat(['salle', 'chuteLibre', 'montee', 'pontPlongeon', 'gradins', 'soussol', 'defile', 'montagnesRusses']);   // jamais en toute première scène
    for (const nm of ALL) {
      const sd = SC[nm];
      if (ZK[zone].sg > 0 && sd.sg < 0) continue;      // port : pas de sous-sol ni de canyon (l'eau est plate)
      if (ZK[zone].sg < 0 && nm === 'montagnesRusses') continue;
      if (ENCL[zone] && (nm === 'colline' || nm === 'montagnesRusses')) continue;   // zones fermées : seulement les scènes qui ont leurs propres parois
      def.scenes[nm] = ENCL[zone] ? Object.assign({}, sd, { noDress: true }) : sd;
    }
  }
  // la forêt (ancien système) devient une zone à scènes : « plaine » = l'ancien décor, plus les scènes de relief
  const forest = { scenes: {}, dress(S) { if (S.sc.name === 'plaine') Z.legacy(S.ctx, S.sc, 'forest'); } };
  forest.scenes.plaine = { len: [260, 340], turns: 'auto', build() {} };
  forest.notFirst = ['salle', 'chuteLibre', 'montee', 'pontPlongeon', 'gradins', 'soussol', 'defile', 'montagnesRusses'];
  Z.defs.forest = forest;
  for (const nm of ALL) forest.scenes[nm] = SC[nm];
  Z.reliefNames = ALL;
})();

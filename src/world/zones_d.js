/* v036 : zones CHUTE, ASCENSION, PROFONDEUR (sous l'eau) et USINE.
 *
 * CHUTE — on tombe de 245 m à 22 m entre des tours colossales ; la mégapole est tout en bas, très loin.
 *   Scènes : falaises de verre · passerelles (une série de ponts percés : on les enfile) · antennes (mâts, haubans) · toits (on dépasse les derniers
 *   étages, piscines, hélistations, hélicoptères) · nuages · SIGNATURE : la Grande Arche (un cube évidé de 90 m, anneaux d'or à travers).
 * ASCENSION — on monte de 12 m à 236 m le long d'une tour.
 *   Scènes : échafaudages (plateformes, nacelles qui montent et descendent) · pylônes (lignes à haute tension) · grues (charges qui se balancent) ·
 *   balcons (façade de verre, jardins suspendus) · SIGNATURE : le pas de tir (une fusée décolle à côté de la roquette).
 * PROFONDEUR — le fond est à −70 m, la surface à −4 m : lumière verte, bulles, bancs de poissons.
 *   Scènes : récif · épave (coque dont on enfile les membrures) · base sous-marine (tubes vitrés, dômes, sous-marins) · grotte · banc (poissons,
 *   baleine) · SIGNATURE : le squelette géant (arches de côtes à traverser).
 * USINE — une halle de 76 m de large sous un plafond à 70 m.
 *   Scènes : convoyeurs (colis qui avancent, bras robotisés) · presses (pistons) · fonderie (creusets, coulée, étincelles) · cuves · bras (série de bras
 *   articulés) · SIGNATURE : la chaîne (un monorail qui porte des carrosseries géantes à travers une cage de soudure). */
(function () {
  const U = CC.U, G = CC.Gen, Z = CC.Zones, L = CC.Life, DEG = 180 / Math.PI;
  const NEON = ['#ff3ad8', '#2be8ff', '#ffb02b', '#8a6aff'];

  L.models.sub = () => [[0, 0, 0, 7, 6, 34, '#ffffff'], [0, 3.6, 2, 2.4, 3, 6, '#ffffff'], [0, 0.6, -17.5, 4, 4, 2, '#ffffff'], [0, 0, 18, 1.2, 8, 3, '#ffffff'], [0, 0, 18, 8, 1.2, 3, '#ffffff'],
    [-2, 1, -14, 0.1, 1.2, 0.1, '#fff8c8', { glow: true }], [0, 0.5, -17.6, 2, 2, 0.1, '#bff4ff', { glow: true }], [-3.2, 1, 2, 0.1, 1, 1.4, '#bff4ff', { glow: true }], [3.2, 1, 2, 0.1, 1, 1.4, '#bff4ff', { glow: true }]];
  L.models.car2 = L.models.van;
  L.models.jelly = () => [[0, 0, 0, 2.6, 1.2, 2.6, '#ffffff'], [0, 0.5, 0, 2.0, 0.6, 2.0, '#ffffff', { glow: true }], [-0.5, -1.4, 0, 0.08, 2, 0.08, '#ffffff'], [0.5, -1.4, 0.3, 0.08, 2, 0.08, '#ffffff'], [0, -1.6, -0.4, 0.08, 2.2, 0.08, '#ffffff']];
  L.models.rocketBig = () => [[0, 14, 0, 5, 28, 5, '#f4f4f0'], [0, 30, 0, 3.6, 5, 3.6, '#e02a1c'], [0, 33.4, 0, 1.6, 3, 1.6, '#e02a1c'], [0, 4, 0, 5.3, 2, 5.3, '#2a2a30'], [0, 8, 0, 5.05, 1.6, 5.05, '#e8c020'], [-3.6, 3.5, 0, 1.2, 7, 0.4, '#e02a1c'], [3.6, 3.5, 0, 1.2, 7, 0.4, '#e02a1c'], [0, 3.5, -3.6, 0.4, 7, 1.2, '#e02a1c'], [0, 3.5, 3.6, 0.4, 7, 1.2, '#e02a1c']];
  L.models.carBody = () => [[0, 0, 0, 8, 2.4, 18, '#ffffff'], [0, 1.6, 1.5, 7, 1.6, 9, '#c8ccd2'], [0, 0, 0, 8.04, 0.3, 18.04, '#2a2a30']];

  // ============================================================== CHUTE
  function towerWalls(S, top0, top1) {
    const sr = S.sr;
    for (const s of [-1, 1]) {
      for (let dc = S.d0; dc < S.d1; dc += 20) S.item(dc + 10, (r) => {
        const m = dc + 10, v = S.vol(m), seg = Math.floor(m / 60), hr = U.makeRng(seg * 977 + (s > 0 ? 13 : 5)), h = top0 + (top1 - top0) * hr(), side = hr() < 0.5 ? 'facade' : (hr() < 0.5 ? 'facadeTan' : 'facadePink');
        const set = hr() * 3, tint = S.dark ? '#b8bcc8' : ['#ffffff', '#f2eee8', '#e8ecf0'][Math.floor(hr() * 3)];
        S.bx(m, s * (v + set + 14), h / 2 - 0.5, 28, h, 20.4, { side: S.dark ? 'facadeDark' : side, top: 'concrete', bottom: 'concreteDark' }, tint);
        // corniches horizontales et balcons tous les 18 m
        for (let y = 20; y < h - 4; y += 26) S.bx(m, s * (v + set - 0.6), y, 1.4, 0.9, 20.2, 'concreteDark', '#c0c0bc', false);
        if (r() < 0.12) { const y = r.between([30, h - 20]); S.bx(m, s * (v + set - 2.2), y, 4, 1.2, 14, 'col:' + r.pick(NEON), undefined, false); }
      });
    }
    // enseignes lumineuses et écrans (nuit)
    if (S.dark) for (const s of [-1, 1]) S.rows(S.d0 + 8, S.d1, 26, 0.4, (dc) => S.item(dc, (r) => { const y = r.between([18, 220]), w = r.between([4, 9]), hh = r.between([10, 26]); S.neon(dc, s * (S.vol(dc) - 0.1), y, 0.8, hh, w, r.pick(NEON), 16); }));
    // nacelles de lavage de vitres
    for (const s of [-1, 1]) S.rows(S.d0 + 30, S.d1, 90, 0.4, (dc) => S.item(dc, (r) => { const y = r.between([30, 200]); S.bx(dc, s * (S.vol(dc) - 2), y, 1.6, 1.2, 5.6, 'col:#d8d0c0', undefined, false); S.bx(dc, s * (S.vol(dc) - 2), y + 10, 0.08, 20, 0.08, 'col:#1a1a1a', undefined, false); }));
  }
  function chuteLife(S) {
    if (!S.dark) L.fleet(S, { model: 'bird', n: 6, lx: [-40, 40], y: [0, 240], speed: [8, 14], flap: 0.55, scale: [1.6, 2.6], sound: { name: 'birds', range: 110, every: 8 } });
    L.fleet(S, { model: 'heli', n: 2, lx: [-34, 34], y: [30, 210], speed: [14, 22], scale: [1.4, 1.8], wave: 1.4, sound: { name: 'whoosh', range: 70, every: 6 } });
    L.fleet(S, { model: 'balloon', n: 2, lx: [-40, 40], y: [40, 220], speed: [3, 6], scale: [1.4, 2], bob: 3 });
  }
  const chute = { signature: 'arche', scenes: {}, dress(S) { chuteLife(S); } };
  Z.defs.chute = chute;
  chute.scenes.falaises = { len: [230, 310], build(S) {
    towerWalls(S, 170, 330);
    // quelques ponts décoratifs (hors de la trajectoire) et antennes plantées sur les toits voisins
    for (let i = 0; i < 4; i++) { const dc = S.d0 + 30 + S.sr() * (S.len - 60), s = S.sr() < 0.5 ? -1 : 1, y = S.sr.between([120, 280]); S.item(dc, (r) => S.bx(dc, s * (S.vol(dc) + 12), y + 50, 0.9, 100, 0.9, 'col:#3a3d42', undefined, false)); }
  } };
  chute.scenes.passerelles = { len: [240, 310], build(S) {
    towerWalls(S, 190, 330);
    const n = Math.max(3, Math.floor(S.len / 52));
    for (let i = 0; i < n; i++) { const dc = S.d0 + 28 + i * (S.len - 56) / (n - 1), Ln = S.lane(dc), hw = S.R * 2 + 10, hh = S.R * 1.5 + 6;
      S.item(dc, (r) => {
        const v = S.vol(dc) + 4, y0 = Ln.y - hh / 2 - 7, y1 = Ln.y + hh / 2 + 7;
        S.wall(dc, -v, v, y0, y1, 6, { side: 'metal', top: 'concreteDark', bottom: 'concreteDark' }, '#cfd4dc', { lx: Ln.lx, yc: Ln.y, w: hw, h: hh });
        S.bx(dc, Ln.lx, y1 + 0.7, hw + 12, 1.4, 6.4, 'hazard', undefined, false);
        S.bx(dc, Ln.lx, y0 - 0.3, 2 * v, 0.6, 6.4, S.dark ? 'basic:' + NEON[i % NEON.length] : 'col:#8a9098', undefined, false);        // liseré
        for (let k = -3; k <= 3; k++) S.bx(dc, k * 12, (y0 + y1) / 2, 0.14, y1 - y0 - 3, 0.14, 'col:#5a6068', undefined, false);
      });
      S.gate(dc, Ln.lx, Ln.y); }
    S.reserve(S.mid, 0, 2 * S.vol(S.mid), S.len - 40);
  } };
  chute.scenes.antennes = { len: [220, 290], build(S) {
    towerWalls(S, 160, 300);
    const sr = S.sr;
    // deux mâts géants plantés hors de la trajectoire, feux rouges, échelons ; haubans en diagonale qui ne coupent jamais le couloir
    for (let i = 0; i < 2; i++) { const dc = S.d0 + S.len * (0.3 + i * 0.4), s = i ? 1 : -1, lx = s * (S.vol(dc) - 12);
      S.place(dc, lx, 10, 10, 0, 330, (r) => {
        S.bx(dc, lx, 165, 3, 330, 3, 'col:#d8d8d4'); for (let y = 12; y < 330; y += 12) { S.bx(dc, lx, y, 9 - y / 50, 0.5, 0.5, 'col:#d84a2a', undefined, false); S.bx(dc, lx, y + 6, 0.5, 0.5, 9 - y / 50, 'col:#d84a2a', undefined, false); }
        for (let y = 40; y < 330; y += 60) S.bx(dc, lx, y, 1.2, 1.2, 1.2, 'basic:#ff2a1a', undefined, false);
        S.bx(dc, lx, 333, 0.5, 14, 0.5, 'col:#d8d8d4', undefined, false);
      }, { vol: 99 }); }
    // câbles tendus d'un mur à l'autre, au-dessus et au-dessous de la trajectoire (jamais dedans)
    for (let i = 0; i < 6; i++) { const dc = S.d0 + 20 + i * (S.len - 40) / 5, Ln = S.lane(dc), up = i % 2 ? 1 : -1, y = Ln.y + up * (S.R + 12 + (i % 3) * 6);
      S.item(dc, () => { S.b.cable([...S.at(dc, -S.vol(dc), y)], [...S.at(dc, S.vol(dc), y + 3)], 0.3, 'col:#1a1a1a'); }); }
  } };
  chute.scenes.toits = { len: [220, 290], build(S) {
    towerWalls(S, 60, 220);
    const sr = S.sr;
    // ici les tours s'arrêtent plus bas : on voit leurs toits (piscines, hélistations, jardins) et le ciel entre elles
    for (const s of [-1, 1]) S.rows(S.d0 + 15, S.d1, 46, 0.3, (dc) => S.item(dc, (r) => {
      const h = r.between([60, 200]), x = s * (S.vol(dc) + 16 + r.between([0, 8])), kind = r();
      if (kind < 0.3) { S.bx(dc, x, h + 0.2, 26, 0.6, 26, 'col:#2a9ac0', undefined, false); S.bx(dc, x, h + 0.05, 28, 0.3, 28, 'col:#e8e8e4', undefined, false); }        // piscine
      else if (kind < 0.6) { S.cyl(dc, x, h, 11, 0.5, 'col:#2a2e34', undefined, 16, 11, false); S.bx(dc, x, h + 0.35, 1.6, 0.06, 9, 'col:#f4f4f0', undefined, false); S.bx(dc, x, h + 0.35, 9, 0.06, 1.6, 'col:#f4f4f0', undefined, false); }   // hélistation
      else { for (let k = 0; k < 6; k++) { const p = S.at(dc + r.between([-8, 8]), x + r.between([-8, 8]), h); S.b.tree(p[0], p[2], r.between([4, 8]), 0.3, p[1]); } }   // jardin
    }));
  } };
  chute.scenes.nuages = { len: [190, 250], build(S) {
    towerWalls(S, 140, 260);
    // banc de nuages : gros pâtés blancs (sans collision) qui réduisent la vue, dont quelques-uns autour de la trajectoire
    for (let i = 0; i < 22; i++) { const dc = S.d0 + S.sr() * S.len, lx = S.sr.between([-44, 44]), y = S.sr.between([10, 240]), sc = S.sr.between([10, 30]);
      S.item(dc, (r) => { for (let k = 0; k < 3; k++) { const p = S.at(dc + r.between([-sc, sc]), lx + r.between([-sc, sc]), y + r.between([-sc * 0.2, sc * 0.3])), g = new THREE.IcosahedronGeometry(sc * r.between([0.6, 1]), 1);
        S.b.addGeometry(g, new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion(), new THREE.Vector3(1.3, 0.6, 1.1), 'basic:#' + new THREE.Color(S.dark ? '#3a2a5a' : '#f8faff').multiplyScalar(r.between([0.9, 1])).getHexString()); g.dispose(); } }); }
  } };
  chute.scenes.arche = { len: [260, 320], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -6, 6), y: U.clamp(T.laneY0(mid), 60, 160), from: (sc.d1 - sc.d0) / 2 - 70, to: (sc.d1 - sc.d0) / 2 + 70 }; },
    build(S) {
      towerWalls(S, 190, 330);
      // SIGNATURE : la Grande Arche — un cube évidé de 100 m posé en travers du vide, bordé de néon la nuit ; on tombe à travers son ouverture
      const c = S.mid, Ln = S.lane(c), v = S.vol(c) + 4, hole = 62, yc = Ln.y, top = yc + hole / 2 + 34, bot = Math.max(10, yc - hole / 2 - 34);
      S.item(c, (r) => {
        S.wall(c, -v, v, bot, top, 38, { side: S.dark ? 'facadeDark' : 'facade', top: 'concrete', bottom: 'concreteDark' }, '#f0f0ec', { lx: Ln.lx, yc, w: hole, h: hole });
        const edge = S.dark ? 'basic:#2be8ff' : 'col:#d8dce4';
        for (const dz of [-19.2, 19.2]) { S.bx(c + dz, Ln.lx, yc + hole / 2 + 0.4, hole + 1.6, 0.9, 0.9, edge, undefined, false); S.bx(c + dz, Ln.lx, yc - hole / 2 - 0.4, hole + 1.6, 0.9, 0.9, edge, undefined, false);
          S.bx(c + dz, Ln.lx - hole / 2 - 0.4, yc, 0.9, hole + 1.6, 0.9, edge, undefined, false); S.bx(c + dz, Ln.lx + hole / 2 + 0.4, yc, 0.9, hole + 1.6, 0.9, edge, undefined, false); }
      });
      S.reserve(c, 0, 2 * v, 44); S.rings(c - 90, 7, 26, 9); S.gate(c, Ln.lx, yc);
      ctxSpiral(S, c, Ln);
    } };
  function ctxSpiral(S, c, Ln) { if (S.inClip(c)) S.ctx.special = { d: c, lx: Ln.lx, y: Ln.y }; }

  // ============================================================== ASCENSION
  class LaunchRocket {          // fusée décorative qui décolle quand la roquette approche (aucune collision : elle passe à 30 m de la trajectoire)
    constructor(S, d, lx) {
      this.T = S.T; this.d = d; this.lx = lx; this.t = -1; this.y0 = 0; this.type = 'decor';
      const gs = L.buildGeo(L.models.rocketBig()), ms = [new THREE.MeshLambertMaterial({ vertexColors: true })];
      this.object = new THREE.Group(); this.body = new THREE.Mesh(gs.solid, ms[0]); this.body.frustumCulled = false; this.object.add(this.body);
      this.flame = new THREE.Mesh(new THREE.ConeGeometry(2.6, 26, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ffb040', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      this.flame.geometry.translate(0, -13, 0); this.flame.visible = false; this.flame.frustumCulled = false; this.object.add(this.flame);
      this.y = 0; this.vy = 0; this.launched = false; this.place();
    }
    place() { const p = this.T.at(this.d, this.lx, this.y + 26); this.body.position.set(p[0], p[1], p[2]); this.body.rotation.y = this.T.yawAcross(this.d) / DEG; this.flame.position.set(p[0], p[1] + 4 - 2, p[2]); }
    update(dt, game) {
      const run = game.endlessRun; if (!run) return;
      if (!this.launched && run.dist > this.d - 190 && run.dist < this.d + 30) { this.launched = true; game.audio.play('padIgnite', this.body.position.clone()); this.flame.visible = true; }
      if (this.launched) { this.vy += 34 * dt; this.y += this.vy * dt; this.place(); this.flame.scale.set(1 + Math.random() * 0.2, 1 + Math.random() * 0.4, 1 + Math.random() * 0.2); this.flame.material.opacity = 0.6 + Math.random() * 0.3; if (this.y > 700) { this.launched = false; this.flame.visible = false; this.body.visible = false; }
        if (this.y < 400 && game.effects && Math.random() < 0.5) game.effects.exhaustSmoke(this.body.position.clone().add(new THREE.Vector3(0, -3, 0)), new THREE.Vector3(0, -8, 0), 1.6); }
    }
    reset() {} updateObb() {} kill() {} clearWreck() {}
  }
  function tourWalls(S, sideOnly) {
    // façade d'une tour colossale d'un côté, vide de l'autre : on monte le long d'elle
    const s = S.sc.side || (S.sc.side = (G.stream(S.T.seed, 'tside' + S.sc.key)() < 0.5 ? -1 : 1));
    for (let dc = S.d0; dc < S.d1; dc += 20) S.item(dc + 10, (r) => {
      const m = dc + 10, v = S.vol(m);
      S.bx(m, s * (v + 20), 150, 40, 300, 20.4, { side: S.dark ? 'facadeDark' : 'facade', top: 'concrete', bottom: 'concreteDark' }, S.dark ? '#b8bcc8' : '#f0f0ec');
      for (let y = 18; y < 290; y += 30) { S.bx(m, s * (v - 0.4), y, 1.6, 1.0, 20.2, 'concreteDark', '#c0c0bc', false); if (r() < 0.25) S.bx(m, s * (v - 2.4), y + 1.6, 3.6, 0.8, 7, 'col:#6a9a5a', undefined, false); }
      if (S.dark && r() < 0.18) S.bx(m, s * (v - 0.2), r.between([30, 280]), 0.6, r.between([8, 20]), r.between([3, 7]), 'basic:' + r.pick(NEON), undefined, false);
    });
    // l'autre côté : des tours lointaines (hors volume) et le ciel
    for (let i = 0; i < 5; i++) { const dc = S.d0 + S.sr() * S.len, h = S.sr.between([120, 340]); S.item(dc, () => S.bx(dc, -s * (S.vol(dc) + S.sr.between([50, 160])), h / 2 - 1, S.sr.between([24, 50]), h, S.sr.between([24, 50]), { side: S.dark ? 'facadeDark' : 'facade', top: 'concrete', bottom: 'concreteDark' }, '#dde0e6', false)); }
    return s;
  }
  function tourLife(S) {
    if (!S.dark) L.fleet(S, { model: 'bird', n: 6, lx: [-40, 40], y: [0, 240], speed: [8, 14], flap: 0.55, scale: [1.6, 2.6], sound: { name: 'birds', range: 110, every: 8 } });
    L.fleet(S, { model: 'heli', n: 2, lx: [-34, 34], y: [20, 240], speed: [14, 22], scale: [1.4, 1.8], wave: 1.4, sound: { name: 'whoosh', range: 70, every: 6 } });
  }
  const tour = { signature: 'pas', scenes: {}, dress(S) { tourLife(S); } };
  Z.defs.tour = tour;
  tour.scenes.echafaudages = { len: [230, 300], build(S) {
    const s = tourWalls(S), sr = S.sr;
    // échafaudage : poteaux tous les 10 m de chaque côté du volume, planchers tous les 24 m (avec un passage libre), nacelles qui montent et descendent
    for (let dc = S.d0 + 8; dc < S.d1; dc += 12) S.item(dc, () => { for (const a of [-1, 1]) S.bx(dc, a * (S.vol(dc) - 1), 150, 0.9, 300, 0.9, 'col:#8a9098'); });
    for (let y = 20; y < 290; y += 26) for (let dc = S.d0 + 5; dc < S.d1 - 5; dc += 20) { const Lh = S.lane(dc + 10), free = Math.abs(Lh.y - y) < S.R + 6;
      S.item(dc + 10, () => { for (const a of [-1, 1]) if (!free || Math.abs(Lh.lx - a * (S.vol(dc) - 6)) > S.R + 4) S.bx(dc + 10, a * (S.vol(dc) - 6), y, 11, 0.6, 20, 'planks', '#c8a878', !free); S.bx(dc + 10, 0, y + 1.2, 0.14, 1.2, 0.14, 'col:#8a9098', undefined, false); }); }
    L.fleet(S, { model: 'pkg', n: 6, mode: 'lift', lx: [-S.vol(S.mid) + 6, S.vol(S.mid) - 6], y: [20, 250], speed: [5, 9], scale: [2.4, 3.2] });
  } };
  tour.scenes.pylones = { len: [220, 290], build(S) {
    tourWalls(S, 0);
    for (let i = 0; i < 5; i++) { const dc = S.d0 + 25 + i * (S.len - 50) / 4, Ln = S.lane(dc), side = i % 2 ? 1 : -1, lx = side * (S.vol(dc) - 6);
      S.place(dc, lx, 10, 10, 0, 300, (r) => {
        const h = 280; for (const a of [-1, 1]) for (const c of [-1, 1]) S.bx(dc + c * 3, lx + a * 3, h / 2, 1, h, 1, 'col:#8a9098');
        for (let y = 20; y <= h; y += 20) { S.bx(dc, lx, y, 8, 0.5, 0.5, 'col:#8a9098', undefined, false); S.bx(dc, lx, y, 0.5, 0.5, 8, 'col:#8a9098', undefined, false); }
        for (const y of [h - 10, h - 30, h - 60]) { S.bx(dc, lx - side * 10, y, 22, 0.6, 0.6, 'col:#8a9098', undefined, false); }
        S.bx(dc, lx, h + 2, 1.2, 1.2, 1.2, 'basic:#ff2a1a', undefined, false);
      }, { vol: 99 }); }
    // les lignes : entre deux pylônes voisins, à une hauteur qui s'écarte de la trajectoire
    for (let i = 0; i < 4; i++) { const d1 = S.d0 + 25 + i * (S.len - 50) / 4, d2 = d1 + (S.len - 50) / 4, y = 60 + i * 50; S.item((d1 + d2) / 2, () => { const Ln = S.lane((d1 + d2) / 2); if (Math.abs(Ln.y - y) > S.R + 8) for (const off of [-3, 3]) S.b.cable([...S.at(d1, (i % 2 ? 1 : -1) * (S.vol(d1) - 6 + off), y)], [...S.at(d2, ((i + 1) % 2 ? 1 : -1) * (S.vol(d2) - 6 + off), y)], 0.22, 'col:#101010'); }); }
  } };
  tour.scenes.grues = { len: [230, 300], build(S) {
    tourWalls(S, 0);
    const sr = S.sr;
    // grues à tour : le mât est à côté, la flèche au-dessus ; une CHARGE suspendue se balance sur la trajectoire (obstacle mobile : on la contourne)
    for (let i = 0; i < 3; i++) { const dc = S.d0 + 45 + i * (S.len - 90) / 2, Ln = S.lane(dc), side = i % 2 ? 1 : -1, lx = side * (S.vol(dc) - 8), top = Math.min(300, Math.max(Ln.y + 70, 120));
      S.place(dc, lx, 6, 6, 0, top + 6, (r) => {
        S.bx(dc, lx, top / 2, 2.4, top, 2.4, 'col:#e0b020'); S.bx(dc, lx - side * 26, top + 1.4, 56, 1.6, 1.8, 'col:#e0b020', undefined, false); S.bx(dc, lx + side * 10, top + 1.4, 12, 2.4, 2.6, 'col:#8a8a88', undefined, false); S.bx(dc, lx, top + 4.4, 1.8, 5, 1.8, 'col:#e0b020', undefined, false);
        L.sweeper(S, { model: 'container', d: dc, lx: lx - side * 24, y: top + 0.6, mode: 'swing', len: Math.min(top - 4, Math.max(14, top - Ln.y + 2)), angle: 0.42, period: 5.2 + i, phase: r() * 6.28, size: [3, 3, 6.4], cause: 'crane', cable: true, tilt: 0.3, ropeEnd: 1.6, sound: null });
      }, { vol: 99 }); }
  } };
  tour.scenes.balcons = { len: [220, 290], build(S) {
    const s = tourWalls(S), sr = S.sr;
    // façade de verre avec balcons et jardins suspendus (arbres en pot, lianes), ascenseurs panoramiques qui montent et descendent le long de la paroi
    for (let dc = S.d0 + 6; dc < S.d1; dc += 14) S.item(dc, (r) => { for (let y = 26; y < 280; y += 26) if (r() < 0.6) { const w = r.between([8, 12]); S.bx(dc, s * (S.vol(dc) - 4), y, 8, 0.8, w, 'concrete', '#d8d8d4', false); if (r() < 0.6) { const p = S.at(dc, s * (S.vol(dc) - 4), y + 0.4); S.b.tree(p[0], p[2], r.between([3, 6]), 0.25, p[1]); } } });
    L.fleet(S, { model: 'pkg', n: 4, mode: 'lift', lx: [s * (S.vol(S.mid) - 2), s * (S.vol(S.mid) - 2)], y: [20, 250], speed: [8, 12], scale: [2.4, 3.2] });
    // un pont piétonnier vitré qui traverse, percé à la hauteur de la trajectoire
    const dc = S.mid, Ln = S.lane(dc), hh = S.R * 1.6 + 4, hw = S.R * 2 + 8;
    S.item(dc, () => { S.wall(dc, -S.vol(dc) - 2, S.vol(dc) + 2, Ln.y - hh / 2 - 6, Ln.y + hh / 2 + 6, 7, S.dark ? 'emis:#9ab4c4' : 'glass', undefined, { lx: Ln.lx, yc: Ln.y, w: hw, h: hh }); S.bx(dc, Ln.lx, Ln.y + hh / 2 + 6.5, hw + 12, 1, 7.4, 'metal', '#b0b6bc', false); });
    S.reserve(dc, 0, 2 * S.vol(dc), 9); S.gate(dc, Ln.lx, Ln.y);
  } };
  tour.scenes.pas = { len: [260, 320], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -4, 4), y: U.clamp(T.laneY0(mid), 60, 150), from: (sc.d1 - sc.d0) / 2 - 80, to: (sc.d1 - sc.d0) / 2 + 80 }; },
    build(S) {
      const s = tourWalls(S), c = S.mid, Ln = S.lane(c), lx = -Math.sign(Ln.lx || 1) * 26;
      // SIGNATURE : le pas de tir — portique à quatre jambes, bras de maintien ; la fusée s'allume quand la roquette arrive et file vers le ciel à côté d'elle
      S.item(c, (r) => {
        for (const a of [-1, 1]) for (const b of [-1, 1]) S.bx(c + b * 9, lx + a * 9, 24, 1.2, 48, 1.2, 'col:#d8a020');
        for (let y = 8; y < 48; y += 8) for (const a of [-1, 1]) { S.bx(c, lx + a * 9, y, 1, 0.5, 19, 'col:#d8a020', undefined, false); S.bx(c + a * 9, lx, y, 19, 0.5, 1, 'col:#d8a020', undefined, false); }
        S.bx(c, lx, 0.6, 26, 1.2, 26, 'concreteDark', '#a8a8a4', false); S.bx(c, lx, 0.15, 30, 0.3, 30, 'hazard', undefined, false);
        const rk = new LaunchRocket(S, c, lx); S.b.entity(rk);
        for (let k = 0; k < 4; k++) S.bx(c - 6, lx + 6, 10 + k * 8, 6, 0.6, 0.6, 'col:#8a9098', undefined, false);        // bras de maintien
      });
      S.reserve(c, lx, 34, 34); S.rings(c - 70, 6, 24, 9); S.gate(c, Ln.lx, Ln.y);
    } };

  // ============================================================== PROFONDEUR
  function seaLife(S, big) {
    L.fleet(S, { model: 'fish', n: 14, lx: [-44, 44], y: [4, 52], speed: [6, 12], scale: [0.9, 1.6], tint: ['#ffb02b', '#2be8ff', '#ff6ad8', '#9af0ff', '#ffe28a'], wave: 2, sound: null });
    L.motes(S, { n: 60, lx: [-46, 46], y: [2, 54], color: '#d8f8ff', size: 0.55, drift: [0, 2.2, 0], sway: 1.2, opacity: 0.6 });
    if (big) L.fleet(S, { model: 'sub', n: 1, lx: [-30, 30], y: [14, 40], speed: [6, 9], dir: 1, scale: [1, 1], sound: { name: 'shipHorn', range: 160, every: 30, param: 'far' } });
    // rayons de lumière : bandes verticales pâles depuis la surface
    for (let i = 0; i < 6; i++) { const dc = S.d0 + S.sr() * S.len, lx = S.sr.between([-44, 44]); S.item(dc, () => S.bx(dc, lx, 40, S.sr.between([3, 8]), 100, 0.4, 'basic:#2a7a8a', undefined, false, { r: [0, S.yaw(dc), 0] })); }
  }
  function seabed(S) {
    // le fond (dunes), la surface en plafond lumineux (mat eau), rochers
    for (let dc = S.d0; dc < S.d1; dc += 20) S.item(dc + 10, (r) => { for (const s of [-1, 1]) S.bx(dc + 10, s * (S.vol(dc) + 16), 34, 30, 100, 20.4, 'rock', '#4a6a72'); });
    S.rows(S.d0 + 10, S.d1, 34, 0.5, (dc) => S.item(dc, (r) => { const lx = r.between([-1, 1]) * (S.vol(dc) - 4); if (S.conflict(dc, lx, 6, 6, 0, 8, 0)) return; S.b.rockLump(...S.at(dc, lx, 0).slice(0, 3).map((v, i) => v), r.between([2, 6]), 'col:#5a7a80'); }));
  }
  const eau = { signature: 'squelette', scenes: {}, dress(S) { seaLife(S, S.sc.name === 'base'); seabed(S); } };
  Z.defs.eau = eau;
  eau.scenes.recif = { len: [230, 310], build(S) {
    const sr = S.sr;
    for (let i = 0; i < 30; i++) { const dc = S.d0 + 10 + sr() * (S.len - 20), lx = sr.between([-1, 1]) * (S.vol(dc) - 3), h = sr.between([4, 22]), rad = sr.between([1.5, 4.5]);
      S.place(dc, lx, rad * 2.4, rad * 2.4, 0, h, (r) => { const col = r.pick(['#d8604a', '#e8a04a', '#c84a9a', '#4ab8a8', '#8a6ad8']); S.cyl(dc, lx, 0, rad, h, 'col:' + col, undefined, 8, rad * 0.5);
        for (let k = 0; k < 3; k++) S.cyl(dc + r.between([-rad, rad]), lx + r.between([-rad, rad]), h * 0.4, rad * 0.4, h * 0.6, 'col:' + col, undefined, 6, rad * 0.2, false); }, { m: 0.5 }); }
    for (let i = 0; i < 40; i++) { const dc = S.d0 + S.sr() * S.len, lx = S.sr.between([-1, 1]) * S.vol(dc), h = S.sr.between([8, 26]); S.item(dc, (r) => S.bx(dc, lx, h / 2, 0.5, h, 0.5, 'col:#3a9a5a', undefined, false, { r: [0, S.yaw(dc), r.between([-8, 8])] })); }          // algues
  } };
  eau.scenes.epave = { len: [230, 300], build(S) {
    const c = S.mid, Ln = S.lane(c);
    // épave d'un cargo : membrures (cadres percés) toutes les 16 m sur 120 m ; la trajectoire passe dans la coque éventrée
    const n = 8, hw = S.R * 2 + 10, hh = S.R * 1.6 + 6;
    for (let i = 0; i < n; i++) { const dc = c - 60 + i * 17, L2 = S.lane(dc); S.item(dc, () => { const v = S.vol(dc) + 4; S.wall(dc, L2.lx - 26, L2.lx + 26, 0, Math.min(60, L2.y + hh / 2 + 14), 1.6, 'metal', '#5a4a3a', { lx: L2.lx, yc: L2.y, w: hw, h: hh });
      S.bx(dc, L2.lx, Math.min(60, L2.y + hh / 2 + 14) + 0.4, 52, 0.8, 1.8, 'col:#6a5a48', undefined, false); }); S.gate(dc, L2.lx, L2.y); }
    S.item(c, (r) => { S.bx(c, Ln.lx - 27, 14, 2, 28, 130, 'metal', '#4a3a2e'); S.bx(c, Ln.lx + 27, 14, 2, 28, 130, 'metal', '#4a3a2e'); S.cyl(c + 40, Ln.lx + 22, 28, 3, 22, 'col:#7a4a2a', undefined, 10, 2.4, false); });
    S.reserve(c, Ln.lx, 60, 140);
  } };
  eau.scenes.base = { len: [230, 300], build(S) {
    const sr = S.sr;
    // base sous-marine : dômes vitrés lumineux au sol, tubes horizontaux qui relient, tour de contrôle, sous-marins
    for (let i = 0; i < 4; i++) { const dc = S.d0 + 30 + i * (S.len - 60) / 3, s = i % 2 ? 1 : -1, lx = s * (S.vol(dc) - 14);
      S.place(dc, lx, 24, 24, 0, 28, (r) => { S.cyl(dc, lx, 0, 12, 4, 'concrete', '#b8c0c4', 16, 12); S.ball(dc, lx, 4, 11, 'glass', undefined, true, 0.9); S.ball(dc, lx, 4, 6, 'basic:#8ae8f8', undefined, false, 0.9); S.cyl(dc, lx, 14, 0.5, 14, 'col:#8a9098', undefined, 5, 0.3, false); S.bx(dc, lx, 28.4, 1.2, 1.2, 1.2, 'basic:#ff6a4a', undefined, false); }); }
    for (let i = 0; i < 3; i++) { const dc = S.d0 + 50 + i * (S.len - 100) / 2, Ln = S.lane(dc), y = Ln.y + (i % 2 ? 1 : -1) * (S.R + 9);      // tubes en travers, au-dessus ou au-dessous de la trajectoire
      S.item(dc, () => { S.b.cylinder({ p: S.at(dc, 0, y), rad: 3, h: 2 * S.vol(dc) + 4, seg: 10, mat: 'glass', r: [0, S.yaw(dc), 90], colSize: [6, 2 * S.vol(dc), 6] }); S.b.cylinder({ p: S.at(dc, 0, y), rad: 1.6, h: 2 * S.vol(dc) + 4, seg: 8, mat: 'basic:#8ae8f8', r: [0, S.yaw(dc), 90], collide: false }); }); }
    L.fleet(S, { model: 'sub', n: 2, lx: [-28, 28], y: [12, 44], speed: [6, 11], scale: [1, 1.2], sound: { name: 'shipHorn', range: 140, every: 30, param: 'far' } });
  } };
  eau.scenes.grotte = { len: [200, 270], build(S) {
    const sr = S.sr;
    // goulot rocheux : des blocs serrés aux deux bords, stalactites et stalagmites, éclats lumineux verdâtres (sobres) ; la trajectoire reste libre
    for (let dc = S.d0; dc < S.d1; dc += 20) S.item(dc + 10, (r) => { const m = dc + 10, v = S.vol(m), Ln = S.lane(m); for (const s of [-1, 1]) S.bx(m, s * (v - 6 + 12), 50, 24, 100, 20.4, 'rock', '#44606a'); S.bx(m, 0, 62 + 12, 2 * v, 26, 20.4, 'rock', '#3a545c', true); });
    for (let i = 0; i < 26; i++) { const dc = S.d0 + 8 + sr() * (S.len - 16), up = sr() < 0.5, lx = sr.between([-1, 1]) * (S.vol(dc) - 4), h = sr.between([5, 16]);
      S.place(dc, lx, 4, 4, up ? 0 : 62 - h, h, (r) => S.cyl(dc, lx, up ? 0 : 62 - h, 2.2, h, 'rock', '#5a7a82', 7, 0.3), { m: 0.3 }); }
    for (let i = 0; i < 30; i++) { const dc = S.d0 + sr() * S.len, lx = sr.between([-1, 1]) * S.vol(dc), y = sr.between([4, 58]); S.item(dc, () => S.bx(dc, lx, y, 0.6, 0.6, 0.6, 'basic:#5af0b0', undefined, false)); }
  } };
  eau.scenes.banc = { len: [190, 250], build(S) {
    // respiration : eau ouverte, énormes bancs, une baleine qui traverse lentement (obstacle mobile très lisible), méduses
    L.fleet(S, { model: 'fish', n: 20, lx: [-46, 46], y: [6, 56], speed: [8, 14], scale: [1.0, 1.8], tint: ['#ffb02b', '#2be8ff', '#ff6ad8', '#9af0ff', '#ffe28a'], wave: 4 });
    L.fleet(S, { model: 'jelly', n: 8, lx: [-44, 44], y: [8, 56], speed: [1, 3], scale: [1.6, 3], bob: 3, tint: ['#ff9ae8', '#9ab8ff'] });
    const dc = S.mid, Ln = S.lane(dc); S.item(dc, (r) => L.sweeper(S, { model: 'whale', d: dc, lx: 0, y: Ln.y + (r() < 0.5 ? 16 : -16) + 10, mode: 'across', amp: 34, period: 22, phase: r() * 6.28, size: [14, 12, 44], cause: 'whale', sound: { name: 'whale', range: 120 } }));
  } };
  eau.scenes.squelette = { len: [250, 320], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -6, 6), y: U.clamp(T.laneY0(mid), 18, 34), from: (sc.d1 - sc.d0) / 2 - 70, to: (sc.d1 - sc.d0) / 2 + 70 }; },
    build(S) {
      const c = S.mid, Ln = S.lane(c);
      // SIGNATURE : le squelette d'un léviathan — une colonne vertébrale et des côtes en arches successives dont l'intérieur est la trajectoire
      const n = 11;
      S.item(c, (r) => {
        for (let i = 0; i < n; i++) { const dc = c - 75 + i * 15, L2 = S.lane(dc), inner = S.R * 1.6 + 7, top = L2.y + inner + 12;
          S.wall(dc, L2.lx - inner - 7, L2.lx + inner + 7, 0, top, 2.4, 'col:#e8e4d0', undefined, { lx: L2.lx, yc: L2.y, w: 2 * inner, h: 2 * inner - 4 });
          S.bx(dc, L2.lx, 0.5, 3, 1, 3.4, 'col:#d8d4c0', undefined, false); S.gate(dc, L2.lx, L2.y); }
        S.bx(c, Ln.lx, 70, 4, 4, 170, 'col:#e8e4d0', undefined, false);
      });
      S.reserve(c, Ln.lx, 70, 175); S.rings(c - 90, 7, 26, 9);
    } };
  Z.portals.eau = (S, B, lx, y, open) => { for (let k = -2; k <= 2; k++) { const dc = B + k * 30, Lh = S.T.laneX(dc), Y = S.T.laneY(dc); S.gate(dc, Lh, Y); } };

  // ============================================================== USINE
  const CEIL = 76;
  function hall(S) {
    for (let dc = S.d0; dc < S.d1; dc += 20) S.item(dc + 10, (r) => {
      const m = dc + 10, v = S.vol(m);
      for (const s of [-1, 1]) { S.bx(m, s * (v + 4), CEIL / 2, 8, CEIL + 8, 20.4, { side: 'corrugated', top: 'metal' }, '#b8b4a8'); S.bx(m, s * (v - 0.1), 3, 0.3, 6, 20.3, 'hazard', undefined, false); }
      S.bx(m, 0, CEIL + 4, 2 * (v + 8), 8, 20.4, { side: 'metal', top: 'concreteDark' }, '#a8a49c');
    });
    // poutres de toit et grands luminaires (lumière ambre sobre, jamais clignotante)
    S.rows(S.d0 + 10, S.d1, 24, 0, (dc) => S.item(dc, () => { const v = S.vol(dc); S.bx(dc, 0, CEIL - 2, 2 * v, 2, 1.6, 'col:#6a6660', undefined, false); for (const k of [-0.6, -0.2, 0.2, 0.6]) S.bx(dc, k * v, CEIL - 4, 4, 0.6, 2.4, 'basic:#ffe0a8', undefined, false); }));
    S.rows(S.d0 + 10, S.d1, 48, 0, (dc) => S.item(dc, () => { for (const s of [-1, 1]) S.bx(dc, s * (S.vol(dc) - 1), CEIL / 2, 1.6, CEIL, 1.6, 'col:#7a766e'); }));
    // conduites le long des murs
    for (const s of [-1, 1]) for (const y of [30, 48]) S.rows(S.d0, S.d1, 20, 0, (dc) => S.item(dc, () => S.b.cylinder({ p: S.at(dc + 10, s * (S.vol(dc) - 1.6), y), rad: 0.9, h: 20.4, seg: 8, mat: 'col:#7a7e84', r: [90, S.yaw(dc), 0], collide: false })));
  }
  function factoryLife(S) {
    L.motes(S, { n: 60, lx: [-36, 36], y: [4, 64], color: '#ffd8a0', size: 0.5, drift: [0, 0.6, 0], sway: 1.0, opacity: 0.5 });
  }
  const usine = { signature: 'chaine', tight: true, scenes: {}, dress(S) { hall(S); factoryLife(S);
    if (S.sc.first) S.item(S.d0 + 4, () => { const v = S.vol(S.d0 + 4), Ln = S.lane(S.d0 + 4); S.wall(S.d0 + 4, -v - 8, v + 8, 0, CEIL + 8, 4, { side: 'metal', top: 'concreteDark' }, '#b0aca0', { lx: Ln.lx, yc: Ln.y, w: S.R * 2 + 14, h: S.R * 2 + 10 }); });
    if (S.sc.last) S.item(S.d1 - 4, () => { const v = S.vol(S.d1 - 4), Ln = S.lane(S.d1 - 4); S.wall(S.d1 - 4, -v - 8, v + 8, 0, CEIL + 8, 4, { side: 'metal', top: 'concreteDark' }, '#b0aca0', { lx: Ln.lx, yc: Ln.y, w: S.R * 2 + 14, h: S.R * 2 + 10 }); });
  } };
  Z.defs.usine = usine;
  const beltRow = (S, lx, y, dcFrom, dcTo) => { for (let dc = dcFrom; dc < dcTo; dc += 20) S.item(dc + 10, () => { S.bx(dc + 10, lx, y, 4.2, 1.0, 20.4, 'col:#2a2c30'); S.bx(dc + 10, lx, y + 0.56, 3.6, 0.1, 20.4, 'col:#4a4c52', undefined, false); for (const a of [-1, 1]) S.bx(dc + 10, lx + a * 2.2, y - 2.2, 0.4, 4.4, 0.4, 'col:#6a6e74', undefined, false); }); };
  usine.scenes.convoyeurs = { len: [220, 290], build(S) {
    const sr = S.sr, lxs = [-22, 22];
    for (const lx of lxs) { beltRow(S, lx, 4, S.d0, S.d1); L.fleet(S, { model: 'pkg', n: 28, lx: [lx, lx], y: [4.6, 4.6], speed: [9, 9], dir: lx < 0 ? 1 : -1, scale: [1.6, 2.2], tint: ['#d8c8a0', '#c8a878', '#e8d8b8'] }); }
    // bras de pose fixes au-dessus des convoyeurs, portiques
    for (let dc = S.d0 + 30; dc < S.d1 - 20; dc += 46) S.item(dc, () => { for (const lx of lxs) { S.bx(dc, lx, 28, 0.6, 24, 0.6, 'col:#d8a020', undefined, false); S.bx(dc, lx, 40, 7, 1.4, 1.6, 'col:#d8a020', undefined, false); } });
    L.fleet(S, { model: 'van', n: 2, lx: [-8, 8], y: [0.5, 0.5], speed: [8, 10], scale: [1.4, 1.4] });
  } };
  usine.scenes.presses = { len: [230, 300], build(S) {
    const n = Math.max(2, Math.floor(S.len / 62));
    // presses : des pistons géants centrés sur la trajectoire, qui s'abattent à intervalles réguliers (ouverts ~1,6 s sur 4,2) ; la trajectoire passe
    // entre les piliers, le piston est en haut (au-dessus du couloir) puis tombe jusqu'au sol : il faut choisir son moment, ou passer par-dessus
    for (let i = 0; i < n; i++) { const dc = S.d0 + 38 + i * (S.len - 76) / Math.max(1, n - 1), Ln = S.lane(dc), lx = Ln.lx, top = 66;
      S.item(dc, (r) => {
        for (const a of [-1, 1]) S.bx(dc, lx + a * 15, CEIL / 2, 2.4, CEIL, 2.8, 'col:#6a6660');
        S.bx(dc, lx, CEIL - 3, 36, 5, 4, 'col:#6a6660', undefined, false);
        S.bx(dc, lx, 1.3, 26, 2.6, 8, 'col:#3a3a3e'); S.bx(dc, lx, 2.7, 26.2, 0.2, 8.2, 'hazard', undefined, false);
        L.sweeper(S, { parts: [[0, 0, 0, 25, 9, 7, '#8a8680'], [0, -4.6, 0, 25.4, 0.8, 7.4, '#e8c020'], [0, 6, 0, 4, 8, 4, '#5a5650']], d: dc, lx, y: top, mode: 'vertical', amp: top - 4.6, period: 4.2, phase: i * 1.7, size: [25, 9, 7], cause: 'press', sound: { name: 'press', range: 120 }, spin: 0 });
        S.bx(dc, lx + 15, top + 4, 1.4, 1.4, 1.4, 'basic:#ffa830', undefined, false); S.glow(dc, lx + 15, top + 4, '#ffa830', 7);
      });
      S.reserve(dc, lx, 40, 10); S.gate(dc, lx, Math.max(Ln.y, 12)); }
    L.motes(S, { n: 50, lx: [-30, 30], y: [2, 30], color: '#ffffff', size: 1.4, drift: [0, 3, 0], sway: 2, opacity: 0.22 });
  } };
  usine.scenes.fonderie = { len: [230, 300], build(S) {
    const sr = S.sr;
    // fonderie : creusets, coulées, braises ; la lumière est chaude mais tamisée (aucune source clignotante)
    for (let i = 0; i < 4; i++) { const dc = S.d0 + 30 + i * (S.len - 60) / 3, s = i % 2 ? 1 : -1, lx = s * (S.vol(dc) - 14);
      S.place(dc, lx, 20, 20, 0, 50, (r) => { S.cyl(dc, lx, 0, 8, 12, 'col:#3a3632', undefined, 14, 6.5); S.cyl(dc, lx, 12, 6.6, 0.5, 'basic:#ff7a20', undefined, 14, 6.6, false); S.b.cylinder({ p: S.at(dc, lx - s * 8, 28), rad: 0.9, h: 30, seg: 6, mat: 'basic:#ffa040', collide: false });
        S.bx(dc, lx, 32, 18, 1.2, 1.2, 'col:#6a6660', undefined, false); S.bx(dc, lx - s * 9, 18, 1.2, 36, 1.2, 'col:#6a6660', undefined, false); }); }
    L.motes(S, { n: 90, lx: [-34, 34], y: [2, 50], color: '#ff9a40', size: 0.7, drift: [0, 5, 0], sway: 1.6, additive: true, opacity: 0.75, twinkle: true });
    L.fleet(S, { model: 'container', n: 2, lx: [-10, 10], y: [44, 52], speed: [3, 5], mode: 'across', scale: [1, 1] });
    S.rows(S.d0 + 8, S.d1, 30, 0.4, (dc) => S.item(dc, (r) => { S.bx(dc, r.between([-1, 1]) * (S.vol(dc) - 4), 0.3, 6, 0.4, 6, 'basic:#ff6a1a', undefined, false); }));
  } };
  usine.scenes.cuves = { len: [220, 290], build(S) {
    const sr = S.sr;
    for (let i = 0; i < 9; i++) { const dc = S.d0 + 18 + sr() * (S.len - 36), lx = sr.between([-1, 1]) * (S.vol(dc) - 8), rad = sr.between([6, 10]), h = sr.between([30, 60]);
      S.place(dc, lx, rad * 2, rad * 2, 0, h + 4, (r) => { S.cyl(dc, lx, 0, rad, h, 'metal', r.pick(['#c8ccd0', '#b8c4c8', '#d0c8b8']), 16, rad); S.cyl(dc, lx, h, rad * 1.02, 2, 'col:#7a7e84', undefined, 16, rad * 0.4, false); for (let y = 6; y < h; y += 12) S.cyl(dc, lx, y, rad * 1.04, 0.6, 'col:#5a5e64', undefined, 16, rad * 1.04, false); }); }
    // passerelles au-dessus et en dessous de la trajectoire, tuyaux en travers (au-dessus du couloir libre)
    for (let i = 0; i < 3; i++) { const dc = S.d0 + 40 + i * (S.len - 80) / 2, Ln = S.lane(dc), y = Ln.y + (i % 2 ? 1 : -1) * (S.R + 6); S.item(dc, () => { S.bx(dc, 0, y, 2 * S.vol(dc), 0.8, 4, 'metal', '#8a8c88', false); for (let k = -5; k <= 5; k++) S.bx(dc, k * S.vol(dc) / 5, y + 1, 0.12, 2, 0.12, 'col:#5a5e64', undefined, false); }); }
  } };
  usine.scenes.bras = { len: [230, 300], build(S) {
    const n = Math.floor(S.len / 44);
    // série de grands bras articulés : chacun tourne dans le plan vertical, son extrémité balaie la trajectoire ; rythme régulier
    for (let i = 0; i < n; i++) { const dc = S.d0 + 34 + i * (S.len - 68) / Math.max(1, n - 1), Ln = S.lane(dc), s = i % 2 ? 1 : -1, lx = s * (S.vol(dc) - 6), yc = Math.max(28, Ln.y);
      S.item(dc, (r) => {
        S.bx(dc, lx, yc / 2, 4, yc, 4, 'col:#d8a020'); S.ball(dc, lx, yc, 3.4, 'col:#c89018');
        S.bx(dc, lx - s * 10, yc, 20, 2.2, 2.2, 'col:#d8a020', undefined, false, { r: [0, S.yaw(dc), 0] });
        L.sweeper(S, { parts: [[0, 0, 0, 5, 5, 5, '#3a3c40'], [0, 0, 0, 2, 2, 6, '#e8c020']], d: dc, lx: lx - s * 20, y: yc, mode: 'orbit', amp: 13, period: 6.5, phase: i * 1.3, size: [5, 5, 5], cause: 'arm', spin: 0, sound: null });
      }); }
    L.fleet(S, { model: 'pkg', n: 12, lx: [-34, 34], y: [1, 1], speed: [6, 8], scale: [1.4, 2], tint: ['#d8c8a0', '#c8a878'] });
  } };
  usine.scenes.chaine = { len: [260, 320], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -5, 5), y: 24, from: (sc.d1 - sc.d0) / 2 - 75, to: (sc.d1 - sc.d0) / 2 + 75 }; },
    build(S) {
      const c = S.mid, Ln = S.lane(c);
      // SIGNATURE : la chaîne — un monorail porte de gigantesques carrosseries à travers une cage de soudure ; étincelles, bras à l'œuvre, rythme des cadres
      const n = 7;
      S.item(c, (r) => { for (let i = 0; i < n; i++) { const dc = c - 72 + i * 24, L2 = S.lane(dc), inner = S.R * 1.6 + 8, top = L2.y + inner + 10;
        S.wall(dc, L2.lx - inner - 8, L2.lx + inner + 8, 0, top, 3, 'metal', '#8a8c88', { lx: L2.lx, yc: L2.y, w: 2 * inner, h: 2 * inner - 6 });
        S.bx(dc, L2.lx, top + 1, 2 * inner + 18, 1.2, 3.4, 'hazard', undefined, false); S.gate(dc, L2.lx, L2.y);
        for (const a of [-1, 1]) S.bx(dc, L2.lx + a * (inner - 0.6), L2.y + 2, 0.5, 6, 0.5, 'basic:#dff4ff', undefined, false); } });
      S.reserve(c, Ln.lx, 70, 175); S.rings(c - 90, 7, 26, 9);
      L.fleet(S, { model: 'carBody', n: 4, lx: [Ln.lx - 0, Ln.lx + 0], y: [58, 58], speed: [6, 6], dir: 1, scale: [2, 2] });
      L.motes(S, { n: 80, lx: [Ln.lx - 12, Ln.lx + 12], y: [6, 40], color: '#9ad8ff', size: 0.6, drift: [0, -2, 0], sway: 2, additive: true, opacity: 0.9, twinkle: true });
    } };
})();

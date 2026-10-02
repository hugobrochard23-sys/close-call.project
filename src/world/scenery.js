/* v034b : DECOR du mode CLASSIQUE — de vrais quartiers au lieu d'un simple mur de chaque côté.
 * Chaque côté du couloir est une suite de SEGMENTS de 30 à 70 m, tirés au sort selon le décor du moment :
 *   block  immeubles collés au couloir (hauteurs, retraits, auvents, enseignes, toits équipés, tours derrière)
 *   low    maisons et boutiques basses, avec des trous entre elles ; on vole par-dessus, l'horizon est dégagé derrière
 *   park   parc : arbres feuillus, buissons, bancs, lampadaires, colline derrière
 *   open   zone DEGAGEE : plus de mur, une colline lointaine (le joueur peut s'écarter de 30 m)
 *   yard   cour industrielle : conteneurs empilés, silos, hangar derrière
 *   forest forêt de conifères enneigée
 *   cliff  falaise en gradins avec blocs de roche
 * Les bords de chaque zone sont franchis SOUS un pont (route en surplomb, ou arche de roche) et le relief monte ou descend
 * (Track.base) : on change de zone sans qu'aucun nom ne s'affiche.
 * Tout ce qui se touche est collidable ; les silhouettes lointaines et les détails ne le sont pas. Réutilise les objets du
 * générateur de missions (CC.Gen.Kit.builders : bâtiments à fenêtres, arbres feuillus, conteneurs, lampadaires…). */
(function () {
  const V = THREE.Vector3, U = CC.U, G = CC.Gen, DEG = 180 / Math.PI;
  const S = CC.Scenery = {};

  // poids des segments par décor
  const PROFILE = {
    city:     { block: 5, low: 2.2, park: 2, open: 0.7 },
    night:    { block: 6, low: 1.3, park: 1, open: 0.5 },
    desert:   { low: 3, open: 4, cliff: 1.3 },
    snow:     { forest: 4, open: 3, cliff: 1.6, low: 1.2 },
    forest:   { open: 9, forest: 0.5, cliff: 0.15 },
    industry: { block: 2.4, yard: 4, open: 1, low: 1 },
    canyon:   { cliff: 6, open: 1.3 },
  };
  const LOWMAT = {
    city: [{ side: 'brick', top: 'concreteDark' }, { side: 'concreteWarm', top: 'concreteDark' }, { side: 'concrete', top: 'concreteDark' }],
    night: [{ side: 'concrete', top: 'concreteDark' }, { side: 'brick', top: 'concreteDark' }],
    desert: [{ side: 'sand', top: 'sand' }],
    snow: [{ side: 'planks', top: 'roofBrown' }],
    industry: [{ side: 'corrugated', top: 'metal' }, { side: 'metal', top: 'concreteDark' }],
    canyon: [{ side: 'sand', top: 'sand' }],
  };
  const PASTEL = ['#ffffff', '#f2d6c4', '#d8e4f0', '#e8e0b8', '#d8c8e0', '#c8e0d0', '#f0c8c8'];

  S.kitCtx = (r, env, zone) => ({ r, dark: !!(env && env.dark > 0.4) || zone === 'night', snow: zone === 'snow', biome: { id: zone === 'desert' || zone === 'canyon' ? 'desert' : zone }, proto: {}, env });

  /* Un côté du couloir, de d0 à d1. wallMat(r) : matériau d'immeuble du décor (ZONES[].wall). */
  S.side = function (b, T, r, d0, d1, side, ZONES, game) {
    const world = b.world;
    let d = d0;
    while (d < d1 - 0.01) {
      const zone = T.zoneId(Math.max(0, d + 10)), Z = ZONES[zone], prof = PROFILE[zone];
      const turning = Math.abs(T.theta(d + 40) - T.theta(d)) > 0.03 || Math.abs(T.theta(d + 10) - T.theta(d)) > 0.008, len = Math.min(d1 - d, turning ? r.between([9, 14]) : r.between([30, 70])), e = d + len;
      const kind = r.weighted(prof);
      const pa = T.at(d, side * T.vol(d), 0), pb = T.at(e, side * T.vol(e), 0), ax = pa[0], az = pa[2], bx = pb[0], bz = pb[2];
      const dx = bx - ax, dz = bz - az, cl = Math.hypot(dx, dz), psi = Math.atan2(dx, dz);
      let ox = Math.cos(psi), oz = -Math.sin(psi); if (ox * side < 0) { ox = -ox; oz = -oz; }
      const base = T.base((d + e) / 2), zi = T.zoneIndex(Math.max(0, d + 10)), env = T.env(zi), dark = !!(env && env.dark > 0.4) || zone === 'night';
      const kc = S.kitCtx(r, env, zone);
      // point du segment : u ∈ [0,1] le long de la corde, o = distance vers l'extérieur
      const P = (u, o, y) => [ax + dx * u + ox * o, (y || 0) + base, az + dz * u + oz * o];
      const box = (u, o, w, h, dd, mat, tint, collide, yOff) => b.box({ p: [ax + dx * u + ox * (o + w / 2), base + (yOff || 0) + h / 2 - 0.5, az + dz * u + oz * (o + w / 2)], s: [w, h, dd], r: [0, psi * DEG, 0], mat, tint, collide: collide !== false });
      const wall = (o, depth, h, mat, tint, u0, u1, collide) => { u0 = u0 || 0; u1 = u1 === undefined ? 1 : u1; return box((u0 + u1) / 2, o, depth, h, cl * (u1 - u0) + 0.5, mat, tint, collide); };
      // bordure de trottoir et silhouette lointaine : sur tous les segments
      if (zone === 'city' || zone === 'night' || zone === 'industry') wall(-0.2, 3.6, 0.35, zone === 'industry' ? 'concreteDark' : 'concrete', undefined, 0, 1, false);
      const fogc = new THREE.Color(env.fog.color).multiplyScalar(0.88);
      const far = (n, hMin, hMax, o0, o1, wMin, wMax) => {
        for (let i = 0; i < n; i++) { const u = r(), w = r.between([wMin, wMax]), h = r.between([hMin, hMax]); box(u, r.between([o0, o1]), w, h, r.between([wMin, wMax]), 'basic:#' + fogc.clone().multiplyScalar(r.between([0.85, 1.05])).getHexString(), undefined, false); }
      };

      if (kind === 'block') {
        const nb = Math.max(1, Math.round(len / r.between([20, 34])));
        for (let i = 0; i < nb; i++) {
          const u0 = i / nb, u1 = (i + 1) / nb, wl = Z.wall(r), set = r.between([0, 2.6]);
          const h = zone === 'night' ? r.between([36, 100]) : zone === 'industry' ? r.between([14, 34]) : r.between([24, 74]);
          wall(set, r.between([16, 24]), h, wl.mat, wl.tint, u0, u1);
          if (zone === 'city' && r() < 0.6) box((u0 + u1) / 2, set - 1.6, 1.8, 0.28, cl / nb * 0.8, 'col:#' + r.pick(['b8382c', '2a5a8a', '3a7a4a', 'c89a20']), undefined, false, 4.4);      // auvent
          if (zone === 'night' && r() < 0.8) box((u0 + u1) / 2, set - 0.2, 0.25, 2.2, cl / nb * 0.5, 'emis:#' + r.pick(['ff3bd0', '39d4ff', 'ffb020', '56ff5a']), undefined, false, 6);      // enseigne néon
          if (r() < 0.22) box((u0 + u1) / 2, set + 1, 0.4, 4.5, cl / nb * 0.45, 'col:#' + r.pick(['2a6a9a', 'c84a2a', '3a8a5a']), undefined, false, h + 1.5);   // panneau sur le toit
        }
        // tours plus hautes derrière (profondeur de la ville)
        for (let i = 0; i < 2; i++) { const wl = Z.wall(r); box(r(), r.between([26, 44]), r.between([14, 22]), r.between([70, 150]), r.between([14, 22]), wl.mat, wl.tint, false); }
        far(3, 60, 170, 70, 160, 18, 40);
      } else if (kind === 'low') {
        wall(r.between([24, 32]), 18, r.between([30, 60]), Z.wall(r).mat, Z.wall(r).tint, 0, 1);            // fond : bloc plus haut, loin derrière
        let u = r.between([0.02, 0.1]);
        while (u < 0.94) {
          const fr = r.between([10, 22]) / cl, w = r.between([8, 14]), h = r.between([6, 15]), set = r.between([0, 4]);
          if (u + fr > 0.97) break;
          const lm = LOWMAT[zone] || LOWMAT.city, mat = lm[Math.floor(r() * lm.length)], uc = u + fr / 2, c = P(uc, set + w / 2);
          const gable = zone === 'snow' || (zone === 'city' && r() < 0.4) || (zone === 'desert' && r() < 0.1), saw = zone === 'industry' && r() < 0.6;
          const it = { t: 'bld', x: c[0], z: c[2], y0: base, yaw: psi, w, d: fr * cl, h, mat, tint: r.pick(PASTEL), roof: gable ? 'gable' : saw ? 'saw' : 'flat' };
          const kb = G.Kit.builders.bld; if (kb) kb(b, it, kc);
          b.box({ p: [c[0], base + h / 2 - 0.5, c[2]], s: [w, h + (gable ? w * 0.3 : 0), fr * cl], r: [0, psi * DEG, 0], render: false });
          u += fr + r.between([4, 11]) / cl;
          if (r() < 0.5) { const gp = P(u - 3 / cl, set + 3); tree(b, r, kc, gp, base, zone, false); }
        }
        far(2, 20, 70, 40, 120, 14, 34);
      } else if (kind === 'park') {
        wall(r.between([14, 20]), 14, r.between([7, 12]), zone === 'night' ? 'concreteDark' : 'grass', zone === 'night' ? '#6a7a6a' : undefined, 0, 1);   // colline derrière
        box(0.5, 1, 6, 0.1, cl, 'dirt', '#d8d0c0', false);                                                                  // allée
        const n = Math.round(len / 7);
        for (let i = 0; i < n; i++) { const c = P(r.between([0.03, 0.97]), r.between([3.5, 13])); tree(b, r, kc, c, base, zone, true); }
        for (let i = 0; i < Math.round(len / 18); i++) { const c = P(r(), r.between([2, 4])); const it = { t: r.pick(['bench', 'bush', 'lamp']), x: c[0], z: c[2], y0: base, yaw: psi, s: r.between([0.9, 1.5]), night: dark }; const kb = G.Kit.builders[it.t]; if (kb) kb(b, it, kc); }
        far(3, 40, 130, 50, 130, 16, 34);
      } else if (kind === 'open') {
        wall(r.between([26, 36]), 16, zone === 'forest' ? r.between([1.5, 4]) : r.between([7, 14]), zone === 'desert' || zone === 'canyon' ? 'sand' : zone === 'snow' ? 'white' : zone === 'industry' ? 'concreteDark' : 'grass', zone === 'desert' ? '#e6cc9a' : undefined, 0, 1);
        for (let i = 0; i < Math.round(len / (zone === 'forest' ? 40 : 12)); i++) {   // v074 : forêt = quelques arbres isolés
          const c = P(r.between([0.03, 0.97]), r.between([3, 24]));
          if (zone === 'desert' || zone === 'canyon') b.rockLump(c[0], base, c[2], r.between([2, 5.5]), 'col:#b89468');
          else if (zone === 'snow') tree(b, r, kc, c, base, zone, false);
          else if (r() < 0.6) tree(b, r, kc, c, base, zone, true); else b.rockLump(c[0], base, c[2], r.between([1.6, 4]), 'col:#6a7078');
        }
        far(4, 12, zone === 'desert' || zone === 'canyon' ? 70 : 50, 50, 170, 40, 110);
      } else if (kind === 'yard') {
        wall(r.between([18, 24]), 16, r.between([12, 20]), 'corrugated', '#b8b8b0', 0, 1);
        for (let i = 0; i < Math.round(len / 13); i++) {
          const c = P(r.between([0.05, 0.95]), r.between([2.5, 12])), n = Math.ceil(r() * 3), col = r.pick(['#b8382c', '#2a5a8a', '#c89a20', '#3a7a4a', '#8a8a90']);
          if (r() < 0.65) {
            const it = { t: 'container', x: c[0], z: c[2], y0: base, yaw: psi + (r() < 0.5 ? 0 : Math.PI / 2), n, col }; const kb = G.Kit.builders.container; if (kb) kb(b, it, kc);
            b.box({ p: [c[0], base + n * 1.3 - 0.5, c[2]], s: [6.3, n * 2.6, 6.3], r: [0, psi * DEG, 0], render: false });
          } else {
            const h = r.between([10, 20]);
            b.cylinder({ p: [c[0], base + h / 2 - 0.5, c[2]], rad: 3.2, h, seg: 12, mat: 'metal', tint: '#d8dce0', colSize: [6.4, h, 6.4] });
            b.cylinder({ p: [c[0], base + h - 0.3, c[2]], rTop: 0.2, rBot: 3.3, h: 1.6, seg: 12, mat: 'col:#7a7e84', collide: false });
          }
        }
        far(3, 25, 80, 40, 110, 20, 50);
      } else if (kind === 'forest') {
        wall(r.between([14, 22]), 16, r.between([12, 22]), zone === 'snow' ? 'white' : 'grass', zone === 'snow' ? '#eef4ff' : r.pick(['#6a8a5a', '#5a7a4a', '#7a9a68']), 0, 1);
        for (let i = 0; i < Math.round(len / 3.5); i++) { const c = P(r.between([0.02, 0.98]), r.between([1, 15])); tree(b, r, kc, c, base, zone, zone === 'forest' && r() < 0.6); }
        for (let i = 0; i < 3; i++) { const c = P(r(), r.between([3, 12])); b.rockLump(c[0], base, c[2], r.between([1.8, 4]), 'col:#9aa2ae'); }
        far(4, 30, 110, 50, 150, 30, 80);
      } else {   // cliff
        wall(r.between([0, 2.5]), 22, r.between([34, 64]), zone === 'snow' ? { side: 'rock', top: 'white' } : { side: 'rock', top: zone === 'desert' ? 'sand' : 'dirt' }, zone === 'snow' ? '#c8d0dc' : zone === 'desert' ? '#e0b87a' : r.pick(['#e89a6a', '#dc8a5a', '#f0a878']), 0, 1);
        for (let i = 0; i < 3; i++) { const u = r.between([0.1, 0.9]); box(u, r.between([-0.5, 0.6]), r.between([5, 9]), r.between([9, 20]), r.between([8, 16]), 'rock', zone === 'snow' ? '#dce2ea' : zone === 'desert' ? '#f0d098' : '#f0a878', true); }   // gradins
        for (let i = 0; i < Math.round(len / 14); i++) { const c = P(r(), r.between([0.5, 4])); b.rockLump(c[0], base, c[2], r.between([1.6, 3.6]), 'col:#8a6a50'); }
        far(3, 50, 140, 40, 100, 30, 70);
      }
      d = e;
    }
  };

  // un arbre : feuillu (parcs, villes, collines) ou conifère (neige, forêts) ; le tronc est collidable
  function tree(b, r, kc, c, base, zone, broad) {
    const conifer = zone === 'snow' || (!broad && zone !== 'desert' && zone !== 'canyon');
    const h = r.between(conifer ? [12, 26] : [8, 15]), rad = r.between([0.45, 0.8]);
    if (zone === 'desert' || zone === 'canyon') { b.rockLump(c[0], base, c[2], r.between([1.5, 3]), 'col:#b89468'); return; }
    const kb = G.Kit.builders.tree;
    if (kb) kb(b, { t: 'tree', x: c[0], z: c[2], y0: base, h, rad, broad: !conifer }, kc);
  }

  /* Pont de passage d'une zone à l'autre (en d = B) : tablier en surplomb à ~26 m (on passe dessous à l'altitude de croisière,
   * ou dessus), deux piles de chaque côté, garde-corps. Canyon et désert : arche de roche. */
  S.bridge = function (b, T, r, B, zoneFrom, gates) {
    const half = T.half(B), W = 2 * half + 70, y = 26, th = 3.2, len = 16, yaw = T.yawAcross(B);
    const rock = zoneFrom === 'canyon' || zoneFrom === 'desert';
    const at = (lx, yy) => T.at(B, lx, yy);
    const deckMat = rock ? { side: 'rock', top: zoneFrom === 'desert' ? 'sand' : 'dirt' } : { side: 'concreteDark', top: 'asphalt', bottom: 'concreteDark' };
    b.box({ p: at(0, y + th / 2), s: [W, th, len], r: [0, yaw, 0], mat: deckMat, tint: rock ? (zoneFrom === 'desert' ? '#e0b87a' : '#c07858') : undefined });
    for (const sg of [-1, 1]) {
      b.box({ p: at(sg * (half + 6), (y - 1) / 2 - 0.5), s: [7, y + 1, len - 2], r: [0, yaw, 0], mat: rock ? 'rock' : { side: 'concreteDark', top: 'concrete' }, tint: rock ? '#b07a54' : undefined });
      if (!rock) for (const z of [-len / 2 + 0.3, len / 2 - 0.3]) b.box({ p: T.at(B + z, 0, y + th + 0.55), s: [W, 1.1, 0.25], r: [0, yaw, 0], mat: 'concrete', collide: false });
    }
    if (!rock) for (let i = -3; i <= 3; i++) b.box({ p: at(i * 12, y + th + 0.03), s: [0.3, 0.05, len * 0.7], r: [0, yaw, 0], mat: 'col:#e8e2c8', collide: false, shadow: false });
    gates.push({ d: B - 45, lx: 0, y: 12 }, { d: B - 20, lx: 0, y: 12 }, { d: B, lx: 0, y: 12 }, { d: B + 22, lx: 0, y: 12 });
  };

  S.groundSlices = function (b, T, d0, d1, Zg, cfg) {
    const flat = Math.abs(T.base(d0) - T.base(d1)) < 0.05 && Math.abs(T.base((d0 + d1) / 2) - T.base(d0)) < 0.05;
    if (flat && Math.abs(T.theta(d1) - T.theta(d0)) < 0.004) { const mid = (d0 + d1) / 2, p = T.at(mid, 0, 0); p[1] = T.base(mid) - 1; b.box({ p, s: [300, 2, cfg.chunkLen + 2], r: [0, T.yawAcross(mid), 0], mat: Zg.ground, tint: Zg.groundTint, ground: true }); return; }
    const step = Math.abs(T.theta(d1) - T.theta(d0)) > 0.004 ? 5 : 20;
    for (let d = d0; d < d1 - 0.01; d += step) {
      const e = Math.min(d1, d + step), m = (d + e) / 2, pitch = Math.atan2(T.base(e) - T.base(d), e - d) * DEG, p = T.at(m, 0, 0);
      p[1] = T.base(m) - 1;
      b.box({ p, s: [300, 2, (e - d) + 1.6 + 60 * Math.abs(T.theta(e) - T.theta(d))], r: [pitch, T.yawAcross(m), 0], mat: Zg.ground, tint: Zg.groundTint, ground: true });
    }
  };
})();

/* v081 : ENGINS DE BOSS — uniquement du matériel militaire réaliste, au même niveau de détail que le char (chenilles à galets, tourelles à pans,
 * trappes, épiscopes, antennes, fumigènes…), fusionné par matériau (CC.Models.bake). Avant = −Z.
 *   Terrestres / navals « comme le char » (userData.tankLike) : turret / gun / slide / muzzle / body → la même IA de tourelle que le char.
 *     ifv (véhicule de combat d'infanterie) · spg (obusier automoteur) · mlrs (lance-roquettes 8×8) · aagun (canon antiaérien à radars) · destroyer · train (train blindé)
 *   Volants (userData.gen, flying) : gunship (hélicoptère de transport lourd armé) · jet (chasseur bimoteur) · bomber (aile volante furtive) · sub (sous-marin, 3 types)
 * Chaque constructeur prend (teinte 0‥5, variante) ; la teinte change la livrée (vert, sable, gris, neige, bleu nuit, olive). */
(function () {
  const M0 = CC.Models, { lam, basic, box, cyl, cylX, cylZ, profileX, plateY } = M0.kit, bake = M0.bake;
  const V = THREE.Vector3;
  const phong = (c, sp, sh) => new THREE.MeshPhongMaterial({ color: c, specular: sp || '#9ab8d8', shininess: sh || 60 });
  const blur = (c, op, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; return m; };
  // contour [x, z] symétrique (le côté gauche est le miroir du droit, ordre inversé pour garder les faces vers l'extérieur)
  const mir = (pts, sx) => (sx > 0 ? pts : pts.map((p) => [-p[0], p[1]]).reverse());
  // livrées : coque, sombre, claire, camouflage, accent (marquages)
  const LIV = [
    { hull: '#3d4c36', dark: '#2b3727', light: '#56654b', camo: '#2a3322', acc: '#d8a020' },   // vert OTAN
    { hull: '#8a7a58', dark: '#62563c', light: '#a8996f', camo: '#5a4c32', acc: '#b03a2a' },   // sable
    { hull: '#5d6269', dark: '#3f434a', light: '#7a8088', camo: '#2f3338', acc: '#e0e0e0' },   // gris
    { hull: '#b8bec6', dark: '#8a9098', light: '#d8dde2', camo: '#98a0aa', acc: '#c03a2a' },   // arctique
    { hull: '#33414f', dark: '#222c37', light: '#4a5b6c', camo: '#18212a', acc: '#e07a20' },   // bleu nuit
    { hull: '#4a4a38', dark: '#34342a', light: '#66664c', camo: '#2c2c20', acc: '#d0d0d0' },   // olive terne
  ];
  const liv = (t) => LIV[(((t || 0) % LIV.length) + LIV.length) % LIV.length];
  const mats = (P) => ({ hull: lam(P.hull), dark: lam(P.dark), light: lam(P.light), camo: lam(P.camo), acc: lam(P.acc), accB: basic(P.acc), metal: lam('#2d2f2c'), black: lam('#141416'), glass: phong('#1c2c3e'), track: lam('#1c1d1b'), wheel: lam('#31342f'), hub: lam('#1f211e') });
  const M = {};

  // ---- châssis chenillé commun (ifv, spg, aagun) : chenilles profilées, galets, barbotin, poulie, rouleaux, garde-boue, jupes
  function tracked(body, m, L, gx, nWheels) {
    const tp = [[L - 0.3, 0.02], [-L + 0.55, 0.02], [-L - 0.05, 0.44], [-L + 0.1, 0.8], [L - 0.2, 0.86], [L + 0.15, 0.5]];
    for (const sx of [-1, 1]) {
      const t = profileX(tp, 0.62, m.track, 0.05, body); t.position.x = sx * gx;
      const step = (2 * L - 1.7) / (nWheels - 1);
      for (let i = 0; i < nWheels; i++) {
        const z = -L + 0.85 + i * step;
        cylX(0.3, 0.3, 0.16, m.wheel, 12, sx * (gx + 0.36), 0.34, z, body); cylX(0.12, 0.12, 0.18, m.hub, 8, sx * (gx + 0.4), 0.34, z, body);
        for (let k = 0; k < 5; k++) { const a = k * 1.2566; box(0.04, 0.05, 0.05, m.metal, sx * (gx + 0.46), 0.34 + Math.sin(a) * 0.2, z + Math.cos(a) * 0.2, body); }
      }
      cylX(0.3, 0.3, 0.18, m.metal, 9, sx * (gx + 0.36), 0.54, L - 0.03, body);
      cylX(0.26, 0.26, 0.16, m.wheel, 12, sx * (gx + 0.36), 0.5, -L + 0.03, body);
      for (let i = 0; i < 3; i++) cylX(0.08, 0.08, 0.12, m.hub, 6, sx * (gx + 0.34), 0.78, -L * 0.45 + i * L * 0.45, body);
      box(0.72, 0.07, 2 * L + 0.8, m.dark, sx * gx, 0.93, 0, body);
      box(0.05, 0.3, 2 * L - 0.9, m.hull, sx * (gx + 0.4), 0.77, 0, body);
      for (let i = 0; i < 4; i++) box(0.06, 0.26, 0.04, m.dark, sx * (gx + 0.43), 0.77, -L * 0.6 + i * L * 0.4, body);
      const hl = box(0.2, 0.14, 0.12, basic('#fff2c8'), sx * (gx - 0.15), 1.06, -L - 0.1, body); hl.castShadow = false; box(0.28, 0.2, 0.08, m.metal, sx * (gx - 0.15), 1.06, -L - 0.04, body);
      box(0.25, 0.14, 0.3, m.metal, sx * (gx - 0.65), 0.88, L + 0.2, body);
    }
  }
  const finishTL = (g, body, turret, gunPivot, slide, muzzle, size, center, exhausts, extra) => {
    g.userData.turret = turret; g.userData.gun = gunPivot; g.userData.slide = slide; g.userData.muzzle = muzzle; g.userData.body = body; g.userData.tankLike = true;
    g.userData.exhausts = exhausts; g.userData.size = size; g.userData.center = center; Object.assign(g.userData, extra || {});
    return bake(g, [body, turret, gunPivot, slide].concat((extra && extra.keep) || []));
  };
  const smokeTubes = (turret, m, x, y, z, n, sx) => { for (let i = 0; i < n; i++) { const tb = cyl(0.055, 0.055, 0.26, m.metal, 6, turret); tb.position.set(sx * (x + i * 0.02), y + i * 0.09, z); tb.rotation.set(-0.9, 0, -sx * 0.5); } };
  const periscopes = (turret, cx, cy, cz, r, n) => { for (let i = 0; i < n; i++) { const a = -1.4 + i * (2.8 / (n - 1)); box(0.1, 0.07, 0.04, basic('#1a2630'), cx + Math.sin(a) * r, cy, cz - Math.cos(a) * r, turret).rotation.y = a; } };

  // ================================================================= VEHICULE DE COMBAT D'INFANTERIE
  M.ifv = (tint) => {
    const P = liv(tint), m = mats(P), g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    tracked(body, m, 2.7, 1.4, 6);
    box(2.45, 0.7, 5.3, m.dark, 0, 0.62, 0, body);
    box(2.7, 0.55, 4.5, m.hull, 0, 1.2, 0.3, body);
    const gl = box(2.7, 0.14, 1.7, m.hull, 0, 0.98, -2.05, body); gl.rotation.x = -0.45;
    box(2.4, 0.5, 0.14, m.dark, 0, 0.6, -2.72, body);
    for (let i = 0; i < 3; i++) box(2.2, 0.06, 0.12, m.metal, 0, 0.42 + i * 0.08, -2.75, body).rotation.x = 0.2;
    box(0.9, 0.12, 0.85, m.dark, -0.7, 1.5, -1.5, body); cyl(0.32, 0.34, 0.1, m.hull, 12, body).position.set(-0.7, 1.55, -1.5);
    const hatchD = cyl(0.3, 0.3, 0.05, m.dark, 12, body); hatchD.position.set(-0.7, 1.64, -1.3); hatchD.rotation.x = -1.1;
    for (let i = 0; i < 3; i++) box(0.22, 0.06, 0.1, basic('#1a2630'), -0.95 + i * 0.22, 1.53, -1.95, body);
    for (let i = 0; i < 5; i++) box(1.5, 0.04, 0.09, m.metal, 0.5, 1.5, 1.2 + i * 0.22, body);
    box(2.4, 0.5, 0.14, m.dark, 0, 1.15, 2.55, body); box(1.1, 0.7, 0.1, m.hull, 0, 1.15, 2.64, body);
    box(0.5, 0.12, 0.2, m.metal, -0.7, 0.7, -2.8, body); box(0.5, 0.12, 0.2, m.metal, 0.7, 0.7, -2.8, body);
    for (const sx of [-1, 1]) { box(0.5, 0.32, 1.0, m.light, sx * 1.52, 1.2, 1.1, body); box(0.3, 0.46, 0.2, m.dark, sx * 1.62, 1.22, 1.9, body); box(0.04, 0.5, 0.7, m.camo, sx * 1.37, 1.2, -0.4, body); }
    box(2.1, 0.02, 1.4, m.camo, 0, 1.49, 0.7, body);
    const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 1.47, 0.2); body.add(turret);
    cyl(1.0, 1.04, 0.12, m.metal, 16, turret).position.y = 0.06;
    plateY([[-0.5, -1.2], [0.5, -1.2], [1.05, -0.5], [1.05, 0.85], [0.75, 1.15], [-0.75, 1.15], [-1.05, 0.85], [-1.05, -0.5]], 0.6, m.hull, 0.07, turret).position.y = 0.1;
    box(1.8, 0.02, 1.2, m.camo, 0.1, 0.72, 0.2, turret); box(0.02, 0.35, 1.0, m.camo, 1.06, 0.42, 0.2, turret);
    box(0.4, 0.5, 1.1, m.dark, -0.95, 0.42, -0.15, turret);
    for (const sy of [0.08, -0.12]) cylZ(0.11, 0.11, 0.9, m.dark, 10, -0.95, 0.5 + sy, -0.95, turret);
    const cup = cyl(0.3, 0.33, 0.24, m.hull, 12, turret); cup.position.set(0.5, 0.82, 0.35); periscopes(turret, 0.5, 0.88, 0.35, 0.33, 6);
    const hc = cyl(0.29, 0.29, 0.05, m.dark, 12, turret); hc.position.set(0.5, 0.99, 0.55); hc.rotation.x = -1.2;
    box(0.4, 0.05, 0.4, m.dark, -0.4, 0.74, 0.4, turret); box(0.06, 0.24, 0.06, m.metal, 0.5, 1.07, 0.15, turret); cylZ(0.035, 0.035, 0.8, m.metal, 6, 0.5, 1.17, -0.15, turret);
    smokeTubes(turret, m, 1.1, 0.52, -0.5, 4, 1); smokeTubes(turret, m, 1.1, 0.52, -0.5, 4, -1);
    const ant = cyl(0.014, 0.02, 2.6, m.metal, 4, turret); ant.position.set(-0.7, 1.7, 1.0); ant.rotation.x = 0.1; box(0.1, 0.08, 0.1, m.metal, -0.7, 0.75, 1.0, turret);
    box(0.7, 0.28, 0.35, lam('#5a5440'), -0.35, 0.44, 1.2, turret); box(0.55, 0.24, 0.3, lam('#4a4a3a'), 0.4, 0.42, 1.2, turret);
    const gunPivot = new THREE.Group(); gunPivot.position.set(0, 0.42, -1.2); turret.add(gunPivot); const slide = new THREE.Group(); gunPivot.add(slide);
    cylZ(0.15, 0.17, 0.5, m.dark, 10, 0, 0, -0.1, slide); cylZ(0.06, 0.06, 2.5, m.metal, 8, 0, 0, -1.5, slide); cylZ(0.1, 0.1, 1.3, m.hull, 10, 0, 0, -1.0, slide);
    for (let i = 0; i < 4; i++) cylZ(0.105, 0.105, 0.03, m.black, 8, 0, 0, -0.6 - i * 0.25, slide); cylZ(0.085, 0.085, 0.26, m.dark, 8, 0, 0, -2.7, slide);
    cylZ(0.04, 0.04, 1.0, m.metal, 6, 0.2, -0.1, -0.8, slide);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -2.85); slide.add(muzzle);
    return finishTL(g, body, turret, gunPivot, slide, muzzle, [3.5, 2.8, 6.6], [0, 1.3, 0], [new V(-0.65, 0.88, 2.9), new V(0.65, 0.88, 2.9)], { elev: [-0.1, 0.9] });
  };

  // ================================================================= OBUSIER AUTOMOTEUR
  M.spg = (tint) => {
    const P = liv(tint), m = mats(P), g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    tracked(body, m, 3.3, 1.5, 7);
    box(2.6, 0.7, 6.2, m.dark, 0, 0.62, 0, body);
    box(2.85, 0.5, 2.6, m.hull, 0, 1.15, -1.7, body);
    const gl = box(2.85, 0.14, 1.5, m.hull, 0, 0.95, -3.05, body); gl.rotation.x = -0.42;
    box(0.9, 0.12, 0.8, m.dark, -0.8, 1.45, -2.2, body); cyl(0.3, 0.32, 0.1, m.hull, 12, body).position.set(-0.8, 1.5, -2.2);
    for (let i = 0; i < 4; i++) box(2.3, 0.04, 0.1, m.metal, 0.2, 1.43, -1.2 + i * 0.22, body);
    box(3.2, 0.7, 0.14, m.dark, 0, 0.8, -3.65, body).rotation.x = -0.3; for (const sx of [-1, 1]) box(0.14, 0.14, 0.7, m.metal, sx * 1.4, 0.6, -3.35, body);
    box(3.0, 0.9, 0.18, m.dark, 0, 0.7, 3.65, body).rotation.x = 0.3;
    for (const sx of [-1, 1]) { box(0.5, 0.34, 1.2, m.light, sx * 1.58, 1.18, 1.6, body); box(0.3, 0.42, 0.2, m.dark, sx * 1.66, 1.2, 2.6, body); }
    const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 1.4, 0.9); body.add(turret);
    cyl(1.3, 1.34, 0.12, m.metal, 18, turret).position.y = 0.06;
    plateY([[-0.8, -1.7], [0.8, -1.7], [1.4, -0.9], [1.45, 1.6], [1.1, 2.25], [-1.1, 2.25], [-1.45, 1.6], [-1.4, -0.9]], 1.0, m.hull, 0.08, turret).position.y = 0.1;
    box(2.6, 0.03, 2.4, m.camo, 0, 1.12, 0.6, turret); box(0.02, 0.6, 2.2, m.camo, 1.46, 0.6, 0.5, turret); box(0.02, 0.6, 1.9, m.camo, -1.46, 0.6, 0.3, turret);
    box(1.9, 0.5, 0.28, m.dark, 0, 0.6, -1.75, turret);
    box(2.2, 0.75, 0.2, m.dark, 0, 0.62, 2.3, turret); box(1.0, 0.5, 0.06, m.black, 0, 0.62, 2.43, turret);
    const cup = cyl(0.34, 0.37, 0.22, m.hull, 12, turret); cup.position.set(0.7, 1.22, -0.2); periscopes(turret, 0.7, 1.28, -0.2, 0.37, 7);
    const hc = cyl(0.32, 0.32, 0.05, m.dark, 12, turret); hc.position.set(0.7, 1.4, 0.0); hc.rotation.x = -1.2;
    box(0.5, 0.05, 0.5, m.dark, -0.6, 1.12, 1.1, turret); box(0.5, 0.05, 0.5, m.dark, -0.6, 1.12, 0.3, turret);
    box(0.06, 0.28, 0.06, m.metal, 0.7, 1.5, -0.45, turret); box(0.5, 0.3, 0.04, m.dark, 0.7, 1.64, -0.55, turret); cylZ(0.035, 0.035, 0.9, m.metal, 6, 0.7, 1.64, -0.95, turret);
    const ant = cyl(0.014, 0.02, 3.0, m.metal, 4, turret); ant.position.set(-1.1, 2.2, 1.9); ant.rotation.x = 0.1; const ant2 = cyl(0.01, 0.015, 2.2, m.metal, 4, turret); ant2.position.set(1.2, 1.9, 1.9);
    smokeTubes(turret, m, 1.4, 0.7, -1.0, 4, 1); smokeTubes(turret, m, 1.4, 0.7, -1.0, 4, -1);
    const gunPivot = new THREE.Group(); gunPivot.position.set(0, 0.6, -1.9); turret.add(gunPivot); const slide = new THREE.Group(); gunPivot.add(slide);
    cylZ(0.24, 0.26, 0.9, m.dark, 12, 0, 0, -0.3, slide); cylZ(0.15, 0.15, 6.0, m.hull, 12, 0, 0, -3.5, slide);
    cylZ(0.24, 0.24, 0.9, m.dark, 12, 0, 0, -3.3, slide); cylZ(0.2, 0.2, 0.3, m.dark, 12, 0, 0, -3.8, slide);
    box(0.44, 0.3, 0.7, m.dark, 0, 0, -6.55, slide); for (const sx of [-1, 1]) box(0.06, 0.34, 0.5, m.black, sx * 0.23, 0, -6.55, slide);
    box(0.2, 0.2, 1.2, m.metal, 0.3, -0.28, -1.0, slide);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -6.95); slide.add(muzzle);
    return finishTL(g, body, turret, gunPivot, slide, muzzle, [3.7, 3.4, 11.2], [0, 1.5, -1.5], [new V(-0.85, 0.88, 3.4), new V(0.85, 0.88, 3.4)], { elev: [-0.05, 0.85] });
  };

  // ================================================================= CANON ANTIAERIEN A RADARS
  M.aagun = (tint) => {
    const P = liv(tint), m = mats(P), g = new THREE.Group(), body = new THREE.Group(), radar = new THREE.Group(); g.add(body);
    tracked(body, m, 2.7, 1.5, 6);
    box(2.5, 0.7, 5.3, m.dark, 0, 0.62, 0, body); box(2.72, 0.5, 4.0, m.hull, 0, 1.18, 0.4, body);
    const gl = box(2.72, 0.14, 1.55, m.hull, 0, 0.96, -2.1, body); gl.rotation.x = -0.42; box(2.4, 0.4, 0.14, m.dark, 0, 0.55, -2.72, body);
    for (let i = 0; i < 4; i++) box(2.2, 0.04, 0.1, m.metal, 0, 1.44, 1.6 + i * 0.22, body);
    for (const sx of [-1, 1]) box(0.5, 0.3, 1.0, m.light, sx * 1.55, 1.15, 1.1, body);
    const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 1.43, 0.1); body.add(turret);
    cyl(1.15, 1.2, 0.12, m.metal, 16, turret).position.y = 0.06;
    plateY([[-1.0, -1.2], [1.0, -1.2], [1.55, -0.2], [1.55, 1.1], [1.15, 1.45], [-1.15, 1.45], [-1.55, 1.1], [-1.55, -0.2]], 0.95, m.hull, 0.08, turret).position.y = 0.1;
    box(3.0, 0.03, 1.8, m.camo, 0, 1.06, 0.2, turret);
    for (const sx of [-1, 1]) { box(0.5, 0.7, 1.1, m.dark, sx * 1.62, 0.55, -0.3, turret); box(0.46, 0.5, 0.5, m.light, sx * 1.62, 0.5, 0.7, turret); box(0.05, 0.4, 0.5, m.black, sx * 1.9, 0.5, 0.7, turret); }
    box(0.18, 0.7, 0.18, m.metal, 0, 1.4, 0.9, turret); radar.position.set(0, 1.9, 0.9); turret.add(radar);
    box(1.9, 0.9, 0.12, m.hull, 0, 0.1, 0, radar); box(1.9, 0.05, 0.25, m.dark, 0, 0.58, 0, radar); box(1.9, 0.05, 0.25, m.dark, 0, -0.38, 0, radar); box(0.14, 0.14, 0.5, m.metal, 0, -0.3, 0.3, radar);
    cyl(0.4, 0.45, 0.5, m.dark, 12, turret).position.set(0, 1.35, -0.9); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), lam('#d8dcdc')); dome.position.set(0, 1.62, -0.9); dome.scale.y = 0.8; turret.add(dome);
    box(0.5, 0.06, 0.5, basic('#ff3a2a'), 0, 1.97, -0.9, turret).castShadow = false;
    smokeTubes(turret, m, 1.35, 0.55, -0.9, 3, 1); smokeTubes(turret, m, 1.35, 0.55, -0.9, 3, -1);
    const gunPivot = new THREE.Group(); gunPivot.position.set(0, 0.75, -1.25); turret.add(gunPivot); const slide = new THREE.Group(); gunPivot.add(slide);
    for (const sx of [-1, 1]) {
      box(0.5, 0.5, 0.9, m.dark, sx * 1.15, 0, -0.1, slide);
      cylZ(0.16, 0.18, 0.9, m.dark, 10, sx * 1.15, 0, -0.5, slide); cylZ(0.085, 0.085, 3.4, m.metal, 10, sx * 1.15, 0, -2.2, slide); cylZ(0.13, 0.13, 1.0, m.hull, 10, sx * 1.15, 0, -1.3, slide);
      cylZ(0.12, 0.12, 0.4, m.black, 8, sx * 1.15, 0, -3.95, slide); for (let i = 0; i < 4; i++) box(0.04, 0.17, 0.3, m.black, sx * 1.15, 0, -3.8, slide).rotation.z = i * 0.785;
    }
    box(2.5, 0.12, 0.6, m.metal, 0, 0, -0.3, slide);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -4.3); slide.add(muzzle);
    return finishTL(g, body, turret, gunPivot, slide, muzzle, [4.0, 4.0, 7.2], [0, 1.9, -0.2], [new V(-0.85, 0.88, 3.1), new V(0.85, 0.88, 3.1)], { keep: [radar], anim: (dt) => { radar.rotation.y += dt * 4.2; }, elev: [-0.05, 1.3] });
  };

  // ================================================================= LANCE-ROQUETTES MULTIPLE 8x8
  M.mlrs = (tint) => {
    const P = liv(tint), m = mats(P), g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const tire = lam('#141414'), rim = lam('#5a5c58'), L = 9.4;
    box(2.2, 0.34, L, m.black, 0, 0.95, 0, body);
    for (const sx of [-1, 1]) for (let a = 0; a < 4; a++) {
      const z = -L / 2 + 1.5 + a * 2.15 + (a > 1 ? 0.8 : 0);
      cylX(0.62, 0.62, 0.46, tire, 14, sx * 1.35, 0.62, z, body); cylX(0.36, 0.36, 0.5, rim, 10, sx * 1.35, 0.62, z, body); cylX(0.12, 0.12, 0.54, m.black, 6, sx * 1.35, 0.62, z, body);
      for (let k = 0; k < 6; k++) { const an = k * 1.047; box(0.5, 0.06, 0.06, m.black, sx * 1.35, 0.62 + Math.sin(an) * 0.52, z + Math.cos(an) * 0.52, body); }
      box(0.7, 0.07, 1.2, m.dark, sx * 1.38, 1.3, z, body);
    }
    box(0.7, 0.1, 9.6, m.dark, 0, 1.25, 0, body);
    box(2.6, 1.5, 2.2, m.hull, 0, 2.05, -L / 2 + 1.5, body); const wsh = box(2.3, 0.65, 0.06, m.glass, 0, 2.45, -L / 2 + 0.38, body); wsh.rotation.x = 0.18;
    box(2.7, 0.2, 2.3, m.dark, 0, 2.9, -L / 2 + 1.5, body); box(2.64, 0.4, 0.2, m.light, 0, 1.4, -L / 2 + 0.4, body);
    box(2.1, 0.7, 1.0, m.dark, 0, 1.55, -L / 2 - 0.1, body); for (let i = 0; i < 5; i++) box(1.6, 0.04, 0.05, m.black, 0, 1.4 + i * 0.1, -L / 2 - 0.62, body);
    for (const sx of [-1, 1]) { box(0.06, 0.55, 0.9, m.glass, sx * 1.31, 2.45, -L / 2 + 1.5, body); const hl = box(0.28, 0.18, 0.06, basic('#fff0c8'), sx * 0.9, 1.6, -L / 2 - 0.64, body); hl.castShadow = false; box(0.06, 0.4, 0.25, m.black, sx * 1.4, 2.5, -L / 2 + 0.55, body); box(0.4, 0.7, 0.2, m.camo, sx * 1.2, 1.3, -L / 2 + 0.2, body); }
    cyl(0.07, 0.07, 1.6, m.black, 6, body).position.set(1.0, 3.7, -L / 2 + 2.2);
    box(2.5, 1.2, 0.4, m.dark, 0, 1.9, -L / 2 + 2.9, body);
    for (const sx of [-1, 1]) { box(0.2, 0.2, 1.4, m.metal, sx * 1.2, 0.75, L / 2 - 0.5, body); box(0.14, 0.9, 0.14, m.metal, sx * 1.9, 0.5, L / 2 - 0.5, body).rotation.z = sx * 0.6; box(0.5, 0.06, 0.5, m.dark, sx * 2.2, 0.06, L / 2 - 0.5, body); }
    const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 1.45, 1.4); body.add(turret);
    cyl(1.15, 1.2, 0.3, m.metal, 14, turret).position.y = 0.15; box(2.0, 0.45, 1.8, m.hull, 0, 0.5, 0.2, turret);
    for (const sx of [-1, 1]) box(0.2, 1.2, 0.5, m.dark, sx * 0.95, 1.0, 0.3, turret);
    const gunPivot = new THREE.Group(); gunPivot.position.set(0, 1.35, 0.3); turret.add(gunPivot); const slide = new THREE.Group(); gunPivot.add(slide);
    box(2.2, 0.16, 4.8, m.dark, 0, -0.6, -1.4, slide);
    for (let c = 0; c < 2; c++) for (let r = 0; r < 3; r++) {
      const x = -0.55 + c * 1.1, y = -0.1 + r * 0.55; cylZ(0.24, 0.24, 4.6, m.hull, 12, x, y, -1.4, slide); cylZ(0.26, 0.26, 0.18, m.black, 12, x, y, -3.78, slide); cylZ(0.2, 0.2, 0.06, m.black, 10, x, y, -3.9, slide);
      for (const z of [-0.2, -2.3]) cylZ(0.265, 0.265, 0.1, m.dark, 12, x, y, z, slide);
    }
    box(2.4, 0.1, 0.12, m.metal, 0, 1.15, -3.6, slide); box(2.4, 0.1, 0.12, m.metal, 0, 1.15, -0.4, slide); box(0.12, 1.6, 0.12, m.metal, -1.2, 0.6, -0.4, slide); box(0.12, 1.6, 0.12, m.metal, 1.2, 0.6, -0.4, slide);
    for (const sx of [-1, 1]) box(0.3, 0.3, 0.1, m.accB, sx * 0.9, 1.05, -3.7, slide);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.5, -4.0); slide.add(muzzle);
    return finishTL(g, body, turret, gunPivot, slide, muzzle, [3.3, 4.2, 10.6], [0, 2.0, 0], [new V(0.9, 1.0, L / 2)], { elev: [0.1, 1.0] });
  };

  // ================================================================= DESTROYER (coque profilée, mât à radar, canon avant sur tourelle)
  M.destroyer = (tint) => {
    const P = liv(tint === undefined ? 2 : tint), m = mats(P), g = new THREE.Group(), body = new THREE.Group(), radar = new THREE.Group(); g.add(body);
    const red = lam('#7a2a22');
    profileX([[8.0, 0.1], [-6.4, 0.0], [-8.4, 1.5], [-9.0, 2.4], [-7.4, 2.5], [7.2, 2.5], [8.2, 2.0]], 3.0, m.hull, 0.12, body);
    profileX([[7.9, 0.15], [-6.3, 0.05], [-7.3, 0.9], [7.6, 0.9]], 3.04, red, 0.06, body);
    box(2.9, 0.12, 15.8, m.light, 0, 2.58, -0.3, body);
    for (const sx of [-1, 1]) { box(0.05, 0.5, 15.4, m.dark, sx * 1.4, 2.88, -0.3, body); for (let i = 0; i < 14; i++) box(0.04, 0.5, 0.05, m.metal, sx * 1.4, 2.88, -7.6 + i * 1.15, body); }
    for (let i = 0; i < 3; i++) box(3.02, 0.14, 0.1, m.dark, 0, 0.9 + i * 0.5, -7.6 + i * 0.5, body);
    box(2.4, 1.3, 5.6, m.hull, 0, 3.3, 0.9, body); box(2.1, 1.1, 2.6, m.hull, 0, 4.5, 0.2, body); box(2.0, 0.4, 0.06, m.glass, 0, 4.75, -1.12, body); box(0.06, 0.4, 1.8, m.glass, 1.06, 4.75, 0.1, body); box(0.06, 0.4, 1.8, m.glass, -1.06, 4.75, 0.1, body);
    box(2.8, 0.12, 3.0, m.dark, 0, 5.15, 0.2, body);
    for (let i = 0; i < 6; i++) { box(0.05, 0.3, 0.4, m.glass, 1.22, 3.5, -0.8 + i * 0.7, body); box(0.05, 0.3, 0.4, m.glass, -1.22, 3.5, -0.8 + i * 0.7, body); }
    box(0.6, 3.2, 0.6, m.hull, 0, 6.8, 0.4, body); box(0.9, 0.12, 0.9, m.dark, 0, 5.4, 0.4, body);
    radar.position.set(0, 8.5, 0.4); body.add(radar); box(2.6, 0.9, 0.12, m.dark, 0, 0, 0, radar); box(0.18, 0.5, 0.18, m.metal, 0, -0.6, 0, radar);
    cyl(0.04, 0.04, 2.4, m.metal, 4, body).position.set(0.3, 9.6, 0.4); box(1.6, 0.06, 0.06, m.metal, 0, 7.4, 0.4, body);
    for (const sx of [-1, 1]) { cyl(0.45, 0.5, 1.2, m.dark, 10, body).position.set(sx * 0.55, 6.0, 2.4); cyl(0.46, 0.46, 0.12, m.black, 10, body).position.set(sx * 0.55, 6.62, 2.4); box(0.8, 0.5, 0.8, m.hull, sx * 0.55, 5.25, 2.4, body); }
    box(2.0, 0.14, 2.6, m.dark, 0, 2.7, -3.2, body); for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) box(0.32, 0.03, 0.32, m.black, -0.7 + i * 0.47, 2.79, -4.2 + j * 0.42, body);
    box(2.1, 1.5, 2.2, m.hull, 0, 3.4, 4.4, body); box(1.6, 1.2, 0.08, m.dark, 0, 3.3, 3.27, body);
    box(2.5, 0.12, 3.2, m.dark, 0, 2.7, 6.7, body); box(0.12, 0.04, 1.4, basic('#e8e8e0'), -0.5, 2.78, 6.7, body); box(0.12, 0.04, 1.4, basic('#e8e8e0'), 0.5, 2.78, 6.7, body); box(1.0, 0.04, 0.12, basic('#e8e8e0'), 0, 2.78, 6.7, body);
    const ciws = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), lam('#e6e8e8')); ciws.position.set(0, 4.7, 4.4); ciws.scale.y = 0.9; body.add(ciws); cyl(0.4, 0.45, 0.4, m.dark, 10, body).position.set(0, 4.3, 4.4);
    for (const z of [-1.4, 3.0]) { box(0.5, 0.3, 0.5, m.dark, 1.15, 2.85, z, body); cylZ(0.06, 0.06, 0.9, m.metal, 6, 1.15, 3.0, z - 0.5, body); }
    const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 2.55, -5.7); body.add(turret);
    cyl(1.0, 1.05, 0.2, m.metal, 14, turret).position.y = 0.1;
    plateY([[-0.5, -0.9], [0.5, -0.9], [0.95, -0.2], [0.95, 0.7], [0.6, 1.0], [-0.6, 1.0], [-0.95, 0.7], [-0.95, -0.2]], 0.62, m.hull, 0.07, turret).position.y = 0.15;
    box(1.0, 0.04, 0.5, m.camo, 0, 0.8, 0.2, turret); cyl(0.2, 0.2, 0.1, m.dark, 8, turret).position.set(0.4, 0.84, 0.5);
    const gunPivot = new THREE.Group(); gunPivot.position.set(0, 0.4, -0.9); turret.add(gunPivot); const slide = new THREE.Group(); gunPivot.add(slide);
    cylZ(0.16, 0.18, 0.5, m.dark, 10, 0, 0, -0.1, slide); cylZ(0.1, 0.1, 3.8, m.hull, 10, 0, 0, -2.2, slide); cylZ(0.13, 0.13, 1.4, m.dark, 10, 0, 0, -3.2, slide); box(0.26, 0.18, 0.34, m.black, 0, 0, -4.2, slide);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -4.4); slide.add(muzzle);
    box(0.4, 0.4, 0.3, m.dark, 0.9, 2.1, -8.3, body); box(0.04, 0.8, 1.6, basic('#e8e8e0'), 1.53, 1.7, -2.2, body); box(0.04, 0.8, 0.5, basic('#e8e8e0'), -1.53, 1.7, -2.2, body); box(0.04, 0.4, 0.7, basic(P.acc), 0, 6.0, 5.2, body);
    return finishTL(g, body, turret, gunPivot, slide, muzzle, [3.8, 9.4, 18.0], [0, 4.0, 0], [new V(-0.55, 6.1, 2.4), new V(0.55, 6.1, 2.4)], { keep: [radar], anim: (dt) => { radar.rotation.y += dt * 2.4; }, elev: [-0.05, 0.9] });
  };

  // ================================================================= TRAIN BLINDE (locomotive diesel + wagon de combat à tourelle, sur rails)
  M.train = (tint) => {
    const P = liv(tint === undefined ? 5 : tint), m = mats(P), g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const rail = lam('#6a6c70'), sleeper = lam('#3a2e22'), plate = lam(P.dark);
    for (const sx of [-1, 1]) box(0.14, 0.18, 17.5, rail, sx * 0.72, 0.09, 0, body);
    for (let i = 0; i < 24; i++) box(2.3, 0.14, 0.34, sleeper, 0, 0.07, -8.2 + i * 0.72, body);
    const bogie = (z) => { for (const sx of [-1, 1]) for (const dz of [-0.9, 0.9]) { cylX(0.46, 0.46, 0.14, m.wheel, 14, sx * 0.74, 0.74, z + dz, body); cylX(0.3, 0.3, 0.16, m.hub, 8, sx * 0.74, 0.74, z + dz, body); } box(2.2, 0.22, 2.6, m.black, 0, 1.0, z, body); for (const sx of [-1, 1]) box(0.16, 0.34, 2.2, m.metal, sx * 0.74, 0.9, z, body); };
    for (const z of [-5.4, -2.4]) bogie(z);
    box(2.8, 0.4, 7.2, m.dark, 0, 1.4, -4.1, body);
    box(2.7, 1.5, 3.0, m.hull, 0, 2.35, -2.3, body); box(2.2, 1.0, 3.6, m.hull, 0, 2.1, -5.5, body);
    const wg = box(2.4, 0.7, 0.06, m.glass, 0, 2.7, -3.8, body); wg.rotation.x = 0.12; for (const sx of [-1, 1]) { box(0.06, 0.6, 1.1, m.glass, sx * 1.36, 2.7, -2.3, body); box(0.4, 0.5, 0.6, m.light, sx * 1.1, 2.0, -7.2, body); }
    for (let i = 0; i < 6; i++) box(1.8, 0.05, 0.08, m.black, 0, 1.8 + i * 0.1, -7.35, body); box(2.3, 0.9, 0.1, m.dark, 0, 2.1, -7.3, body);
    for (const sx of [-1, 1]) { const hl = box(0.3, 0.22, 0.08, basic('#fff0c8'), sx * 0.8, 2.6, -7.38, body); hl.castShadow = false; }
    box(2.5, 0.12, 3.2, m.dark, 0, 3.15, -2.3, body); for (let i = 0; i < 2; i++) cyl(0.5, 0.5, 0.18, m.metal, 12, body).position.set(i ? 0.6 : -0.6, 3.28, -2.3);
    cyl(0.22, 0.26, 0.9, m.dark, 8, body).position.set(0, 3.1, -4.9);
    for (const sx of [-1, 1]) { box(0.05, 0.4, 7.4, m.metal, sx * 1.42, 1.7, -4.0, body); box(0.06, 0.12, 6.0, m.accB, sx * 1.41, 1.5, -4.5, body); }
    for (const z of [2.0, 4.8]) bogie(z);
    box(2.8, 0.4, 7.0, m.dark, 0, 1.4, 3.4, body); box(2.7, 2.0, 6.4, plate, 0, 2.6, 3.4, body);
    for (const sx of [-1, 1]) { for (let i = 0; i < 7; i++) box(0.05, 1.7, 0.05, m.black, sx * 1.37, 2.6, 0.7 + i * 0.9, body); for (let i = 0; i < 4; i++) box(0.06, 0.2, 0.7, m.black, sx * 1.37, 2.9, 1.3 + i * 1.5, body); for (let r = 0; r < 2; r++) for (let i = 0; i < 14; i++) box(0.07, 0.07, 0.07, m.light, sx * 1.37, 1.9 + r * 1.4, 0.4 + i * 0.45, body); }
    box(2.9, 0.18, 6.6, m.hull, 0, 3.7, 3.4, body); box(2.0, 0.04, 5.0, m.camo, 0, 3.8, 3.4, body);
    box(2.4, 1.0, 0.1, m.dark, 0, 2.5, 6.65, body); box(0.4, 0.4, 0.5, m.metal, 0, 1.5, -0.2, body); box(0.4, 0.4, 0.5, m.metal, 0, 1.5, 6.9, body);
    const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 3.8, 3.8); body.add(turret);
    cyl(1.05, 1.1, 0.14, m.metal, 16, turret).position.y = 0.07;
    plateY([[-0.55, -1.3], [0.55, -1.3], [1.1, -0.5], [1.1, 0.9], [0.8, 1.3], [-0.8, 1.3], [-1.1, 0.9], [-1.1, -0.5]], 0.6, m.hull, 0.07, turret).position.y = 0.12;
    box(0.95, 0.5, 0.3, m.dark, 0, 0.42, -1.4, turret); const cup = cyl(0.28, 0.3, 0.22, m.hull, 12, turret); cup.position.set(0.45, 0.82, 0.3); periscopes(turret, 0.45, 0.88, 0.3, 0.3, 5);
    cyl(0.014, 0.02, 2.6, m.metal, 4, turret).position.set(-0.8, 1.9, 1.0); smokeTubes(turret, m, 1.1, 0.5, -0.7, 3, 1); smokeTubes(turret, m, 1.1, 0.5, -0.7, 3, -1);
    const gunPivot = new THREE.Group(); gunPivot.position.set(0, 0.42, -1.5); turret.add(gunPivot); const slide = new THREE.Group(); gunPivot.add(slide);
    cylZ(0.13, 0.15, 0.6, m.dark, 10, 0, 0, -0.2, slide); cylZ(0.095, 0.11, 3.4, m.hull, 10, 0, 0, -1.9, slide); cylZ(0.16, 0.16, 0.5, m.dark, 10, 0, 0, -1.8, slide); box(0.3, 0.2, 0.36, m.dark, 0, 0, -3.6, slide);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -3.85); slide.add(muzzle);
    return finishTL(g, body, turret, gunPivot, slide, muzzle, [3.0, 5.4, 17.5], [0, 2.4, -0.2], [new V(0, 3.3, -4.9)], { elev: [-0.05, 0.6] });
  };

  // ================================================================= HELICOPTERE DE TRANSPORT LOURD ARME (deux rotors en tandem)
  M.gunship = (tint) => {
    const P = liv(tint), m = mats(P), g = new THREE.Group(), rotors = [];
    profileX([[-5.4, 0.1], [-4.6, 1.0], [-3.2, 1.35], [3.2, 1.4], [5.4, 2.0], [5.9, 1.5], [4.6, 0.4], [1.8, -0.75], [-3.6, -0.75], [-5.2, -0.45]], 2.4, m.hull, 0.16, g);
    profileX([[-5.0, 0.12], [-3.9, 0.95], [-3.1, 1.05], [-3.4, 0.35]], 2.46, m.glass, 0.1, g);
    for (const sx of [-1, 1]) { for (let i = 0; i < 5; i++) box(0.05, 0.36, 0.46, m.glass, sx * 1.22, 0.55, -2.4 + i * 0.95, g); box(0.05, 0.05, 6.2, m.dark, sx * 1.22, 0.1, 0.4, g); box(0.05, 1.1, 0.06, m.dark, sx * 1.22, 0.5, -2.9, g); box(0.05, 1.1, 0.06, m.dark, sx * 1.22, 0.5, 2.9, g); }
    box(2.46, 0.14, 7.6, m.camo, 0, 1.38, 0.4, g); box(2.2, 0.6, 3.0, m.light, 0, -0.4, -0.3, g);
    box(2.2, 0.1, 2.0, m.dark, 0, -0.78, 4.0, g).rotation.x = -0.35;
    for (const sx of [-1, 1]) { box(0.8, 1.0, 3.6, m.hull, sx * 1.55, 0.2, -0.4, g); for (const z of [-1.8, 3.2]) { cylX(0.42, 0.42, 0.26, lam('#141414'), 12, sx * 1.8, -0.55, z, g); cylX(0.22, 0.22, 0.3, m.hub, 8, sx * 1.8, -0.55, z, g); box(0.1, 0.8, 0.1, m.metal, sx * 1.8, -0.2, z, g); } cylZ(0.12, 0.12, 1.7, m.black, 8, sx * 1.55, -0.05, -2.9, g); cylZ(0.09, 0.09, 0.4, m.dark, 8, sx * 1.55, -0.05, -3.9, g); }
    box(0.9, 1.4, 1.5, m.hull, 0, 1.9, -3.4, g); box(0.4, 0.4, 1.0, m.light, 0, 2.5, -3.0, g);
    box(1.4, 2.2, 1.8, m.hull, 0, 2.8, 4.4, g); for (const sx of [-1, 1]) { cylZ(0.5, 0.55, 1.9, m.dark, 12, sx * 0.9, 3.9, 4.4, g); cylZ(0.4, 0.4, 0.3, m.black, 10, sx * 0.9, 3.9, 5.5, g); cylZ(0.55, 0.45, 0.4, m.dark, 12, sx * 0.9, 3.9, 3.35, g); }
    for (const [z, y, dir] of [[-3.4, 2.75, 1], [4.4, 4.2, -1]]) {
      const r = new THREE.Group(); r.position.set(0, y, z); g.add(r); cyl(0.3, 0.38, 0.3, m.metal, 10, r).position.y = 0;
      for (let i = 0; i < 3; i++) { const arm = new THREE.Group(); arm.rotation.y = i * 2.094; r.add(arm); box(3.6, 0.07, 0.38, m.black, 1.9, 0, 0, arm); box(0.5, 0.075, 0.385, m.accB, 3.55, 0, 0, arm); box(0.3, 0.1, 0.3, m.metal, 0.35, 0, 0, arm); }
      const bl = blur('#101214', 0.1, 3.7); bl.position.set(0, y, z); g.add(bl); rotors.push({ r, dir });
    }
    cyl(0.03, 0.03, 1.4, m.metal, 4, g).position.set(0.5, 2.1, 0.5); cyl(0.03, 0.03, 1.0, m.metal, 4, g).position.set(-0.6, 1.9, 1.5);
    box(0.06, 1.0, 0.7, m.accB, 1.24, 0.2, 5.0, g); box(0.06, 1.0, 0.7, m.accB, -1.24, 0.2, 5.0, g);
    for (const [x, y, z, c] of [[-1.25, 0.0, -3.9, '#ff2a1a'], [1.25, 0.0, -3.9, '#2aff5a'], [0, 1.5, 5.9, '#ffffff']]) { const l = box(0.14, 0.14, 0.14, new THREE.MeshBasicMaterial({ color: c }), x, y, z, g); l.castShadow = false; }
    g.userData = { gen: true, flying: true, size: [7.8, 5.0, 13.4], center: [0, 1.4, 0.2], firePoints: [new V(-1.55, -0.05, -4.1), new V(1.55, -0.05, -4.1)], anim: (dt) => { for (const o of rotors) o.r.rotation.y += dt * 16 * o.dir; } };
    return bake(g, rotors.map((o) => o.r));
  };

  // ================================================================= CHASSEUR BIMOTEUR (voilure en flèche, deux dérives, entrées d'air, tuyères)
  M.jet = (tint) => {
    const P = liv(tint === undefined ? 2 : tint), m = mats(P), g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    profileX([[-6.8, 0.0], [-5.6, 0.4], [-3.6, 0.65], [-0.8, 0.78], [3.2, 0.72], [5.2, 0.5], [5.4, -0.05], [3.2, -0.55], [-2.2, -0.62], [-5.9, -0.25]], 1.2, m.hull, 0.1, body);
    profileX([[-4.1, 0.58], [-2.4, 0.97], [-0.5, 0.97], [0.3, 0.7], [-1.4, 0.6]], 0.84, m.glass, 0.08, body);
    const nose = cyl(0.04, 0.4, 1.3, m.dark, 8, body); nose.position.set(0, 0.05, -6.9); nose.rotation.x = -Math.PI / 2;
    for (const sx of [-1, 1]) {
      box(0.95, 0.85, 2.8, m.dark, sx * 0.95, -0.15, -1.1, body); box(0.85, 0.74, 0.1, m.black, sx * 0.95, -0.15, -2.55, body);
      plateY(mir([[0.5, -0.4], [5.3, 2.4], [5.3, 3.2], [0.5, 3.0]], sx), 0.14, m.hull, 0.03, body).position.set(0, -0.12, 0);
      plateY(mir([[0.5, 4.0], [2.6, 5.4], [2.6, 6.0], [0.5, 5.7]], sx), 0.12, m.hull, 0.03, body).position.set(0, -0.05, 0);
      const fin = box(0.1, 1.9, 1.5, m.hull, sx * 0.8, 1.25, 4.6, body); fin.rotation.z = -sx * 0.22; box(0.11, 0.3, 0.6, m.accB, sx * 0.82, 2.0, 4.9, body).rotation.z = -sx * 0.22;
      cylZ(0.62, 0.55, 2.6, m.dark, 14, sx * 0.62, 0.0, 4.2, body); cylZ(0.5, 0.5, 0.2, basic('#ff9a30'), 12, sx * 0.62, 0.0, 5.6, body).castShadow = false; cylZ(0.58, 0.62, 0.35, m.black, 12, sx * 0.62, 0.0, 5.5, body);
      for (const x of [sx * 3.0, sx * 4.6]) { cylZ(0.11, 0.11, 2.6, m.light, 8, x, -0.35, 1.2, body); cylZ(0.025, 0.11, 0.5, m.dark, 8, x, -0.35, -0.3, body); box(0.04, 0.3, 0.4, m.dark, x, -0.35, 2.3, body); box(0.4, 0.04, 0.3, m.dark, x, -0.35, 2.3, body); box(0.06, 0.2, 0.7, m.metal, x, -0.18, 1.2, body); }
      box(0.1, 0.1, 0.3, basic(sx > 0 ? '#2aff5a' : '#ff2a1a'), sx * 5.35, 0.0, 2.8, body).castShadow = false;
    }
    box(1.3, 0.14, 1.6, m.camo, 0, 0.7, 2.0, body); box(0.04, 0.05, 2.0, m.accB, 0, 0.65, 3.0, body); cyl(0.03, 0.03, 0.9, m.metal, 4, body).position.set(0.0, 1.2, -4.2);
    g.userData = { gen: true, flying: true, size: [11.4, 3.2, 13.0], center: [0, 0.4, 0], firePoints: [new V(-3.0, -0.35, -1.6), new V(3.0, -0.35, -1.6)], anim: (dt, t) => { g.rotation.z = Math.sin(t * 0.8) * 0.1; } };
    return bake(g, []);
  };

  // ================================================================= BOMBARDIER FURTIF (aile volante, soute, entrées d'air dorsales)
  M.bomber = (tint) => {
    const P = liv(tint === undefined ? 4 : tint), m = mats(P), g = new THREE.Group();
    plateY([[0, -5.6], [6.8, 2.2], [6.8, 3.2], [5.4, 2.7], [4.1, 3.5], [2.7, 2.8], [1.4, 3.8], [0, 3.1], [-1.4, 3.8], [-2.7, 2.8], [-4.1, 3.5], [-5.4, 2.7], [-6.8, 3.2], [-6.8, 2.2]], 0.5, m.hull, 0.09, g).position.y = -0.25;
    profileX([[-4.6, 0.0], [-3.2, 0.5], [-0.5, 0.95], [2.2, 0.8], [3.4, 0.2], [3.4, 0.0]], 3.0, m.hull, 0.2, g);
    profileX([[-4.0, 0.35], [-3.0, 0.8], [-2.2, 0.85], [-2.4, 0.35]], 1.7, m.glass, 0.06, g);
    for (const sx of [-1, 1]) {
      box(1.0, 0.16, 1.6, m.dark, sx * 1.9, 0.78, 0.0, g); box(0.9, 0.05, 0.7, m.black, sx * 1.9, 0.88, -0.5, g);
      for (let i = 0; i < 3; i++) box(1.1, 0.05, 0.5, m.black, sx * (1.6 + i * 1.7), -0.42, 2.9 + (i % 2) * 0.35, g);
      box(0.5, 0.06, 2.2, m.dark, sx * 4.2, -0.02, -0.2, g).rotation.y = sx * 0.55;
      box(0.3, 0.08, 0.5, m.accB, sx * 5.0, 0.1, 2.6, g);
    }
    box(2.6, 0.04, 3.2, m.black, 0, -0.52, 0.2, g); box(0.04, 0.05, 3.2, m.dark, -0.5, -0.5, 0.2, g); box(0.04, 0.05, 3.2, m.dark, 0.5, -0.5, 0.2, g);
    for (const x of [-2, -1, 1, 2]) box(0.04, 0.05, 1.4, m.dark, x * 1.4, 0.26, 0.8, g);
    g.userData = { gen: true, flying: true, size: [13.8, 2.0, 9.6], center: [0, 0.1, -0.9], firePoints: [new V(-1.2, -0.55, -0.3), new V(1.2, -0.55, -0.3)], anim: (dt, t) => { g.rotation.z = Math.sin(t * 0.7) * 0.1; } };
    return bake(g, []);
  };

  // ================================================================= SOUS-MARIN (3 types : d'attaque, lanceur de missiles balistiques, diesel-électrique)
  M.sub = (tint, variant) => {
    const v = (variant || 0) % 3, P = liv(tint === undefined ? 4 : tint), m = mats(P), g = new THREE.Group(), prop = new THREE.Group(), tile = lam(v === 1 ? '#1d2328' : P.dark);
    const len = [8.4, 11.0, 7.0][v], rad = [1.45, 1.8, 1.2][v];
    cylZ(rad, rad, len, tile, 20, 0, 0, 0, g);
    const bow = new THREE.Mesh(new THREE.SphereGeometry(rad, 18, 12), tile); bow.scale.set(1, 1, v === 2 ? 1.7 : 1.5); bow.position.z = -len / 2; g.add(bow);
    const tail = cyl(0.28, rad, 2.8, tile, 16, g); tail.position.set(0, 0, len / 2 + 1.4); tail.rotation.x = Math.PI / 2;
    for (let i = 0; i < Math.floor(len / 1.3); i++) cylZ(rad * 1.012, rad * 1.012, 0.05, m.black, 20, 0, 0, -len / 2 + 0.8 + i * 1.3, g);
    box(rad * 0.7, 0.14, len * 0.8, m.dark, 0, rad * 0.97, 0.4, g);
    profileX([[-1.3, 0.0], [-0.95, 2.1], [0.9, 2.1], [1.5, 0.0]], v === 1 ? 1.1 : 0.9, tile, 0.1, g).position.set(0, rad * 0.9, -len * 0.14);
    box(0.2, 0.5, 0.7, m.metal, 0, rad * 0.9 + 1.9, -len * 0.14 - 0.2, g);
    for (const sx of [-1, 1]) box(1.1, 0.12, 0.8, tile, sx * 0.85, rad * 0.9 + 1.3, -len * 0.14 - 0.5, g);
    for (const [x, y, h] of [[0.2, 2.1, 1.3], [-0.2, 2.1, 1.0], [0.0, 2.1, 1.6]]) cyl(0.035, 0.045, h, m.metal, 6, g).position.set(x, rad * 0.9 + y + h / 2, -len * 0.14 + 0.3);
    for (let i = 0; i < 3; i++) box(0.05, 0.16, 0.22, basic('#ffd860'), 0.47, rad * 0.9 + 1.2, -len * 0.14 - 0.4 + i * 0.4, g);
    if (v === 1) for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) box(0.6, 0.1, 0.6, m.black, -0.5 + r * 1.0, rad + 0.04, len * 0.12 + c * 1.1, g);
    if (v === 2) cyl(0.2, 0.2, 0.7, m.metal, 8, g).position.set(0, rad + 0.1, len * 0.25);
    box(len * 0.38, 0.14, 1.1, tile, 0, 0, len / 2 + 0.6, g); box(0.14, rad * 2.1, 1.1, tile, 0, 0, len / 2 + 0.6, g);
    for (const sx of [-1, 1]) box(1.2, 0.14, 0.9, tile, sx * rad, 0, -len * 0.3, g);
    prop.position.set(0, 0, len / 2 + 2.9); g.add(prop);
    for (let i = 0; i < 7; i++) { const bl = new THREE.Group(); bl.rotation.z = i * 0.8976; prop.add(bl); const b = box(0.07, 0.95, 0.4, m.metal, 0, 0.55, 0, bl); b.rotation.y = 0.5; }
    const hubP = cyl(0.14, 0.2, 0.5, m.metal, 8, prop); hubP.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; cylZ(0.14, 0.14, 0.1, m.black, 8, Math.cos(a) * 0.55, Math.sin(a) * 0.55, -len / 2 - rad * 1.45, g); }
    box(0.8, 0.06, 2.4, m.accB, 0, rad * 0.6, 0.0, g);
    g.userData = { gen: true, flying: true, size: [rad * 2 + 0.3, rad * 2 + 2.4, len + 5.2], center: [0, 0.4, 1.0], firePoints: [new V(-0.55, 0, -len / 2 - rad * 1.5), new V(0.55, 0, -len / 2 - rad * 1.5)], anim: (dt, t) => { prop.rotation.z += dt * 9; g.position.y = Math.sin(t * 1.0) * 0.18; } };
    return bake(g, [prop]);
  };

  CC.BossModels = M;
  CC.BossFlying = { heli: true, gunship: true, jet: true, bomber: true, sub: true };
})();

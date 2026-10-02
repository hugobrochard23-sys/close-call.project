/* v083 : ENNEMIS DE ZONE — de petits engins militaires réalistes en plus des chars, camions, lance-missiles et hélicoptères, pour que chaque lieu ait ses ennemis :
 *   jeep (4×4 armé d'une mitrailleuse) · aaturret (site antiaérien fixe, deux canons et radar) · boat (patrouilleur côtier) · mine (mine navale flottante)
 * Mêmes conventions que models_boss.js (avant = −Z ; « comme le char » : turret / gun / slide / muzzle / body). Les engins plus gros (ifv, aagun, spg, mlrs, jet, sub…) viennent de models_boss.js. */
(function () {
  const M0 = CC.Models, { lam, basic, box, cyl, cylX, cylZ, profileX, plateY } = M0.kit, bake = M0.bake, V = THREE.Vector3, M = CC.BossModels;
  const LIV = [
    { hull: '#3d4c36', dark: '#2b3727', light: '#56654b', camo: '#2a3322', acc: '#d8a020' },
    { hull: '#8a7a58', dark: '#62563c', light: '#a8996f', camo: '#5a4c32', acc: '#b03a2a' },
    { hull: '#5d6269', dark: '#3f434a', light: '#7a8088', camo: '#2f3338', acc: '#e0e0e0' },
    { hull: '#b8bec6', dark: '#8a9098', light: '#d8dde2', camo: '#98a0aa', acc: '#c03a2a' },
  ];
  const liv = (t) => LIV[(((t || 0) % LIV.length) + LIV.length) % LIV.length];
  const mats = (P) => ({ hull: lam(P.hull), dark: lam(P.dark), light: lam(P.light), camo: lam(P.camo), accB: basic(P.acc), metal: lam('#2d2f2c'), black: lam('#141416'), glass: new THREE.MeshPhongMaterial({ color: '#1c2c3e', specular: '#9ab8d8', shininess: 60 }) });
  const finishTL = (g, body, turret, gunPivot, slide, muzzle, size, center, exhausts, extra) => {
    Object.assign(g.userData, { turret, gun: gunPivot, slide, muzzle, body, tankLike: true, exhausts, size, center }, extra || {});
    return bake(g, [body, turret, gunPivot, slide].concat((extra && extra.keep) || []));
  };

  // ---------- jeep armée ----------
  M.jeep = (tint) => {
    const P = liv(tint), m = mats(P), g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const tire = lam('#141414'), rim = lam('#5a5c58');
    box(1.9, 0.3, 4.2, m.black, 0, 0.78, 0, body);
    for (const sx of [-1, 1]) for (const z of [-1.45, 1.45]) { cylX(0.5, 0.5, 0.36, tire, 14, sx * 1.05, 0.5, z, body); cylX(0.28, 0.28, 0.4, rim, 10, sx * 1.05, 0.5, z, body); box(0.5, 0.06, 1.0, m.dark, sx * 1.05, 0.98, z, body); for (let k = 0; k < 6; k++) { const a = k * 1.047; box(0.4, 0.05, 0.05, m.black, sx * 1.05, 0.5 + Math.sin(a) * 0.46, z + Math.cos(a) * 0.46, body); } }
    box(1.9, 0.6, 1.3, m.hull, 0, 1.15, -1.45, body); box(1.6, 0.06, 1.1, m.dark, 0, 1.47, -1.45, body); box(1.92, 0.12, 0.1, m.dark, 0, 1.0, -2.12, body);
    for (let i = 0; i < 5; i++) box(1.3, 0.04, 0.04, m.black, 0, 1.1 + i * 0.07, -2.14, body);
    for (const sx of [-1, 1]) { const hl = box(0.3, 0.22, 0.08, basic('#fff0c8'), sx * 0.6, 1.25, -2.12, body); hl.castShadow = false; }
    const ws = box(1.7, 0.7, 0.06, m.glass, 0, 1.78, -0.78, body); ws.rotation.x = 0.35; box(1.9, 0.08, 0.1, m.dark, 0, 2.15, -0.62, body);
    box(1.9, 0.5, 2.3, m.hull, 0, 1.2, 1.0, body); box(1.7, 0.04, 2.0, m.camo, 0, 1.46, 1.0, body);
    for (const sx of [-1, 1]) { box(0.06, 0.9, 0.06, m.metal, sx * 0.9, 1.9, 0.45, body); box(0.06, 0.06, 1.7, m.metal, sx * 0.9, 2.36, 0.4, body); box(0.5, 0.4, 0.3, m.dark, sx * 0.6, 1.5, 1.9, body); }
    cylX(0.4, 0.4, 0.2, tire, 12, 0, 1.4, 2.15, body).rotation.z = Math.PI / 2; box(0.2, 0.2, 0.5, m.metal, 0.5, 1.2, 2.15, body);   // roue de secours et jerrican
    cyl(0.02, 0.02, 2.2, m.metal, 4, body).position.set(-0.8, 2.6, 1.9);
    const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 1.55, 0.7); body.add(turret);
    cyl(0.4, 0.45, 0.14, m.metal, 12, turret).position.y = 0.07; box(0.7, 0.5, 0.5, m.hull, 0, 0.4, 0.1, turret); box(0.9, 0.7, 0.06, m.dark, 0, 0.7, -0.38, turret);   // bouclier de tourelle
    const gunPivot = new THREE.Group(); gunPivot.position.set(0, 0.6, -0.4); turret.add(gunPivot); const slide = new THREE.Group(); gunPivot.add(slide);
    cylZ(0.08, 0.1, 0.5, m.dark, 8, 0, 0, 0, slide); cylZ(0.045, 0.045, 1.3, m.metal, 8, 0, 0, -0.9, slide); cylZ(0.07, 0.07, 0.5, m.hull, 8, 0, 0, -0.5, slide); box(0.2, 0.2, 0.3, m.dark, 0.2, -0.05, 0.1, slide);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -1.6); slide.add(muzzle);
    return finishTL(g, body, turret, gunPivot, slide, muzzle, [2.9, 2.6, 4.8], [0, 1.2, 0], [new V(0.6, 0.9, 2.2)], { elev: [-0.1, 0.9] });
  };

  // ---------- site antiaérien fixe ----------
  M.aaturret = (tint) => {
    const P = liv(tint), m = mats(P), g = new THREE.Group(), body = new THREE.Group(), radar = new THREE.Group(); g.add(body);
    const sand = lam('#b8a67a'), conc = lam('#8a8e92');
    cyl(2.6, 2.8, 0.5, conc, 18, body).position.y = 0.25; cyl(2.0, 2.2, 0.7, conc, 16, body).position.y = 0.85;
    for (let i = 0; i < 14; i++) { const a = i * Math.PI * 2 / 14; box(1.1, 0.6, 0.7, sand, Math.cos(a) * 2.9, 0.3 + (i % 2) * 0.5, Math.sin(a) * 2.9, body).rotation.y = -a; }   // anneau de sacs de sable
    for (let i = 0; i < 4; i++) box(0.5, 0.18, 0.5, m.dark, -1.6 + i * 1.0, 0.1, 2.6, body);
    box(1.2, 0.8, 1.0, m.light, 2.2, 0.9, -1.4, body); box(1.2, 0.04, 1.0, m.camo, 2.2, 1.32, -1.4, body);                              // caisse de munitions
    const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 1.2, 0); body.add(turret);
    cyl(1.1, 1.2, 0.2, m.metal, 14, turret).position.y = 0.1;
    plateY([[-0.8, -0.9], [0.8, -0.9], [1.3, -0.1], [1.3, 0.9], [0.9, 1.2], [-0.9, 1.2], [-1.3, 0.9], [-1.3, -0.1]], 0.8, m.hull, 0.07, turret).position.y = 0.15;
    box(1.8, 0.03, 1.2, m.camo, 0, 0.98, 0.15, turret);
    box(0.14, 0.7, 0.14, m.metal, 0, 1.3, 0.8, turret); radar.position.set(0, 1.75, 0.8); turret.add(radar); box(1.5, 0.7, 0.1, m.hull, 0, 0.1, 0, radar); box(1.5, 0.05, 0.2, m.dark, 0, 0.5, 0, radar); box(0.12, 0.12, 0.4, m.metal, 0, -0.3, 0.25, radar);
    const gunPivot = new THREE.Group(); gunPivot.position.set(0, 0.6, -0.8); turret.add(gunPivot); const slide = new THREE.Group(); gunPivot.add(slide);
    for (const sx of [-1, 1]) { box(0.4, 0.4, 0.7, m.dark, sx * 0.85, 0, 0, slide); cylZ(0.14, 0.15, 0.7, m.dark, 10, sx * 0.85, 0, -0.5, slide); cylZ(0.075, 0.075, 2.8, m.metal, 10, sx * 0.85, 0, -1.9, slide); cylZ(0.11, 0.11, 0.9, m.hull, 10, sx * 0.85, 0, -1.1, slide); cylZ(0.1, 0.1, 0.3, m.black, 8, sx * 0.85, 0, -3.3, slide); }
    box(2.2, 0.1, 0.5, m.metal, 0, 0, -0.1, slide);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -3.5); slide.add(muzzle);
    return finishTL(g, body, turret, gunPivot, slide, muzzle, [6.2, 3.6, 6.2], [0, 1.6, 0], [new V(0, 1.0, 1.0)], { keep: [radar], anim: (dt) => { radar.rotation.y += dt * 3.2; }, elev: [-0.05, 1.3] });
  };

  // ---------- patrouilleur côtier ----------
  M.boat = (tint) => {
    const P = liv(tint === undefined ? 2 : tint), m = mats(P), g = new THREE.Group(), body = new THREE.Group(), radar = new THREE.Group(); g.add(body);
    profileX([[5.2, 0.0], [-3.6, 0.0], [-5.2, 0.9], [-5.6, 1.5], [-3.8, 1.5], [4.8, 1.5], [5.3, 1.1]], 2.6, m.hull, 0.1, body);
    profileX([[5.1, 0.05], [-3.5, 0.05], [-4.2, 0.45], [5.0, 0.45]], 2.64, lam('#7a2a22'), 0.05, body);
    box(2.5, 0.1, 9.4, m.light, 0, 1.55, 0, body);
    for (const sx of [-1, 1]) { box(0.05, 0.4, 9.2, m.dark, sx * 1.2, 1.8, 0, body); for (let i = 0; i < 9; i++) box(0.04, 0.4, 0.04, m.metal, sx * 1.2, 1.8, -4.4 + i * 1.1, body); }
    box(1.9, 1.1, 2.8, m.hull, 0, 2.15, 1.4, body); box(1.6, 0.9, 1.6, m.hull, 0, 3.1, 1.2, body); box(1.62, 0.3, 0.06, m.glass, 0, 3.15, 0.38, body); for (const sx of [-1, 1]) box(0.05, 0.3, 1.4, m.glass, sx * 0.83, 3.15, 1.2, body);
    box(2.0, 0.1, 1.8, m.dark, 0, 3.6, 1.2, body); box(0.12, 1.8, 0.12, m.metal, 0, 4.5, 1.6, body);
    radar.position.set(0, 5.5, 1.6); body.add(radar); box(1.4, 0.4, 0.08, m.dark, 0, 0, 0, radar);
    cyl(0.025, 0.025, 1.6, m.metal, 4, body).position.set(0.4, 5.5, 1.2);
    for (const sx of [-1, 1]) { box(0.7, 0.5, 0.9, m.dark, sx * 0.9, 2.0, 3.2, body); cylZ(0.05, 0.05, 0.9, m.metal, 6, sx * 0.9, 2.5, 2.9, body); }
    box(0.6, 0.04, 1.2, basic(P.acc), 0, 1.62, 3.9, body);
    const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(0, 1.6, -2.6); body.add(turret);
    cyl(0.7, 0.75, 0.14, m.metal, 12, turret).position.y = 0.07;
    plateY([[-0.4, -0.7], [0.4, -0.7], [0.75, -0.1], [0.75, 0.55], [0.5, 0.8], [-0.5, 0.8], [-0.75, 0.55], [-0.75, -0.1]], 0.5, m.hull, 0.06, turret).position.y = 0.12;
    const gunPivot = new THREE.Group(); gunPivot.position.set(0, 0.35, -0.7); turret.add(gunPivot); const slide = new THREE.Group(); gunPivot.add(slide);
    cylZ(0.12, 0.14, 0.45, m.dark, 10, 0, 0, -0.1, slide); cylZ(0.08, 0.08, 2.6, m.hull, 10, 0, 0, -1.5, slide); cylZ(0.11, 0.11, 0.6, m.dark, 10, 0, 0, -1.2, slide); box(0.22, 0.14, 0.26, m.black, 0, 0, -2.9, slide);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -3.1); slide.add(muzzle);
    return finishTL(g, body, turret, gunPivot, slide, muzzle, [3.0, 6.0, 11.6], [0, 2.6, 0], [new V(0, 1.7, 4.5)], { keep: [radar], anim: (dt) => { radar.rotation.y += dt * 2.6; }, elev: [-0.05, 0.8] });
  };

  // ---------- mine navale flottante (explose si on la touche : une cible comme une autre) ----------
  M.mine = () => {
    const g = new THREE.Group(), dark = lam('#2c3036'), rust = lam('#5a3a2a'), red = basic('#ff3a2a');
    const sph = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), dark); g.add(sph);
    for (let r = 0; r < 3; r++) cyl(1.22, 1.22, 0.1, rust, 16, g).position.y = (r - 1) * 0.65;
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0.7, -0.7, 0], [-0.7, -0.7, 0], [0, 0.7, 0.7], [0, 0.7, -0.7], [0, -0.7, 0.7], [0, -0.7, -0.7], [0.7, 0, 0.7], [-0.7, 0, 0.7], [0.7, 0, -0.7], [-0.7, 0, -0.7]];
    for (const d of dirs) { const l = Math.hypot(d[0], d[1], d[2]), h = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 0.7, 6), dark), t = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), red); const n = new V(d[0] / l, d[1] / l, d[2] / l); h.position.copy(n).multiplyScalar(1.5); h.quaternion.setFromUnitVectors(new V(0, 1, 0), n); t.position.copy(n).multiplyScalar(1.9); g.add(h); g.add(t); }
    cyl(0.12, 0.12, 2.4, rust, 6, g).position.y = -2.3;
    g.userData = { gen: true, flying: true, size: [4.2, 4.2, 4.2], center: [0, 0, 0], firePoints: [new V(0, 0, 0)], anim: (dt, t) => { g.rotation.y += dt * 0.4; g.position.y = Math.sin(t * 1.2) * 0.3; } };
    return bake(g, []);
  };
})();

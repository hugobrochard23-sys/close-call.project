/* Niveau 3 — CANYON (séquence 3, 23,60–36,03 s). HUD C.
 * OBSERVÉ : coucher de soleil orange, collines vertes quadrillées, voie ferrée sur pont (rails, garde-corps), tunnel à bandes
 * de danger, graffiti "NO MISSILES", lasers rouges, viaduc à arches, immeuble sombre, soldat qui tire un missile,
 * fosse à bords néon sur un toit avec un char au fond (cible). ESTIMATION : distances, hauteurs, tracé. */
CC.Levels.push({
  id: 'canyon', fuel: 15, name: 'CANYON', hud: 'C', mode: 'style', impactVariant: 'orange', seed: 33, parTime: 14,
  refSegment: { start: 23.6, end: 36.03, fire: 23.67 },
  launcher: { type: 'shoulder', pos: [0, 31.8, 10], yaw: 0, pitch: -1 },
  menuView: { center: [0, 40, -250], radius: 160, height: 60 },
  killY: -40,
  env: {
    sky: { top: '#140a08', horizon: '#b04a1c', bottom: '#2a120a', sunColor: '#301006', sunSize: 900 },   // v003 : pas de disque solaire visible
    fog: { color: '#26221c', near: 90, far: 700 },
    hemi: { sky: '#9a9078', ground: '#101a0e', intensity: 0.38 },   // v004 : moins orange (31,22,10 / réf. 33,31,22)
    ambient: { color: '#ffffff', intensity: 0.14 },
    sun: { color: '#ffa860', intensity: 0.55, dir: [0.25, 0.22, -1] },   // v002 : scène trop claire (Δ luminance +12)
    postfx: { vignette: 0.55, vignetteColor: '#1a0806', tint: '#fff0e6', halftone: 0.35, lift: '#040004', saturation: 0.8 },
  },
  route: [[0, 31.8, 10], [0, 33, -20], [0, 33.5, -80], [0, 35, -140], [0, 35, -235], [0, 35, -330], [0, 31, -370], [0, 30, -420], [0, 24, -480],
    [0, 20, -520], [0, 27, -560], [0, 34, -640], [0, 31, -670], [0, 25.5, -681], [0, 15, -688], [0, 11.8, -691]],
  routeActions: [{ from: 10, to: 11, engineOff: true }, { from: 11, to: 13, retro: true, hold: 1.1 }],   // v005 : freinage limité à 1,1 s (réf. ≈ 26–43 m/s, pas 3)

  build(b) {
    const r = b.rng, U = CC.U;
    const inPit = (x, z) => Math.abs(x) < 30 && Math.abs(z + 690) < 30;
    b.terrain({
      x0: -600, z0: -1000, n: 121, step: 10, mat: 'grass',
      height: (x, z) => {
        const ax = Math.abs(x);
        let h = 95 * U.smooth(38, 170, ax) + 30 * U.fbm2(x * 0.012, z * 0.012, 3, 9) * U.smooth(20, 90, ax);
        if (z < -130 && z > -340) h += 75 * U.smooth(90, 30, Math.abs(z + 235)) * U.smooth(12, 30, ax);  // colline du tunnel
        if (ax < 16 && z < -130 && z > -340) h = Math.min(h, 0);
        if (inPit(x, z)) h = Math.min(h, -2);
        return h - 1;
      },
      color: (x, y) => { const k = 0.55 + Math.min(0.25, Math.max(0, y) / 400); return [k * 0.8, k, k * 0.75]; },
    });
    // Pont ferroviaire (z 20 → -300), tablier à 30 m
    b.box({ p: [0, 29.7, -170], s: [10, 0.6, 380], mat: 'concreteDark', ground: true });
    for (let z = 10; z > -360; z -= 28) if (z > -135 || z < -335) b.box({ p: [0, 14.7, z], s: [2.4, 29.4, 2.4], mat: 'concreteDark' });
    for (const x of [-0.8, 0.8]) b.box({ p: [x, 30.1, -170], s: [0.14, 0.2, 380], mat: 'rail', collide: false });
    for (let z = 18; z > -360; z -= 1.6) b.box({ p: [0, 30.03, z], s: [2.4, 0.08, 0.35], mat: 'col:#3a2a22', collide: false, shadow: false });
    for (const x of [-4.9, 4.9]) {
      b.box({ p: [x, 31.15, -170], s: [0.12, 0.12, 380], mat: 'rail' });
      for (let z = 18; z > -360; z -= 4) b.box({ p: [x, 30.6, z], s: [0.1, 1.1, 0.1], mat: 'rail', collide: false });
    }
    // Tunnel (x -7..7, y 30..41) à travers la colline, z -140..-330
    b.box({ p: [-23.5, 36, -235], s: [33, 78, 190], mat: { side: 'rock', top: 'grass' } });
    b.box({ p: [23.5, 36, -235], s: [33, 78, 190], mat: { side: 'rock', top: 'grass' } });
    b.box({ p: [0, 58, -235], s: [14, 34, 190], mat: { side: 'rock', top: 'grass', bottom: 'concreteDark' } });
    b.box({ p: [0, 14.7, -235], s: [14, 29.4, 190], mat: 'concreteDark' });
    b.box({ p: [0, 42.2, -139.7], s: [14, 2.4, 0.4], mat: 'hazard', collide: false });      // bandes de danger (OBSERVÉ)
    b.box({ p: [0, 42.2, -330.3], s: [14, 2.4, 0.4], mat: 'hazard', collide: false });
    for (let z = -150; z > -325; z -= 16) b.box({ p: [0, 40.8, z], s: [1.2, 0.2, 3], mat: 'emis:#ffc070', collide: false, shadow: false });
    const gTex = CC.Textures.special('graffiti');
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshLambertMaterial({ map: gTex, transparent: true }));
    gm.position.set(-6.95, 34, -158); gm.rotation.y = Math.PI / 2; b.add(gm);
    // Lasers rouges (ESTIMATION : mortels)
    b.laser([-160, 46, -400], [160, 46, -400]);
    b.laser([-160, 15, -445], [160, 15, -445]);
    // Viaduc à arches (z -520), ouverture centrale x -11..11 sous y 28
    b.box({ p: [0, 38, -520], s: [340, 4, 8], mat: 'concreteDark' });
    for (const x of [-14, 14, -44, 44, -74, 74, -104, 104, -134, 134]) {
      b.box({ p: [x, 18, -520], s: [6, 40, 8], mat: 'concreteDark' });
      b.box({ p: [x + Math.sign(x) * 15, 32.5, -520], s: [24, 7, 8], mat: 'concreteDark' });
    }
    b.box({ p: [0, 33, -520], s: [22, 6, 8], mat: 'concreteDark' });
    for (const x of [-4.9, 4.9]) b.box({ p: [x, 40.6, -520], s: [0.12, 1.2, 8], mat: 'rail', collide: false });
    // Immeuble sombre (décor) et bâtiment à fosse néon
    b.box({ p: [-40, 17, -600], s: [26, 34, 24], mat: { side: 'facadeDark', top: 'concreteDark' } });
    b.box({ p: [44, 12, -615], s: [20, 24, 30], mat: { side: 'facadeDark', top: 'concreteDark' } });
    const X = 9;
    b.box({ p: [-14.5, 11.8, -690], s: [11, 23.6, 40], mat: { side: 'facadeDark', top: 'concreteDark' } });
    b.box({ p: [14.5, 11.8, -690], s: [11, 23.6, 40], mat: { side: 'facadeDark', top: 'concreteDark' } });
    b.box({ p: [0, 11.8, -704.5], s: [18, 23.6, 11], mat: { side: 'facadeDark', top: 'concreteDark' } });
    b.box({ p: [0, 11.8, -675.5], s: [18, 23.6, 11], mat: { side: 'facadeDark', top: 'concreteDark' } });
    b.box({ p: [0, 5, -690], s: [18, 10, 18], mat: 'blueFloor', ground: true });
    // parois de la fosse (bleu/rose) + bordure néon
    b.box({ p: [-X + 0.1, 17, -690], s: [0.2, 14, 18], mat: 'blueFloor', tint: '#ffb0d0', collide: false });
    b.box({ p: [X - 0.1, 17, -690], s: [0.2, 14, 18], mat: 'blueFloor', tint: '#ffb0d0', collide: false });
    b.box({ p: [0, 17, -690 - X + 0.1], s: [18, 14, 0.2], mat: 'blueFloor', collide: false });
    b.box({ p: [0, 17, -690 + X - 0.1], s: [18, 14, 0.2], mat: 'blueFloor', collide: false });
    for (const [px, pz, sx, sz] of [[-X, -690, 0.4, 18.8], [X, -690, 0.4, 18.8], [0, -690 - X, 18.8, 0.4], [0, -690 + X, 18.8, 0.4]]) b.box({ p: [px, 23.8, pz], s: [sx, 0.4, sz], mat: 'basic:#6ad8ff', collide: false, shadow: false });
    // lanterneaux sur le toit
    for (let i = 0; i < 6; i++) {
      const px = r.sign() * r.range(11, 18), pz = -690 + r.range(-17, 17);
      b.box({ p: [px, 24.6, pz], s: [3, 1.2, 3], mat: 'blueFloor', tint: r() < 0.5 ? '#ffffff' : '#ffc0d8' });
    }
    b.soldier([14, 23.6, -680], 180);
    b.target('tank', [0, 10, -691], 180, { detectRange: 50 });
  },
});

/* Niveau 9 — NIGHT CANYON (v023, CHOIX d'Hugo : CANYON de nuit façon NIGHT FOREST + convoi de tanks).
 * Canyon sinueux sous la lune, visibilité réduite ; arches rocheuses à passer dessous, crête à franchir, piliers.
 * Convoi de 5 tanks (gardes) au fond du canyon, qui tire en salves. Cible : un hélicoptère qui s'enfuit le long du canyon. */
(function () {
  const U = CC.U;
  const xc = (z) => 45 * Math.sin(z / 170) + 18 * Math.sin(z / 61);   // axe du canyon
  const FLOOR = 22, FLY = 24;                                         // demi-largeur du fond plat, altitude de vol
  // obstacles : type, z, altitude de passage
  const obstacles = [['arch', -300, 16], ['pillar', -430, FLY], ['ridge', -560, 34], ['arch', -700, 15], ['pillar', -820, FLY], ['ridge', -930, 36]];
  const route = [[xc(30), 26, 30]];
  for (let z = -10; z >= -1080; z -= 30) {
    const near = obstacles.find((o) => Math.abs(o[1] - z) < 36);
    let x = xc(z), y = near ? near[2] : FLY;
    if (near && near[0] === 'pillar') x += 9;                         // les piliers sont à gauche de l'axe : passer à droite
    route.push([x, y, z]);
  }
  route.push([xc(-1100), 40, -1100], [xc(-1115), 62, -1115]);
  const heliPath = route.filter((p) => p[2] <= -160).map((p) => [p[0], p[1] + 4, p[2]]);

  CC.Levels.push({
    id: 'nightcanyon', fuel: 18, name: 'NIGHT CANYON', hud: 'C', mode: 'style', impactVariant: 'cyan', seed: 99, parTime: 24,
    launcher: { type: 'shoulder', pos: [xc(30), 26, 30], yaw: 0, pitch: -2 },
    menuView: { center: [0, 30, -500], radius: 230, height: 110 },
    killY: -40,
    env: {
      sky: { top: '#000000', horizon: '#0a1020', bottom: '#000000', stars: true },
      fog: { color: '#0a1020', near: 90, far: 460 },
      hemi: { sky: '#9fb3d8', ground: '#2a3040', intensity: 1.35 },
      ambient: { color: '#ffffff', intensity: 0.34 },
      sun: { color: '#c8d6ff', intensity: 0.85, dir: [-0.3, 0.8, 0.4] },   // clair de lune
      postfx: { vignette: 0.6, vignetteColor: '#000000', chromatic: 0.007, halftone: 0.3, lift: '#080a14', saturation: 0.85 },
    },
    route,
    lookAhead: 18, terminalRange: 60,

    build(b) {
      const r = b.rng;
      const height = (x, z) => {
        const d = Math.abs(x - xc(z));
        let h = 105 * U.smooth(FLOOR, 75, d) + 22 * U.fbm2(x * 0.02, z * 0.02, 3, 5) * U.smooth(FLOOR - 6, 60, d);
        if (z > 60) h = Math.max(h, 80 * U.smooth(60, 120, z));        // falaise derrière le départ
        return h;
      };
      b.terrain({ x0: -680, z0: -1250, n: 113, step: 12, mat: 'rock', height,
        color: (x, y) => { const k = 0.5 + Math.min(0.3, Math.max(0, y) / 300); return [k * 0.85, k * 0.9, k]; } });
      b.box({ p: [xc(30), 23.4, 30], s: [8, 1, 8], mat: 'rock' });   // rebord du lanceur
      // obstacles
      for (const [type, z, y] of obstacles) {
        const x = xc(z);
        if (type === 'arch') b.box({ p: [x, y + 14, z], s: [140, 18, 14], mat: 'rock' });              // passer dessous (dessous à y + 5)
        else if (type === 'ridge') b.box({ p: [x, (y - 6) / 2, z], s: [140, y - 6, 18], mat: 'rock' });  // passer dessus
        else if (type === 'pillar') {                                                                   // à gauche de l'axe
          b.box({ p: [x - 6, 40, z], s: [12, 80, 12], mat: 'rock' });
          b.box({ p: [x - 16, 40, z + 30], s: [10, 80, 10], mat: 'rock' });
        }
      }
      // rochers épars sur le fond (décor)
      for (let i = 0; i < 90; i++) {
        const z = -r() * 1100, x = xc(z) + (r() - 0.5) * 2 * (FLOOR - 4);
        b.rockLump(x, 0, z, r.range(1, 2.6));
      }
      // convoi de tanks (gardes) au fond du canyon, de part et d'autre de l'axe
      for (const [z, s] of [[-200, 1], [-420, -1], [-560, 1], [-760, -1], [-880, 1]]) b.guard('tank', [xc(z) + s * 10, 0, z], 0, {});
      // la cible : hélicoptère qui s'enfuit le long du canyon
      b.target('heli', heliPath[0], 0, { path: heliPath, fleeSpeed: 48 });
    },
  });
})();

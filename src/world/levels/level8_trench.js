/* Niveau 8 — TRENCH RUN (v023, CHOIX d'Hugo : inspiré de la tranchée de Star Wars, mélange CANYON + CONSTRUCTION).
 * Tranchée métallique de 20 m de large et 32 m de profondeur, longue de plus d'un kilomètre, sous un ciel noir étoilé.
 * Obstacles : poutres (passer dessus ou dessous), piliers qui ferment un côté, lasers mortels en travers.
 * Tourelles anti-aériennes (tanks de garde sur piédestal) sur les bords, qui tirent en salves.
 * Cible : un hélicoptère qui s'enfuit dans la tranchée puis en sort par le haut ; il faut le rattraper. */
(function () {
  const W = 10, DEPTH = 32, Y = -16;                    // demi-largeur (20 m : de quoi esquiver), profondeur, altitude de vol
  // obstacles le long de la tranchée : type, z, et le passage (x, y) que la route emprunte
  const obstacles = [
    ['beamLow', -100, 0, -9], ['laserMid', -150, 0, -26], ['beamHigh', -200, 0, -24], ['pillarL', -250, 5, -16],
    ['laserLow', -300, 0, -8], ['beamLow', -350, 0, -9], ['pillarR', -400, -5, -16], ['beamHigh', -450, 0, -24],
    ['pillarL', -500, 5, -20], ['laserMid', -550, 0, -26], ['beamLow', -600, 0, -9], ['pillarR', -650, -5, -12],
    ['beamHigh', -700, 0, -24], ['laserLow', -750, 0, -8], ['pillarL', -800, 5, -16], ['beamLow', -850, 0, -9],
    ['beamHigh', -900, 0, -24], ['pillarR', -950, -5, -18], ['laserMid', -1000, 0, -8],
  ];
  const route = [[0, Y, 40], [0, Y, -40]];
  for (const o of obstacles) { route.push([o[2], o[3], o[1] + 22]); route.push([o[2], o[3], o[1]]); route.push([o[2], o[3], o[1] - 22]); }
  route.push([0, Y, -1040], [0, -4, -1060], [0, 22, -1085]);
  const heliPath = [[0, Y, -150]].concat(route.filter((p) => p[2] < -150)).concat([[0, 30, -1095]]);

  CC.Levels.push({
    id: 'trench', fuel: 22, name: 'TRENCH RUN', hud: 'C', mode: 'style', impactVariant: 'cyan', seed: 88, parTime: 26,
    launcher: { type: 'shoulder', pos: [0, Y, 40], yaw: 0, pitch: 0 },
    menuView: { center: [0, -10, -450], radius: 220, height: 90 },
    killY: -70,
    env: {
      sky: { top: '#000000', horizon: '#0b0e16', bottom: '#000000', stars: true },
      fog: { color: '#05070c', near: 140, far: 760 },
      hemi: { sky: '#8a98b4', ground: '#1c1d22', intensity: 0.75 },
      ambient: { color: '#ffffff', intensity: 0.22 },
      sun: { color: '#e4ecff', intensity: 0.85, dir: [0.55, 0.75, 0.35] },
      postfx: { vignette: 0.55, vignetteColor: '#000000', chromatic: 0.006, halftone: 0.3, lift: '#060810', saturation: 0.9 },
    },
    route,
    lookAhead: 16, terminalRange: 60,

    build(b) {
      const r = b.rng;
      const Z0 = 70, Z1 = -1110, L = Z0 - Z1, zc = (Z0 + Z1) / 2;
      // plaine métallique de part et d'autre (les deux blocs forment aussi les parois de la tranchée) et fond
      for (const s of [-1, 1]) b.box({ p: [s * (W + 150), -DEPTH / 2, zc], s: [300, DEPTH, L], mat: { side: 'metal', top: 'concreteDark' }, ground: true });
      b.box({ p: [0, -DEPTH - 1, zc], s: [2 * W, 2, L], mat: 'concreteDark', ground: true });
      b.box({ p: [0, -DEPTH / 2, Z0 + 1], s: [2 * W, DEPTH, 2], mat: 'metal' });           // fond derrière le lanceur
      b.box({ p: [0, Y - 1.8, 40], s: [6, 0.6, 6], mat: 'hazard' });                        // plate-forme du lanceur
      // reliefs sur les parois (décor sans collision) et balises lumineuses en haut des parois
      for (let z = Z0 - 10; z > Z1; z -= 7) {
        for (const s of [-1, 1]) {
          if (r() < 0.7) b.box({ p: [s * (W - 0.25), -DEPTH + 2 + r() * (DEPTH - 6), z + r() * 4], s: [0.5, 1 + r() * 4, 1 + r() * 5], mat: 'metal', tint: '#b8c0d0', collide: false, shadow: false });
          if (Math.abs(z) % 35 < 7) b.box({ p: [s * (W - 0.1), -1.2, z], s: [0.2, 0.4, 1.6], mat: 'emis:#ff5a3a', collide: false, shadow: false });
        }
      }
      // plaine : blocs de « coque » (décor) ; quelques-uns collisionnables loin de la tranchée
      for (let i = 0; i < 160; i++) {
        const s = r() < 0.5 ? -1 : 1, x = s * (W + 6 + r() * 120), z = Z0 - r() * L;
        const h = 0.5 + r() * (r() < 0.1 ? 14 : 3);
        b.box({ p: [x, h / 2, z], s: [2 + r() * 10, h, 2 + r() * 10], mat: 'metal', tint: '#9aa4b8', collide: Math.abs(x) > 30 });
      }
      // obstacles dans la tranchée
      for (const o of obstacles) {
        const [type, z] = o;
        if (type === 'beamLow') b.box({ p: [0, -DEPTH + 7, z], s: [2 * W, 14, 4], mat: 'metal', tint: '#c8ccd4' });
        else if (type === 'beamHigh') b.box({ p: [0, -7, z], s: [2 * W, 14, 4], mat: 'metal', tint: '#c8ccd4' });
        else if (type === 'pillarL') b.box({ p: [-W / 2 - 0.5, -DEPTH / 2, z], s: [W + 1, DEPTH, 5], mat: 'metal', tint: '#b0b8c8' });
        else if (type === 'pillarR') b.box({ p: [W / 2 + 0.5, -DEPTH / 2, z], s: [W + 1, DEPTH, 5], mat: 'metal', tint: '#b0b8c8' });
        else if (type === 'laserMid') b.laser([-W, -18, z], [W, -18, z]);
        else if (type === 'laserLow') b.laser([-W, -24, z], [W, -24, z]);
        if (type.startsWith('beam')) b.box({ p: [0, type === 'beamLow' ? -DEPTH + 14.1 : -14.1, z], s: [2 * W, 0.2, 0.6], mat: 'hazard', collide: false });
      }
      // tourelles anti-aériennes sur piédestal, au bord de la tranchée (elles voient la roquette dans la tranchée)
      for (const [s, z] of [[-1, -180], [1, -300], [-1, -420], [1, -540], [-1, -640], [1, -760], [-1, -880], [1, -980]]) {
        b.box({ p: [s * (W + 3), 3, z], s: [6, 6, 6], mat: 'metal', tint: '#7c8494' });   // piédestal de 6 m : vue plongeante dans la tranchée
        b.guard('tank', [s * (W + 3), 6, z], s < 0 ? -90 : 90, {});
      }
      // tour au bout de la tranchée : tire de face, dans l'axe (comme la tranchée de Star Wars)
      b.box({ p: [0, 4, -1112], s: [10, 8, 10], mat: 'metal', tint: '#7c8494' });
      b.guard('tank', [0, 8, -1112], 180, {});
      // la cible : hélicoptère qui s'enfuit
      b.target('heli', heliPath[0], 0, { path: heliPath, fleeSpeed: 55 });
    },
  });
})();

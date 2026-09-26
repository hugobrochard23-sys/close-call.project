/* Niveau 6 — CHANTIER (séquence 6, 64,45–79,25 s). HUD C sans compteur SPEED (OBSERVÉ).
 * OBSERVÉ : dalle de béton quadrillée en hauteur, piliers et poutres (slalom), grue jaune, silhouettes de tours claires,
 * flèche verte vers une trémie, longue descente de cage d'escalier (≈ 6 s), fenêtre ouverte sur le ciel,
 * hélicoptère camouflé (cible, impact à 14,7 s).
 * ESTIMATION : dimensions (v002/v003 : toit de 400 m et cage d'escalier de 140 m pour retrouver la durée mesurée). */
(function () {
  const T = 160;           // niveau de la dalle
  const HZ0 = -388, HZ1 = -368;   // trémie (z)
  const W = 8;             // demi-largeur de la cage d'escalier (v003 : 16 m, volées de 5 m)
  const ZE = -410;         // façade nord (fenêtre du couloir)
  CC.Levels.push({
    id: 'construction', fuel: 10, name: 'CONSTRUCTION', hud: 'C', hideSpeed: true, mode: 'style', impactVariant: 'orange', seed: 66, parTime: 15,
    refSegment: { start: 64.45, end: 79.25, fire: 64.48 },
    launcher: { type: 'shoulder', pos: [0, T + 2.2, 4], yaw: 0, pitch: 3 },
    menuView: { center: [0, T + 2, -120], radius: 90, height: 30 },
    killY: -5,
    env: {
      sky: { top: '#5b83ab', horizon: '#c9d5df', bottom: '#9ea9b1', sunColor: '#ffffff', sunSize: 900 },
      fog: { color: '#c8d2dc', near: 180, far: 1000 },
      hemi: { sky: '#e2eaf4', ground: '#6a6c70', intensity: 0.56 },
      ambient: { color: '#f4f8ff', intensity: 0.24 },
      sun: { color: '#fff3ea', intensity: 0.6, dir: [-0.5, 0.75, 0.3] },          // v004 : moins lumineux (138,132,120 / réf. 122,118,117)
      postfx: { vignette: 0.5, vignetteColor: '#1d1d1f', halftone: 0.22, tint: '#fbf5f3', lift: '#040810', saturation: 1.08 },
    },
    route: [[0, T + 2.2, 4], [0, T + 4, -20], [-4, T + 5, -55], [4, T + 4.5, -95], [-4, T + 4.5, -135], [4, T + 4.5, -175], [-3, T + 4, -215], [4, T + 4.5, -255],
      [-4, T + 4.5, -295], [3, T + 4, -330], [0, T + 3.5, -350], [0, T + 3, -362], [0, T - 4, -376], [0, T - 30, -379], [0, T - 70, -380], [0, T - 110, -380],
      [0, 40, -381], [0, 26, -385], [0, 20, -396], [0, 20, -410], [0, 26, -435], [0, 30, -456]],
    routeActions: [{ from: 5, to: 7, engineOff: true }, { from: 9, to: 12, retro: true }, { from: 12, to: 16, engineOff: true }],
    pnGain: 0.8, lookAhead: 16,

    build(b) {
      const r = b.rng;
      const side = { side: 'concreteWarm', top: 'concrete', bottom: 'concreteDark' };
      // Bâtiment en construction : plein sauf trémie (x -W..W, z HZ0..HZ1, y 12..T) et couloir (x -W..W, z ZE..HZ1, y 12..33)
      b.box({ p: [0, 6, -200], s: [60, 12, 420], mat: side });
      b.box({ p: [-(30 + W) / 2, (12 + T) / 2, -200], s: [30 - W, T - 12, 420], mat: side });
      b.box({ p: [(30 + W) / 2, (12 + T) / 2, -200], s: [30 - W, T - 12, 420], mat: side });
      b.box({ p: [0, (12 + T) / 2, (HZ1 + 10) / 2], s: [2 * W, T - 12, 10 - HZ1], mat: side });
      b.box({ p: [0, (33 + T) / 2, (ZE + HZ0) / 2], s: [2 * W, T - 33, HZ0 - ZE], mat: side });
      b.floor({ x0: -30, x1: 30, z0: ZE, z1: 10, y: T + 0.5, t: 0.5, mat: 'concrete', holes: [[-W, W, HZ0, HZ1]] });
      // cage d'escalier : volées alternées le long des murs est/ouest (OBSERVÉ : volées successives)
      for (let k = 0; k * 9 < T - 20; k++) {
        const east = k % 2 === 0, x = east ? W - 2.5 : -W + 2.5;
        for (let i = 0; i < 10; i++) {
          const y = T - 1 - (k * 10 + i) * 0.9;
          if (y < 14) break;
          const z = east ? HZ1 - 1 - i * 1.8 : HZ0 + 1 + i * 1.8;
          b.box({ p: [x, y, z], s: [5, 0.5, 1.8], mat: 'concreteWarm', ground: true });
        }
      }
      // dalle : piliers, piliers de slalom, poutres, blocs
      const px = [-24, -12, 12, 24];
      for (const x of px) for (let z = 0; z > -400; z -= 15) b.box({ p: [x, T + 6.5, z], s: [2, 12, 2], mat: 'concrete' });
      for (const [x, z] of [[8, -55], [-8, -95], [8, -135], [-8, -175], [8, -215], [-8, -255], [8, -295], [-8, -330]]) b.box({ p: [x, T + 6.5, z], s: [2, 12, 2], mat: 'concrete' });
      for (let z = 0; z > -400; z -= 15) b.box({ p: [0, T + 12.8, z], s: [50, 1.4, 1.4], mat: 'concrete' });
      for (const x of px) b.box({ p: [x, T + 12.8, -200], s: [1.4, 1.4, 400], mat: 'concrete' });
      b.box({ p: [-16, T + 2, -40], s: [8, 3, 5], mat: 'concreteDark' });
      b.box({ p: [17, T + 1.5, -120], s: [6, 2, 10], mat: 'concreteDark' });
      b.box({ p: [-17, T + 2.5, -200], s: [6, 4, 8], mat: 'concreteWarm' });
      b.box({ p: [0, T + 3, -402], s: [30, 5, 8], mat: 'concreteWarm' });
      // grue jaune
      b.box({ p: [-34, (T + 30) / 2, -60], s: [2.4, T + 30, 2.4], mat: 'col:#d8a820' });
      b.box({ p: [-20, T + 28, -60], s: [40, 1.8, 1.8], mat: 'col:#d8a820' });
      b.box({ p: [-50, T + 26, -60], s: [6, 5, 4], mat: 'concreteDark' });
      b.box({ p: [-8, T + 24, -60], s: [0.1, 8, 0.1], mat: 'col:#202020', collide: false });
      // flèche verte au-dessus de la trémie (OBSERVÉ)
      b.arrow([0, T + 6, (HZ0 + HZ1) / 2], 0);
      // sol lointain + silhouettes de tours claires (OBSERVÉ)
      b.box({ p: [0, -1, -200], s: [1100, 2, 1100], mat: 'asphalt', ground: true });
      b.skyline(0, -200, 240, 780, 120, 100, 320, '#e1e8ee', 0);
      for (let i = 0; i < 18; i++) {
        const a = r.range(0, Math.PI * 2), d = r.range(150, 280);
        const h = r.range(40, 140);
        b.box({ p: [Math.cos(a) * d, h / 2, -200 + Math.sin(a) * d], s: [r.range(15, 30), h, r.range(15, 30)], mat: { side: 'concreteWarm', top: 'concrete' } });
      }
      b.target('heliCamo', [0, 30, -460], 180, { drift: 5, driftSpeed: 0.4 });
    },
  });
})();

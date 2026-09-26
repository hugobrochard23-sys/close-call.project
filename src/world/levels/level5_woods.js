/* Niveau 5 — WOODS (séquence 5, 48,17–64,45 s). HUD B (chrono + SCORE).
 * OBSERVÉ : forêt sombre, herbe voxel sur sol quadrillé, silos rouges sur plateforme, cour bétonnée gris-bleu, maisons en briques
 * dont les murs et caisses explosent en cubes, forêt dense, toit en planches incliné survolé moteur coupé, fenêtre,
 * pièce en briques avec char (impact à 15,95 s).
 * ESTIMATION : implantation exacte (v002 : parcours ≈ 750 m pour retrouver la durée mesurée), nombre d'arbres. */
(function () {
  const route = [[0, 1.7, 0], [0, 2.8, -25], [0, 2.6, -48], [0, 2.6, -75], [0, 2.4, -100], [0, 2.4, -118], [0, 3.2, -140], [5, 3.5, -175], [-4, 3.5, -215],
    [4, 3.5, -250], [0, 3.2, -285], [0, 3, -320], [0, 2.6, -352], [0, 2.6, -372], [0, 3.5, -400], [5, 3.5, -435], [0, 5, -470],
    [0, 9.8, -492], [0, 11.6, -505], [0, 11.5, -560], [0, 11.5, -605], [0, 8, -625], [0, 4.5, -650], [-3, 4, -680], [0, 4, -705], [0, 3.8, -726], [0, 3.6, -738], [0, 1.6, -748]];
  CC.Levels.push({
    id: 'woods', fuel: 12, name: 'WOODS', hud: 'B', mode: 'score', impactVariant: 'cyan', seed: 55, pnGain: 0.5, lookAhead: 16,
    refSegment: { start: 48.17, end: 64.45, fire: 48.3 },
    launcher: { type: 'shoulder', pos: [0, 1.7, 0], yaw: 0, pitch: 2 },
    menuView: { center: [0, 6, -300], radius: 90, height: 26 },
    env: {
      sky: { top: '#040604', horizon: '#1d1a14', bottom: '#080a07' },
      fog: { color: '#141210', near: 45, far: 280 },
      hemi: { sky: '#c0a090', ground: '#3a2014', intensity: 0.75 },   // v003 : trop sombre et trop vert (32,32,10 / réf. 75,38,24)
      ambient: { color: '#ff8060', intensity: 0.55 },   // v004 : plus rouge (58,43,16 / réf. 75,38,24)
      sun: { color: '#ffd2a0', intensity: 0.5, dir: [-0.45, 0.6, 0.45] },
      postfx: { vignette: 0.55, vignetteColor: '#0c0806', chromatic: 0.006, halftone: 0.3, lift: '#100008', saturation: 0.8 },
    },
    route,
    routeActions: [{ from: 7, to: 10, engineOff: true }, { from: 13, to: 16, engineOff: true }, { from: 21, to: 24, engineOff: true }],

    build(b) {
      const r = b.rng, U = CC.U;
      const distRoute = U.routeDistXZ(route);
      b.terrain({ x0: -300, z0: -880, n: 151, step: 6, mat: 'grass', height: (x, z) => distRoute(x, z) < 12 ? 0 : 0.8 * (U.fbm2(x * 0.03, z * 0.03, 2, 3) - 0.3), color: () => [0.46, 0.44, 0.36] });
      for (let i = 0; i < 420; i++) b.box({ p: [r.range(-70, 70), 0.2, r.range(20, -800)], s: [0.5, 0.4, 0.5], mat: 'col:#2f6e22', collide: false });
      // plateforme en bois avec silos rouges (la route passe dessous)
      b.box({ p: [0, 5.3, -48], s: [26, 0.6, 16], mat: 'planks' });
      for (const x of [-12.5, -4.5, 4.5, 12.5]) for (const z of [-40.5, -55.5]) b.box({ p: [x, 2.5, z], s: [0.6, 5, 0.6], mat: 'cream' });
      for (const x of [-9, -3, 3, 9]) {
        b.cylinder({ p: [x, 10.6, -48], rad: 2.3, h: 10, seg: 10, mat: 'col:#c9361f' });
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; b.box({ p: [x + Math.cos(a) * 2.25, 10.6, -48 + Math.sin(a) * 2.25], s: [0.3, 10, 0.3], mat: 'col:#5a1a10', collide: false }); }
      }
      // cour bétonnée gris-bleu (OBSERVÉ) + maison 1 aux murs cassables
      b.box({ p: [0, 0.06, -95], s: [56, 0.12, 80], mat: 'concreteDark', tint: '#8c9aac', collide: false });
      const brickHouse = (z0, z1, x0, x1, h, southBreak, northBreak) => {
        b.wall({ axis: 'x', at: z1, from: x0, to: x1, y0: 0, y1: h, t: 0.5, holes: [[-4, 4, 0, 4.6, true]] });
        b.wall({ axis: 'x', at: z0, from: x0, to: x1, y0: 0, y1: h, t: 0.5, holes: [[-4, 4, 0, 4.6, true]] });
        if (southBreak) b.brickWall([0, 2.3, z1], [8, 4.6, 0.5]);
        if (northBreak) b.brickWall([0, 2.3, z0], [8, 4.6, 0.5]);
        b.box({ p: [x0, h / 2, (z0 + z1) / 2], s: [0.5, h, z1 - z0], mat: 'brick' });
        b.box({ p: [x1, h / 2, (z0 + z1) / 2], s: [0.5, h, z1 - z0], mat: 'brick' });
        b.box({ p: [0, h + 0.2, (z0 + z1) / 2], s: [x1 - x0 + 1, 0.4, z1 - z0 + 1], mat: 'planks' });
      };
      brickHouse(-116, -100, -8, 8, 6, true, true);
      for (const x of [-6, -5, 5, 6.2]) b.crate([x, 0.8, -97 + r.range(-1, 1)], [1.6, 1.6, 1.6]);
      b.box({ p: [-22, 4, -80], s: [10, 8, 14], mat: { side: 'brick', top: 'planks' } });
      // piles de planches et murets de briques autour de la maison 1 (OBSERVÉ à 3,6 s)
      for (const [x, z, h] of [[-6.5, -84, 3.2], [6.8, -86, 2.4], [-7.5, -124, 2.8], [7, -128, 3.6], [-10, -140, 2], [9.5, -145, 2.6]]) b.box({ p: [x, h / 2, z], s: [4, h, 5], mat: 'planks' });
      for (const [x, z] of [[-12, -132], [12, -110]]) b.box({ p: [x, 1.5, z], s: [0.6, 3, 12], mat: 'brick' });
      b.box({ p: [24, 3.5, -122], s: [12, 7, 10], mat: { side: 'brick', top: 'planks' } });
      // maison 2 : porte ouverte au sud, mur nord cassable, caisses devant
      brickHouse(-372, -352, -9, 9, 6, false, true);
      for (const [x, z] of [[-5, -345], [-6.5, -347], [5.5, -344], [6.5, -346.5], [-5.5, -345, 1]]) b.crate([x, z === -345 && x === -5.5 ? 2.4 : 0.8, z], [1.6, 1.6, 1.6]);
      // grange : long toit en planches (110 m, faîtage ≈ 9,9 m) survolé au ras moteur coupé (OBSERVÉ 9,5–12 s)
      b.box({ p: [0, 2.25, -555], s: [22, 4.5, 110], mat: 'brick' });
      b.box({ p: [-5.45, 7.2, -555], s: [12.2, 0.5, 112], r: [0, 0, 26.5], mat: 'planks', ground: true });
      b.box({ p: [5.45, 7.2, -555], s: [12.2, 0.5, 112], r: [0, 0, -26.5], mat: 'planks', ground: true });
      // maison 4 : fenêtre sud, pièce avec le char (cible)
      b.wall({ axis: 'x', at: -738, from: -9, to: 9, y0: 0, y1: 7, t: 0.5, holes: [[-3.5, 3.5, 1.2, 6.5]], glass: 'warm' });
      b.wall({ axis: 'x', at: -760, from: -9, to: 9, y0: 0, y1: 7, t: 0.5 });
      b.box({ p: [-9, 3.5, -749], s: [0.5, 7, 22], mat: 'brick' }); b.box({ p: [9, 3.5, -749], s: [0.5, 7, 22], mat: 'brick' });
      b.box({ p: [0, 7.2, -749], s: [19, 0.4, 23], mat: 'planks' });
      b.box({ p: [0, 0.1, -749], s: [18, 0.2, 22], mat: 'brick', ground: true });
      for (const [x, z] of [[-7, -742], [-7, -756], [7, -743], [6.5, -757], [-5.5, -757]]) b.crate([x, 1.0, z], [1.6, 1.6, 1.6]);
      b.target('tank', [0, 0.2, -751], 180, { detectRange: 30 });
      // arbres (sans bloquer la route ni les maisons)
      const houses = [[-116, -100], [-372, -352], [-612, -498], [-760, -738], [-56, -40]];
      const blocked = (x, z) => distRoute(x, z) < 5.5 || (Math.abs(x) < 16 && houses.some(([a, c]) => z > a - 4 && z < c + 4)) || (Math.abs(x) < 30 && z < -55 && z > -135);
      let n = 0, guard = 0;
      while (n < 520 && guard++ < 12000) {
        const x = r.range(-140, 140), z = r.range(15, -820);
        if (blocked(x, z)) continue;
        b.tree(x, z, r.range(18, 34), r.range(0.4, 1.0));
        n++;
      }
      for (let i = 0; i < 30; i++) {
        const x = r.sign() * r.range(10, 60), z = r.range(-150, -720);
        if (blocked(x, z)) continue;
        b.box({ p: [x, r.range(8, 16), z], s: [0.35, 0.35, r.range(6, 12)], r: [r.range(-10, 10), r.range(0, 180), 0], mat: 'bark' });
      }
    },
  });
})();

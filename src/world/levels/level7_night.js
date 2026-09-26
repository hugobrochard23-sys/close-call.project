/* Niveau 7 — NIGHT FOREST (séquence 7, 79,25–89,14 s). HUD B (chrono + SCORE).
 * OBSERVÉ : ciel noir étoilé, herbe voxel quadrillée, troncs hauts et fins, rochers gris-bleu, ombres portées,
 * maison-cible avec point rouge (la vidéo se coupe avant l'impact → effet d'impact INCONNU, cyan par cohérence avec HUD B). */
(function () {
  // v002 : maison éloignée (la vidéo se coupe à 8,9 s de course sans impact)
  const route = [[0, 1.7, 0], [0, 3, -40], [-8, 3.5, -90], [6, 3.2, -150], [-4, 4, -210], [8, 4.2, -270], [-6, 4, -340], [5, 4, -410], [-4, 4, -480], [8, 3.8, -550], [14, 3.2, -618], [15, 3, -628]];
  // v021 : 2 tanks de garde (tirs anti-aériens, menace maximale) dans de petites clairières à l'écart du couloir de vol :
  // les arbres cachent la roquette une partie du temps (4 tanks au bord du couloir : un tir toutes les 0,4 s, injouable)
  const guards = [[24, -300, 90], [-20, -455, -90]];
  CC.Levels.push({
    id: 'night', fuel: 10, name: 'NIGHT FOREST', hud: 'B', mode: 'score', impactVariant: 'cyan', seed: 77,
    refSegment: { start: 79.25, end: 89.14, fire: 80.22 },
    launcher: { type: 'shoulder', pos: [0, 1.7, 0], yaw: 0, pitch: 2 },
    menuView: { center: [0, 4, -300], radius: 60, height: 14 },
    env: {
      sky: { top: '#000000', horizon: '#04070a', bottom: '#000000', stars: true },
      fog: { color: '#020403', near: 40, far: 240 },
      hemi: { sky: '#788e78', ground: '#1a201a', intensity: 1.0 },   // v004 : encore plus clair et moins saturé (21,38,13 / réf. 34,45,24)
      ambient: { color: '#ffffff', intensity: 0.24 },
      sun: { color: '#a8c0ff', intensity: 0.42, dir: [0.35, 0.65, 0.45] },
      postfx: { vignette: 0.5, vignetteColor: '#000000', chromatic: 0.0075, halftone: 0.3, lift: '#100810', saturation: 1.08 },
    },
    route,
    routeActions: [{ from: 5, to: 7, engineOff: true }],

    build(b) {
      const r = b.rng, U = CC.U;
      const distRoute = U.routeDistXZ(route);
      const ground = (x, z) => distRoute(x, z) < 10 ? 0 : 2.2 * U.fbm2(x * 0.015, z * 0.015, 3, 8) - 0.6;
      b.terrain({ x0: -300, z0: -780, n: 126, step: 6.4, mat: 'grass', height: ground, color: () => [1, 1.1, 1] });
      for (let i = 0; i < 480; i++) b.box({ p: [r.range(-90, 90), 0.2, r.range(20, -680)], s: [0.5, 0.4, 0.5], mat: 'col:#2f7a24', collide: false });
      let n = 0, guard = 0;
      while (n < 700 && guard++ < 14000) {
        const x = r.range(-160, 160), z = r.range(20, -720);
        if (distRoute(x, z) < 5 || Math.hypot(x - 15, z + 634) < 12 || guards.some((g) => Math.hypot(x - g[0], z - g[1]) < 7)) continue;
        b.tree(x, z, r.range(26, 42), r.range(0.35, 0.8));
        n++;
      }
      for (let i = 0; i < 70; i++) {
        const x = r.range(-100, 100), z = r.range(0, -660);
        if (distRoute(x, z) < 4) continue;
        b.rockLump(x, 0, z, r.range(1.2, 3.2));
      }
      b.target('house', [15, 0, -634], 25, {});
      for (const g of guards) b.guard('tank', [g[0], ground(g[0], g[1]), g[1]], g[2], {});
    },
  });
})();

/* Niveau 2 — BRICKWORKS (séquence 2, 15,40–23,60 s). HUD B, mode TARGETS 0/4.
 * OBSERVÉ : tir depuis un toit en briques (trappe en planches), nuit, collines sombres, fenêtre qui se brise,
 * enfilade de pièces en briques, échelle, structure crème, sol bleu, ruelle, char avec "!" rouge (impact à 8,0 s),
 * impact cyan + "PRESS FIRE TO RESPAWN AT LAUNCHER".
 * ESTIMATION : plan des pièces (v002 : bâtiment allongé pour retrouver la durée mesurée), position des 3 autres chars. */
CC.Levels.push({
  id: 'brick', fuel: 17, name: 'BRICKWORKS', hud: 'B', mode: 'targets', impactVariant: 'cyan', seed: 22,
  guide: false,   // v027 (Hugo) : pas de flèches vertes, repères rouges sur les tanks à la place
  refSegment: { start: 15.4, end: 23.6, fire: 15.45 },
  launcher: { type: 'shoulder', pos: [0, 15.7, 5], yaw: 0, pitch: -6 },
  menuView: { center: [0, 6, -140], radius: 110, height: 40 },
  env: {
    sky: { top: '#04060b', horizon: '#18212a', bottom: '#090b0c' },
    fog: { color: '#12161a', near: 80, far: 460 },
    hemi: { sky: '#8a7c8c', ground: '#403434', intensity: 0.62 },
    ambient: { color: '#dcd0d0', intensity: 0.5 },   // v004 : encore moins saturé (126,59,39 / réf. 119,69,55)
    sun: { color: '#b0c0ff', intensity: 0.32, dir: [-0.35, 0.8, 0.45] },
    postfx: { vignette: 0.5, vignetteColor: '#140808', bloomStrength: 0.55, halftone: 0.3, lift: '#080008', saturation: 1.08 },
  },
  routeActions: [{ from: 4, to: 7, engineOff: true }, { from: 15, to: 18, engineOff: true }],
  routes: [
    [[0, 15.7, 5], [0, 12.5, -8], [0, 9, -21], [0, 8.8, -38], [0, 8.8, -46], [4, 8.8, -61], [7, 8.8, -76], [2, 8.8, -91], [-7, 8.8, -106], [-3, 8.8, -121],
      [0, 8.8, -136], [0, 8.2, -146], [0, 3.6, -163], [0, 2.8, -174], [0, 2.8, -181], [0, 2.8, -196], [0, 2.8, -211], [0, 2.8, -224], [0, 2.8, -236], [0, 2.8, -250],
      [0, 2.8, -261], [0, 2.6, -290], [0, 1.5, -327]],
    [[0, 15.7, 5], [8, 13, -8], [36, 8, -14], [40, 5, -40], [42, 3, -80], [45, 1.5, -112]],
    [[0, 15.7, 5], [-10, 12, -6], [-30, 7, -14], [-44, 4, -40], [-46, 3, -120], [-48, 1.5, -192]],
    [[0, 15.7, 5], [0, 16, -20], [0, 16.5, -150], [0, 15, -245], [-10, 9, -272], [-26, 2.5, -294]],
  ],

  build(b) {
    const r = b.rng;
    b.terrain({ x0: -320, z0: -520, n: 71, step: 10, mat: 'grass', height: (x, z) => {
      const d = Math.hypot(x / 1.2, (z + 150) / 2.2);
      return d < 100 ? 0 : Math.pow((d - 100) / 50, 1.6) * 8 * (0.6 + CC.U.fbm2(x * 0.01, z * 0.01, 3, 4));
    }, color: () => [0.5, 0.6, 0.5] });
    // immeuble de départ (toit à 14 m) + trappe en planches
    b.box({ p: [0, 7, 8], s: [16, 14, 18], mat: { side: 'brick', top: 'brick' } });
    b.box({ p: [-3, 14.1, 9], s: [4, 0.2, 3], mat: 'planks', collide: false });
    // Bâtiment principal : x -30..30, z -20..-260, 2 niveaux
    const X0 = -30, X1 = 30, Z0 = -260, Z1 = -20;
    const win = (a) => [[a - 3.2, a + 3.2, 1.4, 4.8], [a - 3.2, a + 3.2, 7.2, 11.4]];
    b.wall({ axis: 'x', at: Z1, from: X0, to: X1, y0: 0, y1: 12.6, t: 0.6, holes: [...win(-20), ...win(0), ...win(20)], glass: 'warm' });
    b.wall({ axis: 'x', at: Z0, from: X0, to: X1, y0: 0, y1: 12.6, t: 0.6, holes: [[-4, 4, 0.2, 5.4, true], [-23.2, -16.8, 7.2, 11.4], [16.8, 23.2, 7.2, 11.4]], glass: 'warm' });
    const side = []; for (let z = -45; z > -250; z -= 30) side.push(...win(z));
    b.wall({ axis: 'z', at: X0, from: Z0, to: Z1, y0: 0, y1: 12.6, t: 0.6, holes: side, glass: 'warm' });
    b.wall({ axis: 'z', at: X1, from: Z0, to: Z1, y0: 0, y1: 12.6, t: 0.6, holes: side, glass: 'warm' });
    b.floor({ x0: X0, x1: X1, z0: Z0, z1: Z1, y: 0.2, t: 0.4, mat: 'brick' });
    b.floor({ x0: X0, x1: X1, z0: Z0, z1: Z1, y: 6.2, t: 0.4, mat: 'brick', holes: [[-6, 6, -167, -149]] });
    b.floor({ x0: X0, x1: X1, z0: Z0, z1: Z1, y: 12.6, t: 0.4, mat: 'brick' });
    // étage : cloisons en slalom (portes alternées)
    const up = { y0: 6.2, y1: 12.2, t: 0.5 };
    b.wall(Object.assign({ axis: 'x', at: -45, from: X0, to: X1, holes: [[-4, 4, 6.2, 11]] }, up));
    b.wall(Object.assign({ axis: 'x', at: -76, from: X0, to: X1, holes: [[-2, 12.5, 6.2, 11]] }, up));
    b.wall(Object.assign({ axis: 'x', at: -106, from: X0, to: X1, holes: [[-12.5, 2, 6.2, 11]] }, up));
    b.wall(Object.assign({ axis: 'x', at: -136, from: X0, to: X1, holes: [[-4, 4, 6.2, 11]] }, up));
    // rez-de-chaussée
    const dn = { y0: 0.2, y1: 5.8, t: 0.5 };
    b.wall(Object.assign({ axis: 'x', at: -181, from: X0, to: X1, holes: [[-4.5, 4.5, 0.2, 5]] }, dn));
    b.wall(Object.assign({ axis: 'x', at: -211, from: X0, to: X1, holes: [[-6, 6, 0.2, 5]] }, dn));
    b.wall(Object.assign({ axis: 'x', at: -236, from: X0, to: X1, holes: [[-6, 6, 0.2, 5]] }, dn));
    // décor OBSERVÉ : sol bleu, structures crème, échelle, caisses
    b.box({ p: [0, 0.25, -196], s: [58, 0.12, 28], mat: 'blueFloor', collide: false });
    b.box({ p: [-24, 9, -60], s: [8, 5.6, 3], mat: 'cream' });
    b.box({ p: [26, 9.5, -92], s: [3, 5, 8], mat: 'cream' });
    b.box({ p: [-26, 7.5, -125], s: [4, 2.6, 6], mat: 'cream' });
    b.box({ p: [24, 3, -225], s: [6, 5.4, 4], mat: 'cream' });
    for (let i = 0; i < 9; i++) b.box({ p: [-29.4, 6.8 + i * 0.62, -30], s: [0.12, 0.1, 1.2], mat: 'col:#1e1a18', collide: false });
    b.box({ p: [-29.4, 9.3, -30.6], s: [0.12, 5.6, 0.12], mat: 'col:#1e1a18', collide: false });
    b.box({ p: [-29.4, 9.3, -29.4], s: [0.12, 5.6, 0.12], mat: 'col:#1e1a18', collide: false });
    for (let i = 0; i < 14; i++) b.crate([r.sign() * r.range(16, 27), 1.1, r.range(-255, -175)], [1.6, 1.6, 1.6]);
    for (let i = 0; i < 8; i++) b.crate([r.sign() * r.range(18, 27), 7.1, r.range(-140, -25)], [1.6, 1.6, 1.6]);
    // ruelle nord et cour
    b.box({ p: [-6.3, 3, -276], s: [0.6, 6, 30], mat: 'brick' });
    b.box({ p: [6.3, 3, -276], s: [0.6, 6, 30], mat: 'brick' });
    b.box({ p: [0, 0, -300], s: [80, 0.2, 80], mat: 'concreteDark', ground: true, collide: false });
    b.box({ p: [0, 6, -345], s: [80, 12, 10], mat: { side: 'brick', top: 'brick' } });
    // annexes
    b.box({ p: [60, 6, -170], s: [20, 12, 220], mat: { side: 'brick', top: 'brick' } });
    b.box({ p: [-72, 7, -170], s: [20, 14, 220], mat: { side: 'brick', top: 'brick' } });
    b.box({ p: [-72, 7, 20], s: [30, 14, 30], mat: { side: 'brick', top: 'brick' } });
    b.box({ p: [60, 5, 10], s: [30, 10, 30], mat: { side: 'brick', top: 'brick' } });
    for (let i = 0; i < 8; i++) b.crate([r.range(36, 48), 0.8, r.range(-200, -130)], [1.6, 1.6, 1.6]);
    // 4 chars
    b.target('tank', [0, 0.1, -330], 180, { detectRange: 40 });
    b.target('tank', [45, 0, -116], 200, { detectRange: 40 });
    b.target('tank', [-48, 0, -196], 160, { detectRange: 40 });
    b.target('tank', [-28, 0.1, -298], 150, { detectRange: 40 });
  },
});

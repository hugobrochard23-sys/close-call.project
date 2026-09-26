/* Niveau 1 — VILLE (séquence 1 de la vidéo, 0,00–15,40 s). HUD A.
 * OBSERVÉ : lanceur sur trépied sur un toit, rue entre immeubles à fenêtres bleues, traversée de bâtiments (vitres),
 * grue jaune, panneau publicitaire, disque d'accroche + grappin, puits profond rempli de câbles et de poutres en I,
 * couloir vers une ouverture sur le ciel, hélicoptère noir stationnaire (cible, impact à 14,4 s).
 * ESTIMATION : dimensions, profondeur du puits, positions exactes (v002 : parcours allongé pour retrouver la durée mesurée). */
(function () {
  const DZ = -70;          // décalage de tout ce qui suit la rue (rue allongée en v002)
  const BOT = -190;        // fond du puits
  CC.Levels.push({
    id: 'city', fuel: 20, name: 'CITY', hud: 'A', mode: 'style', impactVariant: 'orange', seed: 11, parTime: 16,
    refSegment: { start: 0.0, end: 15.4, fire: 0.17 },
    launcher: { type: 'tripod', pos: [0, 42.3, 6], yaw: 0, pitch: 0 },
    menuView: { center: [0, 30, -160], radius: 100, height: 40 },
    killY: -260,
    env: {
      sky: { top: '#8db4da', horizon: '#f1f3f5', bottom: '#cdd1d6', sunColor: '#ffffff', sunSize: 700 },
      fog: { color: '#e6e6e8', near: 140, far: 900 },
      hemi: { sky: '#e8eef6', ground: '#8d8a8e', intensity: 0.66 },
      ambient: { color: '#ffffff', intensity: 0.24 },
      sun: { color: '#ffffff', intensity: 0.74, dir: [0.45, 0.8, 0.35] },
      postfx: { vignette: 0.62, vignetteColor: '#43201f', tint: '#fbf8f8', halftone: 0.45, lift: '#100000', saturation: 0.8 },
    },
    route: [[0, 42.3, 6], [0, 40, -20], [0, 28, -70], [0, 23, -140], [0, 23, -200], [0, 23, -230], [0, 18, -256], [0, 17, -276], [0, 17, -306],
      [0, 23, -328], [0, 28, -350], [0, 20, -367], [0, -20, -373], [0, -80, -375], [0, -130, -376], [0, -158, -378], [0, -172, -384], [0, -178, -394],
      [0, -178, -416], [0, -175, -445], [0, -173, -500], [0, -172, -540], [0, -171, -555]],
    routeActions: [{ from: 9, to: 11, retro: true }, { from: 12, to: 15, engineOff: true }, { from: 14, to: 17, retro: true }],
    lookAhead: 14,

    build(b) {
      const r = b.rng;
      const facades = ['facade', 'facadePink', 'facadeTan'];
      const tints = ['#ffffff', '#f6f2f0', '#eeeeee', '#f7f5f3'];
      const bld = (x0, x1, z0, z1, h, y0, o) => b.building((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, h, Object.assign({ y0: y0 || 0, facade: r.pick(facades), tint: r.pick(tints) }, o || {}));

      // Plateau urbain (sol) percé au-dessus du puits
      b.floor({ x0: -210, x1: 210, z0: -345 + DZ, z1: 70, y: 0, t: 1, mat: 'asphalt', holes: [[-15, 15, -325 + DZ, -295 + DZ]] });
      // Immeuble de départ (toit à 40 m)
      bld(-10, 10, -5, 18, 40);
      b.box({ p: [0, 40.1, 6], s: [20, 0.2, 23], mat: 'concreteDark', ground: true });
      // Rue principale (z -5 → -200) : immeubles de part et d'autre
      const zs = [[-5, -34], [-36, -66], [-68, -100], [-102, -134], [-136, -168], [-170, -200]];
      for (const [z1, z0] of zs) { bld(-31, -9, z0, z1, r.range(55, 90)); bld(9, 31, z0, z1, r.range(55, 90)); }
      for (let i = 0; i < 48; i++) {
        const side = r.sign(), x0 = side * r.range(34, 140), z = r.range(40, -370), w = r.range(16, 30), d = r.range(16, 30);
        bld(x0 - w / 2, x0 + w / 2, z - d / 2, z + d / 2, r.range(30, 110));
      }
      // Bâtiment B : barre la rue, tunnel y 18..28
      const Bz0 = -160 + DZ, Bz1 = -130 + DZ, Bc = -145 + DZ;
      bld(-40, -5, Bz0, Bz1, 46); bld(5, 40, Bz0, Bz1, 46);
      bld(-5, 5, Bz0, Bz1, 18); bld(-5, 5, Bz0, Bz1, 18, 28);
      b.box({ p: [-4.8, 23, Bc], s: [0.4, 10, 30], mat: 'concreteDark' });
      b.box({ p: [4.8, 23, Bc], s: [0.4, 10, 30], mat: 'concreteDark' });
      b.box({ p: [0, 18.2, Bc], s: [9.2, 0.4, 30], mat: 'concreteDark', ground: true });
      b.box({ p: [0, 27.8, Bc], s: [9.2, 0.4, 30], mat: 'concreteDark' });
      for (const x of [-3, 0, 3]) b.glass([x, 23, -159.6 + DZ], [3, 9.6, 0.12]);
      // Place entre B et C
      bld(-60, -14, -205 + DZ, -160 + DZ, r.range(40, 60)); bld(14, 60, -205 + DZ, -160 + DZ, r.range(40, 60));
      // Bâtiment C (ouverture vitrée y 12..22)
      const Cz0 = -236 + DZ, Cz1 = -205 + DZ, Cc = -220.5 + DZ;
      bld(-30, -5, Cz0, Cz1, 34); bld(5, 30, Cz0, Cz1, 34);
      bld(-5, 5, Cz0, Cz1, 12); bld(-5, 5, Cz0, Cz1, 12, 22);
      b.box({ p: [-4.8, 17, Cc], s: [0.4, 10, 31], mat: 'concreteDark' });
      b.box({ p: [4.8, 17, Cc], s: [0.4, 10, 31], mat: 'concreteDark' });
      b.box({ p: [0, 12.2, Cc], s: [9.2, 0.4, 31], mat: 'concreteDark', ground: true });
      b.box({ p: [0, 21.8, Cc], s: [9.2, 0.4, 31], mat: 'concreteDark' });
      b.glass([0, 17, -205.2 + DZ], [9.6, 9.6, 0.12]);
      b.glass([0, 17, -235.8 + DZ], [9.6, 9.6, 0.12]);
      // Toits bas + panneau "COLD IMPACT" + grue
      bld(-45, -8, -272 + DZ, -236 + DZ, 20); bld(8, 45, -272 + DZ, -236 + DZ, 16);
      const bb = CC.Textures.special('billboard');
      const dark = new THREE.MeshLambertMaterial({ color: '#2a2a2a' });
      const board = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 0.4), [dark, dark, dark, dark, new THREE.MeshLambertMaterial({ map: bb }), dark]);
      board.position.set(-20, 29, -250 + DZ); board.castShadow = true; b.add(board);
      b.world.addBox({ center: [-20, 29, -250 + DZ], size: [16, 8, 0.4] });
      b.box({ p: [-24, 22.5, -250.4 + DZ], s: [0.4, 5, 0.4], mat: 'col:#303030' }); b.box({ p: [-16, 22.5, -250.4 + DZ], s: [0.4, 5, 0.4], mat: 'col:#303030' });
      b.box({ p: [22, 30, -252 + DZ], s: [2.2, 60, 2.2], mat: 'col:#d8a820', tile: [1, 1] });
      b.box({ p: [8, 59, -252 + DZ], s: [34, 1.6, 1.6], mat: 'col:#d8a820' });
      b.box({ p: [34, 59, -252 + DZ], s: [12, 1.6, 1.6], mat: 'col:#d8a820' });
      b.box({ p: [36, 56, -252 + DZ], s: [4, 4, 3], mat: 'concreteDark' });
      // Bloc sud du puits (toit à 20 m) + disque d'accroche du grappin (OBSERVÉ)
      b.box({ p: [0, (BOT + 20) / 2, -283.5 + DZ], s: [50, 20 - BOT, 23], mat: { side: 'facadePink', top: 'concrete', bottom: 'concreteDark' } });
      b.grapplePoint([6, 22.2, -294.9 + DZ], [0, 0, -1], 1.6);
      // Puits : x -15..15, z -295..-325 (+DZ), fond à BOT
      const H = 70 - BOT, Yc = (70 + BOT) / 2;
      b.box({ p: [-27.5, Yc, -310 + DZ], s: [25, H, 30], mat: { side: 'facade', top: 'concrete' } });
      b.box({ p: [27.5, Yc, -310 + DZ], s: [25, H, 30], mat: { side: 'facadeTan', top: 'concrete' } });
      const Nz = -335 + DZ;
      b.box({ p: [-22.5, Yc, Nz], s: [35, H, 20], mat: { side: 'facade', top: 'concrete' } });
      b.box({ p: [22.5, Yc, Nz], s: [35, H, 20], mat: { side: 'facade', top: 'concrete' } });
      b.box({ p: [0, BOT - 0.5, Nz], s: [10, 9, 20], mat: 'concreteDark', ground: true });          // couloir : plancher à BOT+4
      b.box({ p: [0, (BOT + 20 + 76) / 2, Nz], s: [10, 76 - (BOT + 20), 20], mat: { side: 'facade', top: 'concrete' } });
      b.box({ p: [0, BOT - 1, -310 + DZ], s: [30, 2, 30], mat: 'concreteDark', ground: true });
      // Câbles entrecroisés (colonne centrale libre autour de l'axe de descente)
      const ax = 0, az = -305 + DZ;
      let placed = 0, guard = 0;
      while (placed < 70 && guard++ < 3000) {
        const y1 = r.range(BOT + 25, 14), y2 = y1 + r.range(-12, 12);
        const walls = [() => [-15, r.range(-324, -296) + DZ], () => [15, r.range(-324, -296) + DZ], () => [r.range(-14, 14), -295 + DZ], () => [r.range(-14, 14), -325 + DZ]];
        const i1 = r.int(0, 3); let i2 = r.int(0, 3); if (i2 === i1) i2 = (i1 + 1) % 4;
        const a = walls[i1](), c = walls[i2]();
        const abx = c[0] - a[0], abz = c[1] - a[1];
        const t = Math.max(0, Math.min(1, ((ax - a[0]) * abx + (az - a[1]) * abz) / (abx * abx + abz * abz)));
        if (Math.hypot(a[0] + abx * t - ax, a[1] + abz * t - az) < 5) continue;
        b.cable([a[0], y1, a[1]], [c[0], y2, c[1]], 0.12);
        placed++;
      }
      for (let i = 0; i < 18; i++) {
        const side = r.int(0, 3), y = r.range(BOT + 30, 5);
        const pos = side === 0 ? [-13.5, y, r.range(-322, -298) + DZ] : side === 1 ? [13.5, y, r.range(-322, -298) + DZ] : side === 2 ? [r.range(-12, 12), y, -296.5 + DZ] : [r.range(-12, 12), y, -323.5 + DZ];
        const rot = [0, side < 2 ? 0 : 90, r.range(-30, 30)];
        b.box({ p: pos, s: [3, 0.5, 2.6], r: rot, mat: 'col:#2e2e30' });
        b.box({ p: [pos[0], pos[1] + 1.4, pos[2]], s: [3, 0.5, 2.6], r: rot, mat: 'col:#2e2e30', collide: false });
        b.box({ p: [pos[0], pos[1] + 0.7, pos[2]], s: [0.5, 1.4, 2.6], r: rot, mat: 'col:#2e2e30', collide: false });
      }
      // Au-delà du couloir : vide lumineux, tours claires, hélicoptère noir (cible)
      b.skyline(0, -780, 260, 700, 70, 120, 420, '#e6ebf0', BOT - 200);
      b.skyline(0, -200, 520, 900, 60, 80, 300, '#e1e7ec', -60);
      b.target('heli', [0, BOT + 19, -560], 180, {});
    },
  });
})();

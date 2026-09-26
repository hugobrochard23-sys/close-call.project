/* Niveau 4 — GROTTE (séquence 4, 36,03–48,17 s). HUD C.
 * OBSERVÉ : grotte sombre brun-rouge, parois striées, stalactites, vol moteur coupé par moments, rétro-fusées,
 * cible = camion/générateur sur une plateforme blanche à garde-corps. ESTIMATION : tracé du tunnel, rayons. */
(function () {
  // v002 : tunnel allongé (≈ 820 m) pour retrouver la durée mesurée (impact à 15,6 s)
  const PTS = [[0, 0, 34], [0, 0, 0], [4, -4, -60], [-14, -10, -120], [-10, -22, -180], [14, -28, -240], [24, -20, -300], [10, -26, -360], [-6, -36, -420],
    [-20, -40, -480], [-10, -48, -540], [12, -50, -600], [20, -46, -660], [6, -52, -720], [0, -56, -770], [0, -56, -815]];
  const radius = (u) => 15 + 5 * Math.sin(u * 17) + (u > 0.9 ? (u - 0.9) * 280 : 0);
  // route : échantillons de la courbe (un peu sous l'axe), puis descente vers la plateforme
  const curve = new THREE.CatmullRomCurve3(PTS.map((p) => new THREE.Vector3().fromArray(p)), false, 'catmullrom', 0.3);
  const route = [[0, -6, 18]];
  for (let u = 0.05; u < 0.92; u += 0.03) { const p = curve.getPointAt(u); route.push([+p.x.toFixed(2), +(p.y - 2).toFixed(2), +p.z.toFixed(2)]); }
  route.push([0, -57, -768], [0, -60.5, -782], [0, -62.2, -789]);

  CC.Levels.push({
    id: 'cave', fuel: 14, name: 'CAVE', hud: 'C', mode: 'style', impactVariant: 'orange', seed: 44, parTime: 13,
    refSegment: { start: 36.03, end: 48.17, fire: 31.51 },
    launcher: { type: 'shoulder', pos: [0, -6, 18], yaw: 0, pitch: -2 },
    menuView: { center: [0, -10, -60], radius: 8, height: 2 },
    killY: -200,
    env: {
      sky: { top: '#140f0d', horizon: '#1b1412', bottom: '#0c0908' },
      fog: { color: '#2c2624', near: 30, far: 170 },
      hemi: { sky: '#b4aaa6', ground: '#34302c', intensity: 1.1 },    // v003 : encore trop sombre et trop saturée (27,20,12 / réf. 38,31,28)
      ambient: { color: '#ffffff', intensity: 0.4 },
      sun: { color: '#c8a890', intensity: 0.22, dir: [0.2, 1, 0.3], shadow: false },
      postfx: { vignette: 0.62, vignetteColor: '#0a0605', halftone: 0.45, grain: 0.035, lift: '#040408', saturation: 1.08 },
    },
    route,
    routeActions: [{ from: 4, to: 8, engineOff: true }, { from: 11, to: 14, engineOff: true }, { from: 17, to: 20, engineOff: true }, { from: route.length - 8, to: route.length - 5, retro: true }],   // v004 : freinage avant la chambre, puis réaccélération (réf. 28 → 56 m/s)

    build(b) {
      const r = b.rng;
      const tube = b.caveTube({ points: PTS, radius, mat: 'rock', seed: 5 });
      // bouchons de roche aux extrémités
      b.box({ p: [0, 0, 36], s: [80, 80, 4], mat: 'rock' });
      b.box({ p: [0, -56, -821], s: [110, 110, 4], mat: 'rock' });
      // stalactites (sans bloquer l'axe central)
      const S = tube.samples;
      for (let i = 0; i < 70; i++) {
        const k = r.int(40, S.length - 60), s = S[k];
        const top = r() < 0.7;
        const ang = (top ? Math.PI / 2 : -Math.PI / 2) + r.range(-0.9, 0.9);
        const R = tube.radiusAt(k, ang) * 0.97;
        const base = s.p.clone().addScaledVector(s.n, Math.cos(ang) * R).addScaledVector(s.b, Math.sin(ang) * R);
        const maxH = Math.abs(base.y - s.p.y) - 5;
        if (maxH < 3) continue;
        const h = Math.min(maxH, r.range(5, 14)), rad = r.range(1.2, 2.6);
        const dir = top ? -1 : 1;
        b.cylinder({ p: [base.x, base.y + dir * h / 2, base.z], rTop: top ? rad : 0.2, rBot: top ? 0.2 : rad, h, seg: 6, mat: 'rock', colSize: [rad * 1.1, h * 0.9, rad * 1.1] });
      }
      // plateforme blanche + pilier + garde-corps (OBSERVÉ)
      const P = [0, -64, -790];
      b.box({ p: [P[0], P[1], P[2]], s: [14, 1, 14], mat: 'white', ground: true });
      b.box({ p: [P[0], P[1] - 20.5, P[2]], s: [6, 40, 6], mat: 'rock' });
      for (const [x, z, sx, sz] of [[-7, 0, 0.12, 14], [7, 0, 0.12, 14], [0, -7, 14, 0.12], [0, 7, 14, 0.12]]) {
        b.box({ p: [P[0] + x, P[1] + 1.6, P[2] + z], s: [sx, 0.1, sz], mat: 'col:#4a4a4a', collide: false });
        b.box({ p: [P[0] + x, P[1] + 1.05, P[2] + z], s: [sx, 0.08, sz], mat: 'col:#4a4a4a', collide: false });
      }
      for (let i = -3; i <= 3; i++) for (const s of [-7, 7]) {
        b.box({ p: [P[0] + i * 2.2, P[1] + 1.05, P[2] + s], s: [0.1, 1.1, 0.1], mat: 'col:#4a4a4a', collide: false });
        b.box({ p: [P[0] + s, P[1] + 1.05, P[2] + i * 2.2], s: [0.1, 1.1, 0.1], mat: 'col:#4a4a4a', collide: false });
      }
      b.target('truck', [P[0], P[1] + 0.5, P[2]], 180, {});
    },
  });
})();

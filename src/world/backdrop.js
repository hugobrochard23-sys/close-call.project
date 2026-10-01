/* v038b : DECOR DE FOND. Derrière et autour des structures du couloir, des couches de bâtiments (ville), de piles de conteneurs et de portiques (port) ou
 * de montagnes (base aérienne) montent très haut des deux côtés : on n'aperçoit plus jamais le « bord » de la carte entre deux immeubles ni autour d'une
 * porte. Aucune collision, pas d'ombre (pas de coût physique) ; les boîtes sont fusionnées par matière comme tout le reste ; le brouillard les fond. */
(function () {
  const U = CC.U, G = CC.Gen, Z = CC.Zones;
  const STEP = 16;
  const FAC = ['#ffffff', '#f2eee8', '#e8ecf0', '#ddd6cc', '#e6dede'];
  const CONT = ['#b8382c', '#2a5a8a', '#c89a20', '#3a8a5a', '#8a8a90', '#a85a2a'];

  Z.backdrop = function (ctx) {
    const T = ctx.T, b = ctx.b;
    for (let d = ctx.d0; d < ctx.d1 - 0.01; d += STEP) {
      const m = d + STEP / 2, tr = Z.trans(T, m); if (tr.k) continue;
      const zone = tr.z1, r = G.stream(T.seed, 'bd' + Math.round(d)), v = T.vol(m), yaw = T.yawAcross(m);
      const box = (lx, yc, w, h, dd, mat, tint, ry) => b.box({ p: T.at(m, lx, yc), s: [w, h, dd], r: [0, yaw + (ry || 0), 0], mat, tint, collide: false, shadow: false });
      for (const s of [-1, 1]) {
        if (zone === 'city') {
          for (let j = 0; j < 3; j++) {
            if (r() < 0.1) continue;
            const w = r.between([16, 34]), dd = r.between([STEP * 0.9, STEP * 1.9]), h = r.between([70, 190]) * (1 + 0.45 * j);
            box(s * (v + 9 + w / 2 + j * 36 + r() * 8), h / 2 - 2, w, h + 4, dd, 'facade', r.pick(FAC));
          }
        } else if (zone === 'port') {
          for (let j = 0; j < 2; j++) {
            if (r() < 0.15) continue;
            const w = r.between([22, 60]), dd = r.between([14, 30]), h = r.between([10, 30]) * (1 + j * 0.6);
            box(s * (62 + j * 40 + r() * 18 + w / 2), h / 2 - 3.6, w, h + 3.6, dd, 'corrugated', r.pick(CONT));
          }
          if (r() < 0.16) { const lx = s * (74 + r() * 50), hh = r.between([44, 70]);   // portique de quai
            for (const a of [-1, 1]) for (const c of [-1, 1]) box(lx + a * 10, hh / 2 - 3.6, 1.6, hh + 3.6, 1.6, 'col:#e0b020', undefined);
            box(lx, hh, 24, 2.2, 3, 'col:#e0b020', undefined); box(lx - s * 22, hh - 2, 40, 1.6, 2.4, 'col:#e0b020', undefined); }
        } else if (zone === 'sky') {
          for (let j = 0; j < 2; j++) {
            if (r() < 0.2) continue;
            const w = r.between([40, 90]), dd = r.between([30, 70]), h = r.between([120, 300]);
            box(s * (70 + j * 55 + r() * 30 + w / 2), -125 + h / 2, w, h, dd, 'col:' + r.pick(['#a4b4d0', '#94a6c6', '#b4c2da']), undefined, r.between([-40, 40]));
          }
        }
      }
    }
  };
})();

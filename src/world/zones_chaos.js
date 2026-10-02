/* v065 : CHAOS — champs d'obstacles procéduraux dans TOUS les sens (au-dessus, en dessous, de côté, en diagonale), en plus des scènes et des portes serrées.
 * La suite des positions ne dépend que de la graine ; chaque obstacle laisse libre le tube de dégagement autour de la trajectoire (le parcours reste faisable).
 *   pilier · poutre inclinée (haut / bas) · barre en diagonale · laser · portique incliné · quinconce de piliers · bloc suspendu · herse
 * Jamais dans le métro ni le monde miniature, ni en transition de zone, ni près d'une épingle, d'une porte, d'une cible ou d'anneaux. */
(function () {
  const U = CC.U, G = CC.Gen, Z = CC.Zones, C = () => CC.CONFIG.endless;
  const SKIP = { metro: 1, mini: 1 };
  const THEME = {
    city: { mat: 'concreteDark', tints: ['#c8ccd0', '#b8bcc4', '#d0d0cc'] }, port: { mat: 'metal', tints: ['#b8382c', '#2a5a8a', '#c89a20', '#8a8a90'] },
    usine: { mat: 'metal', tints: ['#b8b4a8', '#a8a49c', '#c8b890'] }, forest: { mat: 'bark', tints: ['#8a7a68', '#7a6a58'] }, sky: { mat: 'metal', tints: ['#d0d4dc', '#b8c0cc'] },
    tour: { mat: 'concreteDark', tints: ['#c8ccd0', '#b8bcc4'] }, chute: { mat: 'concreteDark', tints: ['#c8ccd0', '#b8bcc4'] }, eau: { mat: 'rock', tints: ['#6a8a90', '#5a7a82'] },
  };
  const gapOf = (d) => [84, 70, 58, 48][U.clamp(Math.floor(d / C().stageLen), 0, 3)];   // v067 : carte plus lisible
  const WEIGHTS = { pillar: 3.5, beam: 3, laser: 1.2, hoop: 1.4, block: 1.4 };

  function list(T, dmax) {
    const L = T._chaos || (T._chaos = { pos: [], next: 300, r: G.stream(T.seed, 'chaos') });
    while (L.next < dmax) { L.pos.push(L.next); L.next += gapOf(L.next) * L.r.between([0.8, 1.35]); }
    return L.pos;
  }
  function sceneAt(T, d) {
    const zi = T.zoneIndex(d), plan = Z.plan(T, zi);
    for (const sc of plan.scenes) if (d >= sc.d0 && d < sc.d1) return { sc, zone: plan.zone };
    return null;
  }
  function valid(T, d) {
    const tr = Z.trans(T, d); if (tr.k) return null;
    const at = sceneAt(T, d); if (!at) return null;
    const { sc, zone } = at, def = Z.defs[zone];
    if (SKIP[zone] || !THEME[zone]) return null;
    if (def && (def.signature === sc.name || (def.scenes[sc.name] && def.scenes[sc.name].noChaos))) return null;
    if (d < sc.d0 + 24 || d > sc.d1 - 24) return null;
    if (Z.pinAt(T, d).length) return null;
    return at;
  }

  Z.chaos = function (ctx) {
    const T = ctx.T, d0 = ctx.d0, d1 = ctx.d1;
    for (const d of list(T, d1 + 20)) {
      if (d < d0 + 10 || d > d1 - 10) continue;
      const at = valid(T, d); if (!at) continue;
      if (ctx.busy.some((q) => Math.abs(q - d) < 22) || ctx.rings.some((q) => Math.abs(q.d - d) < 30) || ctx.reserved.some((q) => Math.abs(q.d - d) < q.dd / 2 + 6) || (ctx.doors || []).some((q) => Math.abs(q.d - d) < 24)) continue;
      const { sc, zone } = at, th = THEME[zone], st = U.clamp(Math.floor(d / C().stageLen), 0, 3);
      const S = new Z.Scene(ctx, { name: 'chaos', d0: d - 12, d1: d + 12, zone, zi: sc.zi, key: 'c' + Math.round(d), stage: st });
      S.item(d, (r) => {
        const L = S.lane(d), R = S.R, v = Math.max(T.vol(d), R + 6), tint = r.pick(th.tints), type = r.weighted(WEIGHTS), y0 = L.y;
        const side = r() < 0.5 ? -1 : 1;
        const room = (sg) => v - 2 - (sg * L.lx + R + 1.5);          // place disponible entre le tube et la paroi, du côté sg
        const bar = (lx, yc, len, th2, roll, dd, mat, tn, collide) => S.bxr(d, lx, yc, len, th2, dd, mat || th.mat, tn || tint, roll, 0, collide);
        const warn = (lx, yc, len, roll) => { S.bxr(d, lx, yc, len, 0.5, 2.2, 'hazard', undefined, roll, 0, false); };
        if (type === 'pillar') {
          const sg = room(side) > 3 ? side : -side; if (room(sg) < 3) return;
          const rad = r.between([1.0, 2.2]), off = R + 1.5 + rad + r() * Math.max(0, room(sg) - rad * 2);
          S.cyl(d, L.lx + sg * off, Math.max(0, T.base(d) * 0), rad, y0 + R + 30, th.mat, tint, 10, rad, true);
          S.bx(d, L.lx + sg * off, 0.5, rad * 2.6, 1, rad * 2.6, 'hazard', undefined, false, { shadow: false });
        } else if (type === 'beam') {
          const up = y0 - R - 4 < 2 || r() < 0.65, roll = r.between([-22, 22]), tn = Math.abs(Math.tan(roll * Math.PI / 180)), t2 = r.between([1.2, 2.2]);
          const yc = up ? y0 + R * (1 + tn) + 1.2 + t2 / 2 + r() * 4 : y0 - R * (1 + tn) - 1.2 - t2 / 2 - r() * 2;
          if (yc < t2 / 2 + 0.5) return;
          bar(L.lx, yc, 2 * v + 2, t2, roll, r.between([1.6, 3.2]));
          warn(L.lx, yc + (up ? -t2 / 2 - 0.2 : t2 / 2 + 0.2), 2 * v, roll);
        } else if (type === 'diag') {
          const ang = r.between([25, 65]) * (r() < 0.5 ? -1 : 1), a = ang * Math.PI / 180, dist = R + 1.8 + r() * 2, sg = r() < 0.5 ? -1 : 1;   // droite à distance dist de l'axe, inclinée de ang
          const px = L.lx - Math.sin(a) * dist * sg, py = y0 + Math.cos(a) * dist * sg;
          if (py < 4) return;
          bar(px, py, 2 * v + 6, 0.9, ang, 1.2, 'metal', '#8a8e94', true);
        } else if (type === 'laser') {
          const n = r.int(1, 3), up = y0 > R + 6;
          for (let i = 0; i < n; i++) {
            const yc = y0 + (r() < 0.5 && up ? -1 : 1) * (R + 1.2 + i * 2.6), len = 2 * v;
            if (yc < 1) continue;
            S.b.box({ p: T.at(d, 0, yc), s: [len, 0.32, 0.32], r: [0, T.yawAcross(d), 0], mat: 'basic:#ff3b2e', collide: true, kind: 'hazard', shadow: false });
            S.bx(d, 0, yc, len, 0.9, 0.9, 'basic:#ff3b2e', undefined, false, { shadow: false });
            for (const sg of [-1, 1]) S.bx(d, sg * (v - 0.6), yc, 1.2, 1.6, 1.6, 'metal', '#3a3d42', true);
          }
        } else if (type === 'hoop') {
          const roll = r.between([0, 45]), hw = R + 1.3, th2 = 1.6, dd = 2.4;   // quatre barres autour d'une ouverture centrée sur la trajectoire, le tout incliné
          const a = roll * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
          // barres orientées dans le repère incliné : on les pose en bxr avec roll
          const hb = (ox, oy, len, vert) => S.bxr(d, L.lx + ox * c - oy * s, y0 + ox * s + oy * c, len, th2, dd, 'metal', '#c8a020', (vert ? roll + 90 : roll), 0, true);
          const e = hw + th2 / 2;
          hb(0, e, 2 * (hw + th2), false); hb(0, -e, 2 * (hw + th2), false); hb(e, 0, 2 * (hw + th2), true); hb(-e, 0, 2 * (hw + th2), true);
          for (const [ox, oy] of [[e, e], [-e, e], [e, -e], [-e, -e]]) S.bxr(d, L.lx + ox * c - oy * s, y0 + ox * s + oy * c, 2.4, 2.4, dd + 0.4, 'hazard', undefined, roll, 0, false);
          S.gate(d, L.lx, y0);
        } else if (type === 'stagger') {
          for (let i = -1; i <= 1; i++) {
            const dc = d + i * 11, Li = S.lane(dc), sg = i % 2 === 0 ? side : -side, rm = v - 2 - (sg * Li.lx + R + 1.5);
            if (rm < 2.5) continue;
            const rad = r.between([1.1, 1.9]);
            S.item(dc, () => S.cyl(dc, Li.lx + sg * (R + 1.5 + rad + r() * Math.max(0, rm - rad * 2)), 0, rad, Li.y + R + 28, th.mat, tint, 10, rad, true));
          }
        } else if (type === 'block') {
          const w = r.between([6, 14]), h = r.between([5, 12]), sg = side, off = Math.max(R + 1.5 + w / 2, 0), room2 = room(sg);
          if (room2 < w) return;
          const lx = L.lx + sg * (R + 1.5 + w / 2 + r() * Math.max(0, room2 - w)), yc = y0 + r.between([-4, 10]);
          if (yc - h / 2 < 0.5) return;
          S.bx(d, lx, yc, w, h, r.between([6, 12]), th.mat, tint, true);
          void off;
        } else if (type === 'grid') {
          // herse : barreaux verticaux au-dessus et en dessous de la trajectoire, le couloir central reste libre
          const n = Math.floor((v * 2) / 4), top = y0 + 36;
          for (let i = 0; i < n; i++) {
            const lx = -v + 2 + i * 4;
            if (Math.abs(lx - L.lx) < R + 1.2) continue;
            S.bx(d, lx, top / 2, 0.8, top, 0.8, 'metal', '#7a7e84', true);
          }
          S.bx(d, 0, y0 + R + 14 + 0.2, 2 * v, 0.6, 1.2, 'hazard', undefined, false, { shadow: false });
        }
        ctx.busy.push(d);
      });
    }
  };
})();

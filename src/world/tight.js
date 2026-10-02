/* v038 : PORTES SERREES. En ligne droite (boost tout le temps) on allait à 20 000–30 000 m : la trajectoire serpente, mais les scènes laissent
 * de la place autour d'elle. Ici, tous les 70–110 m environ, un panneau plein (immeuble, pile de conteneurs, cloison d'usine, arche de roche…)
 * barre le couloir et n'est percé que d'UN trou, centré sur la trajectoire : il faut suivre le couloir, lâcher le boost, viser.
 *   fenêtre (carrée) · fente (large et basse : on passe au ras) · meurtrière (étroite et haute)
 * Le trou est bordé de bandes hachurées et de rails lumineux. Positions : suite déterministe tirée de la graine (identique d'un tronçon à l'autre) ;
 * jamais dans le métro ni le monde miniature, ni en transition de zone, ni près d'une scène signature, d'une épingle, d'une cible ou d'anneaux. */
(function () {
  const U = CC.U, G = CC.Gen, Z = CC.Zones, C = () => CC.CONFIG.endless;
  const SKIP = { metro: 1, mini: 1 };
  const THEME = {
    city:   { mat: { side: 'facade', top: 'concrete', bottom: 'concreteDark' }, tints: ['#ffffff', '#f2eee8', '#e8ecf0'] },
    port:   { mat: 'corrugated', tints: ['#b8382c', '#2a5a8a', '#c89a20', '#3a8a5a', '#8a8a90'] },
    usine:  { mat: 'metal', tints: ['#b8b4a8', '#a8a49c', '#c8b890'] },
    forest: { mat: 'rock', tints: ['#8a9a82', '#7a8a72', '#9a9a8a'] },
    sky:    { mat: 'metal', tints: ['#d0d4dc', '#b8c0cc'] },
    tour:   { mat: { side: 'facade', top: 'concrete', bottom: 'concreteDark' }, tints: ['#ffffff', '#e8ecf0'] },
    chute:  { mat: { side: 'facade', top: 'concrete', bottom: 'concreteDark' }, tints: ['#ffffff', '#e8ecf0'] },
    eau:    { mat: 'rock', tints: ['#6a8a90', '#5a7a82', '#7a9a98'] },
  };
  const gap = (d) => { const a = C().tight.gap, st = U.clamp(Math.floor(d / C().stageLen), 0, 3); return a[st]; };

  // suite des positions candidates : fonction de la graine seulement
  function list(T, dmax) {
    const L = T._tight || (T._tight = { pos: [], next: C().tight.first, r: G.stream(T.seed, 'tight') });
    while (L.next < dmax) {
      let d = L.next; const m = d % C().chunkLen;
      if (m < 14) d += 14 - m; else if (m > C().chunkLen - 14) d -= m - (C().chunkLen - 14);   // un panneau ne chevauche jamais deux tronçons
      L.pos.push(d); L.next += gap(L.next) * L.r.between([0.78, 1.3]);
    }
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
    if (def && def.signature === sc.name) return null;
    if (def && def.scenes[sc.name] && def.scenes[sc.name].noDoor) return null;   // v056 : scènes déjà percées
    if (d < sc.d0 + 28 || d > sc.d1 - 28) return null;
    if (Z.pinAt(T, d).length) return null;
    return at;
  }

  // prochaine porte serrée devant d (à moins de 260 m) — sert au tutoriel
  Z.nextDoor = function (T, d) {
    for (const q of list(T, d + 300)) if (q > d && q < d + 260 && valid(T, q)) return q;
    return null;
  };
  Z.tight = function (ctx) {
    const T = ctx.T, cfg = C(), d0 = ctx.d0, d1 = ctx.d1;
    for (const d of list(T, d1 + 20)) {
      if (d < d0 + 12 || d > d1 - 12) continue;
      const at = valid(T, d); if (!at) continue;
      if (ctx.busy.some((q) => Math.abs(q - d) < 34) || ctx.rings.some((q) => Math.abs(q.d - d) < 40) || ctx.reserved.some((q) => Math.abs(q.d - d) < q.dd / 2 + 6)) continue;
      const { sc, zone } = at, th = THEME[zone], st = U.clamp(Math.floor(d / cfg.stageLen), 0, 3);
      const S = new Z.Scene(ctx, { name: 'tight', d0: d - 10, d1: d + 10, zone, zi: sc.zi, key: 't' + Math.round(d), stage: st });
      let yc0 = 0, wd0 = 8, hd0 = 8;
      const Ln = S.lane(d), v = T.vol(d) + (zone === 'usine' || zone === 'eau' ? 3 : zone === 'city' || zone === 'tour' || zone === 'chute' ? 46 : 26), hole = U.lerp(13.5, 6.2, U.clamp(d / 8000, 0, 1));   // v072 : plus on avance, plus l'ouverture est petite   // v038b : le panneau déborde largement sur les côtés (on n'en voit plus le bord)
      S.item(d, (r) => {
        const shape = r.weighted({ win: 3, slit: 1.6, slot: 1.6, shutter: U.clamp((d - 1100) / 3500, 0, 1) * 2.6 });
        if (shape === 'shutter') {   // v072 : VOLETS — deux panneaux qui s'ouvrent et se ferment, il faut passer quand c'est ouvert
          const hh = Math.max(9, hole * 0.95), lo2 = (zone === 'chute' || zone === 'tour' || zone === 'sky') ? Math.max(0, Ln.y - 52) : 0, top2 = (zone === 'usine' ? 76 : Ln.y + (zone === 'city' || zone === 'tour' || zone === 'chute' ? 150 : 80));
          const yc = Math.max(Ln.y, lo2 + hh / 2 + 0.4), amp = U.clamp(hole * 0.34, 1.8, 4.6), h0 = amp + 0.4, per = U.lerp(5.6, 3.2, U.clamp(d / 8000, 0, 1)), tn = r.pick(th.tints), dd = 4;
          S.bx(d, 0, (yc + hh / 2 + top2) / 2, 2 * v, top2 - (yc + hh / 2), dd, th.mat, tn);
          if (yc - hh / 2 > lo2 + 0.5) S.bx(d, 0, (lo2 + yc - hh / 2) / 2, 2 * v, yc - hh / 2 - lo2, dd, th.mat, tn);
          for (const sg of [-1, 1]) CC.Life.sweeper(S, { shutter: true, mode: 'across', d, lx: Ln.lx + sg * (h0 + v / 2), y: yc, amp, period: per, phase: sg < 0 ? 0 : Math.PI, parts: [[0, 0, 0, v, hh, dd + 0.6, '#7c8088'], [0, hh / 2 - 0.35, 0, v + 0.2, 0.7, dd + 1, '#e8c020'], [0, -hh / 2 + 0.35, 0, v + 0.2, 0.7, dd + 1, '#e8c020']], size: [v, hh, dd + 0.6], cause: 'mover' });
          S.bx(d, Ln.lx, yc + hh / 2 + 0.3, 2 * (h0 + amp) + 1.6, 0.6, dd + 0.4, 'hazard', undefined, false, { shadow: false });
          yc0 = yc; wd0 = 2 * (h0 + amp); hd0 = hh; return;
        }
        let w = hole, h = hole;
        if (shape === 'slit') { w = Math.min(2 * v - 4, hole * 3.4); h = hole * 0.62; } else if (shape === 'slot') { w = hole * 0.62; h = hole * 2.0 + 4; }
        const lo = (zone === 'chute' || zone === 'tour' || zone === 'sky') ? Math.max(0, Ln.y - 52) : 0, top = (zone === 'usine' ? 76 : Ln.y + (zone === 'city' || zone === 'tour' || zone === 'chute' ? 150 : 80)), yc = Math.max(Ln.y, lo + h / 2 + 0.4);
        const tint = r.pick(th.tints), dd = 4;
        S.wall(d, -v, v, lo, top, dd, th.mat, tint, { lx: Ln.lx, yc, w, h }); yc0 = yc; wd0 = w; hd0 = h;
        // bordure du trou : bandes hachurées en haut et en bas, rails lumineux sur les côtés (lisibles de loin)
        S.bx(d, Ln.lx, yc + h / 2 + 0.3, w + 1.6, 0.6, dd + 0.4, 'hazard', undefined, false, { shadow: false });
        if (yc - h / 2 > lo + 0.6) S.bx(d, Ln.lx, yc - h / 2 - 0.3, w + 1.6, 0.6, dd + 0.4, 'hazard', undefined, false, { shadow: false });
        for (const s of [-1, 1]) S.bx(d, Ln.lx + s * (w / 2 + 0.35), yc, 0.5, h + 0.8, dd + 0.4, 'basic:#ffc63a', undefined, false, { shadow: false });
      });
      (ctx.doors || (ctx.doors = [])).push({ d, lx: Ln.lx, y: yc0, w: wd0, h: hd0 });
      S.gate(d - 26, T.laneX(d - 26), T.laneY(d - 26)); S.gate(d, Ln.lx, Math.max(Ln.y, 1)); S.gate(d + 16, T.laneX(d + 16), T.laneY(d + 16));
      ctx.busy.push(d);
    }
  };
})();

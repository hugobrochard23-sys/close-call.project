/* Générateur de missions — COUCHES 2 et 3 : objets du plan et gabarits de zones.
 *
 * Objets (G.Items) : chaque type déclare son emprise au sol (`foot`, pour le placement sans chevauchement) et ses boîtes
 * de collision (`solids`, pour la validation, la navigation et le jeu). Le rendu détaillé est dans kit.js. Règle : les
 * boîtes du plan englobent toujours la collision réelle construite en jeu (la validation est donc prudente).
 *
 * Gabarits (G.Templates) : une « grammaire » de composition. Un gabarit remplit une parcelle avec un ensemble cohérent
 * (base militaire = bâtiment de commandement + hangars + voie + défenses + véhicules…), lui-même varié par la graine.
 * Repère d'un objet : lacet `yaw` (radians), x local = largeur `w`, z local = profondeur `d`, base au sol `y0`. */
(function () {
  const G = CC.Gen;
  const I = (id, o) => G.Items.add(id, o);

  // ---------- aides de géométrie des objets ----------
  const fr = (it) => ({ x: it.x, z: it.z, c: Math.cos(it.yaw || 0), s: Math.sin(it.yaw || 0) });
  // boîte de collision dans le repère de l'objet
  const bx = (it, lx, ly, lz, w, h, d, kind, dyaw) => {
    const f = fr(it), p = [f.x + lx * f.c + lz * f.s, f.z - lx * f.s + lz * f.c];
    return { x: p[0], y: (it.y0 || 0) + ly, z: p[1], w, h, d, yaw: (it.yaw || 0) + (dyaw || 0), kind: kind || 'solid' };
  };
  const rect = (it, w, d) => G.obb(it.x, it.z, w, d, it.yaw || 0);
  G.itemBox = bx;

  // Bâtiment (toit plat, à deux pans ou en sheds) : { w, d, h, roof, mat, tint }
  I('bld', {
    layer: 'structure',
    foot: (it) => rect(it, it.w, it.d),
    solids: (it) => {
      const s = [bx(it, 0, it.h / 2, 0, it.w, it.h, it.d)];
      if (it.roof === 'gable') s.push(bx(it, 0, it.h + it.w * 0.18, 0, it.w + 0.8, it.w * 0.36, it.d + 0.8));
      if (it.roof === 'saw') s.push(bx(it, 0, it.h + 1.6, 0, it.w, 3.2, it.d));
      return s;
    },
  });
  // Hangar : portail sur la face avant (+z local) ; intérieur libre (on peut y entrer)
  I('hangar', {
    layer: 'structure',
    foot: (it) => rect(it, it.w, it.d),
    solids: (it) => {
      const t = 0.6, { w, d, h } = it, dw = it.doorW, dh = it.doorH, rh = it.w * 0.22;
      const side = (w - dw) / 2;
      return [
        bx(it, 0, h / 2, -d / 2 + t / 2, w, h, t),                              // mur du fond
        bx(it, -w / 2 + t / 2, h / 2, 0, t, h, d), bx(it, w / 2 - t / 2, h / 2, 0, t, h, d),
        bx(it, -(dw / 2 + side / 2), h / 2, d / 2 - t / 2, side, h, t), bx(it, dw / 2 + side / 2, h / 2, d / 2 - t / 2, side, h, t),
        bx(it, 0, (dh + h) / 2, d / 2 - t / 2, dw, h - dh, t),                   // linteau
        bx(it, 0, h + rh / 2, 0, w + 0.6, rh, d + 0.6),                           // voûte
      ];
    },
  });
  // Squelette de bâtiment en chantier : dalles sur poteaux (on peut passer entre les étages)
  I('skeleton', {
    layer: 'structure',
    foot: (it) => rect(it, it.w, it.d),
    solids: (it) => {
      const s = [], nx = Math.max(2, Math.round(it.w / 7)), nz = Math.max(2, Math.round(it.d / 7));
      for (let f = 1; f <= it.floors; f++) s.push(bx(it, 0, f * it.floorH - 0.25, 0, it.w, 0.5, it.d));
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const lx = -it.w / 2 + 0.4 + (it.w - 0.8) * i / (nx - 1), lz = -it.d / 2 + 0.4 + (it.d - 0.8) * j / (nz - 1);
        s.push(bx(it, lx, it.floors * it.floorH / 2, lz, 0.6, it.floors * it.floorH, 0.6));
      }
      return s;
    },
  });
  // Cylindre posé au sol (réservoir, silo, cheminée) : { r, h, cap }
  I('cyl', {
    layer: 'structure',
    foot: (it) => G.obb(it.x, it.z, it.r * 2, it.r * 2, 0),
    solids: (it) => [bx(Object.assign({}, it, { yaw: 0 }), 0, (it.h + (it.cap === 'dome' ? it.r * 0.5 : 0)) / 2, 0, it.r * 2, it.h + (it.cap === 'dome' ? it.r * 0.5 : 0), it.r * 2)],
  });
  // Château d'eau sur pieds : { r, h (pieds), th (cuve) }
  I('watertower', {
    layer: 'structure',
    foot: (it) => G.obb(it.x, it.z, it.r * 2.4, it.r * 2.4, 0),
    solids: (it) => {
      const s = [bx(it, 0, it.h + it.th / 2 + 0.4, 0, it.r * 2, it.th + 0.8, it.r * 2)];
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s.push(bx(it, a * it.r * 0.7, it.h / 2, b * it.r * 0.7, 0.5, it.h, 0.5));
      return s;
    },
  });
  // Mât d'antenne en treillis : { h }
  I('mast', { layer: 'structure', foot: (it) => G.obb(it.x, it.z, 3, 3, it.yaw), solids: (it) => [bx(it, 0, it.h / 2, 0, 1.4, it.h, 1.4)] });
  // Portique de quai (grue portuaire) : { span (x), depth (z), h (dessous de la poutre) }
  I('crane', {
    layer: 'obstacle',
    foot: (it) => G.obb(it.x, it.z, it.span + 2, it.depth + 2, it.yaw),
    solids: (it) => {
      const s = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) s.push(bx(it, a * it.span / 2, it.h / 2, b * it.depth / 2, 1.4, it.h, 1.4));
      s.push(bx(it, 0, it.h + 1.6, 0, it.span + 16, 3.2, it.depth + 1.4));   // poutre qui déborde côté mer
      s.push(bx(it, it.span * 0.15, it.h - 2, 0, 4, 4, 4));                    // chariot et cabine
      return s;
    },
  });
  // Grue à tour (chantier) : { h, jib, jibYaw (relatif) }
  I('towercrane', {
    layer: 'obstacle',
    foot: (it) => G.obb(it.x, it.z, 5, 5, 0),
    solids: (it) => {
      const j = Object.assign({}, it, { yaw: (it.yaw || 0) + it.jibYaw });
      return [bx(it, 0, it.h / 2, 0, 2, it.h, 2), bx(j, 0, it.h + 1, -it.jib / 2 + 4, 1.8, 2, it.jib), bx(j, 0, it.h + 1, 7, 2.4, 2.6, 14)];
    },
  });
  // Mur / clôture le long de l'axe x local : { len, h, th (épaisseur), style }
  I('wall', { layer: 'structure', foot: (it) => rect(it, it.len, it.th + 0.4), solids: (it) => [bx(it, 0, it.h / 2, 0, it.len, it.h, it.th)] });
  // Conteneurs empilés : { n (hauteur de pile), col }
  I('container', { layer: 'structure', foot: (it) => rect(it, 6.1, 2.5), solids: (it) => [bx(it, 0, it.n * 1.3, 0, 6.1, it.n * 2.6, 2.45)] });
  // Portique routier (panneaux au-dessus de la rue) : { span, h }
  I('gantry', {
    layer: 'obstacle',
    foot: (it) => rect(it, it.span + 1, 1.2),
    solids: (it) => [bx(it, -it.span / 2, it.h / 2, 0, 0.8, it.h, 0.8), bx(it, it.span / 2, it.h / 2, 0, 0.8, it.h, 0.8), bx(it, 0, it.h + 1.1, 0, it.span + 0.8, 2.2, 0.9)],
  });
  // Passerelle entre deux immeubles au-dessus de la rue : { span, y (dessous), th, w }
  I('skybridge', { layer: 'obstacle', foot: (it) => rect(it, 0.1, 0.1), solids: (it) => [bx(it, 0, it.y + it.th / 2, 0, it.span, it.th, it.w)] });
  // Rack de tuyauteries au-dessus d'une voie : { span, h, w }
  I('piperack', {
    layer: 'obstacle',
    foot: (it) => rect(it, it.span + 1, it.w + 1),
    solids: (it) => [bx(it, -it.span / 2, it.h / 2, 0, 0.7, it.h, it.w), bx(it, it.span / 2, it.h / 2, 0, 0.7, it.h, it.w), bx(it, 0, it.h + 0.9, 0, it.span, 1.8, it.w)],
  });
  // Câble (ligne électrique, téléphérique) entre deux pylônes : { a:[x,y,z], b:[x,y,z], poles } — mortel
  I('cable', {
    layer: 'obstacle',
    foot: (it) => G.obb(it.a[0], it.a[2], 1.5, 1.5, 0),
    solids: (it) => {
      const s = [], dx = it.b[0] - it.a[0], dz = it.b[2] - it.a[2], L = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
      const lo = Math.min(it.a[1], it.b[1]) - (it.sag || 0), hi = Math.max(it.a[1], it.b[1]);
      s.push({ x: (it.a[0] + it.b[0]) / 2, y: (lo + hi) / 2, z: (it.a[2] + it.b[2]) / 2, w: 0.5, h: hi - lo + 0.5, d: L, yaw, kind: 'cable' });
      if (it.poles !== false) for (const p of [it.a, it.b]) s.push({ x: p[0], y: (p[1] + (it.y0 || 0)) / 2, z: p[2], w: 0.8, h: p[1] - (it.y0 || 0) + 0.6, d: 0.8, yaw: 0, kind: 'solid' });
      return s;
    },
  });
  // Laser (barrage rouge) : { a, b } — mortel
  I('laser', {
    layer: 'obstacle',
    foot: (it) => G.obb(it.a[0], it.a[2], 1, 1, 0),
    solids: (it) => {
      const dx = it.b[0] - it.a[0], dz = it.b[2] - it.a[2], L = Math.hypot(dx, dz);
      return [{ x: (it.a[0] + it.b[0]) / 2, y: (it.a[1] + it.b[1]) / 2, z: (it.a[2] + it.b[2]) / 2, w: 0.9, h: Math.abs(it.a[1] - it.b[1]) + 0.9, d: L, yaw: Math.atan2(dx, dz), kind: 'hazard' },
        ...[it.a, it.b].map((p) => ({ x: p[0], y: p[1] / 2 + 0.3, z: p[2], w: 0.8, h: p[1] + 0.6, d: 0.8, yaw: 0, kind: 'solid' }))];
    },
  });
  // Vitre à traverser (se brise) : { w, h, yc } — traversable
  I('glass', { layer: 'obstacle', foot: (it) => rect(it, 0.1, 0.1), solids: (it) => [bx(it, 0, it.yc, 0, it.w, it.h, 0.14, 'glass')] });
  // Caisse (se brise) : { s }
  I('crate', { layer: 'decor', foot: (it) => rect(it, it.s, it.s), solids: (it) => [bx(it, 0, it.s / 2 + 0.1, 0, it.s, it.s, it.s, 'brick')] });
  // Arbre (tronc = collision, comme LevelBuilder.tree) : { h, rad }
  I('tree', { layer: 'decor', foot: (it) => G.obb(it.x, it.z, it.rad * 2 + 1, it.rad * 2 + 1, 0), solids: (it) => [{ x: it.x, y: (it.y0 || 0) + it.h / 2, z: it.z, w: it.rad * 1.7, h: it.h, d: it.rad * 1.7, yaw: 0, kind: 'solid', implicit: true }] });
  // Rocher (comme LevelBuilder.rockLump, boîte englobante prudente) : { s }
  I('rock', { layer: 'decor', foot: (it) => G.obb(it.x, it.z, it.s * 2, it.s * 2, 0), solids: (it) => [{ x: it.x, y: (it.y0 || 0) + it.s * 0.2, z: it.z, w: it.s * 1.95, h: it.s * 0.7, d: it.s * 1.95, yaw: 0, kind: 'solid', implicit: true }] });
  // Arche rocheuse au-dessus du fond de vallée : { span, h (dessous), th (épaisseur), depth }
  I('arch', {
    layer: 'obstacle', foot: (it) => rect(it, it.span + it.th * 2, it.depth),
    solids: (it) => [bx(it, -it.span / 2 - it.th / 2, (it.h + it.th) / 2, 0, it.th, it.h + it.th, it.depth), bx(it, it.span / 2 + it.th / 2, (it.h + it.th) / 2, 0, it.th, it.h + it.th, it.depth), bx(it, 0, it.h + it.th / 2, 0, it.span + it.th * 2, it.th, it.depth)],
  });
  I('pillar', { layer: 'obstacle', foot: (it) => rect(it, it.w, it.w), solids: (it) => [bx(it, 0, it.h / 2, 0, it.w, it.h, it.w)] });
  // Pont routier au-dessus d'une vallée : { span, y (tablier), w }
  I('bridge', {
    layer: 'obstacle', foot: (it) => rect(it, 2, 2),
    solids: (it) => [bx(it, 0, it.y + 0.8, 0, it.span, 1.6, it.w), bx(it, -it.span * 0.2, it.y / 2, 0, 2.4, it.y, it.w - 1), bx(it, it.span * 0.2, it.y / 2, 0, 2.4, it.y, it.w - 1)],
  });
  // Plateforme du lanceur (toit, tour, rebord rocheux) : { w, d, h (dessus), style }
  I('platform', {
    layer: 'structure', foot: (it) => rect(it, it.w, it.d),
    solids: (it) => it.style === 'tower'
      ? [bx(it, 0, it.h - 0.3, 0, it.w, 0.6, it.d), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => bx(it, a * (it.w / 2 - 0.4), (it.h - 0.6) / 2, b * (it.d / 2 - 0.4), 0.6, it.h - 0.6, 0.6))]
      : [bx(it, 0, it.h / 2, 0, it.w, it.h, it.d)],
  });
  // Mises en situation de la cible (mission.js) : murs de protection, filet de camouflage, bunker
  I('revetment', {
    layer: 'structure', foot: (it) => rect(it, it.w, it.d),
    solids: (it) => {
      const t = 1.4, { w, d, h } = it;
      return [bx(it, 0, h / 2, -d / 2 + t / 2, w, h, t), bx(it, -w / 2 + t / 2, h / 2, 0, t, h, d), bx(it, w / 2 - t / 2, h / 2, 0, t, h, d)];   // ouvert à l'avant (+z)
    },
  });
  I('canopy', {
    layer: 'structure', foot: (it) => rect(it, it.w, it.d),
    solids: (it) => {
      const s = [bx(it, 0, it.h + 0.3, 0, it.w, 0.6, it.d)];
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s.push(bx(it, a * (it.w / 2 - 0.3), it.h / 2, b * (it.d / 2 - 0.3), 0.35, it.h, 0.35));
      return s;
    },
  });

  // ---------- décor (petits objets ; collision seulement s'ils sont assez gros pour arrêter la roquette) ----------
  const small = (id, w, d, h, collide) => I(id, {
    layer: 'decor', foot: (it) => rect(it, (it.w || w), (it.d || d)),
    solids: collide ? (it) => [bx(it, 0, (it.h || h) / 2, 0, it.w || w, it.h || h, it.d || d)] : () => [],
  });
  small('car', 2, 4.4, 1.5, true);
  small('truckDecor', 2.6, 7.5, 3.2, true);
  small('sandbags', 6, 1.4, 1.2, true);
  small('barrier', 6, 0.7, 1.0, true);
  small('hay', 1.6, 1.6, 1.6, true);
  small('tent', 5, 6, 3, true);
  small('pump', 2, 7, 5, true);
  small('shed', 5, 4, 3.2, true);
  small('pallets', 1.4, 1.4, 1.2, false);
  small('barrels', 2, 2, 1, false);
  small('debris', 3, 3, 0.8, false);
  small('bush', 2.2, 2.2, 1.4, false);
  small('lamp', 0.5, 0.5, 9, false);
  small('flood', 0.8, 0.8, 12, false);
  small('flag', 0.3, 0.3, 9, false);
  small('sign', 3, 0.3, 4, false);
  small('bench', 2, 0.6, 0.6, false);
  small('log', 5, 0.8, 0.8, false);
  small('tires', 1.5, 1.5, 1.1, false);
  for (const id of ['marking', 'crops', 'pad']) small(id, 1, 1, 0, false).flat = true;   // au sol : n'occupent pas l'espace

  // =====================================================================================================================
  // GABARITS DE ZONE
  // =====================================================================================================================
  const T = (id, o) => G.Templates.add(id, o);
  const STRUCT = (t) => t === 'road' || t === 'bld' || t === 'reserve' || t === 'water';
  const DECOR = (t) => t === 'bld' || t === 'reserve' || t === 'decor' || t === 'water';

  /* Pose un objet si son emprise est libre (routes, bâtiments, zones réservées) ; renvoie l'objet ou null. */
  G.put = (plan, it, margin, accept) => {
    const def = G.Items.get(it.t);
    const o = def.foot(it);
    if (!plan.space.free(o, margin || 0, accept || (def.layer === 'decor' ? DECOR : STRUCT))) return null;
    if (it.y0 === undefined) {
      const gr = G.groundRange(plan, o);
      it.y0 = def.layer === 'decor' ? G.heightAt(plan, it.x, it.z) : gr[0] - (gr[1] - gr[0] > 0.3 ? 0.4 : 0);   // bâtiment : enfoncé dans la pente
      if (def.layer !== 'decor' && it.h !== undefined) it.h += gr[1] - gr[0] > 0.3 ? (gr[1] - gr[0]) * 0.5 : 0;
    }
    plan.add(it);
    if (!def.flat) plan.space.add(o, def.layer === 'decor' ? 'decor' : 'bld', it);
    return it;
  };
  // Point du repère d'une parcelle (x local ∈ [−w/2, w/2], z local ∈ [−d/2, d/2]) → monde
  const at = (pc, lx, lz) => G.local(pc.obb, lx, lz);
  const W = (pc) => pc.obb.hw * 2, D = (pc) => pc.obb.hd * 2;
  const tintOf = (r) => r.pick(['#ffffff', '#f2f0ee', '#eae6e2', '#e2ded8', '#f6f2ea']);
  // hauteur d'immeuble selon la densité (la difficulté densifie et élève la ville)
  const bh = (plan, r, lo, hi) => { const k = plan.profile.buildingDensity; return r.range(lo, lo + (hi - lo) * (0.35 + 0.65 * k)); };
  const facadeMat = (plan, r, b) => ({ side: r.pick((b || plan.biome).facades || ['facade']), top: r.pick(['concrete', 'concreteDark']) });

  // Rangée de bâtiments le long d'un côté de la parcelle (façade vers la rue), avec ruelles éventuelles
  function frontage(plan, pc, r, side, o) {
    const w = W(pc), d = D(pc), along = side === 'n' || side === 's' ? w : d, across = side === 'n' || side === 's' ? d : w;
    const depth = Math.min(across * 0.45, r.range(o.depth[0], o.depth[1]));
    let u = -along / 2 + (o.inset || 0);
    const end = along / 2 - (o.inset || 0);
    while (u < end - 8) {
      const bw = Math.min(end - u, r.range(o.width[0], o.width[1]));
      if (bw < 8) break;
      const cu = u + bw / 2;
      let lx, lz, yaw;
      if (side === 'n') { lx = cu; lz = -d / 2 + depth / 2; yaw = 0; }
      else if (side === 's') { lx = cu; lz = d / 2 - depth / 2; yaw = 0; }
      else if (side === 'w') { lx = -w / 2 + depth / 2; lz = cu; yaw = Math.PI / 2; }
      else { lx = w / 2 - depth / 2; lz = cu; yaw = Math.PI / 2; }
      const p = at(pc, lx, lz), h = o.h(r);
      const ww = yaw ? depth : bw - 0.2, dd = yaw ? bw - 0.2 : depth;
      G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw + yaw, w: ww, d: dd, h, mat: o.mat(r), tint: tintOf(r), roof: o.roof ? o.roof(r) : 'flat' }, 0.1);
      u += bw + (r.chance(o.alley || 0) ? r.range(6, 12) : 0.2);
    }
  }

  // ---------- ville ----------
  T('cityBlock', {
    fits: (pc) => W(pc) > 30 && D(pc) > 30,
    fill(plan, pc, r) {
      const o = { depth: [12, 20], width: [12, 28], h: (rr) => bh(plan, rr, 14, 70), mat: (rr) => facadeMat(plan, rr, pc.biome), alley: 0.25 };
      frontage(plan, pc, r, 'n', o); frontage(plan, pc, r, 's', o);
      const inner = Object.assign({}, o, { inset: 20 });
      frontage(plan, pc, r, 'w', inner); frontage(plan, pc, r, 'e', inner);
      // cour intérieure : quelques arbres / voitures
      for (let i = 0; i < 4; i++) { const p = at(pc, r.range(-W(pc) * 0.2, W(pc) * 0.2), r.range(-D(pc) * 0.2, D(pc) * 0.2)); G.put(plan, r.chance(0.5) ? { t: 'tree', x: p[0], z: p[1], h: r.range(7, 11), rad: 0.35, broad: true } : { t: 'car', x: p[0], z: p[1], yaw: r() * 6.28, col: carCol(r) }, 1); }
    },
  });
  T('towerBlock', {
    fits: (pc) => W(pc) > 34 && D(pc) > 34,
    fill(plan, pc, r) {
      const n = r.chance(0.5) ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const tw = r.range(18, Math.min(34, W(pc) * 0.6)), td = r.range(18, Math.min(34, D(pc) * 0.6));
        const lx = n === 1 ? r.range(-1, 1) * (W(pc) - tw) * 0.3 : (i ? 1 : -1) * (W(pc) - tw) * 0.35, lz = r.range(-1, 1) * (D(pc) - td) * 0.3;
        const p = at(pc, lx, lz);
        G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw, w: tw, d: td, h: bh(plan, r, 40, 115), mat: { side: r.pick(['facade', 'facadeTan', 'facadeDark', 'facadePink']), top: 'concreteDark' }, tint: tintOf(r) }, 2);
      }
      scatter(plan, pc, r, 6, () => ({ t: 'tree', h: r.range(7, 11), rad: 0.35, broad: true }), 2);
      scatter(plan, pc, r, 4, () => ({ t: 'lamp' }), 1);
    },
  });
  T('lowrise', {
    fits: (pc) => W(pc) > 20 && D(pc) > 20,
    fill(plan, pc, r) {
      const o = { depth: [9, 14], width: [9, 18], h: (rr) => bh(plan, rr, 7, 22), mat: (rr) => facadeMat(plan, rr, pc.biome), alley: 0.4 };
      frontage(plan, pc, r, 'n', o); frontage(plan, pc, r, 's', o);
      scatter(plan, pc, r, 5, () => (r.chance(0.5) ? { t: 'car', yaw: r() * 6.28, col: carCol(r) } : { t: 'tree', h: r.range(6, 10), rad: 0.3, broad: true }), 1);
    },
  });
  T('park', {
    fits: () => true,
    fill(plan, pc, r) {
      scatter(plan, pc, r, Math.round(W(pc) * D(pc) / 260), () => ({ t: 'tree', h: r.range(8, 16), rad: r.range(0.35, 0.6), broad: r.chance(0.7) }), 2.5);
      scatter(plan, pc, r, 6, () => ({ t: 'bench', yaw: r.pick([0, Math.PI / 2]) }), 1);
      scatter(plan, pc, r, 5, () => ({ t: 'lamp' }), 1);
      if (r.chance(0.5)) { const p = at(pc, 0, 0); G.put(plan, { t: 'pillar', x: p[0], z: p[1], yaw: 0, w: 2.4, h: r.range(6, 14), mat: 'concreteWarm' }, 2); }   // monument
    },
  });
  T('plaza', {
    fits: () => true,
    fill(plan, pc, r) {
      const p = at(pc, 0, 0);
      G.put(plan, { t: 'marking', x: p[0], z: p[1], yaw: pc.obb.yaw, w: W(pc) - 4, d: D(pc) - 4, style: 'paving' }, 0, () => false);
      if (r.chance(0.7)) G.put(plan, { t: 'pillar', x: p[0], z: p[1], yaw: 0, w: r.range(2, 4), h: r.range(8, 22), mat: 'concreteWarm' }, 2);
      scatter(plan, pc, r, 8, () => ({ t: 'lamp' }), 1);
      scatter(plan, pc, r, 5, () => ({ t: 'tree', h: r.range(7, 10), rad: 0.35, broad: true }), 2);
    },
  });
  T('parking', {
    fits: (pc) => W(pc) > 22 && D(pc) > 22,
    fill(plan, pc, r) {
      const p = at(pc, 0, 0);
      G.put(plan, { t: 'marking', x: p[0], z: p[1], yaw: pc.obb.yaw, w: W(pc) - 4, d: D(pc) - 4, style: 'parking' }, 0, () => false);
      for (let lz = -D(pc) / 2 + 6; lz < D(pc) / 2 - 6; lz += 12) for (let lx = -W(pc) / 2 + 4; lx < W(pc) / 2 - 4; lx += 3) {
        if (r.chance(0.45)) continue;
        const q = at(pc, lx, lz + (r.chance(0.5) ? 2.5 : -2.5));
        G.put(plan, { t: 'car', x: q[0], z: q[1], yaw: pc.obb.yaw + (r.chance(0.5) ? 0 : Math.PI), col: carCol(r) }, 0.2);
      }
      scatter(plan, pc, r, 4, () => ({ t: 'lamp' }), 1);
    },
  });
  T('construction', {
    fits: (pc) => W(pc) > 30 && D(pc) > 30,
    fill(plan, pc, r) {
      const w = Math.min(W(pc) - 12, r.range(18, 34)), d = Math.min(D(pc) - 12, r.range(16, 30)), p = at(pc, 0, 0);
      const floors = Math.round(bh(plan, r, 3, 9)), fh = r.range(3.8, 4.6);
      G.put(plan, { t: 'skeleton', x: p[0], z: p[1], yaw: pc.obb.yaw, w, d, floors, floorH: fh }, 1);
      const c = at(pc, r.sign() * (w / 2 + 3.5), r.range(-d / 3, d / 3));
      G.put(plan, { t: 'towercrane', x: c[0], z: c[1], yaw: pc.obb.yaw, h: floors * fh + r.range(10, 20), jib: r.range(30, 45), jibYaw: r() * 6.28 }, 0.5);
      scatter(plan, pc, r, 10, () => ({ t: 'crate', s: r.range(1.4, 2.2), yaw: r() * 6.28 }), 0.5);
      scatter(plan, pc, r, 3, () => ({ t: 'debris', yaw: r() * 6.28 }), 0.5);
    },
  });

  // ---------- industrie ----------
  T('warehouseYard', {
    fits: (pc) => W(pc) > 36 && D(pc) > 30,
    fill(plan, pc, r) {
      const n = W(pc) > 90 && r.chance(0.6) ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const w = Math.min(W(pc) / n - 10, r.range(30, 60)), d = Math.min(D(pc) - 18, r.range(24, 50));
        const p = at(pc, n === 1 ? r.range(-1, 1) * (W(pc) - w) * 0.25 : (i ? 1 : -1) * W(pc) / 4, -D(pc) / 2 + d / 2 + 4);
        G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw, w, d, h: bh(plan, r, 9, 18), mat: { side: r.pick(['metal', 'concrete', 'concreteWarm']), top: 'metal' }, tint: tintOf(r), roof: r.chance(0.6) ? 'saw' : 'flat' }, 2);
      }
      for (let i = 0; i < r.int(1, 3); i++) { const q = at(pc, r.range(-W(pc) / 3, W(pc) / 3), D(pc) / 2 - 7); G.put(plan, { t: 'truckDecor', x: q[0], z: q[1], yaw: pc.obb.yaw + r.pick([0, Math.PI / 2]), mil: false }, 1); }
      scatter(plan, pc, r, 8, () => ({ t: r.pick(['pallets', 'barrels', 'crate']), s: 1.6, yaw: r() * 6.28 }), 0.5);
      if (r.chance(0.5)) containers(plan, pc, r, 2, 6);
    },
  });
  T('factory', {
    fits: (pc) => W(pc) > 40 && D(pc) > 40,
    fill(plan, pc, r) {
      const w = Math.min(W(pc) - 16, r.range(34, 70)), d = Math.min(D(pc) - 16, r.range(26, 48)), p = at(pc, 0, r.range(-4, 4));
      const h = bh(plan, r, 12, 30);
      G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw, w, d, h, mat: { side: r.pick(['brick', 'concrete', 'metal']), top: 'concreteDark' }, tint: tintOf(r), roof: r.chance(0.5) ? 'saw' : 'flat' }, 2);
      for (let i = 0; i < r.int(1, 3); i++) {
        const q = at(pc, r.range(-W(pc) / 2 + 6, W(pc) / 2 - 6), r.chance(0.5) ? -D(pc) / 2 + 5 : D(pc) / 2 - 5);
        G.put(plan, { t: 'cyl', x: q[0], z: q[1], r: r.range(1.4, 2.4), h: h + bh(plan, r, 15, 50), cap: 'flat', mat: r.pick(['brick', 'concrete']), chimney: true }, 1);
      }
      for (let i = 0; i < r.int(1, 4); i++) { const q = at(pc, r.range(-W(pc) / 2 + 6, W(pc) / 2 - 6), r.range(-D(pc) / 2 + 6, D(pc) / 2 - 6)); G.put(plan, { t: 'cyl', x: q[0], z: q[1], r: r.range(3, 6), h: r.range(6, 14), cap: 'dome', mat: 'metal', tint: '#e8e8e8' }, 1.5); }
      scatter(plan, pc, r, 6, () => ({ t: r.pick(['barrels', 'pallets', 'debris']), yaw: r() * 6.28 }), 0.5);
    },
  });
  T('tankFarm', {
    fits: (pc) => W(pc) > 30 && D(pc) > 30,
    fill(plan, pc, r) {
      const rad = r.range(5, 9), gap = r.range(4, 8), step = rad * 2 + gap;
      for (let lx = -W(pc) / 2 + rad + 4; lx < W(pc) / 2 - rad - 4; lx += step) for (let lz = -D(pc) / 2 + rad + 4; lz < D(pc) / 2 - rad - 4; lz += step) {
        if (r.chance(0.2)) continue;
        const q = at(pc, lx, lz);
        G.put(plan, { t: 'cyl', x: q[0], z: q[1], r: rad * r.range(0.8, 1), h: r.range(8, 16), cap: 'dome', mat: 'metal', tint: r.pick(['#f0f0f0', '#e4e0d8', '#d8dcd0']) }, 1);
      }
      berm(plan, pc, r, 1.8);
    },
  });
  T('containerYard', {
    fits: (pc) => W(pc) > 24 && D(pc) > 20,
    fill(plan, pc, r) {
      containers(plan, pc, r, 1, 1 + Math.round(plan.profile.buildingDensity * 3));
      if (W(pc) > 50 && r.chance(0.5)) { const p = at(pc, 0, 0); G.put(plan, { t: 'crane', x: p[0], z: p[1], yaw: pc.obb.yaw, span: Math.min(W(pc) - 8, 40), depth: 10, h: r.range(16, 24) }, 0, (t) => t === 'road' || t === 'reserve'); }
      scatter(plan, pc, r, 3, () => ({ t: 'lamp' }), 1);
    },
  });
  T('lot', {
    fits: () => true,
    fill(plan, pc, r) {
      if (r.chance(0.6)) { const p = at(pc, r.range(-W(pc) / 4, W(pc) / 4), r.range(-D(pc) / 4, D(pc) / 4)); G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw, w: r.range(8, 16), d: r.range(8, 14), h: r.range(4, 8), mat: { side: 'metal', top: 'metal' }, tint: tintOf(r) }, 2); }
      scatter(plan, pc, r, 10, () => ({ t: r.pick(['debris', 'barrels', 'tires', 'pallets', 'crate']), s: 1.6, yaw: r() * 6.28 }), 0.5);
      scatter(plan, pc, r, 2, () => ({ t: 'truckDecor', yaw: r() * 6.28, mil: false }), 1);
      scatter(plan, pc, r, 2, () => ({ t: 'lamp' }), 1);
    },
  });

  // ---------- base militaire ----------
  // Enceinte grillagée (portail d'un côté, mirador à un angle) : chaque îlot de la base est un compound
  function compound(plan, pc, r) {
    const side = r.int(0, 3), gate = r.range(10, 14);
    const sides = [[0, -D(pc) / 2 + 0.5, W(pc) - 1, 0], [0, D(pc) / 2 - 0.5, W(pc) - 1, 0], [-W(pc) / 2 + 0.5, 0, D(pc) - 1, Math.PI / 2], [W(pc) / 2 - 0.5, 0, D(pc) - 1, Math.PI / 2]];
    sides.forEach(([lx, lz, len, yaw], k) => {
      const parts = k === side ? [[-(gate / 2 + (len - gate) / 4), (len - gate) / 2], [gate / 2 + (len - gate) / 4, (len - gate) / 2]] : [[0, len]];
      for (const [u, l] of parts) { const q = at(pc, lx + (yaw ? 0 : u), lz + (yaw ? u : 0)); G.put(plan, { t: 'wall', x: q[0], z: q[1], yaw: pc.obb.yaw + yaw, len: l, h: 2.6, th: 0.2, style: 'fence' }, 0); }
    });
    if (r.chance(0.6)) { const c = r.pick([[-1, -1], [1, -1], [-1, 1], [1, 1]]); const q = at(pc, c[0] * (W(pc) / 2 - 4), c[1] * (D(pc) / 2 - 4)); G.put(plan, { t: 'platform', x: q[0], z: q[1], yaw: pc.obb.yaw, w: 3.2, d: 3.2, h: r.range(7, 10), style: 'tower' }, 0.3); }
  }
  T('barracks', {
    fits: (pc) => W(pc) > 30 && D(pc) > 30,
    fill(plan, pc, r) {
      compound(plan, pc, r);
      const n = Math.max(2, Math.floor((D(pc) - 12) / 15)), len = Math.min(W(pc) - 14, r.range(26, 48)), gable = r.chance(0.5), mat = r.pick(['concrete', 'cream', 'concreteWarm']);
      for (let i = 0; i < n; i++) {
        const lz = -D(pc) / 2 + 8 + (i + 0.5) * (D(pc) - 16) / n, p = at(pc, r.range(-2, 2), lz);
        G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw, w: len, d: r.range(8, 10), h: r.range(4.5, 6.5), mat: { side: mat, top: gable ? 'roofBrown' : 'concreteDark' }, tint: tintOf(r), roof: gable ? 'gable' : 'flat' }, 1.5);
      }
      const q = at(pc, -W(pc) / 2 + 5, -D(pc) / 2 + 5); G.put(plan, { t: 'flag', x: q[0], z: q[1] }, 0.5);
      scatter(plan, pc, r, 6, () => ({ t: r.pick(['sandbags', 'barrier', 'truckDecor']), yaw: pc.obb.yaw + r.pick([0, Math.PI / 2]), mil: true }), 1);
      scatter(plan, pc, r, 4, () => ({ t: 'flood' }), 2);
    },
  });
  T('hangarRow', {
    fits: (pc) => W(pc) > 34 && D(pc) > 34,
    fill(plan, pc, r) {
      compound(plan, pc, r);
      const n = W(pc) > 90 ? r.int(2, 3) : 1, w = Math.min(W(pc) / n - 8, r.range(24, 36)), d = Math.min(D(pc) - 18, r.range(24, 40));
      for (let i = 0; i < n; i++) {
        const p = at(pc, -W(pc) / 2 + (i + 0.5) * W(pc) / n, -D(pc) / 2 + d / 2 + 4);
        G.put(plan, { t: 'hangar', x: p[0], z: p[1], yaw: pc.obb.yaw, w, d, h: r.range(8, 11), doorW: w * r.range(0.6, 0.8), doorH: r.range(6, 8), mat: r.pick(['metal', 'concreteDark', 'camo']) }, 2);
      }
      const q = at(pc, 0, D(pc) / 2 - 7); G.put(plan, { t: 'marking', x: q[0], z: q[1], yaw: pc.obb.yaw, w: W(pc) - 8, d: 8, style: 'apron' }, 0, () => false);
      scatter(plan, pc, r, 4, () => ({ t: r.pick(['truckDecor', 'barrels', 'pallets']), yaw: pc.obb.yaw + r.range(-0.3, 0.3), mil: true }), 1);
    },
  });
  T('motorPool', {
    fits: (pc) => W(pc) > 26 && D(pc) > 26,
    fill(plan, pc, r) {
      compound(plan, pc, r);
      for (const rowZ of [-D(pc) / 4, D(pc) / 6]) for (let lx = -W(pc) / 2 + 7; lx < W(pc) / 2 - 7; lx += 5.5) {
        if (r.chance(0.3)) continue;
        const q = at(pc, lx, rowZ + r.range(-1, 1)); G.put(plan, { t: 'truckDecor', x: q[0], z: q[1], yaw: pc.obb.yaw + (r.chance(0.15) ? 0.25 : 0), mil: true }, 0.4);
      }
      const p = at(pc, 0, -D(pc) / 2 + 7); G.put(plan, { t: 'canopy', x: p[0], z: p[1], yaw: pc.obb.yaw, w: Math.min(W(pc) - 12, 32), d: 10, h: 5 }, 0.5);
      scatter(plan, pc, r, 6, () => ({ t: r.pick(['barrels', 'tires', 'pallets']), yaw: r() * 6.28 }), 0.5);
    },
  });
  T('helipad', {
    fits: (pc) => W(pc) > 30 && D(pc) > 30,
    fill(plan, pc, r) {
      compound(plan, pc, r);
      const n = W(pc) > 70 ? 2 : 1;
      for (let i = 0; i < n; i++) { const p = at(pc, (n === 1 ? 0 : (i ? 1 : -1) * W(pc) / 4), 0); G.put(plan, { t: 'pad', x: p[0], z: p[1], yaw: pc.obb.yaw, w: 18, d: 18 }, 0, () => false); }
      const q = at(pc, W(pc) / 2 - 7, -D(pc) / 2 + 7); G.put(plan, { t: 'bld', x: q[0], z: q[1], yaw: pc.obb.yaw, w: 6, d: 6, h: r.range(10, 16), mat: { side: 'concrete', top: 'concreteDark' }, tint: '#ffffff', tower: true }, 1);
      scatter(plan, pc, r, 3, () => ({ t: 'flood' }), 2);
      scatter(plan, pc, r, 3, () => ({ t: 'barrels', yaw: r() * 6.28 }), 1);
    },
  });
  T('depot', {
    fits: (pc) => W(pc) > 26 && D(pc) > 26,
    fill(plan, pc, r) {
      compound(plan, pc, r);
      for (let i = 0; i < r.int(3, 6); i++) {                          // piles de caisses de munitions (elles se brisent)
        const c = at(pc, r.range(-W(pc) / 3, W(pc) / 3), r.range(-D(pc) / 3, D(pc) / 3));
        for (let k = 0; k < r.int(3, 6); k++) G.put(plan, { t: 'crate', x: c[0] + r.range(-2, 2), z: c[1] + r.range(-2, 2), yaw: pc.obb.yaw, s: 1.6 }, 0.05, (t) => t === 'reserve' || t === 'bld');
      }
      containers(plan, Object.assign({}, pc, { obb: G.obb(at(pc, 0, D(pc) / 3)[0], at(pc, 0, D(pc) / 3)[1], W(pc) - 10, 10, pc.obb.yaw) }), r, 1, 2);
      const p = at(pc, -W(pc) / 4, -D(pc) / 3); G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw, w: 16, d: 10, h: 6, mat: { side: 'metal', top: 'metal' }, tint: '#c8ccc0' }, 1);
    },
  });
  T('bunkerField', {
    fits: () => true,
    fill(plan, pc, r) {
      for (let i = 0; i < r.int(2, 4); i++) { const p = at(pc, r.range(-W(pc) / 3, W(pc) / 3), r.range(-D(pc) / 3, D(pc) / 3)); G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw + r.pick([0, Math.PI / 2]), w: r.range(8, 14), d: r.range(6, 10), h: r.range(2.6, 4), mat: { side: 'concreteDark', top: 'concreteDark' }, tint: '#d8d8d0', bunker: true }, 3); }
      scatter(plan, pc, r, 8, () => ({ t: 'sandbags', yaw: r() * 6.28 }), 1);
      scatter(plan, pc, r, 3, () => ({ t: 'barrier', yaw: r() * 6.28 }), 1);
    },
  });
  T('radarSite', {
    fits: (pc) => W(pc) > 24 && D(pc) > 24,
    fill(plan, pc, r) {
      const p = at(pc, 0, 0);
      G.put(plan, { t: 'mast', x: p[0], z: p[1], yaw: 0, h: r.range(22, 42) }, 3);
      const q = at(pc, r.range(-W(pc) / 4, W(pc) / 4), D(pc) / 2 - 7); G.put(plan, { t: 'bld', x: q[0], z: q[1], yaw: pc.obb.yaw, w: 10, d: 7, h: 4, mat: { side: 'concrete', top: 'metal' }, tint: '#ffffff' }, 1);
      fence(plan, pc, r, 2.4);
    },
  });
  T('fuelDump', {
    fits: (pc) => W(pc) > 24 && D(pc) > 24,
    fill(plan, pc, r) {
      for (let i = 0; i < r.int(2, 4); i++) { const q = at(pc, r.range(-W(pc) / 3, W(pc) / 3), r.range(-D(pc) / 3, D(pc) / 3)); G.put(plan, { t: 'cyl', x: q[0], z: q[1], r: r.range(2.5, 4), h: r.range(4, 7), cap: 'dome', mat: 'metal', tint: '#b8bca0' }, 1.5); }
      scatter(plan, pc, r, 10, () => ({ t: 'barrels', yaw: r() * 6.28 }), 0.4);
      berm(plan, pc, r, 1.6);
    },
  });
  T('training', {
    fits: () => true,
    fill(plan, pc, r) {
      scatter(plan, pc, r, 10, () => ({ t: r.pick(['sandbags', 'barrier', 'tires', 'debris']), yaw: r() * 6.28 }), 1.5);
      scatter(plan, pc, r, 2, () => ({ t: 'shed', yaw: pc.obb.yaw }), 2);
      if (r.chance(0.5)) { const p = at(pc, 0, 0); G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw, w: 12, d: 10, h: r.range(6, 10), mat: { side: 'concreteDark', top: 'concreteDark' }, tint: '#c8c4bc', ruined: true }, 2); }
    },
  });

  // ---------- port ----------
  T('warehouseQuay', { fits: (pc) => W(pc) > 30 && D(pc) > 24, fill(plan, pc, r) { G.Templates.get('warehouseYard').fill(plan, pc, r); scatter(plan, pc, r, 6, () => ({ t: 'barrels', yaw: r() * 6.28 }), 0.5); } });
  T('craneQuay', {
    fits: (pc) => W(pc) > 24 && D(pc) > 24,
    fill(plan, pc, r) {
      containers(plan, pc, r, 1, 3);
      const n = Math.max(1, Math.floor(D(pc) / 45));
      for (let i = 0; i < n; i++) {
        const lz = -D(pc) / 2 + (i + 0.5) * D(pc) / n, p = at(pc, 0, lz);
        G.put(plan, { t: 'crane', x: p[0], z: p[1], yaw: pc.obb.yaw, span: Math.min(W(pc) - 6, 36), depth: 12, h: r.range(20, 30) }, 0, (t) => t === 'reserve');
      }
    },
  });

  // ---------- campagne ----------
  T('farmstead', {
    fits: (pc) => W(pc) > 30 && D(pc) > 26,
    fill(plan, pc, r) {
      const p = at(pc, -W(pc) / 4, D(pc) / 4);
      G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw, w: r.range(8, 11), d: r.range(10, 13), h: r.range(4.5, 6.5), mat: { side: r.pick(['brick', 'houseWall', 'cream']), top: 'roofBrown' }, tint: tintOf(r), roof: 'gable' }, 1);
      const q = at(pc, W(pc) / 5, -D(pc) / 6);
      G.put(plan, { t: 'bld', x: q[0], z: q[1], yaw: pc.obb.yaw, w: r.range(14, 20), d: r.range(20, 30), h: r.range(6, 9), mat: { side: r.pick(['planks', 'brick']), top: 'roofBrown' }, tint: r.pick(['#ffffff', '#e0c8c0', '#c89080']), roof: 'gable' }, 1);   // grange
      if (r.chance(0.7)) { const s = at(pc, W(pc) / 2 - 5, -D(pc) / 2 + 5); G.put(plan, { t: 'cyl', x: s[0], z: s[1], r: r.range(2.5, 3.5), h: r.range(10, 16), cap: 'dome', mat: r.pick(['metal', 'concrete']), tint: '#e8e8e8' }, 1); }
      scatter(plan, pc, r, 6, () => ({ t: 'hay', yaw: r() * 6.28 }), 1);
      fence(plan, pc, r, 1.2, true);
    },
  });
  T('hamlet', {
    fits: (pc) => W(pc) > 30 && D(pc) > 30,
    fill(plan, pc, r) {
      const n = r.int(3, 6);
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const p = at(pc, r.range(-W(pc) / 2 + 6, W(pc) / 2 - 6), r.range(-D(pc) / 2 + 6, D(pc) / 2 - 6));
        G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw + r.pick([0, Math.PI / 2]) + r.range(-0.1, 0.1), w: r.range(7, 10), d: r.range(8, 12), h: r.range(4, 7), mat: { side: r.pick(['houseWall', 'brick', 'cream']), top: 'roofBrown' }, tint: tintOf(r), roof: 'gable' }, 3);
      }
      scatter(plan, pc, r, 6, () => ({ t: 'tree', h: r.range(8, 14), rad: 0.4, broad: true }), 2);
      scatter(plan, pc, r, 3, () => ({ t: 'car', yaw: r() * 6.28, col: carCol(r) }), 1);
    },
  });
  T('orchard', {
    fits: () => true,
    fill(plan, pc, r) {
      const s = r.range(7, 10);
      for (let lx = -W(pc) / 2 + 4; lx < W(pc) / 2 - 4; lx += s) for (let lz = -D(pc) / 2 + 4; lz < D(pc) / 2 - 4; lz += s) {
        if (r.chance(0.12)) continue;
        const q = at(pc, lx, lz); G.put(plan, { t: 'tree', x: q[0], z: q[1], h: r.range(5, 8), rad: 0.3, broad: true }, 0.5);
      }
    },
  });
  T('forestPatch', {
    fits: () => true,
    fill(plan, pc, r) {
      scatter(plan, pc, r, Math.round(W(pc) * D(pc) / 70), () => ({ t: 'tree', h: r.range(14, 30), rad: r.range(0.4, 0.9) }), 1.5);
      scatter(plan, pc, r, 6, () => ({ t: r.pick(['rock', 'log', 'bush']), s: r.range(1, 2.4), yaw: r() * 6.28 }), 1);
    },
  });
  T('fieldBarn', {
    fits: (pc) => W(pc) > 24,
    fill(plan, pc, r) {
      const p = at(pc, r.range(-W(pc) / 4, W(pc) / 4), r.range(-D(pc) / 4, D(pc) / 4));
      G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw, w: r.range(10, 16), d: r.range(14, 22), h: r.range(5, 8), mat: { side: 'planks', top: 'roofBrown' }, tint: r.pick(['#ffffff', '#c89080']), roof: 'gable' }, 1);
      G.Templates.get('fields').fill(plan, pc, r);
    },
  });
  T('fields', {
    fits: () => true,
    fill(plan, pc, r) {
      const p = at(pc, 0, 0);
      G.put(plan, { t: 'crops', x: p[0], z: p[1], yaw: pc.obb.yaw, w: W(pc) - 2, d: D(pc) - 2, col: r.pick(['#6a8a3a', '#9a9a4a', '#b8a860', '#5a7a30']) }, 0, () => false);
      scatter(plan, pc, r, r.int(0, 8), () => ({ t: 'hay', yaw: r() * 6.28 }), 2);
      // haie d'arbres sur un bord (obstacle bas pour qui vole au ras du sol)
      if (r.chance(0.5)) for (let lx = -W(pc) / 2 + 2; lx < W(pc) / 2 - 2; lx += r.range(5, 8)) { const q = at(pc, lx, -D(pc) / 2 + 1); G.put(plan, { t: 'tree', x: q[0], z: q[1], h: r.range(7, 12), rad: 0.35, broad: true }, 0.2); }
    },
  });

  // ---------- désert / montagne ----------
  T('outpost', {
    fits: (pc) => W(pc) > 30 && D(pc) > 30,
    fill(plan, pc, r) {
      compoundWall(plan, pc, r, r.range(3, 5));
      const p = at(pc, r.range(-5, 5), r.range(-5, 5));
      G.put(plan, { t: 'bld', x: p[0], z: p[1], yaw: pc.obb.yaw, w: r.range(10, 16), d: r.range(8, 12), h: r.range(4, 7), mat: { side: r.pick(['cream', 'concreteWarm', 'concrete']), top: 'concreteDark' }, tint: tintOf(r) }, 2);
      const q = at(pc, W(pc) / 2 - 5, -D(pc) / 2 + 5); G.put(plan, { t: 'platform', x: q[0], z: q[1], yaw: pc.obb.yaw, w: 3.5, d: 3.5, h: r.range(8, 12), style: 'tower' }, 0.5);
      scatter(plan, pc, r, 4, () => ({ t: r.pick(['tent', 'sandbags', 'barrels']), yaw: pc.obb.yaw }), 1.5);
    },
  });
  T('oilField', {
    fits: () => true,
    fill(plan, pc, r) {
      scatter(plan, pc, r, r.int(2, 5), () => ({ t: 'pump', yaw: r() * 6.28 }), 3);
      for (let i = 0; i < r.int(1, 3); i++) { const q = at(pc, r.range(-W(pc) / 3, W(pc) / 3), r.range(-D(pc) / 3, D(pc) / 3)); G.put(plan, { t: 'cyl', x: q[0], z: q[1], r: r.range(3, 5.5), h: r.range(5, 10), cap: 'flat', mat: 'metal', tint: '#d8d0c0' }, 2); }
      scatter(plan, pc, r, 5, () => ({ t: 'barrels', yaw: r() * 6.28 }), 0.5);
    },
  });
  T('ruins', {
    fits: () => true,
    fill(plan, pc, r) {
      for (let i = 0; i < r.int(3, 7); i++) {
        const q = at(pc, r.range(-W(pc) / 2 + 4, W(pc) / 2 - 4), r.range(-D(pc) / 2 + 4, D(pc) / 2 - 4));
        G.put(plan, { t: 'wall', x: q[0], z: q[1], yaw: pc.obb.yaw + r.pick([0, Math.PI / 2]), len: r.range(4, 12), h: r.range(1.5, 5), th: 0.6, style: r.pick(['cream', 'brick', 'concreteWarm']), broken: true }, 1);
      }
      scatter(plan, pc, r, 5, () => ({ t: r.pick(['debris', 'rock']), s: r.range(0.8, 1.8), yaw: r() * 6.28 }), 0.5);
    },
  });
  T('camp', {
    fits: () => true,
    fill(plan, pc, r) {
      scatter(plan, pc, r, r.int(3, 7), () => ({ t: 'tent', yaw: pc.obb.yaw + r.pick([0, Math.PI / 2]) }), 1.5);
      scatter(plan, pc, r, 2, () => ({ t: 'truckDecor', yaw: r() * 6.28, mil: true }), 1);
      scatter(plan, pc, r, 5, () => ({ t: r.pick(['sandbags', 'barrels']), yaw: r() * 6.28 }), 1);
    },
  });
  T('rockOutcrop', {
    fits: () => true,
    fill(plan, pc, r) { scatter(plan, pc, r, r.int(5, 14), () => ({ t: 'rock', s: r.range(1.5, 4.5) }), 0.5); if (r.chance(0.5)) { const p = at(pc, 0, 0); G.put(plan, { t: 'pillar', x: p[0], z: p[1], yaw: r() * 6.28, w: r.range(5, 9), h: r.range(10, 26), mat: 'rock' }, 1); } },
  });
  T('airstrip', {
    fits: (pc) => Math.max(W(pc), D(pc)) > 60,
    fill(plan, pc, r) {
      const along = W(pc) > D(pc) ? 0 : Math.PI / 2, p = at(pc, 0, 0);
      G.put(plan, { t: 'marking', x: p[0], z: p[1], yaw: pc.obb.yaw + along, w: Math.max(W(pc), D(pc)) - 6, d: 14, style: 'runway' }, 0, () => false);
      const q = at(pc, W(pc) / 2 - 16, D(pc) / 2 - 16);
      G.put(plan, { t: 'hangar', x: q[0], z: q[1], yaw: pc.obb.yaw + Math.PI, w: 24, d: 22, h: 9, doorW: 16, doorH: 7, mat: 'metal' }, 1);
    },
  });
  T('alpineVillage', { fits: () => true, fill(plan, pc, r) { G.Templates.get('hamlet').fill(plan, pc, r); } });
  T('minehead', {
    fits: () => true,
    fill(plan, pc, r) {
      const p = at(pc, 0, 0);
      G.put(plan, { t: 'watertower', x: p[0], z: p[1], r: 3, h: r.range(14, 22), th: 5, headframe: true }, 1);
      scatter(plan, pc, r, 3, () => ({ t: 'shed', yaw: pc.obb.yaw }), 1.5);
      scatter(plan, pc, r, 4, () => ({ t: r.pick(['debris', 'rock', 'log']), s: 1.4, yaw: r() * 6.28 }), 0.5);
    },
  });

  // ---------- sous-ensembles réutilisés ----------
  function scatter(plan, pc, r, n, make, margin) {
    for (let i = 0, k = 0; i < n && k < n * 6; k++) {
      const it = make();
      const p = at(pc, r.range(-W(pc) / 2 + 2, W(pc) / 2 - 2), r.range(-D(pc) / 2 + 2, D(pc) / 2 - 2));
      it.x = p[0]; it.z = p[1];
      if (it.yaw === undefined) it.yaw = 0;
      if (G.put(plan, it, margin)) i++;
    }
  }
  G.scatter = scatter;
  function containers(plan, pc, r, minStack, maxStack) {
    const cols = ['#b8402c', '#2c5a8a', '#3a7a3a', '#c88a2a', '#7a7a7a', '#8a3a6a', '#d0c8b0'];
    for (let lz = -D(pc) / 2 + 4; lz < D(pc) / 2 - 4; lz += 2.7) {
      if (r.chance(0.15)) { lz += 5; continue; }                            // allée entre deux rangées
      for (let lx = -W(pc) / 2 + 4; lx < W(pc) / 2 - 4; lx += 6.4) {
        if (r.chance(0.2)) continue;
        const q = at(pc, lx, lz);
        G.put(plan, { t: 'container', x: q[0], z: q[1], yaw: pc.obb.yaw, n: r.int(minStack, maxStack), col: r.pick(cols) }, 0.05);
      }
    }
  }
  function berm(plan, pc, r, h) {
    for (const [lx, lz, len, yaw] of [[0, -D(pc) / 2 + 1, W(pc) - 2, 0], [0, D(pc) / 2 - 1, W(pc) - 2, 0], [-W(pc) / 2 + 1, 0, D(pc) - 2, Math.PI / 2], [W(pc) / 2 - 1, 0, D(pc) - 2, Math.PI / 2]]) {
      if (r.chance(0.3)) continue;
      const q = at(pc, lx, lz); G.put(plan, { t: 'wall', x: q[0], z: q[1], yaw: pc.obb.yaw + yaw, len, h, th: 1.4, style: 'concreteDark' }, 0);
    }
  }
  function fence(plan, pc, r, h, wooden) {
    for (const [lx, lz, len, yaw] of [[0, -D(pc) / 2 + 0.5, W(pc) - 1, 0], [-W(pc) / 2 + 0.5, 0, D(pc) - 1, Math.PI / 2], [W(pc) / 2 - 0.5, 0, D(pc) - 1, Math.PI / 2]]) {
      if (r.chance(0.25)) continue;
      const q = at(pc, lx, lz); G.put(plan, { t: 'wall', x: q[0], z: q[1], yaw: pc.obb.yaw + yaw, len, h, th: 0.2, style: wooden ? 'fenceWood' : 'fence' }, 0);
    }
  }
  function compoundWall(plan, pc, r, h) {
    const gate = r.range(8, 12);
    for (const [lx, lz, len, yaw, g] of [[0, -D(pc) / 2 + 1, W(pc) - 2, 0, false], [-W(pc) / 2 + 1, 0, D(pc) - 2, Math.PI / 2, false], [W(pc) / 2 - 1, 0, D(pc) - 2, Math.PI / 2, false], [0, D(pc) / 2 - 1, W(pc) - 2, 0, true]]) {
      if (!g) { const q = at(pc, lx, lz); G.put(plan, { t: 'wall', x: q[0], z: q[1], yaw: pc.obb.yaw + yaw, len, h, th: 0.8, style: 'cream' }, 0); continue; }
      const part = (len - gate) / 2;
      for (const sgn of [-1, 1]) { const q = at(pc, sgn * (gate / 2 + part / 2), lz); G.put(plan, { t: 'wall', x: q[0], z: q[1], yaw: pc.obb.yaw, len: part, h, th: 0.8, style: 'cream' }, 0); }
    }
  }
  const carCol = (r) => r.pick(['#b8b8b8', '#2a2a2a', '#8a1a1a', '#e8e8e8', '#2a4a7a', '#6a6a50', '#c8a040']);
  G.carCol = carCol;
})();

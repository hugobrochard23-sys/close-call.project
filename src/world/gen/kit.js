/* Générateur de missions — construction de la carte (plan → LevelBuilder).
 * Le rendu réutilise tout le système visuel du jeu : géométrie fusionnée par matériau, textures pixel-art, façades à
 * travées entières + toits équipés et vitrines (LevelBuilder.decorateBuildings), conifères, rochers à facettes, terrain,
 * nuages, silhouettes lointaines, vitres et caisses destructibles, lasers, câbles, cibles et ennemis détaillés et animés.
 * Collisions : exactement les boîtes du plan (celles que la validation a vérifiées) ; les objets rendus par un outil du
 * LevelBuilder qui crée sa propre collision (arbre, rocher, vitre, caisse, laser, câble) ne sont pas doublés.
 * Extensible : K.builders[type] = (b, it, ctx) => { … } pour un nouveau type d'objet du plan. */
(function () {
  const G = CC.Gen, U = CC.U;
  const K = G.Kit = { builders: {} };
  const DEG = 180 / Math.PI;
  const def = (t, fn) => { K.builders[t] = fn; };

  // ---------- aides ----------
  const vbox = (b, s, mat, tint, shadow) => b.box({ p: [s.x, s.y, s.z], s: [s.w, s.h, s.d], r: [0, (s.yaw || 0) * DEG, 0], mat, tint, collide: false, shadow });
  // boîte dans le repère d'un objet, avec roulis éventuel (rz, degrés) autour de l'axe z local
  const lbox = (b, it, lx, ly, lz, w, h, d, mat, tint, rz, rx, shadow) => {
    const s = G.itemBox(it, lx, ly, lz, w, h, d);
    b.box({ p: [s.x, s.y, s.z], s: [w, h, d], r: [rx || 0, s.yaw * DEG, rz || 0], mat, tint, collide: false, shadow });
  };
  const lcyl = (b, it, lx, ly, lz, rad, h, mat, tint, seg, rTop) => {
    const s = G.itemBox(it, lx, ly, lz, 0, 0, 0);
    b.cylinder({ p: [s.x, s.y, s.z], rTop: rTop !== undefined ? rTop : rad, rBot: rad, h, seg: seg || 10, mat, tint, collide: false, r: [0, s.yaw * DEG, 0] });
  };
  // cylindre couché le long de l'axe x local
  const lcylX = (b, it, lx, ly, lz, rad, len, mat, tint, seg) => {
    const s = G.itemBox(it, lx, ly, lz, 0, 0, 0);
    b.cylinder({ p: [s.x, s.y, s.z], rad, h: len, seg: seg || 8, mat, tint, collide: false, r: [0, s.yaw * DEG, 90] });
  };
  const geo = (b, g, it, lx, ly, lz, mat, tint, scale, extraQ) => {
    const s = G.itemBox(it, lx, ly, lz, 0, 0, 0);
    let q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.yaw, 0));
    if (extraQ) q = q.multiply(extraQ);
    b.addGeometry(g, new THREE.Vector3(s.x, s.y, s.z), q, scale || null, mat, tint);
    g.dispose();
  };
  const WIN = (ctx, r) => (ctx.dark && r() < 0.45 ? 'emis:#e0b868' : 'col:#1e2630');

  /* Construit toute la carte du plan dans le LevelBuilder. */
  K.build = function (b, plan, level) {
    const ctx = { plan, level, env: plan.env, dark: plan.env.dark > 0.4, biome: plan.biome, r: G.stream(plan.seed, 'kit'), snow: plan.env.id === 'snow', proto: {} };
    ground(b, ctx);
    roads(b, ctx);
    for (const it of plan.items) {
      const fn = K.builders[it.t];
      if (fn) fn(b, it, ctx);
      collide(b, it);
    }
    combat(b, ctx);
    if (plan.biome.terrain === 'flat' || plan.biome.terrain === 'coast') {
      const bd = plan.bounds, cx = (bd.x0 + bd.x1) / 2, cz = (bd.z0 + bd.z1) / 2, R = Math.max(bd.x1 - bd.x0, bd.z1 - bd.z0);
      b.skyline(cx, cz, R * 0.75, R * 1.5, 56, 50, 240, plan.env.skyline, -8);
    }
  };

  // Collision : boîtes du plan (les outils qui créent leur propre collision sont exclus)
  const SELF_COLLIDING = { tree: 1, rock: 1, glass: 1, crate: 1, laser: 1, cable: 1 };
  function collide(b, it) {
    if (SELF_COLLIDING[it.t]) return;
    for (const s of G.Items.get(it.t).solids(it)) {
      if (s.implicit || G.passable(s) || s.kind === 'cable' || s.kind === 'hazard') continue;
      b.box({ p: [s.x, s.y, s.z], s: [s.w, s.h, s.d], r: [0, (s.yaw || 0) * DEG, 0], render: false, kind: 'solid', ground: it.t === 'platform' || it.t === 'bridge' });
    }
  }

  // ---------- sol, eau, relief ----------
  function ground(b, ctx) {
    const plan = ctx.plan, B = plan.biome, bd = plan.bounds, T = plan.terrain;
    const cx = (bd.x0 + bd.x1) / 2, cz = (bd.z0 + bd.z1) / 2, W = bd.x1 - bd.x0 + 1400, L = bd.z1 - bd.z0 + 1400;
    const gmat = ctx.snow && B.terrain !== 'flat' ? 'white' : B.ground;
    if (T && T.H) {
      const n = T.n, H = T.H;
      const tint = U.hexToRgb(B.groundTint || '#ffffff').map((v) => v / 255);
      b.terrain({
        x0: T.x0, z0: T.z0, n, step: T.step, mat: gmat,
        height: (x, z) => H[Math.round((z - T.z0) / T.step) * n + Math.round((x - T.x0) / T.step)],
        color: (x, y) => {
          if (B.terrain === 'mountain') {                                 // roche plus claire en hauteur, neige sur les sommets
            const k = 0.62 + Math.min(0.3, Math.max(0, y) / 280);
            if (y > (ctx.snow ? 55 : 105)) return [0.95, 0.96, 1.0];
            return ctx.snow ? [0.85, 0.87, 0.9] : [k * 0.95, k * 0.95, k];
          }
          const k = 0.9 + 0.1 * U.noise2(x * 0.05, y * 0.3, 7);
          return [tint[0] * k, tint[1] * k, tint[2] * k];
        },
      });
      // sol plat sous le relief (au-delà de la grille)
      b.box({ p: [cx, -0.6, cz], s: [W * 1.6, 1, L * 1.6], mat: gmat, tint: B.groundTint, ground: true });
    } else if (plan.coast) {
      const c = plan.coast, far = c.side > 0 ? bd.x0 - 700 : bd.x1 + 700;
      const lx0 = Math.min(far, c.x), lx1 = Math.max(far, c.x);
      b.box({ p: [(lx0 + lx1) / 2, -1.75, cz], s: [lx1 - lx0, 3.5, L], mat: { side: 'concreteDark', top: B.ground, bottom: 'concreteDark' }, tint: B.groundTint, ground: true });
      const wx0 = c.side > 0 ? c.x : c.x - 900, wx1 = c.side > 0 ? c.x + 900 : c.x;
      b.box({ p: [(wx0 + wx1) / 2, -3.2, cz], s: [wx1 - wx0, 2, L], mat: 'water', ground: true });
      for (const p of plan.piers) {
        const o = p.obb;
        b.box({ p: [o.x, -1.4, o.z], s: [o.hw * 2, 2.8, o.hd * 2], mat: { side: 'concreteDark', top: 'concrete', bottom: 'concreteDark' }, ground: true });
        for (let x = -o.hw + 3; x < o.hw - 2; x += 8) for (const sz of [-1, 1]) {           // bollards de bord de quai
          const q = G.local(o, x, sz * (o.hd - 0.8));
          b.cylinder({ p: [q[0], 0.4, q[1]], rTop: 0.28, rBot: 0.34, h: 0.8, seg: 8, mat: 'col:#2a2c30', collide: false });
        }
      }
      // bord de quai : bande claire et bollards le long de la côte
      for (let z = bd.z1; z > bd.z0 - 60; z -= 9) b.cylinder({ p: [c.x - c.side * 0.9, 0.4, z], rTop: 0.28, rBot: 0.34, h: 0.8, seg: 8, mat: 'col:#2a2c30', collide: false });
    } else {
      b.box({ p: [cx, -0.5, cz], s: [W, 1, L], mat: gmat, tint: B.groundTint, ground: true });
    }
  }

  // ---------- routes, trottoirs, marquages ----------
  function roads(b, ctx) {
    const plan = ctx.plan, B = plan.biome;
    const off = { main: 0.05, street: 0.04, path: 0.035 };
    for (const rd of plan.roads) {
      const o = rd.obb, y = G.heightAt(plan, o.x, o.z) + (off[rd.kind] || 0.04);
      b.box({ p: [o.x, y - 0.05, o.z], s: [rd.w, 0.1, o.hd * 2], r: [0, o.yaw * DEG, 0], mat: rd.mat, collide: false, shadow: false });
      // pointillés au centre des grands axes (ville, industrie, base, port)
      if (B.layout === 'grid' && rd.kind === 'main' && rd.w > 14) {
        for (let s = -o.hd + 3; s < o.hd - 3; s += 9) {
          const p = G.local(o, 0, s);
          b.box({ p: [p[0], y + 0.02, p[1]], s: [0.25, 0.04, 4], r: [0, o.yaw * DEG, 0], mat: 'col:#e8e2c8', collide: false, shadow: false });
        }
      }
    }
    // trottoirs : chaque parcelle de ville est un îlot surélevé (bordure de trottoir tout autour)
    if (B.layout === 'grid' && B.sidewalk) {
      for (const pc of plan.parcels) {
        if (pc.pier) continue;
        const o = pc.obb;
        b.box({ p: [o.x, 0.09, o.z], s: [o.hw * 2 + 5.2, 0.18, o.hd * 2 + 5.2], r: [0, o.yaw * DEG, 0], mat: B.sidewalk, collide: false, shadow: false });
      }
    } else {
      // cours des sites (ferme, avant-poste…) : terre battue ou gravier
      for (const pc of plan.parcels) {
        if (pc.field || !pc.zone || pc.zone === 'forestPatch' || pc.zone === 'orchard' || pc.zone === 'rockOutcrop') continue;
        const o = pc.obb, y = G.heightAt(plan, o.x, o.z);
        b.box({ p: [o.x, y + 0.02, o.z], s: [o.hw * 2, 0.06, o.hd * 2], r: [0, o.yaw * DEG, 0], mat: B.id === 'desert' ? 'sand' : B.id === 'military' ? 'concreteDark' : 'dirt', tint: '#d8d0c8', collide: false, shadow: false });
      }
    }
  }

  // ---------- structures ----------
  def('bld', (b, it, ctx) => {
    const m = it.mat || { side: 'concrete', top: 'concreteDark' };
    vbox(b, G.itemBox(it, 0, it.h / 2, 0, it.w, it.h, it.d), { side: m.side, top: m.top || 'concreteDark', bottom: 'concreteDark' }, it.tint);
    const facade = /^facade/.test(m.side);
    if (!facade && !it.bunker) windows(b, it, ctx);
    if (it.roof === 'gable') gable(b, it, ctx);
    else if (it.roof === 'saw') saw(b, it, ctx);
    else if (!facade && it.w > 6 && it.d > 6 && !it.bunker) {                      // acrotère simple
      for (const [lx, lz, w, d] of [[0, it.d / 2 - 0.15, it.w, 0.3], [0, -it.d / 2 + 0.15, it.w, 0.3], [it.w / 2 - 0.15, 0, 0.3, it.d], [-it.w / 2 + 0.15, 0, 0.3, it.d]]) lbox(b, it, lx, it.h + 0.3, lz, w, 0.6, d, 'concreteDark');
    }
    if (it.tower) {                                                                // tour de contrôle : cabine vitrée
      lbox(b, it, 0, it.h + 1.4, 0, it.w + 1.2, 2.8, it.d + 1.2, ctx.dark ? 'emis:#9ad0e8' : 'glass');
      lbox(b, it, 0, it.h + 3.0, 0, it.w + 1.8, 0.4, it.d + 1.8, 'concreteDark');
      lcyl(b, it, 0, it.h + 4.6, 0, 0.06, 3, 'col:#2a2a2a', null, 4);
    }
    if (it.bunker) {
      lbox(b, it, 0, it.h * 0.6, it.d / 2 + 0.02, it.w * 0.6, 0.3, 0.05, 'col:#101214');   // meurtrière
      for (let x = -it.w / 2 + 0.8; x < it.w / 2; x += 1.5) lbox(b, it, x, it.h + 0.3, it.d / 2 - 0.4, 1.4, 0.55, 0.7, 'col:#a89a70');   // sacs sur le toit
    }
    if (it.ruined) for (let i = 0; i < 5; i++) lbox(b, it, ctx.r.range(-it.w / 3, it.w / 3), it.h + ctx.r.range(0.2, 1.5), ctx.r.range(-it.d / 3, it.d / 3), ctx.r.range(1, 3), ctx.r.range(0.5, 2.5), ctx.r.range(1, 3), 'concreteDark', null, ctx.r.range(-20, 20));
    if (it.helipad) helipad(b, it, it.h + 0.05, Math.min(it.w, it.d) * 0.4);
  });

  // Fenêtres des bâtiments sans texture de façade (briques, béton, tôle, bois) : rangées alignées, éclairées la nuit
  function windows(b, it, ctx) {
    const r = ctx.r, house = it.roof === 'gable' && it.h < 9, metal = /metal|corrugated/.test(it.mat && it.mat.side);
    const floorH = house ? it.h : 3.4, floors = Math.max(1, Math.floor((it.h - 1) / floorH));
    for (const [nx, nz, len] of [[0, 1, it.w], [0, -1, it.w], [1, 0, it.d], [-1, 0, it.d]]) {
      if (metal) {                                                                 // bande vitrée continue en haut du bardage
        const y = it.h * 0.72;
        lbox(b, it, nx * (it.w / 2 + 0.04), y, nz * (it.d / 2 + 0.04), nx ? 0.08 : len * 0.8, 0.8, nz ? 0.08 : len * 0.8, WIN(ctx, r));
        continue;
      }
      const n = Math.max(1, Math.floor(len / (house ? 3.2 : 3.6)));
      for (let f = 0; f < floors; f++) {
        const y = house ? it.h * 0.55 : 1.9 + f * floorH;
        if (y > it.h - 1) break;
        for (let i = 0; i < n; i++) {
          const u = -len / 2 + (i + 0.5) * len / n;
          if (house && nz > 0 && i === Math.floor(n / 2)) {                         // porte d'entrée
            lbox(b, it, u, 1.05, it.d / 2 + 0.04, 1.0, 2.1, 0.08, 'col:#3a3030');
            continue;
          }
          lbox(b, it, nx ? nx * (it.w / 2 + 0.04) : u, y, nz ? nz * (it.d / 2 + 0.04) : u, nx ? 0.08 : 1.1, 1.3, nz ? 0.08 : 1.1, WIN(ctx, r));
        }
      }
    }
  }
  // Toit à deux pans (faîtage le long du z local) + pignons triangulaires
  function gable(b, it, ctx) {
    const rh = it.w * 0.36, a = Math.atan2(rh, it.w / 2), sl = (it.w / 2 + 0.5) / Math.cos(a), roof = (it.mat && it.mat.top) || 'roofBrown';
    for (const sg of [-1, 1]) lbox(b, it, sg * it.w / 4, it.h + rh / 2, 0, sl, 0.25, it.d + 0.8, roof, null, -sg * a * DEG);
    lbox(b, it, 0, it.h + rh + 0.05, 0, 0.3, 0.3, it.d + 0.9, 'col:#4d2618');
    const sh = new THREE.Shape(); sh.moveTo(-it.w / 2, 0); sh.lineTo(it.w / 2, 0); sh.lineTo(0, rh); sh.lineTo(-it.w / 2, 0);
    for (const sz of [-1, 1]) geo(b, new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }), it, 0, it.h, sz * it.d / 2 - 0.1, (it.mat && it.mat.side) || 'brick', it.tint);
  }
  // Toit en sheds (usine) : dents inclinées + verrières verticales
  function saw(b, it, ctx) {
    const n = Math.max(2, Math.floor(it.w / 7)), step = it.w / n, a = Math.atan2(3.2, step);
    for (let i = 0; i < n; i++) {
      const x = -it.w / 2 + (i + 0.5) * step;
      lbox(b, it, x, it.h + 1.6, 0, Math.hypot(step, 3.2), 0.2, it.d, 'metal', '#d0d0cc', a * DEG);
      lbox(b, it, x + step / 2 - 0.1, it.h + 1.6, 0, 0.12, 3.1, it.d - 0.4, ctx.dark ? 'emis:#c8d8e0' : 'glass');
    }
  }
  function helipad(b, it, y, rad) {
    lcyl(b, it, 0, y, 0, rad, 0.08, 'concreteDark', null, 20);
    lbox(b, it, -rad * 0.3, y + 0.06, 0, 0.5, 0.04, rad * 0.9, 'col:#e8e8e0'); lbox(b, it, rad * 0.3, y + 0.06, 0, 0.5, 0.04, rad * 0.9, 'col:#e8e8e0');
    lbox(b, it, 0, y + 0.06, 0, rad * 0.6, 0.04, 0.5, 'col:#e8e8e0');
    for (let k = 0; k < 16; k++) { const t = k / 16 * Math.PI * 2; const q = G.itemBox(it, Math.cos(t) * rad * 0.92, y + 0.06, Math.sin(t) * rad * 0.92, 0, 0, 0); b.box({ p: [q.x, q.y, q.z], s: [0.35, 0.04, rad * 0.35], r: [0, (q.yaw - t) * DEG, 0], mat: 'col:#e8b020', collide: false, shadow: false }); }
  }

  def('hangar', (b, it, ctx) => {
    const mat = it.mat === 'camo' ? 'camo' : it.mat || 'metal';
    for (const s of G.Items.get('hangar').solids(it).slice(0, 6)) vbox(b, s, { side: mat, top: 'metal', bottom: 'concreteDark' }, mat === 'metal' ? '#c8ccd0' : null);
    // voûte : arc elliptique en segments
    const rh = it.w * 0.22, n = 10;
    for (let k = 0; k < n; k++) {
      const t0 = Math.PI * k / n, t1 = Math.PI * (k + 1) / n;
      const x0 = Math.cos(t0) * (it.w / 2 + 0.3), y0 = Math.sin(t0) * rh, x1 = Math.cos(t1) * (it.w / 2 + 0.3), y1 = Math.sin(t1) * rh;
      lbox(b, it, (x0 + x1) / 2, it.h + (y0 + y1) / 2, 0, Math.hypot(x1 - x0, y1 - y0) + 0.05, 0.3, it.d + 0.6, mat === 'camo' ? 'camo' : 'metal', '#b8bcc0', Math.atan2(y1 - y0, x1 - x0) * DEG);
    }
    // portail : rideau relevé, montants zébrés, sol intérieur, éclairage
    lbox(b, it, 0, it.h - 0.6, it.d / 2 - 0.9, it.doorW, 1.0, 0.6, 'metal', '#8a8e92');
    for (const sg of [-1, 1]) lbox(b, it, sg * (it.doorW / 2 + 0.2), it.doorH / 2, it.d / 2 + 0.02, 0.4, it.doorH, 0.1, 'hazard');
    lbox(b, it, 0, 0.05, 0, it.w - 1.2, 0.1, it.d - 1.2, 'concreteDark', null, 0, 0, false);
    lbox(b, it, 0, it.h - 0.3, 0, 1.2, 0.2, it.d * 0.7, 'emis:#f0e8c8');
  });

  def('skeleton', (b, it, ctx) => {
    for (const s of G.Items.get('skeleton').solids(it)) vbox(b, s, s.h < 1 ? 'concrete' : 'concreteDark');
    // échafaudage sur une face + filet de chantier
    const H = it.floors * it.floorH;
    for (let x = -it.w / 2; x <= it.w / 2 + 0.1; x += 2.5) lbox(b, it, x, H / 2, it.d / 2 + 1.2, 0.08, H, 0.08, 'col:#9a7a3a');
    for (let y = 2; y < H; y += 2) lbox(b, it, 0, y, it.d / 2 + 1.2, it.w, 0.08, 0.08, 'col:#9a7a3a');
    lbox(b, it, it.w / 4, H * 0.5, it.d / 2 + 1.35, it.w * 0.45, H * 0.9, 0.04, 'chainlink');
  });

  def('cyl', (b, it, ctx) => {
    const mat = it.mat || 'metal';
    b.cylinder({ p: [it.x, it.y0 + it.h / 2, it.z], rad: it.r, h: it.h, seg: 16, mat, tint: it.tint, collide: false });
    if (it.cap === 'dome') geo(b, new THREE.SphereGeometry(it.r, 16, 5, 0, Math.PI * 2, 0, Math.PI / 2), it, 0, it.h, 0, mat, it.tint, new THREE.Vector3(1, 0.5, 1));
    else b.cylinder({ p: [it.x, it.y0 + it.h + 0.1, it.z], rad: it.r * 1.03, h: 0.2, seg: 16, mat: 'concreteDark', collide: false });
    if (it.chimney) {
      if (it.h > 38) for (let k = 0; k < 2; k++) b.cylinder({ p: [it.x, it.y0 + it.h - 1.5 - k * 4, it.z], rad: it.r * 1.02, h: 1.8, seg: 12, mat: 'col:' + (k ? '#e8e8e0' : '#b8282c'), collide: false });
      b.box({ p: [it.x, it.y0 + it.h + 0.3, it.z], s: [0.25, 0.25, 0.25], mat: 'basic:#ff2a1a', collide: false, shadow: false });
      smoke(b, [it.x, it.y0 + it.h + 0.5, it.z], it.r, ctx);
    } else {
      for (const y of [it.h * 0.3, it.h * 0.7]) b.cylinder({ p: [it.x, it.y0 + y, it.z], rad: it.r * 1.02, h: 0.15, seg: 16, mat: 'col:#50545a', collide: false });
      for (let y = 0.5; y < it.h; y += 0.6) lbox(b, it, it.r + 0.1, y, 0, 0.05, 0.05, 0.6, 'col:#40444a');   // échelle
    }
  });
  // Fumée de cheminée : émetteur léger (hasard visuel U.fx, jamais le hasard de jeu)
  function smoke(b, p, rad, ctx) {
    const pos = new THREE.Vector3().fromArray(p), vel = new THREE.Vector3();
    b.entity({ t: 0, update(dt, game) {
      this.t -= dt;
      if (this.t > 0 || !game.effects || game.camera.position.distanceTo(pos) > 500) return;
      this.t = U.fx.range(0.25, 0.45);
      const fx = game.effects;
      fx.smoke.emit({ pos, vel: vel.set(U.fx.range(-0.3, 0.3), U.fx.range(2.5, 3.5), U.fx.range(-0.3, 0.3)), life: U.fx.range(3, 4.5), s0: rad * 0.6, s1: rad * 1.6, s2: rad * 3, peak: 0.3, cols: fx.pal.greySmoke, drag: 0.4, a: 0.35, fin: 0.1, fout: 0.4, wind: 3, turb: 1 });
    } });
  }

  def('watertower', (b, it, ctx) => {
    for (const s of G.Items.get('watertower').solids(it).slice(1)) vbox(b, s, 'metal', '#8a8e92');
    for (let y = 3; y < it.h; y += 4) for (const [a, c] of [[1, 0], [0, 1]]) lbox(b, it, 0, y, 0, a ? it.r * 1.4 : 0.1, 0.1, c ? it.r * 1.4 : 0.1, 'col:#50545a');
    if (it.headframe) {
      lbox(b, it, 0, it.h + 1.5, 0, it.r * 2, 3, it.r * 2, 'metal', '#9a9ea2');
      b.cylinder({ p: [it.x, it.y0 + it.h + 4, it.z], rad: 2, h: 0.4, seg: 16, mat: 'col:#40444a', collide: false, r: [90, 0, 0] });
    } else {
      b.cylinder({ p: [it.x, it.y0 + it.h + it.th / 2 + 0.4, it.z], rad: it.r, h: it.th, seg: 14, mat: 'planks', collide: false });
      b.cylinder({ p: [it.x, it.y0 + it.h + it.th + 0.8, it.z], rTop: 0.2, rBot: it.r * 1.08, h: 1.2, seg: 14, mat: 'col:#4a3a30', collide: false });
    }
  });

  def('mast', (b, it, ctx) => {
    for (const [a, c] of [[-0.6, -0.6], [0.6, -0.6], [0, 0.6]]) lbox(b, it, a, it.h / 2, c, 0.12, it.h, 0.12, 'col:#b8282c');
    for (let y = 2; y < it.h; y += 2.5) lbox(b, it, 0, y, 0, 1.3, 0.08, 1.3, 'col:#e8e8e0');
    b.box({ p: [it.x, it.y0 + it.h + 0.2, it.z], s: [0.3, 0.3, 0.3], mat: 'basic:#ff2a1a', collide: false, shadow: false });
    lbox(b, it, 0.9, it.h * 0.8, 0, 0.2, 1.4, 1.4, 'col:#d0d0cc');
  });

  def('crane', (b, it, ctx) => {
    const col = 'col:#d89a20';
    for (const a of [-1, 1]) for (const c of [-1, 1]) {
      lbox(b, it, a * it.span / 2, it.h / 2, c * it.depth / 2, 1.2, it.h, 1.2, col);
      lbox(b, it, a * it.span / 2, 1, c * it.depth / 2, 1.3, 2, 1.3, 'hazard');
    }
    for (const c of [-1, 1]) lbox(b, it, 0, it.h * 0.5, c * it.depth / 2, it.span, 0.6, 0.6, col);   // entretoise
    lbox(b, it, 0, it.h + 1.6, 0, it.span + 16, 3.2, it.depth + 1.4, col);
    lbox(b, it, it.span * 0.15, it.h - 2, 0, 4, 4, 4, 'metal', '#e0e0d8');
    lbox(b, it, it.span * 0.15, it.h * 0.55, 0, 0.1, it.h * 0.7, 0.1, 'col:#1a1a1a');
    lbox(b, it, it.span * 0.15, it.h * 0.2, 0, 3, 0.5, 6.5, col);                  // palonnier
  });

  def('towercrane', (b, it, ctx) => {
    const col = 'col:#e0b020';
    lbox(b, it, 0, it.h / 2, 0, 1.8, it.h, 1.8, col);
    for (let y = 2; y < it.h; y += 3) lbox(b, it, 0, y, 0, 1.9, 0.12, 1.9, 'col:#8a6a10');
    const j = Object.assign({}, it, { yaw: (it.yaw || 0) + it.jibYaw });
    lbox(b, j, 0, it.h + 1, -it.jib / 2 + 4, 1.6, 1.8, it.jib, col);
    lbox(b, j, 0, it.h + 1, 7, 2.2, 1.8, 14, col);
    lbox(b, j, 0, it.h + 0.2, 12, 2.6, 2.4, 3, 'concreteDark');                   // contrepoids
    lbox(b, j, 0, it.h + 3.4, 0, 0.8, 5, 0.8, col);                               // pointe
    lbox(b, j, 1.4, it.h - 0.6, 1, 2, 2, 2.2, 'metal', '#e8e8e0');                // cabine
    const hk = -it.jib * 0.55;
    lbox(b, j, 0, it.h - 6, hk, 0.06, 12, 0.06, 'col:#1a1a1a');
    lbox(b, j, 0, it.h - 12.3, hk, 0.8, 0.8, 0.5, 'hazard');
  });

  def('wall', (b, it, ctx) => {
    const st = it.style;
    if (st === 'fence') {
      for (let x = -it.len / 2; x <= it.len / 2 + 0.01; x += 3) lbox(b, it, x, it.h / 2, 0, 0.1, it.h, 0.1, 'col:#6a6e70');
      lbox(b, it, 0, it.h - 0.05, 0, it.len, 0.06, 0.06, 'col:#6a6e70');
      lbox(b, it, 0, it.h / 2, 0, it.len, it.h, 0.04, 'chainlink');
    } else if (st === 'fenceWood') {
      for (let x = -it.len / 2; x <= it.len / 2 + 0.01; x += 2.5) lbox(b, it, x, it.h / 2, 0, 0.14, it.h, 0.14, 'planks');
      for (const y of [it.h * 0.45, it.h * 0.9]) lbox(b, it, 0, y, 0, it.len, 0.12, 0.06, 'planks');
    } else if (it.th >= 1.2) {                                                     // merlon de protection (gabions)
      for (let x = -it.len / 2 + 0.7; x < it.len / 2; x += 1.4) lbox(b, it, x, it.h / 2, 0, 1.36, it.h, it.th, ctx.biome.id === 'desert' ? 'sand' : 'col:#a89a70');
    } else if (it.broken) {
      const n = Math.max(2, Math.round(it.len / 2));
      for (let i = 0; i < n; i++) { const hh = it.h * ctx.r.range(0.35, 1); lbox(b, it, -it.len / 2 + (i + 0.5) * it.len / n, hh / 2, 0, it.len / n, hh, it.th, st || 'cream'); }
    } else {
      lbox(b, it, 0, it.h / 2, 0, it.len, it.h, it.th, st || 'concrete');
      lbox(b, it, 0, it.h + 0.06, 0, it.len + 0.1, 0.12, it.th + 0.12, 'concreteDark');
    }
  });

  def('container', (b, it, ctx) => {
    for (let k = 0; k < it.n; k++) {
      const off = ctx.r.range(-0.12, 0.12);
      lbox(b, it, off, 1.3 + k * 2.6, 0, 6.05, 2.58, 2.44, 'corrugated', it.col);
      lbox(b, it, off + 3.04, 1.3 + k * 2.6, 0, 0.04, 2.3, 2.2, 'col:#3a3a3a');     // portes
    }
  });

  def('gantry', (b, it, ctx) => {
    const col = 'col:#8a9098';
    for (const sg of [-1, 1]) { lbox(b, it, sg * it.span / 2, it.h / 2, 0, 0.7, it.h, 0.7, col); lbox(b, it, sg * it.span / 2, 0.4, 0, 1.2, 0.8, 1.2, 'concreteDark'); }
    lbox(b, it, 0, it.h + 1.1, 0, it.span + 0.8, 0.5, 0.5, col); lbox(b, it, 0, it.h + 2.0, 0, it.span + 0.8, 0.4, 0.4, col);
    for (let k = 0; k < (it.signs || 0); k++) {
      const x = -it.span / 2 + (k + 0.5) * it.span / it.signs;
      lbox(b, it, x, it.h + 1.4, 0.35, it.span / it.signs * 0.8, 1.8, 0.1, 'col:#1f6a3a');
      lbox(b, it, x, it.h + 1.4, 0.41, it.span / it.signs * 0.6, 0.12, 0.02, 'col:#e8e8e0');
    }
    if (it.glass) {
      const c = G.itemBox(it, 0, it.h / 2 + 0.3, 0, 0, 0, 0);
      b.glass([c.x, c.y, c.z], [it.span - 0.8, it.h - 0.4, 0.14], [0, it.yaw * DEG, 0], ctx.dark);
    }
  });

  def('skybridge', (b, it, ctx) => {
    const y = it.y + it.th / 2;
    lbox(b, it, 0, y, 0, it.span, it.th, it.w, { side: 'metal', top: 'concreteDark', bottom: 'concreteDark' }, '#b8bcc0');
    for (const sg of [-1, 1]) lbox(b, it, 0, y + 0.3, sg * (it.w / 2 + 0.03), it.span - 1, it.th * 0.45, 0.06, ctx.dark ? 'emis:#d8c890' : 'col:#2a3440');
  });

  def('piperack', (b, it, ctx) => {
    for (const sg of [-1, 1]) lbox(b, it, sg * it.span / 2, it.h / 2, 0, 0.6, it.h, it.w, 'col:#6a6e70');
    lbox(b, it, 0, it.h, 0, it.span, 0.3, it.w, 'col:#6a6e70');
    const cols = ['#8a3a2a', '#c8c8c0', '#3a5a8a', '#d8b020', '#5a6a4a'];
    const n = 3 + (Math.abs(Math.round(it.x * 3 + it.z)) % 3);
    for (let k = 0; k < n; k++) lcylX(b, it, 0, it.h + 0.55 + (k % 2) * 0.5, -it.w / 2 + (k + 0.5) * it.w / n, 0.28, it.span + 2, 'col:' + cols[k % cols.length], null, 8);
  });

  def('cable', (b, it, ctx) => {
    const a = it.a, c = it.b, sag = it.sag || 1;
    if (it.poles !== false) for (const p of [a, c]) {
      const g0 = G.heightAt(ctx.plan, p[0], p[2]);
      b.cylinder({ p: [p[0], (g0 + p[1] + 0.6) / 2, p[2]], rTop: 0.14, rBot: 0.2, h: p[1] + 0.6 - g0, seg: 6, mat: 'bark', collide: false });
      b.box({ p: [p[0], p[1] + 0.35, p[2]], s: [2.2, 0.16, 0.16], r: [0, Math.atan2(c[0] - a[0], c[2] - a[2]) * DEG + 90, 0], mat: 'col:#3a2a20', collide: false });
    }
    const n = 6;
    let prev = a;
    for (let k = 1; k <= n; k++) {
      const t = k / n, p = [G.lerp(a[0], c[0], t), G.lerp(a[1], c[1], t) - sag * 4 * t * (1 - t), G.lerp(a[2], c[2], t)];
      b.cable(prev, p, 0.07, 'col:#141414');
      prev = p;
    }
    if (it.markers) {                                                              // boules de balisage (visibles de loin)
      const L = Math.hypot(c[0] - a[0], c[2] - a[2]), m = Math.max(1, Math.floor(L / 12));
      for (let k = 1; k < m; k++) {
        const t = k / m, p = [G.lerp(a[0], c[0], t), G.lerp(a[1], c[1], t) - sag * 4 * t * (1 - t) - 0.3, G.lerp(a[2], c[2], t)];
        const g = new THREE.IcosahedronGeometry(0.55, 0);
        b.addGeometry(g, new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion(), null, 'col:' + (k % 2 ? '#e8401c' : '#f0f0ea'));
        g.dispose();
      }
    }
  });

  def('laser', (b, it, ctx) => {
    b.laser(it.a, it.b);
    for (const p of [it.a, it.b]) {
      b.box({ p: [p[0], p[1] / 2 + 0.3, p[2]], s: [0.5, p[1] + 0.6, 0.5], mat: 'col:#2a2c30', collide: false });
      b.box({ p: [p[0], p[1], p[2]], s: [0.8, 0.8, 0.8], mat: 'col:#3a3c40', collide: false });
    }
  });
  def('glass', (b, it, ctx) => { const c = G.itemBox(it, 0, it.yc, 0, 0, 0, 0); b.glass([c.x, c.y, c.z], [it.w, it.h, 0.14], [0, it.yaw * DEG, 0], ctx.dark); });
  def('crate', (b, it) => { b.crate([it.x, it.y0 + it.s / 2 + 0.1, it.z], [it.s, it.s, it.s], [0, (it.yaw || 0) * DEG, 0]); });

  def('tree', (b, it, ctx) => {
    if (!it.broad) { b.tree(it.x, it.z, it.h, it.rad, it.y0); return; }
    // feuillu : tronc (même collision que l'arbre du jeu) + houppier en boules à facettes
    b.cylinder({ p: [it.x, it.y0 + it.h / 2, it.z], rTop: it.rad * 0.7, rBot: it.rad, h: it.h, seg: 6, mat: 'bark', colSize: [it.rad * 1.7, it.h, it.rad * 1.7] });
    const r = ctx.r, base = ctx.snow ? '#8a9a88' : ctx.biome.id === 'desert' ? '#6a7a3a' : r.pick(['#3a6a2c', '#4a7a30', '#2e5a28', '#5a7a2a']);
    const R = Math.max(1.6, it.h * 0.26);
    for (let k = 0; k < 3; k++) {
      const g = new THREE.IcosahedronGeometry(R * (1 - k * 0.18), 0);
      b.addGeometry(g, new THREE.Vector3(it.x + r.range(-0.6, 0.6), it.y0 + it.h * (0.72 + k * 0.1), it.z + r.range(-0.6, 0.6)), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, 0)), null, 'col:' + base, '#' + new THREE.Color(1, 1, 1).multiplyScalar(r.range(0.8, 1)).getHexString());
      g.dispose();
    }
  });
  def('rock', (b, it, ctx) => {
    const col = ctx.biome.id === 'desert' ? 'col:#a88a64' : ctx.snow ? 'col:#9aa0aa' : ctx.biome.id === 'mountain' ? 'col:#6a6e76' : 'col:#5b6472';
    b.rockLump(it.x, it.y0, it.z, it.s, col);
  });

  def('arch', (b, it, ctx) => {
    for (const s of G.Items.get('arch').solids(it)) vbox(b, s, 'rock', ctx.snow ? '#c8ccd4' : null);
    for (let i = 0; i < 6; i++) lbox(b, it, ctx.r.range(-it.span / 2, it.span / 2), it.h + it.th * ctx.r.range(0.2, 0.8), ctx.r.range(-it.depth / 3, it.depth / 3), ctx.r.range(4, 9), it.th * 0.5, ctx.r.range(3, it.depth * 0.8), 'rock', null, ctx.r.range(-10, 10));
  });
  def('pillar', (b, it, ctx) => {
    const m = it.mat || 'rock';
    lbox(b, it, 0, it.h / 2, 0, it.w, it.h, it.w, m, m === 'rock' && ctx.snow ? '#c8ccd4' : null);
    if (m === 'rock') lbox(b, it, 0, it.h - 1, 0, it.w * 1.2, 3, it.w * 0.9, m, null, 8);
    else lbox(b, it, 0, it.h + 0.3, 0, it.w * 1.4, 0.6, it.w * 1.4, 'concreteDark');
  });
  def('bridge', (b, it, ctx) => {
    lbox(b, it, 0, it.y + 0.8, 0, it.span, 1.6, it.w, { side: 'concreteDark', top: 'asphalt', bottom: 'concreteDark' });
    for (const sg of [-1, 1]) lbox(b, it, 0, it.y + 2.1, sg * (it.w / 2 - 0.15), it.span, 1.0, 0.2, 'concrete');
    for (const sg of [-0.2, 0.2]) lbox(b, it, sg * it.span, it.y / 2, 0, 2.4, it.y, it.w - 1, 'concreteDark');
  });

  def('platform', (b, it, ctx) => {
    if (it.style === 'tower') {
      for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lbox(b, it, a * (it.w / 2 - 0.4), (it.h - 0.6) / 2, c * (it.d / 2 - 0.4), 0.35, it.h - 0.6, 0.35, 'planks');
      for (let y = 2; y < it.h - 1; y += 2.5) for (const [a, c, w, d] of [[0, 1, it.w, 0.12], [0, -1, it.w, 0.12], [1, 0, 0.12, it.d], [-1, 0, 0.12, it.d]]) lbox(b, it, a * (it.w / 2 - 0.4), y, c * (it.d / 2 - 0.4), w, 0.12, d, 'planks');
      lbox(b, it, 0, it.h - 0.3, 0, it.w, 0.6, it.d, 'planks');
      for (const [a, c, w, d] of [[0, -1, it.w, 0.1], [1, 0, 0.1, it.d], [-1, 0, 0.1, it.d]]) lbox(b, it, a * it.w / 2, it.h + 0.5, c * it.d / 2, w, 0.1, d, 'planks');
      for (let y = 0.6; y < it.h; y += 0.5) lbox(b, it, 0, y, it.d / 2 + 0.1, 0.6, 0.06, 0.06, 'col:#40444a');   // échelle
    } else if (it.style === 'ledge') {
      lbox(b, it, 0, it.h / 2, 0, it.w, it.h, it.d, 'rock', ctx.snow ? '#c8ccd4' : null);
    } else {
      vbox(b, G.itemBox(it, 0, it.h / 2, 0, it.w, it.h, it.d), { side: (it.mat && it.mat.side) || 'facade', top: 'concreteDark', bottom: 'concreteDark' }, it.tint);
      if (!/^facade/.test((it.mat && it.mat.side) || 'facade')) windows(b, Object.assign({}, it, { roof: 'flat' }), ctx);
    }
  });

  def('revetment', (b, it, ctx) => {
    const t = 1.4;
    for (const [lx, lz, w, d] of [[0, -it.d / 2 + t / 2, it.w, t], [-it.w / 2 + t / 2, 0, t, it.d], [it.w / 2 - t / 2, 0, t, it.d]]) {
      const n = Math.max(1, Math.round(Math.max(w, d) / 1.4));
      for (let i = 0; i < n; i++) {
        const u = -Math.max(w, d) / 2 + (i + 0.5) * Math.max(w, d) / n;
        lbox(b, it, lx + (w > d ? u : 0), it.h / 2, lz + (w > d ? 0 : u), w > d ? Math.max(w, d) / n - 0.04 : t, it.h, w > d ? t : Math.max(w, d) / n - 0.04, ctx.biome.id === 'desert' ? 'sand' : 'col:#a89a70');
      }
    }
  });
  def('canopy', (b, it, ctx) => {
    for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lbox(b, it, a * (it.w / 2 - 0.3), it.h / 2, c * (it.d / 2 - 0.3), 0.3, it.h, 0.3, 'col:#3a3a2a');
    lbox(b, it, 0, it.h + 0.3, 0, it.w, 0.15, it.d, 'camo');
    for (const sg of [-1, 1]) lbox(b, it, sg * (it.w / 2 + 0.6), it.h - 0.4, 0, 1.4, 0.1, it.d, 'camo', null, sg * 35);
  });

  // ---------- décor ----------
  def('car', (b, it, ctx) => {
    const c = it.col || '#b8b8b8';
    lbox(b, it, 0, 0.55, 0, 1.8, 0.7, 4.2, 'col:' + c);
    lbox(b, it, 0, 1.15, 0.2, 1.6, 0.55, 2.2, 'col:' + c);
    lbox(b, it, 0, 1.15, 0.2, 1.64, 0.4, 2.0, 'col:#1e2630');
    for (const sx of [-1, 1]) for (const sz of [-1.3, 1.3]) lcylX(b, it, sx * 0.85, 0.34, sz, 0.34, 0.25, 'col:#141414', null, 8);
  });
  def('truckDecor', (b, it, ctx) => {
    const m = ctx.proto.truck || (ctx.proto.truck = CC.Models.truck());
    mergeModel(b, m, it, it.mil ? null : '#9aa8b8');
  });
  // Fusionne un modèle détaillé (statique) dans la géométrie du décor : aucun appel de dessin en plus
  function mergeModel(b, model, it, tint) {
    model.updateMatrixWorld(true);
    const base = new THREE.Matrix4().compose(new THREE.Vector3(it.x, it.y0, it.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.yaw || 0, 0)), new THREE.Vector3(1, 1, 1));
    const bt = b.batch('col:#ffffff'), v = new THREE.Vector3(), n = new THREE.Vector3(), tc = tint ? new THREE.Color(tint) : null;
    model.traverse((o) => {
      if (!o.isMesh || !o.visible || o.material.transparent) return;
      const m = new THREE.Matrix4().multiplyMatrices(base, o.matrixWorld), nm = new THREE.Matrix3().getNormalMatrix(m);
      const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, mc = o.material.color || new THREE.Color(1, 1, 1);
      const start = bt.pos.length / 3;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m); n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        bt.pos.push(v.x, v.y, v.z); bt.nor.push(n.x, n.y, n.z); bt.uv.push(0, 0);
        let r = C ? C.getX(i) : mc.r, gg = C ? C.getY(i) : mc.g, bb = C ? C.getZ(i) : mc.b;
        if (tc && r > 0.25 && Math.abs(r - gg) < 0.12) { r = tc.r * r * 1.6; gg = tc.g * gg * 1.6; bb = tc.b * bb * 1.6; }   // carrosserie repeinte (civil)
        bt.col.push(r, gg, bb);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) bt.idx.push(start + g.index.getX(i));
      else for (let i = 0; i < P.count; i++) bt.idx.push(start + i);
    });
  }
  def('sandbags', (b, it) => { for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) lbox(b, it, -2.25 + i * 1.5 + row * 0.75, 0.3 + row * 0.55, 0, 1.4, 0.55, 1.2, 'col:#a89a70'); });
  def('barrier', (b, it) => { for (let i = 0; i < 2; i++) { lbox(b, it, -1.5 + i * 3, 0.3, 0, 2.9, 0.6, 0.7, 'concrete'); lbox(b, it, -1.5 + i * 3, 0.8, 0, 2.9, 0.4, 0.3, 'concrete'); } });
  def('hay', (b, it) => { lcylX(b, it, 0, 0.8, 0, 0.8, 1.5, 'col:#c8a850', null, 10); });
  def('tent', (b, it) => {
    for (const sg of [-1, 1]) lbox(b, it, sg * 1.25, 1.5, 0, 3.2, 0.1, 6, 'col:#6a6848', null, -sg * 50);
    lbox(b, it, 0, 2.9, 0, 0.12, 0.12, 6.2, 'col:#3a3828');
  });
  def('pump', (b, it) => {
    lbox(b, it, 0, 0.25, 0, 1.8, 0.5, 6.5, 'concreteDark');
    for (const sg of [-1, 1]) lbox(b, it, sg * 0.5, 2.3, 0.3, 0.25, 4.2, 0.25, 'col:#3a3a3a', null, sg * 8);
    lbox(b, it, 0, 4.4, 0.3, 0.5, 0.6, 6, 'col:#c8a020');
    lbox(b, it, 0, 3.8, -2.9, 0.6, 1.8, 0.8, 'col:#c8a020');
    lcylX(b, it, 0, 1.4, 2.4, 0.9, 0.5, 'col:#3a3a3a', null, 10);
  });
  def('shed', (b, it) => { lbox(b, it, 0, 1.5, 0, 5, 3, 4, 'metal', '#c0c4c8'); lbox(b, it, 0, 3.15, 0, 5.4, 0.2, 4.6, 'metal', '#9a9ea2', 6); });
  def('pallets', (b, it) => { for (let k = 0; k < 3; k++) lbox(b, it, 0, 0.1 + k * 0.25, 0, 1.2, 0.14, 1.0, 'planks'); });
  def('barrels', (b, it, ctx) => {
    const c = ctx.r.pick(['#2a4a8a', '#8a2a1a', '#4a5a2a', '#6a6a6a']);
    for (let k = 0; k < 4; k++) b.cylinder({ p: [it.x + (k % 2) * 0.65 - 0.3, it.y0 + 0.45, it.z + Math.floor(k / 2) * 0.65 - 0.3], rad: 0.3, h: 0.9, seg: 8, mat: 'col:' + c, collide: false });
  });
  def('debris', (b, it, ctx) => { for (let k = 0; k < 6; k++) lbox(b, it, ctx.r.range(-1.2, 1.2), 0.2, ctx.r.range(-1.2, 1.2), ctx.r.range(0.3, 1), ctx.r.range(0.2, 0.6), ctx.r.range(0.3, 1), ctx.r.chance(0.5) ? 'concreteDark' : 'col:#3a3632', null, ctx.r.range(-20, 20)); });
  def('bush', (b, it, ctx) => {
    const g = new THREE.IcosahedronGeometry(1 * (it.s || 1), 0);
    b.addGeometry(g, new THREE.Vector3(it.x, it.y0 + 0.5 * (it.s || 1), it.z), new THREE.Quaternion(), new THREE.Vector3(1, 0.7, 1), 'col:' + (ctx.biome.id === 'desert' ? '#8a8050' : '#3a5a2c'));
    g.dispose();
  });
  def('lamp', (b, it, ctx) => {
    lbox(b, it, 0, 4.5, 0, 0.3, 9, 0.3, 'col:#2c2f33');
    lbox(b, it, 0, 9, -1.2, 0.25, 0.25, 2.4, 'col:#3a3d42');
    lbox(b, it, 0, 8.85, -2.3, 0.5, 0.18, 0.8, it.night ? 'emis:#ffe8b0' : 'col:#d8d8d0');
  });
  def('flood', (b, it, ctx) => {
    lbox(b, it, 0, 6, 0, 0.35, 12, 0.35, 'col:#40444a');
    lbox(b, it, 0, 12, 0, 2.2, 0.8, 0.3, ctx.dark ? 'emis:#fff0d0' : 'col:#d8d8d0');
  });
  def('flag', (b, it, ctx) => { lbox(b, it, 0, 4.5, 0, 0.12, 9, 0.12, 'col:#c8c8c8'); lbox(b, it, 0.9, 8.2, 0, 1.8, 1.1, 0.04, 'col:' + ctx.r.pick(['#b8282c', '#2a4a8a', '#3a6a3a'])); });
  def('sign', (b, it, ctx) => {
    for (const sg of [-1, 1]) lbox(b, it, sg * 1.2, 1.6, 0, 0.12, 3.2, 0.12, 'col:#50545a');
    lbox(b, it, 0, 3.1, 0, 3, 1.4, 0.08, 'col:' + ['#1f6a3a', '#2a4a8a', '#c8a020', '#e8e8e0'][it.style || 0]);
    lbox(b, it, 0, 3.1, 0.05, 2.4, 0.15, 0.02, 'col:#e8e8e0');
  });
  def('bench', (b, it) => { lbox(b, it, 0, 0.45, 0, 1.8, 0.08, 0.5, 'planks'); lbox(b, it, 0, 0.8, 0.22, 1.8, 0.4, 0.06, 'planks'); });
  def('log', (b, it) => { lcylX(b, it, 0, 0.35, 0, 0.35, 5, 'bark', null, 7); });
  def('tires', (b, it) => { for (let k = 0; k < 3; k++) b.cylinder({ p: [it.x, it.y0 + 0.18 + k * 0.36, it.z], rad: 0.55, h: 0.34, seg: 10, mat: 'col:#18181a', collide: false }); });
  def('marking', (b, it, ctx) => {
    const y = ctx.biome.layout === 'grid' && ctx.biome.sidewalk ? 0.2 : 0.05;     // sur l'îlot surélevé en ville
    if (it.style === 'paving') lbox(b, it, 0, y - 0.04, 0, it.w, 0.08, it.d, 'concreteWarm', null, 0, 0, false);
    else if (it.style === 'parking') for (let x = -it.w / 2 + 1.5; x < it.w / 2; x += 3) lbox(b, it, x, y + 0.01, 0, 0.12, 0.02, 5, 'col:#e8e8e0', null, 0, 0, false);
    else if (it.style === 'apron') lbox(b, it, 0, y, 0, it.w, 0.02, 0.25, 'col:#e8b020', null, 0, 0, false);
    else if (it.style === 'runway') {
      lbox(b, it, 0, y, 0, it.w, 0.08, it.d, 'asphalt', null, 0, 0, false);
      for (let x = -it.w / 2 + 6; x < it.w / 2 - 6; x += 14) lbox(b, it, x, y + 0.05, 0, 6, 0.02, 0.4, 'col:#e8e8e0', null, 0, 0, false);
    }
  });
  def('crops', (b, it, ctx) => {
    lbox(b, it, 0, 0.02, 0, it.w, 0.04, it.d, 'dirt', null, 0, 0, false);
    for (let x = -it.w / 2 + 0.8; x < it.w / 2; x += 1.8) lbox(b, it, x, 0.2, 0, 0.7, 0.35, it.d - 1, 'col:' + it.col, null, 0, 0, false);
  });
  def('pad', (b, it) => { helipad(b, it, 0.06, it.w / 2); });

  // ---------- combat : cibles, défenses, hélicoptères ----------
  function combat(b, ctx) {
    const plan = ctx.plan, P = plan.profile, r = G.stream(plan.seed, 'kitCombat');
    const detect = 38 + 22 * P.enemyReaction;
    const camo = plan.biome.id === 'military' || plan.biome.id === 'mountain';
    for (const t of plan.targets) {
      const opts = { detectRange: detect, unarmed: !P.armedTargets };
      if (t.patrol) { opts.patrol = t.patrol; opts.patrolSpeed = t.patrolSpeed; opts.patrolPhase = r(); }
      else if (t.type === 'heli') { opts.drift = t.setup === 'rooftop' ? 0 : 3; opts.driftSpeed = 0.3; }
      b.target(t.type === 'heli' && camo ? 'heliCamo' : t.type, t.pos, t.yaw, opts);
    }
    for (const g of plan.guards) b.guard(g.type, g.pos, g.yaw, { detectRange: detect });
    for (const h of plan.helis) {
      const opts = h.patrol ? { patrol: h.patrol, patrolSpeed: h.speed, patrolPhase: r() } : { drift: h.drift, driftSpeed: 0.3 };
      b.guard(camo ? 'heliCamo' : 'heli', h.pos, r() * 360, opts);
    }
  }
})();

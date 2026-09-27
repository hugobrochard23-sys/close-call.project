/* Générateur de missions — obstacles de parcours et décor.
 * Obstacles (densité d'obstacles du profil) : posés en travers des couloirs de vol — portiques (parfois vitrés, à
 * traverser), passerelles entre immeubles, racks de tuyauteries, câbles (balisés de boules rouges et blanches), lasers,
 * lignes électriques, haies, arches rocheuses, piliers, ponts. Jamais dans les 80 premiers mètres (le temps de les voir),
 * jamais dans les couloirs réservés des cibles ; toujours avec un passage (dessous, dessus ou à côté).
 * Décor (détails secondaires, posés après la structure) : lampadaires, voitures garées, arbres d'alignement, panneaux,
 * arbres et rochers sur le relief, végétation de montagne. */
(function () {
  const G = CC.Gen;
  const OBST = (t) => t === 'bld' || t === 'reserve' || t === 'water';

  G.placeObstacles = function (plan, r) {
    const B = plan.biome, P = plan.profile, L = plan.launcher.pos;
    const kinds = B.obstacles || {};
    if (B.layout === 'valley') return valleyObstacles(plan, r, kinds);
    // longueur de route utile → nombre d'obstacles
    const roads = plan.roads.filter((rd) => rd.kind !== 'path' || B.layout === 'organic');
    let total = 0; for (const rd of roads) total += rd.obb.hd * 2;
    const n = Math.round(P.obstacleDensity * total / (B.layout === 'grid' ? 95 : 150));
    const clearH = G.lerp(14, 7.5, P.obstacleDensity);                  // hauteur libre sous les portiques
    let placed = 0;
    for (let k = 0; k < n * 8 && placed < n; k++) {
      const rd = r.pick(roads), t = r.range(0.1, 0.9);
      const x = G.lerp(rd.a[0], rd.b[0], t), z = G.lerp(rd.a[1], rd.b[1], t);
      if (Math.hypot(x - L[0], z - L[2]) < 80 || z > -40) continue;
      const kind = r.weighted(kinds), yaw = rd.obb.yaw, span = rd.w + 1.6;
      const probe = G.obb(x, z, span, 4, yaw);
      if (plan.space.hit(probe, 1, (tg) => tg === 'reserve' || tg === 'obst')) continue;
      const y0 = G.heightAt(plan, x, z);
      let it = null;
      if (kind === 'gantry') it = { t: 'gantry', x, z, yaw, y0, span, h: clearH + r.range(0, 3), glass: r.chance(0.35), signs: r.int(1, 3) };
      else if (kind === 'piperack') it = { t: 'piperack', x, z, yaw, y0, span: span + 2, h: clearH + r.range(-1, 2), w: r.range(2.5, 4) };
      else if (kind === 'laser') {
        const y = y0 + r.range(5, 12), a = G.local(probe, -span / 2, 0), b = G.local(probe, span / 2, 0);
        it = { t: 'laser', x, z, yaw, y0, a: [a[0], y, a[1]], b: [b[0], y, b[1]] };
      } else if (kind === 'cable') {
        const y = y0 + r.range(9, 17), a = G.local(probe, -span / 2 - 1, 0), b = G.local(probe, span / 2 + 1, 0);
        it = { t: 'cable', x, z, yaw, y0, a: [a[0], y, a[1]], b: [b[0], y + r.range(-1, 1), b[1]], sag: 1.2, markers: true };
      } else if (kind === 'skybridge') {
        // seulement entre deux immeubles réels, assez hauts, de part et d'autre de la rue
        const sideB = (sg) => { const p = G.local(probe, sg * (span / 2 + 5), 0); const e = plan.space.hit(G.obb(p[0], p[1], 3, 3, 0), 0, (tg) => tg === 'bld'); return e && e.ref && e.ref.t === 'bld' ? e.ref : null; };
        const b1 = sideB(-1), b2 = sideB(1);
        if (!b1 || !b2) continue;
        const top = Math.min(b1.y0 + b1.h, b2.y0 + b2.h) - 4;
        if (top < clearH + 6) continue;
        const y = y0 + r.range(clearH, Math.min(top, clearH + 22));
        it = { t: 'skybridge', x, z, yaw, y0, span: span + 10, y: y - y0, th: r.range(3, 4.2), w: r.range(4, 6) };
      } else if (kind === 'crates') {
        for (let i = 0; i < r.int(3, 7); i++) { const p = G.local(probe, r.range(-span / 2 + 1, span / 2 - 1), r.range(-6, 6)); G.put(plan, { t: 'crate', x: p[0], z: p[1], yaw: r() * 6.28, s: r.range(1.4, 2.2) }, 0.2, (tg) => tg === 'reserve' || tg === 'decor'); }
        placed++; continue;
      } else if (kind === 'glass') it = { t: 'gantry', x, z, yaw, y0, span, h: clearH + r.range(1, 4), glass: true, signs: 0 };
      else if (kind === 'towerCrane') {
        const p = G.local(probe, (span / 2 + 4) * r.sign(), 0);
        it = { t: 'towercrane', x: p[0], z: p[1], yaw: 0, y0, h: r.range(28, 45), jib: r.range(30, 45), jibYaw: yaw + Math.PI / 2 * r.sign() };
        if (!plan.space.free(G.obb(p[0], p[1], 5, 5, 0), 0.5, OBST)) continue;
      } else if (kind === 'watchtower') {
        const p = G.local(probe, (span / 2 + 3) * r.sign(), 0);
        it = { t: 'platform', x: p[0], z: p[1], yaw, y0, w: 3.5, d: 3.5, h: r.range(8, 12), style: 'tower' };
        if (!plan.space.free(G.obb(p[0], p[1], 4, 4, 0), 0.5, OBST)) continue;
      } else if (kind === 'powerline') { powerline(plan, r, rd); placed++; continue; }
      else if (kind === 'treeLine') {
        for (let s = -rd.obb.hd; s < rd.obb.hd; s += r.range(6, 9)) { const p = G.local(rd.obb, (rd.w / 2 + 3) * (r.chance(0.5) ? 1 : -1), s); G.put(plan, { t: 'tree', x: p[0], z: p[1], h: r.range(8, 14), rad: 0.4, broad: true }, 0.3); }
        placed++; continue;
      }
      if (!it) continue;
      plan.add(it);
      plan.space.add(probe, 'obst', it);
      placed++;
    }
    plan.analysis.obstaclesPlaced = placed;
  };

  // Ligne électrique le long d'une route : poteaux tous les 40-55 m, câbles entre eux (mortels, balisés)
  function powerline(plan, r, rd) {
    const side = r.sign(), off = rd.w / 2 + r.range(4, 8), L = plan.launcher.pos;
    let prev = null;
    for (let s = -rd.obb.hd; s <= rd.obb.hd + 0.1; s += r.range(40, 55)) {
      const p = G.local(rd.obb, side * off, s);
      if (Math.hypot(p[0] - L[0], p[1] - L[2]) < 70) { prev = null; continue; }
      if (plan.space.hit(G.obb(p[0], p[1], 2, 2, 0), 0.5, (tg) => tg === 'reserve' || tg === 'bld')) { prev = null; continue; }
      const y = G.heightAt(plan, p[0], p[1]) + r.range(10, 12.5);
      const cur = [p[0], y, p[1]];
      if (prev) {
        const len = Math.hypot(cur[0] - prev[0], cur[2] - prev[2]), o = G.obb((prev[0] + cur[0]) / 2, (prev[2] + cur[2]) / 2, 3, len, Math.atan2(cur[0] - prev[0], cur[2] - prev[2]));
        if (plan.space.hit(o, 0, (tg) => tg === 'reserve')) { prev = null; continue; }   // jamais en travers d'une approche de cible
        plan.add({ t: 'cable', x: o.x, z: o.z, y0: G.heightAt(plan, cur[0], cur[2]), a: prev, b: cur, sag: 1.5, markers: false, poles: true });
        plan.space.add(o, 'obst');
      }
      prev = cur;
    }
  }

  function valleyObstacles(plan, r, kinds) {
    const P = plan.profile, L = plan.launcher.pos;
    const n = Math.round(2 + P.obstacleDensity * 8);
    let placed = 0;
    for (let k = 0; k < n * 10 && placed < n; k++) {
      const v = r.pick(plan.valleys), s = r.int(0, v.pts.length - 2), a = v.pts[s], b = v.pts[s + 1], t = r.range(0.15, 0.85);
      const x = G.lerp(a[0], b[0], t), z = G.lerp(a[1], b[1], t);
      if (z > -90 || Math.hypot(x - L[0], z - L[2]) < 110) continue;
      const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);                  // axe de la vallée
      const probe = G.obb(x, z, v.half * 2 + 20, 14, yaw);
      if (plan.space.hit(probe, 2, (tg) => tg === 'reserve' || tg === 'obst')) continue;
      const kind = r.weighted(kinds), y0 = G.heightAt(plan, x, z);
      let it = null;
      const width = v.half * 2 + 30;
      if (kind === 'rockArch') it = { t: 'arch', x, z, yaw, y0: y0 - 2, span: width, h: G.lerp(30, 13, P.obstacleDensity) + r.range(0, 5), th: r.range(8, 12), depth: r.range(10, 18) };
      else if (kind === 'pillar') {
        const p = G.local(probe, r.range(-v.half * 0.5, v.half * 0.5), 0);
        it = { t: 'pillar', x: p[0], z: p[1], yaw: r() * 6.28, y0: G.heightAt(plan, p[0], p[1]) - 2, w: r.range(7, 12), h: r.range(40, 80), mat: 'rock' };
      } else if (kind === 'bridge') it = { t: 'bridge', x, z, yaw, y0, span: width + 20, y: r.range(16, 34), w: r.range(6, 9) };
      else if (kind === 'cable') {
        const y = y0 + r.range(14, 34), pa = G.local(probe, -width / 2 - 10, 0), pb = G.local(probe, width / 2 + 10, 0);
        it = { t: 'cable', x, z, yaw, y0, a: [pa[0], y, pa[1]], b: [pb[0], y + r.range(-4, 4), pb[1]], sag: 2, markers: true, poles: false };
      }
      if (!it) continue;
      plan.add(it); plan.space.add(probe, 'obst', it); placed++;
    }
    plan.analysis.obstaclesPlaced = placed;
  }

  // ---------------------------------------------------------------- décor
  G.placeDecor = function (plan, r) {
    const B = plan.biome, bd = plan.bounds, L = plan.launcher.pos;
    const DEC = (t) => t === 'bld' || t === 'reserve' || t === 'decor' || t === 'obst' || t === 'road' || t === 'water';
    // le long des routes : lampadaires, voitures garées, arbres d'alignement
    for (const rd of plan.roads) {
      const len = rd.obb.hd * 2;
      const city = B.layout === 'grid' && (B.id !== 'military');
      for (let s = -rd.obb.hd + 6; s < rd.obb.hd - 6; s += r.range(city ? 22 : 38, city ? 34 : 60)) {
        for (const sg of [-1, 1]) {
          if (B.layout === 'grid' && r.chance(0.35)) continue;
          if (B.layout !== 'grid' && r.chance(0.7)) continue;
          const p = G.local(rd.obb, sg * (rd.w / 2 + 1.2), s);
          if (Math.hypot(p[0] - L[0], p[1] - L[2]) < 20) continue;
          G.put(plan, { t: 'lamp', x: p[0], z: p[1], yaw: rd.obb.yaw + (sg > 0 ? Math.PI : 0), night: plan.env.dark > 0.4 }, 0.3, (t) => t === 'bld' || t === 'reserve' || t === 'obst');
        }
      }
      if (B.layout === 'grid' && (B.id === 'urban' || B.id === 'mixed')) {
        for (let s = -rd.obb.hd + 8; s < rd.obb.hd - 8; s += r.range(9, 20)) {
          if (!r.chance(0.35)) continue;
          const sg = r.sign(), p = G.local(rd.obb, sg * (rd.w / 2 - 1.6), s);
          G.put(plan, { t: 'car', x: p[0], z: p[1], yaw: rd.obb.yaw + (sg > 0 ? 0 : Math.PI), col: G.carCol(r) }, 0.3, (t) => t === 'reserve' || t === 'obst' || t === 'decor');
        }
        if (rd.kind === 'main' && rd.w > 20 && r.chance(0.6)) {
          for (let s = -rd.obb.hd + 10; s < rd.obb.hd - 10; s += r.range(12, 16)) {
            const p = G.local(rd.obb, 0, s);
            G.put(plan, { t: 'tree', x: p[0], z: p[1], h: r.range(7, 10), rad: 0.3, broad: true }, 0.5, (t) => t === 'reserve' || t === 'obst' || t === 'decor');
          }
        }
      }
      if (len > 60 && r.chance(0.25)) {
        const p = G.local(rd.obb, (rd.w / 2 + 2) * r.sign(), r.range(-rd.obb.hd * 0.8, rd.obb.hd * 0.8));
        G.put(plan, { t: 'sign', x: p[0], z: p[1], yaw: rd.obb.yaw + Math.PI / 2, style: r.int(0, 3) }, 0.3, DEC);
      }
    }
    // relief : arbres et rochers dans les zones naturelles
    const nat = B.id === 'rural' ? 520 : B.id === 'mountain' ? 480 : B.id === 'desert' ? 70 : B.id === 'military' ? 160 : 0;
    const rocks = B.id === 'desert' ? 90 : B.id === 'mountain' ? 110 : B.id === 'rural' ? 30 : B.id === 'military' ? 25 : 0;
    const W = bd.x1 - bd.x0, Lz = bd.z1 - bd.z0;
    for (let i = 0, k = 0; i < nat && k < nat * 4; k++) {
      const x = bd.x0 - 120 + r() * (W + 240), z = bd.z1 + 60 - r() * (Lz + 200);
      if (Math.hypot(x - L[0], z - L[2]) < 30) continue;
      const h0 = G.heightAt(plan, x, z);
      if (B.id === 'mountain' && h0 > 95) continue;                    // pas d'arbres sur les crêtes
      const it = B.id === 'desert' ? { t: 'bush', x, z, s: r.range(0.8, 1.6) } : { t: 'tree', x, z, h: r.range(12, 26), rad: r.range(0.35, 0.8), broad: B.id === 'rural' && r.chance(0.4) };
      if (G.put(plan, it, 1, DEC)) i++;
    }
    for (let i = 0, k = 0; i < rocks && k < rocks * 4; k++) {
      const x = bd.x0 - 60 + r() * (W + 120), z = -20 - r() * (Lz + 40);
      if (G.put(plan, { t: 'rock', x, z, s: r.range(1.2, B.id === 'desert' ? 5 : 3.5) }, 0.5, DEC)) i++;
    }
  };
})();

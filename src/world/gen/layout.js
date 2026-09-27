/* Générateur de missions — COUCHE 1 : disposition (routes, parcelles, relief).
 * Trois dispositions, choisies par le biome :
 *  - grille (ville, industrie, base militaire, port, mixte) : avenue principale à décrochements, rues parallèles, rues
 *    transversales, îlots fusionnés, avenue parfois barrée (difficile) → parcelles alignées sur les rues ;
 *  - organique (campagne, désert) : route sinueuse, embranchements, hameaux / sites posés le long des routes, orientés
 *    comme elles ; champs dans les vides ;
 *  - vallée (montagne) : vallée sinueuse (et parfois une vallée secondaire) creusée dans le relief, bassins élargis.
 * Repère local : lanceur vers z = +20, la carte s'étend vers −z (le lanceur regarde vers −z). */
(function () {
  const G = CC.Gen, U = CC.U;

  G.layout = function (plan, r) {
    const B = plan.biome, P = plan.profile;
    const L = P.distance + 70;
    const W = G.clamp(0.52 * L + (B.layout === 'organic' ? 280 : 210), 380, 700);
    plan.bounds = { x0: -W / 2, x1: W / 2, z0: -L, z1: 60 };
    if (B.layout === 'grid') gridLayout(plan, r);
    else if (B.layout === 'organic') organicLayout(plan, r);
    else valleyLayout(plan, r);
    buildTerrain(plan, r);
  };

  // Route : rectangle (orienté) posé au sol ; les structures ne s'y posent jamais
  function road(plan, ax, az, bx, bz, w, kind, mat) {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.5) return null;
    const yaw = Math.atan2(bx - ax, bz - az);            // axe local z le long de la route
    const o = G.obb((ax + bx) / 2, (az + bz) / 2, w, len, yaw);
    const rd = { a: [ax, az], b: [bx, bz], w, kind, mat: mat || plan.biome.road, obb: o };
    plan.roads.push(rd);
    plan.space.add(o, 'road', rd);
    return rd;
  }

  // ---------------------------------------------------------------- grille
  function gridLayout(plan, r) {
    const B = plan.biome, P = plan.profile, bd = plan.bounds;
    const sizeF = 1.25 - 0.45 * P.buildingDensity;           // plus dense → îlots plus petits → plus de rues
    const blockW = [B.block.w[0] * sizeF, B.block.w[1] * sizeF], blockL = [B.block.l[0] * sizeF, B.block.l[1] * sizeF];
    const mainW = G.clamp(r.jitter(G.lerp(B.mainWidth[0], B.mainWidth[1], P.availableSpace), 0.08), 12, 38);
    const streetW = Math.max(9, mainW * r.between([0.52, 0.78]));
    const sw = B.sidewalk ? 2.6 : 1.5;
    // port : la mer occupe un côté ; la côte limite la ville
    let coast = null;
    if (B.terrain === 'coast') {
      const side = r.sign();
      coast = { side, x: side * bd.x1 * r.between([0.25, 0.45]) };
      plan.coast = coast;
    }
    const landMin = coast && coast.side < 0 ? coast.x + 10 : bd.x0 + 30;
    const landMax = coast && coast.side > 0 ? coast.x - 10 : bd.x1 - 30;
    // rues longitudinales
    const xm = G.clamp(r.between([-0.16, 0.16]) * (bd.x1 - bd.x0), landMin + 90, landMax - 90);
    const longs = [{ x: xm, w: mainW, main: true }];
    for (const dir of [-1, 1]) {
      let edge = xm + dir * mainW / 2;
      for (;;) {
        const bw = r.between(blockW), nx = edge + dir * (bw + streetW / 2);
        if (dir < 0 ? nx - streetW / 2 < landMin + 25 : nx + streetW / 2 > landMax - 25) break;
        longs.push({ x: nx, w: streetW });
        edge = nx + dir * streetW / 2;
      }
    }
    longs.sort((a, b) => a.x - b.x);
    // rues transversales (la première, devant le lanceur, est un boulevard)
    const cross = [{ z: 0, w: Math.max(streetW, mainW * 0.8) }];
    for (let z = 0; ;) {
      const bl = r.between(blockL);
      z -= cross[cross.length - 1].w / 2 + bl + streetW / 2;
      if (z < bd.z0 + 50) break;
      cross.push({ z, w: streetW });
    }
    const rows = cross.length;          // rangée k : entre cross[k] et cross[k+1] (dernière : jusqu'au fond)
    const zEdge = (k) => (k < rows ? cross[k].z : bd.z0 + 10);
    // décrochements de l'avenue (complexité du trajet) et tronçons barrés (difficile, jamais au premier rang)
    const iMain = longs.findIndex((l) => l.main);
    const jog = []; const barred = [];
    for (let k = 0; k < rows; k++) {
      jog.push(k === 0 ? 0 : (r() * 2 - 1) * P.routeComplexity * 0.35 * mainW);
      barred.push(k >= 2 && k < rows - 1 && r.chance(Math.max(0, P.routeComplexity - 0.45) * 0.5));
    }
    const lx = (c, k) => longs[c].x + (c === iMain ? jog[k] : 0);
    // tronçons de rue transversale supprimés → îlots fusionnés (pas le boulevard, pas le long de l'avenue)
    const mergeP = B.id === 'industrial' || B.id === 'port' ? 0.3 : B.id === 'military' ? 0.25 : 0.14;
    const open = [];                    // open[k][c] : la rue transversale k existe entre longs c et c+1 (c = −1 : bord gauche)
    for (let k = 0; k < rows; k++) {
      open.push([]);
      for (let c = -1; c < longs.length; c++) open[k][c + 1] = k === 0 || !(r.chance(mergeP) && c !== iMain && c + 1 !== iMain);
    }
    // --- routes ---
    for (let c = 0; c < longs.length; c++) {
      for (let k = 0; k < rows; k++) {
        if (longs[c].main && barred[k]) continue;
        const za = cross[k].z, zb = zEdge(k + 1);
        road(plan, lx(c, k), za + cross[k].w / 2, lx(c, k), zb - (k + 1 < rows ? cross[k + 1].w / 2 : 0), longs[c].w, longs[c].main ? 'main' : 'street');
      }
    }
    const xl0 = coast && coast.side < 0 ? coast.x + 4 : landMin - 20, xr0 = coast && coast.side > 0 ? coast.x - 4 : landMax + 20;
    for (let k = 0; k < rows; k++) {
      // la rue transversale : tronçons entre rues longitudinales (et jusqu'aux bords)
      const xs = [xl0, ...longs.map((l, c) => lx(c, k)), xr0];
      for (let c = 0; c < xs.length - 1; c++) {
        if (!open[k][c]) continue;
        road(plan, xs[c], cross[k].z, xs[c + 1], cross[k].z, cross[k].w, k === 0 ? 'main' : 'street');
      }
    }
    // --- parcelles ---
    const edgeX = (c, k, side) => (c < 0 ? xl0 : c >= longs.length ? xr0 : lx(c, k) + side * (longs[c].w / 2 + sw));
    const colCount = longs.length + 1;             // colonnes : bord gauche, entre rues, bord droit
    const done = new Set();
    for (let c = 0; c < colCount; c++) {
      for (let k = 0; k < rows; k++) {
        if (done.has(c + ':' + k)) continue;
        // fusion vers le bas tant que la rue transversale suivante est supprimée
        let k2 = k;
        while (k2 + 1 < rows && !open[k2 + 1][c]) { k2++; done.add(c + ':' + k2); }
        // avenue barrée : la parcelle de gauche avale la droite (sur une seule rangée)
        let cR = c;
        if (c === iMain && k === k2 && barred[k] && !done.has((c + 1) + ':' + k)) { cR = c + 1; done.add(cR + ':' + k); }
        const xL = Math.max(...range(k, k2).map((kk) => edgeX(c - 1, kk, 1)));
        const xR = Math.min(...range(k, k2).map((kk) => edgeX(cR, kk, -1)));
        const zT = cross[k].z - cross[k].w / 2 - sw;
        const zB = k2 + 1 < rows ? cross[k2 + 1].z + cross[k2 + 1].w / 2 + sw : bd.z0 + 10;
        if (xR - xL < 16 || zT - zB < 16) continue;
        const outer = c === 0 || c === colCount - 1;
        const pc = {
          obb: G.obb((xL + xR) / 2, (zT + zB) / 2, xR - xL, zT - zB, 0), row: k, col: c, outer,
          nearMain: c === iMain || c === iMain + 1, barred: cR !== c, depth: -((zT + zB) / 2) / Math.max(1, -bd.z0),
        };
        if (coast && ((coast.side > 0 && xL > coast.x) || (coast.side < 0 && xR < coast.x))) continue;   // dans l'eau
        if (coast && (coast.side > 0 ? xR > coast.x - 6 : xL < coast.x + 6)) {                     // coupée par la côte
          const a = coast.side > 0 ? xL : coast.x + 4, b = coast.side > 0 ? coast.x - 4 : xR;
          if (b - a < 16) continue;
          pc.obb = G.obb((a + b) / 2, pc.obb.z, b - a, zT - zB, 0); pc.quay = true;
        }
        plan.parcels.push(pc);
        plan.space.add(pc.obb, 'parcel');
      }
    }
    // lanceur : en tête d'une rue (l'avenue le plus souvent), sur un toit, regard vers −z
    const cands = longs.map((l, c) => ({ c, w: l.main ? 3 : 1 })).filter((e) => e.c === iMain || Math.abs(lx(e.c, 0)) < (bd.x1 - bd.x0) * 0.3);
    const lc = r.weighted(cands.map((e) => [e.c, e.w]));
    plan.launcherSpot = { x: lx(lc, 0), z: 22, alongRoad: true, roadW: longs[lc].w };
    // pour les sous-biomes (zone mixte)
    plan.gridInfo = { longs, cross, rows, mainW, streetW, iMain };
    // ports : jetées perpendiculaires à la côte
    if (coast) {
      const n = r.int(2, 4);
      for (let i = 0; i < n; i++) {
        const z = G.lerp(-60, bd.z0 + 80, (i + 0.5) / n) + r.range(-30, 30);
        const len = r.between([70, 150]), w = r.between([26, 44]);
        const x = coast.x + coast.side * (len / 2 - 2);
        const o = G.obb(x, z, len, w, 0);
        plan.piers.push({ obb: o });
        const pc = { obb: G.obb(x + coast.side * 3, z, len - 10, w - 6, 0), row: -1, col: -1, pier: true, depth: -z / Math.max(1, -bd.z0) };
        plan.parcels.push(pc);
        plan.space.add(pc.obb, 'parcel');
      }
    }
  }
  const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };

  // ---------------------------------------------------------------- organique
  function organicLayout(plan, r) {
    const B = plan.biome, P = plan.profile, bd = plan.bounds;
    const W = bd.x1 - bd.x0;
    const roadW = r.between([8, 12]);
    // route principale sinueuse
    const main = [[r.range(-0.1, 0.1) * W, 2]];
    for (let z = -50; z > bd.z0 + 20; z -= r.between([70, 120])) {
      const p = main[main.length - 1];
      main.push([G.clamp(p[0] + (r() * 2 - 1) * W * (0.08 + 0.14 * P.routeComplexity), bd.x0 + 70, bd.x1 - 70), z]);
    }
    main.push([main[main.length - 1][0], bd.z0 + 5]);
    const lines = [main];
    for (let i = 0; i < main.length - 1; i++) road(plan, main[i][0], main[i][1], main[i + 1][0], main[i + 1][1], roadW, 'main');
    // embranchements
    const nb = r.int(2, 4);
    for (let i = 0; i < nb; i++) {
      const s = r.int(1, main.length - 2), a = main[s], b = main[s + 1], t = r.range(0.2, 0.8);
      const p0 = [G.lerp(a[0], b[0], t), G.lerp(a[1], b[1], t)];
      const dir = Math.atan2(b[0] - a[0], b[1] - a[1]) + r.sign() * r.range(0.7, 1.9);
      const pts = [p0];
      let ang = dir;
      for (let k = 0; k < r.int(2, 3); k++) {
        const len = r.between([60, 110]), q = pts[pts.length - 1];
        const nx = q[0] + Math.sin(ang) * len, nz = q[1] + Math.cos(ang) * len;
        if (nx < bd.x0 + 30 || nx > bd.x1 - 30 || nz > 0 || nz < bd.z0 + 20) break;
        pts.push([nx, nz]); ang += r.range(-0.5, 0.5);
      }
      if (pts.length < 2) continue;
      for (let k = 0; k < pts.length - 1; k++) road(plan, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], roadW * 0.75, 'path');
      lines.push(pts);
    }
    // sites le long des routes (échantillonnage de Poisson), orientés comme la route
    const want = Math.round((-bd.z0 * W) / (21000 - 11000 * P.buildingDensity));
    const cs = B.clusterSize;
    let tries = 0;
    while (plan.parcels.length < want && tries++ < want * 30) {
      const line = r.pick(lines), s = r.int(0, line.length - 2), a = line[s], b = line[s + 1], t = r();
      const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const w = r.between(cs), d = r.between(cs) * r.between([0.6, 1]);
      const side = r.sign(), off = roadW / 2 + r.between([4, 26]) + w / 2;
      const nx = Math.cos(yaw), nz = -Math.sin(yaw);        // normale à la route
      const x = G.lerp(a[0], b[0], t) + side * nx * off, z = G.lerp(a[1], b[1], t) + side * nz * off;
      if (z > -20 || z < bd.z0 + 20 || x < bd.x0 + w / 2 || x > bd.x1 - w / 2) continue;
      const o = G.obb(x, z, w, d, yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2));   // face (+z local) tournée vers la route
      if (!plan.space.free(o, 12)) continue;
      plan.space.add(o, 'site');
      plan.parcels.push({ obb: o, row: -1, col: -1, site: true, depth: -z / Math.max(1, -bd.z0) });
    }
    // campagne : champs dans les vides
    if (B.id === 'rural') {
      for (let i = 0; i < 60; i++) {
        const w = r.between([50, 120]), d = r.between([40, 100]);
        const x = r.range(bd.x0 + w / 2, bd.x1 - w / 2), z = r.range(-30 - d / 2, bd.z0 + d / 2);
        const o = G.obb(x, z, w, d, r.range(-0.3, 0.3));
        if (!plan.space.free(o, 6)) continue;
        plan.space.add(o, 'site');
        plan.parcels.push({ obb: o, row: -1, col: -1, field: true, depth: -z / Math.max(1, -bd.z0) });
      }
    }
    plan.launcherSpot = { x: main[0][0], z: 24, alongRoad: true, roadW };
  }

  // ---------------------------------------------------------------- vallée
  function valleyLayout(plan, r) {
    const P = plan.profile, bd = plan.bounds, W = bd.x1 - bd.x0;
    const A = 25 + 70 * P.routeComplexity;
    const pts = [[0, 40]];
    for (let z = -40; z > bd.z0 - 40; z -= r.between([80, 120])) {
      const p = pts[pts.length - 1];
      pts.push([G.clamp(p[0] + (r() * 2 - 1) * A, bd.x0 + 90, bd.x1 - 90), z]);
    }
    const half = G.lerp(22, 58, P.availableSpace);
    const valleys = [{ pts, half, basins: [] }];
    // vallée secondaire : un autre chemin possible (se sépare puis rejoint la vallée principale ou finit en cul-de-sac)
    if (r.chance(0.55)) {
      const s = r.int(1, Math.max(1, Math.floor(pts.length * 0.4))), side = r.sign();
      const bp = [pts[s].slice()];
      for (let i = s + 1; i < pts.length; i++) {
        const q = pts[i];
        const off = side * Math.min(160, 60 + (i - s) * 45) * (i < pts.length - 2 ? 1 : 0.4);
        bp.push([G.clamp(q[0] + off, bd.x0 + 60, bd.x1 - 60), q[1]]);
      }
      valleys.push({ pts: bp, half: half * r.between([0.65, 0.9]), basins: [] });
    }
    // bassins élargis (sites) le long des vallées
    for (const v of valleys) {
      const n = r.int(2, 4);
      for (let i = 0; i < n; i++) {
        const s = r.int(1, v.pts.length - 2), a = v.pts[s], b = v.pts[s + 1], t = r.range(0.2, 0.8);
        v.basins.push({ x: G.lerp(a[0], b[0], t), z: G.lerp(a[1], b[1], t), r: r.between([55, 85]) });
      }
    }
    plan.valleys = valleys;
    for (const v of valleys) for (let i = 0; i < v.pts.length - 1; i++) road(plan, v.pts[i][0], v.pts[i][1], v.pts[i + 1][0], v.pts[i + 1][1], 7, v === valleys[0] ? 'main' : 'path', 'dirt');
    // sites : sur le côté de la route, dans les bassins puis le long du fond de vallée ; ils doivent tenir sur le fond plat
    const cs = plan.biome.clusterSize;
    const addSite = (v, s, t, sideSgn, minW) => {
      const a = v.pts[s], b = v.pts[s + 1], yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const cx = G.lerp(a[0], b[0], t), cz = G.lerp(a[1], b[1], t);
      // largeur disponible de ce côté : on sonde le fond plat en s'écartant de l'axe
      let avail = 0;
      for (let o = 6; o < 120; o += 3) { if (G.valleyFloorDist(plan, cx + Math.cos(yaw) * o * sideSgn, cz - Math.sin(yaw) * o * sideSgn) > -2) break; avail = o; }
      const w = Math.min(r.between(cs), avail - 10), d = r.between(cs) * r.between([0.7, 1.1]);
      if (w < minW) return false;
      const off = 9 + w / 2;                                         // bord du site à 9 m de l'axe (route de 7 m + marge)
      const x = cx + Math.cos(yaw) * off * sideSgn, z = cz - Math.sin(yaw) * off * sideSgn;
      const o = G.obb(x, z, w, d, yaw);
      if (z > -30 || !plan.space.free(o, 2)) return false;
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const p = G.local(o, lx * w / 2, lz * d / 2);
        if (G.valleyFloorDist(plan, p[0], p[1]) > 1) return false;
      }
      plan.space.add(o, 'site');
      plan.parcels.push({ obb: o, row: -1, col: -1, site: true, depth: -z / Math.max(1, -bd.z0) });
      return true;
    };
    for (const v of valleys) for (const b of v.basins) {
      let s = 0, bdd = Infinity;
      for (let i = 0; i < v.pts.length - 1; i++) { const d = segDist(b.x, b.z, v.pts[i], v.pts[i + 1]); if (d < bdd) { bdd = d; s = i; } }
      for (let k = 0; k < 8; k++) if (addSite(v, s, r.range(0.1, 0.9), r.sign(), 22)) break;
    }
    for (let i = 0; i < 60; i++) { const v = r.pick(valleys); addSite(v, r.int(0, v.pts.length - 2), r(), r.sign(), 16); }
    plan.launcherSpot = { x: pts[0][0], z: 24, ledge: true };
  }
  function nearestSeg(pts, x, z) {
    let best = null, bd = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = segDist(x, z, pts[i], pts[i + 1]);
      if (d < bd) { bd = d; best = [pts[i], pts[i + 1]]; }
    }
    return best;
  }
  function segDist(x, z, a, b) {
    const abx = b[0] - a[0], abz = b[1] - a[1], L2 = abx * abx + abz * abz;
    const t = L2 > 0 ? G.clamp(((x - a[0]) * abx + (z - a[1]) * abz) / L2, 0, 1) : 0;
    return Math.hypot(a[0] + abx * t - x, a[1] + abz * t - z);
  }
  G.segDist = segDist;

  // Distance (m) au fond plat de vallée : ≤ 0 = sur le fond plat
  G.valleyFloorDist = (plan, x, z) => {
    let best = Infinity;
    for (const v of plan.valleys) {
      let hw = v.half;
      for (const b of v.basins) { const d = Math.hypot(x - b.x, z - b.z); if (d < b.r * 1.6) hw = Math.max(hw, v.half + (b.r - v.half * 0.5) * U.smooth(b.r * 1.6, b.r * 0.6, d)); }
      let d = Infinity;
      for (let i = 0; i < v.pts.length - 1; i++) d = Math.min(d, segDist(x, z, v.pts[i], v.pts[i + 1]));
      best = Math.min(best, d - hw);
    }
    return best;
  };

  // ---------------------------------------------------------------- relief
  /* Grille de hauteurs (la même que le terrain affiché) : la hauteur d'un point est interpolée exactement comme le
   * maillage (G.heightAt), donc les objets posés par le plan le sont sur le sol réellement visible. */
  function buildTerrain(plan, r) {
    const B = plan.biome, bd = plan.bounds;
    const kind = B.terrain;
    plan.terrain = { kind, seed: r.int(1, 1e6) };
    if (kind === 'flat' || kind === 'coast') return;
    const margin = kind === 'mountain' ? 260 : 320;
    const span = Math.max(bd.x1 - bd.x0, bd.z1 - bd.z0) + 2 * margin;
    const n = kind === 'mountain' ? 151 : 121, step = Math.ceil(span / (n - 1));
    const cx = (bd.x0 + bd.x1) / 2, cz = (bd.z0 + bd.z1) / 2;
    const T = plan.terrain;
    Object.assign(T, { n, step, x0: Math.round(cx - (n - 1) * step / 2), z0: Math.round(cz - (n - 1) * step / 2) });
    const H = new Float32Array(n * n), sd = T.seed;
    // distance (m) de chaque sommet au plus proche élément plat (route, parcelle, site) : rastérisation + chanfrein
    const flatD = new Float32Array(n * n).fill(1e6);
    if (kind !== 'mountain') {
      for (const e of plan.space.list) {
        if (e.tag !== 'road' && e.tag !== 'site' && e.tag !== 'parcel') continue;
        const i0 = Math.max(0, Math.floor((e.bb[0] - T.x0) / step)), i1 = Math.min(n - 1, Math.ceil((e.bb[2] - T.x0) / step));
        const k0 = Math.max(0, Math.floor((e.bb[1] - T.z0) / step)), k1 = Math.min(n - 1, Math.ceil((e.bb[3] - T.z0) / step));
        for (let iz = k0; iz <= k1; iz++) for (let ix = i0; ix <= i1; ix++) {
          const d = G.distToObb(T.x0 + ix * step, T.z0 + iz * step, e.o);
          if (d < flatD[iz * n + ix]) flatD[iz * n + ix] = d;
        }
      }
      const dg = step * Math.SQRT2;
      for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
        const i = iz * n + ix; let v = flatD[i];
        if (ix > 0) v = Math.min(v, flatD[i - 1] + step);
        if (iz > 0) { v = Math.min(v, flatD[i - n] + step); if (ix > 0) v = Math.min(v, flatD[i - n - 1] + dg); if (ix < n - 1) v = Math.min(v, flatD[i - n + 1] + dg); }
        flatD[i] = v;
      }
      for (let iz = n - 1; iz >= 0; iz--) for (let ix = n - 1; ix >= 0; ix--) {
        const i = iz * n + ix; let v = flatD[i];
        if (ix < n - 1) v = Math.min(v, flatD[i + 1] + step);
        if (iz < n - 1) { v = Math.min(v, flatD[i + n] + step); if (ix < n - 1) v = Math.min(v, flatD[i + n + 1] + dg); if (ix > 0) v = Math.min(v, flatD[i + n - 1] + dg); }
        flatD[i] = v;
      }
    }
    const amp = B.hillAmp ? r.between(B.hillAmp) : 0;
    const peak = r.between([80, 140]), slopeW = r.between([40, 80]);
    for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
      const x = T.x0 + ix * step, z = T.z0 + iz * step;
      let h;
      if (kind === 'mountain') {
        const d = G.valleyFloorDist(plan, x, z);
        h = peak * U.smooth(0, slopeW, d) * (0.65 + 0.7 * U.fbm2(x * 0.006, z * 0.006, 3, sd)) + 18 * U.fbm2(x * 0.03, z * 0.03, 2, sd + 7) * U.smooth(0, 30, d);
        if (z > 45) h = Math.max(h, 70 * U.smooth(45, 110, z));               // paroi derrière le lanceur
      } else {
        // collines / dunes : aplaties près des routes et des parcelles, relevées au-delà des limites (cadre de la carte)
        const mask = U.smooth(4, 55, flatD[iz * n + ix]);
        const out = Math.max(0, Math.max(bd.x0 - x, x - bd.x1, bd.z0 - z, z - bd.z1));
        const base = kind === 'dunes'
          ? amp * (0.55 * (0.5 + 0.5 * Math.sin(x * 0.045 + 2.4 * U.fbm2(x * 0.01, z * 0.01, 2, sd))) + 0.45 * U.fbm2(x * 0.02, z * 0.02, 3, sd + 3))
          : amp * U.fbm2(x * 0.012, z * 0.012, 3, sd);
        h = base * mask + (kind === 'dunes' ? 30 : 55) * U.smooth(20, 260, out) * (0.6 + 0.6 * U.fbm2(x * 0.008, z * 0.008, 2, sd + 11));
      }
      H[iz * n + ix] = G.round(h, 2);
    }
    T.H = H;
  }

  /* Hauteur du sol au point (x, z) : même interpolation que le maillage du terrain (diagonale de PlaneGeometry). */
  G.heightAt = (plan, x, z) => {
    const T = plan.terrain;
    if (!T || !T.H) return 0;
    const fx = (x - T.x0) / T.step, fz = (z - T.z0) / T.step;
    if (fx < 0 || fz < 0 || fx > T.n - 1 || fz > T.n - 1) return 0;
    const ix = Math.min(T.n - 2, Math.floor(fx)), iz = Math.min(T.n - 2, Math.floor(fz)), tx = fx - ix, tz = fz - iz, H = T.H, n = T.n;
    const h00 = H[iz * n + ix], h10 = H[iz * n + ix + 1], h01 = H[(iz + 1) * n + ix], h11 = H[(iz + 1) * n + ix + 1];
    return tx + tz <= 1 ? h00 + (h10 - h00) * tx + (h01 - h00) * tz : h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz);
  };
  // Hauteur min / max du sol sous une emprise (coins + centre + milieux)
  G.groundRange = (plan, o) => {
    let lo = Infinity, hi = -Infinity;
    for (const [a, b] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const p = G.local(o, a * o.hw, b * o.hd), h = G.heightAt(plan, p[0], p[1]);
      lo = Math.min(lo, h); hi = Math.max(hi, h);
    }
    return [lo, hi];
  };
})();

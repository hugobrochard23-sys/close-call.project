/* Générateur de missions — navigation du missile : grille d'occupation 3D, recherche de trajectoire, danger.
 *
 * La carte est découpée en cellules (5 m × 4 m × 5 m). Une cellule est « bloquée » si le missile, avec la marge de
 * sécurité du profil (FACILE 3,6 m → IMPOSSIBLE 1,7 m), y toucherait une structure ou le sol. Recherche A* pondérée
 * (26 voisins) : longueur + danger (tireurs qui voient la cellule, à portée) + altitude excessive. Le chemin est ensuite
 * tendu (lignes droites tant que c'est libre) puis vérifié exactement contre les boîtes de collision du plan.
 * Sert à : prouver que chaque cible est atteignable, trouver les couloirs (et un second couloir distinct), placer les
 * défenses sur les vraies approches, mesurer l'exposition, produire les routes du pilote automatique. */
(function () {
  const G = CC.Gen;

  class Nav {
    constructor(plan) {
      const bd = plan.bounds, P = plan.profile;
      this.plan = plan;
      this.r = P.clearance;
      this.cs = 5; this.ch = 4;
      this.x0 = bd.x0 - 40; this.z0 = bd.z0 - 40;
      this.nx = Math.ceil((bd.x1 + 40 - this.x0) / this.cs); this.nz = Math.ceil((bd.z1 + 40 - this.z0) / this.cs);
      let top = 0;
      for (const s of plan.solids) if (!G.passable(s)) top = Math.max(top, s.y + s.h / 2);
      const T = plan.terrain; let tmax = 0;
      if (T && T.H) for (let i = 0; i < T.H.length; i++) tmax = Math.max(tmax, T.H[i]);
      this.y0 = plan.coast ? -3 : -1.5;
      this.ny = Math.ceil((Math.min(200, Math.max(110, top + 30, Math.min(tmax, 150) + 30)) - this.y0) / this.ch);
      this.N = this.nx * this.ny * this.nz;
      this.occ = new Uint8Array(this.N);          // bit 0 : bloqué (marge comprise) ; bit 1 : plein (ligne de vue)
      this.top = new Float32Array(this.nx * this.nz);   // plus haut obstacle de chaque colonne (hélicoptères)
      this.rasterize();
      this.shooters = []; this.dg = null;
      // tampons de recherche partagés d'une génération à l'autre (pas de ramasse-miettes à chaque carte, mobile)
      const pool = G._navPool && G._navPool.n >= this.N ? G._navPool : (G._navPool = { n: this.N, seen: new Uint16Array(this.N), closed: new Uint16Array(this.N), g: new Float32Array(this.N), parent: new Int32Array(this.N), stamp: 0 });
      this.pool = pool; this.seen = pool.seen; this.closed = pool.closed; this.g = pool.g; this.parent = pool.parent;
    }
    idx(ix, iy, iz) { return (iy * this.nz + iz) * this.nx + ix; }
    cx(ix) { return this.x0 + (ix + 0.5) * this.cs; }
    cy(iy) { return this.y0 + (iy + 0.5) * this.ch; }
    cz(iz) { return this.z0 + (iz + 0.5) * this.cs; }
    cell(p) { return [Math.floor((p[0] - this.x0) / this.cs), Math.floor((p[1] - this.y0) / this.ch), Math.floor((p[2] - this.z0) / this.cs)]; }
    inside(ix, iy, iz) { return ix >= 0 && iy >= 0 && iz >= 0 && ix < this.nx && iy < this.ny && iz < this.nz; }

    rasterize() {
      const { nx, nz, ny, cs, ch, occ, r, plan } = this;
      // sol (terrain, eau, sol plat)
      for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
        const x = this.cx(ix), z = this.cz(iz);
        let g = -Infinity;
        for (const [dx, dz] of [[0, 0], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) g = Math.max(g, G.heightAt(plan, x + dx * cs, z + dz * cs));
        if (plan.coast && (plan.coast.side > 0 ? x > plan.coast.x + 2 : x < plan.coast.x - 2) && !plan.piers.some((p) => G.pointInObb(x, z, p.obb, 2))) g = -2.2;
        this.top[iz * nx + ix] = g;
        for (let iy = 0; iy < ny; iy++) {
          const yc = this.cy(iy);
          if (yc < g) occ[this.idx(ix, iy, iz)] |= 3;
          else if (yc - ch / 2 < g + r) occ[this.idx(ix, iy, iz)] |= 1;
          else break;
        }
      }
      // structures (les cassables — vitres, caisses, murets de briques — se traversent)
      const inflH = r + cs * 0.5, inflV = r + ch * 0.5;
      for (const s of plan.solids) {
        if (G.passable(s)) continue;
        const bb = G.solidAabb(s);
        const q = Math.abs(Math.sin(2 * (s.yaw || 0)));
        if (q < 1e-3) {
          // boîte alignée sur les axes : agrandie de la marge, remplie sans calcul de distance (coins un peu plus prudents)
          const i0 = Math.max(0, Math.floor((bb[0] - inflH + cs / 2 - this.x0) / cs)), i1 = Math.min(nx - 1, Math.floor((bb[3] + inflH - cs / 2 - this.x0) / cs));
          const k0 = Math.max(0, Math.floor((bb[2] - inflH + cs / 2 - this.z0) / cs)), k1 = Math.min(nz - 1, Math.floor((bb[5] + inflH - cs / 2 - this.z0) / cs));
          const j0 = Math.max(0, Math.floor((bb[1] - inflV + ch / 2 - this.y0) / ch)), j1 = Math.min(ny - 1, Math.floor((bb[4] + inflV - ch / 2 - this.y0) / ch));
          const r0 = Math.max(0, Math.floor((bb[0] - this.x0) / cs)), r1 = Math.min(nx - 1, Math.floor((bb[3] - this.x0) / cs));
          const s0 = Math.max(0, Math.floor((bb[2] - this.z0) / cs)), s1 = Math.min(nz - 1, Math.floor((bb[5] - this.z0) / cs));
          const t0 = Math.max(0, Math.floor((bb[1] - this.y0) / ch)), t1 = Math.min(ny - 1, Math.floor((bb[4] - this.y0) / ch));
          for (let iy = j0; iy <= j1; iy++) for (let iz = k0; iz <= k1; iz++) {
            let id = this.idx(i0, iy, iz);
            for (let ix = i0; ix <= i1; ix++, id++) {
              occ[id] |= 1;
              if (ix >= r0 && ix <= r1 && iz >= s0 && iz <= s1 && iy >= t0 && iy <= t1 && bb[3] - bb[0] > cs * 0.4 && bb[5] - bb[2] > cs * 0.4) occ[id] |= 2;
            }
          }
          const top = bb[4];
          for (let iz = s0; iz <= s1; iz++) for (let ix = r0; ix <= r1; ix++) if (top > this.top[iz * nx + ix]) this.top[iz * nx + ix] = top;
          continue;
        }
        const i0 = Math.max(0, Math.floor((bb[0] - inflH - this.x0) / cs)), i1 = Math.min(nx - 1, Math.floor((bb[3] + inflH - this.x0) / cs));
        const k0 = Math.max(0, Math.floor((bb[2] - inflH - this.z0) / cs)), k1 = Math.min(nz - 1, Math.floor((bb[5] + inflH - this.z0) / cs));
        const j0 = Math.max(0, Math.floor((bb[1] - inflV - this.y0) / ch)), j1 = Math.min(ny - 1, Math.floor((bb[4] + inflV - this.y0) / ch));
        for (let iz = k0; iz <= k1; iz++) for (let ix = i0; ix <= i1; ix++) {
          const x = this.cx(ix), z = this.cz(iz);
          // distance horizontale à l'emprise (rapide) avant la distance 3D
          const c = Math.cos(s.yaw || 0), sn = Math.sin(s.yaw || 0), dx = x - s.x, dz = z - s.z;
          const qx = Math.abs(dx * c - dz * sn) - s.w / 2, qz = Math.abs(dx * sn + dz * c) - s.d / 2;
          const dh = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
          if (dh > inflH) continue;
          const colTop = s.y + s.h / 2, ci = iz * nx + ix;
          if (dh < cs * 0.35 && colTop > this.top[ci]) this.top[ci] = colTop;
          for (let iy = j0; iy <= j1; iy++) {
            const y = this.cy(iy), qy = Math.abs(y - s.y) - s.h / 2;
            const d = Math.hypot(dh, Math.max(qy, 0));
            const id = this.idx(ix, iy, iz);
            if (d < (qy > 0 ? inflV : inflH)) occ[id] |= 1;
            if (dh < cs * 0.3 && qy < ch * 0.3) occ[id] |= 2;
          }
        }
      }
    }

    blocked(ix, iy, iz) { return !this.inside(ix, iy, iz) || (this.occ[this.idx(ix, iy, iz)] & 1); }
    freeAt(p) { const c = this.cell(p); return !this.blocked(c[0], c[1], c[2]); }
    // Plus haut obstacle (sol ou structure) au point (x, z)
    topAt(x, z) {
      const ix = Math.floor((x - this.x0) / this.cs), iz = Math.floor((z - this.z0) / this.cs);
      if (ix < 0 || iz < 0 || ix >= this.nx || iz >= this.nz) return 0;
      let m = -Infinity;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const i = ix + a, k = iz + b; if (i >= 0 && k >= 0 && i < this.nx && k < this.nz) m = Math.max(m, this.top[k * this.nx + i]); }
      return m;
    }
    // Sphère de rayon rad dégagée (cellules pleines) ?
    clearSphere(x, y, z, rad) {
      const n = Math.ceil(rad / this.cs), c = this.cell([x, y, z]);
      for (let a = -n; a <= n; a++) for (let b = -Math.ceil(rad / this.ch); b <= Math.ceil(rad / this.ch); b++) for (let e = -n; e <= n; e++) {
        const ix = c[0] + a, iy = c[1] + b, iz = c[2] + e;
        if (!this.inside(ix, iy, iz)) continue;
        if (this.occ[this.idx(ix, iy, iz)] & 2) return false;
      }
      return true;
    }

    /* Ligne de vue (cellules pleines seulement) de a vers b : parcours de grille 3D (Amanatides-Woo). */
    los(a, b) {
      const { cs, ch } = this;
      let [ix, iy, iz] = this.cell(a);
      const e = this.cell(b);
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const sz = [cs, ch, cs], o = [this.x0, this.y0, this.z0], c = [ix, iy, iz];
      const step = [0, 0, 0], tMax = [0, 0, 0], tDelta = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        step[k] = d[k] > 0 ? 1 : d[k] < 0 ? -1 : 0;
        if (step[k] === 0) { tMax[k] = Infinity; tDelta[k] = Infinity; continue; }
        const bound = o[k] + (c[k] + (step[k] > 0 ? 1 : 0)) * sz[k];
        tMax[k] = (bound - a[k]) / d[k]; tDelta[k] = sz[k] / Math.abs(d[k]);
      }
      let n = 0;
      for (;;) {
        if (n++ > 2 && this.inside(c[0], c[1], c[2]) && (this.occ[this.idx(c[0], c[1], c[2])] & 2)) return false;
        if (c[0] === e[0] && c[1] === e[1] && c[2] === e[2]) return true;
        let k = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
        if (tMax[k] > 1) return true;
        c[k] += step[k]; tMax[k] += tDelta[k];
        if (n > 2000) return true;
      }
    }

    /* Champ de danger précalculé sur une grille grossière (2 × 2 × 2 cellules) : pour chaque tireur, les cellules à
     * portée qu'il voit reçoivent son poids. Lecture en temps constant pendant la recherche de trajectoire. */
    setShooters(list, range, minRange, near) {
      this.shooters = list; this.range = range; this.minRange = minRange;
      const gx = Math.ceil(this.nx / 2), gy = Math.ceil(this.ny / 2), gz = Math.ceil(this.nz / 2);
      this.dg = { gx, gy, gz, d: new Float32Array(gx * gy * gz) };
      const D = this.dg.d, cs = this.cs * 2, ch = this.ch * 2;
      // colonnes utiles seulement : à moins de 70 m d'un couloir d'approche (ailleurs, le danger ne sert à rien)
      let mask = null;
      if (near && near.length) {
        mask = new Uint8Array(gx * gz);
        for (const pts of near) for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - 70 - this.x0) / cs)), i1 = Math.min(gx - 1, Math.floor((Math.max(a[0], b[0]) + 70 - this.x0) / cs));
          const k0 = Math.max(0, Math.floor((Math.min(a[2], b[2]) - 70 - this.z0) / cs)), k1 = Math.min(gz - 1, Math.floor((Math.max(a[2], b[2]) + 70 - this.z0) / cs));
          for (let k = k0; k <= k1; k++) for (let j = i0; j <= i1; j++) {
            if (mask[k * gx + j]) continue;
            if (G.segDist(this.x0 + (j + 0.5) * cs, this.z0 + (k + 0.5) * cs, [a[0], a[2]], [b[0], b[2]]) < 70) mask[k * gx + j] = 1;
          }
        }
      }
      for (const sh of list) {
        const i0 = Math.max(0, Math.floor((sh.p[0] - range - this.x0) / cs)), i1 = Math.min(gx - 1, Math.floor((sh.p[0] + range - this.x0) / cs));
        const k0 = Math.max(0, Math.floor((sh.p[2] - range - this.z0) / cs)), k1 = Math.min(gz - 1, Math.floor((sh.p[2] + range - this.z0) / cs));
        const j1 = Math.min(gy - 1, Math.floor((Math.min(sh.p[1] + range, 80) - this.y0) / ch));   // au-dessus de 80 m : on ne vole guère
        for (let jy = 0; jy <= j1; jy++) for (let jz = k0; jz <= k1; jz++) for (let jx = i0; jx <= i1; jx++) {
          if (mask && !mask[jz * gx + jx]) continue;
          const p = [this.x0 + (jx + 0.5) * cs, this.y0 + (jy + 0.5) * ch, this.z0 + (jz + 0.5) * cs];
          const dd = G.dist3(p, sh.p);
          if (dd > range || dd < minRange) continue;
          const c = this.cell(p);
          if (this.inside(c[0], c[1], c[2]) && (this.occ[this.idx(c[0], c[1], c[2])] & 2)) continue;
          if (this.los(sh.p, p)) D[(jy * gz + jz) * gx + jx] += sh.w;
        }
      }
    }
    // Danger d'une cellule : nombre pondéré de tireurs qui la voient à portée
    dangerAt(id, ix, iy, iz) {
      const g = this.dg;
      return g ? g.d[((iy >> 1) * g.gz + (iz >> 1)) * g.gx + (ix >> 1)] : 0;
    }
    dangerAtPoint(p) {
      const c = this.cell(p);
      if (!this.inside(c[0], c[1], c[2])) return 0;
      return this.dangerAt(0, c[0], c[1], c[2]);
    }

    // Cellule libre la plus proche (recherche en couronnes)
    snap(p, maxR) {
      const c = this.cell(p);
      if (!this.blocked(c[0], c[1], c[2])) return c;
      for (let rr = 1; rr <= (maxR || 5); rr++) {
        let best = null, bd = Infinity;
        for (let a = -rr; a <= rr; a++) for (let b = -rr; b <= rr; b++) for (let e = -rr; e <= rr; e++) {
          if (Math.max(Math.abs(a), Math.abs(b), Math.abs(e)) !== rr) continue;
          const q = [c[0] + a, c[1] + b, c[2] + e];
          if (this.blocked(q[0], q[1], q[2])) continue;
          const d = Math.hypot(this.cx(q[0]) - p[0], this.cy(q[1]) - p[1], this.cz(q[2]) - p[2]);
          if (d < bd) { bd = d; best = q; }
        }
        if (best) return best;
      }
      return null;
    }

    /* A* pondéré. opts : { danger (poids), avoid (fonction (x,z) → pénalité), altRef, maxExpand } → liste de points ou null */
    search(from, to, opts) {
      opts = opts || {};
      const s = this.snap(from, 6), t = this.snap(to, 6);
      if (!s || !t) return null;
      const { nx, nz, ny, cs, ch } = this;
      if (++this.pool.stamp > 65000) { this.pool.stamp = 1; this.seen.fill(0); this.closed.fill(0); }
      const stamp = this.pool.stamp, seen = this.seen, g = this.g, par = this.parent;
      const sid = this.idx(s[0], s[1], s[2]), tid = this.idx(t[0], t[1], t[2]);
      const tx = this.cx(t[0]), ty = this.cy(t[1]), tz = this.cz(t[2]);
      const heap = new Heap();
      const eps = opts.eps || 1.25, wD = opts.danger || 0, altRef = opts.altRef || 45, avoid = opts.avoid;
      const h = (ix, iy, iz) => Math.hypot(this.cx(ix) - tx, this.cy(iy) - ty, this.cz(iz) - tz) * eps;
      seen[sid] = stamp; g[sid] = 0; par[sid] = -1;
      heap.push(sid, h(s[0], s[1], s[2]));
      const closed = this.closed;
      let expanded = 0;
      const maxE = opts.maxExpand || 600000;
      while (heap.size) {
        const id = heap.pop();
        if (closed[id] === stamp) continue;
        closed[id] = stamp;
        if (id === tid) break;
        if (++expanded > maxE) { this.lastExpanded = expanded; return null; }
        const ix = id % nx, rest = (id - ix) / nx, iz = rest % nz, iy = (rest - iz) / nz;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) {
          if (!a && !b && !e) continue;
          const jx = ix + a, jy = iy + b, jz = iz + e;
          if (jx < 0 || jy < 0 || jz < 0 || jx >= nx || jy >= ny || jz >= nz) continue;
          const nid = (jy * nz + jz) * nx + jx;
          if (this.occ[nid] & 1 || closed[nid] === stamp) continue;
          const len = Math.hypot(a * cs, b * ch, e * cs);
          const y = this.cy(jy);
          let c = len * (1 + (y > altRef ? (y - altRef) * 0.03 : 0));
          if (wD) c += len * wD * Math.min(1.5, this.dangerAt(nid, jx, jy, jz));   // borné : l'heuristique reste utile
          if (avoid) c += len * avoid(this.cx(jx), this.cz(jz));
          const ng = g[id] + c;
          if (seen[nid] === stamp && ng >= g[nid]) continue;
          seen[nid] = stamp; g[nid] = ng; par[nid] = id;
          heap.push(nid, ng + h(jx, jy, jz));
        }
      }
      if (seen[tid] !== stamp || closed[tid] !== stamp) return null;
      const cells = [];
      for (let id = tid; id !== -1; id = par[id]) cells.push(id);
      cells.reverse();
      this.lastExpanded = expanded;
      const pts = cells.map((id) => { const ix = id % nx, rest = (id - ix) / nx, iz = rest % nz, iy = (rest - iz) / nz; return [this.cx(ix), this.cy(iy), this.cz(iz)]; });
      // extrémités exactes (le départ et l'arrivée demandés, pas les centres de cellule)
      pts[0] = from.slice(); pts[pts.length - 1] = to.slice();
      return pts;
    }

    // Segment libre dans la grille (échantillons tous les mètres)
    clearSeg(a, b) {
      const L = G.dist3(a, b), n = Math.max(1, Math.ceil(L / 1.5));
      for (let i = 0; i <= n; i++) {
        const k = i / n, c = this.cell([G.lerp(a[0], b[0], k), G.lerp(a[1], b[1], k), G.lerp(a[2], b[2], k)]);
        if (this.blocked(c[0], c[1], c[2])) return false;
      }
      return true;
    }
    // Chemin tendu : lignes droites tant que la grille est libre
    pull(pts) {
      if (pts.length < 3) return pts.slice();
      const out = [pts[0]];
      let i = 0;
      // en avant : on prolonge la ligne droite tant qu'elle reste libre (coût linéaire, même dans une vallée sinueuse)
      while (i < pts.length - 1) {
        let j = i + 1;
        while (j + 1 < pts.length && this.clearSeg(pts[i], pts[j + 1])) j++;
        out.push(pts[j]); i = j;
      }
      return out;
    }
    /* Chemin de vol : tendu, rééchantillonné tous les 6 m, puis relâché comme un élastique (chaque point glisse vers le
     * milieu de ses voisins tant qu'il reste en cellule libre) — les coins deviennent des courbes, comme un missile les
     * prend — et enfin retendu (points superflus retirés). */
    smooth(pts) {
      let P = this.pull(pts);
      if (P.length < 3) return P;
      // coins coupés (Chaikin) tant que la coupe reste libre : les virages s'élargissent là où il y a de la place
      for (let it = 0; it < 3; it++) {
        const Q = [P[0]];
        for (let i = 1; i < P.length - 1; i++) {
          const a = P[i - 1], b = P[i], c = P[i + 1];
          const p1 = [G.lerp(b[0], a[0], 0.3), G.lerp(b[1], a[1], 0.3), G.lerp(b[2], a[2], 0.3)];
          const p2 = [G.lerp(b[0], c[0], 0.3), G.lerp(b[1], c[1], 0.3), G.lerp(b[2], c[2], 0.3)];
          if (this.clearSeg(p1, p2)) Q.push(p1, p2); else Q.push(b);
        }
        Q.push(P[P.length - 1]);
        P = Q;
      }
      const R = [P[0]];
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1], b = P[i], L = G.dist3(a, b), n = Math.max(1, Math.round(L / 6));
        for (let k = 1; k <= n; k++) R.push([G.lerp(a[0], b[0], k / n), G.lerp(a[1], b[1], k / n), G.lerp(a[2], b[2], k / n)]);
      }
      for (let it = 0; it < 24; it++) {
        for (let i = 1; i < R.length - 1; i++) {
          const a = R[i - 1], b = R[i + 1], p = R[i];
          const q = [p[0] + (0.5 * (a[0] + b[0]) - p[0]) * 0.6, p[1] + (0.5 * (a[1] + b[1]) - p[1]) * 0.6, p[2] + (0.5 * (a[2] + b[2]) - p[2]) * 0.6];
          if (this.freeAt(q)) R[i] = q;
        }
      }
      // simplification : on garde un point dès que la direction tourne de plus de 4°
      const out = [R[0]];
      for (let i = 1; i < R.length - 1; i++) {
        const a = out[out.length - 1], b = R[i], c = R[i + 1];
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
        const cos = (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (Math.hypot(...u) * Math.hypot(...w) || 1);
        if (cos < 0.9976 || !this.clearSeg(a, c)) out.push(b);
      }
      out.push(R[R.length - 1]);
      return out.map((q) => q.map((v) => G.round(v)));
    }
  }

  // Tas binaire minimal (indices + priorités)
  class Heap {
    constructor() { this.ids = []; this.pr = []; this.size = 0; }
    push(id, p) {
      let i = this.size++;
      this.ids[i] = id; this.pr[i] = p;
      while (i > 0) {
        const q = (i - 1) >> 1;
        if (this.pr[q] <= p) break;
        this.ids[i] = this.ids[q]; this.pr[i] = this.pr[q]; i = q;
      }
      this.ids[i] = id; this.pr[i] = p;
    }
    pop() {
      const top = this.ids[0], id = this.ids[--this.size], p = this.pr[this.size];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= this.size) break;
        if (c + 1 < this.size && this.pr[c + 1] < this.pr[c]) c++;
        if (this.pr[c] >= p) break;
        this.ids[i] = this.ids[c]; this.pr[i] = this.pr[c]; i = c;
      }
      this.ids[i] = id; this.pr[i] = p;
      return top;
    }
  }

  G.Nav = Nav;
})();

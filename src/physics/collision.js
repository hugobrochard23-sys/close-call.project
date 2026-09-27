/* Monde physique : boîtes orientées (OBB), terrains (heightfield), tunnels (tube de grotte).
 * Requêtes : balayage de sphère (sweep), distance à la surface la plus proche, lancer de rayon.
 * Grille de hachage XZ pour limiter les candidats. */
(function () {
  const V = THREE.Vector3;
  // v030 (mobile) : objets de calcul réutilisés — la physique tourne 240 fois par seconde, chaque allocation compte
  const _d = new V(), _p = new V(), _n = new V(), _rel = new V();

  class World {
    constructor() {
      this.boxes = []; this.heightfields = []; this.tubes = [];
      this.cell = 16; this.grid = new Map(); this.stamp = 1;
      this._cand = [];
    }

    key(ix, iz) { return (ix + 32768) * 65536 + (iz + 32768); }

    /* opts : center [x,y,z] | Vector3, size [w,h,d], quat (THREE.Quaternion) optionnel,
     *        kind : 'solid'|'glass'|'brick'|'target'|'hazard'|'cable', ground (bool), ref (entité) */
    addBox(opts) {
      const c = opts.center.isVector3 ? opts.center.clone() : new V().fromArray(opts.center);
      const s = opts.size;
      const q = opts.quat || new THREE.Quaternion();
      const b = {
        c, hx: s[0] / 2, hy: s[1] / 2, hz: s[2] / 2,
        ux: new V(1, 0, 0).applyQuaternion(q), uy: new V(0, 1, 0).applyQuaternion(q), uz: new V(0, 0, 1).applyQuaternion(q),
        kind: opts.kind || 'solid', ref: opts.ref || null, active: true, _stamp: 0,
        ground: !!opts.ground,
      };
      // AABB monde
      const ex = Math.abs(b.ux.x) * b.hx + Math.abs(b.uy.x) * b.hy + Math.abs(b.uz.x) * b.hz;
      const ey = Math.abs(b.ux.y) * b.hx + Math.abs(b.uy.y) * b.hy + Math.abs(b.uz.y) * b.hz;
      const ez = Math.abs(b.ux.z) * b.hx + Math.abs(b.uy.z) * b.hy + Math.abs(b.uz.z) * b.hz;
      b.min = new V(c.x - ex, c.y - ey, c.z - ez); b.max = new V(c.x + ex, c.y + ey, c.z + ez);
      const cs = this.cell;
      for (let ix = Math.floor(b.min.x / cs); ix <= Math.floor(b.max.x / cs); ix++)
        for (let iz = Math.floor(b.min.z / cs); iz <= Math.floor(b.max.z / cs); iz++) {
          const k = this.key(ix, iz);
          let arr = this.grid.get(k);
          if (!arr) { arr = []; this.grid.set(k, arr); }
          arr.push(b);
        }
      this.boxes.push(b);
      return b;
    }

    // v033 : retire des boîtes (tronçon du couloir infini détruit derrière la roquette) de la grille et de la liste
    removeBoxes(list) {
      if (!list || !list.length) return;
      const gone = new Set(list), cs = this.cell;
      for (const b of list) {
        b.active = false;
        for (let ix = Math.floor(b.min.x / cs); ix <= Math.floor(b.max.x / cs); ix++)
          for (let iz = Math.floor(b.min.z / cs); iz <= Math.floor(b.max.z / cs); iz++) {
            const k = this.key(ix, iz), arr = this.grid.get(k);
            if (!arr) continue;
            const kept = arr.filter((x) => !gone.has(x));
            if (kept.length) this.grid.set(k, kept); else this.grid.delete(k);
          }
      }
      this.boxes = this.boxes.filter((b) => !gone.has(b));
    }

    addHeightfield(hf) { hf.kind = hf.kind || 'solid'; this.heightfields.push(hf); return hf; }
    addTube(tube) { tube.hint = 0; this.tubes.push(tube); return tube; }

    candidates(minX, minZ, maxX, maxZ) {
      const cs = this.cell, st = ++this.stamp, out = this._cand;
      out.length = 0;
      const x0 = Math.floor(minX / cs), x1 = Math.floor(maxX / cs), z0 = Math.floor(minZ / cs), z1 = Math.floor(maxZ / cs);
      for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
        const arr = this.grid.get(this.key(ix, iz));
        if (!arr) continue;
        for (const b of arr) if (b._stamp !== st && b.active) { b._stamp = st; out.push(b); }
      }
      return out;
    }

    /* Segment p0 → p0+d contre OBB gonflée de r. Retourne t ∈ [0,1] et la normale, ou null. */
    static segBox(b, p0, d, r, out) {
      const rx = p0.x - b.c.x, ry = p0.y - b.c.y, rz = p0.z - b.c.z;
      const o0 = rx * b.ux.x + ry * b.ux.y + rz * b.ux.z, o1 = rx * b.uy.x + ry * b.uy.y + rz * b.uy.z, o2 = rx * b.uz.x + ry * b.uz.y + rz * b.uz.z;
      const v0 = d.x * b.ux.x + d.y * b.ux.y + d.z * b.ux.z, v1 = d.x * b.uy.x + d.y * b.uy.y + d.z * b.uy.z, v2 = d.x * b.uz.x + d.y * b.uz.y + d.z * b.uz.z;
      const o = [o0, o1, o2], v = [v0, v1, v2], h = [b.hx + r, b.hy + r, b.hz + r];
      let tmin = 0, tmax = 1, axis = -1, sign = 0;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(v[i]) < 1e-9) { if (Math.abs(o[i]) > h[i]) return null; continue; }
        let t1 = (-h[i] - o[i]) / v[i], t2 = (h[i] - o[i]) / v[i], s = -1;
        if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
        if (t1 > tmin) { tmin = t1; axis = i; sign = s; }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return null;
      }
      const ax = [b.ux, b.uy, b.uz];
      if (axis === -1) {   // départ à l'intérieur : normale de pénétration minimale
        let best = 0, bp = Infinity;
        for (let i = 0; i < 3; i++) { const pen = h[i] - Math.abs(o[i]); if (pen < bp) { bp = pen; best = i; } }
        out.t = 0; out.normal.copy(ax[best]).multiplyScalar(o[best] >= 0 ? 1 : -1); out.inside = true; out.pen = bp;
        return out;
      }
      out.t = tmin; out.normal.copy(ax[axis]).multiplyScalar(sign); out.inside = false; out.pen = 0;
      return out;
    }

    /* Balayage d'une sphère de rayon r de p0 à p1. Retourne le premier contact {t, normal, box|hf|tube, kind}. */
    // v030 : le résultat est un objet réutilisé, valable jusqu'au balayage suivant (les appelants le lisent aussitôt)
    sweep(p0, p1, r, filter) {
      const d = _d.subVectors(p1, p0);
      let best = null;
      const tmp = this._tmp || (this._tmp = { t: 0, normal: new V(), inside: false, pen: 0 });
      const res = this._res || (this._res = { t: 0, normal: new V(), box: null, kind: null, inside: false, pen: 0, hf: null, tube: null, ground: false });
      const cands = this.candidates(Math.min(p0.x, p1.x) - r, Math.min(p0.z, p1.z) - r, Math.max(p0.x, p1.x) + r, Math.max(p0.z, p1.z) + r);
      const minY = Math.min(p0.y, p1.y) - r, maxY = Math.max(p0.y, p1.y) + r;
      for (const b of cands) {
        if (b.max.y < minY || b.min.y > maxY) continue;
        if (filter && !filter(b)) continue;
        if (World.segBox(b, p0, d, r, tmp) && (!best || tmp.t < best.t)) {
          best = res; res.t = tmp.t; res.normal.copy(tmp.normal); res.box = b; res.kind = b.kind; res.inside = tmp.inside; res.pen = tmp.pen;
          res.hf = null; res.tube = null; res.ground = undefined;
        }
      }
      for (const hf of this.heightfields) if (this.sweepHeightfield(hf, p0, d, r, best ? best.t : Infinity, res)) best = res;
      for (const tb of this.tubes) if (this.sweepTube(tb, p0, d, r, best ? best.t : Infinity, res)) best = res;
      return best;
    }

    // ---------- Terrain ----------
    heightAt(hf, x, z) {
      const fx = (x - hf.x0) / hf.step, fz = (z - hf.z0) / hf.step;
      if (fx < 0 || fz < 0 || fx >= hf.n - 1 || fz >= hf.n - 1) return -Infinity;
      const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz, n = hf.n, H = hf.h;
      const a = H[iz * n + ix], b = H[iz * n + ix + 1], c = H[(iz + 1) * n + ix], dd = H[(iz + 1) * n + ix + 1];
      return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + dd * tx) * tz;
    }
    normalAt(hf, x, z, out) {
      const e = hf.step * 0.5;
      const hl = this.heightAt(hf, x - e, z), hr = this.heightAt(hf, x + e, z), hd = this.heightAt(hf, x, z - e), hu = this.heightAt(hf, x, z + e);
      return out.set(hl - hr, 2 * e, hd - hu).normalize();
    }
    // v030 : écrit le contact dans `out` s'il est plus proche que `bestT` (retourne vrai), sans rien allouer
    sweepHeightfield(hf, p0, d, r, bestT, out) {
      const len = d.length();
      const steps = Math.max(1, Math.ceil(len / 0.4));
      const p = _p;
      let prevT = 0;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        p.copy(p0).addScaledVector(d, t);
        const h = this.heightAt(hf, p.x, p.z);
        if (h === -Infinity) { prevT = t; continue; }
        if (p.y - r <= h) {
          let lo = prevT, hi = t;
          if (i > 0) for (let k = 0; k < 8; k++) {
            const m = (lo + hi) / 2; p.copy(p0).addScaledVector(d, m);
            if (p.y - r <= this.heightAt(hf, p.x, p.z)) hi = m; else lo = m;
          }
          p.copy(p0).addScaledVector(d, hi);
          const t0 = i === 0 ? 0 : lo;
          if (t0 >= bestT) return false;
          this.normalAt(hf, p.x, p.z, out.normal);
          out.t = t0; out.hf = hf; out.box = null; out.tube = null; out.kind = hf.kind; out.inside = i === 0; out.pen = i === 0 ? (h - (p.y - r)) : 0; out.ground = true;
          return true;
        }
        prevT = t;
      }
      return false;
    }

    // ---------- Tunnel (grotte) ----------
    tubeLocal(tb, p) {
      const S = tb.samples;
      let lo = Math.max(0, tb.hint - 40), hi = Math.min(S.length - 1, tb.hint + 40), best = -1, bd = Infinity;
      for (let i = lo; i <= hi; i++) { const d2 = S[i].p.distanceToSquared(p); if (d2 < bd) { bd = d2; best = i; } }
      if (bd > 900) { for (let i = 0; i < S.length; i++) { const d2 = S[i].p.distanceToSquared(p); if (d2 < bd) { bd = d2; best = i; } } }
      tb.hint = best;
      const s = S[best];
      const rel = _rel.subVectors(p, s.p);
      const along = rel.dot(s.t);
      const x = rel.dot(s.n), y = rel.dot(s.b);
      const ang = Math.atan2(y, x);
      const dist = Math.sqrt(x * x + y * y);
      const R = tb.radiusAt(best + along / tb.spacing, ang);
      // v030 : objet réutilisé (valable jusqu'à l'appel suivant)
      const L = this._L || (this._L = {});
      L.i = best; L.along = along; L.dist = dist; L.ang = ang; L.R = R; L.x = x; L.y = y; L.s = s;
      return L;
    }
    tubeInside(tb, p0, d, r, t) {
      _p.copy(p0).addScaledVector(d, t);
      const L = this.tubeLocal(tb, _p);
      return L.dist <= L.R - r || L.i === 0 && L.along < 0 || L.i === tb.samples.length - 1 && L.along > 0;
    }
    sweepTube(tb, p0, d, r, bestT, out) {
      if (this.tubeInside(tb, p0, d, r, 1)) return false;
      const ok0 = this.tubeInside(tb, p0, d, r, 0);
      let lo = 0, hi = 1;
      if (!ok0) hi = 0;
      else for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (this.tubeInside(tb, p0, d, r, m)) lo = m; else hi = m; }
      if (lo >= bestT) return false;
      this.tubeInside(tb, p0, d, r, hi);
      const L = this._L;
      const n = out.normal.set(0, 0, 0).addScaledVector(L.s.n, -L.x).addScaledVector(L.s.b, -L.y).normalize();
      out.t = lo; out.tube = tb; out.hf = null; out.box = null; out.kind = 'solid'; out.inside = !ok0; out.pen = Math.max(0, L.dist - (L.R - r)); out.ground = n.y > 0.6;
      return true;
    }

    /* Distance à la surface la plus proche (murs et sol séparés) dans un rayon maxD. */
    nearest(p, maxD, out) {
      out.wall = Infinity; out.ground = Infinity; out.wallNormal = out.wallNormal || new V(); out.wallBox = null;
      const cands = this.candidates(p.x - maxD, p.z - maxD, p.x + maxD, p.z + maxD);
      for (const b of cands) {
        if (b.kind === 'target' || b.kind === 'noCollide') continue;
        if (b.max.y < p.y - maxD || b.min.y > p.y + maxD) continue;
        const rx = p.x - b.c.x, ry = p.y - b.c.y, rz = p.z - b.c.z;
        const o0 = rx * b.ux.x + ry * b.ux.y + rz * b.ux.z, o1 = rx * b.uy.x + ry * b.uy.y + rz * b.uy.z, o2 = rx * b.uz.x + ry * b.uz.y + rz * b.uz.z;
        const q0 = Math.abs(o0) - b.hx, q1 = Math.abs(o1) - b.hy, q2 = Math.abs(o2) - b.hz;
        const dist = Math.sqrt(Math.max(q0, 0) ** 2 + Math.max(q1, 0) ** 2 + Math.max(q2, 0) ** 2) + Math.min(Math.max(q0, q1, q2), 0);
        if (dist > maxD) continue;
        // normale approximative : axe dominant
        let nx = 0, ny = 0, nz = 0;
        if (q1 >= q0 && q1 >= q2) { ny = Math.sign(o1); } else if (q0 >= q2) { nx = Math.sign(o0); } else { nz = Math.sign(o2); }
        const wn = _n.set(0, 0, 0).addScaledVector(b.ux, nx).addScaledVector(b.uy, ny).addScaledVector(b.uz, nz);
        if (wn.y > 0.7 || b.ground) { if (dist < out.ground) out.ground = dist; }
        else if (dist < out.wall) { out.wall = dist; out.wallNormal.copy(wn); out.wallBox = b; }
      }
      for (const hf of this.heightfields) {
        const h = this.heightAt(hf, p.x, p.z);
        if (h === -Infinity) continue;
        const n = this.normalAt(hf, p.x, p.z, _n);
        const dist = (p.y - h) * n.y;
        if (n.y > 0.8) { if (dist < out.ground) out.ground = dist; }
        else if (dist < out.wall) { out.wall = dist; out.wallNormal.copy(n); }
      }
      for (const tb of this.tubes) {
        const L = this.tubeLocal(tb, p);
        const dist = L.R - L.dist;
        const n = _n.set(0, 0, 0).addScaledVector(L.s.n, -L.x).addScaledVector(L.s.b, -L.y).normalize();
        if (n.y > 0.6) { if (dist < out.ground) out.ground = dist; }
        else if (dist < out.wall) { out.wall = dist; out.wallNormal.copy(n); }
      }
      return out;
    }

    // v030 : « la ligne de vue est-elle coupée ? » sans rien allouer (tirs anti-aériens : chaque tireur, chaque image)
    blocked(o, dir, len, filter) {
      return !!this.sweep(o, _rel.copy(o).addScaledVector(dir, len), 0.02, filter);
    }
    raycast(o, dir, len, filter) {
      const p1 = _rel.copy(o).addScaledVector(dir, len);
      const hit = this.sweep(o, p1, 0.02, filter);
      if (!hit) return null;
      // résultat propre à l'appel (les appelants gardent parfois `point`) ; un rayon sans contact n'alloue rien
      const dist = hit.t * len;
      return { t: hit.t, normal: hit.normal.clone(), box: hit.box, kind: hit.kind, inside: hit.inside, pen: hit.pen, hf: hit.hf, tube: hit.tube, ground: hit.ground, dist, point: new V().copy(o).addScaledVector(dir, dist) };
    }
  }

  CC.World = World;
})();

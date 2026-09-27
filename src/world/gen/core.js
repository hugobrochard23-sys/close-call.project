/* Générateur de missions (v032) — noyau.
 * Chaîne : graine → flux aléatoires déterministes (un par couche) → plan de mission (donnée pure, aucun objet THREE)
 *          → validation → construction par le LevelBuilder (src/world/gen/kit.js).
 * Le plan n'est jamais sauvegardé : seule la graine (+ difficulté) suffit à le recréer à l'identique.
 * Ce fichier : graines, flux aléatoires, registres extensibles, géométrie légère (emprises 2D, boîtes 3D, index spatial). */
(function () {
  const U = CC.U;
  const G = CC.Gen = CC.Gen || {};
  G.VERSION = 1;                         // change si l'algorithme change (une graine partagée ne donne la même carte qu'à version égale)

  // ---------- graines ----------
  G.fmix = (h) => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
  G.hashStr = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return G.fmix(h); };
  G.mix = (seed, tag) => G.fmix(((seed >>> 0) ^ G.hashStr(String(tag))) + 0x9e3779b9);
  const SEED_MIN = 10000000, SEED_SPAN = 990000000;   // graines affichées sur 8 ou 9 chiffres : faciles à recopier
  G.randomSeed = () => SEED_MIN + Math.floor(Math.random() * SEED_SPAN);
  // Texte saisi → graine : un nombre est gardé tel quel (borné à 32 bits), un mot est haché (« BOSS » est une graine valide).
  G.parseSeed = (txt) => {
    const s = String(txt === undefined || txt === null ? '' : txt).trim();
    if (!s) return null;
    if (/^\d{1,10}$/.test(s)) return Number(s) % 4294967296;
    return SEED_MIN + (G.hashStr(s.toUpperCase()) % SEED_SPAN);
  };
  // Carte du jour : même graine pour tous les joueurs à une date donnée (heure locale), difficulté fixe.
  G.daily = (date) => {
    const d = date || new Date();
    const p2 = (n) => String(n).padStart(2, '0');
    const ymd = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
    return { id: ymd, label: p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear(), seed: SEED_MIN + (G.hashStr('cold-impact-daily-' + ymd) % SEED_SPAN), difficulty: 'hard' };
  };
  // v033 : mode DÉFI — carte n (1…CC.CONFIG.challenge.maps) d'une difficulté : même graine pour tous les joueurs
  G.challengeSeed = (diff, n) => SEED_MIN + (G.hashStr('cold-impact-defi-' + diff + '-' + n) % SEED_SPAN);

  // Flux aléatoire propre à une couche : changer le décor ne déplace pas les bâtiments, et inversement.
  G.stream = (seed, tag) => {
    const r = U.makeRng(G.mix(seed, tag));
    r.chance = (p) => r() < p;
    r.jitter = (v, f) => v * (1 + (r() * 2 - 1) * f);
    r.between = (ab) => ab[0] + (ab[1] - ab[0]) * r();
    r.intIn = (ab) => r.int(ab[0], ab[1]);
    r.weighted = (w) => {                 // { clé: poids } ou [[clé, poids]]
      const e = Array.isArray(w) ? w : Object.entries(w);
      let t = 0; for (const [, p] of e) t += Math.max(0, p);
      let x = r() * t;
      for (const [k, p] of e) { x -= Math.max(0, p); if (x <= 0) return k; }
      return e[e.length - 1][0];
    };
    r.shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    return r;
  };

  // ---------- registres extensibles ----------
  // Ajouter un biome, un gabarit de zone, un type d'objet, une cible ou une difficulté = une entrée de registre de plus.
  G.registry = (name) => {
    const map = new Map();
    const reg = {
      add(id, def) { def.id = id; map.set(id, def); return def; },
      get(id) { return map.get(id); },
      has(id) { return map.has(id); },
      all() { return [...map.values()]; },
      ids() { return [...map.keys()]; },
    };
    G[name] = reg;
    return reg;
  };
  G.registry('Difficulties');   // profils de difficulté (profiles.js)
  G.registry('Biomes');         // familles de cartes (biomes.js)
  G.registry('Envs');           // ambiances lumineuses (biomes.js)
  G.registry('Templates');      // gabarits de zone : grammaire de composition (templates.js)
  G.registry('Items');          // types d'objets du plan : emprise physique (templates.js) ; rendu dans kit.js
  G.registry('Setups');         // mises en situation de la cible (mission.js)
  G.registry('TargetKinds');    // types de cible (mission.js)

  // ---------- géométrie 2D : emprises orientées (lacet en radians, 0 = aligné sur les axes) ----------
  G.obb = (x, z, w, d, yaw) => { const c = Math.cos(yaw || 0), s = Math.sin(yaw || 0); return { x, z, hw: w / 2, hd: d / 2, yaw: yaw || 0, c, s }; };
  // Axes locaux : ux = (c, -s), uz = (s, c) (même convention que THREE : rotation autour de Y)
  G.obbAabb = (o, m) => {
    m = m || 0;
    const ex = Math.abs(o.c) * o.hw + Math.abs(o.s) * o.hd + m, ez = Math.abs(o.s) * o.hw + Math.abs(o.c) * o.hd + m;
    return [o.x - ex, o.z - ez, o.x + ex, o.z + ez];
  };
  G.pointInObb = (px, pz, o, m) => {
    const dx = px - o.x, dz = pz - o.z, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
    return Math.abs(lx) <= o.hw + (m || 0) && Math.abs(lz) <= o.hd + (m || 0);
  };
  // Distance d'un point à une emprise (0 à l'intérieur)
  G.distToObb = (px, pz, o) => {
    const dx = px - o.x, dz = pz - o.z, lx = Math.abs(dx * o.c - dz * o.s) - o.hw, lz = Math.abs(dx * o.s + dz * o.c) - o.hd;
    return Math.hypot(Math.max(lx, 0), Math.max(lz, 0));
  };
  // Chevauchement de deux emprises (axes séparateurs), avec marge
  G.obbOverlap = (a, b, m) => {
    m = m || 0;
    const axes = [[a.c, -a.s], [a.s, a.c], [b.c, -b.s], [b.s, b.c]];
    const dx = b.x - a.x, dz = b.z - a.z;
    for (const [ax, az] of axes) {
      const ra = a.hw * Math.abs(a.c * ax - a.s * az) + a.hd * Math.abs(a.s * ax + a.c * az);
      const rb = b.hw * Math.abs(b.c * ax - b.s * az) + b.hd * Math.abs(b.s * ax + b.c * az);
      if (Math.abs(dx * ax + dz * az) > ra + rb + m) return false;
    }
    return true;
  };
  // Point du repère local d'une emprise → monde
  G.local = (o, lx, lz) => [o.x + lx * o.c + lz * o.s, o.z - lx * o.s + lz * o.c];

  /* Index spatial 2D (grille de hachage) pour les emprises : placement sans chevauchement en temps quasi constant. */
  class Space {
    constructor(cell) { this.cell = cell || 24; this.map = new Map(); this.list = []; this.stamp = 0; }
    key(i, j) { return i * 73856093 ^ j * 19349663; }
    add(o, tag, ref) {
      const e = { o, tag, ref, bb: G.obbAabb(o), st: 0 };
      this.list.push(e);
      const cs = this.cell;
      for (let i = Math.floor(e.bb[0] / cs); i <= Math.floor(e.bb[2] / cs); i++)
        for (let j = Math.floor(e.bb[1] / cs); j <= Math.floor(e.bb[3] / cs); j++) {
          const k = this.key(i, j); let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); } a.push(e);
        }
      return e;
    }
    // Premier élément qui chevauche `o` (marge m) ; `accept(tag)` filtre les étiquettes à considérer
    hit(o, m, accept) {
      const bb = G.obbAabb(o, m), cs = this.cell, st = ++this.stamp;
      for (let i = Math.floor(bb[0] / cs); i <= Math.floor(bb[2] / cs); i++)
        for (let j = Math.floor(bb[1] / cs); j <= Math.floor(bb[3] / cs); j++) {
          const a = this.map.get(this.key(i, j)); if (!a) continue;
          for (const e of a) {
            if (e.st === st) continue; e.st = st;
            if (accept && !accept(e.tag)) continue;
            if (e.bb[0] > bb[2] || e.bb[2] < bb[0] || e.bb[1] > bb[3] || e.bb[3] < bb[1]) continue;
            if (G.obbOverlap(o, e.o, m)) return e;
          }
        }
      return null;
    }
    free(o, m, accept) { return !this.hit(o, m, accept); }
    // Distance au plus proche élément (bornée à maxD)
    nearest(px, pz, maxD, accept) {
      const cs = this.cell, st = ++this.stamp;
      let best = maxD;
      for (let i = Math.floor((px - maxD) / cs); i <= Math.floor((px + maxD) / cs); i++)
        for (let j = Math.floor((pz - maxD) / cs); j <= Math.floor((pz + maxD) / cs); j++) {
          const a = this.map.get(this.key(i, j)); if (!a) continue;
          for (const e of a) {
            if (e.st === st) continue; e.st = st;
            if (accept && !accept(e.tag)) continue;
            const d = G.distToObb(px, pz, e.o);
            if (d < best) best = d;
          }
        }
      return best;
    }
  }
  G.Space = Space;

  // ---------- géométrie 3D : boîtes de collision du plan (centre, taille, lacet) ----------
  // s = { x, y, z, w, h, d, yaw, kind } ; kind : 'solid' | 'glass' | 'brick' (cassables, traversables) | 'cable' | 'hazard'
  G.passable = (s) => s.kind === 'glass' || s.kind === 'brick';
  // Distance d'un point à une boîte (négative à l'intérieur)
  G.distToSolid = (px, py, pz, s) => {
    const c = Math.cos(s.yaw || 0), sn = Math.sin(s.yaw || 0), dx = px - s.x, dz = pz - s.z;
    const qx = Math.abs(dx * c - dz * sn) - s.w / 2, qy = Math.abs(py - s.y) - s.h / 2, qz = Math.abs(dx * sn + dz * c) - s.d / 2;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
  };
  // Le segment p0→p1, épaissi du rayon r, touche-t-il la boîte ? (boîte agrandie de r : test prudent)
  G.segHitsSolid = (p0, p1, r, s) => {
    const c = Math.cos(s.yaw || 0), sn = Math.sin(s.yaw || 0);
    const ax = p0[0] - s.x, az = p0[2] - s.z, bx = p1[0] - s.x, bz = p1[2] - s.z;
    const o = [ax * c - az * sn, p0[1] - s.y, ax * sn + az * c], e = [bx * c - bz * sn, p1[1] - s.y, bx * sn + bz * c];
    const h = [s.w / 2 + r, s.h / 2 + r, s.d / 2 + r];
    let t0 = 0, t1 = 1;
    for (let k = 0; k < 3; k++) {
      const dk = e[k] - o[k];
      if (Math.abs(dk) < 1e-9) { if (Math.abs(o[k]) > h[k]) return false; continue; }
      let ta = (-h[k] - o[k]) / dk, tb = (h[k] - o[k]) / dk;
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return false;
    }
    return true;
  };
  G.solidAabb = (s) => {
    const c = Math.abs(Math.cos(s.yaw || 0)), sn = Math.abs(Math.sin(s.yaw || 0));
    const ex = c * s.w / 2 + sn * s.d / 2, ez = sn * s.w / 2 + c * s.d / 2;
    return [s.x - ex, s.y - s.h / 2, s.z - ez, s.x + ex, s.y + s.h / 2, s.z + ez];
  };

  /* Index des boîtes 3D (grille XZ) : requêtes de segment et de distance pour la validation et l'analyse. */
  class SolidIndex {
    constructor(solids, cell) {
      this.cell = cell || 16; this.map = new Map(); this.solids = solids; this.stamp = 0;
      for (const s of solids) {
        s._bb = G.solidAabb(s); s._st = 0;
        for (let i = Math.floor(s._bb[0] / this.cell); i <= Math.floor(s._bb[3] / this.cell); i++)
          for (let j = Math.floor(s._bb[2] / this.cell); j <= Math.floor(s._bb[5] / this.cell); j++) {
            const k = i * 73856093 ^ j * 19349663; let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); } a.push(s);
          }
      }
    }
    each(x0, z0, x1, z1, fn) {
      const cs = this.cell, st = ++this.stamp;
      for (let i = Math.floor(Math.min(x0, x1) / cs); i <= Math.floor(Math.max(x0, x1) / cs); i++)
        for (let j = Math.floor(Math.min(z0, z1) / cs); j <= Math.floor(Math.max(z0, z1) / cs); j++) {
          const a = this.map.get(i * 73856093 ^ j * 19349663); if (!a) continue;
          for (const s of a) { if (s._st === st) continue; s._st = st; if (fn(s) === false) return; }
        }
    }
    // Première boîte non traversable touchée par le segment épaissi (ou null)
    segHit(p0, p1, r, skip) {
      let hit = null;
      this.each(p0[0] - r, p0[2] - r, p1[0] + r, p1[2] + r, (s) => {
        if (G.passable(s) || (skip && skip(s))) return;
        if (s._bb[1] > Math.max(p0[1], p1[1]) + r || s._bb[4] < Math.min(p0[1], p1[1]) - r) return;
        if (G.segHitsSolid(p0, p1, r, s)) { hit = s; return false; }
      });
      return hit;
    }
    // Distance à la boîte la plus proche (bornée à maxD)
    dist(px, py, pz, maxD, skip) {
      let best = maxD;
      this.each(px - maxD, pz - maxD, px + maxD, pz + maxD, (s) => {
        if (G.passable(s) || (skip && skip(s))) return;
        if (s._bb[1] > py + best || s._bb[4] < py - best) return;
        const d = G.distToSolid(px, py, pz, s);
        if (d < best) best = d;
      });
      return best;
    }
  }
  G.SolidIndex = SolidIndex;

  /* Le segment a→b reste-t-il à plus de r mètres au-dessus du relief (et de l'eau) ? Échantillons tous les 2 m.
   * (Les boîtes du plan ne contiennent pas le terrain : les vérifications exactes doivent aussi tester celui-ci.) */
  G.terrainClear = (plan, a, b, r) => {
    const T = plan.terrain;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(L / 2));
    const floor = plan.coast ? -2.2 : 0;
    for (let i = 0; i <= n; i++) {
      const k = i / n, x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, z = a[2] + (b[2] - a[2]) * k;
      const g = T && T.H ? G.heightAt(plan, x, z) : floor;
      if (y - Math.max(g, floor) < r) return false;
    }
    return true;
  };

  // ---------- petites aides ----------
  G.lerp = U.lerp; G.clamp = U.clamp;
  G.dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  G.dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  G.polyLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += G.dist3(pts[i - 1], pts[i]); return L; };
  G.round = (v, k) => { const f = Math.pow(10, k === undefined ? 2 : k); return Math.round(v * f) / f; };
  G.now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
})();

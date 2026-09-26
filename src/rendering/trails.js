/* Traînées de la roquette (CHOIX v026, Hugo) :
 *  - une ligne fine par aileron, partie du bout de l'aileron : blanche en vol, jaune puis rouge en fin de traînée pendant le boost ;
 *  - pendant le boost, des filets d'air naissent à la pointe du nez et glissent vers l'arrière en s'effaçant.
 * Rubans fins d'épaisseur constante à l'écran, semi-transparents, et effacées près de la caméra (placée juste derrière la roquette) : elles ne
 * doivent jamais masquer la vue du joueur. Réglages : CC.CONFIG.trails.
 * Hasard purement visuel tiré de Math.random : ne décale pas le générateur U.rng (banc de test reproductible). */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;
  const _a = new V(), _b = new V(), _r = new V(), _u = new V(), _up = new V(0, 1, 0), _x = new V(1, 0, 0);
  const _v = new V(), _s = new V(), _d = new V();
  const WHITE = new THREE.Color('#ffffff'), YELLOW = new THREE.Color('#ffd21f'), RED = new THREE.Color('#ff3a1a'), _c = new THREE.Color();

  // Ruban face caméra (2 sommets par point), couleur et alpha par sommet. quads = true : paires de points indépendantes
  // (filets d'air) ; sinon une bande continue (traînée d'aileron).
  function ribbon(nPts, quads) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(nPts * 2 * 3), col = new Float32Array(nPts * 2 * 4), idx = [];
    for (let i = 0; i < nPts - 1; i++) {
      if (quads && i % 2) continue;
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));   // 4 composantes : alpha par sommet
    g.setDrawRange(0, 0);
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const o = new THREE.Mesh(g, m);
    o.frustumCulled = false; o.renderOrder = 2;
    return { o, pos, col, g, n: 0, quads };
  }
  // ajoute le point p (direction locale du ruban : dir) ; largeur en fraction de la hauteur d'écran, donc constante à l'écran
  function put(R, p, dir, camera, widthFrac, color, alpha) {
    _v.subVectors(camera.position, p);
    const half = _v.length() * Math.tan(camera.fov * Math.PI / 360) * widthFrac;
    _s.crossVectors(dir, _v).normalize().multiplyScalar(half);
    const i = R.n * 2;
    for (let k = 0; k < 2; k++) {
      const sg = k ? -1 : 1, j = i + k;
      R.pos[j * 3] = p.x + _s.x * sg; R.pos[j * 3 + 1] = p.y + _s.y * sg; R.pos[j * 3 + 2] = p.z + _s.z * sg;
      R.col[j * 4] = color.r; R.col[j * 4 + 1] = color.g; R.col[j * 4 + 2] = color.b; R.col[j * 4 + 3] = alpha;
    }
    R.n++;
  }
  function finish(R) {
    const segs = R.quads ? R.n / 2 : Math.max(0, R.n - 1);
    R.g.setDrawRange(0, segs * 6);
    R.g.attributes.position.needsUpdate = true; R.g.attributes.color.needsUpdate = true;
  }

  class Trails {
    constructor(game) {
      this.game = game; this.cfg = CC.CONFIG.trails;
      this.group = new THREE.Group();
      game.scene.add(this.group);
      this.fins = [];        // une traînée par aileron : { line, pts: [{ p, t, boost }] }
      this.streaks = [];     // filets d'air du nez
      const n = this.cfg.streaks;
      this.air = ribbon(n * 2, true);
      this.group.add(this.air.o);
      for (let i = 0; i < n; i++) this.streaks.push({ u: 1 + Math.random(), ang: 0, speed: 1, len: 0.3, rad: 0 });
      this.boost = 0;        // 0 → 1, lissé : intensité des effets de boost
      this.time = 0;
    }

    clear() {
      for (const f of this.fins) { f.pts.length = 0; f.line.g.setDrawRange(0, 0); }
      for (const s of this.streaks) s.u = 1 + Math.random();
      this.air.g.setDrawRange(0, 0);
      this.boost = 0;
    }

    // autant de traînées que d'ailerons sur le cosmétique équipé
    ensureFins(count) {
      while (this.fins.length < count) {
        const line = ribbon(this.cfg.maxPoints + 1, false);
        this.group.add(line.o);
        this.fins.push({ line, pts: [] });
      }
      for (let i = 0; i < this.fins.length; i++) this.fins[i].line.o.visible = i < count;
    }

    update(dt, rocket, camera) {
      const cfg = this.cfg;
      this.time += dt;
      const flying = rocket.active;
      if (flying && !this.wasActive) this.clear();   // nouveau tir : pas de ligne tendue depuis l'ancienne position
      this.wasActive = flying;
      const boosting = flying && rocket.thrusting;
      this.boost += ((boosting ? 1 : 0) - this.boost) * U.damp(boosting ? cfg.boostIn : cfg.boostOut, dt);
      const tips = flying ? rocket.finTips() : null;
      this.ensureFins(tips ? tips.length : this.fins.length);
      for (let i = 0; i < this.fins.length; i++) this.updateFin(this.fins[i], tips && tips[i], boosting, camera, rocket.fwd);
      this.updateAir(dt, rocket, camera);
    }

    // alpha réduit près de la caméra : la traînée passe à côté de l'objectif sans voiler l'écran
    camFade(p, camera) {
      const d = p.distanceTo(camera.position);
      return U.smooth(this.cfg.camFadeNear, this.cfg.camFadeFar, d);
    }

    updateFin(f, tip, boosting, camera, rocketFwd) {
      const cfg = this.cfg, now = this.time;
      // un point tous les minStep mètres (ou toutes les minDt s), le plus ancien disparaît après sa durée de vie
      if (tip) {
        const last = f.pts[0];
        if (!last || last.p.distanceToSquared(tip) > cfg.minStep * cfg.minStep || now - last.t > cfg.minDt) {
          f.pts.unshift({ p: tip.clone(), t: now, boost: boosting });
          if (f.pts.length > cfg.maxPoints) f.pts.length = cfg.maxPoints;
        }
      }
      while (f.pts.length && now - f.pts[f.pts.length - 1].t > cfg.life) f.pts.pop();
      const L = f.line;
      L.n = 0;
      const all = tip ? [{ p: tip, t: now, boost: boosting }].concat(f.pts) : f.pts;   // la ligne part toujours du bout de l'aileron
      for (let i = 0; i < all.length; i++) {
        const q = all[i], k = U.clamp((now - q.t) / cfg.life, 0, 1);
        const pa = all[Math.max(0, i - 1)].p, pb = all[Math.min(all.length - 1, i + 1)].p;
        _d.subVectors(pa, pb); if (_d.lengthSq() < 1e-8) _d.copy(rocketFwd);
        if (q.boost) _c.copy(YELLOW).lerp(RED, Math.min(1, k * 1.6)); else _c.copy(WHITE);
        const alpha = (q.boost ? cfg.alphaBoost : cfg.alpha) * (1 - k) * this.camFade(q.p, camera);
        put(L, q.p, _d.normalize(), camera, (q.boost ? cfg.widthBoost : cfg.width) * (1 - 0.5 * k), _c, alpha);
      }
      finish(L);
    }

    updateAir(dt, rocket, camera) {
      const cfg = this.cfg, A = this.air;
      A.n = 0;
      if (!rocket.active || this.boost < 0.01) { A.g.setDrawRange(0, 0); return; }
      const fwd = rocket.fwd;
      // repère autour de l'axe de la roquette (le roulis n'a pas d'importance : filets répartis au hasard)
      _r.crossVectors(fwd, Math.abs(fwd.y) > 0.95 ? _x : _up).normalize();
      _u.crossVectors(_r, fwd).normalize();
      const nose = rocket.noseTip(_a);
      for (const s of this.streaks) {
        s.u += dt * s.speed;
        if (s.u >= 1) {
          if (!(rocket.thrusting)) continue;           // boost coupé : les filets en cours finissent, sans renouvellement
          s.u -= Math.floor(s.u); s.ang = Math.random() * Math.PI * 2;
          s.speed = cfg.airSpeed * (0.7 + Math.random() * 0.6); s.len = cfg.airLen * (0.6 + Math.random() * 0.8);
          s.rad = 0.6 + Math.random() * 0.8;
        }
        const back = s.u * cfg.airTravel;                 // distance parcourue depuis la pointe, vers l'arrière
        const ca = Math.cos(s.ang), sa = Math.sin(s.ang);
        const alpha = Math.sin(Math.PI * s.u) * cfg.airAlpha * this.boost;   // apparaît au nez, s'efface vers l'arrière
        for (let e = 0; e < 2; e++) {
          const d = back + e * s.len, rr = (cfg.airR0 + d * cfg.airSpread) * s.rad;
          const p = _b.copy(nose).addScaledVector(fwd, -d).addScaledVector(_r, ca * rr).addScaledVector(_u, sa * rr);
          put(A, p, fwd, camera, cfg.airWidth, WHITE, alpha * (e ? 0 : 1) * this.camFade(p, camera));   // queue transparente : trait effilé
        }
      }
      finish(A);
    }
  }

  CC.Trails = Trails;
})();

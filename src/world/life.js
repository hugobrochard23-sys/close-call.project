/* v036 : MONDE VIVANT — tout ce qui bouge dans le décor du mode CLASSIQUE, et son bruit.
 *
 *  Fleet    une FLOTTE d'objets identiques (voitures, trains, bateaux, avions, oiseaux, poissons…) : un seul InstancedMesh (2 appels de dessin)
 *           quelle que soit la taille de la flotte ; chaque instance suit son chemin (le long du couloir, en travers, en orbite), entre en
 *           fondu et sort en fondu ; un son est joué quand elle passe près de la roquette (train, klaxon, corne de navire…).
 *  Sweeper  un OBSTACLE mobile qui tue au contact (conteneur suspendu à une grue, presse, bras robotisé, boule de démolition, baleine…) :
 *           il bouge selon un motif lisible (balancier, va-et-vient, piston, orbite) ; le danger se voit avant qu'on l'atteigne.
 *  Motes    des particules d'ambiance (bulles, lucioles, étincelles, poussière) : un seul objet `Points`.
 * Les objets sont des entités du tronçon : ils sont détruits avec lui. Rien ici n'a d'effet sur le hasard du gameplay (U.fx seulement). */
(function () {
  const V = THREE.Vector3, U = CC.U, DEG = 180 / Math.PI;
  const L = CC.Life = { models: {} };

  // ---------- modèles : listes de boîtes [x, y, z, largeur, hauteur, longueur, couleur, options] fusionnées en une géométrie ----------
  // l'avant est vers −z (le sens de la roquette) ; options : { glow: true (éclairage propre), rx, ry, rz }
  function buildGeo(parts) {
    const S = { p: [], n: [], c: [] }, Gl = { p: [], n: [], c: [] }, m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new V(1, 1, 1);
    for (const pt of parts) {
      const o = pt[7] || {}, g = new THREE.BoxGeometry(pt[3], pt[4], pt[5]).toNonIndexed();
      e.set(o.rx || 0, o.ry || 0, o.rz || 0); q.setFromEuler(e); m.compose(new V(pt[0], pt[1], pt[2]), q, one); g.applyMatrix4(m);
      const col = new THREE.Color(pt[6]), T = o.glow ? Gl : S, P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i++) { T.p.push(P.getX(i), P.getY(i), P.getZ(i)); T.n.push(N.getX(i), N.getY(i), N.getZ(i)); T.c.push(col.r, col.g, col.b); }
      g.dispose();
    }
    const mk = (T) => {
      if (!T.p.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(T.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(T.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(T.c, 3));
      g.computeBoundingSphere(); return g;
    };
    return { solid: mk(S), glow: mk(Gl) };
  }
  L.buildGeo = buildGeo;
  const cache = {};
  const geoOf = (name) => cache[name] || (cache[name] = buildGeo(L.models[name]()));
  let matSolid = null, matGlow = null;
  const mats = () => (matSolid ? [matSolid, matGlow] : (matSolid = new THREE.MeshLambertMaterial({ vertexColors: true }), matGlow = new THREE.MeshBasicMaterial({ vertexColors: true }), [matSolid, matGlow]));

  const W = '#ffffff', K = '#1c1e22', GL = '#1e2a38', LIT = '#fff4c8', RED = '#ff3020';
  // voiture (4,2 m) : carrosserie blanche (teintée par instance), vitres, roues, phares et feux arrière
  L.models.car = () => [[0, 0.62, 0, 1.8, 0.7, 4.2, W], [0, 1.22, 0.3, 1.6, 0.55, 2.2, W], [0, 1.25, 0.3, 1.64, 0.4, 2.0, GL], [-0.7, 0.3, -1.3, 0.3, 0.6, 0.6, K], [0.7, 0.3, -1.3, 0.3, 0.6, 0.6, K], [-0.7, 0.3, 1.3, 0.3, 0.6, 0.6, K], [0.7, 0.3, 1.3, 0.3, 0.6, 0.6, K],
    [-0.62, 0.72, -2.12, 0.4, 0.22, 0.06, LIT, { glow: true }], [0.62, 0.72, -2.12, 0.4, 0.22, 0.06, LIT, { glow: true }], [-0.62, 0.72, 2.12, 0.4, 0.18, 0.06, RED, { glow: true }], [0.62, 0.72, 2.12, 0.4, 0.18, 0.06, RED, { glow: true }]];
  L.models.bus = () => [[0, 1.7, 0, 2.5, 2.6, 11, W], [0, 2.1, 0, 2.54, 0.9, 10.4, GL], [0, 0.3, 0, 2.3, 0.6, 10.6, K], [-1.1, 0.4, -3.6, 0.3, 0.8, 0.9, K], [1.1, 0.4, -3.6, 0.3, 0.8, 0.9, K], [-1.1, 0.4, 3.6, 0.3, 0.8, 0.9, K], [1.1, 0.4, 3.6, 0.3, 0.8, 0.9, K], [0, 2.6, -5.52, 1.6, 0.4, 0.06, '#ffcc30', { glow: true }],
    [-0.9, 0.8, -5.52, 0.4, 0.24, 0.06, LIT, { glow: true }], [0.9, 0.8, -5.52, 0.4, 0.24, 0.06, LIT, { glow: true }]];
  L.models.van = () => [[0, 1.4, 0.6, 2.1, 2.2, 4.2, W], [0, 1.0, -2.0, 2.0, 1.4, 1.6, W], [0, 1.5, -2.45, 1.8, 0.7, 0.5, GL], [0, 0.3, 0, 2.0, 0.5, 6.4, K], [-0.9, 0.35, -2.0, 0.3, 0.7, 0.8, K], [0.9, 0.35, -2.0, 0.3, 0.7, 0.8, K], [-0.9, 0.35, 2.0, 0.3, 0.7, 0.8, K], [0.9, 0.35, 2.0, 0.3, 0.7, 0.8, K],
    [-0.7, 0.8, -2.82, 0.4, 0.22, 0.06, LIT, { glow: true }], [0.7, 0.8, -2.82, 0.4, 0.22, 0.06, LIT, { glow: true }]];
  // rame de métro / de train (une voiture de 14 m : on en accole plusieurs)
  L.models.trainCar = () => [[0, 2.4, 0, 3.3, 3.8, 14, W], [0, 3.3, 0, 3.36, 1.2, 13.2, GL], [0, 0.9, 0, 3.2, 0.5, 13, K], [0, 4.45, 0, 2.6, 0.3, 12, '#9aa0a8'], [0, 2.4, 0.05, 3.34, 0.12, 14.02, '#e8c020']];
  L.models.trainHead = () => L.models.trainCar().concat([[-0.9, 1.9, -7.04, 0.6, 0.4, 0.08, LIT, { glow: true }], [0.9, 1.9, -7.04, 0.6, 0.4, 0.08, LIT, { glow: true }], [0, 4.0, -7.04, 1.4, 0.3, 0.08, '#ff6030', { glow: true }]]);
  L.models.freight = () => [[0, 2.3, 0, 3.0, 3.2, 12.4, W], [0, 0.8, 0, 2.9, 0.5, 12, K], [0, 2.3, 0, 3.04, 0.2, 12.4, '#2a2a2e'], [-1.3, 0.5, -4.4, 0.2, 0.7, 1.4, K], [1.3, 0.5, -4.4, 0.2, 0.7, 1.4, K], [-1.3, 0.5, 4.4, 0.2, 0.7, 1.4, K], [1.3, 0.5, 4.4, 0.2, 0.7, 1.4, K]];
  L.models.container = () => [[0, 1.3, 0, 2.45, 2.58, 6.1, W], [0, 1.3, 0, 2.5, 0.16, 6.14, '#1a1a1a'], [0, 1.3, -3.06, 2.2, 2.3, 0.06, '#2a2a2e']];
  L.models.boat = () => [[0, 0.7, 0, 3.2, 1.4, 9, W], [0, 0.2, -4.6, 1.6, 1.0, 1.6, W, { ry: 0.5 }], [0, 2.0, 1.2, 2.2, 1.6, 3.4, '#f4f4ee'], [0, 3.6, 1.2, 0.2, 2.6, 0.2, K], [0, 1.6, -0.5, 2.2, 0.15, 0.3, GL]];
  L.models.sail = () => [[0, 0.5, 0, 2.2, 1.0, 6.5, W], [0, 4.4, -0.3, 0.12, 7.5, 0.12, '#dcdcdc'], [0.05, 4.2, 0.6, 0.06, 6, 3.6, '#f6f6f2'], [0.05, 3.4, -1.9, 0.06, 3.6, 1.8, '#f0f0ec']];
  L.models.ship = () => [[0, 4.5, 0, 22, 9, 110, W], [0, 10.2, 0, 21, 1.4, 108, '#6a6e74'], [0, 14, 36, 16, 10, 16, '#e8e8e4'], [0, 15, 36, 16.2, 1.4, 15.6, GL], [0, 20, 36, 12, 4, 10, '#e8e8e4'], [0, 18, 30, 5, 8, 5, '#b8382c'], [0, 12, -10, 18, 5, 70, '#8a6a4a']];
  L.models.jet = () => [[0, 0, 0, 1.5, 1.4, 14, W], [0, 0.55, -3.2, 0.9, 0.5, 3.4, GL], [0, -0.1, 1.5, 12, 0.22, 6.5, W], [0, 1.5, 5.2, 0.25, 2.8, 2.6, W], [0, 0.1, 6.2, 4.4, 0.2, 2.4, W], [0, 0.0, 7.05, 0.9, 0.9, 0.1, '#ffb040', { glow: true }]];
  L.models.airliner = () => [[0, 0, 0, 4.4, 4.4, 50, W], [0, 0.5, -24, 3.2, 2.8, 4, W], [0, 0.6, -24.6, 2.6, 1.4, 1.6, GL], [0, -0.5, 2, 44, 0.6, 9, W], [-14, -1.6, 2, 2.2, 2.2, 5, '#cfd4da'], [14, -1.6, 2, 2.2, 2.2, 5, '#cfd4da'], [0, 6, 21, 0.6, 9, 7, '#2a6ac8'], [0, 1, 22, 15, 0.5, 5, W]];
  L.models.balloon = () => [[0, 9, 0, 9, 11, 9, W, { ry: 0.6 }], [0, 9, 0, 9.2, 4, 9.2, '#ffffff', { ry: 0.6 }], [0, 1.8, 0, 2.6, 2, 2.6, '#8a5a2a'], [-1.4, 4.6, 0, 0.1, 5.4, 0.1, '#6a4a2a', { rz: 0.12 }], [1.4, 4.6, 0, 0.1, 5.4, 0.1, '#6a4a2a', { rz: -0.12 }]];
  L.models.heli = () => [[0, 0, 0, 2.2, 2.2, 5.6, W], [0, 0.3, -2.9, 1.8, 1.4, 1.4, GL], [0, 0, 5, 0.5, 0.5, 5.2, W], [0, 1.9, 0, 12, 0.08, 0.45, '#2a2a2e'], [0, 1.9, 0, 0.45, 0.08, 12, '#2a2a2e'], [0, 1.2, 0, 0.4, 1, 0.4, K], [0, 0.6, 2.2, 0.3, 0.3, 0.3, RED, { glow: true }]];
  // oiseau : deux ailes en V (le battement est une échelle verticale par instance) ; poisson : corps et queue
  L.models.bird = () => [[0, 0, 0, 0.5, 0.4, 1.3, '#2a2a30'], [-1.0, 0.25, 0, 1.7, 0.08, 0.7, '#2a2a30', { rz: 0.28 }], [1.0, 0.25, 0, 1.7, 0.08, 0.7, '#2a2a30', { rz: -0.28 }]];
  L.models.gull = () => [[0, 0, 0, 0.6, 0.45, 1.5, '#f4f4f0'], [-1.3, 0.3, 0, 2.2, 0.09, 0.8, '#f4f4f0', { rz: 0.22 }], [1.3, 0.3, 0, 2.2, 0.09, 0.8, '#f4f4f0', { rz: -0.22 }], [-2.3, 0.45, 0, 0.6, 0.09, 0.7, '#3a3a40', { rz: 0.4 }], [2.3, 0.45, 0, 0.6, 0.09, 0.7, '#3a3a40', { rz: -0.4 }]];
  L.models.fish = () => [[0, 0, 0, 0.5, 0.9, 2.0, W], [0, 0, 1.3, 0.12, 0.9, 0.9, W], [0, 0.55, 0, 0.1, 0.5, 0.8, W], [0, 0.1, -0.85, 0.52, 0.3, 0.2, '#ffffff', { glow: true }]];
  L.models.whale = () => [[0, 0, 0, 14, 12, 44, W], [0, -1.5, -19, 11, 7, 10, W], [0, 0, 26, 7, 6, 12, W], [0, 3, 34, 16, 0.9, 7, W], [-9, -3, -6, 9, 0.7, 4, W, { rz: 0.5 }], [9, -3, -6, 9, 0.7, 4, W, { rz: -0.5 }], [-3.6, 3.4, -14, 0.9, 0.9, 0.3, '#101418'], [3.6, 3.4, -14, 0.9, 0.9, 0.3, '#101418']];
  L.models.pkg = () => [[0, 0.5, 0, 1.4, 1.0, 1.4, W], [0, 0.52, 0, 1.44, 0.14, 1.44, '#d8c8a0']];
  L.models.kite = () => [[0, 0, 0, 2.0, 0.06, 2.0, W, { ry: 0.78 }], [0, -3, 0, 0.05, 6, 0.05, '#e8e8e0']];
  L.models.toyTrain = () => [[0, 3.6, 0, 8, 6, 12, W], [0, 9.2, -2, 4.6, 5, 4, W], [0, 10.6, -3.4, 2, 1.4, 0.3, '#2a2a2e'], [0, 7, 3, 3, 6, 3, '#2a2a2e']];
  L.models.drone2 = () => [[0, 0, 0, 1.4, 0.5, 1.4, K], [0, 0.4, 0, 3, 0.06, 0.2, '#9aa0a8'], [0, 0.4, 0, 0.2, 0.06, 3, '#9aa0a8'], [0, -0.3, 0, 0.3, 0.3, 0.3, RED, { glow: true }]];

  // ---------- flotte ----------
  /* o = { model, n, c0, c1 (tronçon de distance couvert), lx:[a,b] (travers), y:[a,b] (hauteur au-dessus du sol), speed:[a,b] (m/s), dir (1 | -1 | 0 = les deux),
   *       tint:[couleurs] | null, scale:[a,b], bob (amplitude verticale), flap (battement), sound:{ name, range, every }, fixedLx: [..] (voies précises),
   *       glowPulse, yaw (cap supplémentaire en radians), mode 'lane' | 'across' (va-et-vient en travers) | 'orbit' }
   * Les instances naissent et disparaissent en fondu aux deux bouts du tronçon. */
  class Fleet {
    constructor(S, o) {
      this.T = S.T; this.o = o; this.t = 0; this.n = o.n; this.c0 = o.c0; this.c1 = o.c1; this.span = o.c1 - o.c0; this.mid = (o.c0 + o.c1) / 2;
      const gs = geoOf(o.model), ms = mats(), r = o.r || U.fx;
      this.object = new THREE.Group(); this.object.frustumCulled = false;
      this.body = new THREE.InstancedMesh(gs.solid || gs.glow, ms[0], o.n); this.body.frustumCulled = false; this.body.castShadow = false;
      this.body.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.object.add(this.body);
      this.lights = gs.solid && gs.glow ? new THREE.InstancedMesh(gs.glow, ms[1], o.n) : null;
      if (this.lights) { this.lights.frustumCulled = false; this.lights.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.object.add(this.lights); }
      if (!gs.solid) this.body.material = ms[1];
      this.st = [];
      const tint = o.tint && o.tint.length ? o.tint.map((c) => new THREE.Color(c)) : null;
      for (let i = 0; i < o.n; i++) {
        const dir = o.dir === 0 || o.dir === undefined ? (r() < 0.5 ? 1 : -1) : o.dir;
        const fl = o.fixedLx ? o.fixedLx[i % o.fixedLx.length] : null;
        this.st.push({ ph: r(), lx: fl !== null ? fl : o.lx[0] + (o.lx[1] - o.lx[0]) * r(), y: o.y[0] + (o.y[1] - o.y[0]) * r(), v: (o.speed[0] + (o.speed[1] - o.speed[0]) * r()) * dir, dir, sc: (o.scale ? o.scale[0] + (o.scale[1] - o.scale[0]) * r() : 1), ph2: r() * 6.283, inside: false });
        if (tint) this.body.setColorAt(i, tint[Math.floor(r() * tint.length)]); else this.body.setColorAt(i, new THREE.Color(1, 1, 1));
      }
      if (this.body.instanceColor) this.body.instanceColor.needsUpdate = true;
      this.cool = 0; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new V(); this._s = new V();
      this.update(0, S.game, true);
    }
    update(dt, game, force) {
      const o = this.o, T = this.T, run = game && game.endlessRun;
      const far = !force && run && Math.abs(run.dist - this.mid) > 520; this.object.visible = !far; if (far) return;      // hors de portée : invisible (aucun appel de dessin) et figée
      this.t += dt; this.cool -= dt;
      const m = this._m, q = this._q, e = this._e, p = this._p, s = this._s, cam = game && game.camera ? game.camera.position : null;
      for (let i = 0; i < this.n; i++) {
        const a = this.st[i];
        let d, lx = a.lx, y = a.y, yaw = o.yaw || 0;
        if (o.mode === 'cross') { d = o.d; const W2 = o.lx[1] - o.lx[0], f = ((a.ph + a.v * this.t / W2) % 1 + 1) % 1, fw = a.dir < 0 ? 1 - f : f; lx = o.lx[0] + fw * W2; yaw += (a.dir < 0 ? -1 : 1) * Math.PI / 2; }
        else if (o.mode === 'lift') { d = this.c0 + a.ph * this.span; y = o.y[0] + (o.y[1] - o.y[0]) * (0.5 + 0.5 * Math.sin(this.t * (Math.abs(a.v) / Math.max(6, o.y[1] - o.y[0])) + a.ph2)); }
        else if (o.mode === 'across') { d = this.c0 + a.ph * this.span; const w = Math.sin(this.t * (Math.abs(a.v) / Math.max(4, o.lx[1] - o.lx[0])) + a.ph2); lx = (o.lx[0] + o.lx[1]) / 2 + w * (o.lx[1] - o.lx[0]) / 2; yaw += (Math.cos(this.t * (Math.abs(a.v) / Math.max(4, o.lx[1] - o.lx[0])) + a.ph2) > 0 ? 1 : -1) * Math.PI / 2; }
        else { d = this.c0 + ((a.ph * this.span + a.v * this.t) % this.span + this.span) % this.span; yaw += a.dir < 0 ? Math.PI : 0; }
        if (o.bob) y += Math.sin(this.t * 1.4 + a.ph2) * o.bob;
        if (o.wave) { lx += Math.sin(this.t * 0.6 + a.ph2) * o.wave; y += Math.sin(this.t * 0.9 + a.ph2 * 2) * o.wave * 0.5; }
        const f = U.smooth(0, 14, d - this.c0) * U.smooth(0, 14, this.c1 - d), k = a.sc * (o.mode === 'across' || o.mode === 'lift' || o.mode === 'cross' ? 1 : Math.max(0.001, f));
        const pos = T.at(d, lx, y); p.set(pos[0], pos[1], pos[2]);
        e.set(o.pitch || 0, T.yawAcross(d) / DEG + yaw, o.roll ? Math.sin(this.t * 2 + a.ph2) * o.roll : 0); q.setFromEuler(e);
        const fy = o.flap ? 1 + o.flap * Math.sin(this.t * 11 + a.ph2 * 3) : 1;
        s.set(k, k * fy, k); m.compose(p, q, s);
        this.body.setMatrixAt(i, m); if (this.lights) this.lights.setMatrixAt(i, m);
        // son de passage : une fois quand l'instance approche de la caméra
        if (o.sound && cam && game.audio) {
          const d2 = p.distanceToSquared(cam), R = o.sound.range, near = d2 < R * R;
          if (near && !a.inside && this.cool <= 0) { a.inside = true; this.cool = o.sound.every || 1.2; game.audio.play(o.sound.name, p.clone(), o.sound.param); }
          else if (!near && d2 > R * R * 2.2) a.inside = false;
        }
      }
      this.body.instanceMatrix.needsUpdate = true; if (this.lights) this.lights.instanceMatrix.needsUpdate = true;
    }
  }
  L.Fleet = Fleet;

  /* ajoute une flotte à une scène, limitée au tronçon en cours de construction ; retourne la flotte ou null */
  L.fleet = function (S, o) {
    const c0 = Math.max(S.d0, S.c0), c1 = Math.min(S.d1, S.c1);
    if (c1 - c0 < 30 || o.n < 1 || o.model === 'bird' || o.model === 'gull') return null;   // v036b : plus d'oiseaux
    // part de la flotte proportionnelle à la longueur du tronçon couvert
    const f = new Fleet(S, Object.assign({}, o, { c0, c1, n: Math.max(1, Math.round(o.n * (c1 - c0) / Math.max(120, S.len))) }));
    S.b.entity(f); return f;
  };

  // ---------- obstacle mobile ----------
  /* o = { parts | model, mode: 'swing'|'across'|'vertical'|'orbit'|'along', d, lx, y (hauteur du point central / d'ancrage), amp, period, phase, size:[w,h,d], cause,
   *       len (longueur du câble en 'swing'), cable: true, sound: { name, range }, dwell (vertical : temps d'arrêt relatif) } */
  class Sweeper {
    constructor(S, o) {
      this.type = 'sweeper'; this.alive = true; this.hazard = true; this.guard = true; this.unarmed = true; this.cause = o.cause || 'mover';
      this.T = S.T; this.o = o; this.t = (o.phase || 0) * (o.period || 4) / (Math.PI * 2);
      const gs = o.parts ? buildGeo(o.parts) : geoOf(o.model), ms = mats();
      this.object = new THREE.Group(); this.object.frustumCulled = false;
      this.body = new THREE.Mesh(gs.solid || gs.glow, gs.solid ? ms[0] : ms[1]); this.body.frustumCulled = false; this.object.add(this.body);
      if (gs.solid && gs.glow) { this.glow = new THREE.Mesh(gs.glow, ms[1]); this.glow.frustumCulled = false; this.object.add(this.glow); }
      this.rope = null;
      if (o.cable) { this.rope = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.16), new THREE.MeshLambertMaterial({ color: '#1a1a1a' })); this.rope.frustumCulled = false; this.object.add(this.rope); }
      this.size = o.size || [3, 3, 3]; this.center = [0, 0, 0];
      this.obb = { c: new V(), ux: new V(1, 0, 0), uy: new V(0, 1, 0), uz: new V(0, 0, 1), hx: this.size[0] / 2, hy: this.size[1] / 2, hz: this.size[2] / 2 };
      const a = T0(S.T, o.d, o.lx, o.y); this.anchor = new V(a[0], a[1], a[2]); this.yaw = S.T.yawAcross(o.d) / DEG;
      const qy = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.yaw, 0)); this.qy = qy;
      this.ax = new V(1, 0, 0).applyQuaternion(qy); this.az = new V(0, 0, 1).applyQuaternion(qy);
      this.obb.ux.copy(this.ax); this.obb.uz.copy(this.az);
      this.lastSnd = -9; this.pp = 0; this.mid = o.d;
      this.update(0, S.game, true);
    }
    pos(out) {
      const o = this.o, w = Math.PI * 2 / (o.period || 4), t = this.t * w;
      out.copy(this.anchor);
      if (o.mode === 'swing') { const th = (o.angle || 0.9) * Math.sin(t), L = o.len || 14; out.addScaledVector(this.ax, Math.sin(th) * L); out.y -= Math.cos(th) * L; }
      else if (o.mode === 'across') out.addScaledVector(this.ax, Math.sin(t) * o.amp);
      else if (o.mode === 'alongsweep') out.addScaledVector(this.az, Math.sin(t) * o.amp);
      else if (o.mode === 'orbit') { out.addScaledVector(this.ax, Math.cos(t) * o.amp); out.y += Math.sin(t) * o.amp; }
      else if (o.mode === 'vertical') {       // piston : attente en haut, chute brutale, attente en bas, remontée lente
        const p = ((t / (Math.PI * 2)) % 1 + 1) % 1; let k;
        if (p < 0.38) k = 1; else if (p < 0.46) k = 1 - (p - 0.38) / 0.08; else if (p < 0.6) k = 0; else k = (p - 0.6) / 0.4;
        out.y = this.anchor.y - o.amp * (1 - k); this.pp = p;
      }
      return out;
    }
    update(dt, game, force) {
      const run = game && game.endlessRun;
      const far = !force && run && Math.abs(run.dist - this.mid) > 420; this.object.visible = !far; if (far) return;
      this.t += dt; const p = this.pos(this.body.position);
      this.obb.c.copy(p); this.obb.c.y += 0;
      if (this.glow) this.glow.position.copy(p);
      if (this.rope) { const a = this.anchor, dx = p.x - a.x, dy = p.y - a.y, dz = p.z - a.z, len = Math.hypot(dx, dy, dz); this.rope.position.set(a.x + dx / 2, a.y + dy / 2, a.z + dz / 2); this.rope.scale.set(1, Math.max(0.01, len - (this.o.ropeEnd || 0)), 1); this.rope.lookAt(p.x, p.y, p.z); this.rope.rotateX(Math.PI / 2); }
      this.body.rotation.y = this.yaw; if (this.glow) this.glow.rotation.y = this.yaw;
      if (this.o.spin) { this.body.rotation.z = this.t * this.o.spin; if (this.glow) this.glow.rotation.z = this.body.rotation.z; }
      if (this.o.tilt && this.o.mode === 'swing') { const th = (this.o.angle || 0.9) * Math.sin(this.t * Math.PI * 2 / (this.o.period || 4)); this.body.rotation.z = -th * this.o.tilt; if (this.glow) this.glow.rotation.z = this.body.rotation.z; }
      const S = this.o.sound;
      if (S && game && game.audio && game.camera) {
        const ph = this.o.mode === 'vertical' ? this.pp : 0, hit = this.o.mode === 'vertical' ? (this.prevPp !== undefined && this.prevPp < 0.44 && ph >= 0.44) : false;
        if (hit && p.distanceTo(game.camera.position) < S.range) game.audio.play(S.name, p.clone());
        this.prevPp = ph;
      }
    }
    updateObb() {} reset() {} kill() {} clearWreck() {}
  }
  const T0 = (T, d, lx, y) => T.at(d, lx, y);
  L.Sweeper = Sweeper;
  L.sweeper = function (S, o) { if (!S.inClip(o.d)) return null; const sw = new Sweeper(S, o); S.b.entity(sw); S.b.targets.push(sw); S.ctx.busy.push(o.d); return sw; };

  // ---------- halos lumineux statiques (enseignes, lampadaires, fenêtres) : un seul objet `Points` par couleur et par tronçon ----------
  const glowMats = {};
  L.flushGlows = function (ctx) {
    if (!ctx.glows || !ctx.glows.length) return;
    const by = {};
    for (const g of ctx.glows) (by[g.c + '|' + g.s] = by[g.c + '|' + g.s] || []).push(g);
    for (const k in by) {
      const a = by[k], pos = new Float32Array(a.length * 3);
      a.forEach((g, i) => { pos[i * 3] = g.x; pos[i * 3 + 1] = g.y; pos[i * 3 + 2] = g.z; });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = glowMats[k] || (glowMats[k] = new THREE.PointsMaterial({ map: dotTex(), color: a[0].c, size: a[0].s, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      const pts = new THREE.Points(geo, m); pts.frustumCulled = false; pts.renderOrder = 4; ctx.b.root.add(pts);
    }
  };

  // ---------- particules d'ambiance ----------
  let dot = null;
  const dotTex = () => dot || (dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })());
  class Motes {
    /* o = { n, c0, c1, lx:[a,b], y:[a,b], color, size, drift:[vx, vy, vz], additive, sway, opacity } */
    constructor(S, o) {
      this.o = o; this.T = S.T; this.t = 0; this.mid = (o.c0 + o.c1) / 2; this.n = o.n;
      const pos = new Float32Array(o.n * 3); this.base = new Float32Array(o.n * 3); this.ph = new Float32Array(o.n);
      const r = U.fx;
      for (let i = 0; i < o.n; i++) { const d = o.c0 + r() * (o.c1 - o.c0), lx = o.lx[0] + r() * (o.lx[1] - o.lx[0]), y = o.y[0] + r() * (o.y[1] - o.y[0]), p = S.T.at(d, lx, y); this.base.set(p, i * 3); pos.set(p, i * 3); this.ph[i] = r() * 6.283; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.geo = g;
      const m = new THREE.PointsMaterial({ map: dotTex(), color: o.color || '#ffffff', size: o.size || 0.6, sizeAttenuation: true, transparent: true, opacity: o.opacity === undefined ? 0.8 : o.opacity, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending });
      this.object = new THREE.Points(g, m); this.object.frustumCulled = false; this.object.renderOrder = 4;
    }
    update(dt, game) {
      const run = game && game.endlessRun, far = run && Math.abs(run.dist - this.mid) > 380; this.object.visible = !far; if (far) return;
      this.t += dt; const o = this.o, P = this.geo.attributes.position.array, dr = o.drift || [0, 0, 0], sw = o.sway || 0, yr = o.y[1] - o.y[0] + 4;
      for (let i = 0; i < this.n; i++) {
        const k = i * 3, s = Math.sin(this.t * 0.8 + this.ph[i]);
        P[k] = this.base[k] + dr[0] * this.t + s * sw; P[k + 1] = this.base[k + 1] + ((dr[1] * this.t) % yr + yr) % yr + Math.sin(this.t * 1.3 + this.ph[i] * 2) * sw * 0.4; P[k + 2] = this.base[k + 2] + dr[2] * this.t + Math.cos(this.t * 0.7 + this.ph[i]) * sw;
      }
      this.geo.attributes.position.needsUpdate = true;
      if (o.twinkle) this.object.material.opacity = (o.opacity === undefined ? 0.8 : o.opacity) * (0.75 + 0.25 * Math.sin(this.t * 3));
    }
  }
  L.Motes = Motes;
  L.motes = function (S, o) {
    const c0 = Math.max(S.d0, S.c0), c1 = Math.min(S.d1, S.c1); if (c1 - c0 < 20) return null;
    const m = new Motes(S, Object.assign({}, o, { c0, c1, n: Math.max(4, Math.round(o.n * (c1 - c0) / 200)) })); S.b.entity(m); return m;
  };
})();

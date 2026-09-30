/* v034 : OMBRE DE LA ROQUETTE — repère de hauteur. Un rayon part de la roquette vers le bas ; là où il touche (sol, toit, pont,
 * poutre), une tache sombre s'allonge dans le sens du vol :
 *   - proche du sol : petite, nette, sombre, collée à la roquette ;
 *   - en altitude : plus large, plus floue, plus pâle, et de plus en plus en retard sur le regard.
 * Le joueur juge d'un coup d'œil « je suis à 2 m du toit » ou « il y a un pont sous moi » sans lire aucune jauge.
 * Coût : un rayon (grille de hachage) et un plan texturé par image ; aucune ombre 3D supplémentaire (les vraies ombres du soleil
 * sont trop fines pour une roquette de 20 cm). */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;
  const _o = new V(), _p1 = new V(), _fwd = new V(), _x = new V(), _y = new V(), _n = new V(), _m = new THREE.Matrix4(), DOWN = new V(0, -1, 0);
  const GROUND = (b) => b.kind === 'solid' || b.kind === 'brick' || b.kind === 'hazard';

  class RocketShadow {
    constructor(game) {
      this.game = game; this.cfg = CC.CONFIG.shadow; this.k = 0;
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      this.mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
      this.mesh.matrixAutoUpdate = false; this.mesh.renderOrder = 1; this.mesh.visible = false; this.mesh.frustumCulled = false;
      game.scene.add(this.mesh);
      this.height = Infinity;
    }

    update(dt) {
      const g = this.game, rk = g.rocket, C = this.cfg;
      if (!rk.active || g.state === 'CRASHED') { this.mesh.visible = false; this.height = Infinity; return; }
      _o.copy(rk.pos); _p1.copy(_o).addScaledVector(DOWN, C.maxDist);
      const hit = g.world.sweep(_o, _p1, 0.02, GROUND);
      if (!hit) { this.mesh.visible = false; this.height = Infinity; return; }
      const h = hit.t * C.maxDist; this.height = h;
      _n.copy(hit.normal); if (_n.y < 0.3) { this.mesh.visible = false; return; }   // paroi verticale : pas d'ombre
      // axe long : direction du vol projetée sur la surface ; axe court : perpendiculaire
      if (rk.vel.lengthSq() > 1) _fwd.copy(rk.vel).normalize(); else _fwd.copy(rk.fwd);
      _y.copy(_fwd).addScaledVector(_n, -_fwd.dot(_n));
      if (_y.lengthSq() < 1e-4) _y.set(0, 0, -1).addScaledVector(_n, _n.z);
      _y.normalize(); _x.crossVectors(_y, _n).normalize();
      const w = U.clamp(C.minSize + h * C.growth, C.minSize, C.maxSize), len = w * (1 + (C.stretch - 1) * U.clamp(rk.speed / 60, 0, 1));
      _m.makeBasis(_x.multiplyScalar(w), _y.multiplyScalar(len), _n);
      _m.setPosition(_o.x + (_p1.x - _o.x) * hit.t + _n.x * 0.04, _o.y + (_p1.y - _o.y) * hit.t + _n.y * 0.04, _o.z + (_p1.z - _o.z) * hit.t + _n.z * 0.04);
      this.mesh.matrix.copy(_m); this.mesh.matrixWorldNeedsUpdate = true; this.mesh.updateMatrixWorld(true);
      // opacité : la plus forte près de la surface, s'efface avec la hauteur (jamais totalement : on garde le repère)
      this.mat.opacity = C.opacity * (0.25 + 0.75 * Math.pow(1 - U.clamp(h / C.fadeDist, 0, 1), 0.8));
      this.mesh.visible = true;
    }
  }

  CC.RocketShadow = RocketShadow;
})();

/* v034 : DRONE — premier obstacle MOBILE du mode CLASSIQUE (à partir du palier MOYEN). Un petit quadricoptère noir aux feux
 * rouges va et vient en travers du couloir sur un rail lumineux rouge (le danger se lit de loin : le rail montre où il passera).
 * Il ne se détruit pas : le toucher fait exploser la roquette (« DRONE »). On le contourne par-dessus, par-dessous, ou on
 * passe quand il est de l'autre côté. Sa vitesse augmente avec les paliers.
 * Il se comporte comme une cible pour la roquette (boîte orientée dans game.targets) mais `hazard` : le jeu le traite en danger. */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;
  const _q = new THREE.Quaternion(), _p = new V();

  function model() {
    const K = CC.Models.kit, lam = K.lam, box = K.box, cyl = K.cyl;
    const g = new THREE.Group();
    const dark = lam('#23262c'), mid = lam('#3c4048');
    box(1.0, 0.3, 1.0, dark, 0, 0, 0, g);
    box(0.6, 0.12, 0.6, mid, 0, 0.2, 0, g);
    for (const a of [Math.PI / 4, -Math.PI / 4]) { const arm = box(2.5, 0.09, 0.14, mid, 0, 0.05, 0, g); arm.rotation.y = a; }
    const rotors = [];
    for (const [x, z] of [[0.9, 0.9], [-0.9, 0.9], [0.9, -0.9], [-0.9, -0.9]]) {
      box(0.18, 0.16, 0.18, dark, x, 0.13, z, g);
      const rot = new THREE.Group(); rot.position.set(x, 0.24, z); g.add(rot);   // chaque rotor tourne autour de son propre axe
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 14), new THREE.MeshBasicMaterial({ color: '#9fb0c8', transparent: true, opacity: 0.32, depthWrite: false }));
      rot.add(disc); box(1.2, 0.02, 0.08, dark, 0, 0.005, 0, rot);
      rotors.push(rot);
    }
    // feux : un rouge clignotant sur le dessus, un œil rouge dessous (matériaux propres : animés)
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ff2a1a' });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), lampMat); lamp.position.set(0, 0.3, 0); g.add(lamp);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3b2e' })); eye.position.set(0, -0.2, 0); g.add(eye);
    g.userData.rotors = rotors; g.userData.lamp = lampMat;
    return CC.Models.bake(g, rotors);   // corps fusionné (quelques appels de dessin), rotors animables
  }

  class Drone {
    /* pos : centre du balayage [x,y,z] ; across : direction en travers du couloir (vecteur unitaire) ; amp : demi-course (m) ;
     * period : s pour un aller-retour ; yawDeg : cap du couloir */
    constructor(pos, across, amp, period, phase) {
      this.type = 'drone'; this.alive = true; this.hazard = true; this.guard = true; this.unarmed = true;
      this.base = new V().fromArray(pos); this.across = new V(across[0], 0, across[1]).normalize();
      this.amp = amp; this.period = period; this.phase = phase; this.t = phase / (Math.PI * 2) * period;
      this.object = new THREE.Group(); this.model = model(); this.object.add(this.model);
      this.object.position.copy(this.base);
      this.size = [2.3, 0.7, 2.3]; this.center = [0, 0, 0];
      this.obb = { c: new V(), ux: new V(), uy: new V(0, 1, 0), uz: new V(), hx: 1.15, hy: 0.35, hz: 1.15 };
      this.updateObb();
      this.dot = null;
    }
    offset() { return Math.sin(this.t * Math.PI * 2 / this.period) * this.amp; }
    updateObb() {
      const o = this.obb; o.c.copy(this.object.position);
      o.ux.copy(this.across); o.uz.set(-this.across.z, 0, this.across.x);
    }
    update(dt, game) {
      this.t += dt;
      this.object.position.copy(this.base).addScaledVector(this.across, this.offset());
      const S = this.model.userData;
      for (const r of S.rotors) r.rotation.y += dt * 60;
      S.lamp.color.setRGB(1, 0.16, 0.1).multiplyScalar(Math.sin(this.t * 9 + this.phase) > 0 ? 1 : 0.2);
      this.object.rotation.z = Math.cos(this.t * Math.PI * 2 / this.period) * 0.12;   // penche dans le sens du mouvement
      this.updateObb();
    }
    reset() { this.alive = true; }
    kill() { /* indestructible */ }
    clearWreck() {}
  }

  CC.Drone = Drone;
})();

/* Caméra : vue 1re personne au lanceur, transition, poursuite 3e personne, impact, orbite de menu.
 * MESURÉ : réticule à 40,2 % de la hauteur ; la direction visée passe par le réticule.
 * MESURÉ (indirect) : distance 1,85 m, hauteur 0,52 m. ESTIMATION : lissage du décalage, roulis en virage.
 * v012 (CHOIX, remplace v010-v011) : en vol la caméra ne tourne JAMAIS. Son orientation est figée au tir (vue du lanceur) ;
 * elle se contente de suivre la roquette en translation, à distance constante, et la regarde donc toujours.
 * La roquette peut ainsi pointer vers la caméra ; si elle fonce vers elle, la caméra recule d'autant. */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;

  class CameraRig {
    constructor(camera, game) {
      this.cam = camera; this.game = game; this.cfg = CC.CONFIG.camera;
      this.mode = 'menu';
      this.pos = new V(); this.eye = new V(); this.t = 0;
      this.roll = 0; this.focus = new V();
      this.aimDir = new V(0, 0, -1); this.right = new V(1, 0, 0); this.up = new V(0, 1, 0);
      this.shake = 0;
      this.offset = new V(0, 0.5, 2);
      this.camDir = new V(0, 0, -1); this.camRight = new V(1, 0, 0); this.camUp = new V(0, 1, 0);
      this.upRef = new V(0, 1, 0);
    }

    // Offset angulaire vertical du réticule (MESURÉ y = 40,2 %).
    crossAngle() {
      const ndcY = (0.5 - this.cfg.crosshairY) * 2;
      return Math.atan(ndcY * Math.tan(U.deg(this.cfg.fovV) / 2));
    }

    setAim(yaw, pitch) { this.setAimQ(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))); }
    setAimQ(q) {
      this.aimDir.set(0, 0, -1).applyQuaternion(q);
      this.right.set(1, 0, 0).applyQuaternion(q);
      this.up.set(0, 1, 0).applyQuaternion(q);
      this.yaw = Math.atan2(-this.aimDir.x, -this.aimDir.z);
    }

    orient(forward, rollAngle, right, up) {
      // oriente la caméra : direction visée abaissée de l'angle du réticule, puis roulis
      right = right || this.right; up = up || this.up;
      const a = this.crossAngle();
      const f = forward.clone().applyAxisAngle(right, -a);
      const m = new THREE.Matrix4().lookAt(new V(0, 0, 0), f, up.clone().applyAxisAngle(right, -a));
      this.cam.quaternion.setFromRotationMatrix(m);
      if (rollAngle) this.cam.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new V(0, 0, 1), rollAngle));
    }

    startLauncher(eyePos) { this.mode = 'launcher'; this.eye.copy(eyePos); this.pos.copy(eyePos); this.roll = 0; }
    startFlight() {
      this.mode = 'transition'; this.t = 0;
      this.camDir.copy(this.aimDir); this.upRef.set(0, 1, 0);   // horizon à plat
      this.updateCamBasis(); this.wantedOffset(this.offset);
    }

    // Repère de la caméra de poursuite, construit sur camDir et sur le « haut » de référence (roulis ajouté à part).
    updateCamBasis() {
      const r = new V().crossVectors(this.camDir, this.upRef);
      if (r.lengthSq() > 1e-6) this.camRight.copy(r.normalize());   // à la verticale : on garde le repère précédent
      this.camUp.crossVectors(this.camRight, this.camDir).normalize();
    }
    startImpact(point) { this.mode = 'impact'; this.focus.copy(point); this.t = 0; }
    startMenu(center, radius, height) { this.mode = 'menu'; this.focus.copy(center); this.orbitR = radius; this.orbitH = height; this.t = 0; }

    // décalage caméra→roquette (repère de visée) ; seul ce décalage est lissé : la caméra ne traîne pas derrière la roquette,
    // mais la roquette dérive à l'écran quand la visée tourne (OBSERVÉ : tuyère entre 44 et 57 % en x, 57 et 74 % en y)
    wantedOffset(out) { return out.copy(this.camDir).multiplyScalar(-this.cfg.distance).addScaledVector(this.camUp, this.cfg.height); }

    chaseTarget(rocket, out) {
      out.copy(rocket.pos).add(this.offset);
      // évite de passer derrière un mur (tunnels, puits)
      const dir = new V().subVectors(out, rocket.pos);
      const len = dir.length();
      if (len > 0.01) {
        dir.divideScalar(len);
        const hit = this.game.world.raycast(rocket.pos, dir, len + 0.3, (b) => b.kind === 'solid');
        if (hit) out.copy(rocket.pos).addScaledVector(dir, Math.max(0.6, hit.dist - 0.35));
      }
      return out;
    }

    update(dt) {
      const c = this.cfg, cam = this.cam, rk = this.game.rocket;
      this.t += dt;
      this.roll = 0;   // v012 : plus de roulis de caméra en virage (la caméra ne tourne pas)

      if (this.mode === 'launcher') {
        cam.position.copy(this.eye);
        this.orient(this.aimDir, 0);
      } else if (this.mode === 'transition' || this.mode === 'chase') {
        this.offset.lerp(this.wantedOffset(new V()), U.damp(c.offsetLag, dt));
        const want = this.chaseTarget(rk, new V());
        if (this.mode === 'transition') {
          const k = U.smooth(0.08, c.launchBlend + 0.08, this.t);     // MESURÉ : rattrapage ≈ 0,5 s
          this.pos.copy(this.eye).lerp(want, k);
          if (this.t > c.launchBlend + 0.1) this.mode = 'chase';
        } else {
          this.pos.copy(want);
        }
        cam.position.copy(this.pos);
        this.orient(this.camDir, this.roll, this.camRight, this.camUp);
      } else if (this.mode === 'impact') {
        const back = new V().subVectors(this.pos, this.focus).normalize();
        this.pos.addScaledVector(back, dt * 1.5);
        cam.position.copy(this.pos);
        const m = new THREE.Matrix4().lookAt(this.pos, this.focus, new V(0, 1, 0));
        const q = new THREE.Quaternion().setFromRotationMatrix(m);
        cam.quaternion.slerp(q, U.damp(3, dt));
      } else if (this.mode === 'menu') {
        const a = this.t * 0.06;
        cam.position.set(this.focus.x + Math.sin(a) * this.orbitR, this.focus.y + this.orbitH, this.focus.z + Math.cos(a) * this.orbitR);
        cam.lookAt(this.focus);
      }
      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - dt * 2.5);
        cam.position.x += (U.rng() - 0.5) * this.shake * 0.4; cam.position.y += (U.rng() - 0.5) * this.shake * 0.4;
      }
      cam.updateMatrixWorld();
    }
  }

  CC.CameraRig = CameraRig;
})();

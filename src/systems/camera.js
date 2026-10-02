/* Caméra : vue 1re personne au lanceur, transition, poursuite 3e personne, impact, orbite de menu.
 * MESURÉ : réticule à 40,2 % de la hauteur ; la direction visée passe par le réticule.
 * MESURÉ (indirect) : distance 1,85 m, hauteur 0,52 m. ESTIMATION : lissage du décalage, roulis en virage.
 * v010 (CHOIX) : en vol, la caméra ne suit plus la visée mais la trajectoire de la roquette, avec retard (camera.followLag) :
 * piloter (W,A,S,D, souris) fait tourner la roquette à l'écran sans faire pivoter la vue d'un coup.
 * v011 : visée libre à 360° ; le « haut » de la caméra suit (avec retard) celui de la visée, pas celui du monde :
 * pas de retournement brutal en haut d'un looping. */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;
  // v030 (mobile) : objets de calcul réutilisés — la caméra est mise à jour à chaque image
  const _f = new V(), _u = new V(), _o = new V(), _z = new V(0, 0, 1), _y = new V(0, 1, 0), _t1 = new V(), _t2 = new V(), _t3 = new V();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _tq = new THREE.Quaternion();

  const _yAx = new THREE.Vector3(0, 1, 0), _nb = new THREE.Vector3();
  class CameraRig {
    constructor(camera, game) {
      this.cam = camera; this.game = game; this.cfg = CC.CONFIG.camera;
      this.mode = 'menu';
      this.pos = new V(); this.eye = new V(); this.t = 0;
      this.roll = 0; this.focus = new V();
      this.aimDir = new V(0, 0, -1); this.right = new V(1, 0, 0); this.up = new V(0, 1, 0);
      this.shake = 0; this.zoom = 1;
      this.offset = new V(0, 0.5, 2);
      this.camDir = new V(0, 0, -1); this.camRight = new V(1, 0, 0); this.camUp = new V(0, 1, 0);
      this.upRef = new V(0, 1, 0); this.prevCamDir = new V(0, 0, -1); this.camNose = new V(0, 0, -1);
      // v034 : caméra du lanceur (posée par CC.Pad chaque image), passage lanceur → poursuite (travelling), boost
      this.padPos = new V(); this.padLook = new V(); this.padFov = 44;
      this.handT = -1; this.fromPos = new V(); this.fromQuat = new THREE.Quaternion(); this.fromFov = 60; this.fromLook = new V();
      this.pull = 0; this.punch = 0;
    }

    // Offset angulaire vertical du réticule (MESURÉ y = 40,2 %).
    crossAngle() {
      const ndcY = (0.5 - this.cfg.crosshairY) * 2;
      return Math.atan(ndcY * Math.tan(U.deg(this.cam.fov) / 2));   // v022 : angle de vue réel (élargi debout sur téléphone)
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
      const f = _f.copy(forward).applyAxisAngle(right, -a);
      const m = _m.lookAt(_o.set(0, 0, 0), f, _u.copy(up).applyAxisAngle(right, -a));
      this.cam.quaternion.setFromRotationMatrix(m);
      if (rollAngle) this.cam.quaternion.multiply(_q.setFromAxisAngle(_z, rollAngle));
    }

    startLauncher(eyePos) { this.mode = 'launcher'; this.eye.copy(eyePos); this.pos.copy(eyePos); this.roll = 0; this.handT = -1; }
    startPad() { this.mode = 'pad'; this.t = 0; this.handT = -1; this.pull = 0; this.punch = 0; this.zoom = 1; }
    // v034 : à l'allumage, la caméra du lanceur (ou celle de l'explosion, au revive) glisse vers la poursuite : elle regarde
    // d'abord la roquette partir (travelling), puis s'aligne derrière elle
    // useOffset : la vue de départ regardait un point décalé de la roquette (lanceur) ; sinon (revive) elle la regarde en plein
    startHandoff(useOffset) {
      this.handT = 0; this.fromPos.copy(this.cam.position); this.fromQuat.copy(this.cam.quaternion); this.fromFov = this.cam.fov;
      if (useOffset) this.fromLook.copy(this.padLook).sub(this.game.pad.origin); else this.fromLook.set(0, 0, 0);
    }
    boostKick() { this.punch = 1; }
    startFlight() {
      this.mode = 'transition'; this.t = 0;
      this.camDir.copy(this.aimDir); this.prevCamDir.copy(this.aimDir); this.camNose.copy(this.aimDir); this.upRef.copy(this.up);
      this.updateCamBasis(); this.wantedOffset(this.offset);
    }

    // Repère de la caméra de poursuite, construit sur camDir et sur le « haut » de référence (roulis ajouté à part).
    updateCamBasis() {
      const r = _t3.crossVectors(this.camDir, this.upRef);
      if (r.lengthSq() > 1e-6) this.camRight.copy(r.normalize());   // à la verticale : on garde le repère précédent
      this.camUp.crossVectors(this.camRight, this.camDir).normalize();
    }
    startImpact(point) { this.mode = 'impact'; this.focus.copy(point); this.t = 0; }
    startMenu(center, radius, height) { this.mode = 'menu'; this.focus.copy(center); this.orbitR = radius; this.orbitH = height; this.t = 0; }

    // décalage caméra→roquette (repère de visée) ; seul ce décalage est lissé : la caméra ne traîne pas derrière la roquette,
    // mais la roquette dérive à l'écran quand la visée tourne (OBSERVÉ : tuyère entre 44 et 57 % en x, 57 et 74 % en y)
    wantedOffset(out) { return out.copy(this.camDir).multiplyScalar(-(this.cfg.distance + this.pull)).addScaledVector(this.camUp, this.cfg.height); }

    chaseTarget(rocket, out) {
      out.copy(rocket.pos).add(this.offset);
      // évite de passer derrière un mur (tunnels, puits)
      const dir = _t3.subVectors(out, rocket.pos);
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
      // roulis d'après la vitesse de lacet (ESTIMATION : horizon incliné en virage)
      // vitesse de lacet mesurée dans le repère de la caméra (pas autour de la verticale du monde : saut à 180° dans un looping)
      const yawRate = dt > 0 ? _t1.crossVectors(this.prevCamDir, this.camDir).dot(this.camUp) / dt : 0;
      this.prevCamDir.copy(this.camDir);
      const targetRoll = this.mode === 'chase' || this.mode === 'transition' ? U.clamp(-yawRate * c.rollFromYawRate, -0.35, 0.35) : 0;
      this.roll += (targetRoll - this.roll) * U.damp(c.rollLag, dt);

      if (this.mode === 'launcher') {
        cam.position.copy(this.eye);
        this.orient(this.aimDir, 0);
      } else if (this.mode === 'transition' || this.mode === 'chase') {
        // v019 : la caméra s'oriente vers la tête de la roquette (on monte → elle pivote vers le haut), par un double
        // lissage : le mouvement démarre et s'arrête en douceur, sans à-coup à chaque coup de joystick
        if (rk.active) {
          let nose = rk.fwd;
          const run = this.game.endlessRun;
          if (run && run.T) {   // v076 : la caméra regarde déjà vers où le couloir tourne : le décor paraît en ligne droite
            const T = run.T, a = T.at(run.dist + 8, 0, 0), b = T.at(run.dist + 80, 0, 0), cy = Math.atan2(b[0] - a[0], -(b[2] - a[2])), ry = Math.atan2(rk.fwd.x, -rk.fwd.z);
            let df = cy - ry; df = Math.atan2(Math.sin(df), Math.cos(df));
            nose = _nb.copy(rk.fwd).applyAxisAngle(_yAx, -U.clamp(df, -1.0, 1.0) * 0.9);
          }
          this.camNose.lerp(nose, U.damp(c.noseLag, dt)).normalize();
          const k = U.damp(c.followLag, dt);
          this.camDir.lerp(this.camNose, k).normalize();
          const u = _t1.copy(this.upRef).lerp(this.up, k);
          if (u.lengthSq() > 1e-6) this.upRef.copy(u.normalize());   // haut exactement opposé (rare) : on garde l'ancien
          this.updateCamBasis();
        }
        this.offset.lerp(this.wantedOffset(_t1), U.damp(c.offsetLag, dt));
        const want = this.chaseTarget(rk, _t2);
        if (this.mode === 'transition') {
          if (this.handT >= 0) this.pos.copy(want);    // v034 : le travelling est fait plus bas (startHandoff)
          else { const k = U.smooth(0.08, c.launchBlend + 0.08, this.t); this.pos.copy(this.eye).lerp(want, k); }   // MESURÉ : rattrapage ≈ 0,5 s
          if (this.t > (this.handT >= 0 ? c.handoff : c.launchBlend) + 0.1) this.mode = 'chase';
        } else {
          this.pos.copy(want);
        }
        cam.position.copy(this.pos);
        this.orient(this.camDir, this.roll, this.camRight, this.camUp);
      } else if (this.mode === 'impact') {
        const back = _t1.subVectors(this.pos, this.focus).normalize();
        this.pos.addScaledVector(back, dt * 1.5);
        cam.position.copy(this.pos);
        const m = _m.lookAt(this.pos, this.focus, _y);
        const q = _q.setFromRotationMatrix(m);
        cam.quaternion.slerp(q, U.damp(3, dt));
      } else if (this.mode === 'pad') {
        cam.position.copy(this.padPos);
        cam.lookAt(this.padLook);
      } else if (this.mode === 'menu') {
        const a = this.t * 0.06;
        cam.position.set(this.focus.x + Math.sin(a) * this.orbitR, this.focus.y + this.orbitH, this.focus.z + Math.cos(a) * this.orbitR);
        cam.lookAt(this.focus);
      }
      // v026 : léger zoom avant pendant le boost, retour progressif ensuite
      // v034 (CLASSIQUE) : l'inverse — le boost ÉLARGIT le champ (les murs filent), avec un « punch » à l'allumage et un léger recul
      // de la caméra ; le jeu paraît plus rapide sans que la roquette change de vitesse
      const boosting = (this.mode === 'chase' || this.mode === 'transition') && rk.active && rk.thrusting;
      const endless = !!this.game.endlessRun, boostZ = endless ? c.boostFov : c.boostZoom;
      this.zoom += ((boosting ? boostZ : 1) - this.zoom) * U.damp(boosting ? c.zoomIn : c.zoomOut, dt);
      this.punch = Math.max(0, this.punch - dt * 3);
      this.pull += (((boosting && endless && !rk.freeBoost) ? c.boostPull : 0) - this.pull) * U.damp(3.5, dt);
      let fov = (this.game.baseFov || c.fovV) * this.zoom * (1 + (endless ? c.boostPunch : 0) * this.punch * this.punch);
      if (this.mode === 'pad') fov = this.padFov;
      // travelling lanceur → poursuite : position et orientation, puis champ de vision
      if (this.handT >= 0) {
        this.handT += dt;
        const D = c.handoff, kp = U.smooth(0, D, this.handT), ko = U.smooth(0.22 * D, D, this.handT);
        cam.position.lerpVectors(this.fromPos, cam.position, kp);
        // orientation : d'abord on regarde la roquette s'éloigner, puis on glisse vers la vue de poursuite
        const look = _t1.copy(rk.pos).addScaledVector(this.fromLook, 1 - kp);
        const m2 = _m.lookAt(cam.position, look, _y);
        const qTrack = _q.setFromRotationMatrix(m2);
        cam.quaternion.copy(qTrack).slerp(_tq.copy(cam.quaternion), ko);
        fov = U.lerp(this.fromFov, fov, U.smooth(0, D * 0.9, this.handT));
        if (this.handT > D + 0.05) this.handT = -1;
      }
      if (Math.abs(cam.fov - fov) > 1e-3) { cam.fov = fov; cam.updateProjectionMatrix(); }
      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - dt * 2.5);
        cam.position.x += (U.fx() - 0.5) * this.shake * 0.4; cam.position.y += (U.fx() - 0.5) * this.shake * 0.4;   // v034 : U.fx (visuel) et non U.rng : une secousse ne doit jamais changer le hasard du gameplay (tirs ennemis)
      }
      cam.updateMatrixWorld();
    }
  }

  CC.CameraRig = CameraRig;
})();

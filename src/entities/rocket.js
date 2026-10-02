/* Roquette du joueur : modèle de vol + capacités + effets visuels.
 * Modèle (ESTIMATION calée sur les mesures) : le nez s'oriente vers la direction visée (vitesse de rotation bornée),
 * la vitesse suit le nez avec une "adhérence", poussée constante, traînée quadratique, traînée induite en virage, gravité. */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;
  const _a = new V(), _b = new V(), _c = new V(), _axis = new V(), _q = new THREE.Quaternion();
  const _d = new V(), _hit = { t: 0, normal: new V() }, _z = new V(0, 0, 1), _rq = new THREE.Quaternion();   // v030 : objets réutilisés

  function rotateToward(vec, target, maxAngle) {
    const ang = vec.angleTo(target);
    if (ang < 1e-6) return 0;
    const step = Math.min(ang, maxAngle);
    _axis.crossVectors(vec, target);
    if (_axis.lengthSq() < 1e-12) { _axis.set(0, 1, 0).cross(vec); if (_axis.lengthSq() < 1e-12) _axis.set(1, 0, 0); }
    _axis.normalize();
    vec.applyAxisAngle(_axis, step).normalize();
    return step;
  }

  class Rocket {
    constructor(game) {
      this.game = game;
      this.cfg = CC.CONFIG.rocket;
      this.acfg = CC.CONFIG.abilities;
      this.mesh = CC.Models.rocket();
      this.mesh.visible = false;
      game.scene.add(this.mesh);
      this.light = new THREE.PointLight('#ff8a2a', 0, 16, 1.4);     // OBSERVÉ : la flamme éclaire les murs en orange
      game.scene.add(this.light);
      this.rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V(), new V()]), new THREE.LineBasicMaterial({ color: '#111111' }));
      this.rope.frustumCulled = false; this.rope.visible = false;
      game.scene.add(this.rope);
      // v034 : bouclier du revive — sphère cyan qui clignote autour de la roquette
      this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: '#39d4ff', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.shieldMesh.visible = false; this.shieldMesh.renderOrder = 6; game.scene.add(this.shieldMesh);
      this.ropePts = new Float32Array(3 * 24);
      this.rope.geometry.setAttribute('position', new THREE.BufferAttribute(this.ropePts, 3));
      this.pos = new V(); this.vel = new V(); this.fwd = new V(0, 0, -1);
      this.active = false;
      this.lastNozzle = new V(); this.emitAcc = 0;
      this.reset();
    }

    reset() {
      this.active = false; this.mesh.visible = false; this.light.intensity = 0; this.rope.visible = false;
      this.age = 0; this.throttle = false; this.ignited = false;
      const L = this.game.level;
      this.fuelMax = (L && L.fuel) || this.cfg.fuelDefault; this.fuel = this.fuelMax;
      this.gauge = 1; this.gaugeShowT = 0; this.retroActive = false;
      this.grapple = { active: false, anchor: new V(), length: 0, t: 0, shootT: 0, point: null };
      this.sliding = 0; this.gForce = 0; this.aLat = 0; this.roll = 0; this.speed = 0;
      this.flightDist = 0;
      this.fbTime = this.cfg.freeBoost; this.shieldT = 0; this.shieldMesh.visible = false;   // v034
    }

    /* Cosmétique équipé (v007) : reconstruit le maillage et la couleur de flamme. */
    setSkin(skin) {
      skin = skin || CC.Skins.get('stock');
      this.skin = skin;
      const scene = this.game.scene;
      scene.remove(this.mesh);
      this.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      this.mesh = CC.Models.rocket(skin);
      this.mesh.position.copy(this.pos);
      this.mesh.visible = this.active;
      scene.add(this.mesh);
      this.light.color.set(skin.flame || '#ff8a2a');
    }

    /* opts (v034) : { speed, ignited, freeBoost } — départ du lanceur du mode CLASSIQUE : vitesse de sortie de rail plus basse,
     * moteur déjà allumé (la charge a eu lieu) et poussée gratuite plus longue : on voit la roquette accélérer. */
    launch(pos, dir, opts) {
      opts = opts || {};
      this.reset();
      this.active = true; this.mesh.visible = true;
      this.pos.copy(pos); this.fwd.copy(dir).normalize();
      const sp = opts.speed !== undefined ? opts.speed : this.cfg.ejectSpeed;
      this.vel.copy(this.fwd).multiplyScalar(sp);   // MESURÉ 31 m/s
      this.speed = sp;
      if (opts.freeBoost !== undefined) this.fbTime = opts.freeBoost;
      if (opts.ignited) this.age = this.cfg.ignitionDelay;   // allumage immédiat au premier pas
      this.lastNozzle.copy(this.nozzle(_a));
      this.updateMesh(0);
    }

    nozzle(out) { return out.copy(this.pos).addScaledVector(this.fwd, -0.55); }
    // v026 : bouts des ailerons et pointe du nez en coordonnées du monde (départ des traînées)
    // v030 : tableau et vecteurs réutilisés d'une image à l'autre (valables jusqu'à l'appel suivant)
    finTips() {
      this.mesh.updateMatrixWorld();
      const src = this.mesh.userData.finTips || [], out = this._tips || (this._tips = []);
      out.length = src.length;
      for (let i = 0; i < src.length; i++) out[i] = this.mesh.localToWorld((out[i] && out[i].isVector3 ? out[i] : new V()).copy(src[i]));
      return out;
    }
    noseTip(out) {
      this.mesh.updateMatrixWorld();
      return this.mesh.localToWorld(out.set(0, 0, this.mesh.userData.noseZ || 0.6));
    }
    // OBSERVÉ (séq. 4) : pendant les rétro-fusées la flamme principale est éteinte
    get thrusting() { return this.active && this.ignited && !this.grapple.active && !this.retroActive && (this.freeBoost || (this.throttle && this.fuel > 0)); }
    // v009 : poussée automatique et gratuite pendant les premières secondes après l'allumage
    get freeBoost() { return this.ignited && this.age < this.cfg.ignitionDelay + this.fbTime; }

    /* Un pas physique. input : { aimDir, retro, grappleHeld } */
    step(dt, input) {
      const cfg = this.cfg, game = this.game, world = game.world;
      this.age += dt;
      if (!this.ignited && this.age >= cfg.ignitionDelay) { this.ignited = true; game.audio.play('ignite', this.pos); }
      let speed = this.vel.length();
      const velDir = _a.copy(this.vel).divideScalar(Math.max(speed, 1e-4));

      // --- orientation du nez ---
      const desired = this.grapple.active && this.grapple.t >= this.grapple.shootT ? velDir : input.aimDir;
      const ang = this.fwd.angleTo(desired);
      const rate = Math.min(cfg.maxTurnRate, cfg.steerGain * ang);
      rotateToward(this.fwd, desired, rate * dt);

      // --- la trajectoire suit le nez (adhérence) ---
      let turned = 0;
      if (!this.grapple.active && this.sliding <= 0 && speed > 1) {
        const grip = this.thrusting ? cfg.grip : cfg.gripEngineOff;
        const newDir = _b.copy(velDir);
        const a = newDir.angleTo(this.fwd);
        turned = rotateToward(newDir, this.fwd, a * U.damp(grip, dt));
        this.vel.copy(newDir).multiplyScalar(speed);
      }
      const aLat = speed * turned / dt;
      // --- forces ---
      if (this.thrusting) {
        this.vel.addScaledVector(this.fwd, cfg.thrust * dt);
        if (!this.freeBoost) this.fuel = Math.max(0, this.fuel - dt * (this.game.endlessRun ? (CC.CONFIG.endless.fuelDrain || 1) * this.game.progress.drainK() : 1));
      }
      speed = this.vel.length();
      if (speed > 1e-4) {
        let loss = cfg.dragK * speed * speed * dt + cfg.inducedDrag * aLat * dt;
        if (this.retroActive) loss += this.acfg.retro.decel * dt;
        if (this.sliding > 0) loss += cfg.slideFriction * dt;
        this.vel.multiplyScalar(Math.max(0, speed - loss) / speed);
      }
      this.vel.y -= CC.CONFIG.physics.gravity * dt;

      // --- grappin ---
      const G = this.grapple;
      let aRope = 0;
      if (G.active) {
        G.t += dt;
        if (G.t >= G.shootT) {
          G.length = Math.max(4, G.length - this.acfg.grapple.reelSpeed * dt);
          const d = _c.subVectors(this.pos, G.anchor);
          const dist = d.length();
          if (dist > G.length) {
            d.divideScalar(dist);
            const radial = this.vel.dot(d);
            if (radial > 0) this.vel.addScaledVector(d, -radial);
            this.pos.copy(G.anchor).addScaledVector(d, G.length);
            const sp = this.vel.length();
            aRope = sp * sp / G.length;
          }
        }
      }

      // --- intégration + collisions ---
      const p1 = _c.copy(this.pos).addScaledVector(this.vel, dt);
      const r = cfg.radius;
      // cibles (OBB mobiles, hors grille)
      for (const t of game.targets) {
        if (!t.alive || t.hitCool > 0) continue;
        if (t.hazard && this.shieldT > 0) continue;   // v034 : le bouclier traverse aussi les drones
        const d = _d.subVectors(p1, this.pos);
        const hit = CC.World.segBox(t.obb, this.pos, d, r + 0.1 + (game.progress && game.progress.hitPad ? game.progress.hitPad() : 0), _hit);   // v082 : PRECISION
        if (hit) { this.pos.addScaledVector(d, hit.t); game.onTargetHit(t, this); return; }
      }
      // v034 : bouclier du revive — la roquette traverse le décor (elle repart au milieu d'un couloir qu'elle n'a pas fini de franchir)
      const hit = world.sweep(this.pos, p1, r);   // v074 : plus de traversée des murs, même protégé
      if (!hit) {
        this.flightDist += this.vel.length() * dt;
        this.pos.copy(p1);
      } else {
        this.resolveHit(hit, p1, dt);
        if (!this.active) return;
      }
      if (this.sliding > 0) this.sliding -= dt;
      this.speed = this.vel.length();
      const gRaw = (Math.max(aLat, aRope)) / 9.81;   // G terrestres : gravité du jeu réduite (v016), affichage et STYLE inchangés
      this.gForce += (gRaw * cfg.gDisplayScale - this.gForce) * U.damp(10, dt);
    }

    resolveHit(hit, p1, dt) {
      const cfg = this.cfg, game = this.game;
      const kind = hit.kind;
      const d = _b.subVectors(p1, this.pos);
      if ((kind === 'glass' || kind === 'brick') && hit.box && hit.box.ref) {
        hit.box.ref.breakApart(game, this.vel.clone());
        this.vel.multiplyScalar(cfg.breakSpeedFactor);
        this.pos.copy(p1);
        game.style.onBreak(kind);
        return;
      }
      if (kind === 'hazard' || kind === 'cable') { this.pos.addScaledVector(d, hit.t); game.onRocketCrash(kind, this.pos.clone(), hit.normal); return; }
      const n = hit.normal;
      const speed = this.vel.length();
      const vDir = _a.copy(this.vel).divideScalar(Math.max(1e-4, speed));
      const impact = Math.asin(U.clamp(-vDir.dot(n), -1, 1)) * 180 / Math.PI;   // angle d'incidence (0 = rasant)
      const maxA = n.y > 0.35 ? cfg.slideMaxAngleDeg : cfg.slideMaxAngleDeg * 0.75;
      if (hit.inside || impact < maxA) {
        // glissade (OBSERVÉ : glisse sur un toit / un sol sans exploser)
        this.pos.addScaledVector(d, hit.t).addScaledVector(n, 0.02 + (hit.inside ? hit.pen : 0));
        const vn = this.vel.dot(n);
        if (vn < 0) this.vel.addScaledVector(n, -vn * 1.05);
        const fn = this.fwd.dot(n);
        if (fn < 0) { this.fwd.addScaledVector(n, -fn).normalize(); }
        this.sliding = 0.12;
        if (hit.ground || n.y > 0.5) game.style.onGroundContact(dt);
        return;
      }
      this.pos.addScaledVector(d, hit.t);
      if (this.shieldT > 0) { this.pos.addScaledVector(n, 0.15); this.vel.addScaledVector(n, -2 * this.vel.dot(n)).multiplyScalar(0.7); return; }   // protégé : on rebondit sur le mur
      game.onRocketCrash('wall', this.pos.clone(), n.clone());
    }

    // ---------- capacités ----------
    tryGrapple(aimDir, camPos) {
      const gc = this.acfg.grapple;
      if (this.grapple.active || this.gauge < gc.useCost || !this.ignited) return false;
      const world = this.game.world;
      let anchor = null, point = null;
      // assistance : disque d'accroche proche du réticule (ESTIMATION)
      let best = Math.cos(U.deg(gc.assistAngleDeg));
      for (const gp of this.game.grapplePoints) {
        const d = _a.subVectors(gp.pos, this.pos);
        const dist = d.length();
        if (dist > gc.range * 1.3 || dist < 3) continue;
        const c = d.divideScalar(dist).dot(aimDir);
        if (c > best) {
          const blocker = world.raycast(this.pos, _a.clone(), dist - 1.0);
          if (!blocker) { best = c; anchor = gp.pos.clone(); point = gp; }
        }
      }
      if (!anchor) {
        const origin = camPos || this.pos;
        const hit = world.raycast(origin, aimDir, gc.range, (b) => b.kind === 'solid' || b.kind === 'brick');
        if (hit && hit.point.distanceTo(this.pos) > 3) anchor = hit.point;
      }
      if (!anchor) return false;
      const G = this.grapple;
      G.active = true; G.anchor.copy(anchor); G.length = anchor.distanceTo(this.pos); G.t = 0; G.shootT = G.length / gc.shootSpeed; G.point = point;
      this.gauge -= gc.useCost; this.gaugeShowT = CC.CONFIG.abilities.gaugeHideDelay;
      this.game.audio.play('grapple', this.pos);
      return true;
    }
    releaseGrapple() {
      if (!this.grapple.active) return;
      this.grapple.active = false;
      this.vel.multiplyScalar(this.acfg.grapple.releaseBoost);
      this.game.audio.play('release', this.pos);
    }

    /* Mise à jour par image : capacités continues, jauge, visuels. */
    frame(dt, input) {
      const ac = this.acfg;
      // rétro-fusées (maintien)
      // hystérésis : une fois vidée, la jauge doit remonter à 15 % avant de réactiver les rétro-fusées
      if (this.gauge <= 0.001) this.retroLock = true; else if (this.gauge > 0.15) this.retroLock = false;
      this.retroActive = input.retro && !this.retroLock && this.ignited;
      if (this.retroActive) { this.gauge = Math.max(0, this.gauge - ac.retro.drain * dt); this.gaugeShowT = ac.gaugeHideDelay; }
      // grappin
      const G = this.grapple;
      if (G.active) {
        this.gauge = Math.max(0, this.gauge - ac.grapple.drainPerSec * dt); this.gaugeShowT = ac.gaugeHideDelay;
        if (!input.grappleHeld || this.gauge <= 0 || G.t > ac.grapple.maxTime) this.releaseGrapple();
      }
      if (!this.retroActive && !G.active) {
        this.gauge = Math.min(1, this.gauge + ac.gaugeRegen * dt);
        this.gaugeShowT = Math.max(0, this.gaugeShowT - dt);
      }
      if (this.shieldT > 0) {
        this.shieldT -= dt;
        // fin du bouclier : on ne le retire jamais tant que la roquette est encore dans un mur (sinon crash immédiat)
        if (this.shieldT <= 0 && this.game.world.sweep(this.pos, this.pos, this.cfg.radius)) this.shieldT = 0.25;
        const blink = this.shieldT > 0.8 || Math.floor(this.shieldT * 12) % 2 === 0;
        this.shieldMesh.visible = this.shieldT > 0 && blink;
        this.shieldMesh.position.copy(this.pos); this.shieldMesh.scale.setScalar(1 + 0.08 * Math.sin(this.age * 25));
      } else this.shieldMesh.visible = false;
      this.updateMesh(dt);
      this.emitEffects(dt);
    }

    updateMesh(dt) {
      this.roll += dt * 2.2;
      // design : jet de tuyère (longueur et éclat suivent l'intensité du moteur, vacillement rapide)
      const J = this.mesh.userData.jet;
      if (J) {
        const k = this.thrustK || 0, f = this.flick === undefined ? 0.5 : this.flick;
        J.group.visible = k > 0.01 || this.retroActive;
        J.core.scale.set(0.85 + 0.3 * f, (0.7 + 0.6 * f) * k, 0.85 + 0.3 * f);
        J.outer.scale.set(0.9 + 0.25 * f, (0.6 + 0.7 * U.fx()) * k, 0.9 + 0.25 * f);
        J.core.material.opacity = J.core.userData.op * k; J.outer.material.opacity = J.outer.userData.op * k * (0.8 + 0.4 * f);
        J.disc.material.color.setRGB(1, 0.75 + 0.2 * k, 0.45 + 0.35 * k);
      }
      _q.setFromUnitVectors(_z, this.fwd);
      this.mesh.quaternion.copy(_q).multiply(_rq.setFromAxisAngle(_z, this.roll));
      this.mesh.position.copy(this.pos);
      // design : micro-vibration du corps sous poussée (quelques millimètres, désynchronisée du vacillement de la flamme)
      const vib = (this.thrustK || 0) * 0.006;
      if (vib > 0) this.mesh.position.add(_c.set((U.fx() - 0.5) * vib, (U.fx() - 0.5) * vib, 0));
      // corde
      const G = this.grapple;
      this.rope.visible = G.active;
      if (G.active) {
        const n = 24, prog = Math.min(1, G.t / Math.max(1e-3, G.shootT));
        const tip = _a.copy(this.pos).lerp(G.anchor, prog);
        const side = _b.crossVectors(this.fwd, new V(0, 1, 0)).normalize();
        for (let i = 0; i < n; i++) {
          const f = i / (n - 1);
          const p = _c.copy(this.pos).lerp(tip, f);
          const wave = prog < 1 ? Math.sin(f * 18 + G.t * 60) * 0.35 * (1 - prog) * Math.sin(f * Math.PI) : 0;   // OBSERVÉ : corde ondulée au tir
          p.addScaledVector(side, wave);
          this.ropePts[i * 3] = p.x; this.ropePts[i * 3 + 1] = p.y; this.ropePts[i * 3 + 2] = p.z;
        }
        this.rope.geometry.attributes.position.needsUpdate = true;
      }
    }

    /* Propulsion (design) : intensité qui monte à l'allumage et retombe à la coupure (thrustK), vacillement lissé (flick),
     * flamme en couches le long du trajet de la tuyère, cœur blanc + étincelles à chaque image, fumée en volume derrière,
     * bouffée à l'allumage et à la coupure, lumière du moteur qui vacille et change de teinte. */
    emitEffects(dt) {
      const fx = this.game.effects, r = U.fx;
      const noz = this.nozzle(new V());
      const on = this.thrusting;
      const was = this.thrustK || 0;
      this.thrustK = on ? Math.min(1, was + dt / 0.12) : Math.max(0, was - dt / 0.18);
      this.flick = U.lerp(this.flick || 0.5, r(), U.damp(28, dt));
      if (on && was === 0) {                                              // allumage : bouffée de flamme et de fumée
        for (let i = 0; i < 10; i++) fx.exhaust(noz, this.fwd, this.vel, 1.3, r());
        for (let i = 0; i < 6; i++) fx.exhaustSmoke(_b.copy(noz).addScaledVector(this.fwd, -r.range(0.2, 0.8)), this.vel, 1.2);
      }
      if (!on && was === 1) {                                             // coupure : petit nuage qui reste en arrière
        for (let i = 0; i < 5; i++) fx.exhaustSmoke(_b.copy(noz).addScaledVector(this.fwd, -r.range(0, 0.5)), this.vel, 0.9);
        this.cutT = 0.6;
      }
      const k = this.thrustK;
      if (k > 0) {
        // flamme : débit fixe (≈ 260 cubes/s), points répartis le long du trajet de la tuyère pendant l'image
        const seg = _a.subVectors(noz, this.lastNozzle);
        const len = seg.length();
        const chainL = this.game.endlessRun ? Math.min(6, this.game.endlessRun.killChain || 0) : 0;   // v066 : la fusée s'enflamme avec la série
        this.emitAcc += dt * 260 * (1 + 0.3 * chainL);
        let n = 0;
        const total = Math.floor(this.emitAcc);
        while (this.emitAcc >= 1 && n < 30) {
          this.emitAcc -= 1; n++;
          fx.exhaust(_b.copy(this.lastNozzle).addScaledVector(seg, n / Math.max(1, total)), this.fwd, this.vel, k * (0.85 + 0.3 * this.flick) * (1 + 0.12 * chainL), this.flick);
        }
        fx.exhaustCore(noz, this.fwd, this.vel, k, dt);
        // fumée : une bouffée tous les 0,32 m, un peu derrière la flamme
        this.smokeAcc = (this.smokeAcc || 0) + len;
        let m = 0;
        while (this.smokeAcc >= 0.32 && m < 20) {
          this.smokeAcc -= 0.32; m++;
          const f = 1 - this.smokeAcc / Math.max(len, 1e-4);
          fx.exhaustSmoke(_b.copy(this.lastNozzle).addScaledVector(seg, U.clamp(f, 0, 1)).addScaledVector(this.fwd, -r.range(0.6, 1.2)), this.vel, k);
        }
        // lumière du moteur : vacille, se réchauffe (orange → jaune) avec l'intensité
        this.light.intensity = (1.7 + 0.7 * this.flick + Math.sin(this.age * 53) * 0.15) * k * (this.game.endlessRun ? 0.5 : 1);   // v034c : lumière de la flamme adoucie dans le CLASSIQUE
        this.light.color.setRGB(1, 0.5 + 0.18 * this.flick, 0.18 + 0.1 * this.flick);
      } else {
        this.emitAcc = 0; this.smokeAcc = 0;
        this.light.intensity = this.retroActive ? 1.2 : 0;
        if (!this.ignited && r() < dt * 70) fx.smokePuff(noz.clone(), this.vel.clone().multiplyScalar(0.1), 0.45, 0.6);
        // après la coupure : filets de fumée de la tuyère encore chaude
        if (this.cutT > 0) { this.cutT -= dt; if (r() < dt * 30) fx.smokePuff(noz.clone(), this.vel.clone().multiplyScalar(0.05), 0.22 * (this.cutT / 0.6) + 0.08, 0.7); }
      }
      this.light.position.copy(noz).addScaledVector(this.fwd, -1.6);   // assez loin derrière : éclaire les murs, pas le corps de la roquette (OBSERVÉ : roquette gris clair)
      if (this.retroActive) {
        const side = _b.crossVectors(this.fwd, new V(0, 1, 0)).normalize();
        for (const s of [-1, 1]) {
          const p = new V().copy(this.pos).addScaledVector(this.fwd, 0.25).addScaledVector(side, s * 0.14);
          fx.retroPuff(p, _c.copy(this.fwd).multiplyScalar(0.85).addScaledVector(side, s * 0.5).normalize());
        }
      }
      this.lastNozzle.copy(noz);
    }
  }

  CC.Rocket = Rocket;
})();

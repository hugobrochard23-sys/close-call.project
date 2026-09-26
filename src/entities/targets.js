/* Cibles, ennemis, objets destructibles, points d'accroche, lasers.
 * IA OBSERVÉE : tourelle du char qui suit la roquette + "!" rouge ; soldat qui tire un missile ; hélicoptère stationnaire. */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;
  const _v = new V(), _v2 = new V();

  function obbFrom(obj, size, center) {
    const q = obj.getWorldQuaternion(new THREE.Quaternion());
    const c = new V().fromArray(center).applyQuaternion(q).add(obj.getWorldPosition(new V()));
    return { c, hx: size[0] / 2, hy: size[1] / 2, hz: size[2] / 2, ux: new V(1, 0, 0).applyQuaternion(q), uy: new V(0, 1, 0).applyQuaternion(q), uz: new V(0, 0, 1).applyQuaternion(q) };
  }

  class Target {
    constructor(type, pos, yawDeg, opts) {
      opts = opts || {};
      this.type = type; this.alive = true; this.t = U.rng() * 10;
      this.object = new THREE.Group();
      this.model = type === 'tank' ? CC.Models.tank() : type === 'heli' ? CC.Models.helicopter(false) : type === 'heliCamo' ? CC.Models.helicopter(true)
        : type === 'truck' ? CC.Models.truck() : CC.Models.house();
      this.object.add(this.model);
      this.object.position.fromArray(pos);
      this.object.rotation.y = U.deg(yawDeg || 0);
      this.base = new V().fromArray(pos);
      this.size = this.model.userData.size; this.center = this.model.userData.center;
      this.detectRange = opts.detectRange || 45;       // ESTIMATION
      this.drift = opts.drift || 0; this.driftSpeed = opts.driftSpeed || 0.35;
      this.alert = CC.Models.alertSprite(); this.alert.visible = false;
      this.alert.position.set(0, this.size[1] + 1.2, 0); this.object.add(this.alert);
      this.dot = CC.Models.targetDot(); this.dot.position.fromArray(this.center); this.object.add(this.dot);
      this.obb = null;
      // v023 : cible qui s'enfuit — suit `opts.path` à `opts.fleeSpeed` m/s dès que la roquette est tirée, puis fait du
      // surplace au bout ; revient au départ quand le niveau recommence
      if (opts.path) {
        this.path = opts.path.map((p) => new V().fromArray(p));
        this.fleeSpeed = opts.fleeSpeed || 30; this.fleeDist = 0;
        this.pathLen = 0; for (let i = 1; i < this.path.length; i++) this.pathLen += this.path[i].distanceTo(this.path[i - 1]);
        this.placeOnPath();
      }
      this.updateObb();
    }
    placeOnPath() {
      let d = Math.min(this.fleeDist, this.pathLen), i = 0;
      while (i < this.path.length - 2 && d > this.path[i].distanceTo(this.path[i + 1])) { d -= this.path[i].distanceTo(this.path[i + 1]); i++; }
      const a = this.path[i], b = this.path[i + 1], seg = _v.subVectors(b, a), len = seg.length();
      this.base.copy(a).addScaledVector(seg, len > 0 ? Math.min(1, d / len) : 0);
      if (len > 0) this.object.rotation.y = Math.atan2(-seg.x, -seg.z);   // le nez dans le sens de la fuite
    }
    updateObb() { this.object.updateMatrixWorld(true); this.obb = obbFrom(this.object, this.size, this.center); }

    update(dt, game) {
      this.t += dt;
      if (!this.alive) return;
      const rk = game.rocket && game.rocket.active ? game.rocket : null;
      if (this.path && game.state === 'FLIGHT' && rk && this.fleeDist < this.pathLen) { this.fleeDist += this.fleeSpeed * dt; this.placeOnPath(); }
      if (this.type === 'heli' || this.type === 'heliCamo') {
        const ud = this.model.userData;
        ud.rotor.rotation.y += dt * 24; ud.tailRotor.rotation.x += dt * 40;
        const side = new V(1, 0, 0).applyAxisAngle(new V(0, 1, 0), this.object.rotation.y);
        this.object.position.copy(this.base).addScaledVector(side, Math.sin(this.t * this.driftSpeed) * this.drift);
        this.object.position.y += Math.sin(this.t * 1.3) * 0.35;
        this.model.rotation.z = Math.sin(this.t * this.driftSpeed) * 0.05;
        this.model.rotation.x = Math.sin(this.t * 0.9) * 0.03;
      }
      if (this.type === 'tank' && rk) {
        const d = _v.copy(rk.pos).sub(this.obb.c);
        const dist = d.length();
        const detected = dist < this.detectRange;
        this.alert.visible = detected;
        if (detected) {
          // tourelle : lacet vers la roquette (repère local du char)
          const local = this.object.worldToLocal(_v2.copy(rk.pos));
          const turret = this.model.userData.turret;
          const want = Math.atan2(-(local.x - turret.position.x), -(local.z - turret.position.z));
          let diff = want - turret.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          turret.rotation.y += U.clamp(diff, -2.2 * dt, 2.2 * dt);
          const horiz = Math.hypot(local.x, local.z);
          const pitch = U.clamp(Math.atan2(local.y - 2.3, horiz), -0.1, 0.6);
          this.model.userData.gun.rotation.x += (pitch - this.model.userData.gun.rotation.x) * U.damp(4, dt);
        }
      }
      if (this.type === 'heli' || this.type === 'heliCamo') this.updateObb();
      // tirs anti-aériens : tanks et hélicoptères, sauf une cible qui s'enfuit (v023 : elle fuit, elle ne se bat pas)
      if (rk && game.state === 'FLIGHT' && !this.path && (this.type === 'tank' || this.type === 'heli' || this.type === 'heliCamo')) this.updateAA(dt, game, rk);
      if (this.alert.visible) this.alert.position.y = this.size[1] + 1.2 + Math.sin(this.t * 6) * 0.1;
    }

    /* v020 : tir anti-aérien. Le tireur doit voir la roquette (pas à travers un bâtiment) et l'avoir suivie un instant ;
     * précision, anticipation, cadence et vitesse dépendent de la menace du niveau (CC.CONFIG.aa). */
    updateAA(dt, game, rk) {
      const A = CC.CONFIG.aa, d = game.aaThreat(), L = (p) => p[0] + (p[1] - p[0]) * d;
      this.aaCool = (this.aaCool || 0) - dt;
      const from = _v2.copy(this.obb.c);
      if (this.type === 'tank') from.addScaledVector(this.obb.uy, this.obb.hy + 0.9); else from.addScaledVector(this.obb.uy, -(this.obb.hy + 0.6));
      const to = _v.subVectors(rk.pos, from);
      const dist = to.length();
      if (dist > L(A.range) || dist < A.minRange) { this.aaSeen = 0; return; }
      to.divideScalar(dist);
      // v021 : ne tire que s'il est devant la roquette (≤ 75° de sa direction) : les missiles arrivent toujours dans le champ
      // de vision du joueur, jamais dans son dos (la caméra regarde devant, un tir par l'arrière serait invisible)
      const sp = rk.vel.length();
      if (sp > 1 && -to.dot(rk.vel) / sp < CC.CONFIG.aa.frontCos) { this.aaSeen = 0; return; }
      if (game.world.raycast(from, to, dist - 1, (b) => b.kind === 'solid' || b.kind === 'brick')) { this.aaSeen = 0; return; }
      this.aaSeen = (this.aaSeen || 0) + dt;
      if (this.aaSeen < L(A.firstDelay)) return;
      // v023 : salves (3 derniers niveaux, AUTOMAP difficile) : plusieurs tirs rapprochés, et un tireur presque rechargé
      // qui voit la roquette ouvre le feu en même temps qu'un autre (tir groupé)
      const salvo = game.aaSalvo(), now = game.telemetry.t;
      if (this.aaCool > 0) {
        const joins = salvo && !this.burst && game.aaVolleyT !== undefined && now - game.aaVolleyT < 0.15 && this.aaCool < A.volleyJoin;
        if (!joins) return;
      }
      if (game.missiles.filter((m) => m.alive).length >= (salvo ? A.maxAliveSalvo : A.maxAlive)) return;
      if (!salvo) this.aaCool = L(A.cooldown);
      else if (this.burst > 0) { this.burst--; this.aaCool = this.burst > 0 ? A.salvoGap : L(A.cooldown) * A.salvoRest; }
      else { this.burst = A.salvoCount - 1; this.aaCool = A.salvoGap; game.aaVolleyT = now; }
      const miss = A.miss[1] + (A.miss[0] - A.miss[1]) * Math.pow(1 - d, A.missCurve);   // la précision progresse dès le milieu du parcours
      game.spawnEnemyMissile(from.clone(), rk, { miss, lead: L(A.lead), turn: L(A.turn), speed: L(A.speed), life: A.life });
    }

    kill() { this.alive = false; this.object.visible = false; }
    reset() {
      this.alive = true; this.object.visible = true; this.alert.visible = false; this.aaCool = 0; this.aaSeen = 0; this.burst = 0;
      if (this.path) { this.fleeDist = 0; this.placeOnPath(); this.object.position.copy(this.base); }
    }
  }

  class Soldier {
    constructor(pos, yawDeg) {
      this.object = CC.Models.soldier();
      this.object.position.fromArray(pos); this.object.rotation.y = U.deg(yawDeg || 0);
      this.alert = CC.Models.alertSprite(); this.alert.position.set(0, 2.8, 0); this.alert.visible = false; this.object.add(this.alert);
      this.range = 120; this.cool = 0; this.seen = 0; this.shots = 0; this.t = 0;
    }
    update(dt, game) {
      this.t += dt;
      const rk = game.rocket && game.rocket.active ? game.rocket : null;
      if (!rk) { this.alert.visible = false; this.seen = 0; return; }
      const d = rk.pos.distanceTo(this.object.position);
      const visible = d < this.range;
      this.alert.visible = visible;
      if (visible) {
        const dx = rk.pos.x - this.object.position.x, dz = rk.pos.z - this.object.position.z;
        this.object.rotation.y = Math.atan2(-dx, -dz);
        this.seen += dt;
        this.cool -= dt;
        if (this.seen > 0.7 && this.cool <= 0 && this.shots < 3) {    // ESTIMATION : délai de réaction 0,7 s, recharge 3,5 s
          this.cool = 3.5; this.shots++;
          const from = this.object.localToWorld(new V(0.3, 1.65, -0.8));
          game.spawnEnemyMissile(from, rk);
        }
      } else this.seen = 0;
      this.alert.position.y = 2.8 + Math.sin(this.t * 6) * 0.1;
    }
    reset() { this.cool = 0; this.seen = 0; this.shots = 0; this.alert.visible = false; }
  }

  class EnemyMissile {
    // opts (v020, tirs anti-aériens) : { miss, lead, turn, speed, life } ; sans opts : missile du soldat, inchangé
    constructor(from, target, opts) {
      this.object = CC.Models.enemyMissile();
      this.pos = from.clone();
      // ESTIMATION : visée imprécise (OBSERVÉ séq. 3 : le missile frôle la roquette sans la toucher)
      const missDist = opts ? opts.miss * (0.7 + U.rng() * 0.6) : 5 + U.rng() * 3;
      this.miss = new V(U.rng() - 0.5, U.rng() * 0.6, U.rng() - 0.5).normalize().multiplyScalar(missDist);
      this.dir = new V().subVectors(target.pos, from).add(this.miss).normalize();
      this.speed = opts ? opts.speed : 48; this.turn = opts ? opts.turn : 0.8; this.life = opts ? opts.life : 5;
      // v023 : tir anti-aérien → phase d'accélération (départ à boostStart × vitesse, pleine vitesse en boostTime s) :
      // à bout portant, le joueur voit partir le missile et a le temps de réagir
      this.vmax = this.speed;
      if (opts) this.speed = this.vmax * CC.CONFIG.aa.boostStart;
      this.lead = opts ? opts.lead : 0; this.fuse = opts ? CC.CONFIG.aa.fuse : 1.0;
      this.alive = true; this.puff = 0;
      this.object.position.copy(this.pos);
    }
    update(dt, game) {
      if (!this.alive) return;
      this.life -= dt;
      const rk = game.rocket && game.rocket.active ? game.rocket : null;
      if (rk) {
        // anticipation : vise où sera la roquette au moment de l'impact (fraction `lead` du temps de vol restant)
        const tHit = rk.pos.distanceTo(this.pos) / this.speed;
        const want = _v.subVectors(rk.pos, this.pos).addScaledVector(rk.vel, tHit * this.lead).add(this.miss).normalize();
        const ang = this.dir.angleTo(want);
        if (ang > 1e-4) this.dir.lerp(want, Math.min(1, this.turn * dt / ang)).normalize();
      }
      if (this.speed < this.vmax) this.speed = Math.min(this.vmax, this.speed + this.vmax * (1 - CC.CONFIG.aa.boostStart) * dt / CC.CONFIG.aa.boostTime);
      const p0 = this.pos.clone();
      this.pos.addScaledVector(this.dir, this.speed * dt);
      this.object.position.copy(this.pos);
      this.object.quaternion.setFromUnitVectors(new V(0, 0, 1), this.dir);
      this.puff -= dt;
      if (this.puff <= 0) { this.puff = 0.018; game.effects.trailPuff(this.pos.clone().addScaledVector(this.dir, -0.4)); }
      // v020 : plus courte distance pendant l'image (mouvement relatif), pas seulement en fin d'image :
      // face à face, les deux engins se rapprochent de plusieurs mètres par image et « sautaient » la détonation
      let closest = Infinity;
      if (rk) {
        const r0 = _v.subVectors(p0, this.lastRk || rk.pos), r1 = _v2.subVectors(this.pos, rk.pos);
        const dr = new V().subVectors(r1, r0), k = dr.lengthSq() > 1e-9 ? U.clamp(-r0.dot(dr) / dr.lengthSq(), 0, 1) : 1;
        closest = r0.addScaledVector(dr, k).length();
        this.lastRk = (this.lastRk || new V()).copy(rk.pos);
      }
      if (rk && closest < this.fuse) { this.alive = false; game.onRocketCrash('missile', this.pos.clone(), this.dir.clone().negate()); return; }
      const hit = game.world.sweep(p0, this.pos, 0.08);
      if (hit || this.life <= 0) { this.alive = false; game.effects.explosion(this.pos.clone(), null, false); game.audio.play('boomSmall', this.pos); }
    }
  }

  class Destructible {
    constructor(builder, o) {
      // o = { p, s, r, kind:'glass'|'glassWarm'|'brick'|'planks' }
      this.kind = o.kind;
      const matKey = o.kind === 'brick' ? 'brick' : o.kind === 'planks' ? 'planks' : o.kind === 'glassWarm' ? 'glassWarm' : 'glass';
      const q = builder.quatFrom(o.r);
      this.object = new THREE.Mesh(builder.soloBoxGeometry(o.s, matKey), builder.mat(matKey));
      this.object.position.fromArray(o.p); this.object.quaternion.copy(q);
      this.object.castShadow = matKey === 'brick' || matKey === 'planks'; this.object.receiveShadow = true;
      this.collider = builder.world.addBox({ center: o.p, size: o.s, quat: q, kind: o.kind === 'planks' ? 'brick' : o.kind === 'glassWarm' ? 'glass' : o.kind, ref: this });
      this.size = new V().fromArray(o.s).applyQuaternion(q); this.size.set(Math.abs(this.size.x), Math.abs(this.size.y), Math.abs(this.size.z));
      this.center = new V().fromArray(o.p);
      this.broken = false;
    }
    breakApart(game, vel) {
      if (this.broken) return;
      this.broken = true; this.object.visible = false; this.collider.active = false;
      game.effects.shatter(this.center, this.size, vel, this.kind);
      game.audio.play(this.kind === 'brick' || this.kind === 'planks' ? 'brick' : 'glass', this.center);
    }
    reset() { this.broken = false; this.object.visible = true; this.collider.active = true; }
  }

  class Laser {
    constructor(builder, a, b) {
      const pa = new V().fromArray(a), pb = new V().fromArray(b);
      const mid = pa.clone().add(pb).multiplyScalar(0.5), dir = pb.clone().sub(pa), len = dir.length();
      dir.normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new V(0, 0, 1), dir);
      this.object = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, len), new THREE.MeshBasicMaterial({ color: '#ff2a1a' }));
      this.object.position.copy(mid); this.object.quaternion.copy(q);
      this.glow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, len), new THREE.MeshBasicMaterial({ color: '#ff3a1a', transparent: true, opacity: 0.25, depthWrite: false }));
      this.object.add(this.glow);
      builder.world.addBox({ center: mid, size: [0.5, 0.5, len], quat: q, kind: 'hazard' });   // ESTIMATION : laser mortel
      this.t = U.rng() * 5;
    }
    update(dt) { this.t += dt; this.glow.material.opacity = 0.18 + 0.1 * Math.sin(this.t * 20); }
  }

  class GrapplePoint {
    constructor(pos, normal, radius) {
      this.pos = new V().fromArray(pos); this.normal = new V().fromArray(normal).normalize();
      this.object = CC.Models.bullseye(radius || 1.6);
      this.object.position.copy(this.pos);
      this.object.quaternion.setFromUnitVectors(new V(0, 1, 0), this.normal);
    }
  }

  class Arrow {
    constructor(pos, yawDeg) { this.object = CC.Models.arrow(); this.base = new V().fromArray(pos); this.object.position.copy(this.base); this.object.rotation.y = U.deg(yawDeg || 0); this.t = 0; }
    update(dt) { this.t += dt; this.object.position.y = this.base.y + Math.sin(this.t * 3) * 0.4; }
  }

  CC.Target = Target; CC.Soldier = Soldier; CC.EnemyMissile = EnemyMissile; CC.Destructible = Destructible;
  CC.Laser = Laser; CC.GrapplePoint = GrapplePoint; CC.Arrow = Arrow;
})();

/* Raccourcis de construction de niveau (ajoutés au LevelBuilder). */
(function () {
  const P = CC.LevelBuilder.prototype;
  P.target = function (type, pos, yaw, opts) { const t = new CC.Target(type, pos, yaw, opts); this.targets.push(t); return this.entity(t); };
  P.soldier = function (pos, yaw) { return this.entity(new CC.Soldier(pos, yaw)); };
  // v021 : ennemi de garde (tank, hélicoptère) : tire et se détruit comme une cible, mais ne compte pas dans l'objectif du niveau
  P.guard = function (type, pos, yaw, opts) {
    const t = new CC.Target(type, pos, yaw, opts);
    t.guard = true; t.dot.visible = false;
    this.targets.push(t);
    return this.entity(t);
  };
  P.glass = function (p, s, r, warm) { const d = new CC.Destructible(this, { p, s, r, kind: warm ? 'glassWarm' : 'glass' }); this.destructibles.push(d); return this.entity(d); };
  P.brickWall = function (p, s, r) { const d = new CC.Destructible(this, { p, s, r, kind: 'brick' }); this.destructibles.push(d); return this.entity(d); };
  P.crate = function (p, s, r) { const d = new CC.Destructible(this, { p, s, r, kind: 'planks' }); this.destructibles.push(d); return this.entity(d); };
  P.laser = function (a, b) { return this.entity(new CC.Laser(this, a, b)); };
  P.grapplePoint = function (pos, normal, radius) { const g = new CC.GrapplePoint(pos, normal, radius); this.grapplePoints.push(g); this.world.addBox({ center: pos, size: [radius * 2 || 3.2, 0.3, radius * 2 || 3.2], quat: g.object.quaternion, kind: 'solid' }); return this.entity(g); };
  P.arrow = function (pos, yaw) { return this.entity(new CC.Arrow(pos, yaw)); };
  /* v023 : flèches vertes le long d'un parcours (niveaux 1 à 3), une tous les `step` m, orientées vers la suite du chemin,
   * légèrement sous la trajectoire et inclinées vers la caméra (lisibles de derrière). Décor : pas de collision. */
  P.guideArrows = function (routes, step) {
    const V = THREE.Vector3, placed = [];
    for (const route of routes) {
      const start = new V().fromArray(route[0]);
      let since = step * 0.6;                        // distance parcourue depuis la dernière flèche
      for (let i = 0; i + 1 < route.length; i++) {
        const a = new V().fromArray(route[i]), seg = new V().fromArray(route[i + 1]).sub(a), len = seg.length();
        if (len < 1e-3) continue;
        seg.divideScalar(len);
        let d = 0;
        while (d + (step - since) <= len) {
          d += step - since; since = 0;
          const p = a.clone().addScaledVector(seg, d).add(new V(0, -2.2, 0));
          if (p.distanceTo(start) < 18 || placed.some((q) => q.distanceTo(p) < step * 0.5)) continue;
          placed.push(p);
          const o = CC.Models.guideArrow();
          o.position.copy(p);
          o.lookAt(p.clone().add(seg));             // lookAt oriente +Z (la pointe) vers la suite du chemin
          o.rotateX(0.6);                           // pointe abaissée, talon relevé : face à la caméra qui suit derrière
          this.entity({ object: o, t: Math.random() * 6, base: p.y, update(dt) { this.t += dt; this.object.position.y = this.base + Math.sin(this.t * 3) * 0.3; } });
        }
        since += len - d;
      }
    }
  };

})();

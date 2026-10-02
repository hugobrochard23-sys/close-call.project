/* Cibles, ennemis, objets destructibles, points d'accroche, lasers.
 * IA OBSERVÉE : tourelle du char qui suit la roquette + "!" rouge ; soldat qui tire un missile ; hélicoptère stationnaire. */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;
  const _v = new V(), _v2 = new V(), _w = new V(), _w2 = new V(), _z = new V(0, 0, 1);

  const _oq = new THREE.Quaternion(), _op = new V();
  // v032 : modèles des cibles du générateur de missions (src/entities/models_gen.js)
  const GEN_MODELS = { radar: () => CC.Models.radar(), fuel: () => CC.Models.fuel(), command: () => CC.Models.command(), sam: () => CC.Models.sam() };
  // Boucle fermée lissée (Catmull-Rom centripète simplifiée, 6 points par côté) : virages d'hélicoptère sans angle vif
  function smoothLoop(P) {
    if (P.length < 3) return P;
    const out = [], n = P.length;
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < 6; k++) {
        const t = k / 6, t2 = t * t, t3 = t2 * t;
        out.push(new V(
          0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
          0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)));
      }
    }
    return out;
  }
  const SOLID = (b) => b.kind === 'solid' || b.kind === 'brick';
  // v030 : met à jour la boîte en place (les hélicoptères la recalculent à chaque image)
  function obbFrom(obj, size, center, out) {
    const q = obj.getWorldQuaternion(_oq);
    const o = out || { c: new V(), ux: new V(), uy: new V(), uz: new V() };
    o.c.fromArray(center).applyQuaternion(q).add(obj.getWorldPosition(_op));
    o.hx = size[0] / 2; o.hy = size[1] / 2; o.hz = size[2] / 2;
    o.ux.set(1, 0, 0).applyQuaternion(q); o.uy.set(0, 1, 0).applyQuaternion(q); o.uz.set(0, 0, 1).applyQuaternion(q);
    return o;
  }

  class Target {
    constructor(type, pos, yawDeg, opts) {
      opts = opts || {};
      this.type = type; this.alive = true; this.t = U.rng() * 10;
      this.object = new THREE.Group();
      // design : variante de teinte par char (tirée de la position : stable d'une partie à l'autre)
      const vr = Math.abs(Math.round(pos[0] * 7 + pos[2] * 3)) % 3;
      this.model = type === 'tank' ? CC.Models.tank(vr) : type === 'heli' ? CC.Models.helicopter(false) : type === 'heliCamo' ? CC.Models.helicopter(true)
        : type === 'truck' ? CC.Models.truck() : GEN_MODELS[type] ? GEN_MODELS[type]() : CC.Models.house();   // v032 : radar, dépôt, poste, lance-missiles
      this.ph = (vr + 1) * 1.7 + pos[0] * 0.13;             // phase propre (micro-mouvements désynchronisés)
      this.object.add(this.model);
      this.object.position.fromArray(pos);
      this.object.rotation.y = U.deg(yawDeg || 0);
      this.base = new V().fromArray(pos);
      const SCL = opts.scale || 1; this.object.scale.setScalar(SCL);   // v067 : cibles agrandies (échelle du modèle ET de la boîte de collision)
      this.size = this.model.userData.size.map((v) => v * SCL); this.center = this.model.userData.center.map((v) => v * SCL);
      this.detectRange = opts.detectRange || 45;       // ESTIMATION
      this.hp = opts.hp || 1; this.hpMax = this.hp; this.boss = !!opts.boss; this.hitCool = 0;   // v075 : boss à plusieurs points de vie
      this.unarmed = !!opts.unarmed;                   // v032 : cible qui vise (tourelle) mais ne tire pas (missions FACILE / MOYEN)
      this.drift = opts.drift || 0; this.driftSpeed = opts.driftSpeed || 0.35;
      this.alert = CC.Models.alertSprite(); this.alert.visible = false;
      this.alert.position.set(0, this.size[1] + 1.2, 0); this.object.add(this.alert);
      this.dot = CC.Models.targetDot(); this.dot.position.fromArray(this.center); this.object.add(this.dot);
      this.obb = null;
      this.yaw0 = this.object.rotation.y; this.yaw = this.yaw0; this.yawW = 0;   // cap (hélicoptère : tourne avec inertie)
      this.hv = new V(); this.ha = new V(); this.prevPos = null; this.att = new V();   // vitesse / accélération lissées → assiette
      this.tw = 0; this.recT = 9; this.puffT = 0; this.dustT = 0; this.fireIdx = 0;
      // v023 : cible qui s'enfuit — suit `opts.path` à `opts.fleeSpeed` m/s dès que la roquette est tirée, puis fait du
      // surplace au bout ; revient au départ quand le niveau recommence
      // v032 : patrouille d'hélicoptère (générateur de missions) — boucle fermée lissée parcourue en continu à patrolSpeed m/s
      if (opts.patrol && opts.patrol.length > 1) {
        this.patrol = smoothLoop(opts.patrol.map((p) => new V().fromArray(p)));
        this.patrolLen = 0; for (let i = 0; i < this.patrol.length; i++) this.patrolLen += this.patrol[i].distanceTo(this.patrol[(i + 1) % this.patrol.length]);
        this.patrolSpeed = opts.patrolSpeed || 8; this.patrol0 = ((opts.patrolPhase || 0) % 1) * this.patrolLen; this.patrolDist = this.patrol0;
        let rad = 0; const c = new V(); for (const p of this.patrol) c.add(p); c.divideScalar(this.patrol.length);
        for (const p of this.patrol) rad = Math.max(rad, p.distanceTo(c));
        this.patrolRadius = rad;
        this.placeOnPatrol();
        this.object.position.copy(this.base);
        this.object.rotation.y = this.yaw = this.yaw0 = this.pathYaw;
      }
      if (opts.path) {
        this.path = opts.path.map((p) => new V().fromArray(p));
        this.fleeSpeed = opts.fleeSpeed || 30; this.fleeDist = 0;
        this.pathLen = 0; for (let i = 1; i < this.path.length; i++) this.pathLen += this.path[i].distanceTo(this.path[i - 1]);
        this.placeOnPath();
        this.object.rotation.y = this.yaw = this.yaw0 = this.pathYaw;
      }
      this.updateObb();
    }
    placeOnPath() {
      let d = Math.min(this.fleeDist, this.pathLen), i = 0;
      while (i < this.path.length - 2 && d > this.path[i].distanceTo(this.path[i + 1])) { d -= this.path[i].distanceTo(this.path[i + 1]); i++; }
      const a = this.path[i], b = this.path[i + 1], seg = _v.subVectors(b, a), len = seg.length();
      this.base.copy(a).addScaledVector(seg, len > 0 ? Math.min(1, d / len) : 0);
      if (len > 0) this.pathYaw = Math.atan2(-seg.x, -seg.z);   // le nez dans le sens de la fuite (atteint avec inertie)
    }
    placeOnPatrol() {
      const P = this.patrol, n = P.length;
      let d = ((this.patrolDist % this.patrolLen) + this.patrolLen) % this.patrolLen, i = 0;
      while (i < n - 1 && d > P[i].distanceTo(P[i + 1])) { d -= P[i].distanceTo(P[i + 1]); i++; }
      const a = P[i], b = P[(i + 1) % n], seg = _v.subVectors(b, a), len = seg.length();
      this.base.copy(a).addScaledVector(seg, len > 0 ? Math.min(1, d / len) : 0);
      if (len > 0) this.pathYaw = Math.atan2(-seg.x, -seg.z);
    }
    // v070 : contour blanc (coque inversée légèrement agrandie) visible quand la roquette est proche
    buildOutline() {
      const mat = Target.outMat || (Target.outMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide, fog: false }));
      const grp = new THREE.Group(), list = [];
      this.model.traverse((o) => { if (o.isMesh && o.geometry && o.material && !o.material.transparent && o.visible) list.push(o); });
      for (const o of list.slice(0, 60)) { const m = new THREE.Mesh(o.geometry, mat); m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale).multiplyScalar(1.09); o.parent.add(m); grp.add(m); }
      this.outline = { set visible(v) { for (const m of grp.children) m.visible = v; }, get visible() { return grp.children.length ? grp.children[0].visible : false; } };
      this.outline.visible = false;
    }
    updateObb() { this.object.updateMatrixWorld(true); this.obb = obbFrom(this.object, this.size, this.center, this.obb); }

    update(dt, game) {
      this.t += dt; if (this.hitCool > 0) this.hitCool -= dt;
      if (!this.alive) { if (this.wreck) this.updateWreck(dt, game); return; }
      const rk = game.rocket && game.rocket.active ? game.rocket : null;
      if (this.path && game.state === 'FLIGHT' && rk && this.fleeDist < this.pathLen) { this.fleeDist += this.fleeSpeed * dt; this.placeOnPath(); }
      if (this.patrol) { this.patrolDist += this.patrolSpeed * dt; this.placeOnPatrol(); }
      if (this.type === 'heli' || this.type === 'heliCamo') this.updateHeli(dt, game, rk);
      if (this.type === 'tank' || this.type === 'sam') this.updateTank(dt, game, rk);
      if (this.type === 'radar') this.model.userData.dish.rotation.y += dt * 1.1;
      if (this.model.userData.beacon) this.model.userData.beacon.visible = (this.t + this.ph) % 1.4 < 0.15;
      if (this.type === 'heli' || this.type === 'heliCamo') this.updateObb();
      else if (!this.path && !this.patrol && this.drift) {   // v070 : les cibles au sol bougent un peu (balancement, léger pivot)
        const sw = Math.sin(this.t * this.driftSpeed + this.ph), yw = this.yaw0 + Math.sin(this.t * 0.6 + this.ph) * 0.05;
        this.object.position.set(this.base.x + Math.cos(this.yaw0) * sw * this.drift, this.base.y, this.base.z - Math.sin(this.yaw0) * sw * this.drift); this.object.rotation.y = yw; this.updateObb();
      }
      if (rk) {
        const dd = rk.pos.distanceTo(this.obb.c);
        if (!this.outline && dd < 120) this.buildOutline();
        if (this.outline) this.outline.visible = (dd < 110 && Math.floor((this.t + this.ph) * 3) % 2 === 0) || dd < 55;   // contour blanc à l'approche
        if (!this.passed && dd < 30) { this.passed = true; if (game.audio) game.audio.play('whoosh', this.object.position); }   // bruit quand on passe à côté
      }
      // tirs anti-aériens : tanks et hélicoptères, sauf une cible qui s'enfuit (v023 : elle fuit, elle ne se bat pas)
      if (rk && game.state === 'FLIGHT' && !this.path && !this.unarmed && (this.type === 'tank' || this.type === 'sam' || this.type === 'heli' || this.type === 'heliCamo')) this.updateAA(dt, game, rk);
      if (this.alert.visible) this.alert.position.y = this.size[1] + 1.2 + Math.sin(this.t * 6) * 0.1;
    }

    /* Design : vol d'hélicoptère. La position suit la même trajectoire qu'avant (gameplay inchangé) mais enrichie de dérives
     * lentes ; l'assiette découle de la vitesse et de l'accélération réellement subies (nez qui pique pour accélérer, qui se
     * cabre pour freiner, inclinaison latérale dans les virages), lissée ; le cap tourne avec inertie (vers la fuite, ou
     * vers la roquette quand l'appareil l'a repérée) ; rotor, feux clignotants, poussière soulevée près du sol. */
    updateHeli(dt, game, rk) {
      const ud = this.model.userData, t = this.t, ph = this.ph;
      ud.rotor.rotation.y += dt * 17; ud.tailRotor.rotation.x += dt * 42;
      ud.blur.material.opacity = 0.08 + 0.03 * Math.sin(t * 11);
      ud.tailBlur.material.opacity = 0.1 + 0.04 * Math.sin(t * 17);
      // position : trajectoire d'origine (dérive latérale + flottement) + petites dérives lentes, hors cible en fuite
      const side = _v.set(Math.cos(this.yaw0), 0, -Math.sin(this.yaw0)), fwd0 = _v2.set(-Math.sin(this.yaw0), 0, -Math.cos(this.yaw0));
      const pos = this.object.position;
      pos.copy(this.base).addScaledVector(side, Math.sin(t * this.driftSpeed) * this.drift);
      if (!this.path) pos.addScaledVector(side, 0.5 * Math.sin(t * 0.37 + ph)).addScaledVector(fwd0, 0.7 * Math.sin(t * 0.23 + ph * 2));
      pos.y += Math.sin(t * 1.3) * 0.3 + 0.35 * Math.sin(t * 0.41 + ph);
      // vitesse et accélération lissées (différences finies)
      if (dt > 0) {
        if (!this.prevPos) this.prevPos = pos.clone();
        const v = _w.subVectors(pos, this.prevPos).divideScalar(dt);
        const hv0 = _w2.copy(this.hv);
        this.hv.lerp(v, U.damp(10, dt));
        this.ha.lerp(hv0.subVectors(this.hv, hv0).divideScalar(dt), U.damp(5, dt));
        this.prevPos.copy(pos);
      }
      // cap : vers la fuite ; sinon vers la roquette repérée (< 170 m) ; sinon cap d'origine avec une légère errance
      let want = this.yaw0 + 0.12 * Math.sin(t * 0.2 + ph), maxW = 0.55;
      if (this.path && this.pathYaw !== undefined && this.hv.lengthSq() > 4) { want = this.pathYaw; maxW = 2.2; }
      else if (rk && rk.pos.distanceTo(pos) < (this.patrol ? 120 : 170)) { const d = _w.subVectors(rk.pos, pos); want = Math.atan2(-d.x, -d.z); }
      else if (this.patrol && this.hv.lengthSq() > 4) { want = this.pathYaw; maxW = 1.4; }   // v032 : en patrouille, nez dans le sens du vol
      let diff = want - this.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const tw = U.clamp(diff * 2.2, -maxW, maxW);
      this.yawW += U.clamp(tw - this.yawW, -1.6 * dt, 1.6 * dt);
      this.yaw += this.yawW * dt;
      this.object.rotation.y = this.yaw;
      // assiette : dans le repère du cap
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const aF = this.ha.x * fx + this.ha.z * fz, aR = this.ha.x * rx + this.ha.z * rz;
      const vF = this.hv.x * fx + this.hv.z * fz;
      const pitch = U.clamp(-(aF * 0.045 + vF * 0.006), -0.32, 0.25) + 0.012 * Math.sin(t * 2.3 + ph);
      const roll = U.clamp(-(aR * 0.05) - this.yawW * Math.min(1, this.hv.length() / 20) * 0.35, -0.4, 0.4) + 0.015 * Math.sin(t * 1.7 + ph * 3);
      this.att.x += (pitch - this.att.x) * U.damp(3, dt); this.att.z += (roll - this.att.z) * U.damp(3, dt);
      this.model.rotation.x = this.att.x; this.model.rotation.z = this.att.z;
      // feux : gyrophare (éclat bref toutes les 1,2 s), feu de queue (double éclat)
      const bk = (t + ph) % 1.2;
      ud.beacon.visible = bk < 0.12;
      const tk = (t * 1.3 + ph) % 1.6;
      ud.lights[2].visible = tk < 0.06 || (tk > 0.16 && tk < 0.22);
      // poussière soulevée par le souffle du rotor, près du sol
      this.dustT -= dt;
      if (this.dustT <= 0 && game.world) {
        this.dustT = 0.22;
        const hit = game.world.raycast(pos, _w.set(0, -1, 0), 24);
        if (hit) {
          const k = 1 - hit.dist / 24, r = U.fx;
          for (let i = 0; i < 3; i++) {
            const a = r() * 6.28, d = r.range(2, 6);
            game.effects.smoke.emit({ pos: _w2.set(pos.x + Math.cos(a) * d, hit.point.y + 0.3, pos.z + Math.sin(a) * d), vel: _w.set(Math.cos(a) * r.range(4, 8), r.range(0.2, 0.8), Math.sin(a) * r.range(4, 8)), life: r.range(0.8, 1.4), s0: 0.4, s1: r.range(1, 1.6) * k, s2: 2 * k, peak: 0.3, cols: game.effects.pal.dust, drag: 1.8, a: 0.3 * k, fin: 0.1, fout: 0.3, wind: 1, turb: 2 });
          }
        }
      }
    }

    /* Design : char. Moteur au ralenti (vibration, fumées d'échappement), tourelle qui suit la roquette avec inertie
     * (vitesse angulaire bornée, accélération bornée), canon à hausse limitée (−5° / +31°), balayage lent quand rien n'est
     * repéré, recul du canon et bascule de la caisse au tir. */
    updateTank(dt, game, rk) {
      const ud = this.model.userData, t = this.t;
      const A = CC.CONFIG.aa, d = game.aaThreat ? game.aaThreat() : 0;
      const trackRange = Math.max(this.detectRange, A.range[0] + (A.range[1] - A.range[0]) * d);
      let tracking = false, dist = Infinity;
      if (rk) { dist = rk.pos.distanceTo(this.obb.c); tracking = dist < trackRange; }
      this.alert.visible = !!rk && dist < this.detectRange;
      const turret = ud.turret;
      let want, maxW, pitch;
      if (tracking) {
        const local = this.object.worldToLocal(_v2.copy(rk.pos));
        want = Math.atan2(-(local.x - turret.position.x), -(local.z - turret.position.z));
        const horiz = Math.hypot(local.x, local.z);
        const el = ud.elev || [-0.09, 0.55];                              // v032 : lance-missiles → rampe plus relevée
        pitch = U.clamp(Math.atan2(local.y - 2.0, horiz), el[0], el[1]);
        maxW = 2.2;
      } else {
        want = 0.55 * Math.sin(t * 0.21 + this.ph); pitch = (ud.elev ? ud.elev[0] + 0.25 : 0.03) + 0.02 * Math.sin(t * 0.3 + this.ph); maxW = 0.35;
      }
      let diff = want - turret.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.aimErr = Math.abs(diff);
      const tw = U.clamp(diff * 3.2, -maxW, maxW);
      this.tw += U.clamp(tw - this.tw, -4.5 * dt, 4.5 * dt);
      turret.rotation.y += this.tw * dt;
      ud.gun.rotation.x += (pitch - ud.gun.rotation.x) * U.damp(3, dt);
      // recul : le tube part d'un coup, revient en 0,7 s ; la caisse bascule vers l'arrière puis se stabilise
      this.recT += dt;
      const rt = this.recT;
      ud.slide.position.z = 0.55 * Math.min(1, rt / 0.03) * Math.exp(-rt * 5);
      ud.body.rotation.x = 0.035 * Math.exp(-rt * 4) * Math.cos(rt * 11);
      ud.body.position.y = 0.01 * Math.sin(t * 41 + this.ph) + 0.004 * Math.sin(t * 7.3);   // moteur au ralenti
      // fumées d'échappement (plus épaisses juste après un tir : le moteur « tire »)
      this.puffT -= dt;
      if (this.puffT <= 0) {
        this.puffT = U.fx.range(0.25, 0.5);
        for (const e of ud.exhausts) {
          const p = this.model.localToWorld(_w.copy(e));
          const back = _w2.set(0, 0.2, 1).applyQuaternion(this.object.quaternion).multiplyScalar(U.fx.range(0.8, 1.6));
          game.effects.darkSmoke.emit({ pos: p, vel: back, life: U.fx.range(0.9, 1.6), s0: 0.1, s1: U.fx.range(0.3, 0.5) * (rt < 1 ? 1.6 : 1), s2: 0.7, peak: 0.3, cols: game.effects.pal.greySmoke, drag: 1.5, a: rt < 1 ? 0.45 : 0.22, fin: 0.1, fout: 0.3, wind: 1, turb: 1.5, spin: 1 });
        }
      }
    }

    // Design : effets de tir (point de départ du missile, éclair de bouche, recul, son, secousse si la roquette est proche)
    firePoint(out) {
      const ud = this.model.userData;
      if (ud.muzzle) { ud.muzzle.updateWorldMatrix(true, false); return ud.muzzle.getWorldPosition(out); }
      const fp = ud.firePoints[this.fireIdx++ % ud.firePoints.length];
      return this.model.localToWorld(out.copy(fp));
    }
    onFire(game, from, rk) {
      const dir = _w.subVectors(rk.pos, from).normalize();
      if (this.type === 'tank' || this.type === 'sam') {
        this.recT = 0;
        const ud = this.model.userData, q = new THREE.Quaternion();
        ud.muzzle.getWorldQuaternion(q);
        const bore = new V(0, 0, -1).applyQuaternion(q);
        game.effects.muzzleFlash(from.clone(), bore, 1);
        game.effects.dustKick(this.object.position.clone().addScaledVector(bore, 3).setY(this.object.position.y + 0.1), null, 0.8);
        game.audio.play(this.type === 'sam' ? 'heliFire' : 'tankFire', from);
      } else {
        game.effects.muzzleFlash(from.clone(), dir.clone(), 0.45);
        game.audio.play('heliFire', from);
      }
      const dist = rk.pos.distanceTo(from);
      if (dist < 45) game.rig.shake = Math.max(game.rig.shake, 0.3 * (1 - dist / 45));
    }

    /* v020 : tir anti-aérien. Le tireur doit voir la roquette (pas à travers un bâtiment) et l'avoir suivie un instant ;
     * précision, anticipation, cadence et vitesse dépendent de la menace du niveau (CC.CONFIG.aa). */
    updateAA(dt, game, rk) {
      const A = CC.CONFIG.aa, d = game.aaThreat(), L = (p) => p[0] + (p[1] - p[0]) * d;
      this.aaCool = (this.aaCool || 0) - dt;
      // point de tir de gameplay (inchangé : visibilité, portée, trajectoire) ; le départ visuel se fait à la bouche du canon
      const from = _v2.copy(this.obb.c);
      if (this.type === 'tank' || this.type === 'sam') from.addScaledVector(this.obb.uy, this.obb.hy + 0.9); else from.addScaledVector(this.obb.uy, -(this.obb.hy + 0.6));
      const to = _v.subVectors(rk.pos, from);
      const dist = to.length();
      if (dist > L(A.range) || dist < A.minRange) { this.aaSeen = 0; return; }
      to.divideScalar(dist);
      // v021 : ne tire que s'il est devant la roquette (≤ 75° de sa direction) : les missiles arrivent toujours dans le champ
      // de vision du joueur, jamais dans son dos (la caméra regarde devant, un tir par l'arrière serait invisible)
      const sp = rk.vel.length();
      if (sp > 1 && -to.dot(rk.vel) / sp < CC.CONFIG.aa.frontCos) { this.aaSeen = 0; return; }
      if (game.world.blocked(from, to, dist - 1, SOLID)) { this.aaSeen = 0; return; }
      this.aaSeen = (this.aaSeen || 0) + dt;
      if (this.aaSeen < L(A.firstDelay)) return;
      // v023 : salves (3 derniers niveaux, AUTOMAP difficile) : plusieurs tirs rapprochés, et un tireur presque rechargé
      // qui voit la roquette ouvre le feu en même temps qu'un autre (tir groupé)
      const salvo = game.aaSalvo(), now = game.telemetry.t;
      if (this.aaCool > 0) {
        const joins = salvo && !this.burst && game.aaVolleyT !== undefined && now - game.aaVolleyT < 0.15 && this.aaCool < A.volleyJoin;
        if (!joins) return;
      }
      const cap = game.level && game.level.aaMaxAlive ? game.level.aaMaxAlive : salvo ? A.maxAliveSalvo : A.maxAlive;   // v032 : plafond du profil de mission
      if (game.missiles.filter((m) => m.alive).length >= cap) return;
      if (!salvo) this.aaCool = L(A.cooldown);
      else if (this.burst > 0) { this.burst--; this.aaCool = this.burst > 0 ? A.salvoGap : L(A.cooldown) * A.salvoRest; }
      else { this.burst = A.salvoCount - 1; this.aaCool = A.salvoGap; game.aaVolleyT = now; }
      const miss = A.miss[1] + (A.miss[0] - A.miss[1]) * Math.pow(1 - d, A.missCurve);   // la précision progresse dès le milieu du parcours
      const muzzle = this.firePoint(new V());
      this.onFire(game, muzzle, rk);
      game.spawnEnemyMissile(from.clone(), rk, { miss, lead: L(A.lead), turn: L(A.turn), speed: L(A.speed), life: A.life, quiet: true, visualFrom: muzzle });
    }

    kill(game) {
      this.alive = false; this.object.visible = false;
      if (game) this.makeWreck(game);
    }

    /* Design : épave. Copie calcinée du modèle (un seul matériau sombre partagé), qui brûle et fume ; char : tourelle
     * arrachée, projetée et retombant à côté ; hélicoptère : chute en vrille avec traînée de fumée, explosion secondaire
     * au sol, puis épave qui brûle. Aucune collision : purement visuel (la cible est déjà détruite). */
    makeWreck(game) {
      const charred = Target.charred || (Target.charred = new THREE.MeshLambertMaterial({ color: '#221f1c' }));
      const obj = this.model.clone(true);
      obj.traverse((o) => { if (o.isMesh) { o.material = o.material.transparent ? o.material : charred; if (o.material.transparent) o.visible = false; } if (o.isSprite) o.visible = false; });
      const root = new THREE.Group();
      root.position.copy(this.object.position); root.quaternion.copy(this.object.quaternion); root.scale.copy(this.object.scale); root.add(obj);
      game.scene.add(root);
      const r = U.fx, W = { root, obj, t: 0, fire: 0, parts: [], kind: this.type, landed: false, vel: new V(), spin: new V() };
      if (this.type === 'tank') {
        const tur = obj.getObjectByName('turret');
        if (tur) {
          tur.updateWorldMatrix(true, false);
          const wp = tur.getWorldPosition(new V()), wq = tur.getWorldQuaternion(new THREE.Quaternion());
          tur.parent.remove(tur);
          const tg = new THREE.Group(); tg.position.copy(wp); tg.quaternion.copy(wq); tg.scale.copy(this.object.scale); tg.add(tur); tur.position.set(0, 0, 0); tur.rotation.set(0, tur.rotation.y, 0);
          game.scene.add(tg);
          W.parts.push({ o: tg, vel: new V(r.range(-3, 3), r.range(10, 14), r.range(-3, 3)), spin: new V(r.range(-4, 4), r.range(-3, 3), r.range(-4, 4)), floor: this.object.position.y + 0.35, done: false });
        }
        obj.rotation.set(r.range(-0.04, 0.04), 0, r.range(-0.05, 0.05)); obj.position.y = -0.12;   // caisse affaissée
      } else if (this.type === 'heli' || this.type === 'heliCamo') {
        W.vel.set(r.range(-3, 3), r.range(1, 3), r.range(-3, 3)); W.spin.set(r.range(-0.6, 0.6), r.range(2.5, 4) * (r() < 0.5 ? -1 : 1), r.range(-0.8, 0.8));
        const hit = game.world.raycast(this.object.position, new V(0, -1, 0), 400);
        W.ground = hit ? hit.point.y : this.object.position.y - 30;
      } else if (this.type === 'house') {
        obj.scale.set(1.05, r.range(0.42, 0.55), 1.05); obj.rotation.set(r.range(-0.05, 0.05), 0, r.range(-0.06, 0.06));   // effondrée
        W.spread = 3;
      } else {
        obj.position.y = -0.1; obj.rotation.set(0, 0, r.range(-0.12, 0.12));
      }
      this.wreck = W;
    }
    updateWreck(dt, game) {
      const W = this.wreck, fx = game.effects, r = U.fx;
      W.t += dt;
      for (const P of W.parts) {                                     // pièces projetées (tourelle)
        if (P.done) continue;
        P.vel.y -= 14 * dt; P.o.position.addScaledVector(P.vel, dt);
        P.o.rotation.x += P.spin.x * dt; P.o.rotation.y += P.spin.y * dt; P.o.rotation.z += P.spin.z * dt;
        if (r() < dt * 40) fx.darkSmoke.emit({ pos: P.o.position, vel: new V(0, 0.8, 0), life: r.range(0.8, 1.4), s0: 0.2, s1: 0.7, s2: 1, peak: 0.3, cols: fx.pal.blackSmoke, drag: 1.5, a: 0.5, fin: 0.1, fout: 0.3, wind: 1, turb: 2 });
        if (P.o.position.y <= P.floor && P.vel.y < 0) {
          P.o.position.y = P.floor; P.done = true;
          P.o.rotation.x = r.range(-0.6, 0.6); P.o.rotation.z = r.range(-0.9, 0.9);
          fx.dustKick(P.o.position.clone(), null, 0.8);
          game.audio.play('brick', P.o.position);
        }
      }
      if ((this.type === 'heli' || this.type === 'heliCamo') && !W.landed) {   // chute en vrille
        W.vel.y -= 11 * dt;
        W.root.position.addScaledVector(W.vel, dt);
        W.obj.rotation.x += W.spin.x * dt; W.obj.rotation.y += W.spin.y * dt; W.obj.rotation.z += W.spin.z * dt;
        const p = W.root.position;
        for (let i = 0; i < 2; i++) fx.darkSmoke.emit({ pos: p, vel: new V(r.range(-0.5, 0.5), r.range(0.5, 1.5), r.range(-0.5, 0.5)), life: r.range(1.2, 2.2), s0: 0.4, s1: r.range(1.2, 1.8), s2: 2.4, peak: 0.3, cols: fx.pal.blackSmoke, drag: 1, a: 0.55, fin: 0.05, fout: 0.3, wind: 1.2, turb: 2, spin: 1 });
        fx.flame.emit({ pos: p, vel: new V(r.range(-1, 1), r.range(0, 2), r.range(-1, 1)), life: r.range(0.15, 0.3), s0: 0.4, s1: 1.1, s2: 0.2, peak: 0.3, cols: fx.pal.fireball, a: 0.8, fout: 0.3, spin: 4 });
        if (p.y <= W.ground + 1.2 || W.t > 6) {
          p.y = Math.max(p.y, W.ground + 0.9); W.landed = true;
          W.obj.rotation.x = r.range(-0.3, 0.3); W.obj.rotation.z = r.range(-1.3, 1.3);
          fx.explosion(p.clone(), new V(0, 1, 0), false, 'orange');
          game.audio.play('boomSmall', p);
        }
        return;
      }
      // épave qui brûle : flammes basses et fumée noire, de moins en moins fortes (≈ 10 s)
      const k = Math.max(0, 1 - W.t / 10);
      if (k <= 0) return;
      const base = W.root.position;
      W.fire += dt * 26 * k;
      while (W.fire > 1) {
        W.fire -= 1;
        const sp = W.spread || 1;
        const p = new V(base.x + r.range(-1.2, 1.2) * sp, base.y + r.range(0.8, 1.8), base.z + r.range(-1.6, 1.6) * sp);
        fx.flame.emit({ pos: p, vel: new V(r.range(-0.4, 0.4), r.range(1.5, 3), r.range(-0.4, 0.4)), life: r.range(0.25, 0.5), s0: 0.25, s1: r.range(0.5, 0.9) * (0.5 + k), s2: 0.1, peak: 0.3, cols: fx.pal.fireball, a: 0.75, fout: 0.3, spin: 3 });
        if (r() < 0.5) fx.darkSmoke.emit({ pos: p.clone().setY(p.y + 1), vel: new V(r.range(-0.3, 0.3), r.range(1.5, 2.8), r.range(-0.3, 0.3)), life: r.range(2, 3.4), s0: 0.4, s1: r.range(1.2, 2), s2: 2.6, peak: 0.35, cols: fx.pal.blackSmoke, drag: 0.6, a: 0.45 * (0.4 + k), fin: 0.1, fout: 0.35, wind: 1.3, turb: 1.5, spin: 0.6 });
      }
    }
    clearWreck(game) {
      if (!this.wreck) return;
      game.scene.remove(this.wreck.root);
      for (const P of this.wreck.parts) game.scene.remove(P.o);
      this.wreck = null;
    }
    reset() {
      if (this.wreck && CC.game) this.clearWreck(CC.game);
      this.alive = true; this.object.visible = true; this.alert.visible = false; this.aaCool = 0; this.aaSeen = 0; this.burst = 0;
      if (this.path) { this.fleeDist = 0; this.placeOnPath(); this.object.position.copy(this.base); this.yaw0 = this.pathYaw; }
      if (this.patrol) { this.patrolDist = this.patrol0; this.placeOnPatrol(); this.object.position.copy(this.base); this.yaw0 = this.pathYaw; }
      this.yaw = this.yaw0; this.yawW = 0; this.object.rotation.y = this.yaw; this.prevPos = null; this.hv.set(0, 0, 0); this.ha.set(0, 0, 0);
      this.tw = 0; this.recT = 9;
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
      // design : décalage purement visuel (bouche du canon → trajectoire réelle), résorbé en 0,25 s
      this.vis = opts && opts.visualFrom ? opts.visualFrom.clone().sub(this.pos) : null; this.age = 0;
      this.object.position.copy(this.pos);
      if (this.vis) this.object.position.add(this.vis);
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
      const p0 = (this._p0 || (this._p0 = new V())).copy(this.pos);   // v030 : vecteurs réutilisés
      this.pos.addScaledVector(this.dir, this.speed * dt);
      this.age += dt;
      this.object.position.copy(this.pos);
      if (this.vis) { const k = 1 - U.smooth(0, 0.25, this.age); if (k > 0) this.object.position.addScaledVector(this.vis, k); else this.vis = null; }
      this.object.quaternion.setFromUnitVectors(_z, this.dir);
      // design : le missile tourne sur lui-même, sa tuyère vacille et grandit pendant la phase d'accélération
      this.spinA = (this.spinA || 0) + dt * 9; this.object.rotateZ(this.spinA);
      const gl = this.object.userData.glow;
      if (gl) { const f = 0.8 + 0.4 * U.fx(); gl.scale.set(f, (0.8 + 0.6 * (this.speed / this.vmax)) * f, f); }
      this.puff -= dt;
      if (this.puff <= 0) { this.puff = 0.018; game.effects.trailPuff(this.object.position.clone().addScaledVector(this.dir, -0.4), this.dir); }
      // v020 : plus courte distance pendant l'image (mouvement relatif), pas seulement en fin d'image :
      // face à face, les deux engins se rapprochent de plusieurs mètres par image et « sautaient » la détonation
      let closest = Infinity;
      if (rk) {
        const r0 = _v.subVectors(p0, this.lastRk || rk.pos), r1 = _v2.subVectors(this.pos, rk.pos);
        const dr = _w.subVectors(r1, r0), k = dr.lengthSq() > 1e-9 ? U.clamp(-r0.dot(dr) / dr.lengthSq(), 0, 1) : 1;
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

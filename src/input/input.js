/* Entrées : souris (pointer lock) + clavier, et pilote automatique pour les tests reproductibles.
 * Contrôles (CHOIX validé) : souris = visée, clic gauche = tir/réapparition, clic droit maintenu = grappin,
 * W,A,S,D (ou Z,Q,S,D, ou flèches) = piloter, G maintenue = moteur (v009, remplace Espace on/off), Maj maintenue = rétro-fusées,
 * R = reset, Échap = menu, Tab = réglages, F1 = touches. */
(function () {
  const U = CC.U;
  const V = THREE.Vector3;

  class Input {
    constructor(game, el) {
      this.game = game; this.el = el;
      this.yaw = 0; this.pitch = 0;
      this.keys = {}; this.edges = {};
      this.fireEdge = false; this.grappleHeld = false; this.grappleEdge = false;
      this.locked = false; this.enabled = true;
      // Z,Q,S,D : `e.code` désigne la position physique de la touche, pas son étiquette (sur un clavier AZERTY,
      // la touche « Z » produit le code KeyW). On enregistre donc à la fois le code et la lettre tapée :
      // le code couvre Z,Q,S,D sur AZERTY, la lettre couvre les dispositions qui placent ces lettres ailleurs.
      const onKey = (e, down) => {
        const k = e.code;
        const codes = [k];
        if (e.key && e.key.length === 1) codes.push('Key' + e.key.toUpperCase());
        if (['Tab', 'F1', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
        for (const c of codes) {
          if (down && !this.keys[c]) this.edges[c] = true;
          this.keys[c] = down;
        }
        if (down) game.onKey(k);
      };
      window.addEventListener('keydown', (e) => onKey(e, true));
      window.addEventListener('keyup', (e) => onKey(e, false));
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('mousedown', (e) => {
        game.audio.init(); game.audio.resume();
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) * (el.width / r.width), y = (e.clientY - r.top) * (el.height / r.height);
        if (game.ui && (game.state === 'MENU' || game.state === 'RESULTS' || game.paused || game.ui.overlay)) {
          if (game.ui.click(x, y)) return;
          if (game.state === 'RESULTS' && e.button === 0) { game.restartLevel(); return; }
          if (game.paused && !game.ui.overlay && e.button === 0) { game.resume(); return; }
          return;
        }
        if (!this.locked && !game.testMode) this.requestLock();
        if (e.button === 0) this.fireEdge = true;
        if (e.button === 2) { this.grappleHeld = true; this.grappleEdge = true; }
      });
      window.addEventListener('mouseup', (e) => { if (e.button === 2) this.grappleHeld = false; });
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        if (game.ui) { game.ui.mouse.x = (e.clientX - r.left) * (el.width / r.width); game.ui.mouse.y = (e.clientY - r.top) * (el.height / r.height); }
      });
      document.addEventListener('mousemove', (e) => {
        if (!this.locked || !this.enabled) return;
        const s = game.settings.sensitivity;
        this.addAim(-e.movementX * s, -e.movementY * s * (game.settings.invertY ? -1 : 1));
      });
      document.addEventListener('pointerlockchange', () => {
        const was = this.locked;
        this.locked = document.pointerLockElement === el;
        if (was && !this.locked) game.onPointerLost();
      });
    }

    requestLock() { try { const p = this.el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignoré */ } }
    exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }

    addAim(dy, dp) {
      this.yaw += dy;
      const lim = U.deg(CC.CONFIG.input.maxPitchDeg);
      this.pitch = U.clamp(this.pitch + dp, -lim, lim);
    }
    setAim(yaw, pitch) { this.yaw = yaw; this.pitch = pitch; }

    // État consommé par le jeu à chaque image.
    poll(dt) {
      const k = this.keys;
      const ar = 1.8 * dt;
      const turnLeft = k.ArrowLeft || k.KeyA || k.KeyQ;    // Q sur AZERTY, A sur QWERTY
      const turnRight = k.ArrowRight || k.KeyD;
      const pitchUp = k.ArrowUp || k.KeyW || k.KeyZ;       // Z sur AZERTY, W sur QWERTY
      const pitchDown = k.ArrowDown || k.KeyS;
      if (turnLeft) this.addAim(ar, 0);
      if (turnRight) this.addAim(-ar, 0);
      if (pitchUp) this.addAim(0, ar);
      if (pitchDown) this.addAim(0, -ar);
      const st = {
        yaw: this.yaw, pitch: this.pitch,
        fire: this.fireEdge, grappleHeld: this.grappleHeld, grappleEdge: this.grappleEdge,
        retro: !!(k.ShiftLeft || k.ShiftRight),
        thrust: !!k.KeyG,
      };
      this.fireEdge = false; this.grappleEdge = false; this.edges = {};
      return st;
    }
  }

  /* Pilote automatique : suit la route du niveau (poursuite pure) en produisant les mêmes commandes qu'un joueur.
   * Sert au protocole de test (enregistrements comparables d'une version à l'autre). */
  class Autopilot {
    constructor(game, level) {
      this.game = game; this.level = level;
      const rt = level.routes ? level.routes[Math.min(game.targetsDone || 0, level.routes.length - 1)] : level.route;
      this.route = (rt || []).map((p) => new V().fromArray(p));
      this.actions = (level.routeActions || []).map((a) => Object.assign({}, a));   // copie : état propre à chaque tentative
      this.idx = 0; this.t = 0; this.fired = false;
      this.yaw = 0; this.pitch = 0;
      this.lookAhead = level.lookAhead || 14;
      this.fireDelay = level.fireDelay !== undefined ? level.fireDelay : 0.35;
    }
    init(yaw, pitch) { this.yaw = yaw; this.pitch = pitch; }
    poll(dt) {
      this.t += dt;
      const g = this.game, rk = g.rocket;
      const st = { yaw: this.yaw, pitch: this.pitch, fire: false, grappleHeld: false, grappleEdge: false, retro: false, thrust: false };
      if (g.state === 'AIM') {
        if (this.route.length > 1) this.aimAt(this.route[1], dt, 4);
        if (this.t > this.fireDelay && !this.fired) { st.fire = true; this.fired = true; }
      } else if (g.state === 'FLIGHT' && rk.active && this.route.length) {
        // point le plus proche (avance monotone) puis point d'anticipation
        const R = this.route;
        let best = this.idx, bd = Infinity;
        for (let i = this.idx; i < Math.min(R.length - 1, this.idx + 6); i++) {
          const d = this.segDist(rk.pos, R[i], R[i + 1]);
          if (d.dist < bd) { bd = d.dist; best = i; }
        }
        this.idx = best;
        // anticipation proportionnelle à la vitesse + compensation du retard de la trajectoire (navigation proportionnelle simplifiée)
        const la = U.clamp(rk.speed * 0.2, 7, this.lookAhead);
        let target = this.pointAhead(rk.pos, la);
        // phase finale : viser directement la cible vivante la plus proche si elle est devant (cibles mobiles)
        // (uniquement la cible visée par cette route : la plus proche de son dernier point)
        let goal = null, gd = 18;
        for (const t of g.targets) { if (!t.alive) continue; const d = t.obb.c.distanceTo(R[R.length - 1]); if (d < gd) { gd = d; goal = t; } }
        if (goal) {
          const to = new V().subVectors(goal.obb.c, rk.pos);
          if (to.length() < (this.level.terminalRange || 40) && to.angleTo(rk.vel) < 1.0 && this.idx >= R.length - 3) target = goal.obb.c.clone();
        }
        const desired = new V().subVectors(target, rk.pos).normalize();
        const vDir = rk.vel.clone().normalize();
        const aim = desired.clone().addScaledVector(new V().subVectors(desired, vDir), this.level.pnGain !== undefined ? this.level.pnGain : 1.3).normalize();
        if (aim.angleTo(desired) > 1.0) aim.copy(desired).lerp(aim, 1.0 / aim.angleTo(desired)).normalize();
        this.aimAt(new V().copy(rk.pos).addScaledVector(aim, 20), dt, 14);
        let wantOff = false;
        for (const a of this.actions) {
          if (a.from !== undefined && this.idx >= a.from && this.idx < a.to) {
            if (a.retro) { if (a._r0 === undefined) a._r0 = this.t; if (!a.hold || this.t - a._r0 < a.hold) st.retro = true; }
            if (a.engineOff) wantOff = true;
            if (a.grapple) {
              if (!a._fired) { st.grappleEdge = true; a._fired = true; a._t0 = this.t; }
              if (!a.hold || this.t - a._t0 < a.hold) st.grappleHeld = true;
            }
          }
        }
        st.thrust = !wantOff;
      }
      st.yaw = this.yaw; st.pitch = this.pitch;
      return st;
    }
    segDist(p, a, b) {
      const ab = new V().subVectors(b, a), t = U.clamp(new V().subVectors(p, a).dot(ab) / ab.lengthSq(), 0, 1);
      return { dist: new V().copy(a).addScaledVector(ab, t).distanceTo(p), t };
    }
    pointAhead(p, dist) {
      const R = this.route;
      let i = this.idx, pr = this.segDist(p, R[i], R[i + 1]);
      let cur = new V().copy(R[i]).lerp(R[i + 1], pr.t);
      let left = dist;
      while (i < R.length - 1) {
        const segLeft = cur.distanceTo(R[i + 1]);
        if (segLeft >= left) return cur.clone().add(new V().subVectors(R[i + 1], cur).setLength(left));
        left -= segLeft; cur = R[i + 1].clone(); i++;
      }
      return R[R.length - 1].clone().add(new V().subVectors(R[R.length - 1], R[Math.max(0, R.length - 2)]).setLength(left));
    }
    aimAt(target, dt, rate) {
      const g = this.game;
      const from = g.state === 'AIM' ? g.launcherEye : g.rocket.pos;
      const d = new V().subVectors(target, from);
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      let dy = yaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      const k = U.damp(rate, dt);
      this.yaw += dy * k; this.pitch += (pitch - this.pitch) * k;
    }
  }

  CC.Input = Input; CC.Autopilot = Autopilot;
})();

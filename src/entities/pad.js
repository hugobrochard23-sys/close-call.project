/* v034 : LANCEUR — l'accueil du mode CLASSIQUE. La roquette est posée sur son rail, sur une plate-forme en surplomb de la rue
 * qu'elle va parcourir : le joueur comprend qu'il suffit de la toucher. Un toucher déclenche la séquence de lancement :
 *
 *   0,00 s  toucher      vibration, clac des verrous, sirène de charge qui monte, feux ambre → rouge, vapeur aux évents
 *   0,00–0,9 charge      la roquette tremble de plus en plus fort, la flamme de veille grossit, la caméra avance (push-in),
 *                        étincelles à la tuyère, les diodes du rail courent vers l'avant
 *   0,90 s  allumage     flash, onde de choc, gros nuage de vapeur et de flammes vers l'arrière, les brides s'ouvrent,
 *                        la roquette quitte le rail, la caméra la suit en travelling (Game.fire → CameraRig handoff)
 *
 * Le décor (la rue infinie du mode CLASSIQUE) est déjà construit derrière : aucun chargement entre le toucher et le vol.
 * Durée totale avant le contrôle : 0,9 s — assez pour ressentir la charge, trop peu pour lasser à la 50e partie. */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;
  const _a = new V(), _b = new V(), _c = new V(), _zero = new V(), _up = new V(0, 1, 0), _dir = new V();

  // disque de lumière doux (dégradé radial) pour le halo derrière la roquette
  function haloTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  class Pad {
    constructor(game) {
      this.game = game; this.cfg = CC.CONFIG.pad;
      this.group = new THREE.Group(); this.group.visible = false; game.scene.add(this.group);
      this.origin = new V(); this.dir = new V(0, 0, -1);
      this.camPos = new V(); this.camLook = new V();
      this.t = 0; this.mode = 'idle';   // idle | charge | fired | reload
      this.charge = 0; this.fireT = 9; this.reloadT = 1;
      this.shake = new V(); this.puffT = 0; this.sparkT = 0;
      this.build();
    }

    build() {
      const K = CC.Models.kit, lam = K.lam, box = K.box, cyl = K.cyl;
      const g = this.group;
      const steel = lam('#454c57'), dark = lam('#262a31'), mid = lam('#5d6572'), light = lam('#8f98a6'), hz = lam('#f2c200'), hz2 = lam('#1d1f23');
      // vue de PROFIL depuis +x : le côté proche (x > 0) reste bas pour ne jamais masquer la roquette ; pylônes, mât radar,
      // bouteilles et fond de baie sont du côté éloigné (x < 0)
      const deck = this.deck = new THREE.Group(); g.add(deck);
      box(2.8, 0.16, 5.6, steel, 0, -0.62, -0.5, deck);
      box(3.0, 0.34, 5.8, dark, 0, -0.85, -0.5, deck);
      for (let i = 0; i < 13; i++) for (const s of [-1, 1]) box(0.16, 0.02, 0.4, i % 2 ? hz2 : hz, s * 1.28, -0.535, -3.0 + i * 0.44, deck);
      for (let i = 0; i < 6; i++) box(0.4, 0.02, 0.16, i % 2 ? hz2 : hz, -1.0 + i * 0.4, -0.535, 2.1, deck);
      // côté proche : caniveau de câbles, petits évents, bornes basses
      box(0.22, 0.09, 4.4, dark, 0.9, -0.5, -0.4, deck); box(0.2, 0.02, 4.4, mid, 0.9, -0.45, -0.4, deck);
      for (const z of [-1.4, 0.4, 1.6]) { box(0.16, 0.16, 0.16, mid, 1.15, -0.45, z, deck); box(0.06, 0.06, 0.06, light, 1.15, -0.35, z, deck); }
      // côté éloigné : pylônes, bouteilles, caisson technique
      this.lamps = [];
      for (const z of [-1.4, 1.0]) {
        box(0.14, 1.55, 0.14, steel, -1.05, 0.15, z, deck);
        box(0.12, 0.08, 0.5, mid, -1.05, 0.9, z, deck);
        box(0.18, 0.18, 0.18, dark, -1.05, 1.0, z, deck);
        const m = new THREE.MeshBasicMaterial({ color: '#ffb020' });
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), m); lamp.position.set(-1.05, 1.14, z); deck.add(lamp); this.lamps.push(m);
        const m2 = new THREE.MeshBasicMaterial({ color: '#ffb020' });
        const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.12), m2); l2.position.set(-0.95, 0.4, z); deck.add(l2); this.lamps.push(m2);
        box(0.08, 0.6, 0.04, dark, -0.98, 0.1, z + 0.09, deck);   // câble qui descend du pylône
      }
      for (const [x, z] of [[-1.15, -0.2], [-1.15, 0.3]]) { cyl(0.15, 0.15, 0.62, lam('#c9ced6'), 12, deck).position.set(x, -0.28, z); cyl(0.16, 0.16, 0.05, lam('#c8342a'), 12, deck).position.set(x, -0.1, z); }
      box(0.5, 0.42, 0.7, mid, -0.98, -0.34, -2.0, deck); box(0.48, 0.05, 0.68, light, -0.98, -0.11, -2.0, deck);
      // mât radar tournant (petit, loin derrière la roquette, côté éloigné)
      box(0.08, 2.2, 0.08, mid, -1.2, 0.5, -2.6, deck);
      this.dish = new THREE.Group(); this.dish.position.set(-1.2, 1.62, -2.6); deck.add(this.dish);
      box(0.5, 0.05, 0.05, light, 0, 0, 0, this.dish); box(0.05, 0.26, 0.05, light, 0.22, 0.12, 0, this.dish);
      // FOND DE BAIE : mur d'acier bleu nuit à panneaux, bandes lumineuses qui courent, halo derrière la roquette
      const wall = new THREE.Group(); g.add(wall);
      box(0.3, 7.5, 12, lam('#182130'), -2.5, 2.0, -0.6, wall);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
        const w = 2.05, z = -0.6 + (c - 2) * 2.35, y = -0.7 + r * 1.55;
        box(0.06, 1.3, w, lam((r + c) % 2 ? '#212c3f' : '#1d2739'), -2.32, y + 0.65, z, wall);
        box(0.05, 0.04, w, lam('#0f1520'), -2.3, y + 1.32, z, wall);
      }
      box(0.36, 0.5, 12, lam('#f2c200'), -2.5, -0.85, -0.6, wall);   // plinthe hachurée (bande jaune)
      for (let i = 0; i < 24; i++) box(0.4, 0.51, 0.5, hz2, -2.5, -0.85, -6.4 + i * 0.52, wall);
      this.strips = [];
      for (let i = 0; i < 12; i++) {
        const m = new THREE.MeshBasicMaterial({ color: '#39d4ff' });
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.2, 0.09), m); st.position.set(-2.28, 0.95, -5.0 + i * 0.95); wall.add(st);
        this.strips.push({ m, i });
      }
      for (const y of [-0.28, 1.65]) { const m = new THREE.MeshBasicMaterial({ color: '#39d4ff' }); const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 11), m); b.position.set(-2.28, y, -0.6); wall.add(b); this.strips.push({ m, i: -1, band: true }); }
      // rail incliné (sous-groupe : suit l'inclinaison de la visée)
      const cradle = this.cradle = new THREE.Group(); g.add(cradle);
      for (const s of [-1, 1]) {
        box(0.075, 0.075, 4.4, steel, s * 0.15, -0.2, -0.75, cradle);
        box(0.02, 0.02, 4.3, dark, s * 0.15, -0.155, -0.75, cradle);
      }
      for (const z of [-2.5, -1.3, -0.1, 0.9]) box(0.4, 0.06, 0.08, mid, 0, -0.245, z, cradle);
      for (const z of [-1.6, 0.15]) for (const s of [-1, 1]) box(0.06, 0.34, 0.06, dark, s * 0.15, -0.4, z, cradle);
      // diodes le long du rail (animées : chenillard qui court vers l'avant)
      this.diodes = [];
      for (let i = 0; i < 10; i++) for (const s of [-1, 1]) {
        const m = new THREE.MeshBasicMaterial({ color: '#39d4ff' });
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.12), m); d.position.set(s * 0.15, -0.15, 0.8 - i * 0.44); cradle.add(d);
        this.diodes.push({ m, i });
      }
      // brides de maintien (s'ouvrent à l'allumage) : deux paires, articulées au rail
      this.clamps = [];
      for (const z of [-0.26, 0.24]) for (const s of [-1, 1]) {
        const arm = new THREE.Group(); arm.position.set(s * 0.145, -0.19, z); cradle.add(arm);
        box(0.035, 0.2, 0.07, mid, 0, 0.1, 0, arm); box(0.06, 0.03, 0.07, light, -s * 0.025, 0.2, 0, arm);
        this.clamps.push({ arm, s });
      }
      // déflecteur de flamme derrière la tuyère (chauffe à l'allumage)
      this.deflMat = new THREE.MeshLambertMaterial({ color: '#2a2d33', emissive: '#000000' });
      const defl = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.07), this.deflMat); defl.position.set(0, 0.1, 1.32); defl.rotation.x = -0.32; cradle.add(defl); defl.userData.noBake = true;   // matériau animé : jamais fusionné
      box(1.1, 0.06, 0.4, dark, 0, -0.32, 1.15, cradle);
      // évents à vapeur (jets) : de part et d'autre du rail
      this.vents = [];
      for (const [x, z] of [[-0.55, 0.85], [0.55, 0.85], [-0.62, -0.7], [0.62, -0.7]]) {
        const v = cyl(0.06, 0.08, 0.14, dark, 8, deck); v.position.set(x, -0.47, z); this.vents.push(new V(x, -0.4, z));
      }
      // halo derrière la roquette (pulse à la charge) : grand disque de lumière cyan, plan face à la caméra
      this.haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(), color: '#39d4ff', transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      this.halo = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), this.haloMat); this.halo.renderOrder = 5; g.add(this.halo);
      // fusion des pièces fixes (peu d'appels de dessin) : les parties animées restent des groupes
      CC.Models.bake(deck, []);
      CC.Models.bake(wall, []);
      CC.Models.bake(cradle, this.clamps.map((c) => c.arm));
    }

    // Place le lanceur au départ d'un niveau CLASSIQUE. Retourne la position de repos de la roquette.
    enter(level) {
      const la = level.launcher, C = this.cfg;
      this.origin.set(la.pos[0], la.pos[1] - 0.1, la.pos[2] + 0.4);
      this.pitch = U.deg(C.pitchDeg);
      this.dir.set(0, Math.sin(this.pitch), -Math.cos(this.pitch));
      this.group.position.copy(this.origin); this.group.visible = true;
      this.cradle.rotation.x = this.pitch;
      this.halo.position.set(-1.9, 0.2, -0.2);
      this.mode = 'reload'; this.reloadT = 0; this.charge = 0; this.t = 0; this.fireT = 9;
      for (const c of this.clamps) c.arm.rotation.z = 0;
      this.deflMat.emissive.setRGB(0, 0, 0);
      const rk = this.game.rocket;
      rk.reset(); rk.pos.copy(this.origin); rk.fwd.copy(this.dir); rk.vel.set(0, 0, 0); rk.speed = 0; rk.thrustK = 0; rk.roll = 0.785;
      this.placeRocket(0);
      this.game.rig.startPad();
      this.updateCamera(0);
      return this.origin;
    }

    hide() { this.group.visible = false; this.mode = 'idle'; }

    // le toucher : début de la charge
    arm() {
      if (this.mode !== 'idle') return false;
      this.mode = 'charge'; this.charge = 0; this.chargeT = 0;
      const g = this.game;
      g.audio.play('padArm');
      if (CC.Haptics) CC.Haptics.pattern('charge');
      return true;
    }

    ready() { return this.mode === 'idle'; }

    // allumage : appelé par Game.fire() au moment du départ
    ignite() {
      this.mode = 'fired'; this.fireT = 0;
      const fx = this.game.effects, o = this.origin, d = this.dir;
      const noz = _a.copy(o).addScaledVector(d, -0.6);
      // souffle vers l'arrière et sur les côtés : nuage de vapeur / fumée, boules de feu, étincelles, onde de choc
      for (let i = 0; i < 46; i++) {
        const side = new V(U.fx.range(-1, 1), U.fx.range(-0.2, 0.9), U.fx.range(0.2, 1)).normalize();
        fx.smoke.emit({ pos: _b.copy(noz).addScaledVector(d, -U.fx.range(0.1, 1.2)).add(_c.set(U.fx.range(-0.3, 0.3), -0.25, U.fx.range(-0.2, 0.4))), vel: side.multiplyScalar(U.fx.range(2, 10)).addScaledVector(d, -U.fx.range(2, 8)),
          life: U.fx.range(0.9, 1.9), s0: 0.2, s1: U.fx.range(0.6, 1.2), s2: U.fx.range(1.2, 2.0), peak: 0.3, cols: fx.pal.smoke, drag: 2.4, a: U.fx.range(0.4, 0.65), fin: 0.05, fout: 0.3, wind: 1, turb: 3, spin: 1.5 });
      }
      for (let i = 0; i < 22; i++) fx.exhaust(noz, d, _zero, 1.8 + U.fx() * 0.8, U.fx());
      for (let i = 0; i < 70; i++) {
        fx.sparks.emit({ pos: noz, vel: _b.copy(d).multiplyScalar(-U.fx.range(6, 26)).add(_c.set(U.fx.range(-1, 1), U.fx.range(-0.2, 1.2), U.fx.range(-1, 1)).multiplyScalar(U.fx.range(3, 9))), life: U.fx.range(0.25, 0.7), s0: U.fx.range(0.03, 0.07), s1: 0.05, s2: 0.01, cols: fx.pal.ember, drag: 1.3, grav: 5, a: 1, fout: 0.4 });
      }
      fx.ring(_b.copy(noz).addScaledVector(d, -0.6), d, 0.3, 4.6, 0.32, '#fff2d0', 0.5);
      fx.flash(_b.copy(noz).addScaledVector(d, -1.0), '#ffd8a0', 7, 22, 0.35, '#ff7020');
      this.game.flash = 0.55; this.game.flashColor = '#ffe8c0';
      this.game.rig.shake = Math.max(this.game.rig.shake, 0.85);
      if (CC.Haptics) CC.Haptics.tick('ignite');
    }

    placeRocket(dt) {
      const rk = this.game.rocket, t = this.t, ch = this.charge;
      const amp = ch * ch * 0.014;
      this.shake.set((U.fx() - 0.5) * amp, (U.fx() - 0.5) * amp, (U.fx() - 0.5) * amp * 0.6);
      rk.pos.copy(this.origin); rk.pos.y += Math.sin(t * 1.7) * 0.004 * (1 - ch); rk.pos.add(this.shake);
      rk.fwd.copy(this.dir);
      rk.mesh.visible = true;
      // flamme de veille : petite au repos, grandit avec la charge (cônes de la tuyère) — mise à jour du maillage (assiette fixe)
      rk.thrustK = this.mode === 'charge' ? 0.12 + 0.75 * ch : this.mode === 'idle' ? 0.05 + 0.03 * Math.sin(t * 9) : 0;
      rk.flick = 0.3 + 0.7 * U.fx();
      const keep = rk.roll; rk.updateMesh(0); rk.roll = keep;   // dt = 0 : le roulis ne tourne pas
      rk.light.position.copy(rk.pos).addScaledVector(this.dir, -1.6);
      rk.light.intensity = this.mode === 'charge' ? (0.4 + 2.2 * ch) * (0.8 + 0.4 * rk.flick) : 0;
      rk.light.color.setRGB(1, 0.5 + 0.2 * rk.flick, 0.2);
    }

    // caméra du lanceur : vue de 3/4 arrière ; dérive lente au repos, avance et tremble pendant la charge
    updateCamera(dt) {
      const C = this.cfg, rig = this.game.rig, o = this.origin, ch = this.charge;
      const sway = Math.sin(this.t * 0.35) * 0.09, sway2 = Math.sin(this.t * 0.23 + 1) * 0.04;
      const p = this.camPos.set(C.cam[0], C.cam[1], C.cam[2]);
      const l = this.camLook.set(C.look[0], C.look[1], C.look[2]);
      // avance vers le point regardé pendant la charge (courbe douce : elle accélère juste avant l'allumage)
      p.lerp(l, C.pushIn * ch * ch * (3 - 2 * ch));
      p.x += sway * 2; p.y += sway2; p.z += sway;
      const s = ch * ch * 0.012;
      p.x += (U.fx() - 0.5) * s; p.y += (U.fx() - 0.5) * s;
      rig.padPos.copy(o).add(p); rig.padLook.copy(o).add(l);
      rig.padFov = C.fov * (1 - 0.1 * ch * ch);
    }

    update(dt) {
      const g = this.game, fx = g.effects, C = this.cfg, rk = g.rocket;
      this.t += dt;
      this.dish.rotation.y += dt * 1.6;
      const charging = this.mode === 'charge';
      if (charging) {
        this.chargeT += dt;
        this.charge = U.clamp(this.chargeT / C.chargeTime, 0, 1);
      } else if (this.mode === 'fired') { this.fireT += dt; this.charge = Math.max(0, this.charge - dt * 4); }
      else if (this.mode === 'reload') {
        // rechargement : la roquette se hisse dans le rail (0,75 s) puis le lanceur est prêt
        this.reloadT += dt;
        const k = U.clamp(this.reloadT / C.reloadTime, 0, 1);
        if (k >= 1) { this.mode = 'idle'; this.charge = 0; if (this.queued) { this.queued = false; g.beginLaunch(); } }
      }
      const ch = this.charge;
      // feux : ambre clignotant au repos, rouge vif et rapide pendant la charge, blanc puis vert à l'allumage
      let col, rate;
      if (this.mode === 'charge') { col = '#ff2a1a'; rate = 6 + 14 * ch; }
      else if (this.mode === 'fired') { col = this.fireT < 0.25 ? '#ffffff' : '#39ff7a'; rate = 0; }
      else { col = '#ffb020'; rate = 1.4; }
      const on = rate === 0 ? 1 : (Math.sin(this.t * rate * Math.PI * 2) > -0.2 ? 1 : 0.15);
      for (let i = 0; i < this.lamps.length; i++) { const l = this.lamps[i]; l.color.set(col); l.color.multiplyScalar(on * (i % 2 ? 0.8 : 1)); }
      // diodes du rail : chenillard bleu ; en charge, le paquet lumineux accélère vers l'avant
      const sp = this.mode === 'charge' ? 3 + 20 * ch : 1.6;
      for (const d of this.diodes) {
        const ph = (d.i * 0.35 - this.t * sp) % 3.5; const k = Math.max(0, 1 - Math.abs(ph - 1.0) * 0.9);
        const base = this.mode === 'fired' ? 0.12 : 0.22;
        d.m.color.setRGB(0.08 + 0.15 * ch + k * 0.3, 0.45 * base + k * 0.85, base + k * 1.0);
        if (this.mode === 'charge') d.m.color.lerp(_b.set(1, 0.45, 0.15), ch * 0.6);
      }
      // bandes du fond de baie : cyan calme au repos, éclairs qui courent vers l'avant pendant la charge, ambre puis éteintes ensuite
      const stS = this.mode === 'charge' ? 2 + 14 * ch : 0.9;
      for (const st of this.strips) {
        if (st.band) { st.m.color.setRGB(0.1 + 0.5 * ch, 0.55 + 0.2 * ch - 0.3 * ch * ch, 1 - 0.4 * ch).multiplyScalar(0.55 + 0.45 * ch); continue; }
        const ph = (st.i * 0.5 - this.t * stS) % 6, k = Math.max(0, 1 - Math.abs(ph - 1.5) * 0.7);
        const base = 0.16 + 0.1 * Math.sin(this.t * 1.3 + st.i);
        st.m.color.setRGB(0.04 + 0.5 * ch * k, (base + k * 0.8) * 0.8, base + k * 1.0);
        if (this.mode === 'charge') st.m.color.lerp(_b.set(1, 0.4, 0.12), ch * 0.5);
        if (this.mode === 'fired') st.m.color.multiplyScalar(Math.max(0.25, 1 - this.fireT * 1.2));
      }
      // brides : s'ouvrent quand la roquette part
      const open = this.mode === 'fired' ? U.smooth(0, 0.18, this.fireT) : 0;
      for (const c of this.clamps) c.arm.rotation.z = c.s * -1.1 * open;
      // déflecteur : rougeoie puis refroidit
      const heat = this.mode === 'fired' ? Math.max(0, 1 - this.fireT / 2.2) : ch * 0.7;
      this.deflMat.emissive.setRGB(0.9 * heat, 0.32 * heat, 0.05 * heat);
      this.haloMat.opacity = 0.16 + 0.55 * ch * ch + (this.mode === 'fired' ? 0.5 * Math.max(0, 1 - this.fireT * 2.4) : 0);
      this.haloMat.color.setRGB(0.22 + 0.78 * ch, 0.83 - 0.35 * ch, 1 - 0.8 * ch);   // cyan de veille → orange chaud à l'allumage
      this.halo.rotation.y = Math.PI / 2;   // fait face à la caméra de profil (+x)
      // vapeur : bouffées calmes au repos, jets continus pendant la charge
      this.puffT -= dt;
      if (this.mode === 'idle' || this.mode === 'reload') {
        if (this.puffT <= 0) { this.puffT = U.fx.range(1.4, 2.6); this.vent(2, 0.55, 0.4); }
      } else if (charging) {
        const n = 1 + Math.floor(ch * 3);
        if (this.puffT <= 0) { this.puffT = 0.05; this.vent(n, 0.9 + ch * 0.9, 1.0 + ch * 1.6); }
        // étincelles à la tuyère dans la seconde moitié de la charge
        if (ch > 0.4 && U.fx() < dt * (30 + 90 * ch)) {
          const noz = _a.copy(rk.pos).addScaledVector(this.dir, -0.56);
          fx.sparks.emit({ pos: noz, vel: _b.copy(this.dir).multiplyScalar(-U.fx.range(3, 9)).add(_c.set(U.fx.range(-1, 1), U.fx.range(0, 1.2), U.fx.range(-1, 1)).multiplyScalar(2)), life: U.fx.range(0.15, 0.4), s0: 0.03, s1: 0.04, s2: 0.01, cols: fx.pal.ember, drag: 1.5, grav: 4, a: 1, fout: 0.4 });
        }
        // flamme de veille : quelques cubes de flamme à la tuyère
        if (U.fx() < dt * 40 * ch) fx.exhaust(_a.copy(rk.pos).addScaledVector(this.dir, -0.6), this.dir, _zero, 0.5 + ch, U.fx());
        // la charge s'entend et se voit : léger tremblement de la caméra, croissant
        g.rig.shake = Math.max(g.rig.shake, ch * ch * 0.16);
      }
      if (this.mode === 'fired' && this.fireT > 2.5) this.mode = 'gone';
      if (this.mode !== 'fired' && this.mode !== 'gone') this.placeRocket(dt);
      this.updateCamera(dt);
    }

    // jets de vapeur des évents : n bouffées par évent, taille et vitesse données
    vent(n, size, speed) {
      const fx = this.game.effects, o = this.origin;
      for (const v of this.vents) {
        for (let i = 0; i < n; i++) {
          _a.copy(v).add(o);
          const s = Math.sign(v.x) || 1;
          fx.smoke.emit({ pos: _a, vel: _b.set(s * U.fx.range(0.6, 1.6) * speed, U.fx.range(1.2, 2.6) * speed, U.fx.range(-0.5, 0.5) * speed), life: U.fx.range(0.7, 1.3), s0: 0.06 * size, s1: U.fx.range(0.16, 0.3) * size, s2: U.fx.range(0.3, 0.5) * size,
            peak: 0.3, cols: fx.pal.whiteSmoke, drag: 2.2, a: U.fx.range(0.35, 0.6), fin: 0.06, fout: 0.3, wind: 1, turb: 2 });
        }
      }
    }
  }

  CC.Pad = Pad;
})();

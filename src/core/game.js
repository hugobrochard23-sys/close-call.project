/* Boucle de jeu et machine à états.
 * BOOT → MENU → AIM (1re personne au lanceur) → FLIGHT → IMPACT (cible) | CRASHED → RESPAWN → AIM … → RESULTS
 * PAUSE et les surcouches SETTINGS / BINDS se superposent à n'importe quel état de jeu. */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;

  const skyVert = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`;
  const skyFrag = `uniform vec3 top, horizon, bottom, sunCol; uniform vec3 sunDir; uniform float sunSize; varying vec3 vDir;
    void main(){ float y = vDir.y; vec3 c = y > 0.0 ? mix(horizon, top, pow(clamp(y, 0.0, 1.0), 0.55)) : mix(horizon, bottom, pow(clamp(-y * 4.0, 0.0, 1.0), 0.6));
      float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0); c += sunCol * (pow(s, 64.0) * 0.6 + pow(s, sunSize) * 0.9);
      gl_FragColor = vec4(c, 1.0); }`;

  class Telemetry {
    constructor() { this.frames = []; this.events = []; this.enabled = false; this.t = 0; }
    event(type, data) { if (this.enabled) this.events.push(Object.assign({ t: +this.t.toFixed(4), type }, data || {})); }
  }

  class Game {
    constructor(root) {
      CC.game = this;
      this.root = root;
      const P = new URLSearchParams(location.search);
      this.params = P;
      this.testMode = P.has('test');
      this.useAutopilot = P.has('autopilot');
      this.debug = P.has('showfps');
      this.showHud = P.get('hud') !== '0';
      U.rng.reseed(parseInt(P.get('seed') || '1234', 10));

      this.canvas = document.createElement('canvas'); this.canvas.className = 'gl';
      this.hudCanvas = document.createElement('canvas'); this.hudCanvas.className = 'hud';
      root.appendChild(this.canvas); root.appendChild(this.hudCanvas);

      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, preserveDrawingBuffer: this.testMode, powerPreference: 'high-performance' });
      this.renderer.shadowMap.enabled = CC.CONFIG.render.shadows;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(CC.CONFIG.camera.fovV, 16 / 9, CC.CONFIG.camera.near, CC.CONFIG.camera.far);
      this.scene.add(this.camera);
      this.postfx = new CC.PostFX(this.renderer);
      this.effects = new CC.Effects(this.scene);
      this.audio = new CC.Audio();
      if (this.testMode || P.has('mute')) this.audio.enabled = false;
      this.telemetry = new Telemetry();
      this.style = new CC.Style(this);
      this.hud = new CC.HUD(this.hudCanvas);
      this.ui = new CC.UI(this);
      this.input = new CC.Input(this, this.hudCanvas);
      this.rig = new CC.CameraRig(this.camera, this);
      this.rocket = new CC.Rocket(this);
      this.world = new CC.World();
      this.targets = []; this.grapplePoints = []; this.entities = []; this.missiles = [];
      this.initEnvironment();
      this.loadSave();
      this.applyCosmetic();
      this.state = 'BOOT'; this.paused = false;
      this.runTime = 0; this.lastSpeed = 0; this.acc = 0; this.fps = 60; this.flash = 0;
      this.shoulder = CC.Models.shoulderLauncher(); this.shoulder.visible = false; this.camera.add(this.shoulder);
      this.tripod = null;
      window.addEventListener('resize', () => this.resize());
      this.resize();
    }

    // ---------- environnement ----------
    initEnvironment() {
      this.skyMat = new THREE.ShaderMaterial({
        vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, sunCol: { value: new THREE.Color() }, sunDir: { value: new V(0, 1, 0) }, sunSize: { value: 900 } },
      });
      this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 24, 16), this.skyMat);
      this.sky.renderOrder = -10; this.sky.frustumCulled = false;
      this.scene.add(this.sky);
      const sg = new THREE.BufferGeometry(), sp = [];
      const r = U.makeRng(5);
      for (let i = 0; i < 700; i++) { const u = r.range(-1, 1), a = r.range(0, 6.283), y = Math.abs(u); const rr = Math.sqrt(1 - y * y); sp.push(Math.cos(a) * rr * 900, y * 900 + 20, Math.sin(a) * rr * 900); }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false }));
      this.stars.frustumCulled = false; this.stars.visible = false;
      this.sky.add(this.stars);
      this.hemi = new THREE.HemisphereLight('#ffffff', '#444444', 0.6); this.scene.add(this.hemi);
      this.ambient = new THREE.AmbientLight('#ffffff', 0.2); this.scene.add(this.ambient);
      this.sun = new THREE.DirectionalLight('#ffffff', 0.8);
      this.sun.castShadow = CC.CONFIG.render.shadows;
      const S = CC.CONFIG.render.shadowRange, sc = this.sun.shadow.camera;
      sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.near = 1; sc.far = 400;
      this.sun.shadow.mapSize.set(CC.CONFIG.render.shadowMapSize, CC.CONFIG.render.shadowMapSize);
      this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.04;
      this.scene.add(this.sun); this.scene.add(this.sun.target);
      this.scene.fog = new THREE.Fog('#ffffff', 50, 800);
    }

    applyEnvironment(env) {
      const u = this.skyMat.uniforms;
      u.top.value.set(env.sky.top); u.horizon.value.set(env.sky.horizon); u.bottom.value.set(env.sky.bottom);
      u.sunCol.value.set(env.sky.sunColor || '#000000'); u.sunDir.value.fromArray(env.sun.dir).normalize(); u.sunSize.value = env.sky.sunSize || 900;
      this.stars.visible = !!env.sky.stars;
      this.scene.fog.color.set(env.fog.color); this.scene.fog.near = env.fog.near; this.scene.fog.far = env.fog.far;
      this.renderer.setClearColor(env.fog.color);
      this.hemi.color.set(env.hemi.sky); this.hemi.groundColor.set(env.hemi.ground); this.hemi.intensity = env.hemi.intensity;
      this.ambient.color.set(env.ambient.color); this.ambient.intensity = env.ambient.intensity;
      this.sun.color.set(env.sun.color); this.sun.intensity = env.sun.intensity;
      this.sunDir = new V().fromArray(env.sun.dir).normalize();
      this.sun.castShadow = CC.CONFIG.render.shadows && env.sun.shadow !== false;
      this.postParams = Object.assign({}, CC.CONFIG.postfx, env.postfx || {});
    }

    // ---------- sauvegarde / réglages ----------
    loadSave() {
      let s = null;
      try { s = JSON.parse(localStorage.getItem('closecall.save') || 'null'); } catch (e) { s = null; }
      this.save = s || { best: {} };
      this.save.best = this.save.best || {};
      // Boutique (v007) : solde en centimes, cosmétiques possédés, cosmétique équipé.
      if (typeof this.save.cash !== 'number') this.save.cash = CC.CONFIG.economy.startCash;
      this.save.owned = this.save.owned || {};
      this.save.owned.stock = true;
      if (!this.save.owned[this.save.equipped]) this.save.equipped = 'stock';
      this.settings = Object.assign({ sensitivity: CC.CONFIG.input.sensitivity, invertY: false, music: CC.CONFIG.audio.music, sfx: CC.CONFIG.audio.sfx, postfx: true }, (s && s.settings) || {});
      if (this.testMode) this.settings.postfx = this.params.get('postfx') !== '0';
    }
    writeSave() {
      if (this.testMode) return;
      this.save.settings = this.settings;
      try { localStorage.setItem('closecall.save', JSON.stringify(this.save)); } catch (e) { /* stockage indisponible */ }
    }
    applySettings() { this.audio.setVolumes(CC.CONFIG.audio.master, this.settings.music, this.settings.sfx); this.writeSave(); }

    // ---------- cosmétiques ----------
    applyCosmetic() { this.rocket.setSkin(CC.Skins.get(this.save.equipped)); }
    buyCosmetic(id) {
      const s = CC.Skins.byId[id];
      if (!s || this.save.owned[id] || this.save.cash < s.price) return false;
      this.save.cash -= s.price;
      this.save.owned[id] = true;
      this.save.equipped = id;
      this.applyCosmetic(); this.writeSave();
      return true;
    }
    equipCosmetic(id) {
      if (!this.save.owned[id]) return false;
      this.save.equipped = id;
      this.applyCosmetic(); this.writeSave();
      return true;
    }

    // ---------- dimensions (16:9 letterbox) ----------
    resize() {
      const w = window.innerWidth, h = window.innerHeight, ar = CC.CONFIG.render.aspect;
      // v017 : téléphone tenu droit → vue pleine largeur, au plus 3:4 (plus haut, l'angle de vue horizontal devient trop étroit)
      this.portrait = !!(CC.Touch && CC.Touch.active) && h > w;
      let cw = w, ch = Math.round(w / ar);
      if (this.portrait) ch = Math.min(h, Math.round(w * CC.CONFIG.render.portraitHeight));
      else if (ch > h) { ch = h; cw = Math.round(h * ar); }
      this.root.style.width = cw + 'px'; this.root.style.height = ch + 'px';
      const pr = this.testMode ? 1 : Math.min(window.devicePixelRatio || 1, CC.CONFIG.render.maxPixelRatio);
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(cw, ch, false);
      this.canvas.style.width = cw + 'px'; this.canvas.style.height = ch + 'px';
      this.hudCanvas.width = Math.round(cw * pr); this.hudCanvas.height = Math.round(ch * pr);
      this.hudCanvas.style.width = cw + 'px'; this.hudCanvas.style.height = ch + 'px';
      this.camera.aspect = cw / ch; this.camera.updateProjectionMatrix();
      this.postfx.setSize(Math.round(cw * pr), Math.round(ch * pr));
    }

    // ---------- niveaux ----------
    unloadLevel() {
      if (this.builder) { this.builder.dispose(); this.builder = null; }
      for (const m of this.missiles) this.scene.remove(m.object);
      this.missiles = []; this.targets = []; this.grapplePoints = []; this.entities = [];
      if (this.tripod) { this.scene.remove(this.tripod); this.tripod = null; }
      this.effects.clear(); this.rocket.reset();
      this.world = new CC.World();
    }

    loadLevel(i) {
      this.generated = false;
      this.loadLevelFrom(CC.Levels[i], i);
    }

    loadLevelFrom(L, i) {
      this.unloadLevel();
      this.level = L; this.levelIndex = i;
      U.levelRng.reseed(L.seed || 7);
      const b = new CC.LevelBuilder(this.scene, this.world, L);
      this.builder = b;
      L.build(b, this);
      b.finish();
      this.targets = b.targets; this.grapplePoints = b.grapplePoints; this.entities = b.entities;
      this.applyEnvironment(L.env);
      const la = L.launcher;
      this.launcherEye = new V().fromArray(la.pos);
      if (la.type === 'tripod') {
        this.tripod = CC.Models.tripodLauncher();
        const fwd = new V(-Math.sin(U.deg(la.yaw)), 0, -Math.cos(U.deg(la.yaw)));
        this.tripod.position.copy(this.launcherEye).addScaledVector(fwd, 2.0); this.tripod.position.y -= 1.6;
        this.tripod.rotation.y = U.deg(la.yaw);
        this.tripod.userData.head.rotation.x = U.deg(la.pitch || 0) * 0.5;
        this.scene.add(this.tripod);
      }
      this.renderer.compile(this.scene, this.camera);
    }

    startLevel(i) {
      this.loadLevel(i);
      this.restartLevel();
      if (!this.testMode) { this.input.requestLock(); this.audio.init(); this.audio.resume(); if (this.audio.music) this.audio.music.start(); }
    }

    /* Carte aléatoire (v007) : graine tirée à chaque appel → une carte différente à chaque clic.
     * Une graine explicite est acceptée (banc de test : rejouer la même carte à l'identique). */
    startGenerated(diffId, seed) {
      if (seed === undefined || seed === null) seed = ((Math.random() * 0x7fffffff) | 0);
      const L = CC.GeneratedLevel(diffId, seed);
      this.loadLevelFrom(L, -1);
      this.generated = true;
      this.restartLevel();
      this.centerMsg = 'GENERATED MAP  ' + (L.difficulty || '').toUpperCase() + '  SEED ' + seed;
      this.centerMsgT = 2.6;
      if (!this.testMode) { this.input.requestLock(); this.audio.init(); this.audio.resume(); if (this.audio.music) this.audio.music.start(); }
    }

    restartLevel() {
      for (const t of this.targets) { t.reset(); t.updateObb(); }
      for (const e of this.entities) if (e.reset && !(e instanceof CC.Target)) e.reset();
      for (const m of this.missiles) this.scene.remove(m.object);
      this.missiles = [];
      this.effects.clear();
      this.style.reset();
      this.runTime = 0; this.targetsDone = 0; this.results = null; this.firstFire = true;
      this.telemetry.event('restart', { level: this.level.id });
      this.enterAim(true);
    }

    enterAim(resetAim) {
      const la = this.level.launcher;
      this.state = 'AIM'; this.centerMsg = null; this.centerMsgT = 0; this.paused = false;
      this.rocket.reset();
      { this.input.setAim(U.deg(la.yaw), U.deg(la.pitch || 0)); if (this.autopilot) this.autopilot.init(U.deg(la.yaw), U.deg(la.pitch || 0)); }
      this.rig.setAim(U.deg(la.yaw), U.deg(la.pitch || 0));
      this.rig.startLauncher(this.launcherEye);
      this.shoulder.visible = la.type !== 'tripod';
      this.shoulder.position.set(0, -0.44, -0.78);
      this.shoulder.rotation.set(this.rig.crossAngle() + 0.04, 0, 0);
      this.aimTime = 0;
      if (this.useAutopilot) { this.autopilot = new CC.Autopilot(this, this.level); this.autopilot.init(U.deg(la.yaw), U.deg(la.pitch || 0)); }
    }

    fire() {
      const dir = this.rig.aimDir.clone();
      const muzzle = this.launcherEye.clone().addScaledVector(dir, this.level.launcher.type === 'tripod' ? 3.2 : 1.3).addScaledVector(this.rig.up, -0.25);
      this.rocket.launch(muzzle, dir);
      this.effects.launchBurst(muzzle.clone(), dir);
      this.audio.play('launch');
      this.rig.startFlight();
      this.state = 'FLIGHT'; this.flightTime = 0;
      this.telemetry.event('fire', { runTime: this.runTime });
    }

    respawn() {
      if (this.level.mode === 'targets') this.enterAim(true);
      else this.restartLevel();
    }

    onTargetHit(t, rocket) {
      const c = t.obb.c.clone();
      t.kill();
      this.targetsDone++;
      const speed = rocket.vel.length();
      this.lastSpeed = 4;                                            // MESURÉ : "SPEED:4" après l'impact
      const variant = this.level.impactVariant || 'orange';
      this.effects.explosion(c, null, true, variant);
      if (variant === 'cyan') { this.flash = 1; this.flashColor = '#dff8ff'; }
      this.rig.startImpact(c); this.rig.shake = 1;
      this.audio.play('boom', c); this.audio.play('target');
      this.style.bombSmash(speed);
      rocket.active = false; rocket.mesh.visible = false; rocket.light.intensity = 0; rocket.rope.visible = false;
      this.telemetry.event('targetHit', { target: t.type, speed: +speed.toFixed(2), runTime: +this.runTime.toFixed(3) });
      const all = this.targets.every((x) => !x.alive);
      if (all) {
        if (this.level.parTime && this.runTime < this.level.parTime && this.level.hud !== 'B') this.style.speedBonus(this.level.parTime - this.runTime);
        this.state = 'IMPACT'; this.impactT = 0; this.complete = true;
      } else {
        this.state = 'IMPACT'; this.impactT = 0; this.complete = false;
      }
    }

    onRocketCrash(kind, pos, normal) {
      if (!this.rocket.active) return;
      const rk = this.rocket;
      this.lastSpeed = 0;
      rk.active = false; rk.mesh.visible = false; rk.light.intensity = 0; rk.rope.visible = false; rk.grapple.active = false;
      this.effects.explosion(pos, normal, false, 'orange');
      this.audio.play('boom', pos);
      this.style.dropCombos();
      this.rig.startImpact(pos); this.rig.shake = 0.8;
      this.state = 'CRASHED'; this.impactT = 0;
      this.telemetry.event('crash', { kind, pos: pos.toArray().map((v) => +v.toFixed(2)), runTime: +this.runTime.toFixed(3) });
    }

    // v020 : niveau de menace des tirs anti-aériens, 0 (premier niveau) → 1 (dernier) ; AUTOMAP : selon la difficulté
    aaThreat() {
      const L = this.level;
      if (!L) return 0;
      if (L.generated) return CC.CONFIG.aaByDifficulty[L.difficulty] !== undefined ? CC.CONFIG.aaByDifficulty[L.difficulty] : 0.5;
      return CC.Levels.length > 1 ? U.clamp(this.levelIndex / (CC.Levels.length - 1), 0, 1) : 0;
    }

    spawnEnemyMissile(from, rocket, opts) {
      const m = new CC.EnemyMissile(from, rocket, opts);
      this.scene.add(m.object); this.missiles.push(m);
      this.audio.play('launch');
      this.telemetry.event('enemyMissile', {});
    }

    finishLevel() {
      const id = this.level.id, best = this.save.best[id];
      const r = { title: this.level.mode === 'targets' ? 'ALL TARGETS DESTROYED' : 'TARGET DESTROYED', time: this.runTime, style: this.style.total, newRecord: false };
      if (!best || this.runTime < best.time) { this.save.best[id] = { time: this.runTime, style: this.style.total }; r.newRecord = !!best || true; }
      r.bestTime = this.save.best[id].time;
      const E = CC.CONFIG.economy;
      r.cash = Math.round(E.levelBase + r.style * E.perStylePoint + (r.newRecord ? E.recordBonus : 0));
      this.save.cash += r.cash;
      this.results = r; this.state = 'RESULTS';
      this.writeSave();
      this.input.exitLock();
      this.telemetry.event('results', { time: r.time, style: r.style });
    }

    toMenu() {
      this.paused = false; this.ui.overlay = null;
      this.input.exitLock();
      if (this.levelIndex === undefined || !this.level) this.loadLevel(0);
      this.state = 'MENU'; this.centerMsg = null; this.rocket.reset(); this.shoulder.visible = false;
      const m = this.level.menuView || { center: this.level.launcher.pos, radius: 40, height: 18 };
      this.rig.startMenu(new V().fromArray(m.center), m.radius, m.height);
    }

    pause() { if (['AIM', 'FLIGHT', 'IMPACT', 'CRASHED', 'RESPAWN'].includes(this.state)) { this.paused = true; this.input.exitLock(); } }
    resume() { this.paused = false; this.ui.overlay = null; if (!this.testMode) this.input.requestLock(); }

    onPointerLost() { if (!this.testMode && !this.ui.overlay && ['AIM', 'FLIGHT', 'IMPACT', 'CRASHED', 'RESPAWN'].includes(this.state)) this.paused = true; }

    onKey(k) {
      this.audio.init(); this.audio.resume();
      const inGame = ['AIM', 'FLIGHT', 'IMPACT', 'CRASHED', 'RESPAWN'].includes(this.state);
      if (k === 'Escape') {
        if (this.ui.overlay) { this.ui.overlay = null; return; }
        if (this.state === 'RESULTS') { this.toMenu(); return; }
        if (inGame) { if (this.paused) this.toMenu(); else this.pause(); }
      } else if (k === 'Tab') {
        this.ui.overlay = this.ui.overlay === 'settings' ? null : 'settings';
        if (this.ui.overlay && inGame) this.pause();
      } else if (k === 'F1') {
        this.ui.overlay = this.ui.overlay === 'binds' ? null : 'binds';
        if (this.ui.overlay && inGame) this.pause();
      } else if (k === 'KeyR' && (inGame || this.state === 'RESULTS')) {
        this.paused = false; this.ui.overlay = null; this.restartLevel(); if (!this.testMode) this.input.requestLock();
      } else if (k === 'KeyN' && this.state === 'RESULTS' && !this.generated && this.levelIndex < CC.Levels.length - 1) {
        this.startLevel(this.levelIndex + 1);
      } else if (k === 'KeyH') { this.showHud = !this.showHud; }
    }

    // ---------- boucle ----------
    update(dt) {
      const inp = (this.useAutopilot && this.autopilot && this.state !== 'MENU') ? this.autopilot.poll(dt) : this.input.poll(dt);
      if (inp.aimQ) this.rig.setAimQ(inp.aimQ);
      else { this.input.setAim(inp.yaw, inp.pitch); this.rig.setAim(inp.yaw, inp.pitch); }   // pilote automatique : lacet / tangage
      const rk = this.rocket;
      switch (this.state) {
        case 'AIM':
          this.aimTime += dt;
          if (inp.fire && this.aimTime > 0.15) this.fire();
          break;
        case 'FLIGHT': {
          this.flightTime += dt;
          if (this.flightTime > 0.2) this.shoulder.visible = false;
          if (inp.thrust !== rk.throttle) { rk.throttle = inp.thrust; this.telemetry.event('engine', { on: rk.throttle }); }
          if (inp.grappleEdge) rk.tryGrapple(this.rig.aimDir, this.camera.position);
          const fdt = CC.CONFIG.physics.fixedDt;
          this.acc += dt;
          let n = 0;
          while (this.acc >= fdt && n < 80) {
            this.acc -= fdt; n++;
            rk.step(fdt, { aimDir: this.rig.aimDir, retro: inp.retro });
            if (!rk.active) break;
          }
          if (rk.active) {
            rk.frame(dt, inp);
            this.lastSpeed = rk.speed;
            const killY = this.level.killY !== undefined ? this.level.killY : -60;
            if (rk.pos.y < killY || rk.pos.length() > 4000) this.onRocketCrash('outOfBounds', rk.pos.clone(), null);
          }
          this.runTime += dt;
          break;
        }
        case 'IMPACT':
          this.impactT += dt;
          if (this.level.mode === 'targets' && !this.complete) this.runTime += dt;
          if (this.complete && this.impactT > 2.2) this.finishLevel();
          else if (!this.complete && this.impactT > 0.5) { this.state = 'RESPAWN'; this.centerMsg = 'PRESS FIRE TO RESPAWN AT LAUNCHER'; }
          break;
        case 'CRASHED':
          this.impactT += dt;
          if (this.level.mode === 'targets') this.runTime += dt;
          if (this.impactT > 0.45) { this.state = 'RESPAWN'; this.centerMsg = 'PRESS FIRE TO RESPAWN AT LAUNCHER'; }
          break;
        case 'RESPAWN':
          if (this.level.mode === 'targets') this.runTime += dt;
          if (inp.fire || (this.useAutopilot && this.impactT > 1.2)) this.respawn();
          this.impactT += dt;
          break;
      }
      for (const e of this.entities) if (e.update) e.update(dt, this);
      for (const m of this.missiles) m.update(dt, this);
      this.missiles = this.missiles.filter((m) => { if (!m.alive) this.scene.remove(m.object); return m.alive; });
      if (this.centerMsgT > 0 && (this.centerMsgT -= dt) <= 0) { this.centerMsg = null; this.centerMsgT = 0; }   // message passager (graine de la carte générée)
      if (this.state === 'FLIGHT') this.style.update(dt, rk); else this.style.update(dt, null);
      this.effects.update(dt, this.camera);
      this.rig.update(dt);
      this.audio.updateRocket(rk, dt);
      this.flash = Math.max(0, this.flash - dt * 7);
      this.telemetry.t += dt;
    }

    render(time) {
      // lumière du soleil et ombres centrées sur la zone d'intérêt
      const focus = this.rocket.active ? this.rocket.pos : this.camera.position;
      this.sun.position.copy(focus).addScaledVector(this.sunDir, 150);
      this.sun.target.position.copy(focus);
      this.sky.position.copy(this.camera.position);
      if (this.settings.postfx && this.postParams) {
        this.postParams.flash = this.flash * 0.85; this.postParams.flashColor = this.flashColor || '#ffffff';
        this.postfx.render(this.scene, this.camera, this.postParams, time);
      } else {
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);
      }
    }

    tick(dt) {
      if (!this.paused && this.state !== 'BOOT') this.update(dt);
      else { this.input.poll(0); this.rig.update(0); }
      this.render(performance.now() / 1000);
      this.hud.draw(this, dt);
      if (this.telemetry.enabled) this.recordFrame();
    }

    recordFrame() {
      const rk = this.rocket, f = { t: +this.telemetry.t.toFixed(4), state: this.state, run: +this.runTime.toFixed(3), style: this.style.total };
      if (rk.active) {
        f.pos = rk.pos.toArray().map((v) => +v.toFixed(2)); f.speed = +rk.speed.toFixed(2); f.thrust = rk.thrusting; f.g = +rk.gForce.toFixed(2); f.gauge = +rk.gauge.toFixed(3); f.fuel = +rk.fuel.toFixed(2);
        const n = rk.nozzle(new V()).project(this.camera);
        f.nozzle = [+(n.x * 0.5 + 0.5).toFixed(4), +(0.5 - n.y * 0.5).toFixed(4)];
        f.cam = this.camera.position.toArray().concat(this.camera.quaternion.toArray()).map((v) => +v.toFixed(4));   // pose caméra (mesures de stabilité)
      }
      this.telemetry.frames.push(f);
    }

    start() {
      if (this.testMode) { this.initTestHarness(); return; }
      this.toMenu();
      let last = performance.now(), fpsAcc = 0, fpsN = 0;
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { this.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
        this.tick(dt);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    // ---------- banc de test (enregistrements déterministes) ----------
    initTestHarness() {
      const P = this.params;
      const fps = parseFloat(P.get('fps') || CC.CONFIG.test.fps);
      const lv = Math.max(0, Math.min(CC.Levels.length - 1, parseInt(P.get('level') || '1', 10) - 1));
      this.telemetry.enabled = true;
      // ?gen=easy|medium|hard&seed=N : carte aléatoire reproductible (enregistrable comme les niveaux fixes)
      if (P.get('gen')) {
        this.loadLevelFrom(CC.GeneratedLevel(P.get('gen'), parseInt(P.get('seed') || '4242', 10)), -1);
        this.generated = true;
        this.restartLevel();
      } else this.startLevel(lv);
      const self = this;
      CC.harness = {
        ready: true, fps,
        step(n) { for (let i = 0; i < (n || 1); i++) self.tick(1 / fps); return self.telemetry.frames[self.telemetry.frames.length - 1]; },
        state() { return { state: self.state, runTime: self.runTime, style: self.style.total, done: self.state === 'RESULTS' }; },
        telemetry() { return { frames: self.telemetry.frames, events: self.telemetry.events, level: self.level.id, version: CC.CONFIG.version }; },
        // image composée (3D + HUD) : évite de dépendre du compositeur du navigateur pour les enregistrements
        capture() {
          const c = this._cap || (this._cap = document.createElement('canvas'));
          c.width = self.canvas.width; c.height = self.canvas.height;
          const g = c.getContext('2d');
          g.drawImage(self.canvas, 0, 0, c.width, c.height);
          g.drawImage(self.hudCanvas, 0, 0, c.width, c.height);
          return c.toDataURL('image/png');
        },
      };
      this.tick(0);
    }
  }

  CC.Game = Game;
})();

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

  CC.INGAME = ['AIM', 'LAUNCH', 'FLIGHT', 'IMPACT', 'CRASHED', 'RESPAWN', 'REVIVE'];   // v034 : états où l'on « joue »

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
      this.genDebug = P.has('gendebug');                 // v032 : vue de débogage du générateur de missions (touche G)
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
      this.audio = new CC.Audio(); this.audio.cam = this.camera;   // design : atténuation des sons avec la distance
      if (this.testMode || P.has('mute')) this.audio.enabled = false;
      this.telemetry = new Telemetry();
      this.style = new CC.Style(this);
      this.hud = new CC.HUD(this.hudCanvas);
      this.ui = new CC.UI(this);
      this.ads = new CC.Ads(this);   // v030 : publicités d'exemple (src/ui/ads.js)
      this.input = new CC.Input(this, this.hudCanvas);
      this.rig = new CC.CameraRig(this.camera, this);
      this.rocket = new CC.Rocket(this);
      this.trails = new CC.Trails(this);   // v026
      this.world = new CC.World();
      this.targets = []; this.grapplePoints = []; this.entities = []; this.missiles = [];
      this.initEnvironment();
      this.loadSave();
      this.progress = new CC.Progress(this);   // v034 : XP, niveaux, missions
      this.pad = new CC.Pad(this);             // v034 : lanceur (accueil du mode CLASSIQUE)
      this.shadow = new CC.RocketShadow(this); // v034 : ombre de la roquette
      this.hudFeed = []; this.flyers = []; this.boostK = 0; this.padMode = false; this.fadeIn = 0; this.reviveUsed = false; this.progTick = 0; this.cellBump = 0; this.cellHap = 0; this.cellSnd = 0;
      // v023 : volumes enregistrés (SOUND / MUSIC sur OFF) appliqués dès le démarrage, avant même que le son soit créé
      this.audio.setVolumes(CC.CONFIG.audio.master, this.settings.music, this.settings.sfx);
      this.applyCosmetic();
      // v031 : retour d'un paiement Stripe (?paid=1&utm_content=<cosmétique>) → cosmétique débloqué, message dans le menu
      if (!this.testMode && CC.Shop.handleReturn) { const msg = CC.Shop.handleReturn(this); if (msg) { this.notice = msg; this.noticeT = 6; } }
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
      this.sun.castShadow = CC.CONFIG.render.shadows && env.sun.shadow !== false && this.shadowsAllowed !== false;
      this.postParams = Object.assign({}, CC.CONFIG.postfx, env.postfx || {});
    }

    // ---------- sauvegarde / réglages ----------
    loadSave() {
      let s = null;
      // Clé d'avant le changement de nom : reprise une seule fois pour ne pas perdre la progression des joueurs.
      try { s = JSON.parse(localStorage.getItem('coldimpact.save') || localStorage.getItem('closecall.save') || 'null'); } catch (e) { s = null; }
      this.save = s || { best: {} };
      this.save.best = this.save.best || {};
      // Boutique (v007) : solde en centimes, cosmétiques possédés, cosmétique équipé.
      this.save.owned = this.save.owned || {};
      this.save.owned.stock = true;
      if (!this.save.owned[this.save.equipped]) this.save.equipped = 'stock';
      this.settings = Object.assign({ sensitivity: CC.CONFIG.input.sensitivity, invertY: false, music: CC.CONFIG.audio.music, sfx: CC.CONFIG.audio.sfx, postfx: true, graphics: 'auto' }, (s && s.settings) || {});
      if (this.testMode) this.settings.postfx = this.params.get('postfx') !== '0';
    }
    writeSave() {
      if (this.testMode) return;
      this.save.settings = this.settings;
      try { localStorage.setItem('coldimpact.save', JSON.stringify(this.save)); } catch (e) { /* stockage indisponible */ }
    }
    applySettings() { this.audio.setVolumes(CC.CONFIG.audio.master, this.settings.music, this.settings.sfx); this.writeSave(); }

    // ---------- cosmétiques ----------
    applyCosmetic() { this.rocket.setSkin(CC.Skins.get(this.save.equipped)); }
    // v031 : débloque un cosmétique (paiement Stripe confirmé par le retour, ou minute de publicité regardée) et l'équipe
    unlockCosmetic(id) {
      const s = CC.Skins.byId[id];
      if (!s || this.save.owned[id]) return false;
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
      // v022 : écran tactile → plein écran (couché comme debout) ; ordinateur → zone 16:9 centrée
      const touch = !!(CC.Touch && CC.Touch.active);
      this.portrait = touch && h > w;
      let cw = w, ch = Math.round(w / ar);
      if (touch) {
        // la page peut réserver des marges pour l'encoche et la barre d'accueil (padding du document) : on les déduit,
        // sinon le bas du jeu (jauge d'essence) passe sous le bord de l'écran
        const cs = getComputedStyle(document.documentElement);
        ch = Math.max(1, h - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0));
      }
      else if (ch > h) { ch = h; cw = Math.round(h * ar); }
      this.root.style.width = cw + 'px'; this.root.style.height = ch + 'px';
      const pr = this.testMode ? 1 : Math.min(window.devicePixelRatio || 1, CC.CONFIG.render.maxPixelRatio);
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(cw, ch, false);
      this.canvas.style.width = cw + 'px'; this.canvas.style.height = ch + 'px';
      this.hudCanvas.width = Math.round(cw * pr); this.hudCanvas.height = Math.round(ch * pr);
      this.hudCanvas.style.width = cw + 'px'; this.hudCanvas.style.height = ch + 'px';
      this.camera.aspect = cw / ch;
      // debout, l'écran est étroit : on élargit la vue verticale pour garder un angle horizontal suffisant (v022)
      const fovV = CC.CONFIG.camera.fovV, minH = touch ? CC.CONFIG.input.touch.fovMinH : 0;
      const needV = 2 * Math.atan(Math.tan(U.deg(minH) / 2) / this.camera.aspect) * 180 / Math.PI;
      this.camera.fov = this.baseFov = Math.min(100, Math.max(fovV, needV));   // baseFov : sans le zoom du boost (v026)
      if (this.rig) this.rig.zoom = 1;
      this.camera.updateProjectionMatrix();
      this.postfx.setSize(Math.round(cw * pr), Math.round(ch * pr));
    }

    // ---------- niveaux ----------
    unloadLevel() {
      if (this.endlessRun) { this.endlessRun.dispose(); this.endlessRun = null; }   // v033 : tronçons du couloir infini
      if (this.builder) { this.builder.dispose(); this.builder = null; }
      for (const m of this.missiles) this.scene.remove(m.object);
      for (const t of this.targets) if (t.clearWreck) t.clearWreck(this);   // design : épaves ajoutées à la scène
      this.missiles = []; this.targets = []; this.grapplePoints = []; this.entities = [];
      if (this.tripod) { this.scene.remove(this.tripod); this.tripod = null; }
      this.effects.clear(); this.rocket.reset(); this.trails.clear();
      this.pad.hide(); this.padMode = false; this.shadow.mesh.visible = false;
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
      // v023 : niveaux 1 à 3 → flèches vertes le long du chemin (à partir du 4e, les points rouges suffisent)
      if (this.guideLevel(i, L)) b.guideArrows(L.routes || [L.route], CC.CONFIG.hud.guideArrowStep);
      b.finish();
      this.targets = b.targets; this.grapplePoints = b.grapplePoints; this.entities = b.entities;
      this.groundVehicles();
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

    // Design : véhicules au sol (chars, camions, maisons) posés exactement sur la surface sous eux (sol bosselé, dalle) :
    // plus de chenilles qui flottent de quelques centimètres ni de roues enfoncées. Écart limité à ±1,5 m (erreur de niveau).
    groundVehicles() {
      const down = new V(0, -1, 0);
      for (const t of this.targets) {
        if (t.type !== 'tank' && t.type !== 'truck' && t.type !== 'house') continue;
        const p = t.object.position;
        const hit = this.world.raycast(new V(p.x, p.y + 1.5, p.z), down, 3.2, (bx) => bx.kind === 'solid' || bx.kind === 'brick');
        if (!hit || Math.abs(hit.point.y - p.y) > 1.5) continue;
        p.y = hit.point.y; t.base.y = p.y;
        t.updateObb();
      }
    }

    startLevel(i) {
      this.loadLevel(i);
      this.restartLevel();
      if (!this.testMode) { this.input.requestLock(); this.audio.init(); this.audio.resume(); if (this.audio.music) this.audio.music.start(); }
    }

    /* v032 : mission générée (src/world/gen/) — graine tirée au hasard, ou donnée (seed partagée, carte du jour, banc de
     * test) : même graine + même difficulté = même carte. Seuls la graine, la difficulté et quelques statistiques sont
     * sauvegardés ; la carte, elle, est reconstruite à chaque fois. */
    startGenerated(diffId, seed, opts) {
      opts = opts || {};
      if (seed === undefined || seed === null) seed = CC.Gen.randomSeed();
      const t0 = performance.now();
      const plan = CC.Gen.generate(seed, diffId, { keepNav: !!this.genDebug, biome: opts.biome || (this.testMode ? this.params.get('biome') : null) });
      const t1 = performance.now();
      const L = CC.Gen.toLevel(plan);
      this.loadLevelFrom(L, -1);
      const t2 = performance.now();
      this.generated = true;
      this.mission = Object.assign({}, L.mission, { daily: opts.daily || null, challenge: opts.challenge || null, genMs: Math.round(t1 - t0), buildMs: Math.round(t2 - t1), attempt: plan.attempt });
      this.restartLevel();
      // brief de mission : graine, zone, difficulté, cibles (quelques secondes au lanceur)
      const m = this.mission;
      this.centerMsg = opts.challenge ? 'DÉFI ' + m.label + '  -  CARTE ' + opts.challenge.n + '/' + CC.CONFIG.challenge.maps + '  -  ' + m.biome
        : (opts.daily ? 'MISSION DU JOUR  ' : 'MISSION ') + seed + '  -  ' + m.biome + '  -  ' + m.label;
      this.centerMsgT = 3.4;
      if (!this.testMode) { this.input.requestLock(); this.audio.init(); this.audio.resume(); if (this.audio.music) this.audio.music.start(); }
    }
    // Écran « GÉNÉRATION... » affiché une image avant le calcul (sinon le jeu semble figé pendant la construction)
    requestMission(diffId, seed, opts) {
      this.pendingMission = { diffId, seed, opts, frames: 0 };
      this.ui.overlay = 'generating';
      this.audio.init(); this.audio.resume();
    }
    runPendingMission() {
      const pm = this.pendingMission;
      if (!pm || ++pm.frames < 2) return;
      this.pendingMission = null;
      try { this.startGenerated(pm.diffId, pm.seed, pm.opts); this.ui.overlay = null; } catch (e) {
        console.error(e); this.ui.overlay = 'missions'; this.notice = 'GENERATION FAILED - TRY ANOTHER SEED'; this.noticeT = 4;
      }
    }

    /* v033 : mode CLASSIQUE — couloir infini (src/world/endless.js). Chaque partie a sa graine (une nouvelle à chaque
     * essai, sauf graine imposée par le banc de test) ; une seule vie, score = mètres + bonus.
     * v034 : opts.home → on n'entre pas dans le vol mais sur le LANCEUR (accueil) : le couloir est déjà construit, il suffit de
     * toucher la roquette pour partir (aucun chargement entre le toucher et le vol). */
    startEndless(seed, opts) {
      opts = opts || {};
      if (seed === undefined || seed === null) seed = CC.Gen.randomSeed();
      this.generated = false; this.mission = null;
      const L = CC.Endless.level(seed, { zones: this.testMode ? null : this.progress.unlockedWorlds() });
      this.loadLevelFrom(L, -1);
      this.endlessRun = new CC.Endless.Run(this, L);
      this.progress.beginRun(); this.reviveUsed = false; this.hudFeed.length = 0; this.cellHap = 0; this.cellSnd = 0;
      if (opts.home) { this.enterPad(); return; }
      this.restartLevel(true);
      this.rocket.fuel = CC.CONFIG.endless.fuelStart;
      const rec = this.progress.P.best;
      this.centerMsg = rec ? 'RECORD ' + U.formatInt(rec) : 'VA LE PLUS LOIN POSSIBLE';
      this.centerMsgT = 2.6;
      if (!this.testMode) { this.input.requestLock(); this.audio.init(); this.audio.resume(); if (this.audio.music) this.audio.music.start(); }
    }

    // v034 : accueil = le lanceur. La roquette est posée sur son rail, la caméra tourne doucement autour, un toucher lance.
    enterPad() {
      this.style.reset(); this.runTime = 0; this.targetsDone = 0; this.results = null; this.firstFire = true;
      this.state = 'MENU'; this.centerMsg = null; this.centerMsgT = 0; this.paused = false; this.launchFx = null; this.padMode = true;
      const la = this.level.launcher;
      this.launcherEye = new V().fromArray(la.pos);
      this.shoulder.visible = false;
      this.pad.enter(this.level);
      this.input.setAim(0, this.pad.pitch); this.rig.setAim(0, this.pad.pitch);
      this.rocket.pos.copy(this.pad.origin);
      this.warn = null; this.boostK = 0; this.flash = 0;
    }

    // v034 : retour rapide à l'accueil (fondu au noir le temps de bâtir le nouveau couloir, ~0,2 s), avec relance automatique éventuelle
    goHome(opts) {
      this.pendingHome = { frames: 0, opts: opts || {} };
      this.paused = false; this.ui.overlay = null; this.input.exitLock();
    }
    runPendingHome() {
      const ph = this.pendingHome;
      if (!ph || ++ph.frames < 3) return;
      this.pendingHome = null;
      this.startEndless(null, { home: true });
      this.fadeIn = 0.45;
      if (ph.opts.autoLaunch) this.pad.queued = true;
    }

    // v034 : le toucher sur le lanceur → charge → allumage (Game.update, état LAUNCH)
    beginLaunch() {
      if (this.state !== 'MENU' || !this.padMode || this.ui.overlay || this.pendingHome) return false;
      if (this.pad.mode === 'reload') { this.pad.queued = true; return true; }   // rechargement en cours : le toucher est mémorisé
      if (!this.pad.arm()) return false;
      this.audio.init(); this.audio.resume(); if (this.audio.music) this.audio.music.start();
      this.state = 'LAUNCH'; this.launchT = 0;
      this.progress.P.launches = (this.progress.P.launches || 0) + 1;
      this.telemetry.event('arm', {});
      return true;
    }

    // départ depuis le lanceur : poussée gratuite plus longue, moteur déjà chaud, travelling de la caméra
    firePad() {
      const pad = this.pad, PC = CC.CONFIG.pad, rk = this.rocket;
      this.input.setAim(0, pad.pitch); this.rig.setAim(0, pad.pitch);
      rk.launch(pad.origin.clone(), pad.dir.clone(), { speed: PC.launchSpeed, ignited: true, freeBoost: PC.freeBoost });
      rk.fuel = Math.min(rk.fuel, CC.CONFIG.endless.fuelStart);
      pad.ignite(); this.audio.play('padIgnite');
      this.rig.startHandoff(true); this.rig.startFlight();
      this.padMode = false;
      this.state = 'FLIGHT'; this.flightTime = 0; this.stallT = 0; this.boostK = 0;
      if (CC.Touch && CC.Touch.active) { this.settings.tutorialFlights = (this.settings.tutorialFlights || 0) + 1; const T = this.input.touch; if (T) T.reboostUntil = performance.now() + 1800; }   // le doigt posé juste après le départ = boost tout de suite
      this.telemetry.event('fire', { runTime: this.runTime, pad: true });
    }

    canRevive() {
      const run = this.endlessRun, RC = CC.CONFIG.revive;
      return !!run && !this.reviveUsed && !this.testMode && this.ads && this.ads.enabled() && run.dist >= RC.minDist && this.crashKind !== 'outOfBounds' && this.crashKind !== 'stalled';
    }
    beginRevive() {
      this.state = 'REVIVE'; this.reviveT = CC.CONFIG.revive.window; this.ui.overlay = 'revive';
      this.telemetry.event('reviveOffer', { dist: Math.round(this.endlessRun.dist) });
    }
    // publicité récompensée regardée : la roquette repart 24 m avant le crash, au milieu du couloir, invulnérable quelques secondes
    revive() {
      const run = this.endlessRun, rk = this.rocket, RC = CC.CONFIG.revive, T = run.T, cfg = CC.CONFIG.endless;
      this.reviveUsed = true; this.ui.overlay = null; this.paused = false;
      const d = Math.max(30, run.dist - RC.back), sl = T.slope(d);
      const pos = new V().fromArray(T.at(d, 0, cfg.cruise)), dir = new V(sl, 0.02, -1).normalize();
      for (const m of this.missiles) this.scene.remove(m.object);
      this.missiles = [];
      const yaw = Math.atan2(-dir.x, -dir.z), pitch = Math.asin(dir.y);
      this.input.setAim(yaw, pitch); this.rig.setAim(yaw, pitch);
      rk.launch(pos, dir, { speed: 36, ignited: true, freeBoost: 0.8 });
      rk.fuel = rk.fuelMax * RC.fuelFrac; rk.shieldT = RC.shield;
      this.rig.padLook.copy(pos); this.rig.startHandoff(false); this.rig.startFlight();
      this.state = 'FLIGHT'; this.flightTime = 0.5; this.stallT = 0; this.warn = null; run.altT = 0;
      this.audio.play('shield'); this.feed('CONTINUE !', CC.CONFIG.hud.colors.blue);
      this.telemetry.event('revive', {});
    }

    // v033 : partie CLASSIQUE terminée (crash) → v034 : score, XP, niveau, missions (Progress.endRun), puis écran de récompenses
    finishEndless() {
      const run = this.endlessRun, S = this.save, dist = Math.round(run.dist);
      this.ui.overlay = null;
      const res = this.progress.endRun({ dist: run.dist, bonus: run.bonus, time: this.runTime });
      S.endless = S.endless || { best: 0, runs: 0 };
      S.endless.runs = (S.endless.runs || 0) + 1;
      if (dist > (S.endless.best || 0)) S.endless.best = dist;
      const causes = { wall: 'MUR', hazard: 'LASER', cable: 'CABLE', missile: 'MISSILE', drone: 'DRONE', altitude: 'TROP HAUT', outOfBounds: 'CHUTE', stalled: 'PANNE SECHE' };
      this.results = Object.assign(res, { endless: true, time: this.runTime, stage: run.stageLabel(), cause: causes[this.crashKind] || 'CRASH', style: this.style.total, runStats: run.stats, xpDoubled: false, t: 0 });
      this.state = 'RESULTS'; this.centerMsg = null;
      if (this.ads) this.ads.onRunEnd(this.results);
      this.writeSave();
      this.input.exitLock();
      this.telemetry.event('results', { dist, score: res.score, xp: res.gained });
    }

    // v033 : chaque gain de STYLE recharge l'essence en mode CLASSIQUE (la destruction d'une cible a son propre bonus)
    // v034 : et compte dans le score (points de bonus) ; le journal du HUD l'annonce en français
    onStyleAward(label, points) {
      const run = this.endlessRun; if (!run) return;
      if (label === 'BOMB SMASH!') return;
      run.addFuel(points * CC.CONFIG.endless.fuelPerStyle);
      const v = Math.round(run.addBonus(points));
      const col = CC.CONFIG.hud.colors, nm = /PROXIMITY/.test(label) ? 'FROLE' : /SKIM/.test(label) ? 'RASE-MOTTES' : /COLD/.test(label) ? 'COLD IMPACT' : 'VIRAGE';
      this.feed(nm + '  +' + v, /COLD/.test(label) ? col.yellow : col.white);
      run.stats.close++; this.progress.event('close');
    }

    // v034 : journal du HUD (3 lignes courtes sous le score)
    feed(text, color) { this.hudFeed.unshift({ text, color: color || '#ffffff', t: 0 }); if (this.hudFeed.length > 4) this.hudFeed.length = 4; }

    // v034 : éclat / étoile / multiplicateur ramassé (Collect.update)
    onCollect(kind, pos) {
      const run = this.endlessRun; if (!run) return;
      const S = CC.CONFIG.score, fx = this.effects, col = CC.CONFIG.hud.colors, now = performance.now(), touch = CC.Touch && CC.Touch.active && CC.Haptics;
      if (kind === 'cell') {
        run.stats.cells++; run.shown++; run.addBonus(S.cell); run.addFuel(CC.CONFIG.cells.fuel);
        run.chain = Math.min(40, run.chain + 1); run.chainT = 1.1;
        if (now - this.cellSnd > 50) { this.audio.play('cell', null, Math.floor((run.chain - 1) / 2) % 8); this.cellSnd = now; }
        if (touch && now - this.cellHap > 120) { CC.Haptics.tick('collect'); this.cellHap = now; }
        for (let i = 0; i < 3; i++) fx.sparks.emit({ pos, vel: new V(U.fx.range(-1, 1), U.fx.range(-0.3, 1), U.fx.range(-1, 1)).multiplyScalar(U.fx.range(2, 5)), life: U.fx.range(0.2, 0.4), s0: 0.05, s1: 0.06, s2: 0.01, cols: fx.pal.cyan, drag: 2, a: 1, fout: 0.4 });
        this.cellBump = 1; this.progress.event('cells');
      } else if (kind === 'gold') {
        run.stats.gold++; const v = Math.round(run.addBonus(S.gold)); run.addFuel(CC.CONFIG.cells.goldFuel);
        this.audio.play('gold'); if (touch) CC.Haptics.tick('gold');
        fx.ring(pos, this.rocket.fwd, 0.3, 3.4, 0.35, '#ffd23a', 0.6);
        for (let i = 0; i < 26; i++) fx.sparks.emit({ pos, vel: new V(U.fx.range(-1, 1), U.fx.range(-1, 1), U.fx.range(-1, 1)).normalize().multiplyScalar(U.fx.range(3, 9)), life: U.fx.range(0.3, 0.7), s0: 0.06, s1: 0.07, s2: 0.01, cols: fx.pal.ember, drag: 1.6, a: 1, fout: 0.4 });
        this.feed('ETOILE  +' + v, col.yellow); this.cellBump = 1.6; this.progress.event('gold');
      } else if (kind === 'mult') {
        run.multT = S.multTime; this.audio.play('mult'); if (touch) CC.Haptics.tick('gold');
        fx.ring(pos, this.rocket.fwd, 0.3, 3.4, 0.35, '#ff5be0', 0.6);
        this.feed('SCORE X2  ' + S.multTime + ' S', '#ff8be8'); this.cellBump = 1.4;
      }
    }

    /* v034b : mur cassé — n matériaux libérés (score, XP, missions, un peu d'essence) ; des écrous dorés jaillissent du mur puis
     * volent jusqu'au compteur du HUD, qui monte à leur arrivée (HUD.drawClassic). */
    onSmash(pos, n) {
      const run = this.endlessRun; if (!run || n <= 0) return;
      run.stats.cells += n; run.addBonus(n * CC.CONFIG.score.cell * 0.5); run.addFuel(0.5 + n * 0.05); this.progress.event('cells', n);
      const v = new V().copy(pos).project(this.camera), W = this.hudCanvas.width, H = this.hudCanvas.height;
      const k = Math.min(16, Math.max(6, Math.round(n * 0.7))), sx = v.z > 1 ? W / 2 : (v.x * 0.5 + 0.5) * W, sy = v.z > 1 ? H * 0.45 : (0.5 - v.y * 0.5) * H;
      for (let i = 0; i < k; i++) { const a = U.fx() * 6.283, sp = (0.12 + U.fx() * 0.25) * Math.min(W, H); this.flyers.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.1 * H, t: -i * 0.035, val: n / k, rot: U.fx() * 6 }); }
      this.feed('MATERIAUX  +' + n, CC.CONFIG.hud.colors.yellow); this.cellBump = 1.4;
      if (CC.Touch && CC.Touch.active && CC.Haptics) CC.Haptics.tick('gold');
    }
    // un écrou volant est arrivé au compteur
    onFlyerArrive(val) {
      const run = this.endlessRun; if (run) run.shown += val;
      this.cellBump = Math.max(this.cellBump, 0.7);
      const now = performance.now(); if (now - this.cellSnd > 45) { this.audio.play('cell', null, 3 + (this.flyerPitch = ((this.flyerPitch || 0) + 1) % 5)); this.cellSnd = now; }
    }

    // v034 : départ du boost (doigt maintenu) — coup de caméra, onde de choc à la tuyère, son, secousse
    onBoostStart() {
      const rk = this.rocket, fx = this.effects, B = CC.CONFIG.boost;
      this.rig.boostKick(); this.rig.shake = Math.max(this.rig.shake, B.kickShake);
      this.audio.play('boostOn');
      const noz = rk.nozzle(new V());
      fx.ring(noz, rk.fwd, 0.25, B.ringSize, 0.28, '#ffe8a8', 0.55);
      for (let i = 0; i < 16; i++) fx.exhaust(noz, rk.fwd, rk.vel, 1.7 + U.fx() * 0.8, U.fx());
      for (let i = 0; i < 22; i++) fx.sparks.emit({ pos: noz, vel: new V(U.fx.range(-1, 1), U.fx.range(-1, 1), U.fx.range(-1, 1)).multiplyScalar(U.fx.range(2, 6)).addScaledVector(rk.fwd, -U.fx.range(8, 20)).addScaledVector(rk.vel, 0.6), life: U.fx.range(0.2, 0.5), s0: 0.04, s1: 0.05, s2: 0.01, cols: fx.pal.ember, drag: 1.6, grav: 2, a: 1, fout: 0.4 });
      fx.flash(noz, '#ffd090', 3.2, 16, 0.2, '#ff7020');
      if (this.endlessRun) { this.endlessRun.stats.boosts++; this.progress.event('boosts'); }
    }

    restartLevel(fromEndless) {
      if (this.endlessRun && fromEndless !== true) {   // v033 : nouveau couloir ; v034 : au lanceur, avec relance automatique (un seul toucher pour rejouer)
        if (this.testMode) this.startEndless(this.level.seed); else this.goHome({ autoLaunch: true });
        return;
      }
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
      this.state = 'AIM'; this.centerMsg = null; this.centerMsgT = 0; this.paused = false; this.padMode = false;
      if (this.launchFx) { this.launchFx.bore.ring.visible = false; this.launchFx = null; }
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

    // v024 : animation du tir. Le renflement parcourt le tube en launchFx s, le lanceur recule puis revient.
    updateLaunchFx(dt) {
      const fx = this.launchFx;
      if (!fx) return;
      fx.t += dt;
      const D = CC.CONFIG.render.launchFx, k = Math.min(1, fx.t / D), ring = fx.bore.ring;
      ring.visible = k < 1;
      ring.position.z = fx.bore.z0 + (fx.bore.z1 - fx.bore.z0) * k;
      const swell = 1 + 0.45 * Math.sin(Math.PI * Math.min(1, k * 1.15));      // gonfle puis dégonfle en arrivant à la bouche
      ring.scale.set(swell, 1, swell);
      const kick = Math.sin(Math.PI * Math.min(1, fx.t / (D * 1.6))) * (fx.host === this.tripod ? 0.12 : 0.07);
      if (fx.host === this.shoulder) fx.host.position.set(fx.base.x, fx.base.y, fx.base.z + kick);   // recul vers l'arrière
      if (k >= 1 && fx.t > D * 1.6) { if (fx.host === this.shoulder) fx.host.position.copy(fx.base); ring.visible = false; this.launchFx = null; }
    }

    fire() {
      if (this.padMode) { this.firePad(); return; }   // v034 : départ du lanceur (mode CLASSIQUE)
      const dir = this.rig.aimDir.clone();
      const muzzle = this.launcherEye.clone().addScaledVector(dir, this.level.launcher.type === 'tripod' ? 3.2 : 1.3).addScaledVector(this.rig.up, -0.25);
      this.rocket.launch(muzzle, dir);
      if (this.endlessRun) this.rocket.fuel = Math.min(this.rocket.fuel, CC.CONFIG.endless.fuelStart);   // v033 : réservoir de 20 s, départ à 14 s
      this.effects.launchBurst(muzzle.clone(), dir);
      this.audio.play('launch');
      // v024 : animation du tube (renflement qui file vers la bouche + recul)
      const host = this.level.launcher.type === 'tripod' ? this.tripod : this.shoulder;
      if (host && host.userData.bore) this.launchFx = { t: 0, host, bore: host.userData.bore, base: host.position.clone() };
      this.rig.startFlight();
      this.state = 'FLIGHT'; this.flightTime = 0;
      if (CC.Touch && CC.Touch.active) this.settings.tutorialFlights = (this.settings.tutorialFlights || 0) + 1;   // v030 : tutoriel limité aux 3 premiers vols
      this.telemetry.event('fire', { runTime: this.runTime });
    }

    respawn() {
      if (this.level.mode === 'targets') this.enterAim(true);
      else this.restartLevel();
    }

    onTargetHit(t, rocket) {
      if (t.hazard) { this.onRocketCrash('drone', rocket.pos.clone(), new V(0, 1, 0)); return; }   // v034 : un drone ne se détruit pas, il détruit
      const c = t.obb.c.clone();
      t.kill(this);
      if (this.endlessRun) {   // v033 : la roquette traverse la cible et continue ; essence rechargée
        this.effects.explosion(c, null, true, 'orange');
        this.rig.shake = 0.7;
        this.audio.play('boom', c); this.audio.play('target');
        this.endlessRun.addFuel(CC.CONFIG.endless.fuelTarget);
        if (!t.guard) {   // v034 : cible détruite = 100 points (un char de garde ne rapporte rien : il tirait sur nous)
          const v = Math.round(this.endlessRun.addBonus(CC.CONFIG.score.target));
          this.endlessRun.stats.targets++; this.progress.event('targets');
          this.feed('CIBLE  +' + v, CC.CONFIG.hud.colors.green); this.cellBump = 1.3;
        }
        if (CC.Touch && CC.Touch.active && CC.Haptics) CC.Haptics.tick('warn');
        this.telemetry.event('targetHit', { target: t.type, speed: +rocket.vel.length().toFixed(2), runTime: +this.runTime.toFixed(3) });
        return;
      }
      if (!t.guard) this.targetsDone++;   // v021 : un tank de garde détruit ne compte pas dans l'objectif
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
      const all = this.targets.every((x) => !x.alive || x.guard);
      if (all) {
        if (this.level.parTime && this.runTime < this.level.parTime && this.level.hud !== 'B') this.style.speedBonus(this.level.parTime - this.runTime);
        this.state = 'IMPACT'; this.impactT = 0; this.complete = true;
      } else {
        this.state = 'IMPACT'; this.impactT = 0; this.complete = false;
      }
    }

    onRocketCrash(kind, pos, normal) {
      if (!this.rocket.active) return;
      if (this.rocket.shieldT > 0 && kind !== 'outOfBounds' && kind !== 'stalled') return;   // v034 : bouclier du revive
      const rk = this.rocket;
      this.lastSpeed = 0; this.crashKind = kind;
      rk.active = false; rk.mesh.visible = false; rk.light.intensity = 0; rk.rope.visible = false; rk.grapple.active = false;
      this.effects.explosion(pos, normal, false, 'orange');
      this.audio.play('boom', pos);
      this.style.dropCombos();
      this.rig.startImpact(pos); this.rig.shake = 0.8;
      this.state = 'CRASHED'; this.impactT = 0;
      this.telemetry.event('crash', { kind, pos: pos.toArray().map((v) => +v.toFixed(2)), runTime: +this.runTime.toFixed(3) });
    }

    guideLevel(i, L) { return i >= 0 && i < CC.CONFIG.hud.guideArrowLevels && L.guide !== false && !!(L.routes || L.route); }   // v027 : `guide: false` dans la fiche du niveau → repères rouges

    // v023 : progression — un niveau est ouvert si c'est le premier ou si le précédent a déjà été terminé (record enregistré)
    isUnlocked(i) { return i <= 0 || !!(CC.Levels[i - 1] && this.save.best[CC.Levels[i - 1].id]); }
    nextUnlocked() {
      const n = this.levelIndex + 1;
      return !this.generated && this.levelIndex >= 0 && n < CC.Levels.length && this.isUnlocked(n) ? n : -1;
    }

    // v023 : salves anti-aériennes sur les 3 derniers niveaux et sur AUTOMAP difficile
    aaSalvo() {
      const L = this.level;
      if (!L) return false;
      if (L.aaSalvo !== undefined) return L.aaSalvo;                 // v032 : profil de la mission générée
      return L.generated ? L.difficulty === 'hard' : this.levelIndex >= CC.Levels.length - 3;
    }

    respawnMsg() { return CC.Touch && CC.Touch.active ? 'TAP TO RESPAWN' : 'PRESS FIRE TO RESPAWN AT LAUNCHER'; }

    // v020 : niveau de menace des tirs anti-aériens, 0 (premier niveau) → 1 (dernier) ; AUTOMAP : selon la difficulté
    aaThreat() {
      const L = this.level;
      if (!L) return 0;
      if (L.aaThreat !== undefined) return L.aaThreat;               // v032 : profil de la mission générée (0 → 1)
      if (L.generated) return CC.CONFIG.aaByDifficulty[L.difficulty] !== undefined ? CC.CONFIG.aaByDifficulty[L.difficulty] : 0.5;
      return CC.Levels.length > 1 ? U.clamp(this.levelIndex / (CC.Levels.length - 1), 0, 1) : 0;
    }

    spawnEnemyMissile(from, rocket, opts) {
      const m = new CC.EnemyMissile(from, rocket, opts);
      this.scene.add(m.object); this.missiles.push(m);
      if (!opts || !opts.quiet) this.audio.play('launch');   // design : tirs de char / d'hélicoptère → leur propre son (onFire)
      this.telemetry.event('enemyMissile', {});
    }

    finishLevel() {
      const id = this.level.id, best = this.save.best[id];
      const r = { title: this.level.mode === 'targets' ? 'ALL TARGETS DESTROYED' : 'TARGET DESTROYED', time: this.runTime, style: this.style.total, newRecord: false };
      if (!best || this.runTime < best.time) { this.save.best[id] = { time: this.runTime, style: this.style.total }; r.newRecord = !!best || true; }
      r.bestTime = this.save.best[id].time;
      if (this.generated && this.mission) this.recordMission(r);
      if (this.generated && this.mission && this.mission.challenge) this.recordChallenge(r);   // v033
      this.results = r; this.state = 'RESULTS'; this.centerMsg = null;
      if (this.ads) this.ads.onLevelEnd();
      if (!this.settings.tutorialDone) this.settings.tutorialDone = true;   // v030 : premier niveau terminé → plus de tutoriel
      this.writeSave();
      this.input.exitLock();
      this.telemetry.event('results', { time: r.time, style: r.style });
    }

    /* v032 : historique léger des missions (graine, difficulté, temps) + record par graine et par carte du jour.
     * Aucune carte n'est stockée : la graine suffit à la reconstruire. */
    recordMission(r) {
      const m = this.mission, S = this.save, key = m.difficulty + ':' + m.seed;
      S.missions = (S.missions || []).filter((x) => x.k !== key);
      S.missions.unshift({ k: key, seed: m.seed, d: m.difficulty, b: m.biome, t: +r.time.toFixed(2), s: Math.round(r.style), at: new Date().toISOString().slice(0, 10) });
      S.missions.length = Math.min(S.missions.length, 30);
      S.seedBest = S.seedBest || {};
      const prev = S.seedBest[key];
      r.seedBest = prev === undefined ? r.time : Math.min(prev, r.time); r.seedRecord = prev === undefined || r.time < prev;
      S.seedBest[key] = +r.seedBest.toFixed(2);
      const keys = Object.keys(S.seedBest);
      if (keys.length > 200) delete S.seedBest[keys[0]];               // au plus 200 records de graines
      if (m.daily) { S.daily = S.daily || {}; const d = S.daily[m.daily]; if (d === undefined || r.time < d) S.daily[m.daily] = +r.time.toFixed(2); }
    }

    /* v033 : mode DÉFI — 20 cartes fixes par difficulté (graines communes à tous), 1 à 3 étoiles au temps, la carte
     * suivante s'ouvre quand la précédente est terminée ; trophées BRONZE / ARGENT / OR au total d'étoiles. */
    startChallenge(diff, n) { this.requestMission(diff, CC.Gen.challengeSeed(diff, n), { challenge: { diff, n } }); }
    challengeRec(diff, n) { const c = this.save.challenge && this.save.challenge[diff]; return (c && c[n]) || null; }
    challengeOpen(diff, n) { return n <= 1 || !!this.challengeRec(diff, n - 1); }
    challengeStars(diff) { let t = 0; for (let n = 1; n <= CC.CONFIG.challenge.maps; n++) { const r = this.challengeRec(diff, n); if (r) t += r.s; } return t; }
    starsFor(time, par) { const C = CC.CONFIG.challenge; return time <= par * C.star3 ? 3 : time <= par * C.star2 ? 2 : 1; }
    recordChallenge(r) {
      const ch = this.mission.challenge, S = this.save, par = this.level.parTime;
      S.challenge = S.challenge || {}; S.challenge[ch.diff] = S.challenge[ch.diff] || {};
      const prev = S.challenge[ch.diff][ch.n], stars = this.starsFor(r.time, par);
      r.challenge = { diff: ch.diff, n: ch.n, stars, prevStars: prev ? prev.s : 0, par,
        next: stars < 3 ? par * (stars === 2 ? CC.CONFIG.challenge.star3 : CC.CONFIG.challenge.star2) : null,
        trophyBefore: this.trophyCount(ch.diff) };
      S.challenge[ch.diff][ch.n] = { s: Math.max(stars, prev ? prev.s : 0), t: +Math.min(r.time, prev ? prev.t : Infinity).toFixed(2) };
      r.challenge.trophyAfter = this.trophyCount(ch.diff);
      r.challenge.best = S.challenge[ch.diff][ch.n].t;
    }
    trophyCount(diff) { const s = this.challengeStars(diff); return CC.CONFIG.challenge.trophies.filter((t) => s >= t).length; }

    // v034 : « menu » = le lanceur du mode CLASSIQUE (couloir déjà construit, roquette sur son rail)
    toMenu() {
      this.paused = false; this.ui.overlay = null;
      this.input.exitLock();
      this.startEndless(null, { home: true });
    }

    pause() { if (['AIM', 'FLIGHT', 'IMPACT', 'CRASHED', 'RESPAWN'].includes(this.state)) { this.paused = true; this.input.exitLock(); } }
    resume() { this.paused = false; this.ui.overlay = null; if (!this.testMode) this.input.requestLock(); }

    onPointerLost() { if (!this.testMode && !this.ui.overlay && !this.padMode && ['AIM', 'FLIGHT', 'IMPACT', 'CRASHED', 'RESPAWN'].includes(this.state)) this.paused = true; }

    onKey(k) {
      if (typeof document !== 'undefined' && document.activeElement && document.activeElement.tagName === 'INPUT') return;   // saisie d'une graine
      this.audio.init(); this.audio.resume();
      const inGame = ['AIM', 'FLIGHT', 'IMPACT', 'CRASHED', 'RESPAWN'].includes(this.state);
      if ((k === 'Space' || k === 'Enter') && this.state === 'MENU' && this.padMode && !this.ui.overlay) { this.beginLaunch(); return; }   // v034 : au clavier, Espace lance
      if (k === 'Escape') {
        if (this.state === 'REVIVE' || this.state === 'LAUNCH') return;
        if (this.ui.overlay) { this.ui.overlay = null; return; }
        if (this.state === 'RESULTS') { if (this.results && this.results.endless) this.goHome({}); else this.toMenu(); return; }
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
      else if (k === 'KeyG' && (this.generated || this.state === 'MENU')) { this.genDebug = !this.genDebug; }   // v032 : vue de débogage du générateur
    }

    // ---------- boucle ----------
    update(dt) {
      const inp = (this.useAutopilot && this.autopilot && this.state !== 'MENU') ? this.autopilot.poll(dt) : this.input.poll(dt);
      if (inp.aimQ) this.rig.setAimQ(inp.aimQ);
      else { this.input.setAim(inp.yaw, inp.pitch); this.rig.setAim(inp.yaw, inp.pitch); }   // pilote automatique : lacet / tangage
      const rk = this.rocket;
      switch (this.state) {
        case 'MENU':   // v034 : le lanceur vit (feux, vapeur, caméra qui dérive) ; la visée est figée
          if (this.padMode) { this.input.setAim(0, this.pad.pitch); this.rig.setAim(0, this.pad.pitch); this.pad.update(dt); }
          break;
        case 'LAUNCH':   // v034 : charge (0,9 s) puis allumage
          this.input.setAim(0, this.pad.pitch); this.rig.setAim(0, this.pad.pitch);
          this.launchT += dt; this.pad.update(dt);
          if (this.launchT >= CC.CONFIG.pad.chargeTime) this.fire();
          break;
        case 'REVIVE':   // v034 : l'offre de continuer (publicité récompensée) s'éteint toute seule
          if (this.ui.overlay === 'revive' && (this.reviveT -= dt) <= 0) { this.ui.overlay = null; this.finishEndless(); }
          break;
        case 'AIM':
          this.aimTime += dt;
          if (inp.fire && this.aimTime > 0.15) this.fire();
          break;
        case 'FLIGHT': {
          this.flightTime += dt;
          if (this.flightTime > 0.28) this.shoulder.visible = false;   // v024 : 0,2 → 0,28 s, le temps de voir l'animation du tube
          if (inp.thrust !== rk.throttle) {
            rk.throttle = inp.thrust; this.telemetry.event('engine', { on: rk.throttle });
            if (rk.throttle && !rk.freeBoost && rk.fuel > 0) this.onBoostStart();   // v034 : le boost se ressent (caméra, onde de choc, son)
          }
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
            if (this.endlessRun) {   // v034 : éclats, progression des missions
              CC.Collect.update(this, this.endlessRun, dt);
              if ((this.progTick += dt) > 0.25) { this.progTick = 0; this.progress.tick(this.endlessRun.dist, this.endlessRun.score, this.runTime); }
            }
            this.updateWarnings(dt, rk);
            this.lastSpeed = rk.speed;
            const killY = this.level.killY !== undefined ? this.level.killY : -60;
            if (rk.pos.y < killY || (rk.pos.length() > 4000 && !this.endlessRun)) this.onRocketCrash('outOfBounds', rk.pos.clone(), null);   // v033 : le couloir infini n'a pas de bord
            // v032 : roquette immobilisée (posée en glissant sur un toit, sans essence) → comptée comme un crash, sinon
            // la partie ne peut plus avancer
            this.stallT = rk.speed < 3 && this.flightTime > 1 ? (this.stallT || 0) + dt : 0;
            if (rk.active && this.stallT > 1.5) { this.stallT = 0; this.onRocketCrash('stalled', rk.pos.clone(), null); }
          }
          this.runTime += dt;
          break;
        }
        case 'IMPACT':
          this.impactT += dt;
          if (this.level.mode === 'targets' && !this.complete) this.runTime += dt;
          if (this.complete && this.impactT > 2.2) this.finishLevel();
          else if (!this.complete && this.impactT > 0.5) { this.state = 'RESPAWN'; this.centerMsg = this.respawnMsg(); }
          break;
        case 'CRASHED':
          this.impactT += dt;
          if (this.endlessRun) {   // v033 : une seule vie ; v034 : une chance de continuer (publicité récompensée) avant l'écran de fin
            if (this.impactT > 1.1) { if (this.canRevive()) this.beginRevive(); else this.finishEndless(); }
            break;
          }
          if (this.level.mode === 'targets') this.runTime += dt;
          if (this.impactT > 0.45) { this.state = 'RESPAWN'; this.centerMsg = this.respawnMsg(); }
          break;
        case 'RESPAWN':
          if (this.level.mode === 'targets') this.runTime += dt;
          if (inp.fire || (this.useAutopilot && this.impactT > 1.2)) this.respawn();
          this.impactT += dt;
          break;
      }
      this.updateLaunchFx(dt);
      if (this.state === 'RESULTS' && this.results && this.results.endless) this.results.t += dt;   // v034 : chronologie de l'écran de récompenses
      if (this.endlessRun && this.state !== 'MENU' && this.state !== 'RESULTS') this.endlessRun.update(dt);   // v033 : tronçons, paliers, zones
      for (const e of this.entities) if (e.update) e.update(dt, this);
      for (const m of this.missiles) m.update(dt, this);
      this.missiles = this.missiles.filter((m) => { if (!m.alive) this.scene.remove(m.object); return m.alive; });
      if (this.centerMsgT > 0 && (this.centerMsgT -= dt) <= 0) { this.centerMsg = null; this.centerMsgT = 0; }   // message passager (graine de la carte générée)
      if (this.state === 'FLIGHT') this.style.update(dt, rk); else this.style.update(dt, null);
      this.effects.update(dt, this.camera);
      this.rig.update(dt);
      this.trails.update(dt, rk, this.camera);   // après la caméra : effacement près de sa position de cette image
      this.audio.updateRocket(rk, dt);
      this.audio.updateWorld(this, dt);
      this.flash = Math.max(0, this.flash - dt * 7);
      // v034 : intensité du boost pour le HUD (traits de vitesse) et l'aberration chromatique ; journal du HUD ; sursaut du compteur
      const boostOn = this.state === 'FLIGHT' && rk.active && rk.thrusting && !rk.freeBoost ? 1 : 0;
      this.boostK += (boostOn - this.boostK) * U.damp(boostOn ? 9 : 4, dt);
      for (const f of this.hudFeed) f.t += dt;
      while (this.hudFeed.length && this.hudFeed[this.hudFeed.length - 1].t > 1.9) this.hudFeed.pop();
      this.cellBump = Math.max(0, this.cellBump - dt * 5);
      this.progress.update(dt);
      this.shadow.update(dt);
      this.telemetry.t += dt;
    }

    // v026 : alertes « MISSILE! » (bip répété + vibration à l'arrivée) et « LOW FUEL » (deux notes + vibration une fois).
    // L'affichage est dans le HUD, qui lit this.warn.
    updateWarnings(dt, rk) {
      const W = this.warn || (this.warn = { missile: false, lowFuel: false, beepT: 0 });
      const buzz = () => { if (CC.Touch && CC.Touch.active && CC.Haptics) CC.Haptics.tick('warn'); };
      const missile = this.missiles.some((m) => m.alive && m.pos.distanceTo(rk.pos) < CC.CONFIG.aa.warnDist);
      if (missile) {
        if (!W.missile) { buzz(); W.beepT = 0; }
        if ((W.beepT -= dt) <= 0) { this.audio.play('warnMissile'); W.beepT = CC.CONFIG.aa.warnBeep; }
      }
      W.missile = missile;
      const lowFuel = !rk.freeBoost && rk.fuel > 0 && rk.fuel / rk.fuelMax < CC.CONFIG.rocket.lowFuel;
      if (lowFuel && !W.lowFuel) { this.audio.play('warnFuel'); buzz(); this.telemetry.event('lowFuel', { fuel: +rk.fuel.toFixed(2) }); }
      W.lowFuel = lowFuel;
    }

    render(time) {
      // lumière du soleil et ombres centrées sur la zone d'intérêt
      const focus = this.rocket.active ? this.rocket.pos : this.camera.position;
      this.sun.position.copy(focus).addScaledVector(this.sunDir, 150);
      this.sun.target.position.copy(focus);
      this.sky.position.copy(this.camera.position);
      if (this.settings.postfx && this.postParams) {
        this.postParams.flash = this.flash * 0.85; this.postParams.flashColor = this.flashColor || '#ffffff';
        if (this.postChroma === undefined || this.postParamsRef !== this.postParams) { this.postParamsRef = this.postParams; this.postChroma = this.postParams.chromatic; }
        this.postParams.chromatic = this.postChroma + this.boostK * CC.CONFIG.boost.chromatic;   // v034 : le boost écarte les couleurs sur les bords
        this.postfx.render(this.scene, this.camera, this.postParams, time);
      } else {
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);
      }
    }

    tick(dt) {
      if (this.ads) this.ads.update(dt);
      if (this.noticeT > 0 && (this.noticeT -= dt) <= 0) this.notice = null;
      if (this.pendingMission) this.runPendingMission();
      if (this.pendingHome) this.runPendingHome();
      if (this.fadeIn > 0) this.fadeIn = Math.max(0, this.fadeIn - dt);
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
      this.quality = new CC.Quality(this);
      this.quality.apply(this.quality.initial());
      this.watchVisibility();
      this.toMenu();
      // v032 : lien partagé ?mission=<graine>&diff=<difficulté> → écran du générateur avec cette graine
      const ms = CC.Gen.parseSeed(this.params.get('mission'));
      if (ms !== null) { this.ui.overlay = 'missions'; this.ui.seedChoice = ms; this.ui.diffChoice = this.params.get('diff'); }
      const Q = CC.CONFIG.quality;
      let last = performance.now(), fpsAcc = 0, fpsN = 0;
      const loop = (now) => {
        requestAnimationFrame(loop);
        // v030 : cadence plafonnée — 60 images/s en jeu sur écran tactile (écrans 120 Hz), 20 dans les menus et la pause
        // v034 : le lanceur et l'écran de fin sont des scènes vivantes (45 images/s) ; pause et onglet masqué restent économes
        const home = !this.paused && (this.state === 'MENU' || this.state === 'RESULTS' || this.state === 'REVIVE');
        const cap = this.hidden ? 4 : this.paused ? Q.pausedFps : home ? Q.homeFps : (CC.Touch && CC.Touch.active ? Q.maxFpsTouch : 0);
        if (cap && now - last < 1000 / cap - 2) return;
        const real = (now - last) / 1000, dt = Math.min(0.05, real); last = now;
        fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { this.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
        this.quality.watch(real);
        this.tick(dt);
      };
      requestAnimationFrame(loop);
    }

    // v030 : application mise en arrière-plan (autre appli, écran verrouillé, onglet masqué) → partie en pause et son
    // suspendu (sur Android, une WebView continue sinon de jouer la musique et le moteur) ; au retour, le son reprend,
    // la partie reste en pause (le joueur reprend quand il est prêt).
    watchVisibility() {
      const onHide = () => { this.hidden = true; this.pause(); if (this.audio.ctx && this.audio.ctx.state === 'running') this.audio.ctx.suspend(); if (CC.Haptics) CC.Haptics.boostStop(); };
      const onShow = () => { this.hidden = false; if (this.audio.ctx) this.audio.resume(); };
      document.addEventListener('visibilitychange', () => (document.hidden ? onHide() : onShow()));
      window.addEventListener('pagehide', onHide);
      window.addEventListener('pageshow', onShow);
    }

    // ---------- banc de test (enregistrements déterministes) ----------
    initTestHarness() {
      const P = this.params;
      const fps = parseFloat(P.get('fps') || CC.CONFIG.test.fps);
      const lv = Math.max(0, Math.min(CC.Levels.length - 1, parseInt(P.get('level') || '1', 10) - 1));
      this.telemetry.enabled = true;
      // ?gen=easy|medium|hard&seed=N : carte aléatoire reproductible (enregistrable comme les niveaux fixes)
      if (P.get('gen')) this.startGenerated(P.get('gen'), parseInt(P.get('seed') || '4242', 10));
      else if (P.has('endless')) this.startEndless(parseInt(P.get('endless') || '4242', 10));   // v033 : ?endless=<graine>
      else this.startLevel(lv);
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

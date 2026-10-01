/* v036 : HORIZON — l'arrière-plan qui donne de la grandeur. Un anneau de 980 m de rayon suit la caméra ; une bande de 3072 × 384 pixels y est
 * dessinée en silhouettes SUPERPOSEES (les plus lointaines très pâles, les plus proches plus sombres : perspective atmosphérique) :
 *   city    tours de tailles variées, antennes, gratte-ciel à gradins, grues       port     collines, portiques, cargos, entrepôts
 *   sky     pics de montagnes dans la brume                                        forest   crêtes boisées, pins
 *   chute   mégapole très loin au-dessous (le joueur tombe vers elle)              eau      dorsales et piliers de roche du fond marin
 * La teinte vient du brouillard de la zone (elle se fond avec le ciel) ; la nuit, une seconde bande additive y ajoute des fenêtres allumées,
 * des enseignes néon et les feux rouges des antennes. Une seule bande en mémoire à la fois (mobile) ; aucune géométrie de plus de 64 facettes. */
(function () {
  const U = CC.U;
  const SC = 0.36;                                       // v038g : l'anneau est réduit à 353 m de rayon (dans la distance de vue), mêmes angles
  const W = 3072, H = 384, R = 980, GROUND = 330;      // y du sol dans la bande (le bas est sous terre)
  const STYLE = { city: 'city', port: 'port', sky: 'peaks', forest: 'forest', chute: 'megacity', tour: 'city', eau: 'seabed' };

  function draw(style, seed, dark) {
    const rng = U.makeRng(seed), rr = (a, b) => a + (b - a) * rng();
    const cs = document.createElement('canvas'); cs.width = W; cs.height = H; const g = cs.getContext('2d');
    let cg = null, gg = null;
    if (dark) { cg = document.createElement('canvas'); cg.width = W; cg.height = H; gg = cg.getContext('2d'); }
    // v038e : les silhouettes sont dessinées en gris (clair = loin, plus sombre = proche) que la teinte du brouillard vient colorer : fini les masses noires
    const sh = (al) => { const v = Math.round(255 * (1 - 0.42 * Math.min(1, al))).toString(16).padStart(2, '0'); return '#' + v + v + v; };
    const rects = [];
    const NEON = ['#ff3ad8', '#2be8ff', '#ffb02b', '#8a6aff', '#ff5a5a'];
    const tower = (x, w, h, a, lit) => {
      const top = GROUND - h;
      g.globalAlpha = a; g.fillStyle = sh(a); g.fillRect(x, top, w, h);
      const k = rng();
      if (k < 0.3 && w > 8) { const w2 = w * rr(0.45, 0.7), h2 = h * rr(0.08, 0.2); g.fillRect(x + (w - w2) / 2, top - h2, w2, h2); if (rng() < 0.4) g.fillRect(x + w / 2 - 0.7, top - h2 - h * 0.12, 1.4, h * 0.12); rects.push([x, top - h2, w, h + h2, lit]); return; }
      if (k < 0.5) g.fillRect(x + w / 2 - 0.8, top - h * rr(0.1, 0.25), 1.6, h * 0.25);        // antenne
      else if (k < 0.58) { g.beginPath(); g.moveTo(x + w * 0.15, top); g.lineTo(x + w / 2, top - w * 1.6); g.lineTo(x + w * 0.85, top); g.closePath(); g.fill(); }   // flèche
      rects.push([x, top, w, h, lit]);
    };
    const towers = (hmin, hmax, wmin, wmax, a, gap, lit) => { for (let x = -20; x < W; x += 0) { const w = rr(wmin, wmax), h = rr(hmin, hmax) * (0.55 + 0.45 * Math.sin(x / 260 + seed)); if (rng() > 0.12) tower(x, w, Math.max(6, h), a, lit); x += w + rr(0, gap); } };
    const crane = (x, h, a, len) => {
      g.globalAlpha = a; g.fillStyle = sh(a); g.fillRect(x, GROUND - h, 2.2, h); g.fillRect(x + 26, GROUND - h, 2.2, h); g.fillRect(x - 6, GROUND - h - 3, 40, 4);
      g.fillRect(x - 6 - len * 0.2, GROUND - h - 2, len, 2.2); g.beginPath(); g.moveTo(x + 14, GROUND - h - 3); g.lineTo(x - 6 - len * 0.2, GROUND - h - 14); g.lineTo(x - 6 - len * 0.2, GROUND - h - 2); g.closePath(); g.fill();
      g.fillRect(x + 4, GROUND - h * 0.5, 0.9, h * 0.5 - 3); g.fillRect(x + 1, GROUND - h * 0.5, 7, 6);
    };
    const hills = (hmin, hmax, a, tooth, f) => { g.globalAlpha = a; g.fillStyle = sh(a); g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 6) { const n = Math.sin(x / (170 * f) + seed) * 0.5 + Math.sin(x / (61 * f) + seed * 2) * 0.3 + Math.sin(x / (23 * f) + seed * 3) * 0.2; let y = GROUND - (hmin + (hmax - hmin) * (0.5 + 0.5 * n)); if (tooth) y -= (Math.floor(x / 5) % 2 ? 0 : tooth) * (0.6 + 0.4 * rng()); g.lineTo(x, y); }
      g.lineTo(W, H); g.closePath(); g.fill(); };
    const peaks = (hmin, hmax, a, step) => { g.globalAlpha = a; g.fillStyle = sh(a); g.beginPath(); g.moveTo(0, H); let x = 0; while (x < W + 40) { const h = rr(hmin, hmax), w = rr(step * 0.6, step * 1.4); g.lineTo(x, GROUND - rr(hmin * 0.15, hmin * 0.4)); g.lineTo(x + w * 0.45, GROUND - h); g.lineTo(x + w * 0.55, GROUND - h * rr(0.82, 0.95)); x += w; } g.lineTo(W, H); g.closePath(); g.fill(); };
    const pines = (hmin, hmax, a, w) => { g.fillStyle = sh(a); g.globalAlpha = a; for (let x = 0; x < W; x += rr(w * 0.5, w * 1.1)) { const h = rr(hmin, hmax); g.beginPath(); g.moveTo(x - w / 2, GROUND); g.lineTo(x, GROUND - h); g.lineTo(x + w / 2, GROUND); g.closePath(); g.fill(); } };
    const ship = (x, a) => { g.globalAlpha = a; g.fillStyle = sh(a); const L = rr(70, 120); g.fillRect(x, GROUND - 14, L, 14); g.fillRect(x + L * 0.7, GROUND - 34, L * 0.22, 20); g.fillRect(x + L * 0.78, GROUND - 42, 6, 8); for (let i = 0; i < 6; i++) g.fillRect(x + 6 + i * 11, GROUND - 22, 9, 8); };
    const stack = (x, h, a) => { g.globalAlpha = a; g.fillStyle = sh(a); g.fillRect(x, GROUND - h, 7, h); g.fillRect(x - 1, GROUND - h, 9, 3); };

    g.clearRect(0, 0, W, H);
    if (style === 'city' || style === 'megacity') {
      const big = style === 'megacity' ? 1.7 : 1;
      towers(28 * big, 92 * big, 10, 26, 0.26, 4, 0); towers(40 * big, 140 * big, 12, 32, 0.38, 6, 0); towers(50 * big, 190 * big, 14, 38, 0.52, 10, 1);
      for (let i = 0; i < 4; i++) crane(rr(0, W), rr(60, 110), 0.5, rr(60, 100));
      towers(18, 70 * big, 18, 50, 0.72, 40, 2);
    } else if (style === 'port') {
      hills(14, 50, 0.2, 0, 1.3); towers(14, 46, 14, 34, 0.3, 18, 0);
      for (let i = 0; i < 6; i++) crane(rr(0, W), rr(40, 90), 0.42, rr(50, 90));
      for (let i = 0; i < 4; i++) ship(rr(0, W), 0.5);
      for (let x = 0; x < W; x += rr(40, 90)) { g.globalAlpha = 0.6; g.fillStyle = sh(0.6); g.fillRect(x, GROUND - rr(8, 22), rr(28, 60), 30); }
      for (let i = 0; i < 5; i++) stack(rr(0, W), rr(40, 80), 0.45);
    } else if (style === 'peaks') {
      peaks(60, 190, 0.22, 240); peaks(50, 150, 0.36, 180); peaks(30, 100, 0.55, 140);
    } else if (style === 'forest') {
      hills(40, 130, 0.22, 0, 1.6); hills(30, 90, 0.36, 0, 1.0); pines(18, 50, 0.46, 12); hills(14, 46, 0.55, 5, 0.6); pines(10, 32, 0.68, 9);
    } else if (style === 'seabed') {
      hills(40, 140, 0.3, 0, 1.5); hills(24, 80, 0.45, 0, 0.8);
      for (let i = 0; i < 26; i++) { g.globalAlpha = 0.5; g.fillStyle = sh(0.5); const x = rr(0, W), h = rr(40, 160), w = rr(6, 18); g.beginPath(); g.moveTo(x, GROUND + 20); g.lineTo(x + w * 0.3, GROUND - h); g.lineTo(x + w * 0.7, GROUND - h * 0.9); g.lineTo(x + w, GROUND + 20); g.closePath(); g.fill(); }
    }
    // fenêtres, néons, feux d'antenne (nuit)
    if (gg) {
      for (const [x, top, w, h, lit] of rects) {
        if (lit === 0 && rng() < 0.45) continue;
        const n = Math.min(60, Math.floor(w * h / (lit === 1 ? 24 : 40)));
        for (let i = 0; i < n; i++) { const r = rng(); gg.globalAlpha = rr(0.3, 0.85); gg.fillStyle = r < 0.72 ? '#ffd890' : r < 0.86 ? '#7ae8ff' : '#ff6ad8'; gg.fillRect(x + 1 + rng() * (w - 3), top + 2 + rng() * (h - 4), 1.6, 1.3); }
        if (rng() < 0.22) { gg.globalAlpha = 0.9; gg.fillStyle = NEON[Math.floor(rng() * NEON.length)]; gg.fillRect(x + rng() * w * 0.4, top + rng() * h * 0.5, 2 + rng() * 2, 6 + rng() * 14); }
        if (lit === 1 && rng() < 0.5) { gg.globalAlpha = 1; gg.fillStyle = '#ff3020'; gg.fillRect(x + w / 2 - 1, top - 10, 2, 2); }
      }
    }
    const tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; };
    return { sil: tex(cs), glow: cg ? tex(cg) : null };
  }

  class Horizon {
    constructor(game) {
      this.game = game; this.style = null; this.dark = 0; this.seed = 1; this.tex = null;
      const geo = new THREE.CylinderGeometry(R, R, 640, 72, 1, true);
      this.matS = new THREE.MeshBasicMaterial({ color: '#8a96a8', transparent: true, depthWrite: false, side: THREE.BackSide, fog: false });
      this.matG = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, side: THREE.BackSide, fog: false, blending: THREE.AdditiveBlending, opacity: 0 });
      this.ring = new THREE.Mesh(geo, this.matS); this.glow = new THREE.Mesh(geo, this.matG);
      for (const m of [this.ring, this.glow]) { m.frustumCulled = false; m.visible = false; m.scale.setScalar(SC); game.scene.add(m); }
      this.ring.renderOrder = -6; this.glow.renderOrder = -5; this.base = 0;
      this.tint = new THREE.Color(); this.fog = new THREE.Color('#aab');
    }
    // zone courante (null : pas d'horizon : métro, usine, pièce…) ; dark : ambiance sombre (fenêtres et néons allumés)
    setZone(zone, dark, seed) {
      const st = STYLE[zone] || null, key = st ? st + (dark ? '_d' : '') : null;
      if (!st) { this.style = null; this.ring.visible = this.glow.visible = false; return; }
      if (key !== this.key || seed !== this.seed) {
        if (this.tex) { this.tex.sil.dispose(); if (this.tex.glow) this.tex.glow.dispose(); }
        this.tex = draw(st, (seed || 1) * 97 + st.length * 13, !!dark); this.matS.map = this.tex.sil; this.matS.needsUpdate = true;
        this.matG.map = this.tex.glow; this.matG.needsUpdate = true; this.key = key; this.seed = seed;
      }
      this.style = st; this.darkOn = !!dark;
    }
    setEnv(env) {
      if (!env || !env.fog) return;
      this.fog.set(env.fog.color);
      const d = env.dark !== undefined ? env.dark : 0;
      this.tint.copy(this.fog).multiplyScalar(d > 0.4 ? 0.62 : 0.84);   // v038e : silhouettes plus claires (brume), plus de masses noires
      this.matS.color.copy(this.tint);
      this.matG.opacity = this.darkOn ? 0.95 : 0;
    }
    update(game) {
      const run = game.endlessRun, on = !!run && !!this.style && game.state !== 'BOOT';
      this.ring.visible = on; this.glow.visible = on && this.darkOn;
      if (!on) return;
      const cam = game.camera.position, b = run.T.base(Math.max(0, -game.rocket.pos.z));
      this.base += (b - this.base) * 0.05; if (Math.abs(this.base - b) > 300) this.base = b;
      this.ring.position.set(cam.x, this.base + 220 * SC, cam.z); this.glow.position.copy(this.ring.position);   // la ligne de sol de la bande est à 90 m au-dessus de son bord bas
    }
  }
  CC.Horizon = Horizon;
})();

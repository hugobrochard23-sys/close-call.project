/* v033 : mode CLASSIQUE — couloir infini (CHOIX d'Hugo et de son collègue : « faire le plus de mètres possible »).
 * Le couloir file vers -z. Il est construit par tronçons de CC.CONFIG.endless.chunkLen m devant la roquette (chaque
 * tronçon a son LevelBuilder : géométrie fusionnée par matériau, collisions, cibles, ennemis) et détruit derrière elle.
 * Tout dérive de la graine de la partie : même graine = même couloir.
 * - Tracé : ligne centrale en somme de sinus (virages continus) ; parois en polyligne (une boîte par corde, sans marche).
 * - Paliers de difficulté selon la distance : FACILE → MOYEN → DIFFICILE → IMPOSSIBLE (couloir plus étroit et plus
 *   sinueux, obstacles plus serrés, trous plus petits, chars ennemis de plus en plus précis).
 * - Zones de décor : ville, désert, neige, industrie, canyon, ville de nuit ; l'ambiance lumineuse glisse d'une zone à
 *   l'autre quand la roquette passe la frontière.
 * - Essence : frôler (points de STYLE) et détruire les cibles en route (dépôts de carburant, camions, chars) recharge.
 * - Pilote automatique (banc de test) : chaque tronçon ajoute ses points de passage à la route. */
(function () {
  const U = CC.U, V = THREE.Vector3, G = CC.Gen;
  const E = CC.Endless = {};
  const C = () => CC.CONFIG.endless;
  const DEG = 180 / Math.PI;

  // ---------- zones de décor ----------
  // wall(r) → matériau et teinte d'une paroi ; kind 'city' : immeubles (façades, toits équipés par le LevelBuilder)
  const ZONES = {
    city: { label: 'ZONE URBAINE', envs: ['day', 'overcast', 'dawn'], ground: 'asphalt', groundTint: '#ffffff', city: true,
      wall: (r) => ({ mat: { side: r.pick(['facade', 'facadePink', 'facadeTan']), top: 'concrete', bottom: 'concreteDark' }, tint: r.pick(['#ffffff', '#f2eee8', '#e8ecf0']) }),
      obstacle: 'concrete', obstacleTint: '#d8d4cc' },
    desert: { label: 'DESERT', envs: ['haze', 'day'], ground: 'sand', groundTint: '#ffffff',
      wall: (r) => ({ mat: { side: 'rock', top: 'sand' }, tint: r.pick(['#e8c896', '#dcb883', '#f0d2a0']) }),
      obstacle: 'rock', obstacleTint: '#d8b888' },
    snow: { label: 'MONTAGNE ENNEIGEE', envs: ['snow'], ground: 'white', groundTint: '#f4f8ff',
      wall: (r) => ({ mat: { side: 'rock', top: 'white' }, tint: r.pick(['#c8d0dc', '#b8c2d0', '#d8dee8']) }),
      obstacle: 'rock', obstacleTint: '#c8d0dc' },
    industry: { label: 'ZONE INDUSTRIELLE', envs: ['overcast', 'fog', 'dusk'], ground: 'concreteDark', groundTint: '#d8d4d0',
      wall: (r) => ({ mat: { side: r.pick(['corrugated', 'metal', 'brick']), top: 'concreteDark' }, tint: r.pick(['#c8ccd0', '#b8a898', '#a8b4b8']) }),
      obstacle: 'metal', obstacleTint: '#c8ccd4' },
    canyon: { label: 'CANYON', envs: ['dusk', 'day', 'haze'], ground: 'dirt', groundTint: '#c8a888',
      wall: (r) => ({ mat: { side: 'rock', top: 'dirt' }, tint: r.pick(['#c07858', '#b06848', '#c88a68']) }),
      obstacle: 'rock', obstacleTint: '#b87858' },
    forest: { label: 'FORET', envs: ['dusk', 'moonlit', 'fog'], ground: 'dirt', groundTint: '#5a6a48',
      wall: (r) => ({ mat: { side: 'rock', top: 'grass' }, tint: r.pick(['#8a9a82', '#7a8a72']) }), obstacle: 'rock', obstacleTint: '#8a9a82' },
    night: { label: 'VILLE DE NUIT', envs: ['night', 'moonlit'], ground: 'asphalt', groundTint: '#b8b8c0', city: true,
      wall: (r) => ({ mat: { side: r.pick(['facadeDark', 'facade']), top: 'concreteDark', bottom: 'concreteDark' }, tint: r.pick(['#b8bcc8', '#a8acb8']) }),
      obstacle: 'metal', obstacleTint: '#9aa0b0' },
  };
  Object.assign(ZONES, CC.Zones.meta);   // v035 : avenue, métro, port, base aérienne, monde miniature, forêt
  E.Zones = ZONES;

  // ---------- paramètres par palier (interpolés sur les 150 derniers mètres d'un palier : pas de marche) ----------
  function stageOf(d) { return U.clamp(Math.floor(Math.max(0, d) / C().stageLen), 0, 3); }
  function param(arr, d) {
    const L = C().stageLen, x = Math.max(0, d), i = Math.min(3, Math.floor(x / L));
    if (i >= 3) return arr[3];
    const f = x - i * L, k = U.clamp((f - (L - 300)) / 300, 0, 1), s = k * k * (3 - 2 * k);
    return arr[i] + (arr[i + 1] - arr[i]) * s;
  }

  const pinW = (p, d) => U.smooth(p.d0 - 60, p.d0, d) * (1 - U.smooth(p.d1, p.d1 + 60, d));
  /* Tracé du couloir d'une partie : x du centre et demi-largeur à la distance d (fonctions continues). */
  class Track {
    constructor(seed, zones) {
      const r = G.stream(seed, 'track');
      this.p = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];
      this.l = [r.between([170, 230]), r.between([75, 105]), r.between([48, 70])];
      const rl = G.stream(seed, 'lane'); this.lp = [rl() * 6.28, rl() * 6.28, rl() * 6.28, rl() * 6.28]; this.ll = [rl.between([170, 230]), rl.between([70, 100])];
      this.seed = seed;
      // v035 : enchaînement des zones (graphe de voisinage, les zones rarement vues d'abord), limité aux zones ouvertes par le niveau
      this.zoneOrder = CC.Zones.order(seed, zones, 90);
      // v053 : DEPART ALEATOIRE — une partie sur deux, la montée / la descente vers la 2e zone commence 15 à 40 m après le lanceur (au lieu de 2 000 m de ville)
      const ro = G.stream(seed, 'zoff'); this.off = 0;
      if (this.zoneOrder.length > 1 && ro() < 0.55 && CC.Zones.PROFILE[this.zoneOrder[1]].elev !== CC.Zones.PROFILE[this.zoneOrder[0]].elev) { const hw1 = Math.max(130, 1.8 * Math.abs(CC.Zones.PROFILE[this.zoneOrder[1]].elev - CC.Zones.PROFILE[this.zoneOrder[0]].elev)); this.off = C().zoneLen - (hw1 + ro.between([15, 40])); }
    }
    // v034c : la TRAJECTOIRE (lane) — position latérale (relative au couloir) et altitude (relative au sol) qui serpentent, montent et
    // descendent ; les structures sont posées autour d'elle, le parcours est donc toujours faisable
    laneX0(d) { const f = U.clamp((d - 60) / 140, 0, 1), A = param(C().laneAmp, d) * CC.Zones.prof(this, d, 'amp'); return f * A * (Math.sin(d / this.ll[0] + this.lp[0]) + 0.55 * Math.sin(d / this.ll[1] + this.lp[1])) / 1.55; }
    laneY0(d) {
      const f = U.clamp((d - 40) / 160, 0, 1), tr = CC.Zones.trans(this, d), yr = CC.Zones.prof(this, d, 'y');
      const zi0 = this.zoneIndex(d), c0 = CC.Zones.yCenter(this, tr.z0, tr.k ? tr.k - 1 : zi0, d), c1 = CC.Zones.yCenter(this, tr.z1, tr.k ? tr.k : zi0, d), c = c0 + (c1 - c0) * tr.t;
      const hw = Math.min(yr[1] - c, c - yr[0]), k = Math.min(Math.max(hw, 8), (yr[1] - yr[0]) / 2) / 13.5 * 0.95;
      return U.clamp(c + f * k * (9 * Math.sin(d / 310 + this.lp[2]) + 4.5 * Math.sin(d / 127 + this.lp[3])), yr[0], yr[1]);
    }
    // épingles : certaines scènes (avion géant, pont levant, tasse…) imposent le passage, la trajectoire s'y raccorde en douceur
    laneX(d) { let x = this.laneX0(d); for (const p of CC.Zones.pinAt(this, d)) x += ((p.fx ? p.fx(d) : p.lx) - x) * pinW(p, d); return x; }   // v055 : fx(d) = trajectoire latérale imposée (slalom)
    laneY(d) { let y = this.laneY0(d); for (const p of CC.Zones.pinAt(this, d)) { const py = p.fy ? p.fy(d) : p.y2 !== undefined ? p.y + (p.y2 - p.y) * U.clamp((d - p.d0) / Math.max(1, p.d1 - p.d0), 0, 1) : p.y; y += (py - y) * pinW(p, d); } return y; }   // v054 : y2 = pente (plongée)
    vol(d) { return CC.Zones.prof(this, d, 'vol') + 2.5 * Math.sin(d / 131 + this.lp[0] * 1.7); }          // demi-largeur du volume de jeu
    elev(zi) { return CC.Zones.PROFILE[this.zoneOrder[Math.min(Math.max(0, zi), this.zoneOrder.length - 1)]].elev; }
    base(d) {
      if (d <= 0) return 0;
      const tr = CC.Zones.trans(this, d);
      if (!tr.k) return CC.Zones.PROFILE[tr.z1].elev;
      return CC.Zones.PROFILE[tr.z0].elev + (CC.Zones.PROFILE[tr.z1].elev - CC.Zones.PROFILE[tr.z0].elev) * tr.t;
    }
    cx(d) {
      const a = param(C().bend, d), fade = U.clamp(d / 120, 0, 1);   // départ en ligne droite
      return fade * (a * Math.sin(d / this.l[0] + this.p[0]) + a * 0.35 * Math.sin(d / this.l[1] + this.p[1]) - a * Math.sin(this.p[0]) - a * 0.35 * Math.sin(this.p[1]));
    }
    slope(d) { return (this.cx(d + 1) - this.cx(d - 1)) / 2; }
    half(d) { return param(C().width, d) / 2 * (1 + 0.12 * Math.sin(d / this.l[2] + this.p[2])); }
    zoneIndex(d) { return Math.max(0, Math.floor((Math.max(0, d) + (this.off || 0)) / C().zoneLen)); }   // v053 : off décale la grille des zones
    zoneId(d) { return this.zoneOrder[this.zoneIndex(d) % this.zoneOrder.length]; }
    // ambiance d'une zone (tirée de la graine : même partie = mêmes ambiances)
    env(zi) {
      if (!this._env) this._env = {};
      if (!this._env[zi]) {
        const Z = ZONES[this.zoneOrder[zi % this.zoneOrder.length]], r = G.stream(this.seed, 'env' + zi);
        let pool = Z.envs; if (zi === 0 && !this.forceEnv) { const day = pool.filter((e) => (G.Envs.get(e).dark || 0) < 0.1); if (day.length) pool = day; }   // v046 : la partie ne commence JAMAIS de nuit
        const id = this.forceEnv || pool[Math.floor(r() * pool.length)];
        this._env[zi] = G.Envs.get(id).make(r);
        this._env[zi].clouds = false; this._env[zi].dark = G.Envs.get(id).dark; this._env[zi].id = id;
        // v034c : lumières dosées (plus de « mini disco ») : la nuit reste bleutée et douce, aberration chromatique réduite partout
        const E0 = this._env[zi], px = E0.postfx = E0.postfx || {};
        px.chromatic = (px.chromatic !== undefined ? px.chromatic : CC.CONFIG.postfx.chromatic) * 0.55;
        if (id === 'night' || id === 'moonlit') { E0.hemi.sky = '#8a9ab8'; E0.hemi.ground = '#22262e'; E0.hemi.intensity = Math.min(E0.hemi.intensity, 0.95); px.saturation = 0.95; }
      }
      return this._env[zi];
    }
    // repère local du couloir en d : position monde d'un point (lx en travers, y au-dessus du sol), cap des objets en travers
    // v063 : le couloir TOURNE. Cap θ(d) = somme de virages lissés (scènes à virage, voir Z.plan) ; position P(d) intégrée tous les 2 m ;
    // cx(d) reste l'ondulation latérale locale. Le repère (d, lx, y) ne change pas : les scènes continuent d'utiliser at() / yawAcross().
    ensureTurns(d) {
      const need = this.zoneIndex(Math.max(0, d)) + 1; if (this._tz === undefined) { this._tz = -1; this._turns = []; }
      while (this._tz < need) { this._tz++; const plan = CC.Zones.plan(this, this._tz); for (const sc of plan.scenes) if (sc.turns) for (const t of sc.turns) this._turns.push(t); }
    }
    theta(d) { this.ensureTurns(d); let th = 0; for (const t of this._turns) { if (d <= t.d0) continue; th += t.ang * (d >= t.d1 ? 1 : U.smooth(t.d0, t.d1, d)); } return th; }
    P(d) {
      if (d <= 0) return [0, -d];
      const h = 2, tb = this._tb || (this._tb = [[0, 0]]), n = Math.floor(d / h);
      while (tb.length <= n + 1) { const i = tb.length - 1, th = this.theta((i + 0.5) * h), p = tb[i]; tb.push([p[0] + Math.sin(th) * h, p[1] - Math.cos(th) * h]); }
      const f = d / h - n, a = tb[n], b = tb[n + 1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    at(d, lx, y) {
      const th = this.theta(d), P = this.P(d), cxo = this.cx(d), phi = th + Math.atan(this.slope(d));
      return [P[0] + Math.cos(th) * cxo + Math.cos(phi) * lx, y + this.base(d), P[1] + Math.sin(th) * cxo + Math.sin(phi) * lx];
    }
    yawAcross(d) { return -(this.theta(d) + Math.atan(this.slope(d))) * DEG; }
    // distance d du point du couloir le plus proche (en plan) de pos, cherché autour de hint (la roquette avance toujours)
    project(pos, hint) {
      let best = hint, bd = Infinity;
      for (let d = Math.max(0, hint - 25); d <= hint + 90; d += 3) { const p = this.at(d, 0, 0), dx = p[0] - pos.x, dz = p[2] - pos.z, q = dx * dx + dz * dz; if (q < bd) { bd = q; best = d; } }
      const c = best; bd = Infinity;
      for (let d = Math.max(0, c - 3); d <= c + 3; d += 0.75) { const p = this.at(d, 0, 0), dx = p[0] - pos.x, dz = p[2] - pos.z, q = dx * dx + dz * dz; if (q < bd) { bd = q; best = d; } }
      return best;
    }
  }
  E.Track = Track;

  /* ---------- fiche de niveau du mode CLASSIQUE ---------- */
  E.level = function (seed, opts) {
    const cfg = C(), T = new Track(seed, opts && opts.zones);
    if (opts && opts.env) T.forceEnv = opts.env;   // banc de test : ?env=neonNight
    if (opts && opts.order && opts.order.length) { const o = opts.order.filter((z) => CC.Zones.PROFILE[z]); while (o.length < 90) o.push(o[o.length % Math.max(1, opts.order.length)]); T.zoneOrder = o; }   // banc de test : ?order=city,metro,…
    const L = {
      id: 'endless', name: 'CLASSIQUE', hud: 'C', mode: 'endless', endless: true, seed, fuel: cfg.fuelMax,
      killY: -30, lookAhead: 16, terminalRange: 20, fireDelay: 0.35, impactVariant: 'orange',
      launcher: { type: 'shoulder', pos: [0, 12, 40], yaw: 0, pitch: 0 },
      menuView: { center: [0, 18, -60], radius: 12, height: 10 },
      env: T.env(0), track: T,
      aaThreat: cfg.threat[0], aaSalvo: false, aaMaxAlive: cfg.maxMissiles[0],
      route: [[0, 12, 40], [0, cfg.cruise, 0]],
      build(b) {   // zone de départ (derrière d = 0) : socle du lanceur, mur du fond ; le reste arrive par tronçons
        // v034 : le décor du lanceur (dalle, rail, pylônes, feux) est CC.Pad ; ici seulement la collision de la dalle et son pilier
        b.box({ p: [0, 11.1, 40], s: [2.6, 0.5, 5.2], mat: 'metal', render: false });
        b.box({ p: [0, 5.45, 40], s: [1.6, 10.9, 1.6], mat: 'metal', tint: '#6a717c' });
        b.box({ p: [0, 40, 64], s: [120, 80, 4], mat: { side: 'facadeDark', top: 'concreteDark' }, tint: '#c8ccd4' });   // fond derrière le lanceur
      },
    };
    return L;
  };

  /* ---------- tronçon ---------- */
  function buildChunk(game, T, k) {
    const cfg = C(), d0 = k * cfg.chunkLen, d1 = d0 + cfg.chunkLen;
    const r = G.stream(T.seed, 'chunk' + k);
    r.pick = (a) => a[Math.floor(r() * a.length)];
    const world = game.world, nBoxes = world.boxes.length;
    const pseudo = { seed: (T.seed ^ (k * 7919)) >>> 0, env: { sky: { stars: true } }, routes: [] };   // pas de nuages par tronçon
    const b = new CC.LevelBuilder(game.scene, world, pseudo);
    b.segLen = CC.CONFIG.render.segLen;   // v038g : lots découpés en tranches (visibilité et ombres)
    const gates = [];                                   // points de passage { d, lx, y } (pilote automatique, matériaux)
    const busy = [], reserved = [];
    const free = (d, m) => d > d0 + 8 && d < d1 - 8 && busy.every((q) => Math.abs(q - d) > m);
    const st = stageOf(d0), zoneAt = (d) => T.zoneId(Math.max(0, d)), tr0 = (d) => CC.Zones.trans(T, d);
    const inRamp = (d) => { const t = tr0(d); return !!t.k && T.elev(t.k) !== T.elev(t.k - 1); };

    // cibles en route, sur la colonne vertébrale (il faut parfois plonger vers le sol pour les prendre)
    const nextT = (from) => from + U.lerp(46, 34, U.clamp(from / 7000, 0, 1)) * r.between([0.8, 1.25]);   // v069 : une cible tous les ~50 m, une par une, sur la ligne directrice   // v068 : peu de cibles au départ, de plus en plus ensuite
    if (T.nextTarget === undefined) T.nextTarget = 130;   // v040 : le premier réservoir vient APRES la première porte (tutoriel lisible)
    const tgt = [];
    while (T.nextTarget < d1) {
      const d = T.nextTarget;
      const scA = (CC.Zones.plan(T, T.zoneIndex(d)).scenes.find((q) => d >= q.d0 && d < q.d1)) || null, STRUCT = { passage: 55, tower: 55, carrefour: 50, viaduc: 90, vitres: 60, city1: 0, escalier: 0 };
      const nearPin = zoneAt(d) === 'city' && scA ? (STRUCT[scA.name] !== undefined && (STRUCT[scA.name] === 0 || Math.abs(d - (scA.d0 + scA.d1) / 2) < STRUCT[scA.name])) : CC.Zones.pinAt(T, d).some((p) => d > p.d0 - 15 && d < p.d1 + 15);   // v069 : en ville, seules les scènes à structure centrale écartent les cibles   // pas de plongée vers une cible dans une scène à structure imposée
      if (d >= d0 + 10 && !inRamp(d) && tr0(d).t === 1 && Math.abs((d + T.off) % cfg.zoneLen) > 70 && !nearPin && !CC.Zones.noTargets[zoneAt(d)]) {
        const zone = zoneAt(d), lx = CC.Zones.targetLx(T, d, zone) + r.between([-1.5, 1.5]);
        const sn = ((CC.Zones.plan(T, T.zoneIndex(d)).scenes.find((q) => d >= q.d0 && d < q.d1)) || {}).name;
        const sc2 = (CC.Zones.plan(T, T.zoneIndex(d)).scenes.find((q) => d >= q.d0 && d < q.d1)) || null, rel = sc2 ? d - sc2.d0 : 0;
        if (sc2 && ((sc2.name === 'city1' && rel > 760 && rel < 890) || (sc2.name === 'escalier' && rel > 390 && rel < 500))) { T.nextTarget = nextT(d); continue; }   // pas dans les puits eux-mêmes (le reste de la montée a des cibles)
        tgt.push({ d, lx, zone });
        reserved.push({ d: d - 8, lx, w: 24, dd: 26 });
        // v070 : cibles ÉPARPILLEES : des extras partout dans le volume (côtés, haut, bas), de plus en plus souvent
        const pe = U.clamp(0.4 + d / 9000, 0.4, 0.95), vv = T.vol(d);
        for (let e = 0; e < 2; e++) if (r() < pe * (e ? 0.4 : 1)) { const sg = r() < 0.5 ? -1 : 1; tgt.push({ d: d + r.between([-16, 16]), lx: U.clamp(lx + sg * r.between([9, Math.max(10, vv - 6)]), -(vv - 5), vv - 5), zone, extra: true, dy: r.between([-12, 18]) }); }
      }
      T.nextTarget = nextT(d);
    }

    // sol, passages entre zones, scènes (src/world/zones*.js)
    const ctx = { game, b, T, r, d0, d1, gates, busy, reserved, ZONES, special: null, rings: [], glows: [], doors: [] };
    CC.Zones.build(ctx);

    // v040 : ligne du RECORD — un portique jaune en travers de la route à la distance du meilleur vol
    { const gd = game.progress && game.progress.P && game.progress.P.bestDist;
      if (gd && gd > d0 + 6 && gd < d1 - 6 && gd > 300) {
        const hf = T.half(gd) + 4, yw = T.yawAcross(gd);
        for (const sgn of [-1, 1]) b.box({ p: T.at(gd, sgn * hf, 15), s: [1.2, 30, 1.2], r: [0, yw, 0], mat: 'basic:#ffd23a', collide: false, shadow: false });
        b.box({ p: T.at(gd, 0, 30), s: [2 * hf, 1.4, 1.2], r: [0, yw, 0], mat: 'basic:#ffd23a', collide: false, shadow: false });
        b.box({ p: T.at(gd, 0, 0.12), s: [2 * hf, 0.1, 1.6], r: [0, yw, 0], mat: 'basic:#ffd23a', collide: false, shadow: false });
      } }
    for (const t of tgt) {
      const d = t.d, ly = T.laneY(d), type = t.zone === 'mini' ? 'fuel' : r.pick(ly < 15 ? ['tank', 'truck', 'heli', 'heli', 'sam'] : ['heli', 'heli', 'heli', 'heli', 'truck']), lx = t.lx, air = type === 'heli';   // v069 : sur la ligne directrice : hélicoptère à hauteur de la trajectoire, ou char / camion si elle descend
      const p = air ? T.at(d, lx, U.clamp(ly + (t.dy || 0) + r.between([-1.5, 1.5]), 8, 400)) : T.at(d, lx, 0);
      b.target(type, p, T.yawAcross(d) + (type === 'truck' ? 90 : 0) + (type === 'tank' ? 180 : 0), { unarmed: d < 400 || r() > U.clamp(0.2 + d / 6000, 0, 1), scale: air ? 2.2 : type === 'fuel' ? 2.0 : 2.4, drift: air ? 5 : 2.2, driftSpeed: 0.45 });   // les premiers ne tirent pas ; ensuite de plus en plus souvent
      busy.push(d);
      const hy = air ? p[1] - T.base(d) : type === 'fuel' ? 3.5 : 1.6;
      gates.push({ d: d - 55, lx: T.laneX(d - 55), y: T.laneY(d - 55) * 0.7 }, { d: d - 22, lx, y: hy + 3 }, { d, lx, y: hy }, { d: d + 30, lx: T.laneX(d + 30), y: T.laneY(d + 30) * 0.8 });
    }

    // drones : ils balaient le passage (le rail rouge montre leur course) ; dans les scènes libres seulement
    const nD = cfg.drones[st];
    for (let i = 0; i < nD; i++) {
      const d = d0 + cfg.chunkLen * (i + r.between([0.25, 0.75])) / Math.max(1, nD);
      if (!free(d, 45) || inRamp(d) || tr0(d).t < 1 || zoneAt(d) === 'metro' && false) continue;
      if (reserved.some((q) => Math.abs(q.d - d) < (q.dd + 30) / 2)) continue;
      const lx0 = T.laneX(d), y = T.laneY(d) + r.between([-2, 2]), amp = 9, period = r.between([cfg.droneSpeed[Math.min(st, 3)] * 0.85, cfg.droneSpeed[Math.min(st, 3)] * 1.15]);
      const yaw = T.yawAcross(d) * Math.PI / 180, across = [Math.cos(yaw), -Math.sin(yaw)];
      const dr = new CC.Drone(T.at(d, lx0, y), across, amp, period, r() * 6.283);
      b.entity(dr); b.targets.push(dr);
      b.box({ p: T.at(d, lx0, y), s: [2 * amp + 2.6, 0.07, 0.07], r: [0, T.yawAcross(d), 0], mat: 'basic:#ff3b2e', collide: false, shadow: false });
      busy.push(d);
    }

    // ennemis (faibles, en nombre limité) : chars et lance-missiles en bordure du volume, hélicoptères en altitude ; selon la zone
    const ramp = U.clamp(d0 / 7000, 0, 1), tanks = [], nT = Math.round(4 * ramp);   // v068 : ennemis de garde en nombre croissant
    for (let i = 0; i < nT; i++) {
      const d = d0 + cfg.chunkLen * (i + r.between([0.2, 0.8])) / nT, zn = zoneAt(d); if (!free(d, 14) || inRamp(d) || tr0(d).t < 1 || !CC.Zones.enemies(zn).tank) continue;
      const lx = CC.Zones.edgeLx(T, d, r() < 0.5 ? -1 : 1, zn); tanks.push({ type: 'tank', pos: T.at(d, lx, 0), yaw: 180 - Math.sign(lx) * 20 }); busy.push(d);
    }
    for (let i = 0; i < Math.round(3 * ramp); i++) {
      const d = d0 + cfg.chunkLen * r.between([0.15, 0.85]), zn = zoneAt(d); if (!free(d, 20) || inRamp(d) || tr0(d).t < 1 || !CC.Zones.enemies(zn).sam) continue;
      const lx = CC.Zones.edgeLx(T, d, r() < 0.5 ? -1 : 1, zn); tanks.push({ type: 'sam', pos: T.at(d, lx, 0), yaw: 180 - Math.sign(lx) * 15 }); busy.push(d);
    }
    for (let i = 0; i < Math.round(3 * ramp); i++) {
      const d = d0 + cfg.chunkLen * r.between([0.2, 0.8]), zn = zoneAt(d); if (!free(d, 25) || inRamp(d) || tr0(d).t < 1 || !CC.Zones.enemies(zn).heli) continue;
      tanks.push({ type: 'heli', pos: T.at(d, T.laneX(d) + (r() < 0.5 ? -1 : 1) * 26, r.between([24, 36])), yaw: 180 }); busy.push(d);
    }

    b.finish();
    const boxes = world.boxes.slice(nBoxes);
    // route du pilote automatique et des matériaux : la trajectoire, tous les 14 m, sauf près des passages obligés (cibles, portails)
    gates.sort((a, c) => a.d - c.d);
    const pts = [];
    for (let d = d0; d < d1; d += 14) if (gates.every((g) => Math.abs(g.d - d) > 26)) pts.push({ d, lx: T.laneX(d), y: T.laneY(d) });
    const nodes = pts.concat(gates.filter((g) => g.d >= d0 && g.d < d1)).sort((a, c) => a.d - c.d);
    const route = k < 0 ? [] : nodes.map((g) => T.at(g.d, g.lx, g.y));
    for (const t of b.targets) t.updateObb();
    const collect = k < 0 || !CC.Collect ? null : CC.Collect.build(game, T, b, nodes, d0, d1, r, ctx.special);
    return { k, builder: b, boxes, targets: b.targets, entities: b.entities, route, tanks, collect, rings: ctx.rings.map((q) => Object.assign({ passed: false, missed: false }, q)), doors: ctx.doors.map((q) => Object.assign({ passed: false }, q)) };
  }

  /* Un obstacle à la distance d. Retourne la longueur de couloir occupée (0 = rien posé). */
  function obstacle(b, T, r, d, st, gates) {
    const cfg = C(), Z = ZONES[T.zoneId(d)], half = T.half(d), W = 2 * half + 6, yaw = T.yawAcross(d);
    const mat = Z.obstacle, tint = Z.obstacleTint, top = cfg.ceiling + 30;
    const across = (lx, y, w, h, th, m, tn, kind) => b.box({ p: T.at(d, lx, y), s: [w, h, th || 3], r: [0, yaw, 0], mat: m || mat, tint: tn || tint, kind });
    const stripe = (lx, y, w) => b.box({ p: T.at(d, lx, y), s: [w, 0.25, 3.2], r: [0, yaw, 0], mat: 'hazard', collide: false, shadow: false });
    const gate = (lx, y) => gates.push({ d: d - 45, lx, y }, { d: d - 25, lx, y }, { d: d - 10, lx, y }, { d, lx, y }, { d: d + 12, lx, y });
    const weights = [
      { beamLow: 2, beamHigh: 2, pillar: 3, glass: 2, bridge: 2, hole: 1, smash: 4 },
      { beamLow: 2, beamHigh: 2, pillar: 2, glass: 1, bridge: 1.5, hole: 2, laser: 1.5, slalom: 1.5, smash: 4 },
      { beamLow: 1.5, beamHigh: 1.5, pillar: 1.5, bridge: 1, hole: 3, laser: 2, slalom: 2, window: 2, smash: 3.5 },
      { beamLow: 1, beamHigh: 1, pillar: 1, hole: 3.5, laser: 2, slalom: 2.5, window: 2.5, smash: 3 },
    ][st];
    const type = r.weighted(weights);
    (T.log || (T.log = [])).push({ d: Math.round(d), type, st });   // journal (banc de test, débogage)
    if (type === 'beamLow') {                            // barrière basse : passer au-dessus
      const hb = r.between([9, 16]);
      across(0, hb / 2, W, hb); stripe(0, hb + 0.13, W);
      gate(0, Math.min(cfg.ceiling - 8, hb + 9));
    } else if (type === 'beamHigh') {                    // poutre haute : passer dessous
      const hb = r.between([12, 20]);
      across(0, hb + (top - hb) / 2, W, top - hb); stripe(0, hb - 0.13, W);
      gate(0, Math.max(5, hb * 0.5));
    } else if (type === 'pillar') {                      // un côté fermé
      const s = r() < 0.5 ? -1 : 1;
      across(s * half / 2, top / 2, half + 4, top, 5);
      gate(-s * (half / 2 + 1), cfg.cruise);
    } else if (type === 'smash') {                       // mur à casser : on le traverse (matériaux !) ou on passe par-dessus
      const bw = 6, bh = 6, cols = Math.ceil((2 * half + 6) / bw), rows = 4, blocks = [], zn = T.zoneId(d);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) blocks.push(T.at(d, -half - 3 + (i + 0.5) * (2 * half + 6) / cols, bh / 2 + j * bh));
      const M = { city: ['brick', 'brick'], night: ['concreteWarm', 'brick'], desert: ['sand', 'planks'], snow: ['white', 'planks'], industry: ['corrugated', 'planks'], canyon: ['rock', 'brick'] }[zn] || ['brick', 'brick'];
      b.smashWall({ blocks, size: [(2 * half + 6) / cols + 0.05, bh, 2.6], yaw, mat: M[0], shatter: M[1], reward: 4 });
      b.box({ p: T.at(d, 0, rows * bh + 0.4), s: [2 * half + 6, 0.8, 3], r: [0, yaw, 0], mat: 'hazard', collide: false, shadow: false });   // bandeau hachuré en haut du mur
      gate(0, 10);
    } else if (type === 'glass') {                       // vitre géante : on la traverse (elle ralentit un peu)
      const s = T.at(d, 0, 14);
      b.glass(s, [2 * half + 1, 28, 0.3], [0, yaw, 0]);
      gate(0, cfg.cruise);
    } else if (type === 'bridge') {                      // passerelle : dessus ou dessous
      const yb = r.between([16, 26]);
      across(0, yb, W, 2.4, 8, 'concreteDark', '#c8c4bc');
      for (const e of [-1, 1]) b.box({ p: T.at(d + e * 3.8, 0, yb + 1.8), s: [W, 1.2, 0.3], r: [0, yaw, 0], mat: 'metal', tint: '#8a9098' });
      gate(0, r() < 0.5 ? Math.max(5, yb - 8) : Math.min(cfg.ceiling - 8, yb + 8));
    } else if (type === 'laser') {                       // laser en travers : au-dessus ou au-dessous
      const yl = r.between([9, 24]);
      b.laser(T.at(d, -half - 1, yl), T.at(d, half + 1, yl));
      gate(0, yl > 16 ? yl - 7 : yl + 8);
    } else if (type === 'hole' || type === 'window') {  // mur percé d'un trou / fenêtre entre deux poutres
      const S = param(cfg.hole, d);
      const hw = type === 'window' ? 2 * half : S, hh = S;
      const hx = type === 'window' ? 0 : r.between([-(half - hw / 2 - 2), half - hw / 2 - 2]);
      const hy = r.between([hh / 2 + 4, cfg.ceiling - hh / 2 - 8]);
      const lEdge = hx - hw / 2, rEdge = hx + hw / 2;
      if (type === 'hole') {
        across((-half - 3 + lEdge) / 2, top / 2, lEdge + half + 3, top);
        across((rEdge + half + 3) / 2, top / 2, half + 3 - rEdge, top);
      }
      across(hx, (hy - hh / 2) / 2, hw + 0.2, hy - hh / 2);
      across(hx, (hy + hh / 2 + top) / 2, hw + 0.2, top - hy - hh / 2);
      stripe(hx, hy - hh / 2 - 0.13, hw); stripe(hx, hy + hh / 2 + 0.13, hw);
      gate(hx, hy);
    } else if (type === 'slalom') {                      // deux piliers alternés : gauche puis droite
      const s = r() < 0.5 ? -1 : 1, d2 = d + 45;
      across(s * half / 2, top / 2, half + 4, top, 5);
      const yaw2 = T.yawAcross(d2), h2 = T.half(d2);
      b.box({ p: T.at(d2, -s * h2 / 2, top / 2), s: [h2 + 4, top, 5], r: [0, yaw2, 0], mat, tint });
      gates.push({ d: d - 40, lx: -s * (half / 2 + 1), y: cfg.cruise }, { d: d - 20, lx: -s * (half / 2 + 1), y: cfg.cruise }, { d, lx: -s * (half / 2 + 1), y: cfg.cruise },
        { d: d + 22, lx: 0, y: cfg.cruise }, { d: d2, lx: s * (h2 / 2 + 1), y: cfg.cruise }, { d: d2 + 12, lx: s * (h2 / 2 + 1), y: cfg.cruise });
      return 45;
    }
    return 1;
  }

  function disposeChunk(game, c) {
    for (const t of c.targets) if (t.clearWreck) t.clearWreck(game);
    const tset = new Set(c.targets), eset = new Set(c.entities);
    game.targets = game.targets.filter((t) => !tset.has(t));
    game.entities = game.entities.filter((e) => !eset.has(e));
    game.world.removeBoxes(c.boxes);
    if (c.collect) c.collect.dispose();
    c.builder.dispose();
  }

  /* ---------- état d'une partie : tronçons, distance, paliers, zones, essence ---------- */
  class Run {
    constructor(game, level) {
      this.game = game; this.level = level; this.T = level.track;
      this.chunks = new Map();
      this.dist = 0; this.stage = 0; this.zone = 0;
      this.fuelGain = 0; this.fuelGainT = 0; this.altT = 0;
      // v034 : points de bonus (éclats, cibles, frôlements), multiplicateur ×2, série d'éclats
      this.bonus = 0; this.shown = 0; this.multT = 0; this.chain = 0; this.chainT = 0; this.stats = { cells: 0, gold: 0, targets: 0, close: 0, boosts: 0 };
      this.envFrom = null; this.envT = 1;
      this.pending = [];                                // chars à créer (un par image)
      this.multCap = game.progress.multCap(); this.hull = game.progress.hullCharges(); this.doorChain = 0;   // v042 : améliorations de la fusée
      this.ensure(-1);
      this.announce(0);
    }
    // v036 : la zone change → fonds sonores, musique, silhouettes lointaines (aucune annonce écrite)
    announce(zi) {
      const T = this.T, g = this.game, env = T.env(zi), zone = T.zoneOrder[zi % T.zoneOrder.length], dark = env.dark > 0.4;
      this.darkNow = dark; this.zoneNow = zone;
      if (g.horizon) g.horizon.setZone(zone, dark, (T.seed ^ (zi * 2654435)) >>> 0);
      if (g.audio) g.audio.setZone(zone, dark);
      if (g.horizon) g.horizon.setEnv(env);
    }
    // construit les tronçons jusqu'à `ahead` devant la tête, détruit ceux trop loin derrière
    ensure(kHead) {
      const cfg = C(), g = this.game;
      for (let k = Math.max(-1, kHead - cfg.behind); k <= kHead + cfg.ahead; k++) {
        if (this.chunks.has(k)) continue;
        const c = buildChunk(g, this.T, k);
        this.chunks.set(k, c);
        g.targets.push(...c.targets); g.entities.push(...c.entities);
        this.level.route.push(...c.route);
        for (const t of c.tanks) this.pending.push({ c, t });
        if (g.autopilot) for (const p of c.route) g.autopilot.route.push(new V().fromArray(p));
      }
      for (const [k, c] of this.chunks) if (k < kHead - cfg.behind) { disposeChunk(g, c); this.chunks.delete(k); }
    }
    update(dt) {
      const g = this.game, rk = g.rocket, cfg = C();
      if (rk.active) this.dist = Math.max(this.dist, this.T.project(rk.pos, this.dist));   // v063 : progression le long du couloir (qui tourne)
      this.ensure(Math.floor(this.dist / cfg.chunkLen));
      const job = this.pending.shift();
      if (job && this.chunks.get(job.c.k) === job.c) {
        const e = job.c.builder.guard(job.t.type || 'tank', job.t.pos, job.t.yaw, { scale: job.t.type === 'heli' ? 2.2 : 2.4 });   // s'ajoute aux listes du tronçon
        g.targets.push(e); g.entities.push(e);
      }
      // palier de difficulté
      const st = stageOf(this.dist);
      if (st !== this.stage) {
        this.stage = st;
        const D = G.Difficulties.get(G.difficultyIds()[st]);
        // v034b : plus d'annonce (ni de palier ni de zone) : le changement se voit, on passe sous un pont
        void D;
      }
      const L = this.level;
      L.aaThreat = param(cfg.threat, this.dist); L.aaSalvo = this.dist > 3500; L.aaMaxAlive = Math.round(U.lerp(1, 6, U.clamp(this.dist / 7000, 0, 1)));   // v068 : plus de missiles, pas plus précis
      // zone de décor : l'ambiance glisse en 3 s vers celle de la nouvelle zone
      const zi = this.T.zoneIndex(this.dist);
      if (zi !== this.zone) { this.envFrom = this.T.env(this.zone); this.zone = zi; this.envT = 0; this.announce(zi); }
      if (this.envT < 1) {
        this.envT = Math.min(1, this.envT + dt / 3);
        L.env = lerpEnv(this.envFrom, this.T.env(this.zone), this.envT);
        g.applyEnvironment(L.env);
      }
      if (this.fuelGainT > 0) this.fuelGainT -= dt;
      // v066 : série de cibles détruites (COMBO) : elle retombe après 6 s sans destruction
      if (this.killChain && (g.flightTime || 0) - this.killT > 6) this.killChain = 0;
      // v066 : MANIABILITE — le couloir tourne : la visée suit automatiquement le virage, le joueur ne corrige que l'écart
      if (rk.active && g.state === 'FLIGHT' && !g.useAutopilot && g.input && g.input.aimQ) {
        const a = this.T.theta(this.dist + Math.max(25, rk.speed) * dt) - this.T.theta(this.dist);
        if (a) { g.input.aimQ.premultiply(_qa.setFromAxisAngle(_ay, -a * 0.92)); g.input.aimQ.normalize(); }
      }
      if (this.multT > 0) this.multT = Math.max(0, this.multT - dt);
      if (this.chainT > 0 && (this.chainT -= dt) <= 0) this.chain = 0;
      // plafond : au-dessus, alarme puis explosion (le couloir est le terrain de jeu)
      if (rk.active && g.state === 'FLIGHT') {
        this.altT = rk.pos.y - this.T.base(this.dist) > cfg.ceiling ? this.altT + dt : 0;
        if (this.altT > cfg.ceilingGrace) { this.altT = 0; g.onRocketCrash('altitude', rk.pos.clone(), null); }
      } else this.altT = 0;
    }
    get mult() { return Math.min(this.multCap || 2, 1 + Math.floor((this.doorChain || 0) / 3)); }   // v042 : X1, X2, X3… selon la série de portes parfaites (plafond : amélioration MULTIPLICATEUR)
    get score() { return Math.floor(this.dist) + Math.floor(this.bonus); }
    addBonus(points) { const v = points * this.mult; this.bonus += v; return v; }
    addFuel(s) {
      const rk = this.game.rocket;
      if (!rk.active || s <= 0) return;
      const before = rk.fuel;
      rk.fuel = Math.min(rk.fuelMax, rk.fuel + s);
      const got = rk.fuel - before;
      if (got > 0.05) { this.fuelGain = (this.fuelGainT > 0 ? this.fuelGain : 0) + got; this.fuelGainT = 1.4; }
    }
    stageLabel() { const D = G.Difficulties.get(G.difficultyIds()[this.stage]); return D; }
    dispose() { for (const c of this.chunks.values()) disposeChunk(this.game, c); this.chunks.clear(); }
  }
  E.Run = Run;

  // ---------- interpolation d'ambiance (couleurs, nombres ; le reste bascule à mi-chemin) ----------
  const _ca = new THREE.Color(), _cb = new THREE.Color(), _qa = new THREE.Quaternion(), _ay = new THREE.Vector3(0, 1, 0);
  function lerpEnv(a, b, t) {
    const out = {};
    for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) {
      const x = a[k], y = b[k];
      if (x === undefined || y === undefined) out[k] = t < 0.5 && x !== undefined ? x : y;
      else if (typeof x === 'number' && typeof y === 'number') out[k] = x + (y - x) * t;
      else if (typeof x === 'string' && typeof y === 'string' && x[0] === '#' && y[0] === '#') out[k] = '#' + _ca.set(x).lerp(_cb.set(y), t).getHexString();
      else if (Array.isArray(x) && Array.isArray(y)) out[k] = x.map((v, i) => v + ((y[i] !== undefined ? y[i] : v) - v) * t);
      else if (x && y && typeof x === 'object' && typeof y === 'object') out[k] = lerpEnv(x, y, t);
      else out[k] = t < 0.5 ? x : y;
    }
    return out;
  }
  E.lerpEnv = lerpEnv;
})();

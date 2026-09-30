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
  E.Zones = ZONES;

  // ---------- paramètres par palier (interpolés sur les 150 derniers mètres d'un palier : pas de marche) ----------
  function stageOf(d) { return U.clamp(Math.floor(Math.max(0, d) / C().stageLen), 0, 3); }
  function param(arr, d) {
    const L = C().stageLen, x = Math.max(0, d), i = Math.min(3, Math.floor(x / L));
    if (i >= 3) return arr[3];
    const f = x - i * L, k = U.clamp((f - (L - 300)) / 300, 0, 1), s = k * k * (3 - 2 * k);
    return arr[i] + (arr[i + 1] - arr[i]) * s;
  }

  /* Tracé du couloir d'une partie : x du centre et demi-largeur à la distance d (fonctions continues). */
  class Track {
    constructor(seed, zones) {
      const r = G.stream(seed, 'track');
      this.p = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];
      this.l = [r.between([170, 230]), r.between([75, 105]), r.between([48, 70])];
      const rl = G.stream(seed, 'lane'); this.lp = [rl() * 6.28, rl() * 6.28, rl() * 6.28, rl() * 6.28]; this.ll = [rl.between([170, 230]), rl.between([70, 100])];
      this.seed = seed;
      // ordre des zones : la ville d'abord (lisible), puis les autres dans un ordre tiré de la graine, en boucle
      const rest = ['forest', 'desert', 'snow', 'industry', 'canyon', 'night'].filter((z) => !zones || zones.includes(z));   // v034 : décors ouverts par le niveau du joueur
      const rz = G.stream(seed, 'zones');
      for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rz() * (i + 1)); const t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      this.zoneOrder = ['city'].concat(rest);
      // v034b : altitude du sol de chaque zone (0, 10, 18 ou 26 m) ; on y monte par une rampe autour de la frontière, sous un pont
      const re = G.stream(seed, 'elev'); this.elevs = [0];
      for (let i = 1; i < 80; i++) this.elevs.push(this.elevs[i - 1] > 0 ? re.weighted({ 0: 3, 10: 1, 18: 1 }) | 0 : re.weighted({ 0: 1.5, 10: 2, 18: 2, 26: 1.5 }) | 0);
    }
    // v034c : la TRAJECTOIRE (lane) — position latérale (relative au couloir) et altitude (relative au sol) qui serpentent, montent et
    // descendent ; les structures sont posées autour d'elle, le parcours est donc toujours faisable
    laneX(d) { const f = U.clamp((d - 60) / 140, 0, 1), A = param(C().laneAmp, d); return f * A * (Math.sin(d / this.ll[0] + this.lp[0]) + 0.55 * Math.sin(d / this.ll[1] + this.lp[1])) / 1.55; }
    laneY(d) { const f = U.clamp((d - 40) / 160, 0, 1); return U.clamp(16 + f * (9 * Math.sin(d / 310 + this.lp[2]) + 4.5 * Math.sin(d / 127 + this.lp[3])), 8, 31); }
    vol(d) { return 33 + 5 * Math.sin(d / 131 + this.lp[0] * 1.7); }          // demi-largeur du volume de jeu
    elev(zi) { return +this.elevs[Math.min(Math.max(0, zi), this.elevs.length - 1)]; }
    base(d) {
      if (d <= 0) return 0;
      const L = C().zoneLen, k0 = Math.round(d / L), B = k0 * L;
      if (k0 < 1 || Math.abs(d - B) > 130) return this.elev(this.zoneIndex(d));
      const t = U.smooth(B - 130, B + 130, d);
      return this.elev(k0 - 1) + (this.elev(k0) - this.elev(k0 - 1)) * t;
    }
    cx(d) {
      const a = param(C().bend, d), fade = U.clamp(d / 120, 0, 1);   // départ en ligne droite
      return fade * (a * Math.sin(d / this.l[0] + this.p[0]) + a * 0.35 * Math.sin(d / this.l[1] + this.p[1]) - a * Math.sin(this.p[0]) - a * 0.35 * Math.sin(this.p[1]));
    }
    slope(d) { return (this.cx(d + 1) - this.cx(d - 1)) / 2; }
    half(d) { return param(C().width, d) / 2 * (1 + 0.12 * Math.sin(d / this.l[2] + this.p[2])); }
    zoneIndex(d) { return Math.max(0, Math.floor(Math.max(0, d) / C().zoneLen)); }
    zoneId(d) { return this.zoneOrder[this.zoneIndex(d) % this.zoneOrder.length]; }
    // ambiance d'une zone (tirée de la graine : même partie = mêmes ambiances)
    env(zi) {
      if (!this._env) this._env = {};
      if (!this._env[zi]) {
        const Z = ZONES[this.zoneOrder[zi % this.zoneOrder.length]], r = G.stream(this.seed, 'env' + zi);
        const id = Z.envs[Math.floor(r() * Z.envs.length)];
        this._env[zi] = G.Envs.get(id).make(r);
        this._env[zi].clouds = false;
        // v034c : lumières dosées (plus de « mini disco ») : la nuit reste bleutée et douce, aberration chromatique réduite partout
        const E0 = this._env[zi], px = E0.postfx = E0.postfx || {};
        px.chromatic = (px.chromatic !== undefined ? px.chromatic : CC.CONFIG.postfx.chromatic) * 0.55;
        if (id === 'night' || id === 'moonlit') { E0.hemi.sky = '#8a9ab8'; E0.hemi.ground = '#22262e'; E0.hemi.intensity = Math.min(E0.hemi.intensity, 0.95); px.saturation = 0.95; }
      }
      return this._env[zi];
    }
    // repère local du couloir en d : position monde d'un point (lx en travers, y au-dessus du sol), cap des objets en travers
    at(d, lx, y) {
      const s = this.slope(d), n = Math.sqrt(1 + s * s);
      return [this.cx(d) + lx / n, y + this.base(d), -d + lx * s / n];
    }
    yawAcross(d) { return -Math.atan(this.slope(d)) * DEG; }
  }
  E.Track = Track;

  /* ---------- fiche de niveau du mode CLASSIQUE ---------- */
  E.level = function (seed, opts) {
    const cfg = C(), T = new Track(seed, opts && opts.zones);
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
    const gates = [];                                   // points de passage { d, lx, y } (pilote automatique)
    const busy = [], reserved = [], bridges = [];       // distances occupées, rectangles réservés, ponts de zone
    const free = (d, m) => d > d0 + 8 && d < d1 - 8 && busy.every((q) => Math.abs(q - d) > m);
    const st = stageOf(d0), midD = (d0 + d1) / 2, zone = T.zoneId(Math.max(0, midD)), Zg = ZONES[zone], env = T.env(T.zoneIndex(Math.max(0, midD)));

    // sol (relief), limites du volume (quartiers, collines, falaises…) et silhouettes lointaines
    CC.Scenery.groundSlices(b, T, d0, d1, Zg, cfg);
    for (const side of [-1, 1]) CC.Scenery.side(b, T, r, d0, d1, side, ZONES, game);
    // pont de passage à chaque frontière de zone
    for (let B = Math.ceil(Math.max(1, d0) / cfg.zoneLen) * cfg.zoneLen; B < d1; B += cfg.zoneLen) if (B >= d0) { CC.Scenery.bridge(b, T, r, B, T.zoneId(B - 1), gates); busy.push(B); bridges.push(B); }

    // cibles en route, sur la trajectoire (il faut parfois plonger vers le sol pour les prendre)
    const nextT = (from) => from + r.between(cfg.targetGap);
    if (T.nextTarget === undefined) T.nextTarget = 90;
    while (T.nextTarget < d1) {
      const d = T.nextTarget;
      if (d >= d0 + 10 && free(d, 40)) {
        const lx = T.laneX(d) + r.between([-4, 4]);
        const type = st === 0 ? 'fuel' : r.pick(['fuel', 'fuel', 'truck']);
        const p = T.at(d, lx, 0);
        b.target(type, p, T.yawAcross(d) + (type === 'truck' ? 90 : 0), { unarmed: true });
        busy.push(d); reserved.push({ d: d - 12, lx, w: 30, dd: 110 });   // couloir de plongée libre de toute structure
        const hy = type === 'fuel' ? 3.5 : 1.6;
        gates.push({ d: d - 55, lx: T.laneX(d - 55), y: T.laneY(d - 55) * 0.7 }, { d: d - 22, lx, y: hy + 3 }, { d, lx, y: hy }, { d: d + 30, lx: T.laneX(d + 30), y: T.laneY(d + 30) * 0.8 });
      }
      T.nextTarget = nextT(d);
    }

    // structures : portes qui cadrent la trajectoire + décor qui remplit le volume (src/world/pieces.js)
    const po = { stage: st, zone, ZONES, busy, reserved, bridges, env, special: null };
    CC.Pieces.build(b, T, r, d0, d1, po);
    CC.Pieces.far(b, T, r, d0, d1, po);

    // drones : ils balaient le passage (le rail rouge montre leur course) ; toujours dans le tube dégagé, loin des structures
    const nD = cfg.drones[st];
    for (let i = 0; i < nD; i++) {
      const d = d0 + cfg.chunkLen * (i + r.between([0.25, 0.75])) / Math.max(1, nD);
      if (!free(d, 45) || po.reserveCheck) continue;
      if (reserved.some((q) => Math.abs(q.d - d) < (q.dd + 30) / 2)) continue;
      const lx0 = T.laneX(d), y = T.laneY(d) + r.between([-2, 2]), amp = 9, period = r.between([cfg.droneSpeed[Math.min(st, 3)] * 0.85, cfg.droneSpeed[Math.min(st, 3)] * 1.15]);
      const yaw = T.yawAcross(d) * Math.PI / 180, across = [Math.cos(yaw), -Math.sin(yaw)];
      const dr = new CC.Drone(T.at(d, lx0, y), across, amp, period, r() * 6.283);
      b.entity(dr); b.targets.push(dr);
      b.box({ p: T.at(d, lx0, y), s: [2 * amp + 2.6, 0.07, 0.07], r: [0, T.yawAcross(d), 0], mat: 'basic:#ff3b2e', collide: false, shadow: false });
      busy.push(d);
    }

    // ennemis (faibles, en nombre limité) : chars et lance-missiles au pied des limites du volume, hélicoptères en altitude.
    // Leurs modèles sont détaillés : créés un par image après le tronçon (Run.update).
    const tanks = [], nT = cfg.tanks[st];
    const edge = (d) => (r() < 0.5 ? -1 : 1) * (T.vol(d) - 5);
    for (let i = 0; i < nT; i++) {
      const d = d0 + cfg.chunkLen * (i + r.between([0.2, 0.8])) / nT; if (!free(d, 14)) continue;
      const lx = edge(d); tanks.push({ type: 'tank', pos: T.at(d, lx, 0), yaw: 180 - Math.sign(lx) * 20 }); busy.push(d);
    }
    for (let i = 0; i < (cfg.sams[st] || 0); i++) {
      const d = d0 + cfg.chunkLen * r.between([0.15, 0.85]); if (!free(d, 20)) continue;
      const lx = edge(d); tanks.push({ type: 'sam', pos: T.at(d, lx, 0), yaw: 180 - Math.sign(lx) * 15 }); busy.push(d);
    }
    for (let i = 0; i < (cfg.helis[st] || 0); i++) {
      const d = d0 + cfg.chunkLen * r.between([0.2, 0.8]); if (!free(d, 25)) continue;
      tanks.push({ type: 'heli', pos: T.at(d, T.laneX(d) + (r() < 0.5 ? -1 : 1) * 26, r.between([24, 36])), yaw: 180 }); busy.push(d);
    }

    b.finish();
    const boxes = world.boxes.slice(nBoxes);
    // route du pilote automatique et des matériaux : la trajectoire, tous les 14 m, sauf près des passages obligés (cibles, ponts)
    gates.sort((a, c) => a.d - c.d);
    const pts = [];
    for (let d = d0; d < d1; d += 14) if (gates.every((g) => Math.abs(g.d - d) > 26)) pts.push({ d, lx: T.laneX(d), y: T.laneY(d) });
    const nodes = pts.concat(gates.filter((g) => g.d >= d0 && g.d < d1)).sort((a, c) => a.d - c.d);
    const route = k < 0 ? [] : nodes.map((g) => T.at(g.d, g.lx, g.y));
    for (const t of b.targets) t.updateObb();
    const collect = k < 0 || !CC.Collect ? null : CC.Collect.build(game, T, b, nodes, d0, d1, r, po.special);
    return { k, builder: b, boxes, targets: b.targets, entities: b.entities, route, tanks, collect };
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
      this.ensure(-1);
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
      if (rk.active) this.dist = Math.max(this.dist, -rk.pos.z);
      this.ensure(Math.floor(this.dist / cfg.chunkLen));
      const job = this.pending.shift();
      if (job && this.chunks.get(job.c.k) === job.c) {
        const e = job.c.builder.guard(job.t.type || 'tank', job.t.pos, job.t.yaw, {});   // s'ajoute aux listes du tronçon
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
      L.aaThreat = param(cfg.threat, this.dist); L.aaSalvo = st >= 2; L.aaMaxAlive = cfg.maxMissiles[st];
      // zone de décor : l'ambiance glisse en 3 s vers celle de la nouvelle zone
      const zi = this.T.zoneIndex(this.dist);
      if (zi !== this.zone) { this.envFrom = this.T.env(this.zone); this.zone = zi; this.envT = 0; }
      if (this.envT < 1) {
        this.envT = Math.min(1, this.envT + dt / 3);
        L.env = lerpEnv(this.envFrom, this.T.env(this.zone), this.envT);
        g.applyEnvironment(L.env);
      }
      if (this.fuelGainT > 0) this.fuelGainT -= dt;
      if (this.multT > 0) this.multT = Math.max(0, this.multT - dt);
      if (this.chainT > 0 && (this.chainT -= dt) <= 0) this.chain = 0;
      // plafond : au-dessus, alarme puis explosion (le couloir est le terrain de jeu)
      if (rk.active && g.state === 'FLIGHT') {
        this.altT = rk.pos.y - this.T.base(this.dist) > cfg.ceiling ? this.altT + dt : 0;
        if (this.altT > cfg.ceilingGrace) { this.altT = 0; g.onRocketCrash('altitude', rk.pos.clone(), null); }
      } else this.altT = 0;
    }
    get mult() { return this.multT > 0 ? 2 : 1; }
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
  const _ca = new THREE.Color(), _cb = new THREE.Color();
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

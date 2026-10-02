/* v035 : ZONES du mode CLASSIQUE — chaque zone est un LIEU (avenue, métro, port, base en altitude, monde miniature, forêt), pas un
 * semis d'objets. Principes :
 *  - une COLONNE VERTEBRALE lisible sous la roquette (avenue, rails, quai, piste, plateau…) ;
 *  - un PROFIL par zone (altitude du sol, largeur du volume, plage de hauteur de vol) : le métro est à −40 m sous un plafond, la base aérienne
 *    à +170 m au-dessus des nuages, le monde miniature est une pièce de maison ; plus aucune limite de hauteur globale ;
 *  - des SCENES de 150 à 330 m tirées dans un paquet sans remise (ordre et variantes différents à chaque partie) + une scène SIGNATURE
 *    unique par zone, posée vers 55 % du parcours de la zone ;
 *  - entre deux zones, un PASSAGE : tranchée ou vallée quand le sol monte ou descend (Δ altitude), puis un portail (bouche de métro, fenêtre,
 *    anneaux de montée, porte de quai…) ;
 *  - déterminisme : une scène se construit par tronçon de 200 m mais son tirage au sort ne dépend que de la graine ; chaque objet a son propre
 *    flux aléatoire, les objets hors du tronçon sont simplement ignorés.
 * Les scènes d'une zone sont dans zones_a.js (avenue, métro), zones_b.js (port, base aérienne), zones_c.js (monde miniature). */
(function () {
  const V = THREE.Vector3, U = CC.U, G = CC.Gen, DEG = 180 / Math.PI;
  const Z = CC.Zones = { defs: {}, meta: {} };
  const C = () => CC.CONFIG.endless;
  const CLEAR = [9.6, 8.4, 7.4, 6.6];   // rayon du tube de dégagement autour de la trajectoire, par palier

  /* profil de chaque zone : elev (altitude du sol), vol (demi-largeur du volume), y [bas, haut] (plage de la trajectoire au-dessus du
   * sol), amp (amplitude latérale relative de la trajectoire) */
  const PROFILE = {
    city:   { elev: 0,   vol: 27, y: [9, 30],  amp: 0.55 },
    forest: { elev: 0,   vol: 33, y: [8, 28],  amp: 1.0 },
    metro:  { elev: -44, vol: 19, y: [5, 13],  amp: 0.5 },
    port:   { elev: 0,   vol: 50, y: [6, 34],  amp: 0.85 },
    sky:    { elev: 170, vol: 75, y: [10, 64], amp: 1.3 },
    mini:   { elev: 0,   vol: 42, y: [5, 24],  amp: 0.85 },
    chute:  { elev: 0,   vol: 46, y: [8, 248], amp: 1.1, drift: [245, 22] },     // chute libre : on tombe de 245 m à 22 m le long d'immeubles géants
    tour:   { elev: 0,   vol: 36, y: [8, 250], amp: 0.8, drift: [12, 236] },     // ascension : on monte de 12 m à 236 m le long d'une tour
    eau:    { elev: -70, vol: 52, y: [6, 44],  amp: 1.2 },                        // sous l'eau : le fond est à −70 m
    usine:  { elev: 0,   vol: 38, y: [6, 40],  amp: 0.7 },                        // halle d'usine
  };
  Z.PROFILE = PROFILE;
  // zones voisines autorisées (le sol ne saute jamais de la base aérienne au métro)
  const NEXT = {
    city:   ['forest', 'metro', 'port', 'tour', 'mini', 'usine', 'eau', 'sky'],
    forest: ['city', 'port', 'mini', 'tour', 'usine', 'sky'],
    metro:  ['city', 'port', 'forest', 'mini', 'usine'],
    port:   ['city', 'eau', 'metro', 'forest', 'usine', 'tour', 'sky'],
    sky:    ['chute', 'city', 'port', 'forest'],
    mini:   ['city', 'forest', 'port'],
    chute:  ['city', 'port', 'forest', 'metro', 'eau'],
    tour:   ['sky', 'chute'],
    eau:    ['port', 'city', 'forest'],
    usine:  ['city', 'port', 'metro', 'forest', 'mini', 'tour'],
  };
  // v053 : ordre ALEATOIRE (graphe de voisinage) en jeu normal comme en test
  Z.order = function (seed, allowed, n) { return Z.randomOrder(seed, allowed, n); };
  Z.randomOrder = function (seed, allowed, n) {
    const r = G.stream(seed, 'zorder'), ok = (id) => !allowed || allowed.includes(id), out = ['city'];
    while (out.length < n) {
      const cur = out[out.length - 1], last2 = out.slice(-3);
      let cand = NEXT[cur].filter((z) => ok(z) && !last2.includes(z));
      if (!cand.length) cand = NEXT[cur].filter((z) => ok(z) && z !== cur);
      if (!cand.length) cand = ['city'];
      // les zones rarement vues sont préférées (chaque partie fait le tour)
      const w = {}; for (const z of cand) w[z] = 1 + 6 * (out.indexOf(z) < 0 ? 1 : 0) + (z === 'sky' || z === 'tour' || z === 'chute' ? 3 : 0) - (z === 'eau' ? 0.6 : 0);   // v053 : les zones aériennes sortent plus souvent, la profondeur un peu moins   // v038 : une zone pas encore vue dans la partie est très fortement préférée (toutes les zones tournent)
      out.push(r.weighted(w));
    }
    return out;
  };

  // ---------- ambiances propres aux nouvelles zones (sobres : pas de lumières qui clignotent ni de couleurs saturées) ----------
  const E = (id, o) => G.Envs.add(id, o);
  const SUN = (r, lo, hi) => { const a = r() * 6.283, y = r.between([lo, hi]), h = Math.sqrt(Math.max(0, 1 - y * y)); return [G.round(Math.cos(a) * h, 3), G.round(y, 3), G.round(Math.sin(a) * h, 3)]; };
  E('metroLight', { label: 'METRO', dark: 0.6, vis: 0.6, skyline: '#0a0e12', make: (r) => ({
    sky: { top: '#0a0e12', horizon: '#14202a', bottom: '#0a0e12' },
    fog: { color: '#0e1a22', near: 40, far: r.between([300, 380]) },
    hemi: { sky: '#b8c8d0', ground: '#3a4650', intensity: 1.05 }, ambient: { color: '#ffffff', intensity: 0.42 },
    sun: { color: '#d8e4ff', intensity: 0.12, dir: [0.2, 0.9, 0.3], shadow: false },
    postfx: { vignette: 0.55, vignetteColor: '#000000', halftone: 0.3, lift: '#04080c', saturation: 0.95 },
  }) });
  E('harbor', { label: 'PORT', dark: 0, vis: 1, skyline: '#dfe8ee', make: (r) => ({
    sky: { top: '#6fa4d8', horizon: '#eaf2f6', bottom: '#b8cdd8', sunColor: '#fff4dc', sunSize: 500 },
    fog: { color: '#dde8ee', near: 170, far: r.between([900, 1100]) },
    hemi: { sky: '#e4f0f8', ground: '#8a98a0', intensity: 0.72 }, ambient: { color: '#ffffff', intensity: 0.26 },
    sun: { color: '#fff4e0', intensity: 0.8, dir: SUN(r, [0.5, 0.75]) },
    postfx: { vignette: 0.5, vignetteColor: '#1a2a3a', halftone: 0.4, lift: '#060a10', saturation: 0.95 },
  }) });
  E('harborDusk', { label: 'PORT AU COUCHANT', dark: 0.25, vis: 0.85, skyline: '#9a8a9a', make: (r) => ({
    sky: { top: '#3a5078', horizon: '#f0b890', bottom: '#6a5a68', sunColor: '#ffd0a0', sunSize: 600 },
    fog: { color: '#b89aa0', near: 130, far: r.between([760, 920]) },
    hemi: { sky: '#d8c8d0', ground: '#5a5058', intensity: 0.66 }, ambient: { color: '#ffe8d8', intensity: 0.24 },
    sun: { color: '#ffb880', intensity: 0.7, dir: SUN(r, [0.14, 0.26]) },
    postfx: { vignette: 0.5, vignetteColor: '#2a1a28', halftone: 0.4, lift: '#080410', saturation: 0.92 },
  }) });
  E('altitude', { label: 'ALTITUDE', dark: 0, vis: 1, skyline: '#e8f0fa', make: (r) => ({
    sky: { top: '#2a5aa8', horizon: '#dfeaf6', bottom: '#eef4fa', sunColor: '#ffffff', sunSize: 500 },
    fog: { color: '#e4eefa', near: 260, far: r.between([1250, 1380]) },
    hemi: { sky: '#eaf2ff', ground: '#9aa8c0', intensity: 0.8 }, ambient: { color: '#ffffff', intensity: 0.3 },
    sun: { color: '#ffffff', intensity: 0.95, dir: SUN(r, [0.6, 0.85]) },
    postfx: { vignette: 0.42, vignetteColor: '#1a2a4a', halftone: 0.35, lift: '#04060c', saturation: 0.95 },
  }) });
  E('miniRoom', { label: 'PIECE', dark: 0.05, vis: 0.9, skyline: '#e8dcc8', make: (r) => ({
    sky: { top: '#d8c8a8', horizon: '#e0d2b4', bottom: '#b8a88a' },
    fog: { color: '#cdbf9f', near: 140, far: r.between([640, 760]) },
    hemi: { sky: '#f2e2c4', ground: '#6e5f48', intensity: 0.5 }, ambient: { color: '#f0e0c4', intensity: 0.14 },
    sun: { color: '#ffe0b0', intensity: 0.4, dir: [0.35, 0.8, 0.45] },
    postfx: { vignette: 0.55, vignetteColor: '#2a1a0a', halftone: 0.35, lift: '#0a0604', saturation: 1.0, bloomThreshold: 0.9, bloomStrength: 0.2 },
  }) });

  E('neonNight', { label: 'NUIT NEON', dark: 0.75, vis: 0.6, skyline: '#2a1650', make: (r) => ({
    sky: { top: '#0a0a26', horizon: '#5a1f6a', bottom: '#140a2a', stars: true, sunColor: '#9aa8ff', sunSize: 260 },
    fog: { color: '#2e1a58', near: 70, far: r.between([600, 680]) },
    hemi: { sky: '#8a7ac8', ground: '#2a2040', intensity: 0.95 }, ambient: { color: '#8a80c0', intensity: 0.42 },
    sun: { color: '#9ab4ff', intensity: 0.5, dir: SUN(r, [0.5, 0.75]) },
    postfx: { vignette: 0.5, vignetteColor: '#0a0418', chromatic: 0.004, halftone: 0.3, lift: '#140a26', saturation: 1.1, bloomThreshold: 0.6, bloomStrength: 0.75 },
  }) });
  E('altitudeDusk', { label: 'ALTITUDE COUCHANT', dark: 0.2, vis: 1, skyline: '#f0b898', make: (r) => ({
    sky: { top: '#2a2a6a', horizon: '#ffb080', bottom: '#f0a890', sunColor: '#ffc090', sunSize: 420 },
    fog: { color: '#f0b898', near: 220, far: r.between([1150, 1300]) },
    hemi: { sky: '#ffe0d0', ground: '#8a6a7a', intensity: 0.72 }, ambient: { color: '#ffe0d0', intensity: 0.28 },
    sun: { color: '#ffb880', intensity: 0.85, dir: SUN(r, [0.12, 0.24]) },
    postfx: { vignette: 0.45, vignetteColor: '#2a1430', halftone: 0.35, lift: '#0a0410', saturation: 1.0 },
  }) });
  E('forestDay', { label: 'FORET', dark: 0.05, vis: 0.85, skyline: '#cfe0cc', make: (r) => ({
    sky: { top: '#6aa0c8', horizon: '#dfeee0', bottom: '#b8c8b0', sunColor: '#fff0c8', sunSize: 500 },
    fog: { color: '#cfe0cc', near: 60, far: r.between([640, 760]) },
    hemi: { sky: '#dcecd8', ground: '#4a5a3a', intensity: 0.8 }, ambient: { color: '#f0f8e8', intensity: 0.28 },
    sun: { color: '#fff0c8', intensity: 0.7, dir: SUN(r, [0.45, 0.7]) },
    postfx: { vignette: 0.5, vignetteColor: '#10200a', halftone: 0.4, lift: '#040a04', saturation: 0.95 },
  }) });
  E('forestDusk', { label: 'FORET AU COUCHANT', dark: 0.3, vis: 0.75, skyline: '#8a7a78', make: (r) => ({
    sky: { top: '#2a3a5a', horizon: '#f0a878', bottom: '#5a4a50', sunColor: '#ffc090', sunSize: 500 },
    fog: { color: '#94807e', near: 50, far: r.between([560, 660]) },
    hemi: { sky: '#d8c0c0', ground: '#3a4a30', intensity: 0.7 }, ambient: { color: '#ffd8c0', intensity: 0.28 },
    sun: { color: '#ffb080', intensity: 0.7, dir: SUN(r, [0.12, 0.24]) },
    postfx: { vignette: 0.52, vignetteColor: '#1a0a10', halftone: 0.4, lift: '#0a0408', saturation: 0.95 },
  }) });
  E('forestNight', { label: 'FORET LA NUIT', dark: 0.55, vis: 0.6, skyline: '#0e2230', make: (r) => ({
    sky: { top: '#050a18', horizon: '#14323e', bottom: '#050e14', stars: true, sunColor: '#b0c8ff', sunSize: 300 },
    fog: { color: '#0e2230', near: 40, far: r.between([500, 580]) },
    hemi: { sky: '#6a90b0', ground: '#14241c', intensity: 1.1 }, ambient: { color: '#8ab0d0', intensity: 0.45 },
    sun: { color: '#b0c8ff', intensity: 0.75, dir: SUN(r, [0.55, 0.8]) },
    postfx: { vignette: 0.55, vignetteColor: '#000408', chromatic: 0.004, halftone: 0.3, lift: '#06101a', saturation: 1.0, bloomThreshold: 0.65, bloomStrength: 0.65 },
  }) });
  E('deepSea', { label: 'PROFONDEUR', dark: 0.3, vis: 0.5, skyline: '#0a4a5a', make: (r) => ({
    sky: { top: '#04303a', horizon: '#0a4a5a', bottom: '#021018' },
    fog: { color: '#0a4a5a', near: 10, far: r.between([250, 300]) },
    hemi: { sky: '#7ad0e0', ground: '#0a2a34', intensity: 0.95 }, ambient: { color: '#9ad8e8', intensity: 0.42 },
    sun: { color: '#bff4ff', intensity: 0.5, dir: [0.1, 1, 0.1], shadow: false },
    postfx: { vignette: 0.6, vignetteColor: '#001018', halftone: 0.3, lift: '#00141c', saturation: 0.95, tint: '#d8f8ff' },
  }) });
  E('factoryHall', { label: 'USINE', dark: 0.5, vis: 0.6, skyline: '#3a342c', make: (r) => ({
    sky: { top: '#2a2622', horizon: '#3a342c', bottom: '#1c1814' },
    fog: { color: '#3a342c', near: 40, far: r.between([420, 480]) },
    hemi: { sky: '#d8c8a8', ground: '#3a3028', intensity: 1.0 }, ambient: { color: '#ffe8c8', intensity: 0.42 },
    sun: { color: '#ffd8a0', intensity: 0.3, dir: [0.3, 0.9, 0.3], shadow: false },
    postfx: { vignette: 0.55, vignetteColor: '#140c04', halftone: 0.35, lift: '#100804', saturation: 0.95 },
  }) });

  // méta-données des zones pour endless.js (libellé, ambiances, sol)
  Z.meta.city = { label: 'AVENUE', envs: ['day', 'overcast', 'harborDusk', 'neonNight'], ground: 'asphalt', groundTint: '#ffffff', city: true,
    wall: (r) => ({ mat: { side: r.pick(['facade', 'facadePink', 'facadeTan']), top: 'concrete', bottom: 'concreteDark' }, tint: r.pick(['#ffffff', '#f2eee8', '#e8ecf0']) }), obstacle: 'concrete', obstacleTint: '#d8d4cc' };
  Z.meta.metro = { label: 'METRO', envs: ['metroLight'], ground: 'concreteDark', groundTint: '#b8bcc0', wall: () => ({ mat: { side: 'concrete', top: 'concreteDark' }, tint: '#c8ccd0' }), obstacle: 'concrete', obstacleTint: '#c8ccd0' };
  Z.meta.port = { label: 'PORT', envs: ['harbor', 'harborDusk', 'neonNight'], ground: 'concrete', groundTint: '#d8d8d4', wall: () => ({ mat: { side: 'corrugated', top: 'metal' }, tint: '#c8ccd0' }), obstacle: 'metal', obstacleTint: '#c8ccd4' };
  Z.meta.sky = { label: 'BASE AERIENNE', envs: ['altitude', 'altitudeDusk'], ground: 'concreteDark', groundTint: '#b8bcc4', wall: () => ({ mat: { side: 'metal', top: 'concreteDark' }, tint: '#d0d4dc' }), obstacle: 'metal', obstacleTint: '#d0d4dc' };
  Z.meta.mini = { label: 'MONDE MINIATURE', envs: ['miniRoom'], ground: 'planks', groundTint: '#d8b888', wall: () => ({ mat: { side: 'concreteWarm', top: 'concrete' }, tint: '#e8d8b8' }), obstacle: 'planks', obstacleTint: '#d8b888' };
  Z.meta.forest = { label: 'FORET', envs: ['forestDay', 'forestDusk', 'forestNight'], ground: 'dirt', groundTint: '#5a6a48', wall: (r) => ({ mat: { side: 'rock', top: 'grass' }, tint: r.pick(['#8a9a82', '#7a8a72']) }), obstacle: 'rock', obstacleTint: '#8a9a82' };

  Z.meta.chute = { label: 'CHUTE', envs: ['altitude', 'altitudeDusk', 'neonNight'], ground: 'asphalt', groundTint: '#b8b8b8', wall: Z.meta.city.wall, obstacle: 'concrete', obstacleTint: '#d8d4cc' };
  Z.meta.tour = { label: 'ASCENSION', envs: ['altitude', 'altitudeDusk', 'neonNight'], ground: 'asphalt', groundTint: '#b8b8b8', wall: Z.meta.city.wall, obstacle: 'concrete', obstacleTint: '#d8d4cc' };
  Z.meta.eau = { label: 'PROFONDEUR', envs: ['deepSea'], ground: 'sand', groundTint: '#8aa8a0', wall: () => ({ mat: { side: 'rock', top: 'sand' }, tint: '#6a8a90' }), obstacle: 'rock', obstacleTint: '#6a8a90' };
  Z.meta.usine = { label: 'USINE', envs: ['factoryHall'], ground: 'concreteDark', groundTint: '#a8a49c', wall: () => ({ mat: { side: 'corrugated', top: 'metal' }, tint: '#b8b4a8' }), obstacle: 'metal', obstacleTint: '#b8b4a8' };

  // ---------- profil interpolé : transitions autour de chaque frontière de zone ----------
  // hw(k) : demi-largeur de la transition à la frontière k (plus le sol monte, plus elle est longue)
  Z.hw = (T, k) => Math.max(130, 1.8 * Math.abs(T.elev(k) - T.elev(k - 1)));
  Z.trans = (T, d) => {       // { z0, z1, t } : zones de part et d'autre et avancement (0 → 1) de la transition autour de d
    const L = C().zoneLen, off = T.off || 0, k0 = Math.round((d + off) / L), B = k0 * L - off;
    if (d <= 0 || k0 < 1) return { z0: T.zoneOrder[0], z1: T.zoneOrder[0], t: 1, k: 0 };
    const hw = Z.hw(T, k0);
    if (Math.abs(d - B) > hw) { const z = T.zoneOrder[T.zoneIndex(d) % T.zoneOrder.length]; return { z0: z, z1: z, t: 1, k: 0 }; }
    return { z0: T.zoneOrder[(k0 - 1) % T.zoneOrder.length], z1: T.zoneOrder[k0 % T.zoneOrder.length], t: U.smooth(B - hw, B + hw, d), k: k0 };
  };
  // centre de la plage de hauteur de vol d'une zone à la distance d (les zones à dérive montent ou descendent sur toute leur longueur)
  Z.yCenter = (T, zone, zi, d) => {
    const P = PROFILE[zone];
    if (!P.drift) return (P.y[0] + P.y[1]) / 2;
    const L = C().zoneLen, k = U.clamp((d + (T.off || 0) - zi * L) / L, 0, 1); return P.drift[0] + (P.drift[1] - P.drift[0]) * k;
  };
  Z.prof = (T, d, key) => {
    const tr = Z.trans(T, d), a = PROFILE[tr.z0][key], b = PROFILE[tr.z1][key];
    return Array.isArray(a) ? [a[0] + (b[0] - a[0]) * tr.t, a[1] + (b[1] - a[1]) * tr.t] : a + (b - a) * tr.t;
  };

  Z.TURN_PRESETS = [[[0.1, 0.9, 55]], [[0.1, 0.9, 40]], [[0.06, 0.46, 35], [0.54, 0.94, -35]], [[0.1, 0.9, 70]], [[0.1, 0.9, 30]]];   // virages : [début, fin, degrés] en fractions de la scène
  // ---------- plan des scènes d'une zone ----------
  Z.plan = function (T, zi) {
    T._plans = T._plans || {};
    if (T._plans[zi]) return T._plans[zi];
    const zone = T.zoneOrder[zi % T.zoneOrder.length], def = Z.defs[zone], cfg = C(), L = cfg.zoneLen, start = Math.max(0, zi * L - (T.off || 0)), end = zi * L - (T.off || 0) + L;
    const plan = T._plans[zi] = { zone, zi, scenes: [], pins: [] };
    const dIn = zi > 0 && T.elev(zi) !== T.elev(zi - 1), dOut = T.elev(zi + 1) !== T.elev(zi), tight = def && def.tight;
    const padIn = zi === 0 ? 0 : dIn ? Z.hw(T, zi) + (tight ? 4 : 50) : 40, padOut = dOut ? Z.hw(T, zi + 1) + (tight ? 4 : 50) : 40;
    if (!def) {
      const lsc = { name: 'legacy', d0: start + padIn, d1: end - padOut, zone, zi, key: zi + '_0', stage: 0 }; plan.scenes.push(lsc);
      const lr = G.stream(T.seed, 'lturn' + zi); lsc.turns = []; let at = lsc.d0 + 320 + lr() * 200;   // v064 : la forêt tourne aussi (scène unique : virages répartis)
      while (at + 260 < lsc.d1 - 100) { lsc.turns.push({ d0: at, d1: at + 240, ang: [55, 40, 70, 35][Math.floor(lr() * 4)] * (lr() < 0.5 ? -1 : 1) * Math.PI / 180 }); at += 240 + 320 + lr() * 400; }
      return plan;
    }
    const r = G.stream(T.seed, 'plan' + zi);
    const skipQ = (new URLSearchParams(location.search).get('skip') || '').split(',');
    skipQ.push('rame', 'presses', 'bras', 'chaine', 'grues', 'squelette', 'arche', 'levant', 'convoi', 'camp', 'helis', 'convoi2', 'camp2', 'helis2');   // v073 : scènes avec éléments mobiles ou superflus   // banc de test : ?skip=city1,escalier
    const names = Object.keys(def.scenes).filter((n) => n !== def.signature && skipQ.indexOf(n) < 0);
    for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = names[i]; names[i] = names[j]; names[j] = t; }
    if (def.early) {   // v057 : une scène « copie du niveau d'origine » + une scène spéciale parmi les premières de la zone (jamais en toute première)
      const sp = [];
      for (const grp of def.early) { const av = grp.filter((n) => names.indexOf(n) >= 0 && sp.indexOf(n) < 0); if (av.length) sp.push(av[Math.floor(r() * av.length)]); }
      for (const n of sp) names.splice(names.indexOf(n), 1);
      names.splice(Math.min(1, names.length), 0, ...sp);
    }
    if (zi === 0 && def.notFirst) { const k = names.findIndex((n) => def.notFirst.indexOf(n) < 0); if (def.notFirst.indexOf(names[0]) >= 0 && k > 0) { const t = names[0]; names[0] = names[k]; names[k] = t; } }   // v056 : pas de scène en altitude juste au départ
    const total = end - padOut - (start + padIn);
    const sigAt = def.signature ? Math.max(1, Math.round(names.length * r.between([0.45, 0.65]))) : -1;
    if (sigAt > 0) names.splice(Math.min(sigAt, names.length), 0, def.signature);
    let d = start + padIn, i = 0;
    while (d < end - padOut - 70 && i < 40) {
      const nm = names[i % names.length], sd = def.scenes[nm];
      if (zi === 0 && def.notFirst && plan.scenes.length === 0 && def.notFirst.indexOf(nm) >= 0 && (T._nf = (T._nf || 0) + 1) < 200) { names.push(names.splice(i % names.length, 1)[0]); continue; }   // jamais de montée / chute en toute première scène
      if (sd.minD && d < sd.minD && (T._mg = (T._mg || 0) + 1) < 4000) { names.push(names.splice(i % names.length, 1)[0]); continue; }   // v068 : scènes militaires seulement plus loin (reportées en fin de liste)
      let len = r.between(sd.len);
      if (sd.len[0] === sd.len[1] && d + len > end - padOut) { i++; continue; }   // v057 : scène à longueur fixe (copie du niveau City) : elle ne se tronque pas
      if (d + len > end - padOut) len = end - padOut - d;
      if (len < 80) break;
      const sc = { name: nm, d0: d, d1: d + len, zone, zi, key: zi + '_' + i, stage: Math.min(3, Math.floor(d / cfg.stageLen)) };
      plan.scenes.push(sc);
      if (sd.turns) { const tr0 = G.stream(T.seed, 'turn' + sc.key), sg = tr0() < 0.5 ? -1 : 1, spec = sd.turns === 'auto' ? Z.TURN_PRESETS[Math.floor(tr0() * Z.TURN_PRESETS.length)] : sd.turns; sc.turns = spec.map((t) => ({ d0: sc.d0 + t[0] * len, d1: sc.d0 + t[1] * len, ang: sg * t[2] * Math.PI / 180 })); }   // v063 : virages (fractions de la scène, degrés)
      if (sd.pin) { const p = sd.pin(T, sc, G.stream(T.seed, 'pin' + sc.key)); if (p) { p.d0 = sc.d0 + (p.from || 0); p.d1 = p.to !== undefined ? sc.d0 + p.to : sc.d1; plan.pins.push(p); } }
      d += len; i++;
    }
    if (plan.scenes.length) { plan.scenes[0].first = true; plan.scenes[plan.scenes.length - 1].last = true; }
    return plan;
  };
  // trajectoire : tient compte des « épingles » (scènes qui imposent le passage : avion, pont levant, tasse…)
  Z.pinAt = (T, d) => {
    const zi = T.zoneIndex(d), out = [];
    for (const k of [zi - 1, zi, zi + 1]) { if (k < 0) continue; const p = Z.plan(T, k); for (const q of p.pins) if (d > q.d0 - 70 && d < q.d1 + 70) out.push(q); }
    return out;
  };

  // ---------- contexte d'une scène ----------
  class Scene {
    constructor(ctx, sc) {
      this.ctx = ctx; this.b = ctx.b; this.T = ctx.T; this.game = ctx.game; this.sc = sc; this.zone = sc.zone;
      this.c0 = ctx.d0; this.c1 = ctx.d1; this.d0 = sc.d0; this.d1 = sc.d1; this.len = sc.d1 - sc.d0; this.mid = (sc.d0 + sc.d1) / 2;
      this.stage = sc.stage; this.R = U.lerp(9.6, 6.3, U.clamp(sc.d0 / 8000, 0, 1));   // v072 : le tube de dégagement se rétrécit à mesure qu'on avance
      this.sr = G.stream(ctx.T.seed, 'sc' + sc.key); this.sr.pick = (a) => a[Math.floor(this.sr() * a.length)];
      this.ic = 0; this.rects = ctx.reserved.slice(); this.env = ctx.T.env(sc.zi); this.dark = !!(this.env && this.env.dark > 0.4);
      this.vol = (dc) => ctx.T.vol(dc);
    }
    get gates() { return this.ctx.gates; }
    inClip(dc) { return dc >= this.c0 && dc < this.c1; }
    lane(dc) { return { lx: this.T.laneX(dc), y: this.T.laneY(dc) }; }
    yaw(dc) { return this.T.yawAcross(dc); }
    // un objet : son propre flux aléatoire (toujours consommé, même hors du tronçon → tirage reproductible)
    item(dc, fn) {
      const r = G.stream(this.T.seed, 'it' + this.sc.key + '_' + (this.ic++)); r.pick = (a) => a[Math.floor(r() * a.length)];
      if (!this.inClip(dc)) return false;
      fn(r); return true;
    }
    // boîte dans le repère du couloir : dc (distance), lx (travers), yc (centre en hauteur au-dessus du sol), w × h × dd
    bx(dc, lx, yc, w, h, dd, mat, tint, collide, o) {
      if (!this.inClip(dc)) return null;
      { const dth = Math.abs(this.T.theta(dc + dd / 2) - this.T.theta(dc - dd / 2)); if (dth > 0.003) dd += (Math.abs(lx) + w / 2) * dth; }   // v064 : en virage, recouvrement des tranches
      return this.b.box(Object.assign({ p: this.T.at(dc, lx, yc), s: [w, h, dd], r: [0, this.yaw(dc), 0], mat, tint, collide: collide !== false }, o || {}));
    }
    // idem avec roulis (degrés) autour de l'axe du couloir, ou cap supplémentaire
    bxr(dc, lx, yc, w, h, dd, mat, tint, roll, dyaw, collide) {
      if (!this.inClip(dc)) return null;
      { const dth = Math.abs(this.T.theta(dc + dd / 2) - this.T.theta(dc - dd / 2)); if (dth > 0.003) dd += (Math.abs(lx) + w / 2) * dth; }
      return this.b.box({ p: this.T.at(dc, lx, yc), s: [w, h, dd], r: [0, this.yaw(dc) + (dyaw || 0), roll || 0], mat, tint, collide: collide !== false });
    }
    cyl(dc, lx, y0, rad, h, mat, tint, seg, rTop, collide) {
      if (!this.inClip(dc)) return null;
      return this.b.cylinder({ p: this.T.at(dc, lx, y0 + h / 2), rBot: rad, rTop: rTop === undefined ? rad : rTop, h, seg: seg || 10, mat, tint, collide: collide !== false, colSize: [rad * 1.7, h, rad * 1.7] });
    }
    ball(dc, lx, yc, rad, mat, tint, collide, sy) {
      if (!this.inClip(dc)) return;
      const p = this.T.at(dc, lx, yc), g = new THREE.SphereGeometry(rad, 12, 9);
      this.b.addGeometry(g, new V(p[0], p[1], p[2]), new THREE.Quaternion(), new V(1, sy || 1, 1), mat, tint); g.dispose();
      if (collide !== false) this.b.box({ p, s: [rad * 1.5, rad * 1.5 * (sy || 1), rad * 1.5], r: [0, 0, 0], render: false });
    }
    // anneau-portique : quatre boîtes autour d'une ouverture (w × h) centrée en (lx, yc)
    frame(dc, lx, yc, holeW, holeH, totW, totH, dd, mat, tint, yLo) {
      const y0 = yc - holeH / 2, y1 = yc + holeH / 2, lo = yLo === undefined ? 0 : yLo;
      const sw = (totW - holeW) / 2;
      this.bx(dc, lx - holeW / 2 - sw / 2, (lo + lo + totH) / 2, sw, totH, dd, mat, tint);
      this.bx(dc, lx + holeW / 2 + sw / 2, (lo + lo + totH) / 2, sw, totH, dd, mat, tint);
      if (y1 < lo + totH) this.bx(dc, lx, (y1 + lo + totH) / 2, holeW + 0.2, lo + totH - y1, dd, mat, tint);
      if (y0 > lo + 0.3) this.bx(dc, lx, (lo + y0) / 2, holeW + 0.2, y0 - lo, dd, mat, tint);
    }
    // mur entre xl et xr (travers) et y0..y1 (hauteur), percé ou non d'un trou { lx, yc, w, h } : jusqu'à 4 boîtes
    wall(dc, xl, xr, y0, y1, dd, mat, tint, hole) {
      const box = (a, b, c, d) => { if (b - a > 0.05 && d - c > 0.05) this.bx(dc, (a + b) / 2, (c + d) / 2, b - a, d - c, dd, mat, tint); };
      if (!hole) { box(xl, xr, y0, y1); return; }
      const hl = hole.lx - hole.w / 2, hr = hole.lx + hole.w / 2, hb = hole.yc - hole.h / 2, ht = hole.yc + hole.h / 2;
      box(xl, hl, y0, y1); box(hr, xr, y0, y1); box(hl, hr, ht, y1); box(hl, hr, y0, hb);
    }
    // anneaux d'or (séries) : n anneaux espacés de gap m à partir de dc, sur la trajectoire ; le passage à travers tous = SERIE PARFAITE
    rings(dc, n, gap, radius) {
      return;   // v073 : plus d'anneaux d'or (information superflue)
      const gid = this.sc.key + '_' + dc, rad = radius || 8;
      for (let i = 0; i < n; i++) { const d = dc + i * gap; if (!this.inClip(d)) continue; const L = this.lane(d);
        this.ctx.rings.push({ d, lx: L.lx, y: L.y, rad, gid, n, i });
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, off = rad + 0.4; this.bxr(d, L.lx + Math.sin(a) * off, L.y + Math.cos(a) * off, 2 * rad * Math.tan(Math.PI / 8) + 0.9, 0.7, 0.7, 'basic:#ffc820', undefined, -a * DEG, 0, false); }
        this.gate(d, L.lx, L.y); }
    }
    // enseigne lumineuse (néon) : barre émissive + halo ; ne s'allume que la nuit (this.dark)
    neon(dc, lx, yc, w, h, dd, color, glowSize) {
      if (!this.inClip(dc)) return;
      this.bx(dc, lx, yc, w, h, dd, 'basic:' + color, undefined, false, { shadow: false });
      this.glow(dc, lx, yc, color, glowSize || Math.max(w, h, dd) * 1.6 + 3);
    }
    glow(dc, lx, y, color, size) { if (!this.inClip(dc) || !this.ctx.glows) return; const p = this.T.at(dc, lx, y); this.ctx.glows.push({ x: p[0], y: p[1], z: p[2], c: color, s: size || 6 }); }
    // tube polygonal autour de l'axe du couloir (fuselage, tunnel) : n panneaux, rayon intérieur rad, épaisseur th
    tube(dc, lx, yc, rad, len, mat, tint, sides, th, collide) {
      const n = sides || 8, w = 2 * rad * Math.tan(Math.PI / n) + th * 1.6;
      for (let i = 0; i < n; i++) {
        const a = i * 2 * Math.PI / n, off = rad + th / 2;
        this.bxr(dc, lx + Math.sin(a) * off, yc + Math.cos(a) * off, w, th, len, mat, tint, -a * DEG, 0, collide);
      }
    }
    item_rng(dc) { return G.stream(this.T.seed, 'x' + dc); }
    // la trajectoire traverse-t-elle cette boîte (agrandie du tube de dégagement) ?
    conflict(dc, lx, w, dd, y0, h, pad) {
      const Rr = this.R + (pad || 0), T = this.T;
      for (let d = dc - dd / 2 - Rr; d <= dc + dd / 2 + Rr; d += 5) {
        const ly = T.laneY(d);
        if (Math.abs(T.laneX(d) - lx) < w / 2 + Rr && ly > y0 - Rr && ly < y0 + h + Rr) return true;
      }
      return false;
    }
    overlaps(dc, lx, w, dd, m) { return this.rects.some((q) => Math.abs(q.d - dc) < (q.dd + dd) / 2 + (m || 2) && Math.abs(q.lx - lx) < (q.w + w) / 2 + (m || 2)); }
    // place un objet s'il ne gêne ni la trajectoire ni un autre objet ; fn(r) le construit. Retourne true si posé.
    place(dc, lx, w, dd, y0, h, fn, opts) {
      opts = opts || {};
      if (dc < this.d0 + 6 || dc > this.d1 - 6 || Math.abs(lx) + w / 2 > (opts.vol || this.vol(dc)) + (opts.over || 0) || this.conflict(dc, lx, w, dd, y0, h, opts.pad) || this.overlaps(dc, lx, w, dd, opts.m)) return false;
      this.rects.push({ d: dc, lx, w, dd });
      this.item(dc, fn); return true;
    }
    reserve(dc, lx, w, dd) { this.rects.push({ d: dc, lx, w, dd }); }
    // contexte du kit du générateur de missions (bâtiments à fenêtres, arbres, voitures…)
    kc(r) { return { r, dark: this.dark, snow: false, biome: { id: this.zone === 'sky' ? 'mil' : 'urban' }, proto: {}, env: this.env }; }
    kit(name, r, it) { const fn = G.Kit.builders[name]; if (fn) fn(this.b, it, this.kc(r)); }
    at(dc, lx, y) { return this.T.at(dc, lx, y); }
    // rangée régulière le long d'un côté : fn(dc, r, i) appelé à chaque pas (pas ± jitter), de from à to
    rows(from, to, step, jit, fn) {
      let dc = from + this.sr() * step * 0.5, i = 0;
      while (dc < to) { fn(dc, i++); dc += step * (1 + (this.sr() - 0.5) * 2 * jit); }
    }
    // point de passage pour le pilote automatique / les matériaux
    gate(dc, lx, y) { this.ctx.gates.push({ d: dc, lx, y }); }
  }
  Z.Scene = Scene;

  // ---------- sol par zone (tranches de 20 m) ----------
  function groundSlice(ctx, d, e) {
    const T = ctx.T, b = ctx.b, m = (d + e) / 2, tr = Z.trans(T, m), zone = tr.t < 0.5 ? tr.z0 : tr.z1, inRamp = tr.k && T.elev(tr.k) !== T.elev(tr.k - 1);
    const y0 = T.base(d), y1 = T.base(e), ym = (y0 + y1) / 2, pitch = Math.atan2(y1 - y0, e - d) * DEG, len = (e - d) + 1.6, W = 2 * (T.vol(m) + 30);
    const YW = T.yawAcross(m), dth = Math.abs(T.theta(e) - T.theta(d)), len2 = len + 60 * dth;
    const rawBox = b['box'].bind(b);
    const GP = (lx, y) => { const p = T.at(m, lx, 0); p[1] = y; return p; };
    const bx2 = (o) => { if (!o.r) o.r = [0, YW, 0]; else if (o.r[1] === 0) o.r = [o.r[0], YW, o.r[2]]; if (o.s) o.s = [o.s[0], o.s[1], o.s[2] + (o.s[2] === len ? 60 * dth : 0)]; return rawBox(o); };
    const slab = (yoff, w, th, mat, tint, extra) => {   // sol physique limité à 260 m de large (grille de collision) ; au-delà : plan visuel sans collision
      const cw = Math.min(w, 260), ex = extra || {};
      if (w > cw) bx2({ p: GP(0, ym + yoff - 0.02), s: [w, th, len], r: [pitch, 0, 0], mat, tint, collide: false, shadow: false });
      return bx2(Object.assign({ p: GP(0, ym + yoff), s: [cw, th, len], r: [pitch, 0, 0], mat, tint, ground: true }, ex));
    };
    if (inRamp) {
      slab(-1, 900, 2, (T.zoneOrder[(tr.k - 1) % T.zoneOrder.length] === 'forest' || T.zoneOrder[tr.k % T.zoneOrder.length] === 'forest') ? 'rock' : 'concreteDark', '#8a8e96');   // v038e : rampe en béton gris (le rocher clair éblouissait)
      if (tr.z0 === 'eau' || tr.z1 === 'eau') bx2({ p: GP(0, -3.6), s: [2 * (T.vol(m) + 90), 0.2, len], mat: 'waterSurf', collide: false, shadow: false });   // v038 : la même surface d'eau sur la rampe qui y plonge
      return;
    }
    if (zone === 'city') {
      slab(-1, 900, 2, 'asphalt', '#ffffff');
      for (const s of [-1, 1]) bx2({ p: GP(s * (T.vol(m) - 4.4), ym + 0.15), s: [9, 0.36, len], r: [pitch, 0, 0], mat: 'concrete', tint: '#d8d8d4', collide: false, shadow: false });
    } else if (zone === 'metro') {
      slab(-1, 2 * (T.vol(m) + 20), 2, 'concreteDark', '#a8acb0');
    } else if (zone === 'port') {
      const q = 17;    // le quai : bande centrale ; autour, l'eau
      slab(-1, 2 * q, 2, 'concrete', '#c8c8c4');
      for (const s of [-1, 1]) bx2({ p: GP(s * (q + 120), ym - 3.6), s: [900, 2, len], r: [pitch, 0, 0], mat: 'water', ground: true });
      for (const s of [-1, 1]) bx2({ p: GP(s * q, ym - 0.4), s: [0.8, 1.6, len], r: [pitch, 0, 0], mat: 'concreteDark', collide: false, shadow: false });
    } else if (zone === 'sky') {
      const hw = 50;
      slab(-2, 2 * hw, 4, 'concreteDark', '#8c929c');
      slab(-46, 2 * hw - 18, 88, 'rock', '#9aa0aa', { collide: true });              // le plateau sous la piste
      bx2({ p: GP(0, ym - 120), s: [2600, 2, len + 4], mat: 'basic:#e8eef8', collide: false, shadow: false });   // mer de nuages très loin au-dessous
    } else if (zone === 'chute' || zone === 'tour') {
      // la ville très loin en dessous : plan non éclairé (les tours géantes le plongeraient dans l'ombre) avec rues, places et parcs
      slab(-1, 420, 2, 'basic:#8e939e', undefined, { shadow: false });
      const rr = U.makeRng(Math.floor(m / 40) * 131 + 7);
      for (let i = -3; i <= 3; i++) if (rr() < 0.8) bx2({ p: GP(i * 50 + rr() * 12, ym - 0.05), s: [rr() < 0.3 ? 14 : 8, 0.1, len], r: [pitch, 0, 0], mat: 'basic:#b6bac4', collide: false, shadow: false });
      if (Math.floor(m / 20) % 3 === 0) { bx2({ p: GP(0, ym - 0.04), s: [420, 0.1, 9], mat: 'basic:#b6bac4', collide: false, shadow: false }); }
      if (rr() < 0.3) bx2({ p: GP((rr() - 0.5) * 240, ym - 0.03), s: [rr() * 50 + 30, 0.1, len * 0.8], mat: 'basic:#6f8f5a', collide: false, shadow: false });
    } else if (zone === 'eau') {
      slab(-1, 2 * (T.vol(m) + 60), 2, 'sand', '#8aa8a0');
      bx2({ p: GP(0, -3.6), s: [2 * (T.vol(m) + 90), 0.2, len], mat: 'waterSurf', collide: false, shadow: false });      // v038 : la surface, translucide (vue d'en dessous comme d'au-dessus)
    } else if (zone === 'usine') {
      slab(-1, 2 * (T.vol(m) + 8), 2, 'concreteDark', '#b0aca0');
      for (const s of [-1, 1]) bx2({ p: GP(s * (T.vol(m) - 6), ym + 0.06), s: [1.0, 0.1, len], r: [pitch, 0, 0], mat: 'hazard', collide: false, shadow: false });
    } else if (zone === 'mini') {
      slab(-1, 2 * (T.vol(m) + 14), 2, 'planks', '#e0c090', { tile: [18, 18] });
    } else {
      slab(-1, 900, 2, Z.meta[zone] ? Z.meta[zone].ground : 'asphalt', Z.meta[zone] ? Z.meta[zone].groundTint : '#ffffff');
    }
  }

  /* ---------- passage entre deux zones : tranchée / vallée quand le sol monte ou descend, portail à la frontière ---------- */
  function passage(ctx) {
    const T = ctx.T, b = ctx.b, L = C().zoneLen;
    const off = T.off || 0;
    for (let B = Math.ceil(Math.max(1, ctx.d0 - 400 + off) / L) * L - off; B < ctx.d1 + 400; B += L) {
      const k = Math.round((B + off) / L); if (k < 1) continue;
      const e0 = T.elev(k - 1), e1 = T.elev(k), hw = Z.hw(T, k), z0 = T.zoneOrder[(k - 1) % T.zoneOrder.length], z1 = T.zoneOrder[k % T.zoneOrder.length];
      const sc = new Scene(ctx, { name: 'passage', d0: B - hw, d1: B + hw, zone: z1, zi: k, key: 'p' + k, stage: 0 });
      // tranchée ou vallée : deux murs continus dont le sommet reste au niveau le plus haut (+ marge)
      if (e0 !== e1 && z0 !== 'eau' && z1 !== 'eau') {
        const top = Math.max(e0, e1) + 90, rock = Math.abs(e1 - e0) > 100 || z0 === 'forest' || z1 === 'forest', forestSide = z0 === 'forest' || z1 === 'forest';   // v038e : parois plus hautes (on n'en voit plus le dessus)
        const step = 24;
        for (let d = B - hw; d < B + hw; d += step) {
          const dm = d + step / 2; if (!sc.inClip(dm)) continue;
          for (const s of [-1, 1]) {
            const lx = s * (T.vol(dm) + 4), h = top - T.base(dm) + 8, yb = T.base(dm) - 4;
            b.box({ p: T.at(dm, lx + s * 10, 0).map((v, i) => (i === 1 ? yb + h / 2 : v)), s: [20, h, step + 1.5], r: [0, T.yawAcross(dm), 0], mat: rock ? (forestSide ? { side: 'rock', top: 'rock' } : (e1 > e0 ? 'col:#a4b0c4' : 'col:#b6a694')) : { side: 'concreteDark', top: 'concrete' }, tint: rock ? (forestSide ? (e1 > e0 ? '#b8c0cc' : '#b09078') : undefined) : '#b8b8b8' });   // v038e : parois claires et unies (le rocher sombre faisait des murs noirs)
          }
        }
      }
      portal(sc, z0, z1, B);
    }
  }
  // portail de la frontière B : une structure qui change de lieu
  function portal(sc, z0, z1, B) {
    const T = sc.T, L0 = T.laneX(B), Y0 = T.laneY(B), R = CLEAR[Math.min(3, Math.floor(B / C().stageLen))], kind = z1;
    const open = R * 2 + 4;
    const P = Z.portals[kind] || Z.portals.default;
    P(sc, B, L0, Y0, open, z0);
    sc.ctx.busy.push(B);
    sc.gate(B - 40, L0, Y0); sc.gate(B, L0, Y0); sc.gate(B + 40, L0, Y0);
  }
  Z.portals = {};
  Z.portals.default = (S, B, lx, y, open) => {       // grand portique sobre (porte de zone)
    // v037 : plus de mur plein autour de la porte : un simple portique (deux poteaux et une poutre), on voit et on passe de chaque côté
    const H = y + open / 2 + 8, w = open / 2 + 5;
    S.item(B, () => {
      for (const s of [-1, 1]) S.bx(B, lx + s * w, H / 2, 2.2, H, 2.2, 'concreteDark', '#c8ccd0');
      S.bx(B, lx, H, 2 * w + 2.2, 2.2, 2.6, 'concreteDark', '#c8ccd0');
      S.bx(B, lx, H - 1.4, 2 * w, 0.5, 2.8, 'hazard', undefined, false);
    });
  };

  /* ---------- point d'entrée : construit un tronçon de 200 m (sol, passages, scènes) ---------- */
  Z.build = function (ctx) {
    const T = ctx.T, cfg = C(), d0 = ctx.d0, d1 = ctx.d1, b = ctx.b;
    // sol
    const stp = Math.abs(T.theta(d1) - T.theta(d0)) > 0.004 ? 5 : 20;   // v063 : en virage, sol découpé en tranches de 5 m
    for (let d = d0; d < d1 - 0.01; d += stp) groundSlice(ctx, d, Math.min(d1, d + stp));
    // passages entre zones
    passage(ctx);
    // scènes qui recouvrent ce tronçon
    const ziA = T.zoneIndex(d0), ziB = T.zoneIndex(d1 - 0.01);
    ctx.special = null;
    for (let zi = ziA; zi <= ziB; zi++) {
      const plan = Z.plan(T, zi), def = Z.defs[plan.zone];
      for (const sc of plan.scenes) {
        if (sc.d1 <= d0 || sc.d0 >= d1) continue;
        const S = new Scene(ctx, sc);
        if (sc.name === 'legacy') { legacy(ctx, sc, plan.zone); continue; }
        const sd = def.scenes[sc.name];
        if (def.dress) def.dress(S);
        sd.build(S);
      }
    }
    if (Z.backdrop) Z.backdrop(ctx);   // v038b : couches de bâtiments / conteneurs / montagnes très hauts sur les côtés
    if (Z.tight) Z.tight(ctx);   // v038 : portes serrées (src/world/tight.js)
    if (Z.chaos) Z.chaos(ctx);   // v065 : champs d'obstacles dans tous les sens (src/world/zones_chaos.js)
    if (CC.Life && CC.Life.flushGlows) CC.Life.flushGlows(ctx);
  };
  // zones de l'ancien système (forêt) : décor par côtés + structures, bornés à la scène
  function legacy(ctx, sc, zone) {
    const T = ctx.T, c0 = Math.max(sc.d0, ctx.d0), c1 = Math.min(sc.d1, ctx.d1);
    if (c1 - c0 < 4) return;
    const ZONES = ctx.ZONES;
    for (const side of [-1, 1]) CC.Scenery.side(ctx.b, T, ctx.r, c0, c1, side, ZONES, ctx.game);
    const po = { stage: Math.min(3, Math.floor(c0 / C().stageLen)), zone, ZONES, busy: ctx.busy, reserved: ctx.reserved, bridges: [], env: T.env(sc.zi), special: null };
    CC.Pieces.build(ctx.b, T, ctx.r, c0, c1, po);
    CC.Pieces.far(ctx.b, T, ctx.r, c0, c1, po);
    if (CC.Zones.forestLife) CC.Zones.forestLife(new Scene(ctx, sc));
  }

  // allures des ennemis autorisés par zone (chars au sol, lance-missiles, hélicoptères)
  Z.noTargets = { chute: 1, tour: 1, eau: 1 };
  Z.enemies = (zone) => ({ city: { tank: 1, sam: 1, heli: 1 }, forest: { tank: 1, sam: 1, heli: 1 }, metro: { tank: 0, sam: 0, heli: 0 }, chute: { tank: 0, sam: 0, heli: 1 }, tour: { tank: 0, sam: 0, heli: 0 }, eau: { tank: 0, sam: 0, heli: 0 }, usine: { tank: 0, sam: 0, heli: 0 }, port: { tank: 1, sam: 1, heli: 1 }, sky: { tank: 0, sam: 1, heli: 1 }, mini: { tank: 0, sam: 0, heli: 0 } }[zone] || { tank: 1, sam: 1, heli: 1 });
  // où poser une cible (sol) : sur la colonne vertébrale
  Z.targetLx = (T, d, zone) => { const lim = { port: 10, metro: 9, sky: 18, mini: 20, city: 12, forest: 14, usine: 14 }[zone] || 12; return U.clamp(T.laneX(d), -lim, lim); };
  Z.edgeLx = (T, d, side, zone) => side * (zone === 'port' ? 12 : zone === 'sky' ? 34 : Math.max(8, T.vol(d) - 6));
})();

/* v092 : 8 NOUVELLES FUSEES « stylées » (or, néon, phénix, glace, toxique, samouraï, galaxie, furtive) + prix en ECROUS pour toutes les apparences.
 * Même format déclaratif que skins.js (lu par CC.Models.rocket) ; les pièces `basic: true` sont lumineuses (non éclairées). */
(function () {
  const cyl = (r, h, p, o) => Object.assign({ k: 'cyl', r, h, p, rot: [90, 0, 0] }, o || {});
  const box = (w, h, d, p, o) => Object.assign({ k: 'box', w, h, d, p }, o || {});
  const sph = (r, p, o) => Object.assign({ k: 'sph', r, p }, o || {});
  const ring = (n, r, h, z, c) => cyl(r, h, [0, 0, z], { c, basic: true, cast: false });
  // n pointes autour du corps (axe +Z), à la hauteur z
  const spikes = (n, rad, z, len, w, c, tilt) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; out.push(cyl(w, len, [Math.cos(a) * rad, Math.sin(a) * rad, z], { r2: 0.001, c, rot: [90 + (tilt || 0) * Math.sin(a) * -1, 0, (tilt || 0) * Math.cos(a)] })); } return out; };
  const stars = (n, rad, len, c) => { const out = []; for (let i = 0; i < n; i++) { const a = i * 2.4, z = -len / 2 + ((i * 0.37) % 1) * len; out.push(sph(0.011, [Math.cos(a) * rad, Math.sin(a) * rad, z], { c, basic: true, cast: false })); } return out; };

  const NEW = [
    { id: 'royale', name: 'LA ROYALE', short: 'ROYALE', tier: 'ultra', tagline: 'Plaquee or. Elle ne vole pas, elle regne.',
      c: { body: '#e0b43c', nose: '#fff0b0', tip: '#ffffff', band: '#ffffff', fin: '#b07a1c', nozzle: '#5a3c10' },
      dims: { r: 0.108, len: 1.0, noseLen: 0.4, noseR: 0.018, fins: 4, finH: 0.28 },
      parts: [ring(0, 0.116, 0.03, 0.2, '#fff3b0'), ring(0, 0.116, 0.03, -0.05, '#fff3b0'), ring(0, 0.116, 0.03, -0.3, '#fff3b0'),
        ...spikes(6, 0.1, 0.52, 0.12, 0.02, '#fff0b0'), box(0.62, 0.02, 0.16, [0, 0, -0.28], { c: '#c8922a' }), box(0.02, 0.5, 0.14, [0, 0, -0.3], { c: '#c8922a' })], flame: '#ffe27a' },
    { id: 'neon', name: 'NEON CITY', short: 'NEON', tier: 'rare', tagline: 'Elle brille meme quand tout est eteint.',
      c: { body: '#14121f', nose: '#1b1830', tip: '#ff2bd6', band: '#00f0ff', fin: '#ff2bd6', nozzle: '#241a3a' },
      dims: { r: 0.1, len: 0.95, noseLen: 0.36, noseR: 0.012, fins: 4, finH: 0.24 },
      parts: [ring(0, 0.106, 0.025, 0.22, '#00f0ff'), ring(0, 0.106, 0.025, 0.0, '#ff2bd6'), ring(0, 0.106, 0.025, -0.22, '#00f0ff'),
        box(0.018, 0.018, 0.8, [0, 0.102, 0], { c: '#ff2bd6', basic: true, cast: false }), box(0.018, 0.018, 0.8, [0, -0.102, 0], { c: '#00f0ff', basic: true, cast: false }),
        box(0.018, 0.018, 0.8, [0.102, 0, 0], { c: '#00f0ff', basic: true, cast: false }), box(0.018, 0.018, 0.8, [-0.102, 0, 0], { c: '#ff2bd6', basic: true, cast: false })], flame: '#ff6af0' },
    { id: 'phenix', name: 'PHENIX', short: 'PHENIX', tier: 'ultra', tagline: 'Elle renait de ses cendres, a chaque niveau.',
      c: { body: '#c2301a', nose: '#ff8a1a', tip: '#ffd23a', band: '#ffd23a', fin: '#ff6a10', nozzle: '#4a1a0a' },
      dims: { r: 0.1, len: 1.05, noseLen: 0.38, noseR: 0.014, fins: 4, finH: 0.3 },
      parts: [box(0.34, 0.02, 0.24, [0.26, 0, -0.18], { c: '#ff6a10', rot: [0, 28, 0] }), box(0.34, 0.02, 0.24, [-0.26, 0, -0.18], { c: '#ff6a10', rot: [0, -28, 0] }),
        box(0.3, 0.02, 0.18, [0.4, 0, -0.3], { c: '#ffb020', rot: [0, 38, 0] }), box(0.3, 0.02, 0.18, [-0.4, 0, -0.3], { c: '#ffb020', rot: [0, -38, 0] }),
        cyl(0.03, 0.34, [0, 0.12, -0.6], { r2: 0.001, c: '#ffb020', rot: [-100, 0, 0] }), cyl(0.03, 0.34, [0.1, 0.06, -0.6], { r2: 0.001, c: '#ff6a10', rot: [-100, 18, 0] }), cyl(0.03, 0.34, [-0.1, 0.06, -0.6], { r2: 0.001, c: '#ff6a10', rot: [-100, -18, 0] }),
        ring(0, 0.106, 0.03, 0.2, '#ffd23a')], flame: '#ffd060' },
    { id: 'glace', name: 'ECLAT DE GLACE', short: 'GLACE', tier: 'rare', tagline: 'Un glacon lance a pleine vitesse.',
      c: { body: '#bfe6ff', nose: '#e8f8ff', tip: '#ffffff', band: '#5fb0e8', fin: '#7fc8f5', nozzle: '#4a6a82' },
      dims: { r: 0.105, len: 0.9, noseLen: 0.36, noseR: 0.01, fins: 4, finH: 0.22 },
      parts: [...spikes(8, 0.105, 0.05, 0.3, 0.03, '#e8f8ff', 14), ring(0, 0.112, 0.02, -0.2, '#9fe0ff')], flame: '#c0ecff' },
    { id: 'toxique', name: 'TOXIQUE', short: 'TOXIQUE', tier: 'rare', tagline: 'Ne pas toucher. Ne pas respirer. Ne pas rater.',
      c: { body: '#2c3a24', nose: '#3d5a2a', tip: '#7dff3a', band: '#7dff3a', fin: '#1a2416', nozzle: '#10160c' },
      dims: { r: 0.1, len: 0.95, noseLen: 0.3, noseR: 0.03, fins: 4, finH: 0.22 },
      parts: [cyl(0.05, 0.5, [0.135, 0, -0.05], { c: '#4a6a2a' }), cyl(0.05, 0.5, [-0.135, 0, -0.05], { c: '#4a6a2a' }), cyl(0.044, 0.03, [0.135, 0, 0.21], { c: '#7dff3a', basic: true, cast: false }), cyl(0.044, 0.03, [-0.135, 0, 0.21], { c: '#7dff3a', basic: true, cast: false }),
        ring(0, 0.106, 0.04, 0.12, '#7dff3a'), box(0.05, 0.05, 0.1, [0, 0.12, -0.2], { c: '#e8e020' })], flame: '#9cff5a' },
    { id: 'samourai', name: 'SAMOURAI', short: 'SAMOURAI', tier: 'rare', tagline: 'Une seule coupe. Une seule cible.',
      c: { body: '#1a1a1e', nose: '#c8202a', tip: '#f0f0f0', band: '#c8202a', fin: '#c8202a', nozzle: '#0e0e10' },
      dims: { r: 0.092, len: 1.05, noseLen: 0.4, noseR: 0.008, fins: 4, finH: 0.2 },
      parts: [box(0.5, 0.012, 0.1, [0, 0, -0.22], { c: '#e8e8e8', rot: [0, 0, 0] }), box(0.012, 0.5, 0.1, [0, 0, -0.22], { c: '#e8e8e8' }), cyl(0.098, 0.05, [0, 0, 0.2], { c: '#c8202a' }), cyl(0.098, 0.03, [0, 0, 0.12], { c: '#f0f0f0' }),
        sph(0.03, [0, 0.1, 0.02], { c: '#c8202a' })], flame: '#ff6a5a' },
    { id: 'galaxie', name: 'GALAXIE', short: 'GALAXIE', tier: 'ultra', tagline: 'Elle a vu des choses que tu ne verras jamais.',
      c: { body: '#2a1a5a', nose: '#4a2a9a', tip: '#ffffff', band: '#c07aff', fin: '#6a3ad0', nozzle: '#150a30' },
      dims: { r: 0.11, len: 1.0, noseLen: 0.34, noseR: 0.02, fins: 4, finH: 0.26 },
      parts: [...stars(14, 0.112, 0.9, '#ffffff'), cyl(0.22, 0.012, [0, 0, 0.04], { c: '#e0c0ff', basic: true, cast: false }), cyl(0.17, 0.012, [0, 0, 0.04], { c: '#2a1a5a', basic: false, cast: false }), ring(0, 0.116, 0.025, -0.28, '#c07aff')], flame: '#d09aff' },
    { id: 'furtive', name: 'FURTIVE', short: 'FURTIVE', tier: 'rare', tagline: 'Les radars ne la voient pas. Les cibles non plus.',
      c: { body: '#2a2c30', nose: '#1e2024', tip: '#3a3c40', band: '#ff2a2a', fin: '#16181a', nozzle: '#0c0d0e' },
      dims: { r: 0.09, len: 1.0, noseLen: 0.42, noseR: 0.006, fins: 2, finH: 0.14, finW: 0.016 },
      parts: [box(0.7, 0.012, 0.3, [0, 0, -0.14], { c: '#202226', rot: [0, 0, 0] }), box(0.4, 0.012, 0.3, [0, 0, -0.14], { c: '#26282c', rot: [0, 0, 0] }), box(0.016, 0.016, 0.3, [0, 0.092, 0.05], { c: '#ff2a2a', basic: true, cast: false })], flame: '#ff6a4a' },
  ];

  const COINS = { base: 0, common: 600, rare: 1800, ultra: 4500 };
  const S = CC.Skins;
  for (const s of NEW) {
    s.price = CC.CONFIG.shop.priceCents; s.tierLabel = { rare: 'RARE', ultra: 'ULTRA RARE' }[s.tier];
    s.c = Object.assign({ body: '#c4c6c9', nose: '#c4c6c9', tip: '#e02a1c', band: '#f3cf00', fin: '#5d6065', nozzle: '#3d3f43' }, s.c);
    s.dims = Object.assign({ r: 0.1, len: 0.86, noseLen: 0.3, noseR: 0.012, fins: 4, finH: 0.2, finW: 0.02, finPos: -0.33, scale: 1 }, s.dims || {});
    S.list.push(s); S.byId[s.id] = s;
  }
  for (const s of S.list) s.coins = COINS[s.tier] || 0;
  // ordre de la vitrine : stock, communes, rares, ultra
  const ord = { base: 0, common: 1, rare: 2, ultra: 3 };
  S.showcase = S.list.slice().sort((a, b) => ord[a.tier] - ord[b.tier]);
})();

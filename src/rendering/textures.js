/* Textures pixel-art procédurales (assets originaux, dessinés par le code).
 * Couleurs de base MESURÉES sur la vidéo (ANALYSE §2.3), motifs recréés. */
(function () {
  const T = {};
  const cache = {};
  // Taille réelle (m) couverte par une répétition de texture : [u, v]
  T.tile = {
    concrete: [2, 2], concreteDark: [2, 2], concreteWarm: [2, 2], facade: [12, 14], facadePink: [12, 14], facadeTan: [12, 14],
    facadeDark: [12, 14], storefront: [8, 4.2], brick: [2.6, 2.6], planks: [2, 2], grass: [4, 4], rock: [6, 6], hazard: [1.2, 1.2],
    metal: [2, 2], tankGreen: [2, 2], camo: [3, 3], blueFloor: [2, 2], cream: [2, 2], bark: [1.2, 2.4],
    houseWall: [2, 2], roofBrown: [1.5, 1.5], white: [2, 2], dirt: [4, 4], rail: [1, 1], asphalt: [4, 4],
    sand: [4, 4], water: [6, 6], corrugated: [2.4, 2.6], chainlink: [2, 2],   // v032 : générateur de missions
  };

  function make(name, w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const rng = CC.U.makeRng(name.length * 7919 + w);
    draw(g, w, h, rng);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapLinearFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    tex.canvasSource = c;
    return tex;
  }
  const px = (g, x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const shade = (hex, d) => {
    const [r, gg, b] = CC.U.hexToRgb(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + d)));
    return 'rgb(' + f(r) + ',' + f(gg) + ',' + f(b) + ')';
  };
  function concreteTex(g, w, h, r, base, seam) {
    noiseFill(g, w, h, r, base, 10);
    g.fillStyle = seam; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h);                 // joints de coffrage
    g.fillStyle = 'rgba(0,0,0,0.35)'; for (const [x, y] of [[8, 8], [24, 8], [8, 24], [24, 24]]) g.fillRect(x, y, 1, 1);   // trous de banche
    for (let k = 0; k < 3; k++) {                                                       // coulures
      const x = Math.floor(r() * w), len = 6 + Math.floor(r() * 16);
      for (let y = 1; y < len; y++) { g.fillStyle = 'rgba(40,36,32,' + (0.16 * (1 - y / len)).toFixed(3) + ')'; g.fillRect(x, y, 1, 1); }
    }
    if (r() < 0.7) { g.fillStyle = 'rgba(60,56,50,0.12)'; g.fillRect(Math.floor(r() * 20), Math.floor(r() * 20), 9, 7); }   // tache
  }
  function noiseFill(g, w, h, rng, base, amp) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(g, x, y, shade(base, (rng() - 0.5) * amp));
  }

  const defs = {
    // design : béton banché — joints de coffrage, trous de banche, coulures verticales et taches (un coffrage = 2 m)
    concrete: (g, w, h, r) => concreteTex(g, w, h, r, '#aaa59e', 'rgba(70,66,60,0.35)'),
    concreteDark: (g, w, h, r) => concreteTex(g, w, h, r, '#6f6b68', 'rgba(30,30,30,0.35)'),
    concreteWarm: (g, w, h, r) => concreteTex(g, w, h, r, '#b4aa9c', 'rgba(80,70,60,0.3)'),
    white: (g, w, h, r) => { noiseFill(g, w, h, r, '#e4e4e2', 6); g.fillStyle = 'rgba(120,120,120,0.35)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); },
    // design : asphalte — grain, gravillons clairs, fissure et rapiéçage
    asphalt: (g, w, h, r) => {
      noiseFill(g, w, h, r, '#4a4847', 12);
      for (let k = 0; k < 18; k++) px(g, Math.floor(r() * w), Math.floor(r() * h), '#6a6866');
      g.fillStyle = 'rgba(30,30,30,0.35)'; g.fillRect(4, 18, 9, 7);
      let x = Math.floor(r() * w), y = 0;
      while (y < h) { px(g, x, y, '#2a2827'); x = (x + (r() < 0.5 ? 1 : w - 1)) % w; y += 1; }
    },
    facade: (g, w, h, r) => facade(g, w, h, r, '#b8b2ae'),
    facadePink: (g, w, h, r) => facade(g, w, h, r, '#cdc2bb'),
    facadeTan: (g, w, h, r) => facade(g, w, h, r, '#c6beb0'),
    facadeDark: (g, w, h, r) => facade(g, w, h, r, '#5b5552', true),
    storefront: (g, w, h, r) => storefront(g, w, h, r),
    brick: (g, w, h, r) => {
      g.fillStyle = '#d97a48'; g.fillRect(0, 0, w, h);          // joints éclairés (MESURÉ #d56229, éclairci en v002 : Δ luminance −29)
      for (let row = 0; row < 8; row++) {
        const y = row * 4, off = (row % 2) * 4;
        for (let bx = -1; bx < 5; bx++) {
          const x = bx * 8 + off;
          const base = r() < 0.2 ? '#952c20' : r() < 0.5 ? '#a8392a' : '#b24634';   // MESURÉ #9e1b15 (v002 : moins saturé)
          g.fillStyle = base; g.fillRect(x + 1, y + 1, 7, 3);
          g.fillStyle = shade(base, 28); g.fillRect(x + 1, y + 1, 7, 1);
          if (r() < 0.3) px(g, x + 2 + Math.floor(r() * 5), y + 2, shade(base, -25));
        }
      }
    },
    planks: (g, w, h, r) => {
      for (let row = 0; row < 8; row++) {
        const base = r() < 0.5 ? '#e08a2a' : '#d67c22';
        g.fillStyle = base; g.fillRect(0, row * 4, w, 4);
        g.fillStyle = '#6a300c'; g.fillRect(0, row * 4 + 3, w, 1);
        const seam = Math.floor(r() * w);
        g.fillRect(seam, row * 4, 1, 3);
        px(g, (seam + 3) % w, row * 4 + 1, '#5a2808'); px(g, (seam + w - 3) % w, row * 4 + 1, '#5a2808');
        for (let k = 0; k < 4; k++) px(g, Math.floor(r() * w), row * 4 + Math.floor(r() * 3), shade(base, 18));
      }
    },
    grass: (g, w, h, r) => {
      noiseFill(g, w, h, r, '#23511a', 14);                    // MESURÉ #204918
      g.fillStyle = '#3d7a2a';                                  // MESURÉ lignes de grille #335a23
      for (let i = 0; i < w; i += 8) { g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); }
      for (let k = 0; k < 40; k++) px(g, Math.floor(r() * w), Math.floor(r() * h), '#2f6a20');
    },
    dirt: (g, w, h, r) => { noiseFill(g, w, h, r, '#3b2f28', 14); },
    // v032 : sable (grain, rides de vent), eau (reflets en bandes), tôle ondulée (conteneurs, teinte par sommet), grillage
    sand: (g, w, h, r) => {
      noiseFill(g, w, h, r, '#c8ab7c', 12);
      for (let y = 3; y < h; y += 8) for (let x = 0; x < w; x++) if (((x + y * 3) % 11) < 6) px(g, x, (y + Math.round(Math.sin(x * 0.4) * 1.2) + h) % h, '#b89a6c');
      for (let k = 0; k < 20; k++) px(g, Math.floor(r() * w), Math.floor(r() * h), '#dcc496');
    },
    water: (g, w, h, r) => {
      noiseFill(g, w, h, r, '#1f3a4a', 6);
      for (let k = 0; k < 14; k++) { const x = Math.floor(r() * w), y = Math.floor(r() * h), l = 3 + Math.floor(r() * 6); g.fillStyle = r() < 0.5 ? '#3a5a6a' : '#2c4a5a'; g.fillRect(x, y, l, 1); }
    },
    corrugated: (g, w, h, r) => {
      noiseFill(g, w, h, r, '#d8d8d8', 8);
      for (let x = 0; x < w; x += 3) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, 0, 1, h); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 1, 0, 1, h); }
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1);
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(90,50,30,0.25)'; g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2, 3); }   // rouille
    },
    chainlink: (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#9aa0a4';
      for (let i = 0; i < w; i++) { px(g, i, i % h, '#9aa0a4'); px(g, w - 1 - i, i % h, '#9aa0a4'); }
      g.fillRect(0, 0, w, 1);
    },
    rock: (g, w, h, r) => {
      noiseFill(g, w, h, r, '#3a302d', 10);                    // MESURÉ #332826 (paroi éclairée : base un peu plus claire)
      for (let k = 0; k < 26; k++) {
        const x = Math.floor(r() * w), y0 = Math.floor(r() * h), len = 4 + Math.floor(r() * 12);
        g.fillStyle = r() < 0.5 ? '#2a1f1c' : '#46352f';
        g.fillRect(x, y0, 1, len);
      }
    },
    hazard: (g, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(g, x, y, ((x + y) % 16) < 8 ? '#f0b81c' : '#1c1a18');
    },
    metal: (g, w, h, r) => {   // design : tôle en panneaux rivetés, légère usure
      noiseFill(g, w, h, r, '#4d5156', 8);
      g.fillStyle = '#383b3f'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(0, 16, w, 1);
      g.fillStyle = '#5c6066'; g.fillRect(0, 1, w, 1); g.fillRect(0, 17, w, 1);
      for (let x = 3; x < w; x += 6) { px(g, x, 3, '#6a6e74'); px(g, x, 19, '#6a6e74'); }
      g.fillStyle = 'rgba(90,60,40,0.25)'; g.fillRect(Math.floor(r() * 20), 22, 8, 6);
    },
    rail: (g, w, h, r) => { noiseFill(g, w, h, r, '#9c8184', 10); },
    tankGreen: (g, w, h, r) => { noiseFill(g, w, h, r, '#27372b', 8); g.fillStyle = '#1a261e'; g.fillRect(0, 0, w, 1); g.fillRect(0, 7, w, 1); },
    camo: (g, w, h, r) => {
      noiseFill(g, w, h, r, '#56613a', 8);
      const cols = ['#6d5a3a', '#2f3a22', '#7b7048'];
      for (let k = 0; k < 16; k++) {
        g.fillStyle = cols[k % 3];
        const x = Math.floor(r() * w), y = Math.floor(r() * h), rw = 3 + Math.floor(r() * 7), rh = 2 + Math.floor(r() * 5);
        g.fillRect(x, y, rw, rh); g.fillRect((x + rw) % w, y + 1, 2, rh - 1);
      }
    },
    blueFloor: (g, w, h, r) => {
      noiseFill(g, w, h, r, '#58b0d2', 10);                    // v004 : cyan clair (OBSERVÉ séq. 2)
      g.fillStyle = '#7cc8e4'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h);
      g.fillStyle = '#3e8eb0'; g.fillRect(0, h - 1, w, 1); g.fillRect(w - 1, 0, 1, h);
    },
    cream: (g, w, h, r) => { noiseFill(g, w, h, r, '#e3d6a3', 6); g.fillStyle = '#cbbd88'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); },
    bark: (g, w, h, r) => {   // design : sillons verticaux sinueux, plaques d'écorce
      noiseFill(g, w, h, r, '#3d2b23', 10);
      for (let k = 0; k < 9; k++) {
        let x = Math.floor(r() * w);
        const c = r() < 0.6 ? '#241812' : '#533c30';
        for (let y = 0; y < h; y++) { px(g, x, y, c); if (r() < 0.2) x = (x + (r() < 0.5 ? 1 : w - 1)) % w; }
      }
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(90,70,55,0.35)'; g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 3, 5); }
    },
    houseWall: (g, w, h, r) => { noiseFill(g, w, h, r, '#8e8f94', 8); g.fillStyle = '#76777c'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); },
    roofBrown: (g, w, h, r) => {   // design : tuiles en rangs décalés, arrondi éclairé, quelques tuiles plus sombres
      noiseFill(g, w, h, r, '#6d3a29', 10);
      for (let y = 0; y < h; y += 4) {
        g.fillStyle = '#4d2618'; g.fillRect(0, y, w, 1);
        const off = (y / 4) % 2 ? 2 : 0;
        for (let x = off; x < w; x += 4) { g.fillStyle = '#3d1e12'; g.fillRect(x, y + 1, 1, 3); g.fillStyle = 'rgba(255,190,150,0.18)'; g.fillRect(x + 1, y + 1, 2, 1); if (r() < 0.08) { g.fillStyle = 'rgba(40,20,12,0.4)'; g.fillRect(x + 1, y + 1, 3, 3); } }
      }
    },
  };

  /* Design : façade de 4 × 4 travées (une travée = 32 px ≈ 3 m × 3,5 m) : bandeau de dalle entre étages, fenêtre encadrée
   * avec meneau, imposte, appui et linteau ; chaque fenêtre tire un état (vitre qui reflète le ciel, store à demi baissé,
   * rideaux, pièce sombre, pièce éclairée) et parfois un climatiseur sous l'appui. Couleurs de vitre MESURÉES (bleu). */
  function facade(g, w, h, r, wall, dark) {
    noiseFill(g, w, h, r, wall, 8);
    const C = 32;
    for (let cy = 0; cy < h / C; cy++) for (let cx = 0; cx < w / C; cx++) {
      const ox = cx * C, oy = cy * C;
      g.fillStyle = shade(wall, -14); g.fillRect(ox, oy, C, 2);                     // bandeau de dalle
      g.fillStyle = shade(wall, 10); g.fillRect(ox, oy + 2, C, 1);
      const x0 = ox + 8, x1 = ox + 24, y0 = oy + 7, y1 = oy + 25;
      g.fillStyle = shade(wall, 22); g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, 1);   // linteau
      g.fillStyle = dark ? '#1e1d20' : '#d8d4cc'; g.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);   // cadre
      const st = r();
      const lit = dark ? st < 0.3 : st < 0.04, shut = !lit && st > 0.86;
      for (let y = y0; y < y1; y++) {
        const t = (y - y0) / (y1 - y0);
        let col;
        if (lit) col = 'rgb(' + Math.round(225 + 20 * t) + ',' + Math.round(185 + 25 * t) + ',' + Math.round(110 + 20 * t) + ')';
        else if (shut) col = 'rgb(' + Math.round(16 + 16 * t) + ',' + Math.round(30 + 26 * t) + ',' + Math.round(48 + 30 * t) + ')';
        else col = dark ? 'rgb(' + Math.round(20 + 30 * t) + ',' + Math.round(40 + 60 * t) + ',' + Math.round(70 + 60 * t) + ')'
          : 'rgb(' + Math.round(22 + 40 * t) + ',' + Math.round(92 + 80 * t) + ',' + Math.round(168 + 50 * t) + ')';   // MESURÉ vitres bleues
        g.fillStyle = col; g.fillRect(x0, y, x1 - x0, 1);
      }
      if (!lit && !shut) {                                                          // reflet du ciel en diagonale
        g.fillStyle = 'rgba(255,255,255,0.2)';
        const k0 = Math.floor(r() * 6);
        for (let k = 0; k < 6; k++) g.fillRect(x0 + 2 + k + k0, y0 + 9 - k, 2, 1);
      }
      const v = r();
      if (!shut && v < 0.3) {                                                       // store à demi baissé
        const bh = 3 + Math.floor(r() * 9);
        g.fillStyle = dark ? '#5a5048' : '#c9c6bd'; g.fillRect(x0, y0, x1 - x0, bh);
        g.fillStyle = dark ? '#4a4038' : '#a8a59c'; for (let y = y0 + 1; y < y0 + bh; y += 2) g.fillRect(x0, y, x1 - x0, 1);
      } else if (!shut && v < 0.45) {                                               // rideaux
        const cc = ['#b0584a', '#6a7aa0', '#c8b070', '#7a9a6a'][Math.floor(r() * 4)];
        g.fillStyle = cc; g.fillRect(x0, y0, 3, y1 - y0); g.fillRect(x1 - 3, y0, 3, y1 - y0);
      }
      g.fillStyle = dark ? '#1e1d20' : '#d8d4cc';
      g.fillRect(ox + 16, y0, 1, y1 - y0);                                          // meneau
      g.fillRect(x0, y0 + 5, x1 - x0, 1);                                           // imposte
      g.fillStyle = shade(wall, 35); g.fillRect(x0 - 2, y1 + 1, x1 - x0 + 4, 2);    // appui de fenêtre
      g.fillStyle = shade(wall, -45); g.fillRect(x0 - 2, y1 + 3, x1 - x0 + 4, 1);
      if (!dark && r() < 0.14) {                                                    // climatiseur sous l'appui
        const ax = r() < 0.5 ? x0 : x1 - 7;
        g.fillStyle = '#c8cacb'; g.fillRect(ax, y1 + 4, 7, 4);
        g.fillStyle = '#7a7c7e'; g.fillRect(ax + 1, y1 + 5, 3, 2);
        g.fillStyle = 'rgba(40,40,40,0.35)'; g.fillRect(ax, y1 + 8, 7, 1);
      }
    }
  }

  /* Design : rez-de-chaussée commerçant (2 boutiques de 4 m) : enseigne colorée à lettrage, grande vitrine avec étalage
   * et reflet, porte vitrée encadrée, piliers. */
  function storefront(g, w, h, r) {
    const signs = ['#b8322a', '#2a5a9a', '#2a7a4a', '#c89a2a', '#6a3a8a', '#2a2a2a'];
    for (let cx = 0; cx < w / 32; cx++) {
      const ox = cx * 32;
      g.save(); g.translate(ox, 0); noiseFill(g, 32, h, r, '#8a8480', 8); g.restore();
      const sc = signs[Math.floor(r() * signs.length)];
      g.fillStyle = sc; g.fillRect(ox + 1, 1, 30, 6);
      g.fillStyle = '#f2eee4';
      for (let x = ox + 4; x < ox + 27; x += 3) if (r() < 0.75) g.fillRect(x, 3, 2, 2);
      g.fillStyle = '#3a3634'; g.fillRect(ox + 2, 9, 19, 22);
      for (let y = 10; y < 30; y++) { const t = (y - 10) / 20; g.fillStyle = 'rgb(' + Math.round(30 + 30 * t) + ',' + Math.round(50 + 50 * t) + ',' + Math.round(70 + 60 * t) + ')'; g.fillRect(ox + 3, y, 17, 1); }
      for (let k = 0; k < 5; k++) { g.fillStyle = ['#c8a060', '#a04a3a', '#6a8aa0', '#e0d8c0'][Math.floor(r() * 4)]; g.fillRect(ox + 4 + Math.floor(r() * 13), 24 + Math.floor(r() * 4), 2, 2); }
      g.fillStyle = 'rgba(255,255,255,0.22)'; for (let k = 0; k < 7; k++) g.fillRect(ox + 5 + k, 18 - k, 2, 1);
      g.fillStyle = '#3a3634'; g.fillRect(ox + 23, 12, 7, 20);
      g.fillStyle = '#26303a'; g.fillRect(ox + 24, 13, 5, 19);
      g.fillStyle = '#c8b070'; g.fillRect(ox + 24, 22, 1, 2);
      g.fillStyle = '#6a6460'; g.fillRect(ox, 8, 1, 24); g.fillRect(ox + 31, 8, 1, 24);
    }
  }

  T.get = function (name) {
    if (!cache[name]) {
      const d = defs[name];
      if (!d) throw new Error('Texture inconnue : ' + name);
      const big = /^facade/.test(name) ? [128, 128] : name === 'storefront' ? [64, 32] : [32, 32];   // design : façades 4 × 4 travées
      cache[name] = make(name, big[0], big[1], d);
    }
    return cache[name];
  };

  // Textures spéciales (non répétées)
  T.special = function (name) {
    if (cache[name]) return cache[name];
    let tex;
    if (name === 'bullseye') {
      tex = make(name, 64, 64, (g) => {
        const cols = ['#d42a1f', '#f2efe6', '#f08a1a', '#f2efe6', '#d42a1f', '#f2efe6', '#d42a1f'];
        for (let i = 0; i < cols.length; i++) {
          g.fillStyle = cols[i]; g.beginPath(); g.arc(32, 32, 31 - i * 4.4, 0, Math.PI * 2); g.fill();
        }
      });
    } else if (name === 'billboard') {
      // Panneau original "COLD IMPACT" (remplace la marque du jeu d'origine — décision validée)
      tex = make(name, 256, 128, (g) => {
        g.fillStyle = '#1f6a2a'; g.fillRect(0, 0, 256, 128);
        g.fillStyle = '#2f9a3a'; g.fillRect(6, 6, 244, 116);
        g.fillStyle = '#f2f2f2'; g.fillRect(6, 88, 244, 34);
        // fusée stylisée
        g.fillStyle = '#c9c9c9'; g.fillRect(18, 30, 34, 10); g.fillStyle = '#d42a1f'; g.fillRect(52, 32, 6, 6);
        g.fillStyle = '#f5d000'; g.fillRect(18, 28, 4, 14); g.fillStyle = '#ff8a1a'; g.fillRect(8, 31, 10, 8);
        CC.Font.draw(g, 'COLD', 70, 16, 3.6, '#ffffff', { outline: '#1a1a1a', skew: -0.2 });
        CC.Font.draw(g, 'IMPACT', 70, 52, 3.6, '#ffcf2e', { outline: '#1a1a1a', skew: -0.2 });
        CC.Font.draw(g, 'PLAY IT IN YOUR BROWSER', 128, 100, 1.2, '#1a1a1a', { align: 'center', outline: '' });   // design : tient dans le cadre
      });
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    } else if (name === 'graffiti') {
      tex = make(name, 256, 128, (g, w, h, r) => {
        g.clearRect(0, 0, w, h);
        const words = ['NO', 'MISSILES'];
        let y = 14;
        for (const wd of words) {
          let x = wd === 'NO' ? 40 : 14;
          for (const ch of wd) {
            CC.Font.draw(g, ch, x, y + r() * 6, 5.2 + r() * 1.2, '#f4f4f4', { outline: '#101010', skew: -0.15 + r() * 0.1 });
            x += 28;
          }
          y += 52;
        }
      });
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    } else if (name === 'sky') {
      tex = null;
    }
    cache[name] = tex;
    return tex;
  };

  CC.Textures = T;
})();

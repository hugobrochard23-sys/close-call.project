/* Textures pixel-art procédurales (assets originaux, dessinés par le code).
 * Couleurs de base MESURÉES sur la vidéo (ANALYSE §2.3), motifs recréés. */
(function () {
  const T = {};
  const cache = {};
  // Taille réelle (m) couverte par une répétition de texture : [u, v]
  T.tile = {
    concrete: [2, 2], concreteDark: [2, 2], concreteWarm: [2, 2], facade: [3, 3.5], facadePink: [3, 3.5], facadeTan: [3, 3.5],
    facadeDark: [3, 3.5], brick: [2.6, 2.6], planks: [2, 2], grass: [4, 4], rock: [6, 6], hazard: [1.2, 1.2],
    metal: [2, 2], tankGreen: [2, 2], camo: [3, 3], blueFloor: [2, 2], cream: [2, 2], bark: [1.2, 2.4],
    houseWall: [2, 2], roofBrown: [1.5, 1.5], white: [2, 2], dirt: [4, 4], rail: [1, 1], asphalt: [4, 4],
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
  function noiseFill(g, w, h, rng, base, amp) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(g, x, y, shade(base, (rng() - 0.5) * amp));
  }

  const defs = {
    concrete: (g, w, h, r) => { noiseFill(g, w, h, r, '#aaa59e', 10); g.fillStyle = 'rgba(70,66,60,0.35)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); },
    concreteDark: (g, w, h, r) => { noiseFill(g, w, h, r, '#6f6b68', 10); g.fillStyle = 'rgba(30,30,30,0.35)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); },
    concreteWarm: (g, w, h, r) => { noiseFill(g, w, h, r, '#b4aa9c', 8); g.fillStyle = 'rgba(80,70,60,0.3)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); },
    white: (g, w, h, r) => { noiseFill(g, w, h, r, '#e4e4e2', 6); g.fillStyle = 'rgba(120,120,120,0.35)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); },
    asphalt: (g, w, h, r) => { noiseFill(g, w, h, r, '#4a4847', 12); },
    facade: (g, w, h, r) => facade(g, w, h, r, '#b8b2ae'),
    facadePink: (g, w, h, r) => facade(g, w, h, r, '#cdc2bb'),
    facadeTan: (g, w, h, r) => facade(g, w, h, r, '#c6beb0'),
    facadeDark: (g, w, h, r) => facade(g, w, h, r, '#5b5552', true),
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
    metal: (g, w, h, r) => { noiseFill(g, w, h, r, '#4d5156', 8); g.fillStyle = '#383b3f'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); },
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
    bark: (g, w, h, r) => {
      noiseFill(g, w, h, r, '#3d2b23', 10);
      for (let k = 0; k < 10; k++) { g.fillStyle = r() < 0.5 ? '#2a1c16' : '#503a2e'; g.fillRect(Math.floor(r() * w), 0, 1, h); }
    },
    houseWall: (g, w, h, r) => { noiseFill(g, w, h, r, '#8e8f94', 8); g.fillStyle = '#76777c'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); },
    roofBrown: (g, w, h, r) => { noiseFill(g, w, h, r, '#6d3a29', 10); g.fillStyle = '#4d2618'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1); },
  };

  function facade(g, w, h, r, wall, dark) {
    noiseFill(g, w, h, r, wall, 8);
    const x0 = 9, x1 = 23, y0 = 5, y1 = 23;
    g.fillStyle = dark ? '#1e1d20' : '#3b3a3f'; g.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / (y1 - y0);
      const col = dark ? 'rgb(' + Math.round(20 + 30 * t) + ',' + Math.round(40 + 60 * t) + ',' + Math.round(70 + 60 * t) + ')'
        : 'rgb(' + Math.round(22 + 40 * t) + ',' + Math.round(92 + 80 * t) + ',' + Math.round(168 + 50 * t) + ')';   // MESURÉ vitres bleues
      g.fillStyle = col; g.fillRect(x0, y, x1 - x0, 1);
    }
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let k = 0; k < 6; k++) g.fillRect(x0 + 2 + k, y0 + 8 - k, 2, 1);
    g.fillStyle = shade(wall, 35); g.fillRect(x0 - 2, y1 + 1, x1 - x0 + 4, 2);   // appui de fenêtre
    g.fillStyle = shade(wall, -45); g.fillRect(x0 - 2, y1 + 3, x1 - x0 + 4, 1);
  }

  T.get = function (name) {
    if (!cache[name]) {
      const d = defs[name];
      if (!d) throw new Error('Texture inconnue : ' + name);
      cache[name] = make(name, 32, 32, d);
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
        CC.Font.draw(g, 'PLAY IT IN YOUR BROWSER', 128, 99, 1.9, '#1a1a1a', { align: 'center', outline: '' });
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

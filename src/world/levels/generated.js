/* Carte aléatoire (v007) : générateur de niveau, trois difficultés.
 * La carte est construite à la volée à partir d'une graine (aucun fichier, aucun téléchargement) :
 * tracé de rue sinueux, pâtés d'immeubles, obstacles franchissables, cibles réparties le long du parcours.
 * Difficulté = nombre de cibles, longueur, réservoir (v009 : marge sur le besoin mesuré 2,5× → 1,7× → 1,35×), densité d'obstacles, hauteur des immeubles, ennemis, ambiance.
 * Le générateur produit aussi les routes du pilote automatique : les cartes aléatoires restent donc
 * enregistrables et mesurables par tools/record.js, comme les sept niveaux de la vidéo. */
(function () {
  const U = CC.U;

  CC.GEN_DIFFS = {
    easy: {
      id: 'easy', fuel: 13, label: 'FACILE', hud: 'C', length: 520, half: 30, par: 16, routeH: 34,
      blocks: 20, hRange: [16, 40], clutter: 0.35, soldiers: 0, kinds: ['tank', 'truck'],
      spread: [0.55, 0.95], env: 'day', ground: 'asphalt',
    },
    medium: {
      id: 'medium', fuel: 14, label: 'MOYEN', hud: 'C', length: 720, half: 24, par: 20, routeH: 42,
      blocks: 34, hRange: [24, 62], clutter: 0.6, soldiers: 1, kinds: ['tank', 'truck', 'heli'],
      spread: [0.4, 0.7, 0.97], env: 'dusk', ground: 'dirt',
    },
    hard: {
      id: 'hard', fuel: 17, label: 'DIFFICILE', hud: 'C', length: 940, half: 19, par: 26, routeH: 50,
      blocks: 48, hRange: [32, 92], clutter: 0.9, soldiers: 3, kinds: ['tank', 'tank', 'heli', 'truck'],
      spread: [0.32, 0.56, 0.78, 0.98], env: 'night', ground: 'concreteDark',
    },
  };

  const ENVS = {
    day: {
      sky: { top: '#8db4da', horizon: '#f1f3f5', bottom: '#cdd1d6', sunColor: '#ffffff', sunSize: 700 },
      fog: { color: '#e6e6e8', near: 140, far: 900 },
      hemi: { sky: '#e8eef6', ground: '#8d8a8e', intensity: 0.66 },
      ambient: { color: '#ffffff', intensity: 0.24 },
      sun: { color: '#ffffff', intensity: 0.74, dir: [0.45, 0.8, 0.35] },
      postfx: { vignette: 0.6, vignetteColor: '#43201f', halftone: 0.45, lift: '#100000', saturation: 0.85 },
    },
    dusk: {
      sky: { top: '#140a08', horizon: '#b04a1c', bottom: '#2a120a', sunColor: '#301006', sunSize: 900 },
      fog: { color: '#2a241c', near: 90, far: 700 },
      hemi: { sky: '#9a9078', ground: '#101a0e', intensity: 0.4 },
      ambient: { color: '#ffffff', intensity: 0.16 },
      sun: { color: '#ffa860', intensity: 0.55, dir: [0.25, 0.22, -1] },
      postfx: { vignette: 0.55, vignetteColor: '#1a0806', halftone: 0.35, lift: '#040004', saturation: 0.8 },
    },
    night: {
      sky: { top: '#000000', horizon: '#04070a', bottom: '#000000', stars: true },
      fog: { color: '#020403', near: 60, far: 420 },
      hemi: { sky: '#788e78', ground: '#1a201a', intensity: 1.0 },
      ambient: { color: '#ffffff', intensity: 0.24 },
      sun: { color: '#a8c0ff', intensity: 0.42, dir: [0.35, 0.65, 0.45] },
      postfx: { vignette: 0.5, vignetteColor: '#000000', chromatic: 0.0075, halftone: 0.3, lift: '#100810', saturation: 1.08 },
    },
  };

  const FACADES = ['facade', 'facadePink', 'facadeTan', 'brick', 'concrete'];
  const SKYLINE = { day: '#e6ebf0', dusk: '#3a2418', night: '#0c1210' };

  /* Construit une fiche de niveau complète pour une difficulté et une graine. */
  function make(diffId, seed) {
    const D = CC.GEN_DIFFS[diffId] || CC.GEN_DIFFS.easy;
    const level = {
      id: 'gen-' + D.id, name: 'AUTOMAP ' + D.label, hud: D.hud, mode: 'targets',
      impactVariant: D.id === 'hard' ? 'cyan' : 'orange',
      seed: seed, generated: true, difficulty: D.id, parTime: D.par, fuel: D.fuel,
      killY: -90, lookAhead: 14, fireDelay: 0.35,
      launcher: { type: 'shoulder', pos: [0, 20, 14], yaw: 0, pitch: 0 },
      env: ENVS[D.env],
      menuView: { center: [0, 22, -D.length * 0.5], radius: Math.max(130, D.length * 0.5), height: 50 },

      build(b) {
        const r = b.rng;
        const half = D.half, len = D.length, aisle = half * 0.62;   // demi-largeur libre de la rue

        // ---------- tracé de la rue (S doux, borné pour rester dans le couloir) ----------
        const path = [{ z: 20, x: 0 }];
        let px = 0;
        for (let z = -20; z >= -len - 60; z -= 40) {
          px = U.clamp(px + r.range(-1, 1) * half * 0.4, -half * 0.5, half * 0.5);
          path.push({ z: z, x: px });
        }
        const xAt = (z) => {
          if (z >= path[0].z) return path[0].x;
          for (let i = 1; i < path.length; i++) {
            if (z >= path[i].z) {
              const a = path[i - 1], c = path[i];
              const t = (a.z - z) / (a.z - c.z);
              return U.lerp(a.x, c.x, U.clamp(t, 0, 1));
            }
          }
          return path[path.length - 1].x;
        };

        // ---------- cibles : placées en premier, elles réservent des zones dégagées ----------
        const targets = [];
        D.kinds.forEach((kind, i) => {
          const z = -len * D.spread[i];
          const cx = xAt(z);
          const off = r.range(-aisle * 0.45, aisle * 0.45);
          const heli = kind === 'heli';
          const pos = [cx + off, heli ? 13 + r.range(0, 5) : 0.1, z];
          targets.push({ kind: kind, pos: pos });
        });
        // Les abords de chaque cible restent dégagés : c'est là que les routes plongent vers la cible.
        const CLEAR = 60;
        const nearTarget = (z, margin) => targets.some((t) => Math.abs(t.pos[2] - z) < (margin === undefined ? CLEAR : margin));

        // ---------- sol ----------
        b.box({ p: [0, -0.5, -len / 2 + 20], s: [700, 1, len + 560], mat: D.ground, ground: true });
        // plaques décoratives (aucune collision) pour casser la monotonie du sol
        for (let i = 0; i < 14; i++) {
          const z = r.range(40, -len - 80), cx = xAt(z);
          b.box({ p: [cx + r.range(-160, 160), 0.02, z], s: [r.range(30, 90), 0.06, r.range(30, 90)], mat: r.pick(['dirt', 'grass', 'concrete', 'asphalt']), collide: false, shadow: false });
        }

        // ---------- trottoirs le long du tracé ----------
        for (let i = 0; i < path.length - 1; i++) {
          const a = path[i], c = path[i + 1];
          const dx = c.x - a.x, dz = c.z - a.z;
          const yaw = Math.atan2(dx, dz) * 180 / Math.PI;
          const mid = { x: (a.x + c.x) / 2, z: (a.z + c.z) / 2 };
          const segLen = Math.hypot(dx, dz);
          for (const side of [-1, 1]) {
            const nx = -dz / segLen, nz = dx / segLen;                 // normale au segment
            b.box({ p: [mid.x + nx * side * (aisle + 1.2), 0.18, mid.z + nz * side * (aisle + 1.2)], s: [3, 0.36, segLen + 1], r: [0, yaw, 0], mat: 'concrete' });
          }
        }

        // ---------- pâtés d'immeubles le long de la rue ----------
        const roofs = [];
        for (let i = 0; i < D.blocks; i++) {
          const z = r.range(40, -len - 100), cx = xAt(z), side = r.sign();
          const w = r.range(14, 34), d = r.range(14, 34), h = r.range(D.hRange[0], D.hRange[1]);
          const x = cx + side * (aisle + 11 + w / 2 + r.range(0, 46));
          const mat = { side: r.pick(FACADES), top: r.pick(['concrete', 'concreteDark']), bottom: 'concreteDark' };
          b.box({ p: [x, h / 2, z], s: [w, h, d], mat: mat, tint: r.pick(['#ffffff', '#f2f0ee', '#eae6e2']) });
          // toit accessible au grappin sur les plus hauts
          if (h > (D.hRange[0] + D.hRange[1]) * 0.5) roofs.push({ x: x - side * (w / 2 + 1.2), y: h + 0.2, z: z, side: side });
          if (r() < 0.4) b.box({ p: [x, h + r.range(1, 4) / 2, z], s: [r.range(4, 9), r.range(1, 4), r.range(4, 9)], mat: 'concreteDark' });   // édicule de toit
        }

        // ---------- extrémité du parcours : la rue se ferme ----------
        b.box({ p: [xAt(-len - 70), 22, -len - 80], s: [aisle * 4, 44, 16], mat: { side: r.pick(FACADES), top: 'concrete' } });

        // ---------- obstacles franchissables (hors des zones de cible) ----------
        const arches = 3 + Math.round(D.clutter * 6);
        // Les 70 premiers mètres restent dégagés : le temps de voir venir ce qui arrive.
        for (let i = 0; i < arches; i++) {
          const z = r.range(-70, -len + 40);
          if (nearTarget(z)) continue;
          const cx = xAt(z), hh = r.range(airMin(D), 20), th = r.range(1.4, 2.6);
          for (const side of [-1, 1]) b.box({ p: [cx + side * aisle, hh / 2, z], s: [th, hh, r.range(3, 6)], mat: 'concreteDark' });
          b.box({ p: [cx, hh + 1.6, z], s: [aisle * 2 + th, 3.2, r.range(3, 6)], mat: 'concrete' });
        }
        // passerelles basses (il faut passer dessous, ou au-dessus)
        const bridges = D.id === 'easy' ? 0 : D.id === 'medium' ? 1 : 2;
        for (let i = 0; i < bridges; i++) {
          const z = r.range(-110, -len + 80);
          if (nearTarget(z)) continue;
          const cx = xAt(z), y = r.range(13, 16);
          b.box({ p: [cx, y, z], s: [aisle * 2.4, 2, 7], mat: 'concreteDark' });
          b.box({ p: [cx, y + 1, z], s: [aisle * 2.4, 0.3, 7], mat: 'hazard', collide: false });
        }
        // vitres à traverser (elles se brisent)
        const glassN = Math.round(D.clutter * 10);
        for (let i = 0; i < glassN; i++) {
          const z = r.range(-70, -len + 30);
          if (nearTarget(z)) continue;
          b.glass([xAt(z), r.range(6, 10) / 2 + 3, z], [aisle * 1.9, r.range(9, 13), 0.14]);
        }
        // caisses destructibles dans la rue
        const crateN = Math.round(D.clutter * 30);
        for (let i = 0; i < crateN; i++) {
          const z = r.range(-30, -len + 20);
          if (nearTarget(z, 35)) continue;
          const cx = xAt(z), s = r.range(1.4, 2.2);
          b.crate([cx + r.range(-aisle * 0.7, aisle * 0.7), s / 2 + 0.1, z], [s, s, s], [0, r.range(0, 90), 0]);
        }
        // lasers rouges (difficile) : barrages à franchir en rasant ou en passant au-dessus
        if (D.id === 'hard') {
          for (let i = 0; i < 3; i++) {
            const z = r.range(-80, -len + 60);
            if (nearTarget(z)) continue;
            const cx = xAt(z), y = r.range(8, 12);
            b.laser([cx - aisle, y, z], [cx + aisle, y, z]);
          }
        }
        // lampadaires
        for (let i = 0; i < 14; i++) {
          const z = r.range(-10, -len - 40), cx = xAt(z), side = r.sign();
          const yaw = side > 0 ? 90 : -90;
          b.box({ p: [cx + side * (aisle + 0.4), 4.5, z], s: [0.35, 9, 0.35], mat: 'col:#2c2f33', collide: false });
          b.box({ p: [cx + side * (aisle - 1.2), 9, z], s: [2.6, 0.35, 0.6], r: [0, yaw, 0], mat: 'col:#3a3d42', collide: false });
        }
        // points d'accroche du grappin (le long du parcours, sur les toits)
        const gp = [];
        for (const roof of roofs) {
          if (gp.length >= (D.id === 'easy' ? 2 : D.id === 'medium' ? 3 : 4)) break;
          if (Math.abs(roof.z) < 40) continue;
          b.grapplePoint([roof.x, roof.y + 1.2, roof.z], [roof.side, 0, 0], 1.7);
          gp.push(roof);
        }

        // ---------- cibles, ennemis, décor lointain ----------
        D.kinds.forEach((kind, i) => {
          const t = targets[i];
          if (kind === 'heli') b.target('heli', t.pos, r.range(0, 360), { drift: 7, driftSpeed: 0.32 });
          else b.target(kind, t.pos, r.range(0, 360), { detectRange: D.id === 'easy' ? 34 : 46 });
        });
        for (let i = 0; i < D.soldiers; i++) {
          const t = targets[r.int(0, targets.length - 1)];
          b.soldier([t.pos[0] + r.range(-14, 14), 0, t.pos[2] + r.range(18, 40)], r.range(0, 360));
        }
        b.skyline(0, -len * 0.5, len * 0.7, len * 1.8, 46, 60, 260, SKYLINE[D.env], -12);

        // ---------- routes du pilote automatique : une par cible ----------
        // La descente finale tient dans la zone dégagée autour de la cible (CLEAR = 60 m).
        level.routes = targets.map((t) => {
          const route = [[0, 20, 14], [xAt(-4), D.routeH, -4]];
          const tz = t.pos[2];
          for (let z = -40; z > tz + CLEAR + 20; z -= 40) route.push([xAt(z), D.routeH, z]);
          route.push([xAt(tz + CLEAR + 20), D.routeH * 0.72, tz + CLEAR + 20]);
          route.push([xAt(tz + CLEAR * 0.55), 20, tz + CLEAR * 0.55]);
          route.push([xAt(tz + 12), 8, tz + 12]);
          route.push([t.pos[0], t.pos[1] + 1.5, tz]);
          return route;
        });
        level.route = level.routes[0];
      },
    };
    return level;
  }

  // Hauteur minimale d'un passage sous arche (laisse toujours de la place pour passer dessous).
  function airMin(D) { return 9 + D.clutter * 3; }

  CC.GeneratedLevel = make;
})();

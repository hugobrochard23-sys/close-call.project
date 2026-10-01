/* v034 : ECLATS et bonus du mode CLASSIQUE.
 *  - ECLAT (cyan, commun) : petits cristaux posés en traînées le long de la trajectoire SÛRE du couloir (celle du pilote automatique :
 *    elle passe par les trous, sous les poutres, vers les cibles). Les suivre = voler bien, sans lire un mot. +10 points chacun.
 *  - ETOILE DOREE (rare) : +150 points et 3 s d'essence — un « ouf ! » quand le réservoir est bas.
 *  - MULTIPLICATEUR ×2 (rare, magenta) : les points de bonus (éclats, cibles, frôlements) comptent double pendant 12 s.
 * Chaque tronçon crée ses éclats en un seul objet `Points` (un appel de dessin) ; ramassage par simple distance.
 * Feedback : son qui monte de note en note quand on enchaîne, étincelles, compteur qui saute, micro-vibration. */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;

  // ---------- sprites en pixel-art dessinés par le code ----------
  function pixelTexture(rows, palette) {
    const n = rows.length, c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d');
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const k = rows[y][x]; if (k !== '.') { g.fillStyle = palette[k]; g.fillRect(x, y, 1, 1); } }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    return t;
  }
  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  // MATERIAU : un gros écrou hexagonal doré (brillant, lisse) — une pièce de mécanique, cohérente avec une roquette
  function nutTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const hex = (r, rot) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.closePath(); };
    hex(60, Math.PI / 6); g.fillStyle = '#7a4a00'; g.fill();
    const gr = g.createLinearGradient(14, 10, 114, 118); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(0.45, '#ffc820'); gr.addColorStop(1, '#c87800');
    hex(54, Math.PI / 6); g.fillStyle = gr; g.fill();
    hex(54, Math.PI / 6); g.strokeStyle = '#fff8c8'; g.lineWidth = 3; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(24, 40); g.lineTo(64, 14); g.lineTo(100, 36); g.lineTo(64, 44); g.closePath(); g.fill();
    g.beginPath(); g.arc(64, 66, 22, 0, 6.283); g.fillStyle = '#5a3400'; g.fill();
    const gh = g.createRadialGradient(64, 62, 4, 64, 66, 22); gh.addColorStop(0, '#2a1800'); gh.addColorStop(1, '#8a5a10'); g.beginPath(); g.arc(64, 66, 18, 0, 6.283); g.fillStyle = gh; g.fill();
    const t = new THREE.CanvasTexture(c); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  }

  // v038f : ECROU D'OR EN 3D — prisme hexagonal chanfreiné percé d'un trou (extrusion + biseau), matière brillante (Phong, reflet blanc chaud) ;
  // il tourne sur lui-même (un InstancedMesh par tronçon : un seul appel de dessin)
  function nutGeometry() {
    const sh = new THREE.Shape(), R = 1;
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3, x = Math.cos(a) * R, y = Math.sin(a) * R; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
    const hole = new THREE.Path(); hole.absarc(0, 0, 0.42, 0, Math.PI * 2, true); sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.13, bevelSegments: 1, curveSegments: 8 });
    g.center(); g.computeVertexNormals();
    return g;
  }
  let shared = null;
  function assets() {
    if (shared) return shared;
    const map = nutTexture();
    shared = {
      nutGeo: nutGeometry(),
      nutMat: new THREE.MeshPhongMaterial({ color: '#ffc21a', specular: '#fff4b0', shininess: 90, emissive: '#a86400', emissiveIntensity: 0.55 }),
      glow: glowTexture(),
      pts: new THREE.PointsMaterial({ map, size: CC.CONFIG.cells.size, sizeAttenuation: true, alphaTest: 0.35, transparent: false, depthWrite: true, color: '#ffffff' }),
      goldMat: new THREE.MeshLambertMaterial({ color: '#ffd23a', emissive: '#c88a00', emissiveIntensity: 0.9, flatShading: true }),
      multMat: new THREE.MeshLambertMaterial({ color: '#ff5be0', emissive: '#a0209a', emissiveIntensity: 0.9, flatShading: true }),
      goldGeo: new THREE.OctahedronGeometry(0.85, 0), multGeo: new THREE.IcosahedronGeometry(0.7, 0),
      goldHalo: new THREE.SpriteMaterial({ map: null, color: '#ffc830', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.4, fog: false }),
      multHalo: new THREE.SpriteMaterial({ map: null, color: '#ff4bd8', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35, fog: false }),
    };
    shared.goldHalo.map = shared.glow; shared.multHalo.map = shared.glow;
    return shared;
  }

  // position sur la trajectoire sûre à la distance d (interpolation linéaire entre les points de passage)
  function pathAt(nodes, d) {
    if (!nodes.length) return { lx: 0, y: CC.CONFIG.endless.cruise };
    if (d <= nodes[0].d) return nodes[0];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      if (d <= b.d) { const k = (d - a.d) / Math.max(1e-3, b.d - a.d); return { lx: U.lerp(a.lx, b.lx, k), y: U.lerp(a.y, b.y, k) }; }
    }
    return nodes[nodes.length - 1];
  }

  const Collect = {};

  /* Crée les bonus d'un tronçon [d0, d1[ — appelé par buildChunk APRÈS b.finish() (les murs existent déjà : on écarte tout ce qui
   * toucherait un mur). `nodes` : points de passage { d, lx, y } triés. Retourne l'objet du tronçon. */
  Collect.build = function (game, T, b, nodes, d0, d1, r, spiral) {
    const A = assets(), C = CC.CONFIG.cells, world = game.world, near = {};
    const root = new THREE.Group(); root.name = 'collect'; game.scene.add(root);
    // groupe à part (pas dans b.root : le LevelBuilder libérerait aussi les géométries partagées des bonus)
    const c = { cells: null, specials: [], root, dispose() { game.scene.remove(root); if (c.cells) { c.cells.pts.geometry.dispose(); if (c.cells.inst) c.cells.inst.dispose(); } } };
    const okAt = (p, m) => { world.nearest(p, m + 1, near); return near.wall > m && near.ground > 1.2; };
    // traînées d'éclats
    const pos = [];
    if (spiral) for (let i = 0; i < 34; i++) { const dd = spiral.d - 38 + i * 2.3, a = i * 0.75, q = T.at(dd, spiral.lx + Math.cos(a) * 4.2, spiral.y + Math.sin(a) * 4.2); pos.push(q[0], q[1], q[2]); }   // spirale dans le hangar-tunnel
    let d = Math.max(d0 + 12, T.nextCell === undefined ? d0 + 20 : T.nextCell);
    while (d < d1 - 8) {
      const n = r.int ? r.int(C.trailLen[0], C.trailLen[1]) : Math.floor(r.between(C.trailLen)), wob = r.between([0, 2.4]), ph = r.between([0, 6]);
      for (let i = 0; i < n; i++) {
        const dd = d + i * C.spacing; if (dd >= d1 - 4) break;
        const n0 = pathAt(nodes, dd), lx = n0.lx + Math.sin(i * 0.9 + ph) * wob, y = n0.y + Math.cos(i * 0.9 + ph) * wob * 0.35;
        const p = T.at(dd, lx, y);
        if (okAt(_v.set(p[0], p[1], p[2]), 1.3)) pos.push(p[0], p[1], p[2]);
      }
      d += n * C.spacing + r.between(C.trailGap);
    }
    T.nextCell = d;
    if (pos.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeBoundingSphere();
      const pts = new THREE.Points(g, A.pts); pts.frustumCulled = false; pts.visible = false; root.add(pts);   // v038f : les points ne servent plus que de données (positions) ; l'affichage est l'InstancedMesh d'écrous 3D
      const n = pos.length / 3, inst = new THREE.InstancedMesh(A.nutGeo, A.nutMat, n); inst.frustumCulled = false; root.add(inst);
      c.cells = { pts, inst, arr: g.attributes.position.array, n, alive: new Uint8Array(n).fill(1) };
      Collect.sync(c.cells, 0);
    }
    // étoile dorée et multiplicateur : loin l'un de l'autre, sur la trajectoire sûre
    const special = (kind, cursor, every) => {
      if (T[cursor] === undefined) T[cursor] = r.between(every) * 0.6 + 120;
      while (T[cursor] < d1) {
        const dd = T[cursor];
        if (dd >= d0 + 10) {
          const n0 = pathAt(nodes, dd), p = T.at(dd, n0.lx, n0.y);
          if (okAt(_v.set(p[0], p[1], p[2]), 1.6)) {
            const gold = kind === 'gold';
            const mesh = new THREE.Mesh(gold ? A.goldGeo : A.multGeo, gold ? A.goldMat : A.multMat); mesh.position.set(p[0], p[1], p[2]); mesh.scale.y = gold ? 1.25 : 1;
            const halo = new THREE.Sprite(gold ? A.goldHalo : A.multHalo); halo.scale.setScalar(gold ? 2.6 : 2.4); halo.position.copy(mesh.position);
            root.add(mesh); root.add(halo);
            c.specials.push({ kind, mesh, halo, alive: true, phase: r() * 6 });
          }
        }
        T[cursor] = dd + r.between(every);
      }
    };
    special('gold', 'nextGold', C.goldEvery);
    special('mult', 'nextMult', C.multEvery);
    return c;
  };
  const _v = new V();
  // met à jour les écrous 3D : position (aimantée), rotation continue, léger rebond ; les ramassés disparaissent (échelle 0)
  const _o = new THREE.Object3D();
  Collect.sync = function (cs, t) {
    const a = cs.arr, S = CC.CONFIG.cells.size * 0.5;
    for (let i = 0; i < cs.n; i++) {
      if (!cs.alive[i]) { _o.scale.setScalar(0); _o.position.set(0, -9999, 0); }
      else { _o.position.set(a[i * 3], a[i * 3 + 1] + Math.sin(t * 2.4 + i) * 0.18, a[i * 3 + 2]); _o.rotation.set(0.18, t * 2.6 + i * 0.9, 0); _o.scale.setScalar(S * (1 + 0.06 * Math.sin(t * 5 + i))); }
      _o.updateMatrix(); cs.inst.setMatrixAt(i, _o.matrix);
    }
    cs.inst.instanceMatrix.needsUpdate = true;
  };

  /* Ramassage : appelé chaque image de vol. Ne teste que les tronçons proches de la roquette. */
  Collect.update = function (game, run, dt) {
    const rk = game.rocket; if (!rk.active) { this._pz = undefined; return; }
    const C = CC.CONFIG.cells, p = rk.pos, R2 = C.radius * C.radius, RB2 = C.radiusBig * C.radiusBig, dist = run.dist, L = CC.CONFIG.endless.chunkLen;
    const A = shared; if (A) A.pts.size = C.size * (1 + 0.1 * Math.sin(performance.now() * 0.008));
    for (const [k, ch] of run.chunks) {
      const col = ch.collect; if (!col) continue;
      const far = Math.abs((k + 0.5) * L - dist);
      if (col.cells && col.cells.inst) col.cells.inst.visible = far < 340;   // v038g : pas de dessin des écrous au-delà du brouillard
      if (far > L * 0.5 + 60) { if (col.specials.length) this.spin(col, dt); continue; }   // hors de portée : on ne teste rien
      this.rings(game, run, ch, p);
      const cs = col.cells;
      if (cs) {
        const a = cs.arr, M2 = C.magnet * C.magnet; let moved = false;
        for (let i = 0; i < cs.n; i++) {
          if (!cs.alive[i]) continue;
          let dx = a[i * 3] - p.x, dy = a[i * 3 + 1] - p.y, dz = a[i * 3 + 2] - p.z, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > M2) continue;
          // aimant : les matériaux proches filent vers la roquette (séries faciles à ramasser à 60 m/s)
          if (d2 > R2) {
            const d = Math.sqrt(d2), step = Math.min(d - 0.2, (28 + 70 * (1 - d / C.magnet)) * dt);
            a[i * 3] -= dx / d * step; a[i * 3 + 1] -= dy / d * step; a[i * 3 + 2] -= dz / d * step; moved = true;
            dx = a[i * 3] - p.x; dy = a[i * 3 + 1] - p.y; dz = a[i * 3 + 2] - p.z; d2 = dx * dx + dy * dy + dz * dz;
          }
          if (d2 > R2) continue;
          cs.alive[i] = 0; const px = a[i * 3], py = a[i * 3 + 1], pz = a[i * 3 + 2]; a[i * 3 + 1] = -9999; moved = true;
          game.onCollect('cell', _v.set(px, py, pz));
        }
        if (moved) cs.pts.geometry.attributes.position.needsUpdate = true;
        Collect.sync(cs, performance.now() * 0.001);
      }
      this.spin(col, dt);
      for (const s of col.specials) {
        if (!s.alive) continue;
        if (s.mesh.position.distanceToSquared(p) < RB2) {
          s.alive = false; s.mesh.visible = false; s.halo.visible = false;
          game.onCollect(s.kind, s.mesh.position);
        }
      }
    }
  };
  // anneaux d'or : on franchit le plan de chaque anneau (en z) ; dans le rayon → passé, hors du rayon → manqué (la série est perdue)
  Collect.rings = function (game, run, ch, p) {
    if (!ch.rings || !ch.rings.length) return;
    const pz = this._pz;
    if (pz === undefined) return;
    run.ringGroups = run.ringGroups || {};
    for (const q of ch.rings) {
      if (q.passed || q.missed) continue;
      if (!q.p) q.p = run.T.at(q.d, q.lx, q.y);
      const G = run.ringGroups[q.gid] || (run.ringGroups[q.gid] = { n: q.n, got: 0, dead: false });
      if (pz > q.p[2] && p.z <= q.p[2]) {
        const dx = p.x - q.p[0], dy = p.y - q.p[1];
        if (dx * dx + dy * dy < q.rad * q.rad * 1.1) { q.passed = true; G.got++; game.onRing(q, G); }
        else { q.missed = true; G.dead = true; }
      }
    }
  };
  Collect.frameEnd = function (rk) { this._pz = rk.active ? rk.pos.z : undefined; };
  Collect.spin = function (col, dt) {
    const t = performance.now() * 0.001;
    for (const s of col.specials) {
      if (!s.alive) continue;
      s.mesh.rotation.y += dt * 2.4; s.mesh.rotation.x = Math.sin(t * 1.7 + s.phase) * 0.25;
      s.halo.scale.setScalar((s.kind === 'gold' ? 2.6 : 2.4) * (1 + 0.08 * Math.sin(t * 5 + s.phase)));
    }
  };

  CC.Collect = Collect;
})();

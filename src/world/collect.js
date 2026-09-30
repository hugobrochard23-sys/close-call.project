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
  const DIAMOND = [
    '................', '.......oo.......', '......oHHo......', '.....oHHcco.....', '....oHcccbbo....', '...oHcccbbbbo...', '..oHccccbbbbbo..', '.oHcccccbbbbbbo.',
    '.oscccbbbbbbbdo.', '..osccbbbbbbdo..', '...osbbbbbbdo...', '....osbbbbdo....', '.....osbbdo.....', '......osdo......', '.......oo.......', '................'];
  const PAL = { o: '#04202e', H: '#ffffff', c: '#9cf0ff', b: '#39d4ff', s: '#c8faff', d: '#1493c4' };

  let shared = null;
  function assets() {
    if (shared) return shared;
    const map = pixelTexture(DIAMOND, PAL);
    shared = {
      glow: glowTexture(),
      pts: new THREE.PointsMaterial({ map, size: CC.CONFIG.cells.size, sizeAttenuation: true, alphaTest: 0.4, transparent: false, depthWrite: true, color: '#ffffff' }),
      goldMat: new THREE.MeshLambertMaterial({ color: '#ffd23a', emissive: '#c88a00', emissiveIntensity: 0.9, flatShading: true }),
      multMat: new THREE.MeshLambertMaterial({ color: '#ff5be0', emissive: '#a0209a', emissiveIntensity: 0.9, flatShading: true }),
      goldGeo: new THREE.OctahedronGeometry(0.85, 0), multGeo: new THREE.IcosahedronGeometry(0.7, 0),
      goldHalo: new THREE.SpriteMaterial({ map: null, color: '#ffc830', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85, fog: false }),
      multHalo: new THREE.SpriteMaterial({ map: null, color: '#ff4bd8', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85, fog: false }),
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
  Collect.build = function (game, T, b, nodes, d0, d1, r) {
    const A = assets(), C = CC.CONFIG.cells, world = game.world, near = {};
    const root = new THREE.Group(); root.name = 'collect'; game.scene.add(root);
    // groupe à part (pas dans b.root : le LevelBuilder libérerait aussi les géométries partagées des bonus)
    const c = { cells: null, specials: [], root, dispose() { game.scene.remove(root); if (c.cells) c.cells.pts.geometry.dispose(); } };
    const okAt = (p, m) => { world.nearest(p, m + 1, near); return near.wall > m && near.ground > 1.2; };
    // traînées d'éclats
    const pos = [];
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
      const pts = new THREE.Points(g, A.pts); pts.frustumCulled = true; root.add(pts);
      c.cells = { pts, arr: g.attributes.position.array, n: pos.length / 3, alive: new Uint8Array(pos.length / 3).fill(1) };
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
            const halo = new THREE.Sprite(gold ? A.goldHalo : A.multHalo); halo.scale.setScalar(gold ? 4.2 : 3.6); halo.position.copy(mesh.position);
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

  /* Ramassage : appelé chaque image de vol. Ne teste que les tronçons proches de la roquette. */
  Collect.update = function (game, run, dt) {
    const rk = game.rocket; if (!rk.active) return;
    const C = CC.CONFIG.cells, p = rk.pos, R2 = C.radius * C.radius, RB2 = C.radiusBig * C.radiusBig, dist = run.dist, L = CC.CONFIG.endless.chunkLen;
    const A = shared; if (A) A.pts.size = C.size * (1 + 0.1 * Math.sin(performance.now() * 0.008));
    for (const [k, ch] of run.chunks) {
      const col = ch.collect; if (!col) continue;
      if (Math.abs((k + 0.5) * L - dist) > L * 0.5 + 40) { if (col.specials.length) this.spin(col, dt); continue; }   // hors de portée : on ne teste rien
      const cs = col.cells;
      if (cs) {
        const a = cs.arr;
        for (let i = 0; i < cs.n; i++) {
          if (!cs.alive[i]) continue;
          const dx = a[i * 3] - p.x, dz = a[i * 3 + 2] - p.z;
          if (dx * dx + dz * dz > R2) continue;
          const dy = a[i * 3 + 1] - p.y;
          if (dx * dx + dy * dy + dz * dz > R2) continue;
          cs.alive[i] = 0; a[i * 3 + 1] = -9999; cs.pts.geometry.attributes.position.needsUpdate = true;
          game.onCollect('cell', _v.set(dx + p.x, dy + p.y, dz + p.z));
        }
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
  Collect.spin = function (col, dt) {
    const t = performance.now() * 0.001;
    for (const s of col.specials) {
      if (!s.alive) continue;
      s.mesh.rotation.y += dt * 2.4; s.mesh.rotation.x = Math.sin(t * 1.7 + s.phase) * 0.25;
      s.halo.scale.setScalar((s.kind === 'gold' ? 4.2 : 3.6) * (1 + 0.12 * Math.sin(t * 5 + s.phase)));
    }
  };

  CC.Collect = Collect;
})();

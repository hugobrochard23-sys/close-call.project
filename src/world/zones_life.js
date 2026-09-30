/* v036 : le MONDE VIVANT des zones d'origine — trafic, tram, bateaux, trains de marchandises, camions porte-conteneurs, grues qui bougent,
 * avions, train électrique, oiseaux, lucioles. Chaque zone reçoit, en plus de ses scènes, une fonction `life(S)` appelée pour chaque scène
 * (les flottes sont limitées au tronçon en cours de construction : voir Life.fleet). Les sons viennent de CC.Audio (train, klaxon, corne de navire…). */
(function () {
  const U = CC.U, Z = CC.Zones, L = CC.Life;
  const setOf = (car, n, gap, head) => { const out = []; for (let i = 0; i < n; i++) for (const p of (i === 0 && head ? L.models.trainHead() : car())) out.push([p[0], p[1], p[2] + i * gap, p[3], p[4], p[5], p[6], p[7]]); return out; };
  L.models.trainSet = () => setOf(L.models.trainCar, 4, 14.4, true);
  L.models.freightSet = () => setOf(L.models.freight, 6, 12.8, false);
  L.models.tram = () => setOf(L.models.trainCar, 2, 14.4, true);
  L.models.truckCont = () => L.models.van().concat([[0, 3.5, 0.8, 2.45, 2.58, 6.1, '#b8382c']]);
  const CARS = ['#d83a2a', '#2a6ac8', '#e8e8e4', '#3a3a40', '#e8c020', '#3a9a5a', '#8a8a90', '#ff8a2a'];
  const wrap = (zone, fn) => { const def = Z.defs[zone]; if (!def) return; const old = def.dress; def.dress = (S) => { if (old) old(S); fn(S); }; };

  // ---------- AVENUE : circulation, tram sur le viaduc, oiseaux, montgolfière ----------
  wrap('city', (S) => {
    const nm = S.sc.name, free = nm !== 'passage' && nm !== 'tower';
    if (free) {
      const k = nm === 'carrefour' ? 0.75 : 1;
      L.fleet(S, { model: 'car', n: Math.round(9 * k), fixedLx: [-13, -9, -5], y: [0.15, 0.15], speed: [11, 18], dir: 1, tint: CARS, sound: { name: 'carPass', range: 34, every: 2.5 } });
      L.fleet(S, { model: 'car', n: Math.round(9 * k), fixedLx: [5, 9, 13], y: [0.15, 0.15], speed: [12, 20], dir: -1, tint: CARS, sound: { name: 'carPass', range: 34, every: 2.5 } });
      L.fleet(S, { model: 'bus', n: 1, fixedLx: [-9, 9], y: [0.15, 0.15], speed: [9, 12], dir: 0, tint: ['#e8c020', '#2a9ac8'], sound: { name: 'horn', range: 50, every: 12 } });
    }
    if (nm === 'carrefour') {          // tram qui traverse l'avenue sur le viaduc
      const c = S.mid, Ln = S.lane(c), yb = U.clamp(Ln.y + S.R + 3.5, 18, 44), W = S.vol(c) + 30;
      L.fleet(S, { model: 'tram', n: 1, mode: 'cross', d: c, lx: [-W, W], y: [yb + 3.3, yb + 3.3], speed: [16, 16], dir: 0, sound: { name: 'trainPass', range: 130, every: 14 } });
    }
    if (nm === 'viaduc') {             // circulation sur l'autoroute surélevée
      const yb = 10 + 2 * S.R * 0.45 + 4.2;
      L.fleet(S, { model: 'car', n: 8, fixedLx: [-14, -8, 8, 14], y: [yb + 2.8, yb + 2.8], speed: [22, 30], dir: 0, tint: CARS, sound: { name: 'carPass', range: 40, every: 3 } });
    }
    if (!S.dark) {
      L.fleet(S, { model: 'bird', n: 7, lx: [-32, 32], y: [16, 52], speed: [7, 11], flap: 0.55, scale: [1.3, 2.2], sound: { name: 'birds', range: 75, every: 7 } });
      if (nm === 'marche' || nm === 'boulevard') L.fleet(S, { model: 'balloon', n: 1, lx: [-45, 45], y: [45, 80], speed: [2, 4], bob: 2, tint: ['#e8604a', '#4a8ae8', '#e8c04a'], scale: [1.2, 1.6] });
    } else if (nm === 'tower' || nm === 'boulevard') L.fleet(S, { model: 'heli', n: 1, lx: [-30, 30], y: [40, 90], speed: [14, 20], scale: [1.4, 1.6], wave: 1.2, sound: { name: 'whoosh', range: 70, every: 8 } });
  });

  // ---------- METRO : rames sur les voies voisines, poussière ----------
  wrap('metro', (S) => {
    const nm = S.sc.name;
    if (nm === 'tunnel' || nm === 'eboulement' || nm === 'puits') {
      for (const s of [-1, 1]) S.rows(S.d0, S.d1, 10, 0, (dc) => S.item(dc, () => { for (const a of [-0.72, 0.72]) S.bx(dc, s * 9 + a, 0.35, 0.16, 0.3, 10.4, 'metal', '#9a9ea4', false); }));
      L.fleet(S, { model: 'trainSet', n: 1, fixedLx: [9, -9], y: [0.2, 0.2], speed: [30, 34], dir: -1, sound: { name: 'trainPass', range: 100, every: 14 } });
    }
    L.motes(S, { n: 70, lx: [-18, 18], y: [2, 22], color: '#d8e0e8', size: 0.6, drift: [0, 0.4, 0], sway: 0.8, opacity: 0.35 });
  });

  // ---------- PORT : navires, bateaux, camions porte-conteneurs, train de marchandises, grue qui balance, mouettes ----------
  wrap('port', (S) => {
    const nm = S.sc.name;
    L.fleet(S, { model: 'ship', n: 1, lx: [-95, 95], y: [-3.6, -3.6], speed: [5, 8], dir: 0, fixedLx: [S.sr() < 0.5 ? -62 : 62], scale: [1, 1], sound: { name: 'shipHorn', range: 190, every: 30 } });
    L.fleet(S, { model: 'boat', n: 3, lx: [-70, 70], y: [-3.3, -3.3], speed: [5, 9], dir: 0, bob: 0.25, tint: ['#e8e8e4', '#2a5a8a', '#b8382c'], scale: [1, 1.3] });
    L.fleet(S, { model: 'sail', n: 2, lx: [-75, 75], y: [-3.2, -3.2], speed: [3, 5], dir: 0, bob: 0.3, tint: ['#e8e8e4', '#e8c04a'], scale: [1.2, 1.6] });
    if (nm !== 'lac') {
      L.fleet(S, { model: 'truckCont', n: 3, fixedLx: [-11, 11, -13], y: [0.15, 0.15], speed: [8, 13], dir: 0, tint: ['#ffffff'], sound: { name: 'horn', range: 50, every: 14 } });
      L.fleet(S, { model: 'freightSet', n: 1, fixedLx: [S.sr() < 0.5 ? -7 : 7], y: [0.3, 0.3], speed: [13, 18], dir: 0, tint: ['#8a6a4a', '#4a6a8a', '#8a4a3a', '#6a7a5a'], sound: { name: 'trainPass', range: 130, every: 16 } });
    }
    if (nm === 'conteneurs') {          // grues : un chariot transporte une charge en va-et-vient au-dessus du quai (décor) et une charge se balance sur le passage (obstacle)
      L.fleet(S, { model: 'container', n: 2, mode: 'across', lx: [-21, 21], y: [34, 37], speed: [4, 6], dir: 0, scale: [1, 1], tint: ['#b8382c', '#2a5a8a', '#c89a20'] });
      const dc = S.d0 + S.len * 0.5, Ln = S.lane(dc), below = Ln.y > 20, yc = Ln.y + (below ? -1 : 1) * (S.R + 8), hgt = 46;
      S.item(dc, (r) => {
        for (const s of [-1, 1]) for (const k of [-1, 1]) S.bx(dc + k * 6, s * 21, hgt / 2, 1.8, hgt, 1.8, 'col:#e0b020', undefined, false);
        S.bx(dc, 0, hgt + 1.5, 46, 3, 14, 'col:#e0b020');
        L.sweeper(S, { model: 'container', d: dc, lx: 0, y: hgt, mode: 'swing', len: hgt - yc, angle: 0.5, period: 6.4, phase: r() * 6.28, size: [3, 3, 6.4], cause: 'crane', cable: true, tilt: 0.3, ropeEnd: 1.4, sound: null });
      });
      S.reserve(dc, 0, 50, 16);
    }
    if (!S.dark) L.fleet(S, { model: 'gull', n: 6, lx: [-42, 42], y: [8, 40], speed: [6, 10], flap: 0.5, scale: [1.2, 1.8], sound: { name: 'gull', range: 80, every: 6 } });
  });

  // ---------- BASE EN ALTITUDE : avions, ballons, cargo en approche ----------
  wrap('sky', (S) => {
    L.fleet(S, { model: 'jet', n: 2, lx: [-70, 70], y: [14, 70], speed: [60, 85], dir: -1, scale: [1.2, 1.6], sound: { name: 'jetPass', range: 130, every: 10 } });
    L.fleet(S, { model: 'jet', n: 2, lx: [-70, 70], y: [14, 70], speed: [38, 52], dir: 1, scale: [1.2, 1.6], sound: { name: 'jetPass', range: 110, every: 10 } });
    L.fleet(S, { model: 'airliner', n: 1, lx: [-110, 110], y: [50, 100], speed: [48, 60], dir: 1, scale: [1, 1], sound: { name: 'jetPass', range: 180, every: 20, param: 'far' } });
    L.fleet(S, { model: 'balloon', n: 2, lx: [-110, 110], y: [0, 90], speed: [2, 4], bob: 2, tint: ['#e8604a', '#4a8ae8', '#e8c04a', '#4ac88a'], scale: [1.4, 2] });
    L.motes(S, { n: 60, lx: [-80, 80], y: [-20, 80], color: '#ffffff', size: 1.2, drift: [0, 0.5, 0], sway: 3, opacity: 0.3 });
  });

  // ---------- MONDE MINIATURE : train électrique, ballons de baudruche, poussière dans un rai de lumière ----------
  wrap('mini', (S) => {
    if (S.sc.name === 'chambre') L.fleet(S, { model: 'toyTrain', n: 1, fixedLx: [0], y: [0.4, 0.4], speed: [22, 22], dir: 1, scale: [1, 1], tint: ['#d83a2a'], sound: { name: 'whoosh', range: 70, every: 10 } });
    L.fleet(S, { model: 'balloon', n: 3, lx: [-40, 40], y: [40, 110], speed: [1, 2], bob: 4, tint: ['#e8604a', '#4a8ae8', '#e8c04a', '#e85ad8'], scale: [0.5, 0.8] });
    L.motes(S, { n: 90, lx: [-40, 40], y: [2, 120], color: '#fff6dc', size: 0.9, drift: [0, 0.5, 0], sway: 1.6, additive: true, opacity: 0.5, twinkle: true });
  });

  // ---------- FORET : oiseaux le jour, lucioles la nuit, feuilles ----------
  Z.forestLife = (S) => {
    if (S.dark) L.motes(S, { n: 150, lx: [-34, 34], y: [1.5, 28], color: '#d8ff7a', size: 0.9, drift: [0, 0.4, 0], sway: 2.2, additive: true, opacity: 0.85, twinkle: true });
    else {
      L.fleet(S, { model: 'bird', n: 8, lx: [-32, 32], y: [12, 40], speed: [7, 12], flap: 0.55, scale: [1.3, 2.2], sound: { name: 'birds', range: 75, every: 6 } });
      L.motes(S, { n: 60, lx: [-34, 34], y: [1, 30], color: '#e8c878', size: 0.5, drift: [0.6, 0.6, 0], sway: 2.5, opacity: 0.7 });
    }
  };
})();

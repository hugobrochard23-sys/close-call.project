/* v034c : STRUCTURES du mode CLASSIQUE — on ne vole plus dans un couloir à murs mais DANS le décor (ville, forêt, désert…).
 *
 * Principe (celui des meilleurs niveaux de vol : CITY, NIGHT FOREST de Dumbfire) : une TRAJECTOIRE ("lane", Track.laneX / laneY)
 * serpente, monte et descend ; autour d'elle, le volume est rempli de VRAIES structures posées au hasard. Chaque structure
 * n'est posée que si un « tube » de dégagement autour de la trajectoire reste libre (rayon 9 → 6 m selon le palier) : le
 * parcours est toujours faisable, jamais identique. Deux familles :
 *   GATES  (structures qui cadrent le passage : tunnel dans un immeuble, pont suspendu, arche, panneau géant, lignes à haute
 *          tension, portique laser, petit mur à casser, grue) — une toutes les 70 à 110 m, tirée au sort par décor
 *   SCATTER (décor qui remplit le volume, hors du tube : tours de toutes tailles, maisons, châteaux d'eau, antennes, silos,
 *          cheminées, conteneurs, mesas, flèches de roche, pins, troncs géants de forêt, rochers, troncs tombés…)
 * et des SURPRISES rares (spirale de matériaux, hangar-tunnel géant) qui donnent envie de relancer « pour voir ». */
(function () {
  const V = THREE.Vector3, U = CC.U, G = CC.Gen, DEG = 180 / Math.PI;
  const P = CC.Pieces = {};
  const CLEAR = [9.6, 8.2, 7.2, 6.3];    // rayon du tube de dégagement autour de la trajectoire, par palier

  // poids des structures posées dans le volume, par décor
  const SCATTER = {
    city:     { tower: 6, house: 1.6, tank: 0.6, billboard: 0.8, crane: 0.7, mast: 0.6, stepped: 2 },
    night:    { tower: 6, stepped: 2.5, billboard: 0.8, crane: 0.6, mast: 0.9 },
    forest:   { giant: 9, pine: 2.5, log: 1.2, rock: 1.2, bush: 2 },
    snow:     { pine: 9, rock: 1.6, cabin: 0.7, spire: 1.2 },
    desert:   { mesa: 3, spire: 3, derrick: 1.2, rock: 1.6, turbine: 1.1, ruin: 0.9 },
    industry: { silo: 2, stack: 2, hall: 3, containers: 3, crane: 1.1, tower: 0.7, tank: 1 },
    canyon:   { spire: 5, mesa: 2.5, rock: 2 },
  };
  // portes (structures qui cadrent le passage), par décor
  const GATES = {
    city:     { tunnel: 3, skybridge: 3, arch: 1.2, billboard: 2, pylons: 1.2, laser: 1.2, panel: 2.2, crane: 1.5 },
    night:    { tunnel: 3, skybridge: 3.5, billboard: 2, laser: 1.4, panel: 2, crane: 1.2 },
    forest:   { ruin: 2.5, pylons: 1, panel: 2, log: 2, arch: 1.5 },
    snow:     { arch: 2.5, pylons: 2, panel: 1.6, tunnel: 1 },
    desert:   { arch: 4, pylons: 1.6, panel: 1.6, tunnel: 1.4 },
    industry: { tunnel: 3, skybridge: 2.5, laser: 2, pylons: 1.4, panel: 2, crane: 2.2 },
    canyon:   { arch: 5, panel: 1.4, pylons: 1 },
  };
  const PAL = { billboard: ['#2a6a9a', '#c84a2a', '#3a8a5a', '#c89a20', '#7a3a9a', '#e8e0d0'] };

  /* Construit les structures d'un tronçon [d0, d1[. o = { stage, zone, ZONES, busy, reserved: [{d, lx, w, dd}], bridges: [d], env } */
  P.build = function (b, T, r, d0, d1, o) {
    const ZONES = o.ZONES, R = CLEAR[o.stage], cfg = CC.CONFIG.endless;
    const rects = o.reserved.slice();
    const vol = (d) => T.vol(d);
    const kc = CC.Scenery.kitCtx(r, o.env, o.zone);
    const nearBridge = (d, m) => (o.bridges || []).some((B) => Math.abs(B - d) < (m || 34));
    // la trajectoire traverse-t-elle la boîte (lx, largeur w, y0..y0+h, d ± dd/2) agrandie du rayon de dégagement ?
    const conflict = (dc, lx, w, dd, y0, h, pad) => {
      const Rr = R + (pad || 0);
      for (let d = dc - dd / 2 - Rr; d <= dc + dd / 2 + Rr; d += 5) {
        const ly = T.laneY(d);
        if (Math.abs(T.laneX(d) - lx) < w / 2 + Rr && ly > y0 - Rr && ly < y0 + h + Rr) return true;
      }
      return false;
    };
    const overlaps = (dc, lx, w, dd, m) => rects.some((q) => Math.abs(q.d - dc) < (q.dd + dd) / 2 + (m || 2) && Math.abs(q.lx - lx) < (q.w + w) / 2 + (m || 2));
    const fits = (dc, lx, w, dd, y0, h) => dc > d0 + 4 && dc < d1 - 4 && Math.abs(lx) + w / 2 < vol(dc) - 0.5 && !nearBridge(dc, 28) && !conflict(dc, lx, w, dd, y0, h) && !overlaps(dc, lx, w, dd);
    const yawD = (dc) => T.yawAcross(dc);
    // boîte dans le repère du couloir : dc (distance), lx (travers), yc (centre en hauteur), w (travers) × h × dd (le long)
    const bx = (dc, lx, yc, w, h, dd, mat, tint, collide, kind) => b.box({ p: T.at(dc, lx, yc), s: [w, h, dd], r: [0, yawD(dc), 0], mat, tint, collide: collide !== false, kind });
    const cyl = (dc, lx, y0, rad, h, mat, tint, seg, rTop, collide) => b.cylinder({ p: T.at(dc, lx, y0 + h / 2), rBot: rad, rTop: rTop === undefined ? rad : rTop, h, seg: seg || 8, mat, tint, collide: collide !== false, colSize: [rad * 1.7, h, rad * 1.7] });
    const add = (dc, lx, w, dd) => rects.push({ d: dc, lx, w, dd });
    const wall = () => ZONES[o.zone].wall(r);
    const dark = o.zone === 'night';
    const fogc = new THREE.Color(o.env.fog.color);

    // ------------------------------------------------------------------ structures de scatter
    const S = {};
    S.tower = (dc, lx) => {
      const w = r.between([9, 17]), dd = r.between([9, 17]), h = o.zone === 'night' ? r.between([34, 88]) : o.zone === 'industry' ? r.between([18, 40]) : r.between([24, 72]);
      if (!fits(dc, lx, w, dd, 0, h)) return false; add(dc, lx, w, dd);
      const wl = wall();
      bx(dc, lx, h / 2 - 0.5, w, h, dd, wl.mat, wl.tint);
      if (h > 38 && r() < 0.55) { const h2 = r.between([8, 18]), w2 = w * r.between([0.55, 0.75]); bx(dc, lx, h + h2 / 2 - 0.5, w2, h2, dd * 0.7, wl.mat, wl.tint); if (r() < 0.6) bx(dc, lx, h + h2 + 5, 0.5, 10, 0.5, 'col:#2a2a2e', undefined, false); }
      if (r() < 0.3) bx(dc, lx, h + 2.5, w * 0.8, 4.5, 0.4, 'col:' + r.pick(PAL.billboard), undefined, false);   // panneau sur le toit
      return true;
    };
    S.stepped = (dc, lx) => {     // immeuble en gradins (silhouette plus intéressante)
      const w = r.between([14, 22]), dd = r.between([14, 22]), h1 = r.between([14, 26]);
      if (!fits(dc, lx, w, dd, 0, h1 + 30)) return false; add(dc, lx, w, dd);
      const wl = wall(); let h = 0, ww = w;
      for (let i = 0; i < 3; i++) { const hh = i === 0 ? h1 : r.between([10, 18]); bx(dc, lx, h + hh / 2 - 0.5, ww, hh, dd * (ww / w), wl.mat, wl.tint); h += hh; ww *= 0.7; }
      return true;
    };
    S.house = (dc, lx) => {
      const w = r.between([8, 12]), dd = r.between([10, 16]), h = r.between([5, 12]);
      if (!fits(dc, lx, w, dd, 0, h + 4)) return false; add(dc, lx, w, dd);
      const p = T.at(dc, lx, 0), mats = [{ side: 'brick', top: 'concreteDark' }, { side: 'concreteWarm', top: 'concreteDark' }, { side: 'concrete', top: 'concreteDark' }];
      const it = { t: 'bld', x: p[0], z: p[2], y0: p[1], yaw: yawD(dc) / DEG, w, d: dd, h, mat: r.pick(mats), tint: r.pick(['#ffffff', '#f2d6c4', '#d8e4f0', '#e8e0b8']), roof: r() < 0.5 ? 'gable' : 'flat' };
      G.Kit.builders.bld(b, it, kc);
      b.box({ p: T.at(dc, lx, h / 2 - 0.5), s: [w, h + (it.roof === 'gable' ? w * 0.3 : 0), dd], r: [0, yawD(dc), 0], render: false });
      return true;
    };
    S.cabin = (dc, lx) => {
      const w = 7, dd = 9, h = 5;
      if (!fits(dc, lx, w, dd, 0, h + 4)) return false; add(dc, lx, w, dd);
      const p = T.at(dc, lx, 0), it = { t: 'bld', x: p[0], z: p[2], y0: p[1], yaw: yawD(dc) / DEG, w, d: dd, h, mat: { side: 'planks', top: 'roofBrown' }, tint: '#e8d8c0', roof: 'gable' };
      G.Kit.builders.bld(b, it, kc); b.box({ p: T.at(dc, lx, h / 2 + 1), s: [w, h + 3, dd], r: [0, yawD(dc), 0], render: false });
      return true;
    };
    S.tank = (dc, lx) => {        // château d'eau sur pieds
      const h = r.between([14, 26]), rad = r.between([3, 4.5]);
      if (!fits(dc, lx, rad * 2, rad * 2, 0, h + 8)) return false; add(dc, lx, rad * 2, rad * 2);
      for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(dc + c * rad * 0.6, lx + a * rad * 0.6, h / 2, 0.5, h, 0.5, 'col:#3a3028', undefined, false);
      b.box({ p: T.at(dc, lx, h / 2), s: [rad * 1.5, h, rad * 1.5], r: [0, yawD(dc), 0], render: false });
      cyl(dc, lx, h, rad, 6, 'planks', undefined, 12, rad, true); cyl(dc, lx, h + 6, rad * 1.05, 2, 'col:#4a3a30', undefined, 12, 0.2, false);
      return true;
    };
    S.mast = (dc, lx) => {
      const h = r.between([30, 60]);
      if (!fits(dc, lx, 3, 3, 0, h)) return false; add(dc, lx, 3, 3);
      bx(dc, lx, h / 2, 1.6, h, 1.6, 'col:#d8d8d4'); for (let k = 1; k <= 4; k++) bx(dc, lx, h * k / 5, 7 - k, 0.4, 0.4, 'col:#d84a2a', undefined, false);
      bx(dc, lx, h + 0.6, 0.8, 0.8, 0.8, 'basic:#ff2a1a', undefined, false);
      return true;
    };
    S.billboard = (dc, lx) => {
      const pw = r.between([14, 22]), ph = r.between([6, 9]), y0 = r.between([14, 26]);
      if (!fits(dc, lx, pw, 3, 0, y0 + ph)) return false; add(dc, lx, pw, 3);
      for (const s of [-1, 1]) bx(dc, lx + s * (pw / 2 - 1), (y0 + 1) / 2, 0.9, y0 + 1, 0.9, 'col:#3a3d42');
      bx(dc, lx, y0 + ph / 2, pw, ph, 1.0, 'col:' + r.pick(PAL.billboard)); bx(dc, lx, y0 + ph / 2, pw - 1.2, ph - 1.2, 1.15, dark ? 'emis:#' + r.pick(['ffe0a0', 'a8e0ff']) : 'col:#ffffff', undefined, false);
      return true;
    };
    S.crane = (dc, lx) => {       // grue à tour : mât, flèche, contrepoids, câble et charge
      const h = r.between([48, 66]), arm = r.between([30, 46]);
      const dir = lx > 0 ? -1 : 1, cx0 = lx + dir * arm * 0.85, ch0 = r.between([26, 40]);
      if (!fits(dc, lx, 5, 5, 0, h) || conflict(dc, cx0, 7, 7, ch0 - 2, 5)) return false; add(dc, lx, 5, 5);
      const col = 'col:#e0b020'; bx(dc, lx, h / 2, 2.4, h, 2.4, col);
      bx(dc, lx + dir * arm / 2, h + 1.5, arm, 1.6, 1.8, col); bx(dc, lx - dir * 8, h + 1.5, 10, 2.4, 3, 'col:#8a8a88');
      bx(dc, lx, h + 4.4, 1.8, 5, 1.8, col, undefined, false);
      const cx = cx0, ch = ch0;
      b.cable([...T.at(dc, cx, h + 0.7)], [...T.at(dc, cx, ch + 3)], 0.14, 'col:#1a1a1a');
      bx(dc, cx, ch, 5, 3, 3, 'corrugated', r.pick(['#b8382c', '#2a5a8a', '#c89a20']));
      return true;
    };
    S.silo = (dc, lx) => {
      const h = r.between([12, 26]), rad = r.between([3, 4.2]), n = 1 + Math.floor(r() * 3);
      if (!fits(dc, lx, rad * 2 * n + 1, rad * 2 + 1, 0, h + 2)) return false; add(dc, lx, rad * 2 * n + 1, rad * 2 + 1);
      for (let i = 0; i < n; i++) { cyl(dc, lx + (i - (n - 1) / 2) * rad * 2.05, 0, rad, h, 'metal', '#d8dce0', 12); cyl(dc, lx + (i - (n - 1) / 2) * rad * 2.05, h, rad * 1.02, 1.6, 'col:#7a7e84', undefined, 12, 0.3, false); }
      return true;
    };
    S.stack = (dc, lx) => {       // cheminées d'usine
      const n = 1 + Math.floor(r() * 3);
      if (!fits(dc, lx, 10 * n, 12, 0, 62)) return false; add(dc, lx, 10 * n, 12);
      bx(dc, lx, 4, 10 * n + 4, 8, 12, 'brick', '#c8b8a8');
      for (let i = 0; i < n; i++) { const h = r.between([36, 58]), x = lx + (i - (n - 1) / 2) * 10; cyl(dc, x, 8, 2.2, h, 'brick', '#d0c0b0', 10, 1.6); cyl(dc, x, 8 + h * 0.85, 2.3, 1.2, 'col:#b8382c', undefined, 10, 2.0, false); }
      return true;
    };
    S.hall = (dc, lx) => {
      const w = r.between([16, 26]), dd = r.between([18, 30]), h = r.between([10, 18]);
      if (!fits(dc, lx, w, dd, 0, h + 4)) return false; add(dc, lx, w, dd);
      const p = T.at(dc, lx, 0), it = { t: 'bld', x: p[0], z: p[2], y0: p[1], yaw: yawD(dc) / DEG, w, d: dd, h, mat: r.pick([{ side: 'corrugated', top: 'metal' }, { side: 'metal', top: 'concreteDark' }]), tint: r.pick(['#c8ccd0', '#b8a898', '#a8b4b8']), roof: 'saw' };
      G.Kit.builders.bld(b, it, kc); b.box({ p: T.at(dc, lx, h / 2 + 1), s: [w, h + 3, dd], r: [0, yawD(dc), 0], render: false });
      return true;
    };
    S.containers = (dc, lx) => {
      const n = 2 + Math.floor(r() * 4), cols = ['#b8382c', '#2a5a8a', '#c89a20', '#3a7a4a', '#8a8a90'];
      if (!fits(dc, lx, 14, 14, 0, n * 2.6)) return false; add(dc, lx, 14, 14);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const k = 1 + Math.floor(r() * n); for (let l = 0; l < k; l++) bx(dc + (j - 0.5) * 7, lx + (i - 0.5) * 6.4, 1.3 + l * 2.6, 6.05, 2.58, 2.44, 'corrugated', r.pick(cols)); }
      return true;
    };
    S.giant = (dc, lx) => {       // tronc géant de forêt : on vole ENTRE les troncs
      const h = r.between([36, 60]), rad = r.between([0.8, 1.7]);
      if (!fits(dc, lx, rad * 2.6, rad * 2.6, 0, h)) return false; add(dc, lx, rad * 2.6, rad * 2.6);
      cyl(dc, lx, -0.5, rad * 1.5, 3, 'bark', undefined, 7, rad, false);
      cyl(dc, lx, 0, rad, h, 'bark', r.pick(['#ffffff', '#e8e0d0', '#d8d0c0']), 7, rad * 0.75);
      const cc = r.pick(['#1f4a26', '#2a5a2c', '#24502e', '#3a5a26']), p = T.at(dc, lx, h * 0.8);
      for (let k = 0; k < 3; k++) { const g = new THREE.IcosahedronGeometry(r.between([6, 10]) * (1 - k * 0.15), 0); b.addGeometry(g, new V(p[0] + r.between([-3, 3]), p[1] + k * 4.5, p[2] + r.between([-3, 3])), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, 0)), new V(1, 0.7, 1), 'col:' + cc, '#' + new THREE.Color(1, 1, 1).multiplyScalar(r.between([0.75, 1])).getHexString()); g.dispose(); }
      if (r() < 0.3) bx(dc, lx + rad * 1.8, h * 0.45, 2.2, 0.35, 0.35, 'bark', undefined, false);   // grosse branche
      return true;
    };
    S.pine = (dc, lx) => {
      const h = r.between([16, 32]);
      if (!fits(dc, lx, 4, 4, 0, h)) return false; add(dc, lx, 4, 4);
      const p = T.at(dc, lx, 0); b.tree(p[0], p[2], h, r.between([0.45, 0.75]), p[1] - 0.0);
      return true;
    };
    S.rock = (dc, lx) => {
      const s = r.between([2.4, 6]);
      if (!fits(dc, lx, s * 1.6, s * 1.5, 0, s)) return false; add(dc, lx, s * 1.6, s * 1.5);
      const p = T.at(dc, lx, 0); b.rockLump(p[0], p[1], p[2], s, o.zone === 'desert' || o.zone === 'canyon' ? 'col:#b89468' : o.zone === 'snow' ? 'col:#9aa2ae' : 'col:#5b6472');
      return true;
    };
    S.log = (dc, lx) => {
      const len = r.between([8, 16]), rad = r.between([0.6, 1.0]);
      if (!fits(dc, lx, len, rad * 2.2, 0, rad * 2)) return false; add(dc, lx, len, rad * 2.2);
      b.cylinder({ p: T.at(dc, lx, rad), rad, h: len, seg: 7, mat: 'bark', r: [0, yawD(dc), 90], colSize: [rad * 2, len, rad * 2] });   // repère local du cylindre : l'axe est y (la boîte doit être couchée avec lui)
      return true;
    };
    S.bush = (dc, lx) => {
      const s = r.between([1.2, 2.4]); if (dc < d0 + 4 || dc > d1 - 4 || Math.abs(lx) > vol(dc) - 1 || conflict(dc, lx, s, s, 0, s * 1.4, -R * 0.6)) return false;
      const p = T.at(dc, lx, s * 0.4), g = new THREE.IcosahedronGeometry(s, 0); b.addGeometry(g, new V(p[0], p[1], p[2]), new THREE.Quaternion(), new V(1, 0.7, 1), 'col:' + r.pick(['#2a4a2c', '#3a5a2c', '#2a5232']), undefined); g.dispose();
      return true;
    };
    S.spire = (dc, lx) => {       // flèche de roche (désert, canyon, neige)
      const h = r.between([16, 50]), rad = r.between([3, 6.5]);
      if (!fits(dc, lx, rad * 2, rad * 2, 0, h)) return false; add(dc, lx, rad * 2, rad * 2);
      const snow = o.zone === 'snow', tint = snow ? '#d8e0ea' : o.zone === 'desert' ? '#e8c890' : r.pick(['#e89a6a', '#dc8a5a', '#f0a878']);
      cyl(dc, lx, -0.5, rad, h * 0.55, 'rock', tint, 8, rad * 0.75); cyl(dc, lx + r.between([-0.6, 0.6]), h * 0.5, rad * 0.78, h * 0.5, 'rock', tint, 8, rad * 0.3);
      return true;
    };
    S.mesa = (dc, lx) => {        // mesa à plateau, bas (on passe par-dessus) ou haut
      const w = r.between([14, 30]), dd = r.between([14, 30]), h = r.between([10, 34]);
      if (!fits(dc, lx, w, dd, 0, h)) return false; add(dc, lx, w, dd);
      const desert = o.zone === 'desert', tint = desert ? r.pick(['#e8c48a', '#dcb078', '#f0d09a']) : r.pick(['#e89a6a', '#dc8a5a']);
      bx(dc, lx, h / 2 - 0.5, w, h, dd, { side: 'rock', top: desert ? 'sand' : 'dirt' }, tint);
      if (r() < 0.6) bx(dc, lx + r.between([-2, 2]), h + 2, w * 0.55, 4, dd * 0.55, { side: 'rock', top: desert ? 'sand' : 'dirt' }, tint);
      return true;
    };
    S.derrick = (dc, lx) => {
      const h = r.between([16, 26]);
      if (!fits(dc, lx, 6, 6, 0, h + 2)) return false; add(dc, lx, 6, 6);
      for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(dc + c * 2, lx + a * 2, h / 2, 0.45, h, 0.45, 'col:#3a3a3e', undefined, false);
      b.box({ p: T.at(dc, lx, h / 2), s: [5, h, 5], r: [0, yawD(dc), 0], render: false });
      bx(dc, lx, h + 0.5, 5.4, 1, 5.4, 'col:#b8382c', undefined, false);
      return true;
    };
    S.turbine = (dc, lx) => {     // éolienne : mât collidable, pales décoratives
      const h = r.between([36, 50]);
      if (!fits(dc, lx, 4, 4, 0, h)) return false; add(dc, lx, 4, 4);
      cyl(dc, lx, 0, 1.3, h, 'col:#eceeee', undefined, 10, 0.7);
      for (let k = 0; k < 3; k++) { const a = k * 2.094 + r() * 6; const bl = bx(dc + 1.6, lx, h + Math.cos(a) * 8, 0.5, 15, 0.9, 'col:#f4f4f2', undefined, false); }
      return true;
    };
    S.ruin = (dc, lx) => {        // pans de murs en ruine
      const w = r.between([8, 14]), dd = r.between([8, 14]);
      if (!fits(dc, lx, w, dd, 0, 14)) return false; add(dc, lx, w, dd);
      const m = o.zone === 'desert' ? { side: 'sand', top: 'sand' } : { side: 'brick', top: 'concreteDark' };
      for (let k = 0; k < 3; k++) bx(dc + r.between([-dd / 3, dd / 3]), lx + r.between([-w / 3, w / 3]), r.between([3, 7]), r.between([3, 7]), r.between([6, 12]), 1.4, m, undefined);
      return true;
    };

    // ------------------------------------------------------------------ portes (structures qui cadrent le passage)
    const G2 = {};
    const laneAt = (dc) => ({ lx: T.laneX(dc), y: T.laneY(dc) });
    G2.tunnel = (dc) => {         // un immeuble percé d'un tunnel de la taille du passage
      const L = laneAt(dc), w = 34, dd = 30, hh = R * 1.3 + 2, hw = R * 0.85 + 1.5, yc = U.clamp(L.y, hh / 2 + 2, 30), H = Math.max(yc + hh / 2 + 10, 34);
      if (dc < d0 + 40 || dc > d1 - 40 || overlaps(dc, L.lx, w, dd, 6)) return false;
      const wl = wall(), mat = o.zone === 'industry' ? { side: 'corrugated', top: 'metal' } : wl.mat, tint = o.zone === 'industry' ? '#c8ccd0' : wl.tint;
      const lo = yc - hh / 2, hi = yc + hh / 2;
      bx(dc, L.lx - (hw + (w / 2 - hw) / 2), H / 2 - 0.5, w / 2 - hw, H, dd, mat, tint); bx(dc, L.lx + (hw + (w / 2 - hw) / 2), H / 2 - 0.5, w / 2 - hw, H, dd, mat, tint);
      if (lo > 0.5) bx(dc, L.lx, lo / 2 - 0.25, hw * 2 + 0.2, lo + 0.5, dd, mat, tint);
      bx(dc, L.lx, hi + (H - hi) / 2, hw * 2 + 0.2, H - hi, dd, mat, tint);
      bx(dc, L.lx, hi - 0.2, hw * 2, 0.3, dd - 2, 'emis:#' + (dark ? 'ffe0a0' : 'fff4d0'), undefined, false);   // bande lumineuse de plafond (sobre)
      bx(dc, L.lx, hi + 1, hw * 2 + 4, 0.8, dd + 0.4, 'hazard', undefined, false, undefined);
      add(dc, L.lx, w, dd); busy_push(dc); return true;
    };
    G2.skybridge = (dc) => {
      const L = laneAt(dc), gap = R * 2 + 4, tw = 13, yb = L.y + R + 2.2;
      if (yb + 5 > 46 || overlaps(dc, L.lx, gap + tw * 2, 14, 6) || dc < d0 + 40 || dc > d1 - 40) return false;
      const wl = wall(), H = yb + r.between([8, 22]);
      for (const s of [-1, 1]) bx(dc, L.lx + s * (gap / 2 + tw / 2), H / 2 - 0.5, tw, H, 13, wl.mat, wl.tint);
      bx(dc, L.lx, yb + 2, gap + 2, 4, 9, { side: 'metal', top: 'concreteDark', bottom: 'concreteDark' }, '#c8ccd0');
      bx(dc, L.lx, yb + 2.2, gap, 1.4, 9.3, dark ? 'emis:#d8d0a0' : 'glass', undefined, false);
      add(dc, L.lx, gap + tw * 2, 14); busy_push(dc); return true;
    };
    G2.arch = (dc) => {
      const L = laneAt(dc), gap = R * 2 + 3, yt = L.y + R + 3.5, rockZone = ['desert', 'canyon', 'snow', 'forest'].includes(o.zone);
      if (yt + 6 > 46 || overlaps(dc, L.lx, gap + 14, 10, 6) || dc < d0 + 40 || dc > d1 - 40) return false;
      const m = rockZone ? { side: 'rock', top: o.zone === 'snow' ? 'white' : o.zone === 'desert' ? 'sand' : 'dirt' } : { side: 'concreteDark', top: 'concrete' };
      const tint = o.zone === 'snow' ? '#d8e0ea' : o.zone === 'desert' ? '#e8c48a' : o.zone === 'canyon' ? '#e89a6a' : o.zone === 'forest' ? '#9a9a8a' : '#d8d4cc';
      for (const s of [-1, 1]) bx(dc, L.lx + s * (gap / 2 + 3.5), (yt + 2) / 2 - 0.5, 7, yt + 2, 8, m, tint);
      bx(dc, L.lx, yt + 3, gap + 14, 6, 9, m, tint);
      if (rockZone) for (let k = 0; k < 3; k++) bx(dc + r.between([-2, 2]), L.lx + r.between([-gap / 2, gap / 2]), yt + 6.5, r.between([4, 8]), 3, 5, m, tint);
      add(dc, L.lx, gap + 14, 10); busy_push(dc); return true;
    };
    G2.billboard = (dc) => {
      const L = laneAt(dc), gap = R * 2 + 6, yb = L.y + R + 2;
      if (yb + 10 > 46 || overlaps(dc, L.lx, gap + 6, 6, 6) || dc < d0 + 40 || dc > d1 - 40) return false;
      const hp = yb + 9;
      for (const s of [-1, 1]) bx(dc, L.lx + s * (gap / 2 + 1), hp / 2, 1.6, hp, 1.6, 'col:#3a3d42');
      bx(dc, L.lx, yb + 4.5, gap + 10, 9, 1.4, 'col:' + r.pick(PAL.billboard)); bx(dc, L.lx, yb + 4.5, gap + 8, 7.2, 1.6, dark ? 'emis:#ffe8b0' : 'col:#f4f2ea', undefined, false);
      add(dc, L.lx, gap + 10, 6); busy_push(dc); return true;
    };
    G2.pylons = (dc) => {         // lignes à haute tension : on passe au-dessous (ou très au-dessus)
      const L = laneAt(dc), gap = R * 2 + 14, top = L.y + R + 10;
      if (L.y > 24 || top + 4 > 46 || overlaps(dc, L.lx, gap + 8, 8, 6) || dc < d0 + 40 || dc > d1 - 40) return false;
      for (const s of [-1, 1]) { const x = L.lx + s * gap / 2; bx(dc, x, top / 2, 3, top, 3, 'col:#8a9098'); for (let k = 1; k <= 3; k++) bx(dc, x, top * k / 3.6, 9, 0.5, 0.5, 'col:#8a9098', undefined, false); }
      for (const hy of [top - 1, top - 4.2]) for (const dz of [-2.5, 2.5]) b.cable([...T.at(dc + dz, L.lx - gap / 2, hy)], [...T.at(dc + dz, L.lx + gap / 2, hy)], 0.28, 'col:#101010');
      bx(dc, L.lx, top - 1, 1.1, 1.1, 1.1, 'basic:#ff6a10', undefined, false);
      add(dc, L.lx, gap + 8, 8); busy_push(dc); return true;
    };
    G2.laser = (dc) => {
      const L = laneAt(dc), gap = R * 2 + 8, y1 = L.y + R * 0.95 + 1.2, y2 = L.y - R * 0.95 - 1.2;
      if (y1 > 44 || overlaps(dc, L.lx, gap + 4, 4, 6) || dc < d0 + 40 || dc > d1 - 40) return false;
      const H = y1 + 4; for (const s of [-1, 1]) bx(dc, L.lx + s * (gap / 2 + 1), H / 2, 1.4, H, 1.4, 'col:#40444a');
      for (const y of [y1, y2]) if (y > 1.5) b.laser([...T.at(dc, L.lx - gap / 2, y)], [...T.at(dc, L.lx + gap / 2, y)]);
      add(dc, L.lx, gap + 4, 4); busy_push(dc); return true;
    };
    G2.panel = (dc) => {          // petit mur à casser (12 × 10 m) sur la trajectoire : on le traverse pour des matériaux
      const L = laneAt(dc);
      if (overlaps(dc, L.lx, 14, 6, 4) || dc < d0 + 40 || dc > d1 - 40 || L.y < 7) return false;
      const M = { city: ['brick', 'brick'], night: ['concreteWarm', 'brick'], desert: ['sand', 'planks'], snow: ['white', 'planks'], industry: ['corrugated', 'planks'], canyon: ['rock', 'brick'], forest: ['planks', 'planks'] }[o.zone] || ['brick', 'brick'];
      const blocks = [], bw = 5, bh = 5, yaw = yawD(dc);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) blocks.push(T.at(dc, L.lx + (i - 1) * bw, L.y + (j - 0.5) * bh));
      b.smashWall({ blocks, size: [bw + 0.05, bh, 2.4], yaw, mat: M[0], shatter: M[1], reward: 5 });
      bx(dc, L.lx, L.y + bh + 0.6, bw * 3 + 1, 1.0, 2.8, 'hazard', undefined, false);
      for (const s of [-1, 1]) bx(dc, L.lx + s * (bw * 1.5 + 0.7), (L.y + bh) / 2, 1.0, L.y + bh, 1.0, 'col:#40444a', undefined, false);
      add(dc, L.lx, 18, 6); busy_push(dc); return true;
    };
    G2.crane = (dc) => { const L = laneAt(dc); return S.crane(dc, L.lx + (r() < 0.5 ? -1 : 1) * (R + 9)); };
    G2.log = (dc) => {            // tronc tombé en travers, très haut : on passe dessous, entre deux arbres géants
      const L = laneAt(dc), gap = R * 2 + 4, yb = L.y + R + 1.5;
      if (yb + 4 > 46 || overlaps(dc, L.lx, gap + 8, 6, 6) || dc < d0 + 40 || dc > d1 - 40) return false;
      const rad = 1.3; for (const s of [-1, 1]) { const x = L.lx + s * (gap / 2 + 2); cyl(dc, x, 0, rad, yb + 8, 'bark', undefined, 7, rad * 0.8); }
      b.cylinder({ p: T.at(dc, L.lx, yb + 1), rad: 1.0, h: gap + 8, seg: 7, mat: 'bark', r: [0, yawD(dc), 90], colSize: [2, gap + 8, 2] });
      add(dc, L.lx, gap + 8, 6); busy_push(dc); return true;
    };
    G2.ruin = (dc) => {           // portique de pierre moussue
      const L = laneAt(dc), gap = R * 2 + 3, yt = L.y + R + 3;
      if (yt + 5 > 46 || overlaps(dc, L.lx, gap + 12, 8, 6) || dc < d0 + 40 || dc > d1 - 40) return false;
      for (const s of [-1, 1]) { bx(dc, L.lx + s * (gap / 2 + 2.5), (yt + 1) / 2 - 0.5, 5, yt + 1, 5, { side: 'brick', top: 'concreteDark' }, '#8a9a82'); }
      bx(dc, L.lx, yt + 2, gap + 10, 4, 5.5, { side: 'brick', top: 'concreteDark' }, '#8a9a82');
      add(dc, L.lx, gap + 12, 8); busy_push(dc); return true;
    };
    const busy_push = (dc) => o.busy.push(dc);

    // ------------------------------------------------------------------ surprises rares
    const specials = () => {
      // hangar-tunnel géant (80 m) : un long passage intérieur, sobre et lumineux
      if (T.nextSpecial === undefined) T.nextSpecial = 2200 + r.between([0, 900]);
      while (T.nextSpecial < d1) {
        const dc = T.nextSpecial; T.nextSpecial += r.between([2600, 4200]);
        if (dc < d0 + 70 || dc > d1 - 70) continue;
        const L = laneAt(dc), L2 = laneAt(dc + 40);
        const w = 44, len = 80, hh = 22, yc = U.clamp(L.y, 14, 22);
        if (overlaps(dc, L.lx, w, len, 8)) continue;
        const wl = o.zone === 'industry' || o.zone === 'desert' ? { mat: { side: 'corrugated', top: 'metal' }, tint: '#c8ccd0' } : wall();
        // le tunnel est droit : on redresse la trajectoire dessus (sa position suit le centre de la trajectoire en dc)
        const lx = L.lx, H = 38, hw = 11;
        bx(dc, lx - (hw + 11), H / 2, 22, H, len, wl.mat, wl.tint); bx(dc, lx + (hw + 11), H / 2, 22, H, len, wl.mat, wl.tint);
        bx(dc, lx, yc + hh / 2 + (H - yc - hh / 2) / 2, hw * 2, H - yc - hh / 2, len, wl.mat, wl.tint);
        bx(dc, lx, (yc - hh / 2) / 2, hw * 2, yc - hh / 2, len, wl.mat, wl.tint);
        for (let k = -3; k <= 3; k++) bx(dc + k * 10, lx, yc + hh / 2 - 0.3, hw * 2 - 1, 0.35, 1.2, 'emis:#fff0c0', undefined, false);
        add(dc, lx, w + 22, len); o.busy.push(dc); o.special = { d: dc, lx, y: yc, len };
      }
    };

    // ------------------------------------------------------------------ exécution
    // 1. portes : une toutes les 70–110 m (elles se placent sur la trajectoire)
    if (T.nextGate === undefined) T.nextGate = 160;
    const GW = GATES[o.zone] || GATES.city;
    let guard = 0;
    while (T.nextGate < d1 && guard++ < 40) {
      const dc = T.nextGate;
      if (dc >= d0) {
        const name = r.weighted(GW), fn = G2[name];
        if (fn && fn(dc) !== false) T.nextGate = dc + r.between([cfg.gate[0], cfg.gate[1]]) * (o.stage >= 2 ? 0.9 : 1.05);
        else T.nextGate = dc + 12;
      } else T.nextGate = d0;
    }
    specials();
    // 2. scatter : le volume se remplit de structures ; les rectangles déjà pris et le tube de dégagement sont respectés
    const SW = SCATTER[o.zone] || SCATTER.city, dens = (cfg.density[o.zone] || cfg.density.city) * (1 + 0.15 * o.stage);
    const tries = Math.round(cfg.chunkLen * 2 * dens);
    for (let i = 0; i < tries; i++) {
      const dc = r.between([d0 + 4, d1 - 4]), lx = r.between([-1, 1]) * (vol(dc) - 2);
      const fn = S[r.weighted(SW)]; if (fn) fn(dc, lx);
    }
    return rects;
  };

  // décor de fond : rangées de silhouettes lointaines au-delà des limites du volume (sans collision)
  P.far = function (b, T, r, d0, d1, o) {
    const fogc = new THREE.Color(o.env.fog.color).multiplyScalar(0.9);
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      const dc = r.between([d0, d1]), off = T.vol(dc) + r.between([30, 170]), w = r.between([20, 60]), h = o.zone === 'city' || o.zone === 'night' ? r.between([50, 190]) : r.between([25, 120]);
      b.box({ p: T.at(dc, side * off, h / 2 - 0.5), s: [w, h, r.between([20, 50])], r: [0, T.yawAcross(dc), 0], mat: 'basic:#' + fogc.clone().multiplyScalar(r.between([0.85, 1.05])).getHexString(), collide: false, shadow: false });
    }
  };
})();

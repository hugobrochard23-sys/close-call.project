/* v035 : zones PORT et BASE EN ALTITUDE.
 *
 * PORT — un quai de 34 m de large entre deux plans d'eau (la colonne vertébrale), bollards, candélabres, rails de grue.
 *   Scènes : conteneurs (piles colorées, grues à portique) · navire (cargo amarré, pont, cheminée) · entrepôts (halls + wagons) · lac ouvert
 *   (respiration : îlots, phare, voiliers, bouées) · pont routier suspendu · SIGNATURE : le pont levant, dont le tablier relevé forme une fenêtre.
 * BASE EN ALTITUDE — un plateau de roche à +170 m au-dessus d'une mer de nuages ; on y monte par une falaise, anneaux de montée.
 *   Piste au centre ; au-delà du plateau, le vide (plus de plafond : on peut monter très haut, ou plonger sous le plateau).
 *   Scènes : piste (avions parqués, hangars, tour de contrôle) · radars · silos de lancement · portiques · hangar traversant · ciel (respiration :
 *   nuages, îlots flottants, ballons) · SIGNATURE : le cargo géant, dont la soute est un tunnel de 100 m. */
(function () {
  const U = CC.U, G = CC.Gen, Z = CC.Zones, DEG = 180 / Math.PI;
  const COL = ['#b8382c', '#2a5a8a', '#c89a20', '#3a7a4a', '#8a8a90', '#d8d8d4', '#7a3a9a', '#d87a20'];

  // ============================================================== PORT
  function quay(S) {
    const q = 17;
    // bollards, candélabres, rail de grue (deux files jaunes), marquages, cordages d'amarrage : la colonne vertébrale du port
    for (const s of [-1, 1]) {
      S.rows(S.d0, S.d1, 14, 0, (dc) => S.item(dc, () => S.cyl(dc, s * (q - 0.8), 0, 0.42, 0.9, 'col:#2a2c30', undefined, 8, 0.34, false)));
      S.rows(S.d0, S.d1, 42, 0.05, (dc) => S.item(dc, () => { S.cyl(dc, s * (q - 2), 0, 0.28, 13, 'col:#3a3d42', undefined, 6, 0.2); S.bx(dc, s * (q - 3.4), 13, 2.8, 0.3, 0.4, 'col:#3a3d42', undefined, false); S.bx(dc, s * (q - 4.6), 12.8, 1.2, 0.3, 0.7, S.dark ? 'emis:#ffe8b0' : 'col:#dcdcd4', undefined, false); }));
      S.rows(S.d0, S.d1, 8, 0, (dc) => S.bx(dc, s * 5.5, 0.07, 0.35, 0.06, 4, 'col:#e8c020', undefined, false, { shadow: false }));
    }
    S.rows(S.d0, S.d1, 11, 0, (dc) => S.bx(dc, 0, 0.07, 0.3, 0.06, 5, 'col:#e8e2c8', undefined, false, { shadow: false }));
    for (const s of [-1, 1]) for (const dx of [-1.2, 1.2]) S.rows(S.d0, S.d1, 10.4, 0, (dc) => S.bx(dc, s * 7 + dx, 0.12, 0.22, 0.14, 10.5, 'metal', '#8a8e94', false, { shadow: false }));
  }
  function farPort(S, n) {       // rive lointaine : entrepôts bas, grues, collines dans la brume
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const dc = S.d0 + S.sr() * S.len, off = S.sr.between([55, 140]), w = S.sr.between([24, 60]), h = S.sr.between([10, 60]);
      S.item(dc, () => S.bx(dc, s * (S.vol(dc) + off), h / 2 - 1, w, h, S.sr.between([20, 50]), S.sr() < 0.5 ? 'corrugated' : 'concrete', S.sr.pick(['#b8c0c8', '#c8c4b8', '#a8b0b8']), false));
    }
  }
  function yardSlab(S, y) { for (const s of [-1, 1]) S.rows(S.d0, S.d1, 20, 0, (dc) => S.bx(dc + 0, s * 33, y - 0.35, 32, 1.4, 20.6, 'concrete', '#c0c0bc', true, { shadow: false })); }
  function gantryCrane(S, dc, hgt) {           // grue à portique : deux pieds, poutre haute, flèche sur l'eau, cabine
    S.item(dc, (r) => {
      const col = 'col:' + r.pick(['#e0b020', '#d8d8d4', '#3a7aa8']), w = 21;
      for (const s of [-1, 1]) for (const k of [-1, 1]) { S.bx(dc + k * 6, s * w, hgt / 2, 1.8, hgt, 1.8, col); }
      for (const s of [-1, 1]) S.bx(dc, s * w, hgt * 0.45, 1.4, 1.4, 14, col, undefined, false);
      S.bx(dc, 0, hgt + 1.5, 2 * w + 4, 3, 16, col);
      S.bx(dc, (r() < 0.5 ? -1 : 1) * 46, hgt + 2.5, 54, 1.6, 2.4, col, undefined, false);
      S.bx(dc, 0, hgt - 1.5, 5, 4, 5, 'col:#c8ccd0', undefined, false); S.bx(dc, 0, hgt - 12, 0.12, 20, 0.12, 'col:#1a1a1a', undefined, false);
      S.bx(dc, 0, hgt - 23, 6.2, 2.6, 2.5, 'corrugated', r.pick(COL), false);
    });
  }
  function containerStack(S, dc, lx, n, col, r) {
    const p = S.at(dc, lx, 0);
    for (let k = 0; k < n; k++) S.bx(dc, lx, 1.3 + k * 2.6, 2.45, 2.58, 6.1, 'corrugated', col);
  }

  const port = { signature: 'levant', scenes: {} };
  Z.defs.port = port;
  port.scenes.conteneurs = { len: [220, 300], build(S) {
    const sr = S.sr; quay(S); yardSlab(S, 0);
    for (const s of [-1, 1]) {
      // blocs de conteneurs : colonnes de 6 m, hauteur 1 à 5, allées entre les blocs
      S.rows(S.d0, S.d1, 30, 0.1, (dc) => S.item(dc, (r) => {
        const cols = r.pick([[0, 1, 2], [0, 1], [1, 2]]);
        for (const c of cols) for (let k = 0; k < 4; k++) { const n = 1 + Math.floor(r() * 5), col = r.pick(COL); S.bx(dc + (k - 1.5) * 6.5, s * (24 + c * 2.7), 0, 2.45, 0.01, 6.1, 'col:#000000', undefined, false); for (let l = 0; l < n; l++) S.bx(dc + (k - 1.5) * 6.5, s * (24 + c * 2.7), 1.3 + l * 2.6, 2.45, 2.58, 6.1, 'corrugated', col); }
      }));
      S.rows(S.d0 + 10, S.d1, 26, 0.2, (dc) => S.item(dc, (r) => { const p = S.at(dc, s * r.between([8, 12]), 0); if (r() < 0.6) S.kit('truckDecor', r, { t: 'truckDecor', x: p[0], z: p[2], y0: p[1], yaw: S.yaw(dc) / DEG + (r() < 0.5 ? 0 : Math.PI) }); }));
    }
    for (let i = 0; i < 3; i++) gantryCrane(S, S.d0 + S.len * (0.2 + i * 0.3), 44);
    farPort(S, 5);
  } };
  port.scenes.navire = { len: [230, 300], build(S) {
    const sr = S.sr, s = sr() < 0.5 ? -1 : 1; quay(S);
    const c = S.mid, L = Math.min(170, S.len - 30), w = 26, lx = s * (17 + w / 2 + 1.5);
    S.item(c, (r) => {
      // coque (accostée au quai), pont de chargement, conteneurs, château, cheminée, mât
      S.bx(c, lx, 4.5, w, 15, L, 'concreteDark', '#3a4a6a');                              // coque bleu nuit
      S.bx(c, lx, 11.8, w + 0.4, 1.2, L + 0.4, 'col:#b8382c', undefined, false);             // liseré de flottaison rouge
      S.bx(c, lx, 13, w - 1, 1.6, L - 2, 'metal', '#8a9098');                                // pont
      for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) S.bx(c + i * 13.5 - 12, lx + j * 2.7, 15.4 + k * 2.6, 2.5, 2.58, 6.1, 'corrugated', r.pick(COL)); }
      S.bx(c + L / 2 - 14, lx, 24, w - 4, 20, 16, 'metal', '#e8e8e4');                     // château
      S.bx(c + L / 2 - 14, lx, 30.2, w - 3.6, 1.6, 15.6, 'emis:#9ab4c4', undefined, false, { shadow: false });
      S.bx(c + L / 2 - 14, lx, 35.4, w - 6, 4, 10, 'metal', '#e8e8e4');
      S.cyl(c + L / 2 - 20, lx, 33, 2.6, 8, 'col:#b8382c', undefined, 12, 2.3);
      S.bx(c - L / 2 + 20, lx, 30, 0.4, 30, 0.4, 'col:#2a2a2e', undefined, false);
    });
    S.reserve(c, lx, w + 2, L);
    // côté libre : petits bateaux et bouées sur l'eau
    S.rows(S.d0 + 10, S.d1, 34, 0.4, (dc) => S.item(dc, (r) => { const x = -s * r.between([24, 42]), hull = r.pick(['#e8e8e4', '#2a5a8a', '#b8382c']);
      S.bx(dc, x, -0.5, 3.4, 1.6, 9, 'col:' + hull); S.bx(dc, x, 1.2, 2.4, 1.6, 3.6, 'col:#f4f4ee', undefined, false); S.bx(dc, x, 2.4, 0.2, 3, 0.2, 'col:#2a2a2e', undefined, false); }));
    S.rows(S.d0 + 5, S.d1, 22, 0.5, (dc) => S.item(dc, (r) => S.ball(dc, -s * r.between([20, 46]), -2, 0.9, 'col:' + r.pick(['#d83a2a', '#e8e8e4']), undefined, false)));
    farPort(S, 4);
  } };
  port.scenes.entrepots = { len: [200, 280], build(S) {
    const sr = S.sr; quay(S); yardSlab(S, 0);
    for (const s of [-1, 1]) {
      let dc = S.d0 + 8;
      while (dc < S.d1 - 10) {
        const dd = sr.between([30, 48]), cx = dc + dd / 2, h = sr.between([9, 16]), set = sr.between([0, 3]), tint = sr.pick(['#c8ccd0', '#b8a898', '#a8b4b8', '#d8d0c0']), kind = sr();
        S.item(cx, (r) => {
          const p = S.at(cx, s * (25 + set + 11), 0), it = { t: 'bld', x: p[0], z: p[2], y0: p[1], yaw: S.yaw(cx) / DEG, w: 22, d: dd - 4, h, mat: r.pick([{ side: 'corrugated', top: 'metal' }, { side: 'metal', top: 'concreteDark' }]), tint, roof: kind < 0.6 ? 'saw' : 'flat' };
          S.kit('bld', r, it); S.b.box({ p: S.at(cx, s * (36 + set), h / 2 - 0.5), s: [22, h + 3, dd - 4], r: [0, S.yaw(cx), 0], render: false });
          for (let k = -1; k <= 1; k++) S.bx(cx + k * 10, s * (25 + set - 0.1), 2.6, 0.3, 5, 6, 'col:#2a2a2e', undefined, false);          // portes de quai
        });
        dc += dd + sr.between([6, 14]);
      }
      // wagons de marchandises sur les rails du quai
      S.rows(S.d0 + 10, S.d1, 30, 0.2, (dc) => S.item(dc, (r) => { for (let k = 0; k < 2; k++) { S.bx(dc + k * 13.4, s * 13, 2.2, 3, 3, 12.6, 'corrugated', r.pick(COL)); S.bx(dc + k * 13.4, s * 13, 0.7, 2.4, 0.5, 11.6, 'col:#2a2a2e', undefined, false); } }));
    }
    farPort(S, 5);
  } };
  port.scenes.lac = { len: [200, 260], build(S) {
    const sr = S.sr; quay(S);
    // respiration : plan d'eau ouvert, îlots rocheux avec pins, phare, voiliers, bouées, collines au loin
    for (let i = 0; i < 6; i++) {
      const dc = S.d0 + 15 + sr() * (S.len - 30), lx = (sr() < 0.5 ? -1 : 1) * sr.between([26, 44]), rad = sr.between([5, 10]);
      S.place(dc, lx, rad * 2, rad * 2, -3, 14, (r) => {
        S.bx(dc, lx, -0.6, rad * 1.8, 3, rad * 1.6, 'rock', '#9a9a94');
        S.bx(dc, lx, 1.2, rad * 1.2, 2.4, rad, 'rock', '#8a8e84');
        for (let k = 0; k < 2 + Math.floor(r() * 3); k++) { const p = S.at(dc + r.between([-rad / 2, rad / 2]), lx + r.between([-rad / 2, rad / 2]), 2.4); S.b.tree(p[0], p[2], r.between([9, 15]), 0.4, p[1]); }
      }, { vol: 52 });
    }
    // phare
    const pc = S.mid + S.sr.between([-30, 30]), ps = sr() < 0.5 ? -1 : 1, px = ps * 40;
    S.place(pc, px, 12, 12, -3, 40, (r) => {
      S.bx(pc, px, -0.4, 13, 3, 12, 'rock', '#9a9a94');
      for (let k = 0; k < 4; k++) S.cyl(pc, px, 1 + k * 7, 2.8 - k * 0.3, 7, 'col:' + (k % 2 ? '#c8382c' : '#f0f0ea'), undefined, 12, 2.5 - k * 0.3);
      S.cyl(pc, px, 29, 3, 0.8, 'col:#2a2a2e', undefined, 12, 3, false); S.cyl(pc, px, 29.8, 1.6, 3, 'basic:#fff4c0', undefined, 10, 1.6, false); S.cyl(pc, px, 32.8, 2.2, 1.4, 'col:#c8382c', undefined, 10, 0.2, false);
    }, { vol: 52 });
    S.rows(S.d0 + 10, S.d1, 26, 0.5, (dc) => S.item(dc, (r) => { const x = (r() < 0.5 ? -1 : 1) * r.between([22, 46]); S.bx(dc, x, -0.5, 2.6, 1.4, 6.5, 'col:#f4f4ee'); S.bx(dc, x, 3.6, 0.15, 7, 0.15, 'col:#2a2a2e', undefined, false); S.bx(dc, x + 0.2, 4, 0.12, 6, 4, 'col:#f4f4ee', undefined, false, { r: [0, S.yaw(dc), 0] }); }));
    S.rows(S.d0 + 5, S.d1, 24, 0.5, (dc) => S.item(dc, (r) => S.ball(dc, (r() < 0.5 ? -1 : 1) * r.between([20, 46]), -2, 0.9, 'col:' + r.pick(['#d83a2a', '#e8e8e4', '#e0b020']), undefined, false)));
    // collines lointaines sur les deux rives
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const dc = S.d0 + S.sr() * S.len, w = S.sr.between([60, 140]), h = S.sr.between([30, 90]); S.item(dc, () => S.bx(dc, s * (S.vol(dc) + S.sr.between([80, 160])), h / 2 - 1, w, h, S.sr.between([50, 120]), 'basic:#' + new THREE.Color(S.env.fog.color).multiplyScalar(0.92).getHexString(), undefined, false)); }
  } };
  port.scenes.pont = { len: [200, 260], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -6, 6), y: U.clamp(T.laneY0(mid), 14, 26), from: (sc.d1 - sc.d0) / 2 - 40, to: (sc.d1 - sc.d0) / 2 + 40 }; },
    build(S) {
      const sr = S.sr; quay(S); yardSlab(S, 0);
      const c = S.mid, L = S.lane(c), tw = 34, deckY = U.clamp(L.y + S.R + 6, 26, 40), th = deckY + 38;
      // pont suspendu : deux pylônes, tablier, câbles en arc (décor) ; on passe sous le tablier, entre les pylônes
      S.item(c, (r) => {
        for (const s of [-1, 1]) { S.bx(c, s * tw, th / 2, 4, th, 4, 'concrete', '#c8c8c4'); S.bx(c, s * tw, th - 4, 6, 3, 14, 'concrete', '#c8c8c4'); S.bx(c, s * tw, deckY / 2, 6, deckY, 8, 'concreteDark', '#a8a8a4'); }
        S.bx(c, 0, deckY + 1.2, 2 * tw + 50, 2.4, 14, { side: 'concreteDark', top: 'asphalt', bottom: 'concreteDark' }, '#c8c8c8');
        for (const s of [-1, 1]) S.bx(c, 0, deckY + 3.2, 2 * tw + 50, 1.6, 0.4, 'col:#8a9098', undefined, false);
        // câbles principaux : chaîne de segments (parabole), et suspentes
        let prev = null;
        for (let i = 0; i <= 16; i++) {
          const u = -1 + i * 2 / 16, x = u * (tw + 22), ax = Math.abs(x);
          const yy = ax <= tw ? deckY + 6 + (th - 3 - deckY - 6) * (ax / tw) * (ax / tw) : th - 3 - (ax - tw) / 22 * (th - 3 - deckY - 4);
          for (const dz of [-6.6, 6.6]) {
            if (prev) S.bxr(c + dz, (x + prev.x) / 2, (yy + prev.y) / 2, Math.hypot(x - prev.x, yy - prev.y) + 0.6, 0.35, 0.35, 'col:#b8382c', undefined, Math.atan2(yy - prev.y, x - prev.x) * DEG, 0, false);
            if (i % 2 === 0) S.bx(c + dz, x, (yy + deckY + 3) / 2, 0.12, yy - deckY - 3, 0.12, 'col:#8a9098', undefined, false);
          }
          prev = { x, y: yy };
        }
      });
      S.reserve(c, 0, 2 * tw + 10, 16);
    } };
  port.scenes.levant = { len: [230, 290], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -5, 5), y: 24, from: (sc.d1 - sc.d0) / 2 - 50, to: (sc.d1 - sc.d0) / 2 + 50 }; },
    build(S) {
      const sr = S.sr; quay(S); yardSlab(S, 0);
      const c = S.mid, L = S.lane(c), tw = 30;
      // pont levant : deux tours à contrepoids, le tablier est RELEVE et forme une fenêtre au-dessus du quai ; feux d'avertissement
      S.item(c, (r) => {
        for (const s of [-1, 1]) {
          S.bx(c, s * tw, 34, 7, 68, 9, 'metal', '#c8ccd0'); S.bx(c, s * tw, 34, 7.4, 1.0, 9.4, 'hazard', undefined, false);
          S.bx(c, s * (tw + 5.6), 40, 4, 12, 8, 'concrete', '#a8a8a4');                      // contrepoids
          S.bx(c, s * tw, 69, 9, 2, 11, 'metal', '#b0b4b8');
          S.bx(c, s * tw, 71, 1.4, 1.4, 1.4, 'emis:#d83a2a', undefined, false);
          for (let y = 12; y < 64; y += 10) S.bx(c, s * (tw - 3.6), y, 0.4, 0.4, 8.6, 'col:#6a6e74', undefined, false);
        }
        S.bx(c, 0, 69, 2 * tw, 2.4, 7, 'metal', '#b8bcc0');                                       // traverse haute
        S.bx(c, 0, 52, 2 * tw - 2, 3.4, 13, { side: 'concreteDark', top: 'asphalt', bottom: 'concreteDark' }, '#c0c0c0');   // tablier relevé
        for (const s of [-1, 1]) S.bx(c, s * (tw - 2), 57, 0.3, 6, 12, 'col:#b8382c', undefined, false);
        for (const s of [-1, 1]) for (const dz of [-6.2, 6.2]) S.bx(c + dz, s * (tw * 0.5), 60, 0.25, 18, 0.25, 'col:#8a9098', undefined, false, { r: [0, S.yaw(c), s * 28] });
        // chaussée qui s'arrête au bord du quai (les deux culées), barrières rouge et blanc
        for (const s of [-1, 1]) for (let k = 0; k < 5; k++) S.bx(c + (k - 2) * 2.6, s * 22, 0.8, 0.4, 1.6, 0.4, 'col:' + (k % 2 ? '#e8e8e4' : '#d83a2a'), undefined, false);
      });
      S.reserve(c, 0, 2 * tw + 14, 16); S.gate(c, L.lx, 24);
      farPort(S, 3);
    } };

  // ============================================================== BASE EN ALTITUDE
  function cloudPuffs(S, n, yLo, yHi, sideMin, sideMax) {
    for (let i = 0; i < n; i++) {
      const dc = S.d0 + S.sr() * S.len, s = S.sr() < 0.5 ? -1 : 1, lx = s * S.sr.between([sideMin, sideMax]), y = S.sr.between([yLo, yHi]), sc = S.sr.between([12, 34]);
      S.item(dc, (r) => { for (let k = 0; k < 4; k++) { const p = S.at(dc + r.between([-sc, sc]), lx + r.between([-sc, sc]), y + r.between([-sc * 0.15, sc * 0.3])); const g = new THREE.IcosahedronGeometry(sc * r.between([0.5, 0.9]), 1); S.b.addGeometry(g, new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion(), new THREE.Vector3(1.4, 0.55, 1.1), 'basic:#' + new THREE.Color('#f6f8fc').multiplyScalar(r.between([0.92, 1])).getHexString(), undefined); g.dispose(); } });
    }
  }
  function runway(S) {
    // la piste : bande sombre, axe en tirets, rives, seuils ; feux de bord sobres
    for (let dc = S.d0; dc < S.d1; dc += 20) S.item(dc + 10, () => { S.bx(dc + 10, 0, 0.05, 30, 0.16, 20.6, 'asphalt', '#8a8e96', false, { shadow: false }); S.bx(dc + 10, 0, 0.16, 0.9, 0.05, 9, 'col:#f4f4f0', undefined, false, { shadow: false }); for (const s of [-1, 1]) S.bx(dc + 10, s * 14.6, 0.16, 0.5, 0.05, 20.6, 'col:#f4f4f0', undefined, false, { shadow: false }); });
    for (const s of [-1, 1]) S.rows(S.d0, S.d1, 18, 0, (dc) => S.item(dc, () => S.bx(dc, s * 16.5, 0.3, 0.45, 0.4, 0.45, 'basic:#fff8d8', undefined, false, { shadow: false })));
    // rebord du plateau : glissière et balises rouges
    for (const s of [-1, 1]) { S.rows(S.d0, S.d1, 20, 0, (dc) => S.item(dc, () => S.bx(dc, s * 49.4, 0.6, 0.5, 1.2, 20.5, 'col:#8a9098', undefined, false))); S.rows(S.d0, S.d1, 60, 0, (dc) => S.item(dc, () => S.bx(dc, s * 49.4, 4, 0.3, 6, 0.3, 'col:#d83a2a', undefined, false))); }
  }
  function jet(S, dc, lx, r, yaw) {             // avion de chasse parqué : fuselage, ailes delta, dérive, verrière
    const col = r.pick(['#8a929c', '#7a8490', '#a0a8b0']);
    S.bx(dc, lx, 2.4, 2.4, 2.2, 15, 'metal', col); S.bx(dc, lx, 3.7, 1.4, 1.0, 4, 'glass', undefined, false);
    S.bx(dc + 1.5, lx, 2.0, 13, 0.4, 7, 'metal', col, false); S.bx(dc + 6.5, lx, 4.6, 0.3, 3.4, 3.2, 'metal', col, false);
    S.bx(dc - 7.8, lx, 2.4, 1.4, 1.4, 1.2, 'basic:#2a2a2e', undefined, false);
  }
  const sky = { signature: 'cargo', scenes: {}, dress(S) { S.noclouds = false; } };
  Z.defs.sky = sky;
  sky.scenes.piste = { len: [230, 300], build(S) {
    const sr = S.sr; runway(S); cloudPuffs(S, 7, -110, -30, 30, 110); cloudPuffs(S, 3, 60, 110, 40, 120);
    for (const s of [-1, 1]) {
      // avions parqués devant les hangars, camions-citernes, balisage
      S.rows(S.d0 + 10, S.d1 - 10, 40, 0.15, (dc) => S.item(dc, (r) => { if (r() < 0.75) jet(S, dc, s * r.between([24, 30]), r); else { const p = S.at(dc, s * r.between([22, 28]), 0); S.kit('truckDecor', r, { t: 'truckDecor', x: p[0], z: p[2], y0: p[1], yaw: S.yaw(dc) / DEG, mil: true }); } }));
    }
    // hangars alignés et tour de contrôle
    const side = sr() < 0.5 ? -1 : 1;
    let dc = S.d0 + 10;
    while (dc < S.d1 - 40) { const dd = sr.between([34, 50]), cx = dc + dd / 2; S.item(cx, (r) => { const h = r.between([12, 18]), w = 22;
      S.bx(cx, side * 42, h / 2 - 0.5, w, h, dd - 4, { side: 'corrugated', top: 'metal' }, r.pick(['#c8ccd0', '#b8c0c8', '#d0d4d8']));
      S.bx(cx, side * 42, h + 1.2, w + 1, 2.4, dd - 3, 'metal', '#9aa2aa', false); S.bx(cx, side * (42 - w / 2 - 0.1), h * 0.4, 0.3, h * 0.8, dd * 0.7, 'col:#2a2e34', undefined, false); }); dc += dd + sr.between([8, 18]); }
    const tc = S.d0 + S.len * sr.between([0.3, 0.7]);
    S.place(tc, -side * 38, 10, 10, 0, 44, (r) => { S.bx(tc, -side * 38, 14, 6, 28, 6, 'concrete', '#d8dce0'); S.bx(tc, -side * 38, 30, 13, 5, 13, 'glass', undefined, false); S.bx(tc, -side * 38, 33, 14, 1.6, 14, 'metal', '#b8bcc4'); S.cyl(tc, -side * 38, 34, 0.15, 9, 'col:#2a2a2e', undefined, 5, 0.15, false); S.bx(tc, -side * 38, 44, 4, 0.4, 0.4, 'col:#2a2a2e', undefined, false); }, { vol: 70 });
  } };
  sky.scenes.radars = { len: [200, 270], build(S) {
    const sr = S.sr; runway(S); cloudPuffs(S, 7, -110, -30, 30, 110); cloudPuffs(S, 4, 70, 120, 40, 120);
    for (let i = 0; i < 11; i++) {
      const dc = S.d0 + 12 + sr() * (S.len - 24), s = sr() < 0.5 ? -1 : 1, lx = s * sr.between([22, 46]), h = sr.between([12, 34]), rad = sr.between([5, 11]);
      S.place(dc, lx, rad * 2.2, rad * 2.2, 0, h + rad, (r) => {      // antenne parabolique : pylône, cuvette inclinée, feu
        S.cyl(dc, lx, 0, 1.4, h, 'metal', '#c8ccd0', 8, 0.9);
        const p = S.at(dc, lx, h + rad * 0.6), g = new THREE.SphereGeometry(rad, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
        S.b.addGeometry(g, new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.6, r.between([0, 6]), 0)), null, 'metal', '#e8ecf0'); g.dispose();
        S.b.box({ p: S.at(dc, lx, h + rad * 0.7), s: [rad * 1.1, rad * 0.9, rad * 1.1], render: false });
        S.bx(dc, lx, h + rad * 1.4 + 1, 0.2, 2, 0.2, 'col:#2a2a2e', undefined, false);
      });
    }
    for (let i = 0; i < 5; i++) { const dc = S.d0 + 12 + sr() * (S.len - 24), s = sr() < 0.5 ? -1 : 1, lx = s * sr.between([24, 44]), h = sr.between([30, 62]); S.place(dc, lx, 3, 3, 0, h, () => { S.bx(dc, lx, h / 2, 1.5, h, 1.5, 'col:#d8d8d4'); for (let k = 1; k <= 4; k++) S.bx(dc, lx, h * k / 5, 7 - k, 0.4, 0.4, 'col:#d84a2a', undefined, false); S.bx(dc, lx, h + 0.6, 0.8, 0.8, 0.8, 'basic:#ff2a1a', undefined, false); }); }
  } };
  sky.scenes.silos = { len: [200, 260], build(S) {
    const sr = S.sr; runway(S); cloudPuffs(S, 7, -110, -30, 30, 110); cloudPuffs(S, 3, 70, 120, 40, 120);
    // rampes de lancement : tour de service et missile debout (les panaches de vapeur sont des nuages sobres)
    for (const s of [-1, 1]) S.rows(S.d0 + 15, S.d1 - 10, 34, 0.12, (dc) => S.item(dc, (r) => {
      const lx = s * r.between([24, 34]), h = r.between([26, 44]);
      for (const a of [-1, 1]) for (const c of [-1, 1]) S.bx(dc + c * 3.2, lx + a * 3.2, h / 2, 0.8, h, 0.8, 'col:#d8a020');
      for (let y = 6; y < h; y += 7) { S.bx(dc, lx, y, 7.4, 0.5, 7.4, 'col:#d8a020', undefined, false); }
      S.cyl(dc, lx - s * 0 + 0.0, 0, 1.3, h + 10, 'col:#eceff2', undefined, 10, 0.9); S.cyl(dc, lx, h + 8, 1.3, 4, 'col:#c8382c', undefined, 10, 0.05, false);
      S.bx(dc, lx + s * 5.4, h * 0.45, 0.4, h * 0.9, 1.2, 'col:#6a6e74', undefined, false);
    }));
    // silos enterrés (dalles rondes ouvertes) le long de la piste
    S.rows(S.d0 + 10, S.d1, 22, 0.3, (dc) => S.item(dc, (r) => { const lx = (r() < 0.5 ? -1 : 1) * r.between([19, 22]); S.cyl(dc, lx, 0, 2.6, 0.4, 'col:#2a2e34', undefined, 12, 2.6, false); S.cyl(dc, lx, 0.4, 2.0, 0.1, 'col:#0a0c10', undefined, 12, 2.0, false); }));
  } };
  sky.scenes.portiques = { len: [180, 240], build(S) {
    const sr = S.sr; runway(S); cloudPuffs(S, 6, -110, -30, 30, 110); cloudPuffs(S, 4, 70, 120, 40, 120);
    // cadres d'entretien au-dessus de la piste, en série : un tunnel de portiques (rythme), entre lesquels on passe
    const n = Math.floor(S.len / 26);
    for (let i = 0; i < n; i++) { const dc = S.d0 + 18 + i * (S.len - 36) / Math.max(1, n - 1), L = S.lane(dc), yt = Math.max(46, L.y + S.R + 10); S.item(dc, (r) => {
      for (const s of [-1, 1]) S.bx(dc, s * 24, yt / 2, 2.2, yt, 2.2, 'col:#9aa2aa');
      S.bx(dc, 0, yt + 1, 52, 2.4, 3, 'col:#9aa2aa'); S.bx(dc, 0, yt - 6, 46, 0.4, 0.4, 'col:#7a828a', undefined, false);
      for (const s of [-1, 1]) for (let y = 5; y < yt; y += 10) S.bx(dc, s * 23, y, 1.2, 0.3, 1.2, 'col:#7a828a', undefined, false);
      S.bx(dc, 0, yt - 0.6, 20, 0.4, 1.2, 'emis:#fff4d0', undefined, false, { shadow: false }); }); }
    S.reserve(S.mid, 0, 50, S.len - 20);
  } };
  sky.scenes.hangar = { len: [220, 280], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -5, 5), y: U.clamp(T.laneY0(mid), 12, 22), from: (sc.d1 - sc.d0) / 2 - 55, to: (sc.d1 - sc.d0) / 2 + 55 }; },
    build(S) {
      const sr = S.sr; runway(S); cloudPuffs(S, 6, -110, -30, 30, 110); cloudPuffs(S, 3, 70, 120, 40, 120);
      // un hangar géant qu'on traverse dans sa longueur : ossature, toit, nervures, éclairage en bande ; avions en révision dedans
      const c = S.mid, len = 90, w = 38, hh = 30, L = S.lane(c);
      S.item(c, (r) => {
        for (const s of [-1, 1]) S.bx(c, s * (w / 2 + 2), hh / 2, 4, hh + 6, len, { side: 'corrugated', top: 'metal' }, '#c8ccd0');
        S.bx(c, 0, hh + 3.4, w + 12, 7, len, { side: 'corrugated', top: 'metal' }, '#b8c0c8');
        for (let k = -4; k <= 4; k++) { S.bx(c + k * 10, 0, hh - 0.6, w, 1.2, 1, 'col:#7a828a', undefined, false); S.bx(c + k * 10, 0, hh - 1.4, 2, 0.3, 4, 'emis:#fff4d0', undefined, false, { shadow: false }); for (const s of [-1, 1]) S.bx(c + k * 10, s * (w / 2 - 0.4), hh / 2, 1, hh, 1, 'col:#7a828a', undefined, false); }
        for (const s of [-1, 1]) for (let k = 0; k < 2; k++) jet(S, c + (k - 0.5) * 34, s * (w / 2 - 8.5), r);
      });
      S.reserve(c, 0, w + 10, len + 10); S.gate(c, L.lx, L.y);
    } };
  sky.scenes.ciel = { len: [170, 230], build(S) {
    const sr = S.sr; cloudPuffs(S, 14, -120, -20, 10, 120); cloudPuffs(S, 8, 40, 120, 20, 130);
    // respiration : plateau nu, balises, deux îlots rocheux flottants avec antennes, ballons météo ; on voit loin
    runway(S);
    for (let i = 0; i < 3; i++) { const dc = S.d0 + 20 + sr() * (S.len - 40), s = sr() < 0.5 ? -1 : 1, lx = s * sr.between([62, 100]), y = sr.between([-10, 40]), rad = sr.between([10, 22]);
      S.place(dc, lx, rad * 2, rad * 2, y - rad, rad * 2, (r) => { S.bx(dc, lx, y, rad * 2, rad * 0.8, rad * 1.8, 'rock', '#b0b6c0'); S.bx(dc, lx, y - rad * 0.6, rad * 1.2, rad * 0.8, rad, 'rock', '#9aa0aa'); S.bx(dc, lx, y + rad * 0.4 + 4, 0.4, 8, 0.4, 'col:#2a2a2e', undefined, false); }, { vol: 130 }); }
    for (let i = 0; i < 5; i++) { const dc = S.d0 + 15 + sr() * (S.len - 30), lx = (sr() < 0.5 ? -1 : 1) * sr.between([30, 90]), y = sr.between([16, 70]); S.item(dc, (r) => { S.ball(dc, lx, y, r.between([2.6, 4.6]), 'col:' + r.pick(['#e8e8e4', '#d83a2a', '#e0b020']), undefined, false); S.bx(dc, lx, y - 9, 0.08, 13, 0.08, 'col:#8a8e94', undefined, false); }); }
  } };
  sky.scenes.cargo = { len: [240, 300], pin(T, sc) { const mid = (sc.d0 + sc.d1) / 2; return { lx: U.clamp(T.laneX0(mid), -4, 4), y: 26, from: (sc.d1 - sc.d0) / 2 - 65, to: (sc.d1 - sc.d0) / 2 + 65 }; },
    build(S) {
      const sr = S.sr; runway(S); cloudPuffs(S, 7, -110, -30, 30, 110); cloudPuffs(S, 3, 70, 120, 40, 120);
      // SIGNATURE : un cargo géant parqué sur la piste, cargo arrière et nez ouverts : la soute est un tunnel de 110 m (nervures, éclairage,
      // palettes arrimées) ; les ailes, les moteurs et l'empennage dépassent à l'extérieur
      const c = S.mid, L = S.lane(c), rad = 17, len = 116, yc = 26;
      S.item(c, (r) => {
        S.tube(c, L.lx, yc, rad, len, { side: 'metal', top: 'metal' }, '#e4e8ec', 8, 1.4);
        for (let k = -5; k <= 5; k++) { S.tube(c + k * 10, L.lx, yc, rad - 0.1, 1.2, 'metal', '#9aa2aa', 8, 1.0, false); S.bx(c + k * 10, L.lx, yc + rad - 1.2, 3, 0.35, 1.6, 'emis:#fff4d0', undefined, false, { shadow: false }); }
        S.bx(c, L.lx, yc - rad + 0.8, 2 * rad - 4, 1.4, len - 2, 'col:#6a6e74', undefined, false);            // plancher de soute
        for (const s of [-1, 1]) { S.bx(c + 4, L.lx + s * (rad + 30), yc - 2, 60, 1.6, 22, 'metal', '#dfe3e8'); for (const k of [-0.4, 0.4]) S.cyl(c + 6 + k * 24, L.lx + s * (rad + 14 + (k + 0.4) * 18), yc - 8, 3, 7, 'metal', '#b0b6bc', 12, 2.6, false); }   // ailes et moteurs
        S.bx(c - len / 2 + 6, L.lx, yc + rad + 12, 0.8, 26, 18, 'metal', '#dfe3e8', false); S.bx(c - len / 2 + 8, L.lx, yc + rad + 2, 34, 1.2, 12, 'metal', '#dfe3e8', false);   // empennage
        for (const s of [-1, 1]) S.bx(c - len / 2 - 1, L.lx + s * 6, yc - rad + 3, 0.5, 6, 2, 'col:#e8c020', undefined, false);
        // train d'atterrissage : des jambes qui descendent sous le fuselage jusqu'à la piste
        for (const k of [-0.3, 0.3]) for (const s of [-1, 1]) S.cyl(c + k * len, L.lx + s * 7, 0, 1.0, yc - rad + 1, 'col:#3a3d42', undefined, 6, 0.8, false);
      });
      S.reserve(c, L.lx, 2 * rad + 70, len + 8); S.gate(c, L.lx, yc);
    } };
  // portail vers la base : anneaux de montée le long de la falaise
  Z.portals.sky = (S, B, lx, y, open) => {
    for (let k = -5; k <= 5; k++) { const dc = B + k * 40, L = S.T.laneX(dc), Y = S.T.laneY(dc), hole = open + 8;
      if (S.inClip(dc)) S.frame(dc, L, Y, hole, hole, hole + 9, hole + 9, 3, 'metal', '#d8dce4', Y - (hole + 9) / 2);
      if (S.inClip(dc)) S.bx(dc, L, Y + hole / 2 + 3.2, hole + 9.4, 0.6, 3.4, 'hazard', undefined, false);
      S.gate(dc, L, Y); }
  };
  Z.portals.port = (S, B, lx, y, open) => {            // porte du port : grue à portique et fanion
    const H = 50;
    for (const s of [-1, 1]) for (const k of [-1, 1]) S.bx(B + k * 5, s * 21, H / 2, 1.8, H, 1.8, 'col:#e0b020');
    S.bx(B, 0, H + 1.5, 46, 3, 14, 'col:#e0b020'); S.bx(B, 0, H - 4, 30, 6, 0.5, 'col:#2a6ac8', undefined, false);
    S.bx(B, 0, 0.1, 2 * 21, 0.08, 4, 'hazard', undefined, false);
  };
})();

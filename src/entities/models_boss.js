/* v080 : DESIGNS DE BOSS — un boss différent par niveau. Chaque modèle est un groupe de pièces low-poly (axe −Z = avant) avec :
 *   userData.gen = true · flying (vole / nage) · size, center (boîte de collision avant échelle) · firePoints (bouches de tir, repère du modèle)
 *   · anim(dt, t) (pièces mobiles : rotors, jambes, hélices, tentacules…).
 * Les teintes (0‥5) changent la palette : le même design revient avec d'autres couleurs.
 * Zones → boss (voir levelmode.js) : ville : convoyeur lourd / robot / zeppelin · forêt : araignée / robot / char · port : cuirassé / zeppelin · tour : soucoupe / bombardier · mer : sous-marin / calmar · métro : foreuse … */
(function () {
  const V = THREE.Vector3;
  const PAL = [['#56624a', '#e8a020'], ['#3a4a68', '#e04030'], ['#6a5a40', '#30c0e0'], ['#4a4c54', '#e8e040'], ['#6a3a48', '#40e0a0'], ['#3a5c5c', '#e08030']];
  const TOY = ['#e8c020', '#d83a2a', '#2a6ac8', '#2aa060', '#8a3aa8', '#ff8a1a'];
  const mats = {};
  const lam = (c) => mats['l' + c] || (mats['l' + c] = new THREE.MeshLambertMaterial({ color: c }));
  const emi = (c) => mats['e' + c] || (mats['e' + c] = new THREE.MeshBasicMaterial({ color: c }));
  const blurMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });
  const B = (p, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x || 0, y || 0, z || 0); p.add(o); return o; };
  const C = (p, rt, rb, h, m, x, y, z, rx, ry, rz, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); p.add(o); return o; };
  const S = (p, r, m, sx, sy, sz, x, y, z) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); o.scale.set(sx || 1, sy || 1, sz || 1); o.position.set(x || 0, y || 0, z || 0); p.add(o); return o; };
  const pal = (tint) => PAL[((tint || 0) % PAL.length + PAL.length) % PAL.length];
  const done = (g, flying, size, center, fp, anim) => { g.userData = { gen: true, flying, size, center, firePoints: fp.map((a) => new V(a[0], a[1], a[2])), anim: anim || null }; return g; };

  const M = {};

  // HELICOPTERE LOURD : deux rotors, soute arrière, canons latéraux
  M.gunship = (tint) => {
    const g = new THREE.Group(), [m, a] = pal(tint), body = lam(m), dark = lam('#1a1c20'), rotors = [];
    B(g, 2.2, 2.0, 7.0, body, 0, 0, 0); B(g, 1.8, 1.4, 1.6, body, 0, -0.1, -3.9); B(g, 1.9, 0.8, 0.1, lam('#1c2c3e'), 0, 0.3, -4.72);
    B(g, 2.3, 0.4, 2.4, dark, 0, 1.15, -0.5); B(g, 2.0, 1.6, 1.6, body, 0, 0.5, 3.9); B(g, 0.22, 2.4, 1.4, body, 0, 1.7, 4.3);
    B(g, 2.25, 0.22, 6.6, emi(a), 0, -0.45, 0);
    for (const z of [-2.4, 2.6]) {
      B(g, 0.5, 1.5, 0.5, dark, 0, 1.7, z);
      const r = new THREE.Group(); r.position.set(0, 2.5, z); g.add(r);
      for (let i = 0; i < 3; i++) { const arm = new THREE.Group(); arm.rotation.y = i * 2.094; r.add(arm); B(arm, 3.2, 0.08, 0.34, dark, 1.6, 0, 0); }
      const bl = new THREE.Mesh(new THREE.CircleGeometry(3.3, 20), blurMat('#101214', 0.12)); bl.rotation.x = -Math.PI / 2; bl.position.set(0, 2.5, z); g.add(bl); rotors.push(r);
    }
    for (const s of [-1, 1]) { B(g, 0.6, 0.7, 1.4, dark, s * 1.4, -0.7, -0.4); C(g, 0.16, 0.16, 1.8, dark, s * 1.4, -0.85, -1.6, Math.PI / 2); }
    return done(g, true, [6.8, 4.2, 9.6], [0, 0.8, 0], [[-1.4, -0.85, -2.6], [1.4, -0.85, -2.6]], (dt) => { rotors[0].rotation.y += dt * 15; rotors[1].rotation.y -= dt * 15; });
  };

  // ROBOT MARCHEUR : deux jambes articulées, canons d'épaule, œil rouge
  M.mech = (tint) => {
    const g = new THREE.Group(), [m, a] = pal(tint), body = lam(m), dark = lam('#202226'), legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.95, 3.0, 0); g.add(hip);
      B(hip, 0.85, 1.7, 0.85, body, 0, -0.85, 0); const knee = new THREE.Group(); knee.position.set(0, -1.7, 0); hip.add(knee);
      B(knee, 0.7, 1.5, 0.7, dark, 0, -0.75, 0); B(knee, 1.3, 0.45, 2.1, body, 0, -1.55, -0.4); legs.push({ hip, knee });
    }
    B(g, 2.7, 0.8, 1.9, dark, 0, 3.2, 0); const torso = B(g, 3.1, 2.3, 2.3, body, 0, 4.6, 0); B(g, 3.2, 0.4, 2.4, emi(a), 0, 5.35, 0);
    B(g, 1.2, 0.9, 1.2, dark, 0, 6.2, -0.3); B(g, 0.8, 0.26, 0.1, emi('#ff3020'), 0, 6.25, -0.93);
    for (const s of [-1, 1]) { B(g, 0.9, 1.1, 1.1, body, s * 2.05, 5.0, 0); C(g, 0.3, 0.3, 2.8, dark, s * 2.05, 4.6, -1.6, Math.PI / 2); B(g, 0.5, 0.5, 0.2, emi(a), s * 2.05, 4.6, -3.05); }
    B(g, 2.3, 1.3, 1.0, dark, 0, 5.3, 1.6); for (const s of [-1, 1]) B(g, 0.5, 0.5, 0.3, emi(a), s * 0.6, 5.5, 2.15);
    return done(g, false, [4.8, 7.2, 4.4], [0, 3.6, 0], [[-2.05, 4.6, -3.1], [2.05, 4.6, -3.1]], (dt, t) => { const w = Math.sin(t * 1.6) * 0.38; legs[0].hip.rotation.x = w; legs[1].hip.rotation.x = -w; legs[0].knee.rotation.x = Math.max(0, -w) * 0.6; legs[1].knee.rotation.x = Math.max(0, w) * 0.6; torso.rotation.y = Math.sin(t * 0.7) * 0.08; g.position.y = Math.abs(Math.sin(t * 1.6)) * 0.14; });
  };

  // ZEPPELIN BLINDE : ballon allongé, nacelle de combat, hélices
  M.zeppelin = (tint) => {
    const g = new THREE.Group(), [m, a] = pal(tint), body = lam(m), dark = lam('#202226'), props = [];
    S(g, 1, body, 2.2, 2.2, 5.6, 0, 0, 0); S(g, 1, emi(a), 2.24, 0.45, 5.4, 0, 1.0, 0);
    B(g, 0.22, 3.6, 1.9, dark, 0, 0, 5.0); B(g, 3.6, 0.22, 1.9, dark, 0, 0, 5.0);
    B(g, 1.5, 1.1, 3.4, dark, 0, -2.6, -0.4); B(g, 1.1, 0.7, 0.1, lam('#1c2c3e'), 0, -2.5, -2.15); B(g, 0.3, 0.9, 0.3, dark, 0, -1.9, -1.5); B(g, 0.3, 0.9, 0.3, dark, 0, -1.9, 0.7);
    for (const s of [-1, 1]) { B(g, 0.5, 0.5, 1.0, dark, s * 1.2, -2.5, 1.3); const p = new THREE.Group(); p.position.set(s * 1.2, -2.5, 1.9); g.add(p); B(p, 0.1, 1.9, 0.22, dark, 0, 0, 0); B(p, 1.9, 0.1, 0.22, dark, 0, 0, 0); props.push(p); C(g, 0.12, 0.12, 1.6, dark, s * 0.6, -3.0, -2.4, Math.PI / 2); }
    return done(g, true, [4.6, 6.4, 11.8], [0, -0.5, 0], [[-0.6, -3.0, -3.2], [0.6, -3.0, -3.2]], (dt) => { for (const p of props) p.rotation.z += dt * 18; });
  };

  // SOUCOUPE : disque, dôme, anneau de lumières qui tourne, faisceau sous la coque
  M.ufo = (tint) => {
    const g = new THREE.Group(), [m, a] = pal(tint), body = lam(m), dark = lam('#202226'), ring = new THREE.Group();
    C(g, 3.8, 1.6, 1.0, body, 0, -0.3, 0, 0, 0, 0, 20); C(g, 1.4, 3.8, 0.9, body, 0, 0.5, 0, 0, 0, 0, 20); S(g, 1.3, emi('#6ad8ff'), 1, 0.85, 1, 0, 1.05, 0);
    ring.position.set(0, 0.1, 0); g.add(ring); for (let i = 0; i < 10; i++) { const an = i * Math.PI * 2 / 10; B(ring, 0.5, 0.4, 0.5, emi(i % 2 ? a : '#ffffff'), Math.cos(an) * 3.7, 0, Math.sin(an) * 3.7); }
    C(g, 0.6, 1.1, 0.5, emi(a), 0, -0.95, 0); for (let i = 0; i < 3; i++) { const an = i * Math.PI * 2 / 3; B(g, 0.3, 1.0, 0.3, dark, Math.cos(an) * 2.0, -1.2, Math.sin(an) * 2.0); }
    return done(g, true, [7.8, 3.4, 7.8], [0, 0.3, 0], [[0, -1.3, 0], [1.6, -0.9, -1.4], [-1.6, -0.9, -1.4]], (dt, t) => { ring.rotation.y += dt * 2.2; g.rotation.z = Math.sin(t * 0.9) * 0.08; });
  };

  // BOMBARDIER : aile delta, deux réacteurs, missiles sous les ailes
  M.bomber = (tint) => {
    const g = new THREE.Group(), [m, a] = pal(tint), body = lam(m), dark = lam('#202226');
    B(g, 1.4, 1.1, 6.2, body, 0, 0, 0); C(g, 0.05, 0.7, 2.2, body, 0, 0, -4.1, -Math.PI / 2, 0, 0, 8);
    const wl = B(g, 4.8, 0.22, 3.0, body, -3.1, 0, 1.0); wl.rotation.y = 0.38; const wr = B(g, 4.8, 0.22, 3.0, body, 3.1, 0, 1.0); wr.rotation.y = -0.38;
    for (const s of [-1, 1]) { B(g, 0.7, 0.05, 2.6, emi(a), s * 3.3, 0.14, 1.0).rotation.y = -s * 0.38; const t = B(g, 0.2, 1.8, 1.3, body, s * 0.85, 1.0, 2.7); t.rotation.z = -s * 0.25; C(g, 0.5, 0.55, 1.8, dark, s * 0.95, -0.1, 3.4, Math.PI / 2); C(g, 0.4, 0.4, 0.1, emi('#ffb040'), s * 0.95, -0.1, 4.35, Math.PI / 2); C(g, 0.14, 0.14, 1.4, dark, s * 3.0, -0.5, 0.3, Math.PI / 2); }
    B(g, 0.8, 0.5, 1.5, lam('#1c2c3e'), 0, 0.7, -1.4);
    return done(g, true, [9.8, 3.0, 9.2], [0, 0.2, 0.2], [[-3.0, -0.5, -0.6], [3.0, -0.5, -0.6]], (dt, t) => { g.rotation.z = Math.sin(t * 0.8) * 0.14; });
  };

  // SOUS-MARIN : coque, kiosque, périscope, hélice
  M.sub = (tint) => {
    const g = new THREE.Group(), [m, a] = pal(tint), body = lam(m), dark = lam('#202226'), prop = new THREE.Group();
    C(g, 1.4, 1.4, 7.0, body, 0, 0, 0, Math.PI / 2, 0, 0, 14); S(g, 1.4, body, 1, 1, 1.2, 0, 0, -3.5); C(g, 0.3, 1.4, 2.4, body, 0, 0, 4.6, Math.PI / 2, 0, 0, 12);
    B(g, 0.95, 1.5, 2.4, body, 0, 1.8, -0.4); B(g, 0.12, 1.4, 0.12, dark, 0, 3.2, -0.7); B(g, 0.12, 0.12, 0.6, dark, 0, 3.85, -0.9); for (let i = 0; i < 3; i++) B(g, 0.12, 0.4, 0.05, emi('#ffd860'), 0, 1.8, -1.62 + i * 0.0 + 0.0).position.x = -0.3 + i * 0.3;
    B(g, 3.8, 0.15, 1.0, dark, 0, 0, 4.0); B(g, 0.15, 2.5, 1.0, dark, 0, 0, 4.0); B(g, 3.0, 0.15, 1.0, dark, 0, -0.1, -1.8);
    B(g, 2.95, 0.2, 1.1, emi(a), 0, 0.2, -1.0); prop.position.set(0, 0, 5.9); g.add(prop); B(prop, 0.15, 2.2, 0.2, dark, 0, 0, 0); B(prop, 2.2, 0.15, 0.2, dark, 0, 0, 0);
    for (const s of [-1, 1]) C(g, 0.16, 0.16, 0.8, dark, s * 0.55, -0.25, -4.9, Math.PI / 2);
    return done(g, true, [3.6, 4.3, 11.8], [0, 0.6, 0.6], [[-0.55, -0.25, -5.3], [0.55, -0.25, -5.3]], (dt) => { prop.rotation.z += dt * 10; });
  };

  // CUIRASSE : coque, passerelle, cheminée, tourelles à double canon, radar
  M.ship = (tint) => {
    const g = new THREE.Group(), [m, a] = pal(tint), body = lam(m), dark = lam('#26282c'), radar = new THREE.Group(), turrets = [];
    B(g, 4.6, 1.9, 11.0, dark, 0, 0.95, 0.5); B(g, 3.4, 1.9, 3.0, dark, 0, 0.95, -6.3); B(g, 2.0, 1.9, 2.0, dark, 0, 0.95, -8.0); B(g, 4.2, 0.2, 11.0, body, 0, 1.95, 0.4); B(g, 4.62, 0.3, 11.02, emi(a), 0, 0.45, 0.5);
    B(g, 2.4, 1.6, 3.0, body, 0, 2.8, 2.2); B(g, 1.8, 1.4, 2.0, body, 0, 4.3, 2.3); B(g, 1.7, 0.4, 0.1, lam('#1c2c3e'), 0, 4.4, 1.27); C(g, 0.6, 0.72, 1.7, dark, 0, 5.2, 3.4, 0, 0, 0, 10); C(g, 0.74, 0.74, 0.3, emi(a), 0, 5.7, 3.4);
    B(g, 0.2, 3.0, 0.2, dark, 0, 6.4, 2.3); radar.position.set(0, 8.0, 2.3); g.add(radar); B(radar, 2.2, 0.14, 0.35, dark, 0, 0, 0);
    for (const z of [-3.4, 5.2]) { const tr = new THREE.Group(); tr.position.set(0, 2.1, z); g.add(tr); C(tr, 1.1, 1.2, 0.7, body, 0, 0.3, 0, 0, 0, 0, 12); B(tr, 1.5, 0.8, 1.4, body, 0, 0.9, 0.0); for (const s of [-0.4, 0.4]) C(tr, 0.14, 0.14, 3.0, dark, s, 0.9, z > 0 ? 1.8 : -1.8, Math.PI / 2); if (z > 0) tr.rotation.y = Math.PI; turrets.push(tr); }
    return done(g, false, [5.0, 7.4, 13.4], [0, 3.4, 0.2], [[-0.4, 3.0, -5.3], [0.4, 3.0, -5.3]], (dt) => { radar.rotation.y += dt * 2.5; });
  };

  // ARAIGNEE GEANTE : huit pattes qui marchent, abdomen à sablier, yeux rouges
  M.spider = (tint) => {
    const g = new THREE.Group(), [m, a] = pal(tint), body = lam(m), dark = lam('#1c1e22'), legs = [];
    S(g, 1, body, 2.2, 1.9, 2.6, 0, 3.4, 1.5); B(g, 1.1, 0.12, 1.4, emi(a), 0, 5.28, 1.5); B(g, 2.0, 1.4, 2.2, dark, 0, 3.0, -0.8); B(g, 1.6, 1.3, 1.5, body, 0, 3.0, -2.2);
    for (const x of [-0.5, 0.5]) { B(g, 0.35, 0.28, 0.1, emi('#ff3020'), x, 3.3, -3.0); B(g, 0.22, 0.9, 0.22, dark, x * 1.1, 2.2, -3.0); }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const leg = new THREE.Group(); leg.position.set(s * 0.8, 3.1, -1.8 + i * 1.15); leg.rotation.y = s * (1.5 - i) * 0.45; g.add(leg);
      const up = B(leg, 2.6, 0.38, 0.38, dark, s * 1.3, 0.7, 0); up.rotation.z = s * 0.45; const lo = B(leg, 0.34, 3.7, 0.34, dark, s * 2.65, -0.6, 0); lo.rotation.z = s * 0.12; legs.push({ leg, ph: (i % 2) * Math.PI + (s > 0 ? 0 : Math.PI), base: leg.rotation.y });
    }
    return done(g, false, [8.6, 5.6, 7.4], [0, 2.8, -0.2], [[-0.4, 2.6, -3.1], [0.4, 2.6, -3.1]], (dt, t) => { for (const L of legs) L.leg.rotation.y = L.base + Math.sin(t * 3 + L.ph) * 0.2; g.position.y = Math.abs(Math.sin(t * 3)) * 0.1; });
  };

  // FOREUSE : chenilles, cône de forage qui tourne, tourelle
  M.drill = (tint) => {
    const g = new THREE.Group(), [m, a] = pal(tint), body = lam(m), dark = lam('#202226'), drill = new THREE.Group();
    for (const s of [-1, 1]) { B(g, 0.95, 1.4, 7.2, dark, s * 1.95, 0.7, 0.4); for (let i = 0; i < 6; i++) B(g, 1.0, 0.15, 0.4, lam('#3a3c40'), s * 1.95, 1.45, -2.4 + i * 1.3); }
    B(g, 3.4, 2.0, 5.0, body, 0, 2.1, 0.6); B(g, 2.4, 1.2, 1.8, body, 0, 3.7, 1.6); B(g, 2.0, 0.6, 0.1, lam('#1c2c3e'), 0, 3.8, 0.68); B(g, 3.45, 0.25, 5.05, emi(a), 0, 1.5, 0.6);
    C(g, 0.3, 0.36, 1.5, dark, 1.0, 4.0, 2.6); B(g, 1.0, 0.7, 1.0, dark, 0, 3.4, -0.6); C(g, 0.12, 0.12, 1.5, dark, 0, 3.5, -1.5, Math.PI / 2);
    drill.position.set(0, 2.2, -3.1); g.add(drill); C(drill, 0.1, 1.9, 4.4, lam('#8a8e96'), 0, 0, -1.8, -Math.PI / 2, 0, 0, 12);
    for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; B(drill, 0.3, 0.3, 4.0, emi(a), Math.cos(an) * 0.75, Math.sin(an) * 0.75, -1.7); }
    return done(g, false, [4.8, 4.6, 12.0], [0, 2.3, -0.6], [[0, 3.5, -2.3]], (dt) => { drill.rotation.z += dt * 7; });
  };

  // ROBOT JOUET : couleurs vives, clé de remontage dans le dos qui tourne
  M.toybot = (tint) => {
    const g = new THREE.Group(), c = TOY, k = (tint || 0), key = new THREE.Group(), legs = [];
    const c1 = lam(c[k % 6]), c2 = lam(c[(k + 1) % 6]), c3 = lam(c[(k + 2) % 6]), c4 = lam(c[(k + 3) % 6]), dark = lam('#202226');
    for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(s * 0.95, 2.6, 0); g.add(hip); B(hip, 1.0, 1.4, 1.0, c1, 0, -0.7, 0); B(hip, 1.2, 1.2, 1.2, c2, 0, -1.9, 0); B(hip, 1.6, 0.5, 2.2, dark, 0, -2.45, -0.35); legs.push(hip); }
    B(g, 3.0, 2.6, 2.2, c3, 0, 3.9, 0); B(g, 1.6, 1.2, 0.1, emi('#ffffff'), 0, 4.0, -1.15); B(g, 0.5, 0.5, 0.1, emi('#ff3a3a'), -0.4, 4.0, -1.22); B(g, 0.5, 0.5, 0.1, emi('#3aff7a'), 0.4, 4.0, -1.22);
    B(g, 2.0, 1.7, 1.8, c4, 0, 6.0, 0); for (const x of [-0.45, 0.45]) { B(g, 0.6, 0.6, 0.1, emi('#ffffff'), x, 6.2, -0.92); B(g, 0.25, 0.25, 0.1, dark, x, 6.2, -0.98); }
    B(g, 0.12, 0.9, 0.12, dark, 0, 7.2, 0); S(g, 0.3, emi('#ff3a3a'), 1, 1, 1, 0, 7.75, 0);
    for (const s of [-1, 1]) { B(g, 0.9, 2.2, 0.9, c1, s * 2.05, 3.9, 0); C(g, 0.34, 0.34, 1.8, dark, s * 2.05, 2.7, -0.9, Math.PI / 2); }
    key.position.set(0, 4.3, 1.5); g.add(key); B(key, 0.3, 0.3, 0.9, dark, 0, 0, -0.45); B(key, 2.2, 0.9, 0.22, c2, 0, 0, 0.2);
    return done(g, false, [4.8, 8.0, 3.6], [0, 4.0, 0], [[-2.05, 2.7, -1.9], [2.05, 2.7, -1.9]], (dt, t) => { key.rotation.z += dt * 3; legs[0].rotation.x = Math.sin(t * 2) * 0.3; legs[1].rotation.x = -Math.sin(t * 2) * 0.3; g.position.y = Math.abs(Math.sin(t * 2)) * 0.12; });
  };

  // CALMAR GEANT : manteau, grands yeux, huit tentacules qui ondulent
  M.squid = (tint) => {
    const g = new THREE.Group(), [m, a] = pal(tint), body = lam(m), dark = lam('#202226'), tents = [];
    C(g, 0.2, 1.7, 5.2, body, 0, 0, 2.4, Math.PI / 2, 0, 0, 14); S(g, 1.45, body, 1, 1, 1, 0, 0, -0.6); B(g, 3.8, 0.16, 1.8, body, 0, 0, 3.6);
    for (const s of [-1, 1]) { S(g, 0.6, lam('#f4f4f0'), 1, 1, 1, s * 1.15, 0.25, -1.3); S(g, 0.28, emi('#101010'), 1, 1, 0.5, s * 1.3, 0.25, -1.8); for (let i = 0; i < 4; i++) B(g, 0.35, 0.35, 0.35, emi(a), s * 0.6, 0.6, 1.0 + i * 0.9); }
    for (let i = 0; i < 8; i++) {
      const an = i * Math.PI / 4, t = new THREE.Group(); t.position.set(Math.cos(an) * 0.95, Math.sin(an) * 0.95, -1.7); g.add(t); let p = t;
      for (let k = 0; k < 3; k++) { const seg = new THREE.Group(); seg.position.z = k ? -1.3 : 0; p.add(seg); B(seg, 0.4 - k * 0.08, 0.4 - k * 0.08, 1.4, k === 2 ? emi(a) : body, 0, 0, -0.7); p = seg; }
      tents.push({ t, an });
    }
    return done(g, true, [4.4, 4.4, 9.6], [0, 0, 0.6], [[-0.4, -0.7, -2.2], [0.4, -0.7, -2.2]], (dt, tm) => { for (const T of tents) { T.t.rotation.x = Math.sin(tm * 2.2 + T.an) * 0.28; T.t.rotation.y = Math.cos(tm * 1.7 + T.an) * 0.25; } g.position.y = Math.sin(tm * 1.1) * 0.2; });
  };

  // CIBLE DOREE : un joyau qui tourne et scintille, posé à l'écart de la trajectoire (risque / récompense) — 5 points et beaucoup de carburant
  M.golden = () => {
    const g = new THREE.Group(), gem = new THREE.Group(), gold = emi('#ffd23a'), lite = emi('#fff4b0');
    g.add(gem); C(gem, 0.01, 1.5, 1.5, gold, 0, 0.75, 0, 0, 0, 0, 4); C(gem, 1.5, 0.01, 1.5, gold, 0, -0.75, 0, 0, 0, 0, 4); C(gem, 0.01, 0.9, 0.9, lite, 0, 1.2, 0, 0, Math.PI / 4, 0, 4);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(2.8, 24), blurMat('#ffd23a', 0.2)); g.add(halo);
    const ring = new THREE.Group(); g.add(ring); for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; B(ring, 0.35, 0.35, 0.35, lite, Math.cos(an) * 2.4, 0, Math.sin(an) * 2.4); }
    g.userData = { gen: true, flying: true, golden: true, size: [3.4, 3.4, 3.4], center: [0, 0, 0], firePoints: [new V(0, 0, 0)], anim: (dt, t) => { gem.rotation.y += dt * 2.2; ring.rotation.y -= dt * 1.4; ring.rotation.z = Math.sin(t) * 0.3; halo.rotation.z += dt; halo.material.opacity = 0.16 + 0.1 * Math.sin(t * 5); halo.quaternion.copy(CC.game ? CC.game.camera.quaternion : halo.quaternion); } };
    return g;
  };

  CC.BossModels = M;
  // type → { flying } (la liste sert aussi aux niveaux : levelmode.js)
  CC.BossFlying = { heli: true, gunship: true, zeppelin: true, ufo: true, bomber: true, sub: true, squid: true };
})();

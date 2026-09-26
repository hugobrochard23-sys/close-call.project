/* Modèles 3D originaux low-poly (fusée, lanceurs, char, hélicoptères, camion, maison, soldat, marqueurs).
 * Silhouettes et couleurs d'après la vidéo (OBSERVÉ), géométrie recréée. */
(function () {
  const V = THREE.Vector3;
  const mats = {};
  const lam = (c, extra) => { const k = c + JSON.stringify(extra || {}); if (!mats[k]) mats[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, extra || {})); return mats[k]; };
  const basic = (c, extra) => { const k = 'b' + c + JSON.stringify(extra || {}); if (!mats[k]) mats[k] = new THREE.MeshBasicMaterial(Object.assign({ color: c }, extra || {})); return mats[k]; };

  function box(w, h, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }
  function cyl(r1, r2, h, mat, seg, parent) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 10), mat);
    m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }

  const M = {};

  /* Roquette : axe +Z = nez. Longueur ≈ 1,25 m (ESTIMATION), corps gris, nez à point rouge, collier jaune, 4 ailerons (OBSERVÉ).
   * v007 : le modèle est piloté par une fiche cosmétique (CC.Skins) — couleurs, dimensions, nombre d'ailerons et
   * pièces rapportées. Sans argument, on retombe exactement sur la roquette d'origine (`STOCK`). */
  const D2R = Math.PI / 180;
  M.rocket = function (skin) {
    skin = skin || (CC.Skins && CC.Skins.get('stock'));
    const g = new THREE.Group();
    const c = skin ? skin.c : { body: '#c4c6c9', nose: '#c4c6c9', tip: '#e02a1c', band: '#f3cf00', fin: '#5d6065', nozzle: '#3d3f43' };
    const d = Object.assign({ r: 0.1, len: 0.86, noseLen: 0.3, noseR: 0.012, fins: 4, finH: 0.2, finW: 0.02, finPos: -0.33, scale: 1 }, (skin && skin.dims) || {});
    const r = d.r, len = d.len, nl = d.noseLen, nr = d.noseR, fs = len / 0.86;
    const body = cyl(r, r, len, lam(c.body), 10, g); body.rotation.x = Math.PI / 2; body.position.z = 0.0;
    const nose = cyl(nr, r, nl, lam(c.nose), 10, g); nose.rotation.x = Math.PI / 2; nose.position.z = len / 2 + nl / 2;
    // embout des nez arrondis ; v027 (Hugo) : plus de petit cube rouge au bout des nez pointus (fusée de base)
    if (nr > 0.02) { const tip = cyl(nr * 0.55, nr, nr * 1.6, basic(c.tip), 8, g); tip.rotation.x = Math.PI / 2; tip.position.z = len / 2 + nl + nr * 0.6; tip.castShadow = false; }
    const band = cyl(r * 1.08, r * 1.08, 0.07, basic(c.band), 10, g); band.rotation.x = Math.PI / 2; band.position.z = -len * 0.35;
    const nozzle = cyl(r * 0.75, r * 0.6, 0.1, lam(c.nozzle), 10, g); nozzle.rotation.x = Math.PI / 2; nozzle.position.z = -len / 2 - 0.05;
    for (let i = 0; i < d.fins; i++) {
      const f = new THREE.Group(); f.rotation.z = i * Math.PI * 2 / d.fins + Math.PI / 4; g.add(f);
      box(d.finW, d.finH, d.finH * 1.1, lam(c.fin), 0, r + d.finH * 0.35, d.finPos * fs, f);
    }
    // v026 : points de départ des traînées (coin arrière extérieur de chaque aileron) et pointe du nez, repère local
    g.userData.finTips = [];
    for (let i = 0; i < d.fins; i++) {
      const a = i * Math.PI * 2 / d.fins + Math.PI / 4, y = r + d.finH * 0.85;
      g.userData.finTips.push(new THREE.Vector3(-y * Math.sin(a), y * Math.cos(a), d.finPos * fs - d.finH * 0.55));
    }
    g.userData.noseZ = len / 2 + nl;
    // pièces rapportées propres au cosmétique (anneaux, oreilles, miettes de croissant…)
    for (const p of (skin && skin.parts) || []) {
      const mat = p.basic ? basic(p.c) : lam(p.c);
      let m;
      if (p.k === 'box') m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), mat);
      else if (p.k === 'sph') m = new THREE.Mesh(new THREE.SphereGeometry(p.r, 8, 6), mat);
      else m = new THREE.Mesh(new THREE.CylinderGeometry(p.r2 !== undefined ? p.r2 : p.r, p.r, p.h, p.seg || 10), mat);
      m.position.fromArray(p.p || [0, 0, 0]);
      const rot = p.rot || [0, 0, 0];
      m.rotation.set(rot[0] * D2R, rot[1] * D2R, rot[2] * D2R);
      m.castShadow = p.cast !== false && !p.basic; m.receiveShadow = true;
      g.add(m);
    }
    if (d.scale !== 1) g.scale.setScalar(d.scale);
    // petites buses de rétro-fusées (visuelles)
    g.userData.nozzleZ = -0.53;
    return g;
  };

  // Lanceur à l'épaule vu à la 1re personne (OBSERVÉ séq. 2–7 : tube sombre en bas au centre).
  M.shoulderLauncher = function () {
    const g = new THREE.Group();
    const tube = cyl(0.13, 0.13, 1.3, lam('#3c3d41'), 12, g); tube.rotation.x = Math.PI / 2; tube.position.z = -0.35;
    const rear = cyl(0.17, 0.15, 0.3, lam('#1c1d1f'), 12, g); rear.rotation.x = Math.PI / 2; rear.position.z = 0.35;
    box(0.1, 0.12, 0.25, lam('#3a3b3f'), 0, 0.17, -0.1, g);
    box(0.025, 0.025, 0.025, basic('#e0802a'), 0, 0.24, -0.08, g);
    box(0.08, 0.22, 0.1, lam('#1c1d1f'), 0, -0.16, -0.05, g);
    const muzzle = cyl(0.14, 0.14, 0.06, lam('#4a4b50'), 12, g); muzzle.rotation.x = Math.PI / 2; muzzle.position.z = -1.0;
    g.userData.bore = boreRing(g, 0.13, 0.25, '#3c3d41', 0.3, -1.0);
    return g;
  };

  /* v024 : anneau de renflement pour l'animation de tir : le tube gonfle sur les côtés, de l'arrière (z0) vers la bouche
   * (z1), comme si le missile le traversait. Caché au repos ; animé par Game.updateLaunchFx. */
  function boreRing(parent, r, len, color, z0, z1) {
    const ring = cyl(r, r, len, lam(color), 12, parent);
    ring.rotation.x = Math.PI / 2; ring.visible = false; ring.castShadow = false;
    return { ring, z0, z1 };
  }

  // Lanceur sur trépied (OBSERVÉ séq. 1 : tube noir, fente rouge à l'arrière).
  M.tripodLauncher = function () {
    const g = new THREE.Group();
    const head = new THREE.Group(); head.position.y = 1.0; g.add(head);
    const tube = cyl(0.2, 0.2, 1.6, lam('#1e1f22'), 12, head); tube.rotation.x = Math.PI / 2;
    const back = box(0.44, 0.44, 0.2, lam('#18191b'), 0, 0, 0.8, head);
    box(0.16, 0.24, 0.02, basic('#8a2a2a'), 0, 0, 0.91, head);
    box(0.12, 0.3, 0.12, lam('#18191b'), 0, 0.3, 0.2, head);
    for (let i = 0; i < 3; i++) {
      const leg = box(0.07, 1.25, 0.07, lam('#222326'), 0, 0, 0, g);
      const a = i * Math.PI * 2 / 3;
      leg.position.set(Math.sin(a) * 0.35, 0.5, Math.cos(a) * 0.35);
      leg.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
    }
    g.userData.head = head;
    g.userData.bore = boreRing(head, 0.2, 0.35, '#1e1f22', 0.7, -0.8);
    return g;
  };

  // Char (OBSERVÉ : vert foncé, tourelle qui suit la roquette).
  M.tank = function () {
    const g = new THREE.Group();
    const hullMat = lam('#2b3b2e');
    box(3.4, 0.9, 5.4, hullMat, 0, 0.95, 0, g);
    box(3.0, 0.5, 4.6, lam('#243226'), 0, 1.6, -0.2, g);
    box(0.8, 0.9, 5.8, lam('#16191a'), -1.75, 0.55, 0, g);
    box(0.8, 0.9, 5.8, lam('#16191a'), 1.75, 0.55, 0, g);
    const turret = new THREE.Group(); turret.position.set(0, 2.05, 0.2); g.add(turret);
    box(2.3, 0.8, 2.6, lam('#2f4232'), 0, 0.3, 0, turret);
    box(0.5, 0.25, 0.5, lam('#243226'), 0.6, 0.8, 0.3, turret);
    const gunPivot = new THREE.Group(); gunPivot.position.set(0, 0.3, -1.2); turret.add(gunPivot);
    const gun = cyl(0.12, 0.14, 3.2, lam('#223024'), 10, gunPivot); gun.rotation.x = Math.PI / 2; gun.position.z = -1.6;
    const muzzle = cyl(0.19, 0.19, 0.4, lam('#1e2b20'), 10, gunPivot); muzzle.rotation.x = Math.PI / 2; muzzle.position.z = -3.2;
    g.userData.turret = turret; g.userData.gun = gunPivot;
    g.userData.size = [3.6, 2.8, 5.8]; g.userData.center = [0, 1.3, 0];
    return g;
  };

  // Hélicoptère (séq. 1 : noir ; séq. 6 : camouflé). Axe -Z = avant.
  M.helicopter = function (camo) {
    const g = new THREE.Group();
    const skin = camo ? new THREE.MeshLambertMaterial({ map: CC.Textures.get('camo') }) : lam('#1d1e21');
    const dark = lam('#141416');
    box(1.7, 1.7, 5.2, skin, 0, 0, 0, g);
    box(1.4, 1.1, 1.6, lam(camo ? '#8a6e5a' : '#2c3038', { transparent: false }), 0, 0.2, -2.9, g);   // cockpit
    box(0.5, 0.55, 5.4, skin, 0, 0.35, 4.9, g);                      // poutre de queue
    box(0.12, 1.6, 1.0, skin, 0, 1.1, 7.3, g);                       // dérive
    box(2.6, 0.12, 0.6, skin, 0, 0.3, 7.0, g);                       // empennage
    if (camo) { box(3.6, 0.15, 0.8, skin, 0, -0.1, -0.2, g); box(0.35, 0.35, 1.3, dark, -1.9, -0.35, -0.3, g); box(0.35, 0.35, 1.3, dark, 1.9, -0.35, -0.3, g); }
    box(0.1, 0.1, 3.4, dark, -0.8, -1.2, 0, g); box(0.1, 0.1, 3.4, dark, 0.8, -1.2, 0, g);
    box(0.08, 0.45, 0.08, dark, -0.8, -1.0, -1, g); box(0.08, 0.45, 0.08, dark, 0.8, -1.0, -1, g);
    box(0.08, 0.45, 0.08, dark, -0.8, -1.0, 1, g); box(0.08, 0.45, 0.08, dark, 0.8, -1.0, 1, g);
    box(0.4, 0.5, 0.4, dark, 0, 1.05, -0.3, g);
    const rotor = new THREE.Group(); rotor.position.set(0, 1.35, -0.3); g.add(rotor);
    box(11, 0.06, 0.35, dark, 0, 0, 0, rotor); box(0.35, 0.06, 11, dark, 0, 0, 0, rotor);
    const tail = new THREE.Group(); tail.position.set(0.3, 1.2, 7.4); g.add(tail);
    box(0.05, 2.0, 0.22, dark, 0, 0, 0, tail); box(0.05, 0.22, 2.0, dark, 0, 0, 0, tail);
    g.userData.rotor = rotor; g.userData.tailRotor = tail;
    g.userData.size = [3.0, 3.2, 12.5]; g.userData.center = [0, 0.1, 2.0];
    return g;
  };

  // Camion / générateur (séq. 4).
  M.truck = function () {
    const g = new THREE.Group();
    box(2.4, 0.4, 4.6, lam('#3a3a2c'), 0, 0.5, 0, g);
    box(2.2, 1.7, 2.8, lam('#5d5f3e'), 0, 1.55, 0.6, g);
    box(2.2, 1.3, 1.2, lam('#4b4d33'), 0, 1.35, -1.6, g);
    const frame = lam('#c0784e');
    box(0.18, 2.6, 0.18, frame, -1.2, 1.3, -2.4, g); box(0.18, 2.6, 0.18, frame, 1.2, 1.3, -2.4, g); box(2.6, 0.18, 0.18, frame, 0, 2.6, -2.4, g);
    for (const sx of [-1.05, 1.05]) for (const sz of [-1.5, 1.5]) { const w = cyl(0.42, 0.42, 0.3, lam('#141414'), 10, g); w.rotation.z = Math.PI / 2; w.position.set(sx * 1.15, 0.42, sz); }
    g.userData.size = [2.8, 2.9, 5]; g.userData.center = [0, 1.4, 0];
    return g;
  };

  // Maison (séq. 7).
  M.house = function () {
    const g = new THREE.Group();
    box(6, 4, 7.5, lam('#8e8f94'), 0, 2, 0, g);
    const roofMat = new THREE.MeshLambertMaterial({ map: CC.Textures.get('roofBrown') });
    const r1 = box(4.4, 0.25, 8.2, roofMat, -1.55, 5.1, 0, g); r1.rotation.z = 0.62;
    const r2 = box(4.4, 0.25, 8.2, roofMat, 1.55, 5.1, 0, g); r2.rotation.z = -0.62;
    box(5.9, 2.2, 0.2, lam('#8e8f94'), 0, 4.8, 3.7, g).scale.set(1, 1, 1);
    box(0.8, 1.6, 0.8, lam('#6f6f74'), 1.5, 6.1, -1.5, g);
    box(1.0, 1.9, 0.1, lam('#3a3030'), 0, 0.95, 3.8, g);
    box(1.2, 1.0, 0.1, lam('#2c3440'), -1.8, 2.3, 3.8, g);
    g.userData.size = [6.4, 7, 8]; g.userData.center = [0, 3, 0];
    return g;
  };

  // Soldat avec lance-missile (séq. 3).
  M.soldier = function () {
    const g = new THREE.Group();
    const cloth = lam('#2c3036'), light = lam('#c9ccd1');
    box(0.22, 0.85, 0.22, cloth, -0.14, 0.43, 0, g); box(0.22, 0.85, 0.22, cloth, 0.14, 0.43, 0, g);
    box(0.62, 0.72, 0.34, light, 0, 1.2, 0, g);
    box(0.3, 0.3, 0.3, lam('#b89a80'), 0, 1.72, 0, g);
    box(0.34, 0.14, 0.34, cloth, 0, 1.9, 0, g);
    box(0.18, 0.6, 0.18, cloth, -0.4, 1.25, -0.15, g); box(0.18, 0.6, 0.18, cloth, 0.4, 1.25, -0.15, g);
    const tube = cyl(0.1, 0.1, 1.2, lam('#1e1f22'), 8, g); tube.rotation.x = Math.PI / 2; tube.position.set(0.3, 1.62, -0.1);
    g.userData.size = [0.9, 2.0, 0.8]; g.userData.center = [0, 1.0, 0];
    return g;
  };

  M.enemyMissile = function () {
    const g = new THREE.Group();
    const b = cyl(0.06, 0.06, 0.7, lam('#d0d0d0'), 8, g); b.rotation.x = Math.PI / 2;
    box(0.2, 0.02, 0.1, lam('#555'), 0, 0, -0.3, g); box(0.02, 0.2, 0.1, lam('#555'), 0, 0, -0.3, g);
    return g;
  };

  // Disque d'accroche du grappin (OBSERVÉ séq. 1 : anneaux rouge/blanc/orange).
  M.bullseye = function (radius) {
    const face = new THREE.MeshLambertMaterial({ map: CC.Textures.special('bullseye') });
    const side = lam('#8a2a20');
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.25, 24), [side, face, face]);
    m.castShadow = true;
    return m;
  };

  // Flèche verte (séq. 6).
  M.arrow = function () {
    const g = new THREE.Group();
    const mat = basic('#1fbf22');
    box(1.2, 3.2, 0.3, mat, 0, 2.4, 0, g);
    const shape = new THREE.Shape(); shape.moveTo(-1.6, 0); shape.lineTo(1.6, 0); shape.lineTo(0, -2.0); shape.lineTo(-1.6, 0);
    const head = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }), mat);
    head.position.set(0, 0.8, -0.15); g.add(head);
    g.traverse((o) => { o.castShadow = false; });
    return g;
  };

  // v023 : flèche de chemin (niveaux 1 à 3) : flèche plate verte, pointe vers +Z, lumineuse (visible de nuit comme de jour)
  M.guideArrow = function () {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: '#35ff4a', transparent: true, opacity: 0.85, depthWrite: false });
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, 1.6); shape.lineTo(0.5, 1.6); shape.lineTo(0.5, 0); shape.lineTo(1.5, 0); shape.lineTo(0, -1.8); shape.lineTo(-1.5, 0); shape.lineTo(-0.5, 0); shape.lineTo(-0.5, 1.6);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }), mat);
    m.rotation.x = -Math.PI / 2;   // à plat : la pointe (−Y de la forme) passe vers +Z
    g.add(m);
    g.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
    return g;
  };

  // Sprites : "!" rouge au-dessus des ennemis et point rouge de cible.
  let alertTex = null, dotTex = null;
  M.alertSprite = function () {
    if (!alertTex) {
      const c = document.createElement('canvas'); c.width = 16; c.height = 32;
      const g = c.getContext('2d'); g.fillStyle = '#ff2a1a';
      g.fillRect(5, 1, 6, 20); g.fillRect(5, 25, 6, 6);
      alertTex = new THREE.CanvasTexture(c); alertTex.magFilter = THREE.NearestFilter;
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: alertTex, depthTest: false, transparent: true }));
    s.scale.set(0.7, 1.4, 1); s.renderOrder = 10;
    return s;
  };
  M.targetDot = function () {
    if (!dotTex) {
      const c = document.createElement('canvas'); c.width = 4; c.height = 4;
      const g = c.getContext('2d'); g.fillStyle = '#ff1e1e'; g.fillRect(1, 1, 2, 2);
      dotTex = new THREE.CanvasTexture(c); dotTex.magFilter = THREE.NearestFilter;
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, depthTest: false, transparent: true, sizeAttenuation: false }));
    s.scale.set(0.012, 0.012, 1); s.renderOrder = 11;
    return s;
  };

  CC.Models = M;
})();

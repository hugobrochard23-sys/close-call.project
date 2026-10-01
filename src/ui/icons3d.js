/* v045 : ICONES EN VRAIE 3D. Chaque icône est un petit modèle (boîtes, cylindres, tores, extrusions biseautées) éclairé comme une figurine — lumière chaude de
 * face, reflets spéculaires sur le laiton et l'acier, ombres douces au creux — rendu UNE fois en 192×192 par un rendu three.js hors écran, puis copié dans un
 * canevas 2D mis en cache. L'interface les affiche lissées, à n'importe quelle taille. Le rendu hors écran est détruit quand la file est vide (pas de contexte
 * WebGL de plus en mémoire). Palette : acier froid + laiton + blanc cassé, un peu de brique : la même que l'interface et les décors. */
(function () {
  const T = THREE, SIZE = 192;
  const cache = {}, queue = [];
  let renderer = null, pending = 0, failed = false;
  const M = (c, sp, sh, em) => new T.MeshPhongMaterial({ color: c, specular: sp || '#ffffff', shininess: sh || 40, emissive: em || '#000000' });
  const steel = () => M('#aab4bf', '#ffffff', 90), steelD = () => M('#6c7885', '#aab4bf', 60), brass = () => M('#c9983f', '#ffe8a8', 80), brassD = () => M('#9a7126', '#e8c880', 60),
    cream = () => M('#e8ecef', '#ffffff', 50), dark = () => M('#2b323a', '#6c7885', 30), brick = () => M('#a8473f', '#e8a090', 45), glass = () => M('#8fb4c8', '#ffffff', 120, '#1c3a4a'),
    glow = () => M('#ffb04a', '#ffffff', 10, '#ff9a2a');
  const mesh = (g, m, x, y, z) => { const o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); return o; };
  const box = (w, h, d, m, x, y, z) => mesh(new T.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (r, h, m, x, y, z, seg, r2) => mesh(new T.CylinderGeometry(r2 === undefined ? r : r2, r, h, seg || 28), m, x, y, z);
  const ext = (shape, depth, bevel, m) => { const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 16 }); g.center(); return new T.Mesh(g, m); };
  const poly = (pts) => { const s = new T.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
  const hole = (s, r) => { const h = new T.Path(); h.absarc(0, 0, r, 0, Math.PI * 2, true); s.holes.push(h); return s; };

  const MODELS = {
    wrench() {
      const g = new T.Group(), s = steel();
      g.add(cyl(0.27, 2.5, s, 0, 0, 0, 24));
      const head = new T.Group(); head.position.y = 1.45;
      head.add(box(1.5, 0.65, 0.55, s, 0, -0.05, 0)); head.add(box(0.5, 0.95, 0.55, s, -0.5, 0.55, 0)); head.add(box(0.5, 0.95, 0.55, s, 0.5, 0.55, 0));
      g.add(head);
      const tail = new T.Group(); tail.position.y = -1.45;
      tail.add(mesh(new T.TorusGeometry(0.55, 0.26, 14, 24), s)); g.add(tail);
      g.add(cyl(0.23, 0.35, brass(), 0, 0.3, 0, 24));
      g.rotation.z = -0.75; return g;
    },
    pin() {
      const g = new T.Group();
      g.add(mesh(new T.SphereGeometry(0.85, 32, 24), brass(), 0, 0.7, 0));
      const c = cyl(0.82, 1.5, brass(), 0, -0.45, 0, 32, 0.02); c.rotation.z = Math.PI; g.add(c);
      g.add(mesh(new T.SphereGeometry(0.32, 20, 16), dark(), 0, 0.72, 0.62));
      g.add(mesh(new T.SphereGeometry(0.2, 16, 12), cream(), 0, 0.74, 0.8));
      return g;
    },
    shop() {
      const g = new T.Group();
      g.add(box(2.2, 1.35, 1.7, cream(), 0, 0.68, 0));
      g.add(box(2.45, 0.16, 1.95, steelD(), 0, 1.43, 0));
      g.add(box(0.7, 1.0, 0.1, brassD(), 0.55, 0.52, 0.86));
      g.add(box(0.9, 0.62, 0.1, glass(), -0.5, 0.8, 0.86)); g.add(box(1.0, 0.07, 0.16, steelD(), -0.5, 0.46, 0.92));
      const aw = new T.Group(); aw.position.set(0, 1.3, 1.08); aw.rotation.x = 0.55;
      for (let i = 0; i < 7; i++) aw.add(box(0.36, 0.08, 0.95, i % 2 ? cream() : brick(), -1.08 + i * 0.36, 0, 0));
      g.add(aw);
      g.add(box(0.9, 0.22, 0.1, brass(), 0, 1.75, 0.2)); g.add(cyl(0.05, 0.5, steel(), -0.3, 1.62, 0.2, 8)); g.add(cyl(0.05, 0.5, steel(), 0.3, 1.62, 0.2, 8));
      return g;
    },
    engine() {
      const g = new T.Group(), s = steel(); g.rotation.z = 0.05;
      const b = cyl(0.72, 1.7, s, 0, 0, 0, 32); b.rotation.z = Math.PI / 2; g.add(b);
      const band = mesh(new T.TorusGeometry(0.73, 0.12, 12, 32), brass(), 0.1, 0, 0); band.rotation.y = Math.PI / 2; g.add(band);
      const n = cyl(0.82, 0.8, dark(), -1.2, 0, 0, 32, 0.55); n.rotation.z = Math.PI / 2; g.add(n);
      const f = cyl(0.5, 0.06, glow(), -1.62, 0, 0, 24); f.rotation.z = Math.PI / 2; g.add(f);
      const cap = cyl(0.55, 0.35, steelD(), 1.0, 0, 0, 28, 0.4); cap.rotation.z = Math.PI / 2; g.add(cap);
      g.add(box(0.5, 0.5, 0.9, steelD(), 0.1, 0.78, 0));
      g.rotation.y = -0.5; return g;
    },
    boost() {
      const g = new T.Group();
      for (const z of [-0.55, 0.55]) {
        const b = cyl(0.42, 1.5, steel(), 0, 0, z, 28); b.rotation.z = Math.PI / 2; g.add(b);
        const n = cyl(0.5, 0.45, dark(), -0.95, 0, z, 28, 0.35); n.rotation.z = Math.PI / 2; g.add(n);
        const f = cyl(0.3, 0.05, glow(), -1.2, 0, z, 20); f.rotation.z = Math.PI / 2; g.add(f);
        const tip = cyl(0.42, 0.5, brass(), 1.0, 0, z, 28, 0.08); tip.rotation.z = -Math.PI / 2; g.add(tip);
        const band = mesh(new T.TorusGeometry(0.43, 0.07, 10, 28), brassD(), 0.25, 0, z); band.rotation.y = Math.PI / 2; g.add(band);
      }
      g.add(box(0.3, 0.25, 1.5, steelD(), 0.1, 0.4, 0));
      g.rotation.y = -0.5; return g;
    },
    body() {
      const g = new T.Group();
      const b = cyl(0.62, 2.0, cream(), 0, 0, 0, 32); b.rotation.z = Math.PI / 2; g.add(b);
      const st = cyl(0.64, 0.3, brass(), -0.1, 0, 0, 32); st.rotation.z = Math.PI / 2; g.add(st);
      const nose = cyl(0.62, 0.9, brick(), 1.45, 0, 0, 32, 0.05); nose.rotation.z = -Math.PI / 2; g.add(nose);
      for (const a of [0, 1.5708, 3.1416, 4.7124]) { const f = box(0.7, 0.05, 0.5, steelD(), -0.95, 0, 0); f.rotation.x = a; f.position.y = Math.cos(a) * 0.72; f.position.z = Math.sin(a) * 0.72; g.add(f); }
      g.add(mesh(new T.SphereGeometry(0.18, 16, 12), glass(), 0.5, 0.44, 0.4));
      g.rotation.y = -0.5; g.rotation.z = 0.08; return g;
    },
    paint() {
      const g = new T.Group();
      g.add(cyl(0.62, 1.5, steel(), 0, 0, 0, 32));
      g.add(cyl(0.64, 0.5, brass(), 0, 0.15, 0, 32)); g.add(cyl(0.64, 0.12, cream(), 0, -0.2, 0, 32));
      g.add(cyl(0.63, 0.08, steelD(), 0, 0.5, 0, 32));
      g.add(cyl(0.62, 0.3, steelD(), 0, 0.9, 0, 32, 0.46)); g.add(cyl(0.2, 0.28, dark(), 0, 1.2, 0, 16)); g.add(cyl(0.07, 0.3, cream(), 0.12, 1.35, 0.2, 10));
      g.rotation.y = -0.5; return g;
    },
    nut() {
      const g = new T.Group(), sh = new T.Shape();
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3, x = Math.cos(a), y = Math.sin(a); if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
      sh.closePath(); hole(sh, 0.45);
      const n = ext(sh, 0.45, 0.1, brass()); n.rotation.x = -0.75; n.rotation.y = -0.5; g.add(n);
      return g;
    },
    trophy() {
      const g = new T.Group(), pts = [[0.001, -0.6], [0.55, -0.6], [0.58, -0.3], [0.45, 0.35], [0.8, 0.95], [0.9, 1.45], [0.78, 1.45], [0.7, 1.0], [0.001, 1.0]].map(([r, y]) => new T.Vector2(r, y));
      g.add(mesh(new T.LatheGeometry(pts, 36), brass(), 0, 0, 0));
      const cup = mesh(new T.LatheGeometry([[0.001, 0.4], [0.35, 0.4], [0.82, 1.45], [0.001, 1.45]].map(([r, y]) => new T.Vector2(r, y)), 36), brass(), 0, 0, 0); g.add(cup);
      for (const sd of [-1, 1]) { const h = mesh(new T.TorusGeometry(0.42, 0.09, 10, 24, Math.PI), brass(), sd * 0.78, 1.0, 0); h.rotation.z = sd > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(h); }
      g.add(cyl(0.18, 0.5, brass(), 0, -0.85, 0, 20)); g.add(box(1.3, 0.28, 0.85, dark(), 0, -1.25, 0)); g.add(box(0.8, 0.1, 0.05, brass(), 0, -1.22, 0.45));
      g.rotation.y = -0.4; return g;
    },
    gear() {
      const g = new T.Group(), pts = [], N = 10;
      for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, w = Math.PI / N * 0.5; for (const [da, r] of [[-w * 1.5, 0.82], [-w * 0.8, 1.0], [w * 0.8, 1.0], [w * 1.5, 0.82]]) pts.push([Math.cos(a + da) * r, Math.sin(a + da) * r]); }
      const s = poly(pts); hole(s, 0.36);
      const m = ext(s, 0.4, 0.07, steel()); m.rotation.x = -0.7; m.rotation.y = -0.5; g.add(m);
      return g;
    },
    tank() {
      const g = new T.Group();
      g.add(box(1.25, 1.55, 0.7, steelD(), 0, 0, 0)); g.add(box(1.25, 0.2, 0.7, steel(), 0, 0.85, 0)); g.add(box(1.0, 0.7, 0.05, brass(), 0, -0.1, 0.38));
      g.add(cyl(0.2, 0.3, brass(), 0.35, 1.1, 0, 20)); const h = mesh(new T.TorusGeometry(0.28, 0.07, 10, 20, Math.PI), steel(), -0.25, 0.97, 0); g.add(h);
      g.rotation.y = -0.5; return g;
    },
    shield() {
      const s = poly([[-0.9, 0.9], [0.9, 0.9], [0.9, 0.1], [0.5, -0.65], [0, -1.05], [-0.5, -0.65], [-0.9, 0.1]]);
      const g = new T.Group(), m = ext(s, 0.3, 0.1, steel()); g.add(m);
      const i = ext(poly([[-0.5, 0.55], [0.5, 0.55], [0.5, 0.05], [0, -0.6], [-0.5, 0.05]]), 0.3, 0.05, brass()); i.position.z = 0.22; g.add(i);
      g.rotation.y = -0.4; g.rotation.x = 0.1; return g;
    },
    bolt() {
      const s = poly([[0.15, 1.15], [-0.7, -0.1], [-0.12, -0.1], [-0.3, -1.15], [0.7, 0.2], [0.12, 0.2], [0.55, 1.15]]);
      const g = new T.Group(); g.add(ext(s, 0.35, 0.08, brass())); g.rotation.y = -0.4; return g;
    },
    star() {
      const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.5 : 1.1; pts.push([Math.cos(a) * r, -Math.sin(a) * r]); }
      const g = new T.Group(), m = ext(poly(pts), 0.35, 0.1, brass()); m.rotation.y = -0.4; g.add(m); return g;
    },
    lock() {
      const g = new T.Group();
      const sh = mesh(new T.TorusGeometry(0.48, 0.14, 12, 24, Math.PI), steel(), 0, 0.5, 0); g.add(sh);
      g.add(box(1.6, 1.2, 0.8, brass(), 0, -0.2, 0)); { const kh = cyl(0.12, 0.1, dark(), 0, -0.1, 0.42, 16); kh.rotation.x = Math.PI / 2; g.add(kh); } g.add(box(0.1, 0.35, 0.1, dark(), 0, -0.3, 0.42));
      g.rotation.y = -0.45; return g;
    },
    rocket_big() {
      const g = new T.Group();
      g.add(box(5.2, 0.18, 1.5, dark(), 0, -0.95, 0));
      for (let i = -2; i <= 2; i++) g.add(box(0.5, 0.2, 1.52, i % 2 ? steelD() : brass(), i * 1.0, -0.95, 0));
      const b = cyl(0.72, 2.7, cream(), 0.2, 0, 0, 36); b.rotation.z = Math.PI / 2; g.add(b);
      const st = cyl(0.74, 0.34, brass(), -0.2, 0, 0, 36); st.rotation.z = Math.PI / 2; g.add(st);
      const st2 = cyl(0.74, 0.1, steelD(), 0.9, 0, 0, 36); st2.rotation.z = Math.PI / 2; g.add(st2);
      const nose = cyl(0.72, 1.2, brick(), 2.15, 0, 0, 36, 0.06); nose.rotation.z = -Math.PI / 2; g.add(nose);
      const noz = cyl(0.55, 0.7, dark(), -1.45, 0, 0, 32, 0.4); noz.rotation.z = Math.PI / 2; g.add(noz);
      const fl = cyl(0.36, 0.9, glow(), -2.05, 0, 0, 24, 0.02); fl.rotation.z = Math.PI / 2; g.add(fl);
      for (const a of [0, 1.5708, 3.1416, 4.7124]) { const f = box(0.9, 0.06, 0.7, steelD(), -1.0, 0, 0); f.position.y = Math.cos(a) * 0.95; f.position.z = Math.sin(a) * 0.95; f.rotation.x = a; g.add(f); }
      g.add(mesh(new T.SphereGeometry(0.2, 16, 12), glass(), 0.7, 0.55, 0.45));
      g.rotation.y = -0.55; g.rotation.x = 0.05; return g;
    },
    rocket() {
      const g = new T.Group();
      const b = cyl(0.55, 2.0, cream(), 0, 0, 0, 32); g.add(b);
      g.add(cyl(0.57, 0.28, brass(), 0, -0.2, 0, 32));
      g.add(cyl(0.55, 0.95, brick(), 0, 1.45, 0, 32, 0.05));
      for (const a of [0, 1.5708, 3.1416, 4.7124]) { const f = box(0.14, 0.7, 0.55, steelD(), Math.cos(a) * 0.7, -0.85, Math.sin(a) * 0.7); f.rotation.y = -a; g.add(f); }
      g.add(cyl(0.38, 0.35, dark(), 0, -1.15, 0, 24, 0.28)); g.add(cyl(0.02, 0.8, glow(), 0, -1.7, 0, 16, 0.3));
      g.add(mesh(new T.SphereGeometry(0.2, 16, 12), glass(), 0, 0.45, 0.5));
      g.rotation.z = -0.5; g.rotation.x = 0.35; return g;
    },
  };

  function ensureRenderer() {
    if (renderer) return renderer;
    renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE, false); renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
    return renderer;
  }
  function build(name, rotY) {
    const r = ensureRenderer(), scene = new T.Scene(), obj = MODELS[name]();
    if (rotY !== undefined) { const w = new T.Group(); w.add(obj); w.rotation.y = rotY; scene.add(w); } else scene.add(obj);
    scene.add(new T.HemisphereLight(0xdde6ee, 0x2e353d, 0.75));
    const key = new T.DirectionalLight(0xfff0d8, 1.05); key.position.set(3, 5, 4); scene.add(key);
    const fill = new T.DirectionalLight(0x9fb4cc, 0.45); fill.position.set(-4, 1.5, 2); scene.add(fill);
    const rim = new T.DirectionalLight(0xffffff, 0.5); rim.position.set(-2, 3, -4); scene.add(rim);
    const box3 = new T.Box3().setFromObject(obj), c = box3.getCenter(new T.Vector3()), sz = box3.getSize(new T.Vector3());
    const m = rotY !== undefined ? Math.hypot(sz.x, sz.z) * 0.62 + Math.max(sz.y * 0.3, 0.2) : Math.max(sz.x, sz.y, sz.z) * 0.62 + 0.15;   // rotation : cadrage fixe (pas de zoom qui saute d'une image à l'autre)
    obj.position.sub(c);
    const cam = new T.OrthographicCamera(-m, m, m, -m, 0.1, 50); cam.position.set(3.4, 3.1, 5); cam.lookAt(0, 0, 0);
    r.render(scene, cam);
    const out = document.createElement('canvas'); out.width = out.height = SIZE; out.getContext('2d').drawImage(r.domElement, 0, 0, SIZE, SIZE);
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return out;
  }
  const NAMES = Object.keys(MODELS);
  function step() {
    if (failed) return;
    const next = queue.shift();
    if (!next) { if (renderer) { try { renderer.forceContextLoss(); renderer.dispose(); } catch (e) { /* ignoré */ } renderer = null; } return; }
    try { cache[next.key] = build(next.name, next.rot); } catch (e) { failed = true; return; }
    setTimeout(step, 0);
  }
  const Icons3D = {
    ready: (n) => !!cache[n],
    get(n) { return cache[n] || null; },
    // met toutes les icônes en file (une par tâche : pas de gros blocage au premier affichage)
    prewarm() { if (this.started) return; this.started = true; for (const n of NAMES) queue.push({ key: n, name: n }); for (let i = 0; i < 12; i++) queue.push({ key: 'shop@' + i, name: 'shop', rot: -0.1 + 0.55 * Math.sin(i / 12 * Math.PI * 2) }); setTimeout(step, 50); },
    names: NAMES,
  };
  CC.Icons3D = Icons3D;
})();

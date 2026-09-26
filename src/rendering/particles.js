/* Particules voxel instanciées (cubes et quads face caméra).
 * Aspect OBSERVÉ : flamme en gros cubes jaune→orange→rouge, fumée en cubes blancs, débris gris, éclats de verre.
 * Refonte visuelle (design) : transparence par particule, pools additifs (flamme, étincelles, éclairs), effacement près de
 * la caméra (la fumée et la flamme ne bouchent plus la vue), vent + turbulence + poussée d'Archimède pour la fumée,
 * explosions en étapes (éclair, noyau, boule de feu, étincelles, onde de choc, fumée, débris fumants, résidus, trace au sol),
 * propulsion en couches. Hasard visuel tiré de U.fx : n'influence jamais le gameplay (banc de test reproductible). */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new V(), _c = new THREE.Color(), _p = new V();
  const _z = new V(0, 0, 1), _e = new THREE.Euler(), _q2 = new THREE.Quaternion(), _w = new V();

  // Transparence par instance : attribut `iAlpha` injecté dans le shader de three (r149 : output_fragment).
  function withInstanceAlpha(material) {
    material.transparent = true; material.depthWrite = false;
    material.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float iAlpha;\nvarying float vIAlpha;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvIAlpha = iAlpha;');
      sh.fragmentShader = 'varying float vIAlpha;\n' + sh.fragmentShader.replace('#include <output_fragment>', '#include <output_fragment>\ngl_FragColor.a *= vIAlpha;');
    };
    material.customProgramCacheKey = () => 'iAlpha';
    return material;
  }

  class ParticlePool {
    /* o = { max, geometry:'box'|'plane', material, billboard, stretch, alpha, additive, camFade:[près, loin], castShadow } */
    constructor(scene, o) {
      this.max = o.max;
      const geo = o.geometry === 'plane' ? new THREE.PlaneGeometry(1, 1) : new THREE.BoxGeometry(1, 1, 1);
      const mat = o.material;
      if (o.additive) { mat.blending = THREE.AdditiveBlending; }
      this.alpha = !!(o.alpha || o.additive);
      if (this.alpha) {
        withInstanceAlpha(mat);
        this.iAlpha = new THREE.InstancedBufferAttribute(new Float32Array(this.max), 1);
        this.iAlpha.setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute('iAlpha', this.iAlpha);
      }
      this.mesh = new THREE.InstancedMesh(geo, mat, this.max);
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
      this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      this.mesh.count = 0;
      this.mesh.frustumCulled = false;
      this.mesh.castShadow = !!o.castShadow;
      this.mesh.renderOrder = o.renderOrder || (this.alpha ? 3 : 0);
      scene.add(this.mesh);
      this.billboard = !!o.billboard; this.stretch = o.stretch || 0;
      this.camFade = o.camFade || null;
      this.p = [];
      for (let i = 0; i < this.max; i++) this.p.push({ pos: new V(), vel: new V(), rot: new V(), spin: new V(), age: 0, life: 1, s0: 1, s1: 1, s2: 1, cols: null, grav: 0, drag: 0, alive: false, roll: 0, a: 1, fin: 0, fout: 0.5, wind: 0, turb: 0, sx: 1, sy: 1 });
      this.n = 0;
    }

    /* e = { pos, vel, life, s0 (taille début), s1 (taille pic), s2 (taille fin), peak (0..1), cols:[THREE.Color...], grav, drag, spin,
     *       a (opacité max), fin (fraction du temps de vie pour apparaître), fout (début de l'effacement), wind, turb, sx/sy (étirement) } */
    emit(e) {
      if (this.n >= this.max) return null;
      const p = this.p[this.n++];
      const r = U.fx;
      p.pos.copy(e.pos); p.vel.copy(e.vel || _p.set(0, 0, 0));
      p.age = 0; p.life = e.life; p.s0 = e.s0; p.s1 = e.s1 === undefined ? e.s0 : e.s1; p.s2 = e.s2 === undefined ? p.s1 : e.s2;
      p.peak = e.peak === undefined ? 0.3 : e.peak;
      p.cols = e.cols; p.grav = e.grav || 0; p.drag = e.drag || 0;
      p.rot.set(r() * 6.28, r() * 6.28, r() * 6.28);
      const sp = e.spin || 0;
      p.spin.set((r() - 0.5) * sp, (r() - 0.5) * sp, (r() - 0.5) * sp);
      p.roll = r() * 6.28;
      p.stretch = e.stretch || this.stretch;
      p.a = e.a === undefined ? 1 : e.a; p.fin = e.fin || 0; p.fout = e.fout === undefined ? 0.45 : e.fout;
      p.wind = e.wind || 0; p.turb = e.turb || 0;
      p.sx = e.sx || 1; p.sy = e.sy || 1;
      return p;
    }

    update(dt, camera, wind) {
      const P = this.p, r = U.fx;
      let i = 0;
      while (i < this.n) {
        const p = P[i];
        p.age += dt;
        if (p.age >= p.life) { const last = P[this.n - 1]; P[this.n - 1] = p; P[i] = last; this.n--; continue; }
        if (p.drag) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
        p.vel.y -= p.grav * dt;
        if (p.turb) { const k = p.turb * dt; p.vel.x += (r() - 0.5) * k; p.vel.y += (r() - 0.5) * k * 0.6; p.vel.z += (r() - 0.5) * k; }
        p.pos.addScaledVector(p.vel, dt);
        if (p.wind && wind) p.pos.addScaledVector(wind, p.wind * dt);
        p.rot.addScaledVector(p.spin, dt);
        i++;
      }
      const inst = this.mesh, cf = this.camFade, cp = camera.position;
      for (let k = 0; k < this.n; k++) {
        const p = P[k];
        const t = p.age / p.life;
        const size = t < p.peak ? U.lerp(p.s0, p.s1, t / p.peak) : U.lerp(p.s1, p.s2, (t - p.peak) / (1 - p.peak));
        if (this.billboard) {
          _q.copy(camera.quaternion);
          _q.multiply(_q2.setFromAxisAngle(_z, p.roll));
          _s.set(size * p.sx, size * p.sy, size);
        } else if (p.stretch) {
          const sp = p.vel.length();
          if (sp > 0.01) _q.setFromUnitVectors(_z, _p.copy(p.vel).divideScalar(sp)); else _q.identity();
          _s.set(size, size, size + sp * p.stretch);
        } else {
          _q.setFromEuler(_e.set(p.rot.x, p.rot.y, p.rot.z));
          _s.set(size, size, size);
        }
        _m.compose(p.pos, _q, _s);
        inst.setMatrixAt(k, _m);
        const cols = p.cols;
        if (cols.length === 1) _c.copy(cols[0]);
        else { const f = Math.min(0.999, t) * (cols.length - 1), j = Math.floor(f); _c.copy(cols[j]).lerp(cols[j + 1], f - j); }
        inst.setColorAt(k, _c);
        if (this.alpha) {
          let a = p.a;
          if (p.fin > 0 && t < p.fin) a *= t / p.fin;
          if (t > p.fout) a *= 1 - (t - p.fout) / (1 - p.fout);
          if (cf) { const d = p.pos.distanceTo(cp) - size * 0.5; a *= U.smooth(cf[0], cf[1], d); }
          this.iAlpha.array[k] = a;
        }
      }
      inst.count = this.n;
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      if (this.alpha) this.iAlpha.needsUpdate = true;
    }

    clear() { this.n = 0; this.mesh.count = 0; }
    dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); }
  }

  // Texture radiale douce (trace de brûlure au sol, halo d'éclair) : dessinée une fois.
  function radialTexture(stops, size) {
    const c = document.createElement('canvas'); c.width = c.height = size || 64;
    const g = c.getContext('2d'), h = c.width / 2;
    const gr = g.createRadialGradient(h, h, 0, h, h, h);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  /* Ensemble des systèmes de particules du jeu + effets prêts à l'emploi. */
  class Effects {
    constructor(scene) {
      this.scene = scene;
      const C = (h) => new THREE.Color(h);
      this.pal = {
        flame: [C('#fff27a'), C('#ffbe1e'), C('#ff8a18'), C('#ff5a12'), C('#e03a0e'), C('#b8260a')],    // OBSERVÉ
        flameCore: [C('#ffffff'), C('#fff6c8'), C('#ffe070')],
        flameOuter: [C('#ffb020'), C('#ff6a14'), C('#d8340c'), C('#7a1a08')],
        retro: [C('#fff27a'), C('#ffb020'), C('#ff6a14')],
        smoke: [C('#ffffff'), C('#ececec'), C('#d6d6d6')],
        exhaustSmoke: [C('#fff0d8'), C('#dcdad6'), C('#bdbcba'), C('#a9a8a6')],
        spark: [C('#fff64a'), C('#f5e21b')],
        ember: [C('#fffbe0'), C('#ffd040'), C('#ff7a18'), C('#b83008')],
        boomQuad: [C('#ffb020'), C('#ff7a14'), C('#ff4a10')],
        fireball: [C('#ffffff'), C('#fff2a0'), C('#ffc030'), C('#ff7818'), C('#e0420e'), C('#6a1a0a')],
        debris: [C('#2c2c2c'), C('#4a4a4a')],
        debrisLight: [C('#6d6d6d'), C('#8a8a8a')],
        greySmoke: [C('#9a9a9a'), C('#7a7a7a'), C('#5a5a5a')],
        blackSmoke: [C('#4a4038'), C('#2e2a28'), C('#3a3836'), C('#5a5856')],
        dust: [C('#b8a68c'), C('#9a8c78'), C('#8a8278')],
        streak: [C('#fff45a'), C('#ffe03a')],
        cyan: [C('#9ff4ff'), C('#39d4ff'), C('#1aa8e8')],
        cyanCore: [C('#ffffff'), C('#c8f8ff'), C('#5adcff'), C('#1a88c8')],
        white: [C('#ffffff'), C('#e8e8e8')],
        glass: [C('#bfe8ff'), C('#7fc4ef')],
        glassWarm: [C('#e8dc8a'), C('#b8a860')],
        brick: [C('#b8301d'), C('#9e1b15'), C('#d56229')],
        planks: [C('#e08a2a'), C('#a05a1a')],
        whiteSmoke: [C('#f4f4f4'), C('#dcdcdc')],
        muzzle: [C('#ffffff'), C('#fff0a0'), C('#ffa030'), C('#ff5a10')],
      };
      const add = (color) => new THREE.MeshBasicMaterial({ color: color || '#ffffff', fog: true });
      // flamme de la roquette et boules de feu : additif (lumineux, se mélange), effacé à moins de ~1 m de la caméra
      this.flame = new ParticlePool(scene, { max: 1400, material: add(), additive: true, camFade: [0.75, 1.7] });
      // cœur blanc de la flamme, éclairs de bouche : additif, plus petit
      this.glow = new ParticlePool(scene, { max: 300, material: add(), additive: true, camFade: [0.5, 1.6] });
      // fumée : cubes translucides éclairés (Lambert) → volume ombré, effacée près de la caméra
      this.smoke = new ParticlePool(scene, { max: 1600, material: new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#6a6a6a' }), alpha: true, camFade: [1.8, 6], renderOrder: 2 });
      this.darkSmoke = new ParticlePool(scene, { max: 700, material: new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#1a1816' }), alpha: true, camFade: [1.5, 5], renderOrder: 2 });
      this.sparks = new ParticlePool(scene, { max: 700, material: add(), additive: true });
      this.quads = new ParticlePool(scene, { max: 160, geometry: 'plane', billboard: true, material: new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]) }), additive: true, camFade: [1, 4] });
      this.debris = new ParticlePool(scene, { max: 800, material: new THREE.MeshLambertMaterial(), castShadow: true });
      this.streaks = new ParticlePool(scene, { max: 240, stretch: 0.012, material: add(), additive: true });
      this.shards = new ParticlePool(scene, { max: 700, material: new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.7 }) });
      this.pools = [this.flame, this.glow, this.smoke, this.darkSmoke, this.sparks, this.quads, this.debris, this.streaks, this.shards];
      this.lights = [];
      for (let i = 0; i < 4; i++) {
        const l = new THREE.PointLight('#ffffff', 0, 30, 1.6);
        scene.add(l);
        this.lights.push({ light: l, life: 1, age: 1, i0: 0, c0: new THREE.Color(), c1: new THREE.Color() });
      }
      // ondes de choc (anneaux plats) et traces de brûlure au sol : petits pools d'objets réutilisés
      this.rings = [];
      const ringGeo = new THREE.RingGeometry(0.7, 1, 40);
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#fff2d0', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        m.visible = false; m.renderOrder = 4; scene.add(m);
        this.rings.push({ mesh: m, age: 1, life: 1, r0: 1, r1: 2, a: 0 });
      }
      this.decals = [];
      const scorch = radialTexture([[0, 'rgba(10,8,6,0.95)'], [0.45, 'rgba(20,16,12,0.75)'], [0.8, 'rgba(30,26,22,0.25)'], [1, 'rgba(0,0,0,0)']], 64);
      const decalGeo = new THREE.PlaneGeometry(1, 1);
      for (let i = 0; i < 10; i++) {
        const m = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: scorch, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
        m.visible = false; m.renderOrder = 1; scene.add(m);
        this.decals.push({ mesh: m, age: 99, life: 12 });
      }
      this.smokers = [];     // débris qui brûlent et laissent un filet de fumée
      this.emitters = [];    // colonnes de fumée résiduelles (quelques secondes après une explosion)
      this.wind = new V(1.6, 0, -0.6);   // vent léger commun : toutes les fumées dérivent dans le même sens
    }

    update(dt, camera) {
      this.updateSmokers(dt);
      for (const p of this.pools) p.update(dt, camera, this.wind);
      this.updateLights(dt); this.updateRings(dt); this.updateDecals(dt);
    }
    clear() {
      for (const p of this.pools) p.clear();
      for (const L of this.lights) { L.age = L.life; L.light.intensity = 0; }
      for (const R of this.rings) { R.age = R.life; R.mesh.visible = false; }
      for (const D of this.decals) { D.age = D.life; D.mesh.visible = false; }
      this.smokers.length = 0; this.emitters.length = 0;
    }

    // Pool fixe de lumières (ajouter/retirer des lumières forcerait la recompilation des shaders).
    // c1 (facultatif) : couleur de fin — une explosion passe du blanc à l'orange sombre en s'éteignant.
    flash(pos, color, intensity, dist, life, color1) {
      let L = null;
      for (const c of this.lights) if (!L || c.age / c.life > L.age / L.life) L = c;
      L.light.position.copy(pos); L.c0.set(color); L.c1.set(color1 || color); L.light.color.copy(L.c0); L.light.distance = dist;
      L.i0 = intensity; L.life = life; L.age = 0; L.light.intensity = intensity;
    }
    updateLights(dt) {
      for (const L of this.lights) {
        L.age += dt;
        const k = Math.min(1, L.age / L.life);
        L.light.intensity = L.i0 * Math.pow(1 - k, 1.6) * (k < 1 ? 0.9 + U.fx() * 0.2 : 0);   // décroissance rapide + scintillement
        L.light.color.copy(L.c0).lerp(L.c1, k);
      }
    }

    ring(pos, normal, r0, r1, life, color, a) {
      let R = this.rings[0];
      for (const c of this.rings) if (c.age / c.life > R.age / R.life) R = c;
      R.mesh.position.copy(pos);
      R.mesh.quaternion.setFromUnitVectors(_z, _p.copy(normal || _w.set(0, 1, 0)).normalize());
      R.mesh.material.color.set(color || '#fff2d0');
      R.age = 0; R.life = life; R.r0 = r0; R.r1 = r1; R.a = a === undefined ? 0.8 : a;
      R.mesh.visible = true;
    }
    updateRings(dt) {
      for (const R of this.rings) {
        if (!R.mesh.visible) continue;
        R.age += dt;
        const k = R.age / R.life;
        if (k >= 1) { R.mesh.visible = false; continue; }
        const e = 1 - Math.pow(1 - k, 3);                     // expansion rapide qui ralentit
        R.mesh.scale.setScalar(U.lerp(R.r0, R.r1, e));
        R.mesh.material.opacity = R.a * (1 - k) * (1 - k);
      }
    }

    // Trace de brûlure : posée sur la surface touchée, s'efface lentement.
    scorch(pos, normal, size) {
      if (!normal) return;
      let D = this.decals[0];
      for (const c of this.decals) if (c.age > D.age) D = c;
      D.mesh.position.copy(pos).addScaledVector(normal, 0.04);
      D.mesh.quaternion.setFromUnitVectors(_z, normal);
      D.mesh.rotateZ(U.fx() * 6.28);
      D.mesh.scale.setScalar(size * U.fx.range(0.85, 1.2));
      D.age = 0; D.life = 14; D.mesh.visible = true;
    }
    updateDecals(dt) {
      for (const D of this.decals) {
        if (!D.mesh.visible) continue;
        D.age += dt;
        const k = D.age / D.life;
        if (k >= 1) { D.mesh.visible = false; continue; }
        D.mesh.material.opacity = Math.min(1, D.age * 8) * (1 - U.smooth(0.55, 1, k)) * 0.85;
      }
    }

    // Débris en feu : simulés comme la particule de débris jumelle (même départ, même gravité) et fument pendant leur vol.
    addSmoker(pos, vel, life, grav, drag, burn) {
      if (this.smokers.length > 40) return;
      this.smokers.push({ pos: pos.clone(), vel: vel.clone(), life, age: 0, grav, drag, burn, acc: 0 });
    }
    updateSmokers(dt) {
      const r = U.fx;
      for (let i = this.smokers.length - 1; i >= 0; i--) {
        const s = this.smokers[i];
        s.age += dt;
        if (s.age >= s.life) { this.smokers.splice(i, 1); continue; }
        if (s.drag) s.vel.multiplyScalar(Math.max(0, 1 - s.drag * dt));
        s.vel.y -= s.grav * dt;
        s.pos.addScaledVector(s.vel, dt);
        s.acc += dt;
        const step = 0.028;
        while (s.acc > step) {
          s.acc -= step;
          const fade = 1 - s.age / s.life;
          this.darkSmoke.emit({ pos: s.pos, vel: _p.set(r.range(-0.4, 0.4), r.range(0.3, 1.2), r.range(-0.4, 0.4)), life: r.range(0.7, 1.4), s0: 0.12, s1: r.range(0.35, 0.6) * (0.5 + fade), s2: r.range(0.5, 0.8), peak: 0.35, cols: this.pal.blackSmoke, drag: 1.5, a: 0.55 * fade, fin: 0.1, fout: 0.3, wind: 1, turb: 3, spin: 1.5 });
          if (s.age < s.burn) this.flame.emit({ pos: s.pos, vel: _p.set(0, 0.5, 0), life: r.range(0.08, 0.16), s0: 0.12, s1: 0.22, s2: 0.05, peak: 0.3, cols: this.pal.fireball, a: 0.9, fout: 0.3 });
        }
      }
      // colonnes de fumée résiduelles : quelques bouffées de plus en plus rares
      for (let i = this.emitters.length - 1; i >= 0; i--) {
        const E = this.emitters[i];
        E.age += dt;
        if (E.age >= E.life) { this.emitters.splice(i, 1); continue; }
        E.acc += dt * E.rate * (1 - E.age / E.life);
        while (E.acc > 1) {
          E.acc -= 1;
          const p = _w.copy(E.pos).add(_p.set(r.range(-1, 1), r.range(0, 0.5), r.range(-1, 1)).multiplyScalar(E.spread));
          this.darkSmoke.emit({ pos: p, vel: _p.set(r.range(-0.3, 0.3), r.range(1.2, 2.6), r.range(-0.3, 0.3)), life: r.range(2.2, 3.6), s0: 0.4 * E.size, s1: r.range(1.2, 2) * E.size, s2: r.range(1.8, 2.6) * E.size, peak: 0.45, cols: E.cols, drag: 0.6, a: r.range(0.28, 0.45), fin: 0.12, fout: 0.35, wind: 1.3, turb: 1.5, spin: 0.6 });
        }
      }
    }

    /* Propulsion de la roquette (appelée pour chaque point émis le long du trajet de la tuyère) : 4 couches.
     * noz : position ; dir : avant de la roquette ; vel : vitesse ; k : intensité (1 = plein régime) ; near : 0..1, part du
     * premier point (le plus proche de la tuyère, reçoit le cœur blanc). */
    exhaust(noz, dir, vel, k, flicker) {
      const r = U.fx, F = this.flame;
      // vitesse monde = vitesse de la roquette − vitesse d'éjection : le panache reste attaché à la tuyère (comme un vrai
      // jet), compact (≈ 1 m), au lieu d'une traînée de 7 m que la caméra traverserait
      const jet = (a, b, inherit) => _p.copy(vel).multiplyScalar(inherit).addScaledVector(dir, -r.range(a, b)).add(_w.set(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(0.9));
      const s = (0.085 + 0.04 * flicker) * k;
      F.emit({ pos: noz, vel: jet(5, 9, 0.98), life: r.range(0.07, 0.12), s0: s * 0.7, s1: s * r.range(1.1, 1.5), s2: s * 0.25, peak: 0.22, cols: this.pal.flame, drag: 1.5, a: 0.7, fout: 0.35, spin: 8 });
      // enveloppe extérieure : plus grosse, plus sombre, décroche un peu (s'étire derrière dans les virages)
      if (r() < 0.5) F.emit({ pos: noz, vel: jet(4, 7, 0.93), life: r.range(0.1, 0.18), s0: s * 0.8, s1: s * r.range(1.4, 1.9), s2: s * 0.4, peak: 0.3, cols: this.pal.flameOuter, drag: 2, a: 0.22, fin: 0.1, fout: 0.3, spin: 5 });
    }
    // cœur blanc collé à la tuyère + étincelles rapides : une fois par image
    exhaustCore(noz, dir, vel, k, dt) {
      const r = U.fx;
      for (let i = 0; i < 2; i++) {
        this.glow.emit({ pos: _w.copy(noz).addScaledVector(dir, -r.range(0.02, 0.15)), vel: _p.copy(vel).addScaledVector(dir, -r.range(1, 3)), life: r.range(0.03, 0.06), s0: 0.09 * k, s1: r.range(0.12, 0.16) * k, s2: 0.05, peak: 0.3, cols: this.pal.flameCore, a: 0.9, fout: 0.5 });
      }
      const nSp = Math.floor(dt * 70 * k + r());
      for (let i = 0; i < nSp; i++) {
        this.sparks.emit({ pos: noz, vel: _p.copy(dir).multiplyScalar(-r.range(10, 22)).add(_w.set(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(r.range(2, 5))).addScaledVector(vel, 0.75), life: r.range(0.12, 0.3), s0: r.range(0.025, 0.05), s1: 0.04, s2: 0.01, cols: this.pal.ember, drag: 2, grav: 3, a: 1, fout: 0.4 });
      }
    }
    // fumée de propulsion : cubes clairs translucides qui restent dans le monde, gonflent et dérivent → traînée en volume
    exhaustSmoke(p, vel, k) {
      const r = U.fx;
      this.smoke.emit({ pos: p, vel: _p.copy(vel).multiplyScalar(r.range(0.02, 0.08)).add(_w.set(r.range(-1, 1), r.range(-0.6, 1), r.range(-1, 1)).multiplyScalar(r.range(0.4, 1.4))),
        life: r.range(0.7, 1.4), s0: 0.14 * k, s1: r.range(0.45, 0.7) * k, s2: r.range(0.8, 1.2) * k, peak: 0.3, cols: this.pal.exhaustSmoke, drag: 2.2, a: r.range(0.22, 0.36) * k, fin: 0.08, fout: 0.25, wind: 1, turb: 2.5, spin: 1.2 });
    }
    // Compatibilité : ancienne émission par cube (utilisée par d'autres modules éventuels)
    flameCube(pos, dir, rocketVel, scale) { this.exhaust(pos, dir, rocketVel, scale, U.fx()); }
    retroPuff(pos, dir) {
      const r = U.fx;
      this.flame.emit({ pos, vel: dir.clone().multiplyScalar(r.range(10, 16)).add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1))), life: r.range(0.1, 0.16), s0: 0.08, s1: 0.2, s2: 0.05, peak: 0.3, cols: this.pal.retro, drag: 4, a: 0.9, fout: 0.3 });
      if (r() < 0.4) this.smoke.emit({ pos, vel: dir.clone().multiplyScalar(r.range(4, 7)), life: r.range(0.4, 0.7), s0: 0.08, s1: 0.3, s2: 0.4, peak: 0.3, cols: this.pal.exhaustSmoke, drag: 3, a: 0.25, fout: 0.3, wind: 1, turb: 2 });
    }
    smokePuff(pos, vel, size, life) {
      const r = U.fx;
      this.smoke.emit({ pos, vel: vel.clone().add(new V(r.range(-1, 1), r.range(-0.5, 1), r.range(-1, 1)).multiplyScalar(0.9)), life: life || r.range(0.6, 1.1), s0: size * 0.3, s1: size * r.range(0.8, 1.1), s2: size * 1.2, peak: 0.3, cols: this.pal.smoke, drag: 2.5, spin: 1, a: 0.45, fin: 0.1, fout: 0.3, wind: 1, turb: 2 });
    }

    // Tir du lanceur : bouffée de bouche (courte, vers l'avant), souffle arrière (hors de la vue), étincelles, onde de pression.
    launchBurst(pos, dir) {
      const r = U.fx;
      for (let i = 0; i < 26; i++) {
        const fwd = r.range(0.5, 1);
        const v = dir.clone().multiplyScalar(r.range(3, 12) * fwd).add(new V(r.range(-1, 1), r.range(-0.4, 1), r.range(-1, 1)).multiplyScalar(r.range(1, 3)));
        this.smoke.emit({ pos: pos.clone().addScaledVector(dir, r.range(0.8, 2.6)), vel: v, life: r.range(0.6, 1.2), s0: 0.1, s1: r.range(0.35, 0.65), s2: r.range(0.7, 1.1), peak: 0.25, cols: this.pal.smoke, drag: 3.2, spin: 2, a: r.range(0.35, 0.55), fin: 0.05, fout: 0.3, wind: 1, turb: 3 });
      }
      for (let i = 0; i < 90; i++) {
        const v = dir.clone().multiplyScalar(r.range(3, 14)).add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(r.range(3, 10)));
        this.sparks.emit({ pos: pos.clone().addScaledVector(dir, r.range(0.4, 1.6)), vel: v, life: r.range(0.3, 0.8), s0: r.range(0.03, 0.07), s1: r.range(0.04, 0.08), s2: 0.01, cols: this.pal.ember, drag: 1.4, grav: 3, a: 1, fout: 0.5 });
      }
      for (let i = 0; i < 8; i++) this.glow.emit({ pos: pos.clone().addScaledVector(dir, r.range(0.6, 1.4)), vel: dir.clone().multiplyScalar(r.range(2, 6)), life: r.range(0.05, 0.1), s0: 0.25, s1: r.range(0.4, 0.6), s2: 0.1, peak: 0.2, cols: this.pal.muzzle, a: 0.9 });
      // souffle arrière : fumée projetée derrière le tireur (dans le dos de la caméra, visible en se retournant)
      const back = pos.clone().addScaledVector(dir, -2.4);
      for (let i = 0; i < 16; i++) this.smoke.emit({ pos: back.clone().add(new V(r.range(-0.4, 0.4), r.range(-0.2, 0.4), r.range(-0.4, 0.4))), vel: dir.clone().multiplyScalar(-r.range(6, 14)).add(new V(r.range(-1, 1), r.range(0, 1.2), r.range(-1, 1)).multiplyScalar(2)), life: r.range(0.8, 1.5), s0: 0.2, s1: r.range(0.6, 1), s2: 1.3, peak: 0.25, cols: this.pal.smoke, drag: 2.5, a: 0.4, fout: 0.3, wind: 1, turb: 2 });
      this.ring(pos.clone().addScaledVector(dir, 1.2), dir, 0.2, 2.2, 0.22, '#ffffff', 0.35);
      this.flash(pos, '#fff2c0', 4.5, 28, 0.3, '#ff9040');
    }

    /* Éclair de bouche (canon de char, lance-missile ennemi) : cône de flamme bref, fumée qui s'enroule, étincelles, lumière. */
    muzzleFlash(pos, dir, scale) {
      const r = U.fx, k = scale || 1;
      for (let i = 0; i < 10; i++) {
        const f = r.range(0, 1);
        this.glow.emit({ pos: pos.clone().addScaledVector(dir, f * 1.6 * k), vel: dir.clone().multiplyScalar(r.range(4, 12) * k).add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(1.5)), life: r.range(0.05, 0.11), s0: 0.3 * k, s1: (0.7 - f * 0.4) * k, s2: 0.1, peak: 0.2, cols: this.pal.muzzle, a: 1, fout: 0.3 });
      }
      for (let i = 0; i < 18; i++) {
        const side = new V(r.range(-1, 1), r.range(-0.4, 1), r.range(-1, 1)).normalize();
        this.smoke.emit({ pos: pos.clone().addScaledVector(dir, r.range(0.2, 1.2) * k), vel: dir.clone().multiplyScalar(r.range(2, 8) * k).addScaledVector(side, r.range(1, 3.5) * k), life: r.range(0.9, 1.8), s0: 0.2 * k, s1: r.range(0.6, 1) * k, s2: r.range(1.1, 1.6) * k, peak: 0.25, cols: this.pal.greySmoke, drag: 2.4, a: r.range(0.3, 0.5), fin: 0.05, fout: 0.3, wind: 1, turb: 2.5, spin: 1.5 });
      }
      for (let i = 0; i < 24; i++) this.sparks.emit({ pos, vel: dir.clone().multiplyScalar(r.range(8, 22)).add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(r.range(2, 6))), life: r.range(0.15, 0.4), s0: 0.05, s1: 0.05, s2: 0.01, cols: this.pal.ember, drag: 1.5, grav: 6, a: 1, fout: 0.4 });
      this.ring(pos.clone().addScaledVector(dir, 0.4 * k), dir, 0.3 * k, 2.4 * k, 0.2, '#ffe8c0', 0.4);
      this.flash(pos.clone().addScaledVector(dir, 0.8), '#ffe0a0', 6 * k, 26 * k, 0.18, '#ff7020');
    }

    // Poussière soulevée au sol (souffle d'un tir, impact rasant).
    dustKick(pos, normal, amount) {
      const r = U.fx, n = normal || _w.set(0, 1, 0), k = amount || 1;
      for (let i = 0; i < 14 * k; i++) {
        const t = new V(r.range(-1, 1), 0, r.range(-1, 1)).normalize().multiplyScalar(r.range(2, 7));
        this.smoke.emit({ pos: pos.clone().addScaledVector(n, 0.3), vel: t.addScaledVector(n, r.range(0.5, 2)), life: r.range(0.8, 1.6), s0: 0.3, s1: r.range(0.8, 1.4) * k, s2: r.range(1.4, 2) * k, peak: 0.3, cols: this.pal.dust, drag: 2.2, a: r.range(0.25, 0.4), fin: 0.05, fout: 0.3, wind: 1, turb: 2, spin: 1 });
      }
    }

    /* Explosion en étapes. big : cible / roquette ; sinon petit missile. variant : 'orange' | 'cyan' (niveau 2).
     * 1 éclair + lumière qui vire à l'orange, 2 noyau blanc, 3 boule de feu qui monte, 4 étincelles et traits, 5 onde de choc,
     * 6 fumée noire qui s'élève et dérive, 7 débris dont certains brûlent et fument, 8 résidus de fumée, 9 trace au sol.
     * Chaque explosion tire sa taille, sa quantité de fumée, sa durée et la direction de ses projections au hasard. */
    explosion(pos, normal, big, variant) {
      const r = U.fx;
      const cyan = variant === 'cyan';
      const k = (big ? 1 : 0.55) * r.range(0.85, 1.2);
      const smokeK = r.range(0.7, 1.3), debrisK = r.range(0.7, 1.3), dur = r.range(0.85, 1.2);
      const bias = new V(r.range(-0.5, 0.5), r.range(0.1, 0.6), r.range(-0.5, 0.5));   // projections un peu dissymétriques
      const up = normal ? normal.clone() : new V(0, 1, 0);
      // 1-2 : éclair et noyau blanc
      for (let i = 0; i < 3; i++) this.quads.emit({ pos: pos.clone(), vel: new V(), life: r.range(0.06, 0.12), s0: 3 * k, s1: r.range(9, 14) * k, s2: 4 * k, peak: 0.25, cols: cyan ? this.pal.cyanCore : [new THREE.Color('#ffffff'), new THREE.Color('#fff0b0')], a: 1, fout: 0.2 });
      for (let i = 0; i < 16 * k; i++) {
        const v = new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize().multiplyScalar(r.range(3, 9) * k);
        this.glow.emit({ pos: pos.clone(), vel: v, life: r.range(0.12, 0.25) * dur, s0: 0.8 * k, s1: r.range(1.6, 2.6) * k, s2: 0.4 * k, peak: 0.25, cols: cyan ? this.pal.cyanCore : this.pal.flameCore, drag: 5, a: 1, fout: 0.3, spin: 4 });
      }
      // 3 : boule de feu (cubes additifs, montent en ralentissant, passent du blanc au rouge sombre)
      const nFire = Math.round(85 * k);
      for (let i = 0; i < nFire; i++) {
        const d = new V(r.range(-1, 1), r.range(-0.7, 1), r.range(-1, 1)).normalize().add(bias).addScaledVector(up, 0.4).normalize();
        this.flame.emit({ pos: pos.clone().addScaledVector(d, r.range(0, 0.8) * k), vel: d.multiplyScalar(r.range(4, 16) * k), life: r.range(0.35, 0.85) * dur, s0: 0.6 * k, s1: r.range(1.4, 2.8) * k, s2: 0.3 * k, peak: 0.25, cols: cyan ? this.pal.cyanCore : this.pal.fireball, drag: 3.2, grav: -3.5, a: r.range(0.6, 0.95), fout: 0.35, spin: 3 });
      }
      // quads d'origine (OBSERVÉ : grandes taches orange 0,35 s) : moins nombreux, translucides
      const pal = cyan ? this.pal.cyan : this.pal.boomQuad;
      for (let i = 0; i < 8; i++) {
        const v = new V(r.range(-1, 1), r.range(-0.5, 1), r.range(-1, 1)).multiplyScalar(r.range(2, 7));
        this.quads.emit({ pos: pos.clone().add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(1.4 * k)), vel: v, life: r.range(0.25, 0.45) * dur, s0: 2 * k, s1: r.range(4, 7) * k, s2: 1 * k, peak: 0.3, cols: pal, a: 0.7, fout: 0.3 });
      }
      // 4 : étincelles (tombent) et traits rapides
      for (let i = 0; i < 70 * k; i++) {
        const d = new V(r.range(-1, 1), r.range(-0.3, 1), r.range(-1, 1)).normalize().add(bias).normalize();
        if (normal) d.addScaledVector(normal, 0.5).normalize();
        this.sparks.emit({ pos: pos.clone(), vel: d.multiplyScalar(r.range(8, 30) * k), life: r.range(0.4, 1.3), s0: r.range(0.04, 0.09), s1: 0.06, s2: 0.01, cols: this.pal.ember, drag: 1.2, grav: 9, a: 1, fout: 0.5 });
      }
      for (let i = 0; i < 20 * k; i++) {
        this.streaks.emit({ pos: pos.clone(), vel: new V(r.range(-1, 1), r.range(-0.6, 1), r.range(-1, 1)).normalize().multiplyScalar(r.range(40, 85)), life: r.range(0.12, 0.28), s0: 0.06, s1: 0.06, s2: 0.02, cols: cyan ? this.pal.cyan : this.pal.streak, a: 1, fout: 0.3 });
      }
      // 5 : onde de choc (horizontale si rien n'est touché, sinon dans le plan de la surface)
      this.ring(pos.clone(), up, 0.6 * k, r.range(9, 13) * k, r.range(0.35, 0.5), cyan ? '#bff4ff' : '#ffe6c0', 0.45);
      // 6 : fumée noire / grise qui s'élève (Archimède : gravité négative), dérive avec le vent et s'éclaircit
      const smokeCols = cyan ? this.pal.white : this.pal.blackSmoke;
      for (let i = 0; i < 34 * k * smokeK; i++) {
        const d = new V(r.range(-1, 1), r.range(-0.2, 1), r.range(-1, 1)).normalize().add(bias);
        this.darkSmoke.emit({ pos: pos.clone().addScaledVector(d, r.range(0.3, 2) * k), vel: d.multiplyScalar(r.range(2, 7) * k), life: r.range(1.6, 3.2) * dur, s0: 0.6 * k, s1: r.range(1.8, 3.2) * k, s2: r.range(2.8, 4) * k, peak: 0.3, cols: smokeCols, drag: 1.6, grav: -1.4, a: r.range(0.45, 0.7), fin: 0.08, fout: 0.3, wind: 1.2, turb: 2, spin: 0.8 });
      }
      // fumée claire de l'onde (poussière, vapeur), plus rapide et plus courte
      for (let i = 0; i < 16 * k; i++) {
        const d = new V(r.range(-1, 1), r.range(-0.2, 0.6), r.range(-1, 1)).normalize();
        this.smoke.emit({ pos: pos.clone(), vel: d.multiplyScalar(r.range(8, 16) * k), life: r.range(0.6, 1.1), s0: 0.5 * k, s1: r.range(1.2, 2) * k, s2: 2.2 * k, peak: 0.25, cols: this.pal.greySmoke, drag: 4, a: 0.35, fout: 0.25, wind: 1, turb: 2 });
      }
      // 7 : débris (cubes sombres qui retombent), dont quelques-uns brûlent et laissent un filet de fumée
      const nDeb = Math.round(60 * k * debrisK);
      for (let i = 0; i < nDeb; i++) {
        const dir = new V(r.range(-1, 1), r.range(-0.3, 1), r.range(-1, 1)).normalize().add(bias).normalize();
        if (normal) dir.addScaledVector(normal, 0.6).normalize();
        const vel = dir.multiplyScalar(r.range(8, 30) * k), life = r.range(1.2, 2.6), p0 = pos.clone();
        const sz = r.range(0.15, 1.1) * k * (r() < 0.2 ? 1.5 : 1);
        this.debris.emit({ pos: p0, vel, life, s0: sz, s1: sz, s2: sz * 0.5, peak: 0.1, cols: r() < 0.6 ? this.pal.debris : this.pal.debrisLight, grav: 12, drag: 0.6, spin: 7 });
        if (i < 7 * k) this.addSmoker(p0, vel, life * 0.9, 12, 0.6, r.range(0.3, 0.9));
      }
      // 8 : résidus : colonne de fumée qui continue quelques secondes
      this.emitters.push({ pos: pos.clone(), age: 0, life: r.range(3, 5.5) * (big ? 1 : 0.6), rate: 9 * smokeK, acc: 0, spread: 1.2 * k, size: k, cols: smokeCols });
      // 9 : trace de brûlure si une surface a été touchée
      if (normal) this.scorch(pos, normal, 5 * k);
      this.flash(pos, cyan ? '#e8fcff' : '#fff0c8', 16 * k, 70 * k, 0.9 * dur, cyan ? '#39b4ff' : '#ff5010');
    }

    // Vitre / mur de briques traversé (OBSERVÉ : éclats cubiques) + poussière de plâtre / de brique
    shatter(center, size, vel, kind) {
      const r = U.fx;
      const pool = kind === 'brick' || kind === 'planks' ? this.debris : this.shards;
      const pal = kind === 'brick' ? this.pal.brick : kind === 'planks' ? this.pal.planks : kind === 'glassWarm' ? this.pal.glassWarm : this.pal.glass;
      const count = Math.min(90, Math.floor(size.x * size.y * size.z * (kind === 'brick' ? 18 : 60)) + 20);
      for (let i = 0; i < count; i++) {
        const p = center.clone().add(new V(r.range(-0.5, 0.5) * size.x, r.range(-0.5, 0.5) * size.y, r.range(-0.5, 0.5) * size.z));
        const v = vel.clone().multiplyScalar(r.range(0.15, 0.55)).add(new V(r.range(-1, 1), r.range(-0.5, 1.5), r.range(-1, 1)).multiplyScalar(r.range(2, 7)));
        const s = kind === 'brick' ? r.range(0.12, 0.45) : r.range(0.06, 0.35);
        pool.emit({ pos: p, vel: v, life: r.range(0.8, 1.8), s0: s, s1: s, s2: s * 0.5, peak: 0.1, cols: pal, grav: 12, drag: 0.4, spin: 8 });
      }
      if (kind === 'brick' || kind === 'planks') {
        const dust = kind === 'brick' ? [new THREE.Color('#c88a6a'), new THREE.Color('#a8826e'), new THREE.Color('#9a8a80')] : this.pal.dust;
        for (let i = 0; i < 18; i++) {
          const p = center.clone().add(new V(r.range(-0.5, 0.5) * size.x, r.range(-0.5, 0.5) * size.y, r.range(-0.5, 0.5) * size.z));
          this.smoke.emit({ pos: p, vel: vel.clone().multiplyScalar(r.range(0.05, 0.2)).add(new V(r.range(-1, 1), r.range(-0.2, 1), r.range(-1, 1)).multiplyScalar(2)), life: r.range(0.9, 1.8), s0: 0.3, s1: r.range(0.9, 1.5), s2: 2, peak: 0.3, cols: dust, drag: 2.5, a: 0.35, fin: 0.05, fout: 0.3, wind: 1, turb: 2 });
        }
      } else {
        // vitre : quelques éclats brillants qui accrochent la lumière
        for (let i = 0; i < 20; i++) this.sparks.emit({ pos: center.clone().add(new V(r.range(-0.5, 0.5) * size.x, r.range(-0.5, 0.5) * size.y, r.range(-0.5, 0.5) * size.z)), vel: vel.clone().multiplyScalar(r.range(0.2, 0.5)).add(new V(r.range(-1, 1), r.range(-0.5, 1), r.range(-1, 1)).multiplyScalar(4)), life: r.range(0.3, 0.7), s0: 0.05, s1: 0.05, s2: 0.02, cols: this.pal.white, grav: 10, drag: 0.5, a: 0.8, fout: 0.3 });
      }
    }

    // traînée de missile ennemi : fumée blanche translucide qui gonfle et dérive + petite flamme à l'arrière
    trailPuff(pos, dir) {
      const r = U.fx;
      this.smoke.emit({ pos: pos.clone(), vel: new V(r.range(-0.5, 0.5), r.range(0, 0.6), r.range(-0.5, 0.5)), life: r.range(1.2, 2.2), s0: 0.1, s1: r.range(0.35, 0.55), s2: r.range(0.7, 1), peak: 0.2, cols: this.pal.whiteSmoke, drag: 1, a: r.range(0.35, 0.5), fin: 0.05, fout: 0.25, wind: 1, turb: 1.5, spin: 1 });
      if (dir) this.flame.emit({ pos: pos.clone(), vel: dir.clone().multiplyScalar(-r.range(3, 6)), life: r.range(0.05, 0.09), s0: 0.08, s1: 0.16, s2: 0.04, peak: 0.3, cols: this.pal.flame, a: 0.9, fout: 0.3 });
    }
  }

  CC.ParticlePool = ParticlePool;
  CC.Effects = Effects;
})();

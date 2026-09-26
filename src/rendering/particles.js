/* Particules voxel instanciées (cubes et quads face caméra).
 * Aspect OBSERVÉ : flamme en gros cubes jaune→orange→rouge, fumée en cubes blancs, débris gris, éclats de verre. */
(function () {
  const V = THREE.Vector3;
  const U = CC.U;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new V(), _c = new THREE.Color(), _p = new V();
  const _z = new V(0, 0, 1), _e = new THREE.Euler(), _q2 = new THREE.Quaternion();

  class ParticlePool {
    /* o = { max, geometry:'box'|'plane', material, billboard, stretch } */
    constructor(scene, o) {
      this.max = o.max;
      const geo = o.geometry === 'plane' ? new THREE.PlaneGeometry(1, 1) : new THREE.BoxGeometry(1, 1, 1);
      this.mesh = new THREE.InstancedMesh(geo, o.material, this.max);
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
      this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      this.mesh.count = 0;
      this.mesh.frustumCulled = false;
      this.mesh.castShadow = !!o.castShadow;
      scene.add(this.mesh);
      this.billboard = !!o.billboard; this.stretch = o.stretch || 0;
      this.p = [];
      for (let i = 0; i < this.max; i++) this.p.push({ pos: new V(), vel: new V(), rot: new V(), spin: new V(), age: 0, life: 1, s0: 1, s1: 1, s2: 1, cols: null, grav: 0, drag: 0, alive: false, roll: 0 });
      this.n = 0;
    }

    /* e = { pos, vel, life, s0 (taille début), s1 (taille pic), s2 (taille fin), peak (0..1), cols:[THREE.Color...], grav, drag, spin } */
    emit(e) {
      if (this.n >= this.max) return null;
      const p = this.p[this.n++];
      p.pos.copy(e.pos); p.vel.copy(e.vel || _p.set(0, 0, 0));
      p.age = 0; p.life = e.life; p.s0 = e.s0; p.s1 = e.s1 === undefined ? e.s0 : e.s1; p.s2 = e.s2 === undefined ? p.s1 : e.s2;
      p.peak = e.peak === undefined ? 0.3 : e.peak;
      p.cols = e.cols; p.grav = e.grav || 0; p.drag = e.drag || 0;
      p.rot.set(U.rng() * 6.28, U.rng() * 6.28, U.rng() * 6.28);
      p.spin.set((U.rng() - 0.5) * (e.spin || 0), (U.rng() - 0.5) * (e.spin || 0), (U.rng() - 0.5) * (e.spin || 0));
      p.roll = U.rng() * 6.28;
      p.stretch = e.stretch || this.stretch;
      return p;
    }

    update(dt, camera) {
      const P = this.p;
      let i = 0;
      while (i < this.n) {
        const p = P[i];
        p.age += dt;
        if (p.age >= p.life) { const last = P[this.n - 1]; P[this.n - 1] = p; P[i] = last; this.n--; continue; }
        if (p.drag) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
        p.vel.y -= p.grav * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.rot.addScaledVector(p.spin, dt);
        i++;
      }
      const inst = this.mesh;
      for (let k = 0; k < this.n; k++) {
        const p = P[k];
        const t = p.age / p.life;
        const size = t < p.peak ? U.lerp(p.s0, p.s1, t / p.peak) : U.lerp(p.s1, p.s2, (t - p.peak) / (1 - p.peak));
        if (this.billboard) {
          _q.copy(camera.quaternion);
          _q.multiply(_q2.setFromAxisAngle(_z, p.roll));
          _s.set(size, size, size);
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
      }
      inst.count = this.n;
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }

    clear() { this.n = 0; this.mesh.count = 0; }
    dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); }
  }

  /* Ensemble des systèmes de particules du jeu + effets prêts à l'emploi. */
  class Effects {
    constructor(scene) {
      this.scene = scene;
      const C = (h) => new THREE.Color(h);
      this.pal = {
        flame: [C('#fff27a'), C('#ffbe1e'), C('#ff8a18'), C('#ff5a12'), C('#e03a0e'), C('#b8260a')],    // OBSERVÉ
        retro: [C('#fff27a'), C('#ffb020'), C('#ff6a14')],
        smoke: [C('#ffffff'), C('#ececec'), C('#d6d6d6')],
        spark: [C('#fff64a'), C('#f5e21b')],
        boomQuad: [C('#ffb020'), C('#ff7a14'), C('#ff4a10')],
        debris: [C('#2c2c2c'), C('#4a4a4a')],
        debrisLight: [C('#6d6d6d'), C('#8a8a8a')],
        greySmoke: [C('#9a9a9a'), C('#7a7a7a'), C('#5a5a5a')],
        streak: [C('#fff45a'), C('#ffe03a')],
        cyan: [C('#9ff4ff'), C('#39d4ff'), C('#1aa8e8')],
        white: [C('#ffffff'), C('#e8e8e8')],
        glass: [C('#bfe8ff'), C('#7fc4ef')],
        glassWarm: [C('#e8dc8a'), C('#b8a860')],
        brick: [C('#b8301d'), C('#9e1b15'), C('#d56229')],
        planks: [C('#e08a2a'), C('#a05a1a')],
        whiteSmoke: [C('#f4f4f4'), C('#dcdcdc')],
      };
      const basic = new THREE.MeshBasicMaterial({ vertexColors: false });
      this.flame = new ParticlePool(scene, { max: 900, material: basic });
      this.smoke = new ParticlePool(scene, { max: 700, material: new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#bdbdbd' }) });
      this.sparks = new ParticlePool(scene, { max: 500, material: new THREE.MeshBasicMaterial() });
      this.quads = new ParticlePool(scene, { max: 120, geometry: 'plane', billboard: true, material: new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }) });
      this.debris = new ParticlePool(scene, { max: 700, material: new THREE.MeshLambertMaterial(), castShadow: true });
      this.streaks = new ParticlePool(scene, { max: 120, stretch: 0.012, material: new THREE.MeshBasicMaterial() });
      this.shards = new ParticlePool(scene, { max: 700, material: new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.7 }) });
      this.pools = [this.flame, this.smoke, this.sparks, this.quads, this.debris, this.streaks, this.shards];
      this.lights = [];
      for (let i = 0; i < 3; i++) {
        const l = new THREE.PointLight('#ffffff', 0, 30, 1.6);
        scene.add(l);
        this.lights.push({ light: l, life: 1, age: 1, i0: 0 });
      }
    }

    update(dt, camera) { for (const p of this.pools) p.update(dt, camera); this.updateLights(dt); }
    clear() { for (const p of this.pools) p.clear(); for (const L of this.lights) { L.age = L.life; L.light.intensity = 0; } }

    // Pool fixe de lumières (ajouter/retirer des lumières forcerait la recompilation des shaders).
    flash(pos, color, intensity, dist, life) {
      let L = null;
      for (const c of this.lights) if (!L || c.age / c.life > L.age / L.life) L = c;
      L.light.position.copy(pos); L.light.color.set(color); L.light.distance = dist;
      L.i0 = intensity; L.life = life; L.age = 0; L.light.intensity = intensity;
    }
    updateLights(dt) {
      for (const L of this.lights) {
        L.age += dt;
        L.light.intensity = L.i0 * Math.max(0, 1 - L.age / L.life);
      }
    }

    // Cube de flamme émis à la tuyère (restent dans l'espace monde → traînée courbe OBSERVÉE).
    flameCube(pos, dir, rocketVel, scale) {
      const r = U.rng;
      const back = _p.copy(dir).multiplyScalar(-r.range(4, 9));
      back.add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(1.2));
      back.addScaledVector(rocketVel, 0.06);
      this.flame.emit({ pos, vel: back.clone(), life: r.range(0.08, 0.13), s0: 0.07 * scale, s1: r.range(0.12, 0.17) * scale, s2: 0.06 * scale, peak: 0.25, cols: this.pal.flame, drag: 2 });
    }
    retroPuff(pos, dir) {
      const r = U.rng;
      this.flame.emit({ pos, vel: dir.clone().multiplyScalar(r.range(10, 16)).add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1))), life: r.range(0.1, 0.16), s0: 0.1, s1: 0.22, s2: 0.06, peak: 0.3, cols: this.pal.retro, drag: 4 });
    }
    smokePuff(pos, vel, size, life) {
      const r = U.rng;
      this.smoke.emit({ pos, vel: vel.clone().add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(1.5)), life: life || r.range(0.5, 0.9), s0: size * 0.4, s1: size, s2: size * 0.3, peak: 0.25, cols: this.pal.smoke, drag: 2.5, spin: 1 });
    }

    // Tir : cubes blancs + étincelles jaunes carrées (MESURÉ : 0 → 0,35 s)
    launchBurst(pos, dir) {
      const r = U.rng;
      for (let i = 0; i < 30; i++) {
        const v = dir.clone().multiplyScalar(r.range(4, 16)).add(new V(r.range(-1, 1), r.range(-0.6, 1), r.range(-1, 1)).multiplyScalar(r.range(1.5, 4)));
        this.smoke.emit({ pos: pos.clone().addScaledVector(dir, r.range(0.6, 3)), vel: v, life: r.range(0.4, 0.8), s0: 0.15, s1: r.range(0.3, 0.7), s2: 0.12, peak: 0.25, cols: this.pal.smoke, drag: 3.2, spin: 2 });
      }
      for (let i = 0; i < 130; i++) {
        const v = dir.clone().multiplyScalar(r.range(3, 14)).add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(r.range(4, 12)));
        this.sparks.emit({ pos: pos.clone().addScaledVector(dir, r.range(0.3, 1.5)), vel: v, life: r.range(0.4, 1.0), s0: r.range(0.04, 0.09), s1: r.range(0.05, 0.1), s2: 0.02, cols: this.pal.spark, drag: 1.2, grav: 2 });
      }
      this.flash(pos, '#fff2c0', 4, 25, 0.25);
    }

    // Explosion d'impact (MESURÉ : quads orange 0,35 s puis débris sombres en étoile)
    explosion(pos, normal, big, variant) {
      const r = U.rng;
      const pal = variant === 'cyan' ? this.pal.cyan : this.pal.boomQuad;
      const k = big ? 1 : 0.6;
      for (let i = 0; i < 14; i++) {
        const v = new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(r.range(2, 8));
        this.quads.emit({ pos: pos.clone().add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(1.2 * k)), vel: v, life: r.range(0.28, 0.5), s0: 2 * k, s1: r.range(4, 8) * k, s2: 1 * k, peak: 0.3, cols: pal });
      }
      for (let i = 0; i < 70 * k; i++) {
        const dir = new V(r.range(-1, 1), r.range(-0.4, 1), r.range(-1, 1)).normalize();
        if (normal) dir.addScaledVector(normal, 0.6).normalize();
        this.debris.emit({ pos: pos.clone(), vel: dir.multiplyScalar(r.range(10, 34) * k), life: r.range(1.2, 2.6), s0: r.range(0.35, 1.3) * k, s1: r.range(0.35, 1.3) * k, s2: 0.2, peak: 0.1, cols: r() < 0.6 ? this.pal.debris : this.pal.debrisLight, grav: 12, drag: 0.6, spin: 6 });
      }
      for (let i = 0; i < 26 * k; i++) {
        this.smoke.emit({ pos: pos.clone().add(new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(2 * k)), vel: new V(r.range(-1, 1), r.range(0, 1.5), r.range(-1, 1)).multiplyScalar(r.range(2, 7)), life: r.range(1.2, 2.2), s0: 0.8 * k, s1: r.range(2, 3.6) * k, s2: 1.2 * k, peak: 0.3, cols: variant === 'cyan' ? this.pal.white : this.pal.greySmoke, drag: 1.2, spin: 1 });
      }
      for (let i = 0; i < 16; i++) {
        this.streaks.emit({ pos: pos.clone(), vel: new V(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize().multiplyScalar(r.range(40, 80)), life: r.range(0.15, 0.3), s0: 0.06, s1: 0.06, s2: 0.03, cols: this.pal.streak });
      }
      this.flash(pos, variant === 'cyan' ? '#bff4ff' : '#ffb050', 12, 60, 0.6);
    }

    // Vitre / mur de briques traversé (OBSERVÉ : éclats cubiques)
    shatter(center, size, vel, kind) {
      const r = U.rng;
      const pool = kind === 'brick' || kind === 'planks' ? this.debris : this.shards;
      const pal = kind === 'brick' ? this.pal.brick : kind === 'planks' ? this.pal.planks : kind === 'glassWarm' ? this.pal.glassWarm : this.pal.glass;
      const count = Math.min(90, Math.floor(size.x * size.y * size.z * (kind === 'brick' ? 18 : 60)) + 20);
      for (let i = 0; i < count; i++) {
        const p = center.clone().add(new V(r.range(-0.5, 0.5) * size.x, r.range(-0.5, 0.5) * size.y, r.range(-0.5, 0.5) * size.z));
        const v = vel.clone().multiplyScalar(r.range(0.15, 0.55)).add(new V(r.range(-1, 1), r.range(-0.5, 1.5), r.range(-1, 1)).multiplyScalar(r.range(2, 7)));
        const s = kind === 'brick' ? r.range(0.18, 0.45) : r.range(0.1, 0.35);
        pool.emit({ pos: p, vel: v, life: r.range(0.8, 1.8), s0: s, s1: s, s2: s * 0.5, peak: 0.1, cols: pal, grav: 12, drag: 0.4, spin: 8 });
      }
    }

    trailPuff(pos) {   // traînée blanche (missile ennemi, avant allumage)
      const r = U.rng;
      this.smoke.emit({ pos: pos.clone(), vel: new V(r.range(-0.5, 0.5), r.range(0, 0.6), r.range(-0.5, 0.5)), life: r.range(0.9, 1.5), s0: 0.12, s1: r.range(0.3, 0.5), s2: 0.1, peak: 0.2, cols: this.pal.whiteSmoke, drag: 1 });
    }
  }

  CC.ParticlePool = ParticlePool;
  CC.Effects = Effects;
})();

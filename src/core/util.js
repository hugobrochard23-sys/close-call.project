/* Utilitaires : maths, aléatoire déterministe, formatage (virgule décimale / point des milliers comme dans la vidéo). */
(function () {
  const U = {};

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (a, b, t) => { const x = U.clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  U.damp = (rate, dt) => 1 - Math.exp(-rate * dt);   // facteur d'interpolation indépendant du pas
  U.deg = (d) => d * Math.PI / 180;

  // Générateur pseudo-aléatoire déterministe (mulberry32) : indispensable pour rejouer les tests à l'identique.
  U.makeRng = function (seed) {
    let s = seed >>> 0;
    const r = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (a, b) => a + (b - a) * r();
    r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.sign = () => (r() < 0.5 ? -1 : 1);
    r.reseed = (v) => { s = v >>> 0; };
    return r;
  };
  U.rng = U.makeRng(1234);      // flux principal (effets, particules)
  U.levelRng = U.makeRng(99);   // flux de génération de niveau

  // Bruit de valeur 2D lissé (terrain, rochers).
  U.hash2 = (x, y, seed) => {
    let h = (x * 374761393 + y * 668265263 + (seed || 0) * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  U.noise2 = (x, y, seed) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = U.hash2(xi, yi, seed), b = U.hash2(xi + 1, yi, seed);
    const c = U.hash2(xi, yi + 1, seed), d = U.hash2(xi + 1, yi + 1, seed);
    return U.lerp(U.lerp(a, b, u), U.lerp(c, d, u), v);
  };
  U.fbm2 = (x, y, oct, seed) => {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += a * U.noise2(x * f, y * f, (seed || 0) + i * 17); n += a; a *= 0.5; f *= 2; }
    return s / n;
  };

  // "0:08,27" — MESURÉ (format du chrono)
  U.formatTime = (t) => {
    t = Math.max(0, t);
    const m = Math.floor(t / 60), s = Math.floor(t % 60), c = Math.floor((t * 100) % 100);
    return m + ':' + String(s).padStart(2, '0') + ',' + String(c).padStart(2, '0');
  };
  // "1.315" — MESURÉ (séparateur des milliers)
  U.formatInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // "2,9" — MESURÉ (virgule décimale)
  U.formatDec = (v, d) => v.toFixed(d === undefined ? 1 : d).replace('.', ',');

  U.hexToRgb = (hex) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  /* Distance horizontale d'un point au tracé du niveau (liste de [x,y,z]).
   * Sert aux terrains : le sol reste plat le long de la route, bosselé ailleurs. */
  U.routeDistXZ = (route) => (x, z) => {
    let best = Infinity;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i], c = route[i + 1], abx = c[0] - a[0], abz = c[2] - a[2];
      const t = U.clamp(((x - a[0]) * abx + (z - a[2]) * abz) / (abx * abx + abz * abz), 0, 1);
      best = Math.min(best, Math.hypot(a[0] + abx * t - x, a[2] + abz * t - z));
    }
    return best;
  };

  CC.U = U;
})();

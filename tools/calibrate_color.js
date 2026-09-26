/* Calibration hors ligne de la balance des ombres (postfx.lift / postfx.saturation).
 * Applique la même transformation que le shader (désaturation puis relèvement des ombres) à des images d'une version
 * enregistrée SANS cette transformation, et cherche par grille les paramètres qui maximisent la similarité
 * d'histogramme avec la référence, aux mêmes instants de course.
 * Usage : node tools/calibrate_color.js v004  →  analysis/iterations/<version>/calibration_couleur.json */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { PNG } = require('pngjs');
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;

const ROOT = path.resolve(__dirname, '..');
const REC = path.join(ROOT, 'recordings');
const version = process.argv[2] || 'v004';
const TMP = path.join(ROOT, 'analysis', 'iterations', version, '_calib');
fs.mkdirSync(TMP, { recursive: true });
const LEVELS = [[1, 'city', 0.0, 15.4, 0.17], [2, 'brick', 15.4, 23.6, 15.45], [3, 'canyon', 23.6, 36.03, 23.67], [4, 'cave', 36.03, 48.17, 31.51],
  [5, 'woods', 48.17, 64.45, 48.3], [6, 'construction', 64.45, 79.25, 64.48], [7, 'night', 79.25, 89.14, 80.22]];

const frame = (video, t, out) => { execFileSync(ffmpeg, ['-v', 'error', '-y', '-ss', Math.max(0, t).toFixed(3), '-i', video, '-frames:v', '1', '-vf', 'scale=283:159', out]); return PNG.sync.read(fs.readFileSync(out)); };
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function hist(px) { const h = new Float64Array(512); for (const [r, g, b] of px) h[(Math.min(255, r) >> 5) * 64 + (Math.min(255, g) >> 5) * 8 + (Math.min(255, b) >> 5)]++; for (let k = 0; k < 512; k++) h[k] /= px.length; return h; }
const bhatta = (a, b) => { let s = 0; for (let k = 0; k < 512; k++) s += Math.sqrt(a[k] * b[k]); return s; };
const pixels = (img) => { const out = []; for (let i = 0; i < img.data.length; i += 4) out.push([img.data[i], img.data[i + 1], img.data[i + 2]]); return out; };
function transform(px, sat, lift) {
  return px.map(([r, g, b]) => {
    const l = lum(r, g, b);
    let R = l + (r - l) * sat, G = l + (g - l) * sat, B = l + (b - l) * sat;
    const k = 1 - Math.min(1, Math.max(0, (l / 255) * 1.6));
    return [Math.max(0, R + lift[0] * k), Math.max(0, G + lift[1] * k), Math.max(0, B + lift[2] * k)];
  });
}

const result = {};
for (const [n, id, s0, s1, fire] of LEVELS) {
  const base = `${version}_L${n}_${id}`;
  if (!fs.existsSync(path.join(REC, base + '.json'))) continue;
  const tel = JSON.parse(fs.readFileSync(path.join(REC, base + '.json'), 'utf8'));
  const fireT = tel.events.find((e) => e.type === 'fire').t - 1 / 30;
  const hit = tel.events.find((e) => e.type === 'targetHit');
  const end = Math.min(s1 - fire - 0.3, (hit ? hit.t - 1 / 30 : 20) - fireT - 0.1);
  const pairs = [];
  for (let r = Math.max(0.3, s0 - fire); r <= end; r += (end - Math.max(0.3, s0 - fire)) / 9) {
    const A = frame(path.join(REC, 'original_reference.mp4'), fire + r, path.join(TMP, `a${n}.png`));
    const B = frame(path.join(REC, base + '.mp4'), fireT + r, path.join(TMP, `b${n}.png`));
    pairs.push({ ha: hist(pixels(A)), pb: pixels(B) });
  }
  let best = { score: -1 };
  const base0 = pairs.reduce((s, p) => s + bhatta(p.ha, hist(p.pb)), 0) / pairs.length;
  for (const sat of [0.8, 0.86, 0.92, 1.0, 1.08]) for (const lr of [0, 4, 8, 12, 16]) for (const lg of [0, 4, 8, 12, 16]) for (const lb of [0, 4, 8, 12, 16]) {
    const lift = [lr, lg, lb];
    const score = pairs.reduce((s, p) => s + bhatta(p.ha, hist(transform(p.pb, sat, lift))), 0) / pairs.length;
    if (score > best.score) best = { score, sat, lift };
  }
  const hex = '#' + best.lift.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  result[id] = { level: n, sansCorrection: +base0.toFixed(4), meilleur: +best.score.toFixed(4), saturation: best.sat, lift: hex };
  console.log(`L${n} ${id} : ${(base0 * 100).toFixed(1)} % → ${(best.score * 100).toFixed(1)} %  (saturation ${best.sat}, lift ${hex})`);
}
fs.rmSync(TMP, { recursive: true, force: true });
fs.writeFileSync(path.join(ROOT, 'analysis', 'iterations', version, 'calibration_couleur.json'), JSON.stringify(result, null, 1));

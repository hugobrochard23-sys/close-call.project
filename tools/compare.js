/* Comparaison automatique référence ↔ clone (voir tests/PROTOCOLE.md).
 * Aligne chaque niveau sur l'instant du tir, extrait des images aux mêmes temps de course, produit
 * des planches "original | clone | différence" et mesure : interface (boîtes du HUD), cadrage (position de la tuyère),
 * couleurs (histogrammes), vitesses (courbe SPEED), timings (tir, allumage, impact).
 * Usage : node tools/compare.js v001 [niveaux]  →  analysis/iterations/v001/ */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { PNG } = require('pngjs');
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;

const ROOT = path.resolve(__dirname, '..');
const REC = path.join(ROOT, 'recordings');
const version = process.argv[2] || 'v001';
const OUT = path.join(ROOT, 'analysis', 'iterations', version);
const TMP = path.join(OUT, '_tmp');
fs.mkdirSync(TMP, { recursive: true });
const REF = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'reference_measurements.json'), 'utf8'));
const LEVELS = [
  { n: 1, id: 'city', name: 'CITY', hud: 'A', seg: [0.0, 15.4], fire: 0.17 },
  { n: 2, id: 'brick', name: 'BRICKWORKS', hud: 'B', seg: [15.4, 23.6], fire: 15.45 },
  { n: 3, id: 'canyon', name: 'CANYON', hud: 'C', seg: [23.6, 36.03], fire: 23.67 },
  { n: 4, id: 'cave', name: 'CAVE', hud: 'C', seg: [36.03, 48.17], fire: 31.51 },
  { n: 5, id: 'woods', name: 'WOODS', hud: 'B', seg: [48.17, 64.45], fire: 48.3 },
  { n: 6, id: 'construction', name: 'CONSTRUCTION', hud: 'C', seg: [64.45, 79.25], fire: 64.48 },
  { n: 7, id: 'night', name: 'NIGHT FOREST', hud: 'B', seg: [79.25, 89.14], fire: 80.22 },
];
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;

function frameAt(video, t, out) {
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-ss', Math.max(0, t).toFixed(3), '-i', video, '-frames:v', '1', out]);
  return PNG.sync.read(fs.readFileSync(out));
}
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// Boîte englobante du texte du HUD : pixels clairs (ou jaunes) ayant un voisin sombre (contour du texte).
function textBox(img, zone, yellow) {
  const { width: W, data: d } = img;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  const L = (x, y) => { const i = (y * W + x) * 4; return lum(d[i], d[i + 1], d[i + 2]); };
  for (let y = Math.max(2, zone[1]); y < Math.min(img.height - 2, zone[3]); y++) for (let x = Math.max(2, zone[0]); x < Math.min(W - 2, zone[2]); x++) {
    const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    const hit = yellow ? (r > 190 && g > 170 && b < 120) : (r > 218 && g > 218 && b > 218 && Math.abs(r - b) < 26);
    if (!hit) continue;
    let dark = false;
    // contour sombre du texte : un voisin très sombre à 2 px (le fond clair seul ne suffit pas)
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (L(x + dx, y + dy) < 70) { dark = true; break; }
    if (!dark) continue;
    n++; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return n > 12 ? [x0, y0, x1, y1] : null;
}
function flamePoint(img) {
  const { width: W, data: d } = img, pts = [];
  for (let y = 120; y < 560; y += 2) for (let x = 150; x < 1000; x += 2) {
    const i = (y * W + x) * 4;
    if (d[i] > 225 && d[i + 1] > 195 && d[i + 2] < 90 && d[i] - d[i + 2] > 150) pts.push([x, y]);
  }
  if (pts.length < 30) return null;
  pts.sort((a, b) => a[1] - b[1]);
  const top = pts.slice(0, Math.max(5, Math.floor(pts.length * 0.1)));
  return [top.reduce((s, p) => s + p[0], 0) / top.length, top.reduce((s, p) => s + p[1], 0) / top.length];
}
function colorStats(img) {
  const { data: d } = img, hist = new Float64Array(512);
  let r = 0, g = 0, b = 0, n = 0, l2 = 0;
  for (let i = 0; i < d.length; i += 16) {
    r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    const L = lum(d[i], d[i + 1], d[i + 2]); l2 += L * L;
    hist[(d[i] >> 5) * 64 + (d[i + 1] >> 5) * 8 + (d[i + 2] >> 5)]++;
  }
  for (let k = 0; k < 512; k++) hist[k] /= n;
  const mean = [r / n, g / n, b / n], L = lum(mean[0], mean[1], mean[2]);
  return { mean, lum: L, contrast: Math.sqrt(Math.max(0, l2 / n - L * L)), hist };
}
const bhatta = (a, b) => { let s = 0; for (let k = 0; k < a.length; k++) s += Math.sqrt(a[k] * b[k]); return s; };
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const f1 = (v) => (v === null || v === undefined || Number.isNaN(v) ? '—' : (Math.round(v * 10) / 10).toString().replace('.', ','));

const results = [];
for (const L of LEVELS) {
  if (only && !only.includes(L.n)) continue;
  const base = `${version}_L${L.n}_${L.id}`;
  const vid = path.join(REC, base + '.mp4'), telF = path.join(REC, base + '.json');
  if (!fs.existsSync(vid)) { console.log('absent :', base); continue; }
  const tel = JSON.parse(fs.readFileSync(telF, 'utf8'));
  const fireEv = tel.events.find((e) => e.type === 'fire');
  const fireT = fireEv ? fireEv.t - 1 / 30 : 0;
  const hitEv = tel.events.find((e) => e.type === 'targetHit');
  const cloneEndRun = (hitEv ? hitEv.t - 1 / 30 : tel.frameCount / 30) - fireT;
  const refStartRun = Math.max(0.1, L.seg[0] - L.fire), refEndRun = L.seg[1] - L.fire - 0.3;
  const runs = [];
  const r1 = Math.min(refEndRun, cloneEndRun - 0.1);
  const step = Math.max(0.5, (r1 - refStartRun) / 18);
  for (let r = refStartRun; r <= r1; r += step) runs.push(+r.toFixed(2));
  const samples = [];
  for (const r of runs) {
    const rf = path.join(TMP, `${L.n}_ref_${r}.png`), cf = path.join(TMP, `${L.n}_clo_${r}.png`);
    const A = frameAt(path.join(REC, 'original_reference.mp4'), L.fire + r, rf);
    const B = frameAt(vid, fireT + r, cf);
    const ca = colorStats(A), cb = colorStats(B);
    const hudA = {}, hudB = {};
    for (const [k, box] of Object.entries(REF.hud[L.hud])) {
      const zone = [box[0] - 60, box[1] - 7, box[2] + 60, box[3] + 7];
      hudA[k] = textBox(A, zone, k === 'cooldown'); hudB[k] = textBox(B, zone, k === 'cooldown');
    }
    samples.push({ r, rf, cf, sim: bhatta(ca.hist, cb.hist), dLum: cb.lum - ca.lum, dContrast: cb.contrast - ca.contrast, meanA: ca.mean, meanB: cb.mean, flameA: flamePoint(A), flameB: flamePoint(B), hudA, hudB });
  }
  // planche de comparaison (6 instants répartis)
  const pick = samples.filter((_, i) => samples.length <= 6 || i % Math.ceil(samples.length / 6) === 0).slice(0, 6);
  const rows = [];
  for (const s of pick) {
    const row = path.join(TMP, `${L.n}_row_${s.r}.png`);
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', s.rf, '-i', s.cf, '-filter_complex',
      `[0]scale=566:318[a];[1]scale=566:318[b];[0][1]blend=all_mode=difference,eq=contrast=2.2:brightness=0.05,scale=566:318[c];[a]drawtext=text='ORIGINAL t=${String(s.r).replace('.', ',')}s':x=6:y=6:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.6[a2];[b]drawtext=text='CLONE ${version}':x=6:y=6:fontsize=16:fontcolor=cyan:box=1:boxcolor=black@0.6[b2];[c]drawtext=text='DIFFERENCE':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6[c2];[a2][b2][c2]hstack=3`, row]);
    rows.push(row);
  }
  const sheet = path.join(OUT, `L${L.n}_${L.id}_comparaison.png`);
  if (rows.length) execFileSync(ffmpeg, ['-v', 'error', '-y', ...rows.flatMap((r) => ['-i', r]), '-filter_complex', rows.map((_, i) => `[${i}]`).join('') + `vstack=${rows.length}`, sheet]);
  // agrégats
  const hudDelta = {};
  for (const k of Object.keys(REF.hud[L.hud])) {
    const ref = REF.hud[L.hud][k];
    const vals = samples.map((s) => s.hudB[k]).filter((b) => b && b[3] - b[1] >= 4 && b[3] - b[1] < 60);
    const refVals = samples.map((s) => s.hudA[k]).filter((b) => b && b[3] - b[1] >= 4 && b[3] - b[1] < 60);
    if (!vals.length) { hudDelta[k] = null; continue; }
    const mb = [0, 1, 2, 3].map((j) => median(vals.map((v) => v[j])));
    const ma = refVals.length ? [0, 1, 2, 3].map((j) => median(refVals.map((v) => v[j]))) : ref;
    hudDelta[k] = { ref: ma, clone: mb, dTop: mb[1] - ma[1], dBottom: mb[3] - ma[3], dLeft: mb[0] - ma[0], dRight: mb[2] - ma[2], dH: (mb[3] - mb[1]) - (ma[3] - ma[1]) };
  }
  const flA = samples.map((s) => s.flameA).filter(Boolean), flB = samples.map((s) => s.flameB).filter(Boolean);
  const nozzleClone = tel.frames.filter((f) => f.nozzle && f.state === 'FLIGHT' && f.t - fireT > 1).map((f) => [f.nozzle[0] * 1132, f.nozzle[1] * 637]);
  // vitesses
  let speedCmp = null;
  const refSp = REF.speed[String(L.n)];
  if (refSp) {
    const errs = [];
    const rows2 = [];
    for (const [r, v] of refSp) {
      const tt = fireT + r + 1 / 30;
      const fr = tel.frames.reduce((best, f) => (Math.abs(f.t - tt) < Math.abs(best.t - tt) ? f : best), tel.frames[0]);
      if (fr && fr.speed !== undefined && Math.abs(fr.t - tt) < 0.05) { errs.push(fr.speed - v); rows2.push([r, v, fr.speed]); }
    }
    speedCmp = errs.length ? { n: errs.length, rmse: Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / errs.length), bias: errs.reduce((s, e) => s + e, 0) / errs.length, rows: rows2 } : null;
  }
  // lancement
  const flight = tel.frames.filter((f) => f.t >= fireT);
  const ign = flight.find((f) => f.thrust);
  const eject = flight.find((f) => f.speed > 0);
  results.push({
    L, sheet: path.basename(sheet), samples: samples.length,
    sim: samples.reduce((s, x) => s + x.sim, 0) / Math.max(1, samples.length),
    dLum: samples.reduce((s, x) => s + x.dLum, 0) / Math.max(1, samples.length),
    dContrast: samples.reduce((s, x) => s + x.dContrast, 0) / Math.max(1, samples.length),
    meanA: [0, 1, 2].map((j) => samples.reduce((s, x) => s + x.meanA[j], 0) / Math.max(1, samples.length)),
    meanB: [0, 1, 2].map((j) => samples.reduce((s, x) => s + x.meanB[j], 0) / Math.max(1, samples.length)),
    hudDelta,
    flameRef: flA.length ? [median(flA.map((p) => p[0])), median(flA.map((p) => p[1]))] : null,
    flameClone: flB.length ? [median(flB.map((p) => p[0])), median(flB.map((p) => p[1]))] : null,
    nozzleClone: nozzleClone.length ? [median(nozzleClone.map((p) => p[0])), median(nozzleClone.map((p) => p[1]))] : null,
    speedCmp,
    hitClone: hitEv ? hitEv.runTime : null, hitRef: REF.hits[String(L.n)] || null,
    ignition: ign ? ign.t - fireT : null, ejectSpeed: eject ? eject.speed : null,
    crashes: tel.events.filter((e) => e.type === 'crash').length, targets: tel.events.filter((e) => e.type === 'targetHit').length,
    styleEvents: tel.events.filter((e) => e.type === 'style').map((e) => e.label + ' +' + e.points),
    errors: tel.errors || [],
  });
  console.log(`L${L.n} : ${samples.length} instants comparés, similarité couleur ${(results[results.length - 1].sim * 100).toFixed(1)} %`);
}
fs.rmSync(TMP, { recursive: true, force: true });
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(results.map((r) => Object.assign({}, r, { L: r.L.n })), null, 1));

// ---------- rapport ----------
const lines = [];
lines.push(`# COLD IMPACT — mesures de comparaison ${version}`, '', `Généré le ${new Date().toISOString().slice(0, 16).replace('T', ' ')} par tools/compare.js.`, '',
  'Alignement : temps de course depuis le tir (référence : temps vidéo − instant du tir mesuré). Images 1132×636.', '');
lines.push('## Synthèse par niveau', '', '| Niveau | Instants | Similarité couleur | Δ luminance | Δ contraste | Impact clone / réf. (s) | Allumage (s) | Éjection (m/s) | Crashs |', '|---|---|---|---|---|---|---|---|---|');
for (const r of results) lines.push(`| L${r.L.n} ${r.L.name} | ${r.samples} | ${f1(r.sim * 100)} % | ${f1(r.dLum)} | ${f1(r.dContrast)} | ${f1(r.hitClone)} / ${f1(r.hitRef)} | ${f1(r.ignition)} (réf. 0,63) | ${f1(r.ejectSpeed)} (réf. 31) | ${r.crashes} |`);
// évolution par rapport à la version précédente (si ses mesures existent)
const vnum = parseInt(version.replace(/\D/g, ''), 10);
const prevV = 'v' + String(vnum - 1).padStart(3, '0');
const prevF = path.join(ROOT, 'analysis', 'iterations', prevV, 'metrics.json');
if (vnum > 1 && fs.existsSync(prevF)) {
  const prev = JSON.parse(fs.readFileSync(prevF, 'utf8'));
  const refY = REF.framing.nozzleMedian[1];
  lines.push('', `## Évolution ${prevV} → ${version}`, '', '| Niveau | Similarité couleur | Écart impact (s) | Écart tuyère y (px) | Vitesse RMSE (m/s) |', '|---|---|---|---|---|');
  for (const r of results) {
    const p = prev.find((x) => x.L === r.L.n);
    if (!p) continue;
    const hitErr = (x) => (x.hitClone != null && x.hitRef != null ? Math.abs(x.hitClone - x.hitRef) : null);
    const nozErr = (x) => (x.nozzleClone ? Math.abs(x.nozzleClone[1] - refY) : null);
    const sp = (x) => (x.speedCmp ? x.speedCmp.rmse : null);
    const cell = (a, b, pct) => `${f1(pct ? a * 100 : a)}${pct ? ' %' : ''} → ${f1(pct ? b * 100 : b)}${pct ? ' %' : ''}`;
    lines.push(`| L${r.L.n} | ${cell(p.sim, r.sim, true)} | ${cell(hitErr(p), hitErr(r))} | ${cell(nozErr(p), nozErr(r))} | ${cell(sp(p), sp(r))} |`);
  }
}
lines.push('', '## Couleur moyenne (RVB)', '', '| Niveau | Référence | Clone |', '|---|---|---|');
for (const r of results) lines.push(`| L${r.L.n} | ${r.meanA.map(Math.round).join(', ')} | ${r.meanB.map(Math.round).join(', ')} |`);
lines.push('', '## Cadrage de la roquette (point chaud de la flamme, px dans 1132×636)', '', '| Niveau | Réf. (médiane) | Clone (médiane image) | Clone (tuyère, télémétrie) |', '|---|---|---|---|');
for (const r of results) lines.push(`| L${r.L.n} | ${r.flameRef ? r.flameRef.map(Math.round).join(', ') : '—'} | ${r.flameClone ? r.flameClone.map(Math.round).join(', ') : '—'} | ${r.nozzleClone ? r.nozzleClone.map(Math.round).join(', ') : '—'} |`);
lines.push('', `Référence globale MESURÉE (séq. 3–7) : médiane ${REF.framing.nozzleMedian.join(', ')}, p10 ${REF.framing.nozzleP10.join(', ')}, p90 ${REF.framing.nozzleP90.join(', ')}.`);
lines.push('', '## Interface (écart clone − référence, px ; médianes)', '', '| Niveau | Élément | Δ haut | Δ bas | Δ gauche | Δ droite | Δ hauteur |', '|---|---|---|---|---|---|---|');
for (const r of results) for (const [k, d] of Object.entries(r.hudDelta)) lines.push(d ? `| L${r.L.n} | ${k} | ${d.dTop} | ${d.dBottom} | ${d.dLeft} | ${d.dRight} | ${d.dH} |` : `| L${r.L.n} | ${k} | non détecté | | | | |`);
lines.push('', '## Vitesse (compteur SPEED)', '');
for (const r of results) if (r.speedCmp) {
  lines.push(`**L${r.L.n}** : ${r.speedCmp.n} points, écart quadratique ${f1(r.speedCmp.rmse)} m/s, biais ${f1(r.speedCmp.bias)} m/s.`, '');
  lines.push('| t (s) | réf. | clone |', '|---|---|---|');
  r.speedCmp.rows.filter((_, i) => i % 3 === 0).forEach((x) => lines.push(`| ${f1(x[0])} | ${x[1]} | ${f1(x[2])} |`));
  lines.push('');
}
lines.push('## Messages de style produits', '');
for (const r of results) lines.push(`- L${r.L.n} : ${r.styleEvents.slice(0, 12).join(' · ') || '—'}`);
lines.push('', '## Planches', '');
for (const r of results) lines.push(`- L${r.L.n} : [${r.sheet}](${r.sheet})`);
fs.writeFileSync(path.join(OUT, `MESURES_${version}.md`), lines.join('\n'));
console.log('Rapport : analysis/iterations/' + version + '/MESURES_' + version + '.md');

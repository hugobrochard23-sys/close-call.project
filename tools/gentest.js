/* Banc de test du générateur de missions (Node, sans navigateur ni WebGL).
 * Génère N cartes par difficulté, vérifie validité, déterminisme, temps, score par difficulté et diversité.
 *   node tools/gentest.js            → 100 cartes par difficulté
 *   node tools/gentest.js 20 hard    → 20 cartes difficiles
 *   node tools/gentest.js 1 hard 1234 --json → une carte, plan détaillé
 * Sortie : résumé console + analysis/generator/report.json (et report.md). Code de sortie 1 si une carte est invalide. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = { console, performance: { now: () => Number(process.hrtime.bigint()) / 1e6 }, Math, Date, JSON };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['src/config.js', 'src/core/util.js', 'src/world/gen/core.js', 'src/world/gen/profiles.js', 'src/world/gen/biomes.js', 'src/world/gen/layout.js',
  'src/world/gen/templates.js', 'src/world/gen/mission.js', 'src/world/gen/features.js', 'src/world/gen/nav.js', 'src/world/gen/validate.js', 'src/world/gen/generator.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}
const { CC } = ctx, G = CC.Gen;
module.exports = { CC, G };
if (require.main !== module) return;

const args = process.argv.slice(2).filter((a) => !a.startsWith('--')), flags = process.argv.filter((a) => a.startsWith('--'));
const N = parseInt(args[0] || '100', 10);
const diffs = args[1] && args[1] !== 'all' ? [args[1]] : G.difficultyIds();
const seed0 = args[2] ? parseInt(args[2], 10) : 1000;
const biome = (flags.find((f) => f.startsWith('--biome=')) || '').split('=')[1];

const pct = (arr, p) => { const a = arr.slice().sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const report = { version: CC.CONFIG.version, genVersion: G.VERSION, date: new Date().toISOString(), perDifficulty: {} };
let bad = 0;
for (const d of diffs) {
  const R = { maps: [], invalid: [], errors: [], times: [], attempts: [], scores: [], biomes: {}, envs: {}, setups: {}, kinds: {}, rejects: {} };
  const sigs = [];
  for (let i = 0; i < N; i++) {
    const seed = seed0 + i * 7919;
    let plan;
    try { plan = G.generate(seed, d, { biome, throwErrors: flags.includes('--throw') }); } catch (e) { R.errors.push({ seed, msg: e.message, stack: e.stack.split('\n').slice(0, 4).join(' | ') }); bad++; continue; }
    R.times.push(plan.timings.total); R.attempts.push(plan.attempt + 1); R.scores.push(plan.score.difficultyScore);
    R.biomes[plan.biome.id] = (R.biomes[plan.biome.id] || 0) + 1; R.envs[plan.env.id] = (R.envs[plan.env.id] || 0) + 1;
    for (const t of plan.targets) { R.setups[t.setup] = (R.setups[t.setup] || 0) + 1; R.kinds[t.kind] = (R.kinds[t.kind] || 0) + 1; }
    for (const rj of plan.rejects) { const k = rj.reason.replace(/[0-9.,]+/g, '#'); R.rejects[k] = (R.rejects[k] || 0) + 1; }
    if (!plan.valid) { R.invalid.push({ seed, reason: plan.rejectReason, score: plan.score.difficultyScore, playable: plan.playable }); if (!plan.playable) bad++; }
    R.maps.push({ seed, biome: plan.biome.id, env: plan.env.id, score: plan.score, stats: { b: plan.stats.buildings, tr: plan.stats.trees, ob: plan.stats.obstacles, tk: plan.stats.tanks, sam: plan.stats.sams, he: plan.stats.helis, tg: plan.stats.targets, items: plan.stats.items }, fuel: plan.fuel, t: plan.timings.total, att: plan.attempt });
    sigs.push(G.signature(plan));
    if (i === 0 && flags.includes('--determinism')) {
      const again = G.generate(seed, d, { biome });
      const h = (p) => JSON.stringify([p.items.map((it) => [it.t, it.x, it.z, it.h]), p.targets.map((t) => t.pos), p.guards, p.helis, p.routes]);
      R.deterministic = h(plan) === h(again);
    }
    if (flags.includes('--json') && N === 1) fs.writeFileSync(path.join(ROOT, 'analysis', 'plan_' + d + '_' + seed + '.json'), JSON.stringify({ ...plan, space: undefined, nav: undefined, _index: undefined, terrain: { ...plan.terrain, H: undefined } }, null, 1));
  }
  // diversité : distance de chaque carte à sa plus proche voisine
  const nn = sigs.map((a, i) => { let m = Infinity; sigs.forEach((b, j) => { if (i !== j) m = Math.min(m, G.signatureDistance(a, b)); }); return m; });
  const near = nn.filter((v) => v < 0.08).length;
  const sc = R.scores, band = G.Difficulties.get(d).scoreBand;
  const S = {
    n: R.maps.length, errors: R.errors.length, invalid: R.invalid.length, unplayable: R.invalid.filter((x) => !x.playable).length,
    timeMs: { mean: +mean(R.times).toFixed(1), p95: +pct(R.times, 0.95).toFixed(1), max: +Math.max(0, ...R.times).toFixed(1) },
    attempts: { mean: +mean(R.attempts).toFixed(2), max: Math.max(0, ...R.attempts) },
    score: { band, min: Math.min(...sc), p10: pct(sc, 0.1), median: pct(sc, 0.5), p90: pct(sc, 0.9), max: Math.max(...sc) },
    diversity: { nnMin: +Math.min(...nn).toFixed(3), nnMedian: +pct(nn, 0.5).toFixed(3), nearDuplicates: near },
    biomes: R.biomes, envs: R.envs, setups: R.setups, kinds: R.kinds, rejects: R.rejects,
    avg: {
      buildings: +mean(R.maps.map((m) => m.stats.b)).toFixed(1), trees: +mean(R.maps.map((m) => m.stats.tr)).toFixed(1), obstacles: +mean(R.maps.map((m) => m.stats.ob)).toFixed(1),
      tanks: +mean(R.maps.map((m) => m.stats.tk)).toFixed(2), sams: +mean(R.maps.map((m) => m.stats.sam)).toFixed(2), helis: +mean(R.maps.map((m) => m.stats.he)).toFixed(2),
      targets: +mean(R.maps.map((m) => m.stats.tg)).toFixed(2), items: +mean(R.maps.map((m) => m.stats.items)).toFixed(0), fuel: +mean(R.maps.map((m) => m.fuel)).toFixed(1),
      routeLength: +mean(R.maps.map((m) => m.score.routeLength)).toFixed(0), exposure: +mean(R.maps.map((m) => m.score.exposure)).toFixed(2),
      openness: +mean(R.maps.map((m) => m.score.openness)).toFixed(3), narrow: +mean(R.maps.map((m) => m.score.narrowFraction)).toFixed(3), corridors: +mean(R.maps.map((m) => m.score.corridors)).toFixed(2),
      maxTurn: +mean(R.maps.map((m) => m.score.traversalComplexity)).toFixed(3),
    },
    deterministic: R.deterministic,
  };
  report.perDifficulty[d] = { summary: S, invalid: R.invalid, errors: R.errors, maps: R.maps };
  console.log('\n=== ' + d.toUpperCase() + ' ===');
  console.log(JSON.stringify(S, null, 1));
  if (R.errors.length) console.log('ERREURS', R.errors.slice(0, 5));
  if (R.invalid.length) console.log('INVALIDES', R.invalid.slice(0, 8));
}
if (!flags.includes('--no-write')) {
  const dir = path.join(ROOT, 'analysis', 'generator'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 1));
}
process.exit(bad ? 1 : 0);

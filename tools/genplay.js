/* Banc de jeu du générateur de missions (développement, jamais chargé par le jeu).
 * Dans une page ?test=1&autopilot=1&fps=30&gen=easy : await import('/tools/genplay.js') puis
 *   __genplay({ diffs: ['easy','medium','hard','impossible'], n: 10, seed0: 7000, maxSec: 160 })
 * Le pilote automatique joue chaque mission jusqu'au bout (ou jusqu'à maxSec secondes simulées) ; résultats dans
 * window.__gp (progression) puis résumé par difficulté : missions terminées, temps, tirs par cible, crashs par cause,
 * missiles ennemis, essence restante minimale, temps de génération et de construction, appels de dessin. */
window.__genplay = async (o) => {
  const g = CC.game, H = CC.harness, fps = H.fps || 30;
  const out = window.__gp = { runs: [], done: false };
  for (const d of o.diffs) for (let i = 0; i < o.n; i++) {
    const seed = (o.seed0 || 7000) + i * 7919;
    g.telemetry.frames.length = 0; g.telemetry.events.length = 0;
    const t0 = performance.now();
    g.startGenerated(d, seed);
    const build = performance.now() - t0;
    let steps = 0, minFuel = Infinity, calls = 0;
    while (!H.state().done && steps < fps * (o.maxSec || 160)) {
      H.step(1); steps++;
      if (g.rocket.active) minFuel = Math.min(minFuel, g.rocket.fuel);
      if (steps === 40) calls = g.renderer.info.render.calls;
      if (steps % 300 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const ev = g.telemetry.events, crashes = {};
    for (const e of ev) if (e.type === 'crash') crashes[e.kind] = (crashes[e.kind] || 0) + 1;
    out.runs.push({
      d, seed, biome: g.mission.biome, done: H.state().done, time: +g.runTime.toFixed(1), fires: ev.filter((e) => e.type === 'fire').length,
      targets: g.targets.filter((t) => !t.guard).length, hits: ev.filter((e) => e.type === 'targetHit').length, crashes, enemy: ev.filter((e) => e.type === 'enemyMissile').length,
      minFuel: minFuel === Infinity ? null : +minFuel.toFixed(1), fuel: g.level.fuel, genMs: g.mission.genMs, buildMs: g.mission.buildMs, totalMs: Math.round(build), calls,
    });
    await new Promise((r) => setTimeout(r, 0));
  }
  const sum = {};
  for (const d of o.diffs) {
    const R = out.runs.filter((r) => r.d === d), m = (f) => +(R.reduce((a, r) => a + f(r), 0) / Math.max(1, R.length)).toFixed(2);
    const cr = {}; for (const r of R) for (const [k, v] of Object.entries(r.crashes)) cr[k] = (cr[k] || 0) + v;
    sum[d] = { n: R.length, completed: R.filter((r) => r.done).length, time: m((r) => r.time), firesPerTarget: m((r) => r.fires / Math.max(1, r.targets)), crashes: cr, enemyMissiles: m((r) => r.enemy),
      minFuel: m((r) => r.minFuel || 0), genMs: m((r) => r.genMs), buildMs: m((r) => r.buildMs), maxTotalMs: Math.max(...R.map((r) => r.totalMs)), calls: m((r) => r.calls) };
  }
  out.summary = sum; out.done = true;
  return sum;
};

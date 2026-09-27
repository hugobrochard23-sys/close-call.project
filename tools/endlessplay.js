/* Banc de jeu du mode CLASSIQUE (couloir infini, v033 ; développement, jamais chargé par le jeu).
 * Dans une page ?test=1&autopilot=1&fps=30&endless=1 : await import('/tools/endlessplay.js') puis
 *   __endlessplay({ n: 10, seed0: 5000, maxSec: 90 })
 * Le pilote automatique suit les points de passage de chaque tronçon jusqu'au crash (ou maxSec secondes simulées).
 * Résultat par partie : distance, palier atteint, cause et obstacle le plus proche du crash, cibles détruites, essence
 * minimale, tronçons en mémoire, temps de construction d'un tronçon (moyenne et pire cas). */
window.__endlessplay = async (o) => {
  const g = CC.game, H = CC.harness, fps = H.fps || 30;
  const out = window.__ep = { runs: [], done: false };
  for (let i = 0; i < o.n; i++) {
    const seed = (o.seed0 || 5000) + i * 7919;
    g.telemetry.frames.length = 0; g.telemetry.events.length = 0;
    g.startEndless(seed);
    let steps = 0, minFuel = Infinity, maxChunks = 0, worst = 0, sum = 0, nb = 0;
    const ensure = g.endlessRun.ensure.bind(g.endlessRun);
    g.endlessRun.ensure = (k) => { const n0 = g.endlessRun.chunks.size, t0 = performance.now(); ensure(k); const ms = performance.now() - t0; if (g.endlessRun.chunks.size !== n0 || ms > 2) { worst = Math.max(worst, ms); sum += ms; nb++; } };
    while (g.state !== 'RESULTS' && steps < fps * (o.maxSec || 90)) {
      H.step(1); steps++;
      if (g.rocket.active) minFuel = Math.min(minFuel, g.rocket.fuel);
      maxChunks = Math.max(maxChunks, g.endlessRun ? g.endlessRun.chunks.size : 0);
      if (steps % 300 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const ev = g.telemetry.events, crash = ev.find((e) => e.type === 'crash');
    const run = g.endlessRun, T = run.T, cd = crash ? -crash.pos[2] : null;
    const near = crash && T.log ? T.log.filter((x) => Math.abs(x.d - cd) < 40).map((x) => x.type + '@' + x.d) : [];
    out.runs.push({ seed, dist: Math.round(run.dist), stage: run.stage, crash: crash ? crash.kind : null, at: crash ? crash.pos : null, near,
      hits: ev.filter((e) => e.type === 'targetHit').length, enemy: ev.filter((e) => e.type === 'enemyMissile').length,
      minFuel: minFuel === Infinity ? null : +minFuel.toFixed(1), maxChunks, chunkMs: nb ? +(sum / nb).toFixed(1) : 0, worstMs: +worst.toFixed(1), time: +g.runTime.toFixed(1) });
    await new Promise((r) => setTimeout(r, 0));
  }
  const R = out.runs, cr = {};
  for (const r of R) if (r.crash) cr[r.crash] = (cr[r.crash] || 0) + 1;
  out.summary = { n: R.length, meanDist: Math.round(R.reduce((a, r) => a + r.dist, 0) / R.length), minDist: Math.min(...R.map((r) => r.dist)), maxDist: Math.max(...R.map((r) => r.dist)),
    crashes: cr, worstChunkMs: Math.max(...R.map((r) => r.worstMs)) };
  out.done = true;
  return out;
};

/* v050 : HUD DE VOL « premium arcade » (mode CLASSIQUE / ENDLESS). Extrêmement minimal : le monde reste dominant.
 *   haut centre : DISTANCE en grand (la métrique principale), sous elle le record ; X2, X3… (multiplicateur) à gauche si > 1
 *   haut droite : FUEL (icône + barre épaisse + pourcentage) ; cyan > 40 %, orange 40–20 %, rouge-orange < 20 % (clignote)
 *   bas centre  : anneau BOOST (indicateur, pas un bouton : le boost se fait en maintenant le doigt) ; il brille quand le boost est actif
 *   pause : bouton rond en haut à gauche (DOM, voir style.css) ; popup « +12 FUEL » au centre ; une ligne de journal sous le record. */
(function () {
  const U = CC.U, DS = CC.DS, T = DS.T;
  CC.HUD.prototype.drawClassic = function (game, W, H, C, col, rk) {
    const ctx = this.ctx, run = game.endlessRun, s = game.state;
    const flying = s === 'FLIGHT' || s === 'IMPACT' || s === 'CRASHED' || s === 'RESPAWN' || s === 'REVIVE' || s === 'AIM';
    if (!flying) return;
    const u = Math.min(W, H * 0.62), k = Math.max(0.6, u / 390), alive = s === 'FLIGHT' || s === 'AIM', now = performance.now(), top = Math.max(10 * k, H * 0.012);
    const speedK = alive && rk.active ? Math.max(game.boostK, U.clamp((rk.speed - 45) / 60, 0, 0.35)) : 0;
    if (speedK > 0.02) this.drawSpeedLines(W, H, speedK);
    game.flyers.length = 0;
    const dist = Math.floor(run.dist), P = game.progress.P, best = Math.floor(P.bestDist || 0), broke = best > 0 && dist > best;
    // --- distance
    const bump = 1 + 0.08 * Math.min(1, game.cellBump), ds = fmtD(dist), fs = 46 * k, cx = W / 2, cy = top + 30 * k;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(bump, bump); ctx.translate(-cx, -cy);
    const nw = DS.measure(ctx, ds, fs), mw = DS.measure(ctx, 'm', fs * 0.5), x0 = cx - (nw + mw + 6 * k) / 2;
    DS.text(ctx, ds, x0, cy, fs, broke ? T.gold : T.white, { weight: 700, stroke: 'rgba(4,18,34,0.85)' });
    DS.text(ctx, 'm', x0 + nw + 6 * k, cy + fs * 0.13, fs * 0.5, broke ? T.gold : T.cyanL, { weight: 700, stroke: 'rgba(4,18,34,0.85)' });
    ctx.restore();
    if (run.mult > 1) { const bw = 52 * k, bh = 28 * k, bx = x0 - bw - 10 * k, by = cy - bh / 2; DS.panel(ctx, bx, by, bw, bh, { k, r: bh / 2, shadow: false, accent: T.orange, glow: true }); DS.text(ctx, 'X' + run.mult, bx + bw / 2, by + bh / 2 + 1 * k, 20 * k, T.orange, { align: 'center', weight: 700 }); }
    const sub = broke ? 'NEW BEST!' : (best > 0 ? 'BEST ' + fmtD(best) + ' m' : ''), f = game.hudFeed[0];
    if (sub) DS.text(ctx, sub, cx, cy + 36 * k, 14 * k, broke ? T.gold : T.text2, { align: 'center', weight: 700, ls: 1.2, stroke: 'rgba(4,18,34,0.7)' });
    if (f) { const a = f.t < 0.12 ? f.t / 0.12 : 1 - U.clamp((f.t - 1.2) / 0.6, 0, 1); if (a > 0) DS.text(ctx, f.text, cx, cy + 58 * k - (1 - Math.min(1, f.t * 6)) * 8 * k, 16 * k, f.color || '#fff', { align: 'center', weight: 700, alpha: a, ls: 0.8, stroke: 'rgba(4,18,34,0.8)' }); }
    // --- fuel (haut droite)
    const kf = U.clamp((rk.active ? rk.fuel : rk.fuelMax) / (rk.fuelMax || 1), 0, 1), free = rk.active && rk.freeBoost, fc = free ? { c1: T.cyanL, c2: T.blue } : DS.fuelColors(kf, now);
    const fw = 112 * k, fx = W - fw - 12 * k, fy = top + 70 * k;
    DS.icon(ctx, 'fuel', fx - 14 * k, fy + 9 * k, 22 * k, free ? T.cyanL : fc.c1, { shadow: true });
    DS.text(ctx, Math.round(kf * 100) + '%', fx + fw, fy - 8 * k, 14 * k, T.white, { align: 'right', weight: 700, stroke: 'rgba(4,18,34,0.8)' });
    DS.text(ctx, 'FUEL', fx, fy - 8 * k, 12 * k, T.text2, { weight: 700, ls: 1.2, stroke: 'rgba(4,18,34,0.8)' });
    DS.bar(ctx, fx, fy + 3 * k, fw, 12 * k, kf, { k, c1: fc.c1, c2: fc.c2, glow: kf < 0.2 || free });
    if (rk.active && rk.fuel <= 0) DS.text(ctx, 'NO FUEL', fx + fw / 2, fy + 32 * k, 16 * k, T.danger, { align: 'center', weight: 700, stroke: 'rgba(4,18,34,0.8)' });
    // --- anneau BOOST (bas centre)
    if (alive) {
      const br = 24 * k, bx = W / 2, by = H - 62 * k, on = rk.active && rk.thrusting && !free;
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.8; ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.2832); ctx.fillStyle = 'rgba(4,16,28,0.55)'; ctx.fill();
      ctx.lineWidth = 5 * k; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.2832); ctx.stroke();
      if (kf > 0) { ctx.strokeStyle = on ? T.orange : fc.c1; if (on) { ctx.shadowColor = T.orange; ctx.shadowBlur = 12 * k; } ctx.beginPath(); ctx.arc(bx, by, br, -Math.PI / 2, -Math.PI / 2 + 6.2832 * kf); ctx.stroke(); ctx.shadowBlur = 0; }
      DS.icon(ctx, 'bolt', bx, by, br * 1.05, on ? T.gold : T.cyanL);
      ctx.restore();
    }
    // --- popup « +12 FUEL »
    if (run.fuelGainT > 0 && s === 'FLIGHT') { const a = Math.min(1, run.fuelGainT / 0.4), p = 1 - Math.min(1, run.fuelGainT / 1.4); DS.text(ctx, '+' + U.formatDec(run.fuelGain, 0) + ' FUEL', W / 2, H * 0.36 - p * 30 * k, 28 * k * (1 + 0.15 * (1 - p)), T.cyanL, { align: 'center', weight: 700, alpha: a, stroke: 'rgba(4,18,34,0.85)', ls: 1 }); }
    // --- mission accomplie
    for (const t of game.progress.toasts) { const a = Math.min(1, t.t * 6, (2.4 - t.t) * 3), bw = Math.min(W * 0.8, 300 * k), bh = 52 * k, y = H * 0.24; ctx.save(); ctx.globalAlpha = a; DS.panel(ctx, W / 2 - bw / 2, y, bw, bh, { k, shadow: false, accent: T.green, glow: true }); DS.icon(ctx, 'check', W / 2 - bw / 2 + 28 * k, y + bh / 2, 24 * k, T.green); DS.text(ctx, t.text, W / 2 + 12 * k, y + 19 * k, DS.fit(ctx, t.text, 17 * k, bw - 80 * k), T.white, { align: 'center', weight: 700 }); DS.text(ctx, t.sub, W / 2 + 12 * k, y + 39 * k, 14 * k, T.green, { align: 'center', weight: 700 }); ctx.restore(); }
    if (s === 'CRASHED' && game.crashKind) DS.text(ctx, 'TOUCHE : ' + game.causeOf(game.crashKind), W / 2, H * 0.3, 26 * k, T.danger, { align: 'center', weight: 700, stroke: 'rgba(4,18,34,0.85)', ls: 1 });
    if (run.altT > 0 && s === 'FLIGHT' && Math.floor(run.altT * 6) % 2 === 0) DS.text(ctx, 'TROP HAUT !', W / 2, H * 0.3, 36 * k, T.danger, { align: 'center', weight: 700, stroke: 'rgba(4,18,34,0.85)' });
    if (!document.body.classList.contains('cc-touch') && s === 'FLIGHT' && (game.progress.P.launches || 0) <= 3 && game.flightTime < 6) DS.text(ctx, 'SOURIS OU ZQSD : DIRIGER    ESPACE : BOOST', W / 2, H * 0.23, DS.fit(ctx, 'SOURIS OU ZQSD : DIRIGER    ESPACE : BOOST', 16 * k, W * 0.9), T.white, { align: 'center', weight: 700, stroke: 'rgba(4,18,34,0.85)' });
  };
  const fmtD = (n) => U.formatInt(n);
})();

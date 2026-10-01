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
    // --- distance (m) en grand, le score dessous : rien d'autre
    const bump = 1 + 0.06 * Math.min(1, game.cellBump), ds = fmtD(dist), fs = 46 * k, cx = W / 2, cy = top + 30 * k;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(bump, bump); ctx.translate(-cx, -cy);
    const nw = DS.measure(ctx, ds, fs), mw = DS.measure(ctx, 'm', fs * 0.5), x0 = cx - (nw + mw + 6 * k) / 2;
    DS.text(ctx, ds, x0, cy, fs, T.white, { weight: 700, stroke: 'rgba(4,18,34,0.85)' });
    DS.text(ctx, 'm', x0 + nw + 6 * k, cy + fs * 0.13, fs * 0.5, T.cyanL, { weight: 700, stroke: 'rgba(4,18,34,0.85)' });
    ctx.restore();
    const kf = U.clamp((rk.active ? rk.fuel : rk.fuelMax) / (rk.fuelMax || 1), 0, 1), free = rk.active && rk.freeBoost, fc = free ? { c1: T.cyanL, c2: T.blue } : DS.fuelColors(kf, now);
    // --- anneau BOOST (bas centre)
    if (alive) {
      const br = 24 * k, bx = W / 2, by = H - 62 * k, on = rk.active && rk.thrusting && !free;
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.8; ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.2832); ctx.fillStyle = 'rgba(4,16,28,0.55)'; ctx.fill();
      ctx.lineWidth = 5 * k; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.2832); ctx.stroke();
      if (kf > 0) { ctx.strokeStyle = on ? T.orange : fc.c1; if (on) { ctx.shadowColor = T.orange; ctx.shadowBlur = 12 * k; } ctx.beginPath(); ctx.arc(bx, by, br, -Math.PI / 2, -Math.PI / 2 + 6.2832 * kf); ctx.stroke(); ctx.shadowBlur = 0; }
      DS.icon(ctx, 'bolt', bx, by, br * 1.05, on ? T.gold : T.cyanL);
      ctx.restore();
    }
  };
  const fmtD = (n) => U.formatInt(n);
  const oldInd = CC.HUD.prototype.drawIndicators;
  CC.HUD.prototype.drawIndicators = function (game) { if (game.endlessRun) return; oldInd.call(this, game); };   // v051 : plus de repères de cibles en vol
  CC.HUD.prototype.drawTutorial = function () {};   // v051 : en vol, plus aucun texte d'aide
})();

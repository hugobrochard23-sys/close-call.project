/* v073 : HUD ULTRA SIMPLE du mode infini — le nombre de cibles touchées (le score) et la jauge d'essence, sans cadre. Rien d'autre. */
(function () {
  const U = CC.U;
  CC.HUD.prototype.drawClassic = function (game, W, H, C, col, rk) {
    const ctx = this.ctx, run = game.endlessRun, F = CC.Font, s = game.state;
    const flying = s === 'FLIGHT' || s === 'IMPACT' || s === 'CRASHED' || s === 'RESPAWN' || s === 'REVIVE' || s === 'AIM';
    if (!flying) return;
    const alive = s === 'FLIGHT' || s === 'AIM', top = Math.max(10, H * 0.02), px = Math.max(3, Math.min(W * 0.012, H * 0.0075));
    const speedK = alive && rk.active ? Math.max(game.boostK, U.clamp((rk.speed - 45) / 60, 0, 0.35)) : 0;
    if (speedK > 0.02) this.drawSpeedLines(W, H, speedK);
    const bump = 1 + 0.12 * Math.min(1, game.cellBump || 0), sc = String(run.score);
    ctx.save(); ctx.translate(W / 2, top + px * 5); ctx.scale(bump, bump); ctx.translate(-W / 2, -(top + px * 5));
    F.draw(ctx, sc, W / 2, top, px * 1.35, '#ffffff', { align: 'center' });
    ctx.restore();
    const gh = Math.min(H * 0.34, 300), gw = Math.max(10, Math.round(px * 2.4)), gx = W - gw - Math.max(14, W * 0.05), gy = top + H * 0.02;
    this.drawFuelBar(game, rk, gx, gy, gw, gh);
    game.flyers.length = 0;
    // v075 : niveau — fine ligne de progression tout en haut ; vie du boss quand il est proche
    if (game.levelRun) {
      const pct = U.clamp(run.dist / game.levelRun.len, 0, 1), th = Math.max(3, Math.round(px * 0.9));
      ctx.fillStyle = 'rgba(8,12,18,0.4)'; ctx.fillRect(0, 0, W, th); ctx.fillStyle = '#d9a441'; ctx.fillRect(0, 0, Math.round(W * pct), th);
      const boss = game.targets.find((q) => q.boss && q.alive);
      if (boss && rk.active && rk.pos.distanceTo(boss.obb.c) < 700) {
        const bw = Math.round(W * 0.42), bx = Math.round(W / 2 - bw / 2), by = Math.round(top + px * 10), bh = Math.max(6, Math.round(px * 1.6));
        ctx.fillStyle = 'rgba(8,12,18,0.45)'; ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = '#ff3b2e'; ctx.fillRect(bx, by, Math.round(bw * boss.hp / boss.hpMax), bh);
        F.draw(ctx, 'BOSS', W / 2, by + bh + px, px * 0.7, '#ffffff', { align: 'center' });
      }
    }
  };
  // jauge d'essence : juste la barre (fond sombre translucide), aucun contour
  CC.HUD.prototype.drawFuelBar = function (game, rk, x, y, w, h) {
    const ctx = this.ctx, R = Math.round, max = rk.fuelMax || 20, fuel = rk.active ? rk.fuel : max, k = U.clamp(fuel / max, 0, 1);
    const low = k < 0.25, blink = low && Math.floor(performance.now() / 220) % 2 === 0;
    x = R(x); y = R(y); w = R(w); h = R(h);
    ctx.fillStyle = 'rgba(8,12,18,0.4)'; ctx.fillRect(x, y, w, h);
    const fh = R(h * k); if (fh > 0) { ctx.fillStyle = blink ? '#ff7a6a' : low ? '#c24a42' : '#d9a441'; ctx.fillRect(x, y + h - fh, w, fh); }
  };
  // plus de combo ni de cinématique : seulement un petit « +1 » qui s'envole depuis la cible
  CC.HUD.prototype.drawCombo = function (game) {
    const W = this.canvas.width, H = this.canvas.height, ctx = this.ctx, now = performance.now(), pops = game.killPops;
    if (!pops || !pops.length) return;
    for (let i = pops.length - 1; i >= 0; i--) {
      const q = pops[i], a = (now - q.t0) / 650; if (a >= 1) { pops.splice(i, 1); continue; }
      const p = CC.Curve.apply(this._v.copy(q.p), game.camera).project(game.camera); if (p.z > 1) continue;
      const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H - a * H * 0.07;
      ctx.save(); ctx.globalAlpha = 1 - a * a; this.text(q.txt, sx, sy, 0.0036, '#ffffff', { align: 'center' }); ctx.restore();
    }
  };
  CC.HUD.prototype.drawCine = function () {};
})();

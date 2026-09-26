/* Système de STYLE : combos en direct ("PROXIMITY 11 x1,1") puis messages finalisés ("PROXIMITY FLIGHT! +13").
 * MESURÉ : STYLE = somme des gains ; COLD IMPACT = 100 × multiplicateur ; BOMB SMASH ≈ 7,5 × vitesse ;
 * couleurs : multiplicateur jaune, G orange (MANOEUVRE) / rouge (PULL), BOMB SMASH vert, SPEED BONUS bleu.
 * ESTIMATION : seuils de distance, taux de points, formule des G. */
(function () {
  const U = CC.U;

  class Style {
    constructor(game) { this.game = game; this.cfg = CC.CONFIG.style; this.reset(); this.near = { wall: Infinity, ground: Infinity }; }

    reset() {
      this.total = 0;
      this.popups = [];
      this.combos = {};
      this.cc = { min: Infinity, armed: false, cool: 0 };
      this.man = { t: 0, gmax: 0, vy0: 0 };
      this.groundContact = 0;
    }

    // ---- messages ----
    push(segments, color, opts) {
      opts = opts || {};
      const hudCfg = CC.CONFIG.hud.popups;
      // nouveau message au-dessus des messages existants (OBSERVÉ : les lignes gardent leur place)
      let y = hudCfg.y0;
      const used = this.popups.filter((p) => !p.dead).map((p) => p.y);
      if (used.length) { y = Math.min.apply(null, used) - hudCfg.pitch; if (y < hudCfg.yMin) y = Math.max.apply(null, used) + hudCfg.pitch; }
      const p = { segments, age: 0, y, x: hudCfg.cx + (U.rng() - 0.5) * 2 * hudCfg.jitter, live: !!opts.live, key: opts.key, dead: false };
      this.popups.push(p);
      if (!opts.live) this.game.audio.play('popup', null, opts.tone || 1);
      return p;
    }

    award(label, points, segs, tone) {
      points = Math.max(1, Math.round(points));
      this.total += points;
      const W = CC.CONFIG.hud.colors;
      const s = segs || [{ t: label + ' ', c: W.white }];
      const last = s[s.length - 1].t;
      s.push({ t: (last.endsWith(' ') ? '' : ' ') + '+' + points, c: W.white });
      this.push(s, null, { tone });
      this.game.telemetry.event('style', { label, points });
    }

    live(key, text, mult) {
      const W = CC.CONFIG.hud.colors;
      let p = this.popups.find((q) => q.live && q.key === key && !q.dead);
      const segs = [{ t: text + ' ', c: W.white }, { t: 'X' + U.formatDec(mult, 1), c: W.yellow }];
      if (!p) p = this.push(segs, null, { live: true, key });
      p.segments = segs; p.age = 0;
      return p;
    }
    endLive(key) { for (const p of this.popups) if (p.live && p.key === key) p.dead = true; }

    // ---- combos continus ----
    combo(key, active, rate, dt, finalLabel, liveLabel) {
      const c = this.combos[key] || (this.combos[key] = { on: false, pts: 0, t: 0, off: 0 });
      if (active) {
        if (!c.on) { c.on = true; c.pts = 0; c.t = 0; }
        c.off = 0; c.t += dt;
        const mult = 1 + this.cfg.comboGrowth * c.t;
        c.pts += rate * mult * dt;
        if (c.t > 0.25) this.live(key, liveLabel + ' ' + Math.round(c.pts), mult);
      } else if (c.on) {
        c.off += dt;
        if (c.off > this.cfg.endGrace) {
          c.on = false; this.endLive(key);
          if (c.pts >= 4) this.award(finalLabel, c.pts, null, 1);
        }
      }
    }

    update(dt, rocket) {
      const cfg = this.cfg;
      for (const p of this.popups) p.age += dt;
      this.popups = this.popups.filter((p) => !(p.dead || (!p.live && p.age > cfg.popupHold + cfg.popupFade)));
      if (!rocket || !rocket.active || rocket.age < 0.2) return;
      const near = this.game.world.nearest(rocket.pos, 8, this.near);
      const r = CC.CONFIG.rocket.radius;
      const wall = near.wall - r, ground = near.ground - r;
      const sp = rocket.speed;
      // PROXIMITY FLIGHT : près d'un mur
      const proxOn = wall < cfg.proximityDist && sp > 15;
      this.combo('prox', proxOn, cfg.proximityRate * (1 + Math.max(0, cfg.proximityDist - wall)), dt, 'PROXIMITY FLIGHT!', 'PROXIMITY');
      // GROUND SKIM : près du sol
      const skimOn = (ground < cfg.groundSkimDist || this.groundContact > 0) && sp > 15;
      this.combo('skim', skimOn, cfg.groundSkimRate, dt, 'GROUND SKIM!', 'SKIM');
      this.groundContact = Math.max(0, this.groundContact - dt);
      // COLD IMPACT : passage très près d'un obstacle
      const C = this.cc;
      C.cool -= dt;
      if (wall < cfg.coldImpactDist && sp > 25) { C.armed = true; C.min = Math.min(C.min, wall); }
      else if (C.armed && wall > cfg.coldImpactDist * 1.4) {
        C.armed = false;
        if (C.cool <= 0) {
          const mult = U.clamp(1 + 2 * (1 - Math.max(0, C.min) / cfg.coldImpactDist), 1, 3);
          const W = CC.CONFIG.hud.colors;
          this.award('COLD IMPACT!', cfg.coldImpactBase * Math.round(mult * 10) / 10, [{ t: 'COLD IMPACT! ', c: W.white }, { t: 'X' + U.formatDec(mult, 1), c: W.yellow }], 1.3);
          C.cool = cfg.coldImpactCooldown;
        }
        C.min = Infinity;
      }
      // MANOEUVRE / PULL : virage sous fort facteur de charge
      const M = this.man, g = rocket.gForce;
      if (g > cfg.manoeuvreG) {
        if (M.t === 0) M.vy0 = rocket.vel.y;
        M.t += dt; M.gmax = Math.max(M.gmax, g);
      } else if (M.t > 0) {
        if (M.t > cfg.manoeuvreMinTime) {
          const pull = M.vy0 < -8 && rocket.vel.y > M.vy0 + 10;
          const W = CC.CONFIG.hud.colors;
          const label = U.formatDec(M.gmax, 1) + 'G ' + (pull ? 'PULL!' : 'MANOEUVRE!');
          this.award(label, cfg.manoeuvrePointsPerG * (M.gmax - 2.95), [{ t: label + ' ', c: pull ? W.red : W.orange }], pull ? 0.8 : 0.9);
        }
        M.t = 0; M.gmax = 0;
      }
    }

    onGroundContact(dt) { this.groundContact = 0.15; }
    onBreak(kind) { this.game.telemetry.event('break', { kind }); }

    bombSmash(speed) {
      const W = CC.CONFIG.hud.colors;
      this.flushCombos();
      this.award('BOMB SMASH!', this.cfg.bombSmashPerMs * speed, [{ t: 'BOMB SMASH! ', c: W.green }, { t: '(' + Math.round(speed) + ' M/S) ', c: W.white }], 1.6);
    }
    speedBonus(saved) {
      const W = CC.CONFIG.hud.colors;
      this.award('SPEED BONUS', this.cfg.speedBonusPerSec * saved, [{ t: 'SPEED BONUS ', c: W.blue }, { t: '(' + U.formatDec(saved, 1) + 'S SAVED) ', c: W.white }], 1.8);
    }
    flushCombos() {
      for (const k in this.combos) {
        const c = this.combos[k];
        if (c.on) { c.on = false; this.endLive(k); if (c.pts >= 4) this.award(k === 'prox' ? 'PROXIMITY FLIGHT!' : 'GROUND SKIM!', c.pts, null, 1); }
      }
    }
    dropCombos() { for (const k in this.combos) { this.combos[k].on = false; this.endLive(k); } }
  }

  CC.Style = Style;
})();

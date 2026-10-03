/* v089 : TUTORIEL INTERACTIF du niveau 1 (tactile) — le jeu se met en PAUSE tant que le joueur n'a pas fait le geste montré :
 *   1. GLISSE pour tourner  →  2. MAINTIENS pour booster  →  3. VISE la première cible (on pique dessus)  →  le vrai niveau continue.
 * Chaque étape réussie est enregistrée (settings.tutStep) ; un joueur qui a déjà passé le niveau 1 ne le voit jamais.
 * `?tut=1` le force (même au banc de test). */
(function () {
  const V = THREE.Vector3, _f = new V(), _t = new V(), _p = new V();
  const T = CC.Tutorial = { hold: false, st: null };

  T.enabled = function (g) {
    const S = g.settings, run = g.endlessRun;
    if (!(CC.Touch && CC.Touch.active) && !/[?&]tut=1\b/.test(location.search)) return false;
    if (g.testMode && !/[?&]tut=1\b/.test(location.search)) return false;
    if (!run || !run.T.levelLen || (S.tutStep || 0) >= 4) return false;
    const l = g.save.lvl || {}; return (l.cur || 1) === 1 && (l.max || 1) <= 1;
  };
  const aimFwd = (g, out) => out.set(0, 0, -1).applyQuaternion(g.input.aimQ);
  const target = (g) => { const rk = g.rocket; let best = null, bd = 1e9; for (const t of g.targets) { if (!t.alive || t.guard || t.boss || !t.object) continue; const dv = _p.subVectors(t.object.position, rk.pos), d = dv.length(); if (d < 260 && d > 25 && d < bd && dv.dot(_f.set(0, 0, 0).copy(rk.fwd)) > 0) { bd = d; best = t; } } return best; };

  // appelé à chaque image avant la simulation ; renvoie vrai si le jeu doit rester figé
  T.update = function (g, dt) {
    const S = g.settings;
    if (!T.enabled(g) || g.state !== 'FLIGHT' || g.paused) { T.hold = false; if (!T.enabled(g)) T.st = null; return false; }
    const st = T.st || (T.st = { step: S.tutStep || 0, t: 0, ok: 0, got: false });
    const rk = g.rocket, tt = g.input.touch;
    const advance = (n) => { st.step = n; st.t = 0; st.ok = 0; st.f0 = null; S.tutStep = n; st.armed = false; st.pressed = false; g.writeSave(); T.hold = false; if (g.audio) g.audio.play('card'); if (CC.Haptics) CC.Haptics.pattern('mission'); };
    if (st.step === 0 || st.step === 1) st.t += dt; else if (st.step === 3) st.t += dt;
    // v090 : le geste ne compte que si le doigt a d'abord été LEVE (« armé »), puis reposé : un doigt déjà posé ne valide jamais une étape
    const down = !!(tt && tt.down);
    if (T.hold) { if (!st.armed) { if (!down) { st.armed = true; st.f0 = aimFwd(g, new V()); } } else if (down) st.pressed = true; }
    if (st.step === 0 && !T.hold && g.flightTime > 0.7) { T.hold = true; st.armed = false; st.pressed = false; }
    if (st.step === 0 && T.hold && st.armed && st.f0) { if (st.pressed && ((tt.dragPx || 0) > 45 || aimFwd(g, _f).angleTo(st.f0) > 0.3)) advance(1); }
    else if (st.step === 1) {
      if (!T.hold && st.t > 1.6) { T.hold = true; st.armed = false; st.pressed = false; }
      if (T.hold) { st.ok = st.armed && tt && tt.thrust ? st.ok + dt : 0; if (st.ok > 0.5) advance(2); }
    } else if (st.step === 2) {
      const tg = target(g);
      if (!T.hold && tg) { T.hold = true; st.tg = tg; st.armed = false; st.pressed = false; }
      if (T.hold && st.tg) {
        if (!st.tg.alive) advance(3);
        else { const dir = _t.subVectors(st.tg.object.position, rk.pos).normalize(); if (st.armed && st.pressed && ((tt.dragPx || 0) > 40 || aimFwd(g, _f).angleTo(dir) < 0.16)) { advance(3); } }
      }
    } else if (st.step === 3) {   // on laisse jouer jusqu'à la cible (ou 9 s) : fin du tutoriel
      if (st.t > 9 || (st.tg && !st.tg.alive)) advance(4);
    }
    return T.hold;
  };

  const hand = (ctx, x, y, r, t, ring) => {
    ctx.save(); ctx.globalAlpha = 0.65; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#35ff4a'; ctx.lineWidth = Math.max(3, r * 0.18); ctx.beginPath(); ctx.arc(x, y, r * (1.25 + (ring ? ((t * 1.4) % 1) * 0.6 : 0)), 0, 6.283); ctx.stroke(); ctx.restore();
  };
  const label = (g, ctx, W, H, s, sub) => {
    const F = CC.Font, px = Math.max(3, Math.round(H * 0.0058)), w = Math.min(W * 0.9, F.measure(s, px) + px * 12), h = px * 24, x = W / 2 - w / 2, y = H * 0.2;
    CC.Home.pill(ctx, x, y, w, h, 'rgba(8,60,20,0.92)', '#56ff5a');
    F.draw(ctx, s, W / 2, y + h * 0.3, Math.min(px, (w - px * 8) / Math.max(1, F.measure(s, 1))), '#ffffff', { align: 'center' });
  };

  // dessin : renvoie vrai si le tutoriel prend la main sur l'ancienne aide
  T.draw = function (ctx, W, H, g) {
    const st = T.st; if (!st || !T.enabled(g) || g.state !== 'FLIGHT') return false;
    const t = performance.now() / 1000, r = Math.min(W, H) * 0.075;
    if (!T.hold) { if (st.step === 3 && st.tg && st.tg.alive) { /* rien : on joue */ } return st.step < 3; }
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (st.step === 0) {
      const k = Math.sin(t * 2.6); hand(ctx, W * 0.5 + k * W * 0.2, H * 0.68, r, t, false);
      ctx.save(); ctx.fillStyle = '#35ff4a'; ctx.globalAlpha = 0.8; const q = r * 0.3, d = k > 0 ? 1 : -1; for (let n = 0; n < 3; n++) ctx.fillRect(Math.round(W * 0.5 + k * W * 0.2 + d * (r * 1.7 + n * q * 1.4)), Math.round(H * 0.68 - q / 2), Math.round(q), Math.round(q)); ctx.restore();
      label(g, ctx, W, H, st.armed ? 'GLISSE POUR TOURNER' : 'LEVE LE DOIGT');
    } else if (st.step === 1) {
      hand(ctx, W * 0.5, H * 0.68, r, t, true);
      const k = Math.min(1, st.ok / 0.5); ctx.save(); ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.68, r * 1.9, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke(); ctx.restore();
      label(g, ctx, W, H, st.armed ? 'MAINTIENS : BOOST' : 'LEVE LE DOIGT');
    } else if (st.step === 2 && st.tg) {
      const c = g.camera; _p.copy(st.tg.object.position); const pp = CC.Curve ? CC.Curve.apply(_p, c).project(c) : _p.project(c), sx = (pp.x * 0.5 + 0.5) * W, sy = (-pp.y * 0.5 + 0.5) * H, ok = pp.z < 1;
      if (ok) { const pr = r * (1.1 + 0.25 * Math.sin(t * 7)); ctx.save(); ctx.strokeStyle = '#ff3b2e'; ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.arc(sx, sy, pr, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx - pr * 1.5, sy); ctx.lineTo(sx - pr * 0.6, sy); ctx.moveTo(sx + pr * 1.5, sy); ctx.lineTo(sx + pr * 0.6, sy); ctx.moveTo(sx, sy - pr * 1.5); ctx.lineTo(sx, sy - pr * 0.6); ctx.moveTo(sx, sy + pr * 1.5); ctx.lineTo(sx, sy + pr * 0.6); ctx.stroke(); ctx.restore();
        const k = (t * 0.8) % 1, hx = W * 0.5 + (sx - W * 0.5) * k, hy = H * 0.72 + (sy - H * 0.72) * k; hand(ctx, hx, hy, r * 0.9, t, false); }
      label(g, ctx, W, H, st.armed ? 'GLISSE VERS LA CIBLE' : 'LEVE LE DOIGT');
    }
    return true;
  };
})();

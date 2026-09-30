/* v034 : PROGRESSION du mode CLASSIQUE — XP, niveaux, missions. Tout tient en trois idées :
 *  1. chaque vol rapporte de l'XP, même raté (distance + bonus + missions) → « même perdu, j'ai progressé » ;
 *  2. 100 XP ≈ un niveau au début ; chaque niveau ouvre un décor de plus (city, desert, snow, industry, canyon, night) ;
 *  3. trois missions en cours, visibles à l'accueil et dans le vol ; une mission finie est remplacée à la fin du vol.
 *
 * Données sauvegardées (game.save.prog) : xp (dans le niveau courant), level, runs, best (score), stats cumulées, missions.
 * Aucun serveur, aucune horloge : que du calcul local.
 *
 * Score d'un vol = mètres + points de bonus (frôlements, cibles, éclats, étoiles, ×2).  XP = score / 10 + missions + primes. */
(function () {
  const U = CC.U;
  const C = () => CC.CONFIG.progress;

  // ---------- missions : types, libellés (police ASCII : pas d'accents), mesure, barème ----------
  // scope 'run' : la meilleure valeur atteinte en un vol ; scope 'total' : cumul sur tous les vols
  const TYPES = {
    dist:    { scope: 'run',   min: 0, text: (n) => 'ATTEINDRE ' + U.formatInt(n) + ' M',                 unit: 'M',  gen: (lv) => nice(500 + 130 * lv, 100),  xp: 1.0 },
    score:   { scope: 'run',   min: 2, text: (n) => 'FAIRE ' + U.formatInt(n) + ' POINTS',                unit: '',   gen: (lv) => nice(900 + 300 * lv, 100),  xp: 1.1 },
    time:    { scope: 'run',   min: 1, text: (n) => 'SURVIVRE ' + n + ' SECONDES',                        unit: 'S',  gen: (lv) => nice(28 + 4 * lv, 5),       xp: 0.9 },
    targets: { scope: 'total', min: 0, text: (n) => 'DETRUIRE ' + n + ' CIBLES',                          unit: '',   gen: (lv) => nice(4 + lv, 1),            xp: 1.0 },
    series:  { scope: 'run',   min: 1, text: (n) => 'DETRUIRE ' + n + ' CIBLES EN UN VOL',                unit: '',   gen: (lv) => Math.min(6, 2 + Math.floor(lv / 3)), xp: 1.2 },
    boosts:  { scope: 'total', min: 0, text: (n) => 'UTILISER ' + n + ' BOOSTS',                          unit: '',   gen: (lv) => nice(8 + 2 * lv, 2),        xp: 0.8 },
    cells:   { scope: 'total', min: 0, text: (n) => 'RAMASSER ' + n + ' ECLATS',                          unit: '',   gen: (lv) => nice(60 + 15 * lv, 10),     xp: 0.9 },
    close:   { scope: 'total', min: 1, text: (n) => 'FROLER ' + n + ' FOIS LES MURS',                     unit: '',   gen: (lv) => nice(6 + lv, 1),            xp: 1.0 },
    gold:    { scope: 'total', min: 2, text: (n) => 'PRENDRE ' + n + ' ETOILES DOREES',                   unit: '',   gen: (lv) => Math.min(8, 2 + Math.floor(lv / 2)), xp: 1.3 },
  };
  function nice(v, step) { return Math.max(step, Math.round(v / step) * step); }

  class Progress {
    constructor(game) {
      this.game = game;
      const S = game.save;
      S.prog = Object.assign({ xp: 0, level: 1, runs: 0, best: 0, seed: 1, stats: {}, missions: [], seen: 1, launches: 0 }, S.prog || {});
      S.prog.stats = Object.assign({ dist: 0, targets: 0, cells: 0, boosts: 0, close: 0, gold: 0, time: 0 }, S.prog.stats);
      this.P = S.prog;
      // classement du niveau déjà enregistré dans une ancienne sauvegarde : record de distance → meilleur score au minimum
      if (S.endless && S.endless.best > this.P.best) this.P.best = S.endless.best;
      this.fill();
      this.run = null; this.toasts = [];
    }

    // ---------- niveaux ----------
    need(level) { return C().levelBase + C().levelStep * (Math.max(1, level) - 1); }
    get level() { return this.P.level; }
    get xp() { return this.P.xp; }
    rank(level) { const R = C().ranks; return R[Math.min(R.length - 1, Math.floor((level - 1) / 3))]; }
    // décors ouverts au niveau donné, dans l'ordre d'apparition
    worldsAt(level) { const W = C().worlds; return Object.keys(W).filter((k) => W[k] <= level); }
    worldName(id) { return (CC.Endless && CC.Endless.Zones[id] && CC.Endless.Zones[id].label) || id.toUpperCase(); }
    unlockedWorlds() { return this.worldsAt(this.P.level); }

    // ---------- missions ----------
    fill() {
      const P = this.P, slots = C().missionSlots;
      P.missions = (P.missions || []).filter((m) => m && TYPES[m.type]);
      while (P.missions.length < slots) P.missions.push(this.makeMission());
    }
    makeMission() {
      const P = this.P, lv = P.level, rng = U.makeRng((P.seed = ((P.seed || 1) * 1664525 + 1013904223) >>> 0));
      const used = new Set(P.missions.map((m) => m.type));
      const avail = Object.keys(TYPES).filter((k) => TYPES[k].min <= P.level - 1), pool = avail.filter((k) => !used.has(k)), list = pool.length ? pool : avail;
      const type = list[Math.floor(rng() * list.length)];
      const T = TYPES[type], target = T.gen(lv);
      const xp = Math.round((30 + 6 * lv) * T.xp / 5) * 5;
      return { type, target, xp, progress: 0, done: false, id: P.seed };
    }
    missionText(m) { return TYPES[m.type].text(m.target); }
    missionUnit(m) { return TYPES[m.type].unit; }
    // mission la plus avancée (affichée dans le vol)
    tracked() {
      let best = null, bk = -1;
      for (const m of this.P.missions) { if (m.done) continue; const k = m.progress / m.target; if (k > bk) { bk = k; best = m; } }
      return best;
    }

    // ---------- vol ----------
    beginRun() {
      this.run = { doneIds: [], missionXp: 0, dist: 0, targets: 0, cells: 0, gold: 0, boosts: 0, close: 0, time: 0, score: 0, bonus: 0, t0: performance.now() };
      this.toasts.length = 0;
    }
    // événement de jeu : 'targets' | 'cells' | 'boosts' | 'close' | 'gold' (+n)
    event(kind, n) {
      const r = this.run; if (!r) return;
      n = n === undefined ? 1 : n;
      r[kind] = (r[kind] || 0) + n;
      for (const m of this.P.missions) {
        if (m.done) continue;
        const T = TYPES[m.type];
        if (T.scope === 'total' && m.type === kind) m.progress = Math.min(m.target, m.progress + n);
        else if (m.type === 'series' && kind === 'targets') m.progress = Math.max(m.progress, r.targets);
        this.check(m);
      }
    }
    // mesures de vol continues (distance, temps, score) : appelé quelques fois par seconde
    tick(dist, score, time) {
      const r = this.run; if (!r) return;
      r.dist = dist; r.score = score; r.time = time;
      for (const m of this.P.missions) {
        if (m.done) continue;
        const v = m.type === 'dist' ? dist : m.type === 'score' ? score : m.type === 'time' ? time : null;
        if (v === null) continue;
        m.progress = Math.max(m.progress, Math.min(m.target, Math.floor(v)));
        this.check(m);
      }
    }
    check(m) {
      if (m.done || m.progress < m.target) return;
      m.done = true; this.run.doneIds.push(m.id); this.run.missionXp += m.xp;
      this.toasts.push({ text: 'MISSION ACCOMPLIE', sub: '+' + m.xp + ' XP', t: 0 });
      const g = this.game;
      g.audio.play('mission');
      if (CC.Haptics) CC.Haptics.pattern('mission');
      g.telemetry.event('mission', { type: m.type });
    }

    /* Fin du vol : calcule les gains, monte les niveaux, remplace les missions terminées. Retourne le détail affiché à l'écran
     * de fin : lignes d'XP, niveau avant / après, décors débloqués, missions (état AU MOMENT de la fin, puis renouvelées). */
    endRun(info) {
      const P = this.P, r = this.run || { doneIds: [], missionXp: 0 }, cfg = C();
      const dist = Math.floor(info.dist), bonus = Math.floor(info.bonus), score = dist + bonus;
      const lines = [];
      const xpDist = Math.floor(dist * cfg.xpPerMeter), xpBonus = Math.floor(bonus * cfg.xpPerBonus);
      lines.push({ label: 'DISTANCE', v: xpDist });
      if (xpBonus > 0) lines.push({ label: 'BONUS', v: xpBonus });
      if (r.missionXp > 0) lines.push({ label: 'MISSIONS', v: r.missionXp });
      const newRecord = score > P.best && P.best > 0, first = P.runs === 0;
      if (newRecord) lines.push({ label: 'NOUVEAU RECORD', v: cfg.recordXp });
      if (first) lines.push({ label: 'PREMIER VOL', v: cfg.firstRunXp });
      const gained = lines.reduce((a, l) => a + l.v, 0);
      const before = { level: P.level, xp: P.xp, need: this.need(P.level) };
      const worldsBefore = this.unlockedWorlds();
      const missions = P.missions.map((m) => ({ text: this.missionText(m), progress: Math.min(m.progress, m.target), target: m.target, xp: m.xp, done: m.done, justDone: r.doneIds.includes(m.id) }));
      this.addXp(gained);
      P.runs++; P.stats.dist += dist; P.stats.time += Math.floor(info.time);
      P.stats.targets += r.targets || 0; P.stats.cells += r.cells || 0; P.stats.boosts += r.boosts || 0; P.stats.close += r.close || 0; P.stats.gold += r.gold || 0;
      if (score > P.best) P.best = score;
      const after = { level: P.level, xp: P.xp, need: this.need(P.level) };
      const newWorlds = this.unlockedWorlds().filter((w) => !worldsBefore.includes(w));
      // missions terminées → remplacées
      P.missions = P.missions.filter((m) => !m.done);
      this.fill();
      this.run = null;
      return { lines, gained, before, after, levelUps: after.level - before.level, newWorlds, missions, score, dist, bonus, newRecord, first, best: P.best,
        stats: { cells: r.cells || 0, targets: r.targets || 0, boosts: r.boosts || 0, gold: r.gold || 0 } };
    }
    addXp(n) {
      const P = this.P; P.xp += n;
      while (P.xp >= this.need(P.level)) { P.xp -= this.need(P.level); P.level++; }
    }
    // prime de la publicité récompensée (XP ×2) : ajoute le même montant ; retourne l'état avant / après
    doubleXp(res) {
      const before = { level: this.P.level, xp: this.P.xp, need: this.need(this.P.level) }, w0 = this.unlockedWorlds();
      this.addXp(res.gained);
      const after = { level: this.P.level, xp: this.P.xp, need: this.need(this.P.level) };
      return { before, after, levelUps: after.level - before.level, newWorlds: this.unlockedWorlds().filter((w) => !w0.includes(w)) };
    }
    update(dt) { for (const t of this.toasts) t.t += dt; this.toasts = this.toasts.filter((t) => t.t < 2.4); }
  }
  Progress.TYPES = TYPES;

  CC.Progress = Progress;
})();

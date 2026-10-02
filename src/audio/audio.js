/* Audio original synthétisé (Web Audio). La vidéo de référence est muette : tout ce qui suit est une création (CHOIX validé).
 * Moteur (bruit filtré + grondement), vent, tir, allumage, explosions, verre, briques, grappin, bips de style, musique. */
(function () {
  const U = CC.U;

  // fonds sonores par zone : niveaux des lits (wind / low / hum / hiss) et réglages ; `night` remplace certains niveaux la nuit
  const AMBIENCE = {
    city:   { wind: 0.04, windF: 420, low: 0.07, lowF: 150, hum: 0.012, humF: 50, night: { wind: 0.03, hiss: 0.012 } },
    metro:  { wind: 0.012, windF: 260, low: 0.11, lowF: 110, hum: 0.05, humF: 60, pulse: 0.004, pulseF: 0.5 },
    port:   { wind: 0.06, windF: 700, low: 0.09, lowF: 260, hum: 0.008, humF: 48 },
    sky:    { wind: 0.2, windF: 900, low: 0.03, lowF: 120, hum: 0.0 },
    mini:   { wind: 0.012, windF: 350, low: 0.03, lowF: 120, hum: 0.02, humF: 440, hiss: 0.004, hissF: 6500 },
    forest: { wind: 0.05, windF: 520, low: 0.03, lowF: 120, hiss: 0.004, hissF: 5600, night: { hiss: 0.022 } },
    chute:  { wind: 0.3, windF: 1200, low: 0.04, lowF: 100 },
    tour:   { wind: 0.16, windF: 800, low: 0.04, lowF: 110, hum: 0.012, humF: 70 },
    eau:    { wind: 0.0, low: 0.2, lowF: 240, hum: 0.03, humF: 46, pulse: 0.01, pulseF: 0.22, hiss: 0.012, hissF: 4200 },
    usine:  { wind: 0.02, windF: 300, low: 0.1, lowF: 130, hum: 0.06, humF: 50, pulse: 0.03, pulseF: 1.1, hiss: 0.008, hissF: 3800 },
  };
  // événements lointains : intervalle (s) entre deux sons, liste (jour) et liste de nuit
  const AMBIENT_EVENTS = {
    city:   { gap: [6, 13], list: ['horn', 'siren', 'trainFar'], night: ['horn', 'siren', 'trainFar'] },
    metro:  { gap: [5, 11], list: ['trainFar', 'drip', 'drip', 'clank'] },
    port:   { gap: [5, 10], list: ['shipHorn', 'clank', 'trainFar'], night: ['shipHorn', 'clank'] },
    sky:    { gap: [7, 14], list: ['jetPass', 'jetPass', 'alarm'] },
    mini:   { gap: [4, 8], list: ['tick', 'tick', 'musicBox', 'whoosh'] },
    forest: { gap: [4, 9], list: ['owl', 'owl'], night: ['owl', 'owl'] },
    chute:  { gap: [9, 16], list: ['jetPass', 'alarm'] },
    tour:   { gap: [8, 15], list: ['jetPass', 'clank'] },
    eau:    { gap: [5, 10], list: ['whale', 'bubble', 'bubble', 'clank'] },
    usine:  { gap: [3, 6], list: ['press', 'clank', 'alarm', 'press'] },
  };

  class Audio {
    constructor() {
      this.ctx = null; this.enabled = true; this.muted = false;
      this.cfg = Object.assign({}, CC.CONFIG.audio);   // v023 : copie — couper le son ne doit pas écraser les volumes par défaut
      this.engineLevel = 0; this.windLevel = 0;
    }

    init() {
      if (this.ctx || !this.enabled) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = this.cfg.master;
      // v023 : limiteur en sortie : explosions et moteur ensemble ne saturent jamais les haut-parleurs (téléphone)
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -8; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
      this.master.connect(lim); lim.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.gain.value = this.cfg.sfx; this.sfx.connect(this.master);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.cfg.music; this.musicBus.connect(this.master);
      // bruit blanc partagé
      const len = ctx.sampleRate * 2;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // design : réacteur de missile en couches (création originale, pas un enregistrement) — tout passe par engBus :
      //  1 bourdonnement grave (2 sinus en quinte, trémolo) · 2 grondement de flammes (bruit brun saturé, passe-bas) ·
      //  3 souffle de poussée (passe-bande médium) · 4 sifflement d'air (passe-bande aigu, suit la vitesse) · 5 crépitement
      this.engBus = ctx.createGain(); this.engBus.gain.value = 0; this.engBus.connect(this.sfx);
      const loop = (buf, rate) => { const b = ctx.createBufferSource(); b.buffer = buf; b.loop = true; if (rate) b.playbackRate.value = rate; b.start(); return b; };
      const bl = ctx.sampleRate * 3, bb = ctx.createBuffer(1, bl, ctx.sampleRate), bd = bb.getChannelData(0), pops = ctx.createBuffer(1, bl, ctx.sampleRate), pd = pops.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < bl; i++) {
        brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = brown * 3.5;
        pd[i] = Math.random() < 0.0012 ? (Math.random() * 2 - 1) : pd[i - 1] ? pd[i - 1] * 0.82 : 0;   // impulsions qui s'éteignent vite
      }
      this.subA = ctx.createOscillator(); this.subA.type = 'sine'; this.subA.frequency.value = 46;
      this.subB = ctx.createOscillator(); this.subB.type = 'triangle'; this.subB.frequency.value = 69.4;
      const trem = ctx.createOscillator(); trem.frequency.value = 7.3; const tremG = ctx.createGain(); tremG.gain.value = 0.18;
      this.subGain = ctx.createGain(); this.subGain.gain.value = 0.3;
      trem.connect(tremG); tremG.connect(this.subGain.gain);
      const subMix = ctx.createGain(); subMix.gain.value = 0.55;
      this.subA.connect(subMix); this.subB.connect(subMix); subMix.connect(this.subGain); this.subGain.connect(this.engBus);
      this.subA.start(); this.subB.start(); trem.start();
      const roar = loop(bb);
      this.roarFilter = ctx.createBiquadFilter(); this.roarFilter.type = 'lowpass'; this.roarFilter.frequency.value = 420; this.roarFilter.Q.value = 0.8;
      const sat = ctx.createWaveShaper(), curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(2.6 * x); }
      sat.curve = curve;
      this.roarGain = ctx.createGain(); this.roarGain.gain.value = 0.55;
      roar.connect(this.roarFilter); this.roarFilter.connect(sat); sat.connect(this.roarGain); this.roarGain.connect(this.engBus);
      const push = loop(this.noise, 0.9);
      this.pushFilter = ctx.createBiquadFilter(); this.pushFilter.type = 'bandpass'; this.pushFilter.frequency.value = 900; this.pushFilter.Q.value = 0.7;
      this.pushGain = ctx.createGain(); this.pushGain.gain.value = 0.12;
      push.connect(this.pushFilter); this.pushFilter.connect(this.pushGain); this.pushGain.connect(this.engBus);
      const air = loop(this.noise, 1.3);
      this.hissFilter = ctx.createBiquadFilter(); this.hissFilter.type = 'bandpass'; this.hissFilter.frequency.value = 3200; this.hissFilter.Q.value = 2.2;
      this.hissGain = ctx.createGain(); this.hissGain.gain.value = 0;
      air.connect(this.hissFilter); this.hissFilter.connect(this.hissGain); this.hissGain.connect(this.sfx);   // le sifflement d'air existe aussi moteur coupé
      const crk = loop(pops);
      const crkF = ctx.createBiquadFilter(); crkF.type = 'highpass'; crkF.frequency.value = 1200;
      this.crackGain = ctx.createGain(); this.crackGain.gain.value = 0.5;
      crk.connect(crkF); crkF.connect(this.crackGain); this.crackGain.connect(this.engBus);
      // ambiance : rotor d'hélicoptère (bruit grave haché au rythme des pales), moteur de char, sifflement de missile ennemi
      const rot = loop(bb, 0.8);
      this.rotorFilter = ctx.createBiquadFilter(); this.rotorFilter.type = 'bandpass'; this.rotorFilter.frequency.value = 180; this.rotorFilter.Q.value = 0.9;
      this.rotorAM = ctx.createGain(); this.rotorAM.gain.value = 0.5;
      this.rotorLfo = ctx.createOscillator(); this.rotorLfo.type = 'sawtooth'; this.rotorLfo.frequency.value = 10.8;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.5; this.rotorLfo.connect(lfoG); lfoG.connect(this.rotorAM.gain); this.rotorLfo.start();
      this.rotorGain = ctx.createGain(); this.rotorGain.gain.value = 0;
      rot.connect(this.rotorFilter); this.rotorFilter.connect(this.rotorAM); this.rotorAM.connect(this.rotorGain); this.rotorGain.connect(this.sfx);
      const tk = loop(bb, 0.5);
      const tkF = ctx.createBiquadFilter(); tkF.type = 'lowpass'; tkF.frequency.value = 140;
      this.tankGain = ctx.createGain(); this.tankGain.gain.value = 0;
      tk.connect(tkF); tkF.connect(this.tankGain); this.tankGain.connect(this.sfx);
      const ms = loop(this.noise, 1.1);
      this.misFilter = ctx.createBiquadFilter(); this.misFilter.type = 'bandpass'; this.misFilter.frequency.value = 2400; this.misFilter.Q.value = 4;
      this.misGain = ctx.createGain(); this.misGain.gain.value = 0;
      ms.connect(this.misFilter); this.misFilter.connect(this.misGain); this.misGain.connect(this.sfx);
      // vent
      const ws = ctx.createBufferSource(); ws.buffer = this.noise; ws.loop = true; ws.playbackRate.value = 0.7;
      this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'bandpass'; this.windFilter.frequency.value = 700; this.windFilter.Q.value = 0.6;
      this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
      ws.connect(this.windFilter); this.windFilter.connect(this.windGain); this.windGain.connect(this.sfx); ws.start();
      // rétro-fusées
      const rs = ctx.createBufferSource(); rs.buffer = this.noise; rs.loop = true;
      this.retroFilter = ctx.createBiquadFilter(); this.retroFilter.type = 'highpass'; this.retroFilter.frequency.value = 1800;
      this.retroGain = ctx.createGain(); this.retroGain.gain.value = 0;
      rs.connect(this.retroFilter); this.retroFilter.connect(this.retroGain); this.retroGain.connect(this.sfx); rs.start();
      // v036 : FONDS SONORES propres à chaque zone (vent, grondement grave, souffle aigu) ; leurs niveaux glissent d'une zone à l'autre
      this.ambBus = ctx.createGain(); this.ambBus.gain.value = 1; this.ambBus.connect(this.sfx);
      const bedW = loop(this.noise, 0.6); this.bedWindF = ctx.createBiquadFilter(); this.bedWindF.type = 'bandpass'; this.bedWindF.frequency.value = 500; this.bedWindF.Q.value = 0.5;
      this.bedWind = ctx.createGain(); this.bedWind.gain.value = 0; bedW.connect(this.bedWindF); this.bedWindF.connect(this.bedWind); this.bedWind.connect(this.ambBus);
      const bedL = loop(bb, 0.55); this.bedLowF = ctx.createBiquadFilter(); this.bedLowF.type = 'lowpass'; this.bedLowF.frequency.value = 180;
      this.bedLow = ctx.createGain(); this.bedLow.gain.value = 0; bedL.connect(this.bedLowF); this.bedLowF.connect(this.bedLow); this.bedLow.connect(this.ambBus);
      this.humO = ctx.createOscillator(); this.humO.type = 'sine'; this.humO.frequency.value = 55; this.humO2 = ctx.createOscillator(); this.humO2.type = 'triangle'; this.humO2.frequency.value = 110.4;
      this.bedHum = ctx.createGain(); this.bedHum.gain.value = 0; this.humO.connect(this.bedHum); const h2 = ctx.createGain(); h2.gain.value = 0.4; this.humO2.connect(h2); h2.connect(this.bedHum); this.bedHum.connect(this.ambBus); this.humO.start(); this.humO2.start();
      const bedH = loop(this.noise, 1.4); this.bedHissF = ctx.createBiquadFilter(); this.bedHissF.type = 'highpass'; this.bedHissF.frequency.value = 5200;
      this.bedHiss = ctx.createGain(); this.bedHiss.gain.value = 0; bedH.connect(this.bedHissF); this.bedHissF.connect(this.bedHiss); this.bedHiss.connect(this.ambBus);
      this.ambLfo = ctx.createOscillator(); this.ambLfo.frequency.value = 0.3; const lg = ctx.createGain(); lg.gain.value = 0.0; this.ambLfoG = lg; this.ambLfo.connect(lg); lg.connect(this.bedHum.gain); this.ambLfo.start();
      this.music = new CC.Music(ctx, this.musicBus);
      if (this.zoneNow) this.setZone(this.zoneNow, this.darkNow);
    }

    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    setVolumes(master, music, sfx) {
      this.cfg.master = master; this.cfg.music = music; this.cfg.sfx = sfx;
      if (!this.ctx) return;
      this.master.gain.value = master; this.musicBus.gain.value = music; this.sfx.gain.value = sfx;
    }

    /* v036 : zone courante → fonds sonores, style de musique, événements lointains. Appelé par Endless.Run à chaque changement de zone. */
    setZone(zone, dark) {
      this.zoneNow = zone; this.darkNow = !!dark; this.evT = 4 + Math.random() * 5;
      if (!this.ctx) return;
      const A = AMBIENCE[zone] || AMBIENCE.city, t = this.ctx.currentTime, tc = 2.2, n = dark ? (A.night || {}) : {};
      const g = (k) => (n[k] !== undefined ? n[k] : A[k] || 0);
      this.bedWind.gain.setTargetAtTime(g('wind'), t, tc); this.bedWindF.frequency.setTargetAtTime(A.windF || 500, t, tc);
      this.bedLow.gain.setTargetAtTime(g('low'), t, tc); this.bedLowF.frequency.setTargetAtTime(A.lowF || 180, t, tc);
      this.bedHum.gain.setTargetAtTime(g('hum'), t, tc); this.humO.frequency.setTargetAtTime(A.humF || 55, t, tc); this.humO2.frequency.setTargetAtTime((A.humF || 55) * 2.01, t, tc);
      this.ambLfoG.gain.setTargetAtTime(A.pulse || 0, t, tc); this.ambLfo.frequency.setTargetAtTime(A.pulseF || 0.3, t, tc);
      this.bedHiss.gain.setTargetAtTime(g('hiss'), t, tc); this.bedHissF.frequency.setTargetAtTime(A.hissF || 5200, t, tc);
      if (this.music) this.music.setStyle(zone, dark);
    }
    // événements sonores lointains, tirés au hasard (klaxon, train lointain, corne de navire, oiseaux…) : le monde existe hors de l'écran
    updateAmbient(dt) {
      if (!this.ctx || !this.zoneNow) return;
      const E = AMBIENT_EVENTS[this.zoneNow]; if (!E) return;
      if ((this.evT -= dt) > 0) return;
      this.evT = E.gap[0] + Math.random() * (E.gap[1] - E.gap[0]);
      const list = this.darkNow && E.night ? E.night : E.list;
      if (list.length) this.play(list[Math.floor(Math.random() * list.length)], null, 'far');
    }

    // Sons continus pilotés par l'état de la roquette (design : couches du réacteur liées à la poussée, à la vitesse et à
    // l'accélération ; montée franche à l'allumage, extinction courte à la coupure).
    updateRocket(rocket, dt) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const on = rocket && rocket.active;
      const thrust = on && rocket.thrusting ? 1 : 0;
      const sp = on ? rocket.speed : 0;
      const acc = dt > 0 ? (sp - (this.lastSp || 0)) / dt : 0; this.lastSp = sp;
      this.accS = U.lerp(this.accS || 0, U.clamp(acc / 30, 0, 1), U.damp(4, dt));   // accélération lissée 0..1
      const v = U.clamp(sp / 75, 0, 1);
      this.engBus.gain.setTargetAtTime(thrust * 0.48, t, thrust ? 0.05 : 0.09);
      this.subA.frequency.setTargetAtTime(42 + v * 14 + this.accS * 5, t, 0.2);
      this.subB.frequency.setTargetAtTime((42 + v * 14 + this.accS * 5) * 1.505, t, 0.2);
      this.roarFilter.frequency.setTargetAtTime(300 + v * 520 + this.accS * 300, t, 0.1);
      this.roarGain.gain.setTargetAtTime(0.5 + this.accS * 0.25, t, 0.1);
      this.pushFilter.frequency.setTargetAtTime(700 + v * 900, t, 0.12);
      this.pushGain.gain.setTargetAtTime(0.08 + v * 0.08, t, 0.12);
      this.crackGain.gain.setTargetAtTime(0.35 + 0.4 * U.fx(), t, 0.03);                 // crépitement irrégulier
      this.hissGain.gain.setTargetAtTime(on ? v * v * 0.09 : 0, t, 0.08);
      this.hissFilter.frequency.setTargetAtTime(2200 + sp * 32, t, 0.12);
      this.windGain.gain.setTargetAtTime(on ? U.clamp((sp - 10) / 90, 0, 1) * 0.2 : 0, t, 0.1);
      this.windFilter.frequency.setTargetAtTime(400 + sp * 12, t, 0.1);
      this.retroGain.gain.setTargetAtTime(on && rocket.retroActive ? 0.25 : 0, t, 0.03);
      if (on && thrust && !this.wasThrust) this.play('engineOn');
      if (on && !thrust && this.wasThrust) this.play('engineOff');
      this.wasThrust = on && !!thrust;
    }

    // design : sons d'ambiance pilotés par la scène (distance à la caméra) : rotor du plus proche hélicoptère, moteur du
    // plus proche char, sifflement du plus proche missile ennemi (plus aigu quand il se rapproche)
    updateWorld(game, dt) {
      if (!this.ctx || !game.level) return;
      const t = this.ctx.currentTime, cam = game.camera.position;
      let heli = Infinity, tank = Infinity, mis = Infinity;
      for (const tg of game.targets) {
        if (!tg.alive) continue;
        const d = tg.object.position.distanceTo(cam);
        if (tg.type === 'heli' || tg.type === 'heliCamo') heli = Math.min(heli, d); else if (tg.type === 'tank') tank = Math.min(tank, d);
      }
      for (const m of game.missiles) if (m.alive) mis = Math.min(mis, m.pos.distanceTo(cam));
      const att = (d, ref) => d === Infinity ? 0 : U.clamp(ref / (ref + d), 0, 1);
      this.rotorGain.gain.setTargetAtTime(att(heli, 25) * 0.9, t, 0.15);
      this.rotorLfo.frequency.setTargetAtTime(10.8, t, 0.5);
      this.tankGain.gain.setTargetAtTime(att(tank, 8) * 0.7, t, 0.2);
      this.misGain.gain.setTargetAtTime(att(mis, 12) * 0.35, t, 0.05);
      this.misFilter.frequency.setTargetAtTime(mis === Infinity ? 2000 : 1800 + 2600 * att(mis, 20), t, 0.05);
    }

    // design : atténuation des sons ponctuels avec la distance (caméra) — un char qui tire à 120 m reste discret
    distGain(pos) {
      if (!pos || !this.cam) return 1;
      const d = pos.distanceTo(this.cam.position);
      return U.clamp(35 / (35 + d), 0.08, 1);
    }

    env(node, t, a, peak, dec) {
      node.gain.setValueAtTime(0.0001, t);
      node.gain.exponentialRampToValueAtTime(peak, t + a);
      node.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    }
    noiseHit(freq, type, q, peak, dec, rate) {
      const ctx = this.ctx, t = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rate || 1;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain();
      s.connect(f); f.connect(g); g.connect(this.dest || this.sfx);
      this.env(g, t, 0.005, peak, dec);
      s.start(t, Math.random()); s.stop(t + dec + 0.1);
      return f;
    }
    tone(type, f0, f1, peak, dec, delay) {
      const ctx = this.ctx, t = ctx.currentTime + (delay || 0);
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dec);
      const g = ctx.createGain(); o.connect(g); g.connect(this.dest || this.sfx);
      this.env(g, t, 0.004, peak, dec);
      o.start(t); o.stop(t + dec + 0.05);
    }

    // Bruit filtré dont la fréquence glisse de f0 à f1 (souffles, whoosh).
    sweep(f0, f1, type, q, peak, dec, delay) {
      const ctx = this.ctx, t = ctx.currentTime + (delay || 0);
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dec);
      const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(this.dest || this.sfx);
      this.env(g, t, Math.min(0.08, dec * 0.3), peak, dec);
      s.start(t, Math.random()); s.stop(t + dec + 0.15);
    }
    /* v023 : explosion plus crédible sans être réaliste à l'excès : claquement initial, déflagration dont l'aigu s'éteint vite,
     * coup de grave, débris qui crépitent, queue grave qui roule. `size` : 1 = roquette / cible, 0,45 = petit missile. */
    explosion(size) {
      const ctx = this.ctx, t = ctx.currentTime, k = size;
      this.noiseHit(4000, 'highpass', 0.7, 0.6 * k, 0.05);                       // claquement
      const s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.6;
      f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.15); f.frequency.exponentialRampToValueAtTime(140, t + 1.2 * k + 0.4);
      const sh = ctx.createWaveShaper(); const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(2.2 * x); }   // légère saturation : plus de corps
      sh.curve = curve;
      const g = ctx.createGain(); s.connect(f); f.connect(sh); sh.connect(g); g.connect(this.dest || this.sfx);
      this.env(g, t, 0.004, 0.75 * k, 1.1 * k + 0.5);
      s.start(t, Math.random()); s.stop(t + 1.8 * k + 0.8);
      this.tone('sine', 75, 26, 0.7 * k, 0.9 * k + 0.25);                          // coup de grave
      const tail = this.noiseHit(260, 'lowpass', 0.5, 0.55 * k, 2.8 * k + 0.4, 0.5);   // queue qui roule
      tail.frequency.setValueAtTime(320, t); tail.frequency.exponentialRampToValueAtTime(90, t + 2.8 * k + 0.4);
      const n = Math.round(5 + 9 * k);
      for (let i = 0; i < n; i++) {                                                 // débris
        const d = 0.06 + Math.random() * (0.7 * k + 0.2);
        setTimeout(() => { if (this.ctx) this.noiseHit(900 + Math.random() * 2600, 'bandpass', 2.5, (0.08 + Math.random() * 0.14) * k, 0.03 + Math.random() * 0.06); }, d * 1000);
      }
    }

    /* v034 : montée en puissance du lanceur (durée dur s) : sirène qui monte, souffle qui s'ouvre, grave qui gonfle.
     * Elle s'arrête d'elle-même à l'allumage (le grondement du réacteur prend le relais). */
    chargeWhine(dur) {
      const ctx = this.ctx, t = ctx.currentTime, out = this.dest || this.sfx;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(460, t + dur);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(3400, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.26, t + dur * 0.9); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.04);
      o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.08);
      const sub = ctx.createOscillator(); sub.type = 'sine';
      sub.frequency.setValueAtTime(38, t); sub.frequency.exponentialRampToValueAtTime(96, t + dur);
      const sg = ctx.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.5, t + dur * 0.95); sg.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
      sub.connect(sg); sg.connect(out); sub.start(t); sub.stop(t + dur + 0.1);
      this.sweep(260, 2800, 'bandpass', 1.1, 0.3, dur);
    }

    play(name, pos, param) {
      if (!this.ctx || this.muted) return;
      const dg = this.distGain(pos);
      if (dg < 0.999) { this.dest = this.ctx.createGain(); this.dest.gain.value = dg; this.dest.connect(this.sfx); }
      try { this.playRaw(name, param); } finally { this.dest = null; }
    }
    playRaw(name, param) {
      switch (name) {
        case 'launch':   // v023 : « chunk » pneumatique du tube, puis souffle qui s'éloigne
          this.tone('sine', 140, 45, 0.9, 0.18); this.noiseHit(700, 'lowpass', 0.8, 0.7, 0.12);
          this.sweep(900, 2600, 'bandpass', 0.7, 0.35, 0.45, 0.04); break;
        case 'ignite':   // v023 : « whoosh » qui monte + coup sourd à l'allumage
          this.sweep(300, 1800, 'bandpass', 0.9, 0.5, 0.4); this.tone('sine', 70, 38, 0.6, 0.25); break;
        case 'boom': this.explosion(1); break;
        case 'boomSmall': this.explosion(0.45); break;
        case 'glass': for (let i = 0; i < 5; i++) setTimeout(() => this.noiseHit(5000 + Math.random() * 3000, 'bandpass', 8, 0.35, 0.12), i * 28); break;
        case 'brick': this.noiseHit(600, 'lowpass', 1, 0.7, 0.35, 0.7); this.tone('square', 90, 50, 0.15, 0.15); break;
        case 'grapple': this.tone('square', 300, 1400, 0.12, 0.12); this.noiseHit(3000, 'highpass', 1, 0.2, 0.1); break;
        case 'release': this.tone('triangle', 900, 300, 0.12, 0.1); break;
        case 'popup': this.tone('square', 660 * (param || 1), 990 * (param || 1), 0.06, 0.08); break;
        case 'toggle': this.tone('square', 220, 180, 0.08, 0.06); break;
        case 'ui': this.tone('square', 700, 900, 0.1, 0.05); this.tone('triangle', 350, 350, 0.06, 0.07, 0.01); break;   // v086 : plus net
        case 'uiTick': this.tone('square', 1000 + (param || 0) * 60, 1000 + (param || 0) * 60, 0.08, 0.04); break;
        case 'uiLock': this.tone('square', 220, 150, 0.1, 0.18); this.tone('square', 180, 120, 0.08, 0.2, 0.1); break;
        case 'uiBuy': [880, 1175, 1568].forEach((f, i) => this.tone('square', f, f, 0.08, 0.1, i * 0.06)); this.noiseHit(5000, 'highpass', 1, 0.08, 0.05); break;
        case 'uiPromote': [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => { this.tone('square', f, f, 0.09, 0.2, i * 0.07); this.tone('triangle', f / 2, f / 2, 0.1, 0.25, i * 0.07); }); this.sweep(600, 6000, 'highpass', 0.8, 0.16, 0.7, 0.1); break;
        case 'unlock': this.tone('sine', 120, 60, 0.3, 0.4); this.noiseHit(1800, 'bandpass', 2, 0.3, 0.1); setTimeout(() => { if (this.ctx) { [392, 523, 659, 784, 1046].forEach((f, i) => { this.tone('square', f, f, 0.09, 0.3, i * 0.08); this.tone('triangle', f / 2, f / 2, 0.11, 0.35, i * 0.08); }); this.sweep(800, 6000, 'highpass', 0.8, 0.15, 0.8, 0.1); } }, 280); break;
        case 'chestShake': this.noiseHit(900, 'bandpass', 3, 0.14, 0.05); this.tone('square', 140 + (param || 0) * 25, 120, 0.08, 0.06); break;
        case 'chestOpen': this.explosion(0.5); this.sweep(300, 5200, 'bandpass', 0.9, 0.5, 0.5); [659, 784, 988, 1318, 1568].forEach((f, i) => this.tone('square', f, f, 0.09, 0.3, 0.1 + i * 0.07)); break;
        case 'card': this.tone('square', 880 + (param || 0) * 110, 1320 + (param || 0) * 110, 0.08, 0.1); this.tone('triangle', 440, 440, 0.06, 0.12); break;
        case 'target': this.tone('square', 523, 523, 0.1, 0.1); this.tone('square', 784, 784, 0.1, 0.18, 0.1); break;
        // design : départ de coup de canon de char (claquement, déflagration grave, écho) ; roquette d'hélicoptère (sifflement)
        case 'tankFire': this.noiseHit(2500, 'highpass', 0.7, 0.35, 0.04); this.tone('sine', 110, 38, 0.55, 0.45); this.sweep(1800, 300, 'lowpass', 0.7, 0.45, 0.5);
          this.sweep(900, 200, 'bandpass', 1.2, 0.12, 0.8, 0.18); break;
        case 'heliFire': this.noiseHit(3000, 'highpass', 0.8, 0.2, 0.03); this.sweep(600, 3200, 'bandpass', 1.5, 0.22, 0.35); this.tone('sine', 90, 50, 0.25, 0.2); break;
        // design : allumage du réacteur (claquement + montée) et coupure (souffle qui s'éteint)
        case 'engineOn': this.noiseHit(1800, 'bandpass', 1.2, 0.18, 0.05); this.sweep(400, 1600, 'bandpass', 1, 0.22, 0.18); break;
        case 'engineOff': this.sweep(1200, 250, 'lowpass', 0.8, 0.2, 0.3); break;
        case 'warnMissile': this.tone('square', 1320, 1320, 0.07, 0.05); this.tone('square', 1320, 1320, 0.07, 0.05, 0.09); break;   // v026 : bip-bip d'alerte
        case 'warnFuel': this.tone('triangle', 880, 880, 0.12, 0.12); this.tone('triangle', 587, 587, 0.12, 0.2, 0.15); break;     // v026 : deux notes descendantes
        // v034 : lanceur — verrous qui claquent + sirène de charge ; allumage : détonation sourde, souffle, coup de grave
        case 'clunk': this.tone('square', 150, 60, 0.28, 0.1); this.noiseHit(700, 'lowpass', 1.2, 0.35, 0.09); this.tone('triangle', 900, 700, 0.06, 0.05, 0.03); break;   // v034 : la roquette se pose dans le rail
        // v036 : le monde vivant — chaque son existe aussi en version « lointaine » (param === 'far' : plus doux, plus grave)
        case 'trainPass': case 'trainFar': { const far = param === 'far' || name === 'trainFar', k = far ? 0.45 : 1;
          this.sweep(90, 380, 'lowpass', 0.9, 0.5 * k, 1.5); this.sweep(420, 110, 'lowpass', 0.9, 0.42 * k, 1.6, 1.2);
          this.tone('sawtooth', 233, 233, 0.09 * k, 0.8); this.tone('sawtooth', 294, 294, 0.09 * k, 0.8);
          for (let i = 0; i < 14; i++) setTimeout(() => { if (this.ctx) this.noiseHit(1700 + (i % 2) * 500, 'bandpass', 3, 0.13 * k, 0.05); }, 160 + i * 105);
          break; }
        case 'horn': this.tone('square', 392, 392, param === 'far' ? 0.03 : 0.07, 0.3); this.tone('square', 494, 494, param === 'far' ? 0.03 : 0.07, 0.3); break;
        case 'carPass': this.sweep(180, 720, 'bandpass', 1.2, 0.16, 0.45); this.sweep(720, 220, 'bandpass', 1.2, 0.2, 0.6, 0.4); break;
        case 'siren': for (let i = 0; i < 4; i++) { this.tone('sine', 620, 620, param === 'far' ? 0.03 : 0.06, 0.28, i * 0.6); this.tone('sine', 820, 820, param === 'far' ? 0.03 : 0.06, 0.28, i * 0.6 + 0.3); } break;
        case 'birds': for (let k = 0; k < 5; k++) { const f = 2300 + Math.random() * 1600; this.tone('sine', f, f * 1.3, 0.05, 0.07, k * 0.13); this.tone('sine', f * 1.25, f * 0.9, 0.035, 0.06, k * 0.13 + 0.06); } break;
        case 'gull': this.tone('triangle', 900, 1500, 0.06, 0.28); this.tone('triangle', 1500, 800, 0.06, 0.32, 0.22); this.tone('triangle', 1100, 1700, 0.04, 0.2, 0.6); break;
        case 'owl': this.tone('sine', 330, 300, 0.07, 0.4); this.tone('sine', 280, 250, 0.07, 0.6, 0.55); break;
        case 'shipHorn': this.tone('sawtooth', 98, 98, param === 'far' ? 0.06 : 0.14, 1.7); this.tone('sawtooth', 147, 147, param === 'far' ? 0.05 : 0.11, 1.7); this.noiseHit(300, 'lowpass', 0.6, 0.05, 1.5, 0.4); break;
        case 'clank': this.noiseHit(2400, 'bandpass', 6, param === 'far' ? 0.12 : 0.25, 0.14); this.tone('square', 190, 120, 0.08, 0.14); this.tone('triangle', 1300, 900, 0.05, 0.3, 0.05); break;
        case 'press': this.tone('sine', 62, 28, param === 'far' ? 0.3 : 0.75, 0.4); this.noiseHit(1500, 'lowpass', 0.8, param === 'far' ? 0.25 : 0.55, 0.3); this.noiseHit(6500, 'highpass', 0.7, 0.14, 0.5, 1.2); break;
        case 'jetPass': this.sweep(380, 2700, 'bandpass', 0.8, param === 'far' ? 0.12 : 0.3, 0.7); this.sweep(2700, 480, 'bandpass', 0.8, param === 'far' ? 0.1 : 0.25, 1.0, 0.55); break;
        case 'door': { const k = Math.min(8, param || 0), f = 520 * Math.pow(1.0595, k * 2); this.tone('square', f, f * 1.5, 0.08, 0.1); this.tone('square', f * 1.5, f * 2, 0.05, 0.12, 0.07); break; }
        case 'splash': this.sweep(2600, 260, 'bandpass', 0.9, 0.3, 0.55); this.sweep(900, 140, 'lowpass', 0.8, 0.22, 0.7); break;
        case 'whale': this.tone('sine', 70, 175, 0.22, 1.5); this.tone('sine', 180, 88, 0.18, 1.7, 0.9); this.tone('sine', 140, 140, 0.05, 2.4, 0.2); break;
        case 'bubble': for (let k = 0; k < 3; k++) this.tone('sine', 500 + Math.random() * 400, 900 + Math.random() * 500, 0.04, 0.07, k * 0.11); break;
        case 'tick': this.noiseHit(3500, 'highpass', 2, 0.07, 0.02); this.noiseHit(2500, 'highpass', 2, 0.05, 0.02); break;
        case 'musicBox': { const sc = [0, 2, 4, 7, 9, 12, 14, 16], f0 = 880; for (let k = 0; k < 4; k++) { const f = f0 * Math.pow(2, sc[Math.floor(Math.random() * sc.length)] / 12); this.tone('triangle', f, f, 0.05, 0.6, k * 0.22); this.tone('sine', f * 2, f * 2, 0.02, 0.4, k * 0.22); } break; }
        case 'drip': this.tone('sine', 1500, 650, 0.06, 0.14); break;
        case 'alarm': for (let i = 0; i < 3; i++) this.tone('square', 880, 880, 0.03, 0.18, i * 0.4); break;
        case 'whoosh': this.sweep(300, 1800, 'bandpass', 1, 0.3, 0.5); break;
        case 'ring': [784, 1175, 1568].forEach((f, i) => this.tone('sine', f, f, 0.09, 0.22, i * 0.07)); break;
        case 'ringSeries': [659, 784, 988, 1318, 1568].forEach((f, i) => { this.tone('square', f, f, 0.08, 0.3, i * 0.08); this.tone('triangle', f / 2, f / 2, 0.1, 0.35, i * 0.08); }); this.sweep(800, 5200, 'highpass', 0.8, 0.14, 0.6, 0.15); break;
        case 'padArm': this.tone('square', 190, 80, 0.32, 0.09); this.noiseHit(1100, 'bandpass', 2, 0.4, 0.06); this.tone('square', 260, 120, 0.2, 0.07, 0.11); this.chargeWhine(CC.CONFIG.pad.chargeTime); break;
        case 'padIgnite': this.explosion(0.55); this.sweep(180, 2600, 'bandpass', 0.9, 0.75, 0.55); this.tone('sine', 62, 28, 0.95, 0.7); this.noiseHit(3500, 'highpass', 0.7, 0.4, 0.09); break;
        // v034 : éclat ramassé — gamme pentatonique montante (param = rang dans la série : plus on enchaîne, plus c'est aigu)
        case 'cell': { const sc = [0, 2, 4, 7, 9, 12, 14, 16], f = 660 * Math.pow(2, sc[Math.min(sc.length - 1, param | 0)] / 12); this.tone('square', f, f * 1.01, 0.05, 0.07); this.tone('triangle', f * 2, f * 2, 0.04, 0.09, 0.02); break; }
        case 'gold': [784, 988, 1175, 1568].forEach((f, i) => this.tone('square', f, f, 0.08, 0.16, i * 0.055)); this.noiseHit(6000, 'highpass', 1, 0.12, 0.2); break;
        case 'mult': this.sweep(400, 3200, 'bandpass', 1.3, 0.3, 0.35); [523, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.12, 0.2, 0.08 + i * 0.07)); break;
        case 'xpTick': this.tone('square', 1300 + (param || 0) * 60, 1300 + (param || 0) * 60, 0.035, 0.03); break;
        case 'levelUp': [523, 659, 784, 1046, 1318].forEach((f, i) => { this.tone('square', f, f, 0.09, 0.28, i * 0.085); this.tone('triangle', f / 2, f / 2, 0.12, 0.3, i * 0.085); }); this.sweep(800, 5200, 'highpass', 0.8, 0.14, 0.6, 0.1); break;
        case 'mission': this.tone('triangle', 784, 784, 0.14, 0.14); this.tone('triangle', 1175, 1175, 0.14, 0.34, 0.12); this.tone('square', 1568, 1568, 0.05, 0.3, 0.12); break;
        case 'boostOn': this.sweep(450, 3200, 'bandpass', 1.2, 0.36, 0.3); this.tone('sine', 96, 44, 0.55, 0.24); this.noiseHit(2600, 'highpass', 0.8, 0.16, 0.09); break;
        case 'shield': this.sweep(300, 2400, 'bandpass', 1.4, 0.3, 0.4); this.tone('triangle', 880, 1320, 0.1, 0.3); break;
        case 'record': [659, 784, 988, 1318].forEach((f, i) => this.tone('square', f, f, 0.08, 0.2, i * 0.07)); break;
      }
    }
  }

  /* Musique originale, séquencée à l'avance. v036 : un MOTEUR A STYLES — chaque zone (et chaque nuit) a son tempo, sa gamme, sa batterie, sa basse,
   * son arpège et ses nappes ; quand la zone change, le nouveau style prend le relais à la mesure suivante (le tempo glisse). Même base
   * harmonique et même boîte à rythmes que le style d'origine, mais l'ambiance change nettement : bas et sourd dans le métro, cuivré au port,
   * aérien en altitude, boîte à musique dans le monde miniature, martelé à l'usine, etc. */
  const P16 = (s) => Array.from({ length: 16 }, (_, i) => (s.indexOf(i) >= 0 ? 1 : 0));   // motif : liste des pas actifs (0–15)
  const STYLES = {
    city:    { bpm: 112, root: 40, scale: [0, 3, 5, 7, 10], prog: [0, 0, -4, -2], kick: P16([0, 4, 8, 12]), snare: P16([4, 12]), hat: P16([1, 3, 5, 7, 9, 11, 13, 15]),
               bass: { type: 'sawtooth', steps: P16([0, 2, 4, 6, 8, 10, 12, 14]), oct: 0, len: 1.8, vol: 0.16, cut: 500 }, arp: { type: 'square', steps: P16([2, 6, 10, 11]), oct: 2, len: 1.4, vol: 0.05, cut: 2600 } },
    cityNight: { bpm: 100, root: 38, scale: [0, 3, 5, 7, 10], prog: [0, -2, -4, -5], kick: P16([0, 6, 8, 14]), snare: P16([4, 12]), hat: P16([2, 6, 10, 14]),
               bass: { type: 'sawtooth', steps: P16([0, 3, 6, 8, 11, 14]), oct: 0, len: 2.2, vol: 0.15, cut: 420 }, arp: { type: 'sawtooth', steps: P16([0, 2, 4, 6, 8, 10, 12, 14]), oct: 2, len: 1.6, vol: 0.04, cut: 1800, echo: 3 },
               pad: { type: 'sawtooth', vol: 0.035, cut: 900, attack: 0.7, iv: [0, 7, 12, 15] } },
    metro:   { bpm: 92, root: 36, scale: [0, 3, 5, 7, 10], prog: [0, 0, -2, -4], kick: P16([0, 10]), snare: [], hat: P16([6, 14]),
               bass: { type: 'sine', steps: P16([0, 8]), oct: 0, len: 7, vol: 0.22, cut: 300 }, arp: { type: 'sine', steps: P16([2, 7, 11]), oct: 2, len: 2.4, vol: 0.05, cut: 1400, echo: 3 },
               pad: { type: 'triangle', vol: 0.04, cut: 500, attack: 0.9, iv: [0, 7, 10] }, ping: { p: 0.03, oct: 3 } },
    port:    { bpm: 104, root: 43, scale: [0, 2, 4, 7, 9], prog: [0, 5, 0, -3], kick: P16([0, 6, 8]), snare: P16([4, 12]), hat: P16([2, 4, 6, 10, 12, 14]),
               bass: { type: 'triangle', steps: P16([0, 3, 8, 11]), oct: 0, len: 2.6, vol: 0.2, cut: 700 }, arp: { type: 'triangle', steps: P16([0, 2, 4, 6, 8, 10, 12, 14]), oct: 2, len: 1.2, vol: 0.06, cut: 3200 } },
    portNight: { bpm: 90, root: 41, scale: [0, 2, 4, 7, 9], prog: [0, 5, -3, -5], kick: P16([0, 10]), snare: P16([12]), hat: P16([4, 12]),
               bass: { type: 'triangle', steps: P16([0, 6, 10]), oct: 0, len: 3.2, vol: 0.2, cut: 500 }, arp: { type: 'sine', steps: P16([0, 4, 8, 10, 14]), oct: 2, len: 2.2, vol: 0.05, cut: 2000, echo: 2 },
               pad: { type: 'sine', vol: 0.045, cut: 800, attack: 0.9, iv: [0, 7, 12, 16] } },
    sky:     { bpm: 124, root: 45, scale: [0, 2, 4, 7, 9], prog: [0, 5, 7, 3], kick: P16([0, 4, 8, 12]), snare: P16([4, 12]), hat: P16([0, 2, 4, 6, 8, 10, 12, 14]),
               bass: { type: 'sawtooth', steps: P16([0, 2, 6, 8, 10, 14]), oct: -12, len: 1.5, vol: 0.12, cut: 380 }, arp: { type: 'sawtooth', steps: P16([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]), oct: 2, len: 0.8, vol: 0.028, cut: 2400 },
               pad: { type: 'sawtooth', vol: 0.04, cut: 1200, attack: 0.6, iv: [0, 7, 12, 16] } },
    mini:    { bpm: 118, root: 52, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 7, 0], kick: [], snare: P16([12]), hat: P16([0, 4, 8, 12]),
               bass: { type: 'triangle', steps: P16([0, 6, 8, 14]), oct: -12, len: 0.8, vol: 0.14, cut: 900 }, arp: { type: 'triangle', steps: P16([0, 2, 3, 5, 7, 8, 10, 11, 13, 15]), oct: 1, len: 1.2, vol: 0.07, cut: 4200, echo: 2 }, ping: { p: 0.06, oct: 2 } },
    forest:  { bpm: 78, root: 41, scale: [0, 2, 3, 7, 8], prog: [0, -4, -2, -5], kick: P16([0]), snare: [], hat: [],
               bass: { type: 'sine', steps: P16([0, 8]), oct: 0, len: 6, vol: 0.18, cut: 400 }, arp: { type: 'triangle', steps: P16([0, 5, 8, 11]), oct: 2, len: 3, vol: 0.05, cut: 1800, echo: 4 },
               pad: { type: 'triangle', vol: 0.05, cut: 700, attack: 1.0, iv: [0, 7, 12] } },
    forestNight: { bpm: 70, root: 38, scale: [0, 2, 3, 7, 8], prog: [0, -2, -4, -2], kick: [], snare: [], hat: [],
               bass: { type: 'sine', steps: P16([0]), oct: 0, len: 12, vol: 0.2, cut: 300 }, arp: { type: 'sine', steps: P16([3, 9, 13]), oct: 3, len: 3, vol: 0.04, cut: 2400, echo: 4 },
               pad: { type: 'triangle', vol: 0.05, cut: 600, attack: 1.2, iv: [0, 7, 10, 15] }, ping: { p: 0.04, oct: 3 } },
    chute:   { bpm: 140, root: 38, scale: [0, 3, 5, 7, 10], prog: [0, 0, -2, -5], kick: P16([0, 4, 8, 12]), snare: P16([4, 12]), hat: P16([0, 2, 4, 6, 8, 10, 12, 14, 15]),
               bass: { type: 'sawtooth', steps: P16([0, 2, 4, 6, 8, 10, 12, 14]), oct: -12, len: 1.0, vol: 0.15, cut: 900 }, arp: { type: 'square', steps: P16([1, 3, 5, 7, 9, 11, 13, 15]), oct: 2, len: 0.7, vol: 0.04, cut: 3000 } },
    tour:    { bpm: 120, root: 40, scale: [0, 2, 4, 7, 9], prog: [0, 2, 4, 7], kick: P16([0, 4, 8, 12]), snare: P16([12]), hat: P16([2, 6, 10, 14]),
               bass: { type: 'sawtooth', steps: P16([0, 4, 8, 12]), oct: 0, len: 3, vol: 0.14, cut: 600 }, arp: { type: 'triangle', steps: P16([0, 2, 4, 6, 8, 10, 12, 14]), oct: 2, len: 1.3, vol: 0.06, cut: 3400, rise: true },
               pad: { type: 'sawtooth', vol: 0.035, cut: 1000, attack: 0.8, iv: [0, 7, 12] } },
    eau:     { bpm: 68, root: 36, scale: [0, 2, 5, 7, 9], prog: [0, 0, -3, -5], kick: P16([0]), snare: [], hat: [],
               bass: { type: 'sine', steps: P16([0, 10]), oct: 0, len: 8, vol: 0.22, cut: 260 }, arp: { type: 'sine', steps: P16([2, 5, 9, 12]), oct: 2, len: 2.6, vol: 0.05, cut: 900, echo: 3 },
               pad: { type: 'sine', vol: 0.06, cut: 500, attack: 1.4, iv: [0, 7, 12, 14] }, ping: { p: 0.05, oct: 3 } },
    usine:   { bpm: 128, root: 37, scale: [0, 1, 5, 7, 10], prog: [0, 0, 0, -2], kick: P16([0, 4, 8, 12]), snare: P16([4, 12]), hat: P16([2, 6, 10, 14]), clank: P16([3, 7, 11, 15]),
               bass: { type: 'square', steps: P16([0, 3, 6, 8, 11, 14]), oct: -12, len: 1.2, vol: 0.11, cut: 380 }, arp: { type: 'square', steps: P16([2, 10]), oct: 3, len: 0.6, vol: 0.035, cut: 2000 } },
  };
  class Music {
    constructor(ctx, out) {
      this.ctx = ctx; this.out = out; this.playing = false; this.step = 0; this.next = 0; this.timer = null;
      this.st = STYLES.city; this.pending = null; this.key = 'city'; this.bpmNow = this.st.bpm;
    }
    start() {
      if (this.playing) return;
      this.playing = true; this.next = this.ctx.currentTime + 0.1; this.step = 0;
      this.timer = setInterval(() => this.schedule(), 50);
    }
    stop() { this.playing = false; clearInterval(this.timer); }
    // style d'une zone (version nuit si elle existe) : appliqué à la prochaine mesure
    setStyle(zone, dark) {
      const key = dark && STYLES[zone + 'Night'] ? zone + 'Night' : (dark && zone === 'city' ? 'cityNight' : zone);
      if (key === this.key || !STYLES[key]) return;
      this.key = key; this.pending = STYLES[key];
    }
    note(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
    voice(type, freq, t, dur, vol, cutoff, attack) {
      const ctx = this.ctx, a = attack || 0.01;
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 2000;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
    }
    noise(t, type, freq, q, vol, dur) {
      const ctx = this.ctx, n = ctx.createBufferSource(); n.buffer = CC.game.audio.noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(f); f.connect(g); g.connect(this.out); n.start(t, Math.random()); n.stop(t + dur + 0.02);
    }
    schedule() {
      const ctx = this.ctx;
      while (this.next < ctx.currentTime + 0.2) {
        const s = this.step % 64, bar = s >> 4, p = s & 15, t = this.next;
        if (s === 0 && this.pending) { this.st = this.pending; this.pending = null; }
        const st = this.st, sp = 60 / this.bpmNow / 4, root = st.root + st.prog[bar];
        this.bpmNow += (st.bpm - this.bpmNow) * 0.03;
        if (st.kick[p]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.65, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.2); }
        if (st.hat[p]) this.noise(t, 'highpass', 7000, 0.7, 0.07, 0.04);
        if (st.snare[p]) this.noise(t, 'bandpass', 1800, 0.7, 0.22, 0.14);
        if (st.clank && st.clank[p]) this.noise(t, 'bandpass', 3400, 6, 0.09, 0.09);
        const b = st.bass;
        if (b && b.steps[p]) this.voice(b.type, this.note(root + (b.oct || 0)), t, sp * b.len, b.vol, b.cut);
        const a = st.arp;
        if (a && a.steps[p]) {
          const k = a.rise ? (p / 2 + bar * 2) % st.scale.length : (p * 3 + bar) % st.scale.length;
          const nn = root + 12 * a.oct + st.scale[k | 0] + (a.rise ? 12 * Math.floor(bar / 2) * 0 : 0);
          this.voice(a.type, this.note(nn), t, sp * a.len, a.vol, a.cut);
          if (a.echo) this.voice(a.type, this.note(nn), t + sp * a.echo, sp * a.len * 1.4, a.vol * 0.45, (a.cut || 2000) * 0.7);
        }
        if (st.pad && p === 0 && (bar % 2) === 0) for (const iv of st.pad.iv) this.voice(st.pad.type, this.note(root + 12 + iv), t, sp * 30, st.pad.vol, st.pad.cut, st.pad.attack);
        if (st.ping && Math.random() < st.ping.p) this.voice('triangle', this.note(root + 12 * st.ping.oct + st.scale[Math.floor(Math.random() * st.scale.length)]), t, sp * 6, 0.05, 4200);
        this.step++; this.next += sp;
      }
    }
  }
  Music.STYLES = STYLES;

  CC.Audio = Audio; CC.Music = Music;
})();

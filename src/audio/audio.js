/* Audio original synthétisé (Web Audio). La vidéo de référence est muette : tout ce qui suit est une création (CHOIX validé).
 * Moteur (bruit filtré + grondement), vent, tir, allumage, explosions, verre, briques, grappin, bips de style, musique. */
(function () {
  const U = CC.U;

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
      // v023 : réacteur = souffle grave (bruit passe-bas) + sifflement de tuyère (passe-bande aigu) + crépitement
      // (bruit brun modulé par des impulsions aléatoires). Plus de dent de scie : le bourdonnement faisait « électronique ».
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      this.engFilter = ctx.createBiquadFilter(); this.engFilter.type = 'lowpass'; this.engFilter.frequency.value = 420; this.engFilter.Q.value = 0.7;
      this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
      src.connect(this.engFilter); this.engFilter.connect(this.engGain); this.engGain.connect(this.sfx); src.start();
      const hs = ctx.createBufferSource(); hs.buffer = this.noise; hs.loop = true; hs.playbackRate.value = 1.3;
      this.hissFilter = ctx.createBiquadFilter(); this.hissFilter.type = 'bandpass'; this.hissFilter.frequency.value = 3200; this.hissFilter.Q.value = 0.9;
      this.hissGain = ctx.createGain(); this.hissGain.gain.value = 0;
      hs.connect(this.hissFilter); this.hissFilter.connect(this.hissGain); this.hissGain.connect(this.sfx); hs.start();
      const cl = ctx.sampleRate * 2, cb = ctx.createBuffer(1, cl, ctx.sampleRate), cd = cb.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < cl; i++) {
        brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        const pop = Math.random() < 0.0009 ? 1 : 0;                  // ≈ 40 crépitements par seconde
        cd[i] = brown * 3.2 + (pop ? (Math.random() * 2 - 1) : 0) * 0.9;
      }
      const cs = ctx.createBufferSource(); cs.buffer = cb; cs.loop = true;
      const cf = ctx.createBiquadFilter(); cf.type = 'lowpass'; cf.frequency.value = 1400;
      this.rumbleGain = ctx.createGain(); this.rumbleGain.gain.value = 0;
      cs.connect(cf); cf.connect(this.rumbleGain); this.rumbleGain.connect(this.sfx); cs.start();
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
      this.music = new CC.Music(ctx, this.musicBus);
    }

    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    setVolumes(master, music, sfx) {
      this.cfg.master = master; this.cfg.music = music; this.cfg.sfx = sfx;
      if (!this.ctx) return;
      this.master.gain.value = master; this.musicBus.gain.value = music; this.sfx.gain.value = sfx;
    }

    // Sons continus pilotés par l'état de la roquette.
    updateRocket(rocket, dt) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const on = rocket && rocket.active;
      const thrust = on && rocket.thrusting ? 1 : 0;
      const sp = on ? rocket.speed : 0;
      this.engGain.gain.setTargetAtTime(thrust * 0.55, t, 0.06);
      this.hissGain.gain.setTargetAtTime(thrust * (0.05 + sp * 0.0012), t, 0.06);
      this.rumbleGain.gain.setTargetAtTime(thrust * 0.32, t, 0.06);
      this.engFilter.frequency.setTargetAtTime(320 + sp * 6, t, 0.12);
      this.hissFilter.frequency.setTargetAtTime(2600 + sp * 18, t, 0.12);
      this.windGain.gain.setTargetAtTime(on ? U.clamp((sp - 10) / 90, 0, 1) * 0.22 : 0, t, 0.1);
      this.windFilter.frequency.setTargetAtTime(400 + sp * 12, t, 0.1);
      this.retroGain.gain.setTargetAtTime(on && rocket.retroActive ? 0.25 : 0, t, 0.03);
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
      s.connect(f); f.connect(g); g.connect(this.sfx);
      this.env(g, t, 0.005, peak, dec);
      s.start(t, Math.random()); s.stop(t + dec + 0.1);
      return f;
    }
    tone(type, f0, f1, peak, dec, delay) {
      const ctx = this.ctx, t = ctx.currentTime + (delay || 0);
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dec);
      const g = ctx.createGain(); o.connect(g); g.connect(this.sfx);
      this.env(g, t, 0.004, peak, dec);
      o.start(t); o.stop(t + dec + 0.05);
    }

    // Bruit filtré dont la fréquence glisse de f0 à f1 (souffles, whoosh).
    sweep(f0, f1, type, q, peak, dec, delay) {
      const ctx = this.ctx, t = ctx.currentTime + (delay || 0);
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dec);
      const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(this.sfx);
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
      const g = ctx.createGain(); s.connect(f); f.connect(sh); sh.connect(g); g.connect(this.sfx);
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

    play(name, pos, param) {
      if (!this.ctx || this.muted) return;
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
        case 'ui': this.tone('square', 520, 520, 0.06, 0.05); break;
        case 'target': this.tone('square', 523, 523, 0.1, 0.1); this.tone('square', 784, 784, 0.1, 0.18, 0.1); break;
        case 'warnMissile': this.tone('square', 1320, 1320, 0.07, 0.05); this.tone('square', 1320, 1320, 0.07, 0.05, 0.09); break;   // v026 : bip-bip d'alerte
        case 'warnFuel': this.tone('triangle', 880, 880, 0.12, 0.12); this.tone('triangle', 587, 587, 0.12, 0.2, 0.15); break;     // v026 : deux notes descendantes
      }
    }
  }

  /* Musique originale : boucle électro 112 BPM (basse, grosse caisse, charleston, arpège), séquencée à l'avance. */
  class Music {
    constructor(ctx, out) {
      this.ctx = ctx; this.out = out; this.playing = false; this.step = 0; this.bpm = 112; this.next = 0; this.timer = null;
      this.scale = [0, 3, 5, 7, 10];
      this.prog = [0, 0, -4, -2];
    }
    start() {
      if (this.playing) return;
      this.playing = true; this.next = this.ctx.currentTime + 0.1; this.step = 0;
      this.timer = setInterval(() => this.schedule(), 50);
    }
    stop() { this.playing = false; clearInterval(this.timer); }
    note(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
    voice(type, freq, t, dur, vol, cutoff) {
      const ctx = this.ctx;
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 2000;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
    }
    schedule() {
      const ctx = this.ctx, sp = 60 / this.bpm / 4;
      while (this.next < ctx.currentTime + 0.2) {
        const s = this.step % 64, bar = Math.floor(s / 16), root = 40 + this.prog[bar], t = this.next;
        if (s % 4 === 0) { // grosse caisse
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
          g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
          o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.2);
        }
        if (s % 2 === 1) { // charleston
          const n = ctx.createBufferSource(); n.buffer = CC.game.audio.noise;
          const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
          n.connect(f); f.connect(g); g.connect(this.out); n.start(t, Math.random()); n.stop(t + 0.06);
        }
        if (s % 16 === 4 || s % 16 === 12) { // caisse claire
          const n = ctx.createBufferSource(); n.buffer = CC.game.audio.noise;
          const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
          n.connect(f); f.connect(g); g.connect(this.out); n.start(t, Math.random()); n.stop(t + 0.16);
        }
        if (s % 2 === 0) this.voice('sawtooth', this.note(root + (s % 8 === 6 ? 12 : 0)), t, sp * 1.8, 0.16, 500);
        if (s % 4 === 2 || s % 8 === 3) this.voice('square', this.note(root + 24 + this.scale[(s * 3 + bar) % 5]), t, sp * 1.4, 0.05, 2600);
        this.step++; this.next += sp;
      }
    }
  }

  CC.Audio = Audio; CC.Music = Music;
})();

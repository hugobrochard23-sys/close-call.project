/* Audio original synthétisé (Web Audio). La vidéo de référence est muette : tout ce qui suit est une création (CHOIX validé).
 * Moteur (bruit filtré + grondement), vent, tir, allumage, explosions, verre, briques, grappin, bips de style, musique. */
(function () {
  const U = CC.U;

  class Audio {
    constructor() {
      this.ctx = null; this.enabled = true; this.muted = false;
      this.cfg = CC.CONFIG.audio;
      this.engineLevel = 0; this.windLevel = 0;
    }

    init() {
      if (this.ctx || !this.enabled) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = this.cfg.master; this.master.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.gain.value = this.cfg.sfx; this.sfx.connect(this.master);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.cfg.music; this.musicBus.connect(this.master);
      // bruit blanc partagé
      const len = ctx.sampleRate * 2;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // moteur : bruit passe-bande + dent de scie grave
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      this.engFilter = ctx.createBiquadFilter(); this.engFilter.type = 'lowpass'; this.engFilter.frequency.value = 900; this.engFilter.Q.value = 1.2;
      this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
      src.connect(this.engFilter); this.engFilter.connect(this.engGain); this.engGain.connect(this.sfx); src.start();
      this.rumble = ctx.createOscillator(); this.rumble.type = 'sawtooth'; this.rumble.frequency.value = 48;
      const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 160;
      this.rumbleGain = ctx.createGain(); this.rumbleGain.gain.value = 0;
      this.rumble.connect(rf); rf.connect(this.rumbleGain); this.rumbleGain.connect(this.sfx); this.rumble.start();
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
      this.engGain.gain.setTargetAtTime(thrust * 0.35, t, 0.05);
      this.rumbleGain.gain.setTargetAtTime(thrust * 0.18, t, 0.05);
      this.engFilter.frequency.setTargetAtTime(500 + sp * 14, t, 0.1);
      this.rumble.frequency.setTargetAtTime(40 + sp * 0.35, t, 0.1);
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

    play(name, pos, param) {
      if (!this.ctx || this.muted) return;
      switch (name) {
        case 'launch': this.noiseHit(1200, 'lowpass', 0.7, 0.9, 0.5); this.tone('sine', 120, 40, 0.8, 0.35); break;
        case 'ignite': this.noiseHit(2500, 'bandpass', 0.8, 0.4, 0.25); break;
        case 'boom': {
          const f = this.noiseHit(1800, 'lowpass', 0.8, 1.0, 1.6, 0.6);
          f.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 1.4);
          this.tone('sine', 90, 28, 0.9, 1.2); break;
        }
        case 'boomSmall': this.noiseHit(1400, 'lowpass', 0.8, 0.5, 0.6, 0.8); this.tone('sine', 110, 40, 0.4, 0.4); break;
        case 'glass': for (let i = 0; i < 5; i++) setTimeout(() => this.noiseHit(5000 + Math.random() * 3000, 'bandpass', 8, 0.35, 0.12), i * 28); break;
        case 'brick': this.noiseHit(600, 'lowpass', 1, 0.7, 0.35, 0.7); this.tone('square', 90, 50, 0.15, 0.15); break;
        case 'grapple': this.tone('square', 300, 1400, 0.12, 0.12); this.noiseHit(3000, 'highpass', 1, 0.2, 0.1); break;
        case 'release': this.tone('triangle', 900, 300, 0.12, 0.1); break;
        case 'popup': this.tone('square', 660 * (param || 1), 990 * (param || 1), 0.06, 0.08); break;
        case 'toggle': this.tone('square', 220, 180, 0.08, 0.06); break;
        case 'ui': this.tone('square', 520, 520, 0.06, 0.05); break;
        case 'target': this.tone('square', 523, 523, 0.1, 0.1); this.tone('square', 784, 784, 0.1, 0.18, 0.1); break;
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

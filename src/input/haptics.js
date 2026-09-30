/* Vibrations (v024). Réglage « VIBRATION » : 0 = OFF, 1 = LOW, 2 = MEDIUM, 3 = HIGH (game.settings.vibration).
 *  - Android et navigateurs qui ont l'API Vibration : navigator.vibrate (impulsions, et vibration continue par motif).
 *  - iPhone : Safari n'a pas cette API. Repli : un interrupteur invisible (<input type="checkbox" switch>, Safari 17.4+)
 *    produit un « tic » haptique quand on le bascule. Apple a bloqué ce déclenchement par script à partir d'iOS 26.5 :
 *    sur un iPhone à jour, il est probable que rien ne vibre. Pas de vibration continue possible : des tics rapprochés.
 * Toute erreur est ignorée : la vibration est un bonus, jamais une condition pour jouer. */
(function () {
  const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  let sw = null;
  function iosTick() {
    try {
      if (!sw) {
        const label = document.createElement('label');
        label.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none;';
        const input = document.createElement('input');
        input.type = 'checkbox'; input.setAttribute('switch', '');
        label.appendChild(input); document.body.appendChild(label);
        sw = label;
      }
      sw.click();
    } catch (e) { /* pas de retour haptique disponible */ }
  }

  const H = {
    level: 2,
    // impulsions (ms) selon l'intensité : [OFF, LOW, MEDIUM, HIGH]
    // v034 : + ignite (allumage du lanceur), collect (éclat, très léger), gold, boostKick (départ du boost)
    pulses: { warn: [0, 30, 60, 90], touch: [0, 4, 8, 12], button: [0, 8, 15, 25], fire: [0, 20, 40, 70], boost: [0, 25, 45, 80],
      ignite: [0, 45, 90, 140], collect: [0, 3, 5, 8], gold: [0, 14, 26, 40], boostKick: [0, 30, 55, 95] },
    // v034 : motifs [vibrer, pause, vibrer, …] en ms (durées de vibration mises à l'échelle du réglage)
    patterns: {
      charge: [8, 92, 12, 80, 16, 70, 20, 60, 24, 48, 30, 36, 36, 24, 42, 12],   // 0,9 s : de plus en plus rapprochées et fortes
      levelUp: [30, 50, 30, 50, 60, 60, 120], mission: [25, 60, 45], record: [20, 40, 20, 40, 20, 40, 90],
    },
    pattern(name) {
      const p = this.patterns[name];
      if (!p || !this.level) return;
      const f = [0, 0.5, 1, 1.6][this.level], arr = p.map((v, i) => (i % 2 ? v : Math.max(4, Math.round(v * f))));
      if (canVibrate) { try { navigator.vibrate(arr); } catch (e) { /* ignoré */ } }
      else { let t = 0; arr.forEach((v, i) => { if (i % 2 === 0) setTimeout(iosTick, t); t += v; }); }
    },
    // vibration continue du boost : [durée vibrée, pause] par cycle ; iPhone : intervalle entre deux tics (ms)
    cont: [null, [14, 56], [28, 32], [60, 10]], iosEvery: [0, 220, 130, 75],
    timer: null,
    tick(kind) {
      const ms = (this.pulses[kind] || this.pulses.button)[this.level];
      if (!ms) return;
      if (canVibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignoré */ } } else iosTick();
    },
    boostStart() {
      this.boostStop();
      if (!this.level) return;
      this.tick('boostKick');
      if (canVibrate) {
        const [on, off] = this.cont[this.level], pattern = [];
        for (let t = 0; t < 4000; t += on + off) pattern.push(on, off);
        const run = () => { try { navigator.vibrate(pattern); } catch (e) { /* ignoré */ } };
        run(); this.timer = setInterval(run, 3900);            // motif relancé avant sa fin : vibration sans trou
      } else this.timer = setInterval(iosTick, this.iosEvery[this.level]);
    },
    boostStop() {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      if (canVibrate) { try { navigator.vibrate(0); } catch (e) { /* ignoré */ } }
    },
    setLevel(l) { this.level = Math.max(0, Math.min(3, l | 0)); if (!this.level) this.boostStop(); },
  };
  CC.Haptics = H;
})();

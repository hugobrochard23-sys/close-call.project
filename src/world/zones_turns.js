/* v064 : virages dans toutes les zones — des scènes libres (sans trajectoire imposée) reçoivent turns: 'auto' (voir Z.TURN_PRESETS dans zones.js). */
(function () {
  const Z = CC.Zones;
  const LIST = { port: ['conteneurs', 'entrepots'], usine: ['convoyeurs', 'cuves'], metro: ['tunnel'], eau: ['recif', 'grotte'], sky: ['piste'], mini: ['cuisine'], tour: ['echafaudages'], chute: ['falaises'], city: ['boulevard', 'marche'] };
  for (const z in LIST) { const def = Z.defs[z]; if (!def) continue; for (const n of LIST[z]) if (def.scenes[n] && !def.scenes[n].turns) def.scenes[n].turns = 'auto'; }
})();

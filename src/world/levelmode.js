/* v076 : MODE NIVEAUX — des parcours de longueur fixe (de plus en plus longs et durs) qui se terminent par une arène et un BOSS ;
 * le vaincre ouvre le niveau suivant et donne un coffre d'écrous. Un niveau = une graine fixe (le même parcours à chaque essai), UNE zone
 * (qui change à chaque niveau), une longueur, un facteur de difficulté, un boss, un décor de lanceur.
 * v078 : 60 niveaux ; chaque niveau a un THEME (mélange de cibles et d'ennemis de garde différent : chasse aux hélicoptères, blindés, batteries
 * de missiles…) et, dès le niveau 4, des MINI-BOSS répartis sur le parcours avant le boss final. */
(function () {
  const ZN = ['city', 'forest', 'port', 'usine', 'tour', 'sky', 'metro', 'mini', 'eau', 'chute'];
  // v080 : un boss différent par niveau — chaque zone a ses designs (models_boss.js), qui reviennent avec une autre palette de couleurs (bossTint)
  const POOL = { city: ['gunship', 'mech', 'zeppelin'], forest: ['spider', 'mech', 'tank'], port: ['ship', 'gunship', 'zeppelin'], usine: ['mech', 'spider', 'tank'], tour: ['ufo', 'zeppelin', 'bomber'],
    sky: ['bomber', 'ufo', 'gunship'], metro: ['drill', 'spider', 'mech'], mini: ['toybot', 'spider', 'tank'], eau: ['sub', 'squid'], chute: ['ufo', 'bomber', 'zeppelin'] };
  // thèmes : ground / air = tirage des cibles (au sol / en altitude) ; foe = poids des ennemis de garde (chars, lance-missiles, hélicoptères)
  const THEMES = [
    { name: 'MIXTE', ground: ['tank', 'truck', 'heli', 'heli', 'sam'], air: ['heli', 'heli', 'heli', 'heli', 'truck'], foe: { tank: 1, sam: 1, heli: 1 } },
    { name: 'CHASSE AUX HELICOS', ground: ['heli', 'heli', 'tank'], air: ['heli'], foe: { tank: 0.3, sam: 0.5, heli: 2.4 } },
    { name: 'BLINDES', ground: ['tank', 'tank', 'truck', 'sam'], air: ['heli', 'tank'], foe: { tank: 2.4, sam: 0.7, heli: 0.4 } },
    { name: 'BATTERIES DE MISSILES', ground: ['sam', 'sam', 'tank', 'truck'], air: ['heli', 'heli'], foe: { tank: 0.5, sam: 2.6, heli: 0.6 } },
    { name: 'CONVOI', ground: ['truck', 'truck', 'tank', 'sam'], air: ['heli', 'truck'], foe: { tank: 1.4, sam: 1, heli: 0.8 } },
    { name: 'ESCADRON', ground: ['heli', 'heli', 'sam'], air: ['heli'], foe: { tank: 0.2, sam: 1.6, heli: 2.2 } },
    { name: 'FORTERESSE', ground: ['tank', 'sam', 'sam', 'truck'], air: ['heli', 'sam'], foe: { tank: 2, sam: 2, heli: 1 } },
  ];
  const MINI = ['tank', 'heli', 'sam'];
  const def = (n) => {
    n = Math.max(1, n | 0);
    const zone = ZN[(n - 1) % ZN.length], flat = CC.Zones.PROFILE[zone].elev === 0, th = n <= 2 ? THEMES[0] : THEMES[(n * 3 + Math.floor(n / 7)) % THEMES.length];
    const nm = n < 4 ? 0 : n < 9 ? 1 : n < 17 ? 2 : 3, hp = n <= 3 ? 1 : Math.min(10, 1 + Math.floor((n - 1) / 3)), len = Math.min(6500, 1500 + 280 * (n - 1));
    const mids = [];
    const pool = POOL[zone] || POOL.city, k = Math.floor((n - 1) / ZN.length), boss = pool[k % pool.length];
    for (let i = 0; i < nm; i++) { let mt = pool[(k + 1 + i) % pool.length]; if (mt === boss) mt = pool[(k + 2 + i) % pool.length]; if (mt === boss) mt = MINI[(n + i) % MINI.length]; mids.push({ d: Math.round(len * (i + 1) / (nm + 1)), type: mt, tint: (k + i + 2) % 6, hp: Math.min(5, 2 + Math.floor(n / 12)) }); }
    return {
      n, zone, seed: 7000 + n * 131, len,
      difK: 0.7 + 0.3 * (n - 1),                       // la difficulté (cibles, ouvertures, missiles) monte avec le numéro du niveau
      hp,                                              // les trois premiers boss tombent d'un coup, ensuite de plus en plus de points de vie
      boss, bossTint: k % 6, theme: th, mids,
      // départ DIRECTEMENT dans la zone (même altitude que le lanceur) ; les zones en contrebas / en altitude (métro, profondeur, base aérienne) sont atteintes par une rampe très courte
      order: (flat ? [] : ['city']).concat(new Array(90).fill(zone)),
      chest: 25 + 10 * n,
    };
  };
  CC.LM = { ZN, def, count: 60, THEMES, POOL };
})();

/* v076 : MODE NIVEAUX — des parcours de longueur fixe (de plus en plus longs et durs) qui se terminent par une arène et un BOSS ;
 * le vaincre ouvre le niveau suivant et donne un coffre d'écrous. Un niveau = une graine fixe (le même parcours à chaque essai), UNE zone
 * (qui change à chaque niveau), une longueur, un facteur de difficulté, un boss, un décor de lanceur.
 * v078 : 60 niveaux ; chaque niveau a un THEME (mélange de cibles et d'ennemis de garde différent : chasse aux hélicoptères, blindés, batteries
 * de missiles…) et, dès le niveau 4, des MINI-BOSS répartis sur le parcours avant le boss final. */
(function () {
  const ZN = ['city', 'forest', 'port', 'usine', 'tour', 'sky', 'metro', 'mini', 'eau', 'chute'];
  // v081 : un engin militaire réaliste différent par niveau (models_boss.js) ; chaque zone a ses 6 engins, dans l'ordre de ses 6 passages (niveau n, n+10, n+20…) ;
  // la livrée (bossTint) change aussi. Dans les zones aériennes (tour, base aérienne, chute) : avions et hélicoptères ; en mer : sous-marins de 3 types.
  const POOL = { city: ['ifv', 'gunship', 'aagun', 'mlrs', 'tank', 'heli'], forest: ['tank', 'spg', 'ifv', 'sam', 'mlrs', 'aagun'], port: ['destroyer', 'gunship', 'mlrs', 'aagun', 'spg', 'heli'],
    usine: ['aagun', 'spg', 'tank', 'sam', 'ifv', 'mlrs'], tour: ['jet', 'gunship', 'heli', 'bomber', 'jet', 'gunship'], sky: ['bomber', 'jet', 'gunship', 'heli', 'jet', 'bomber'],
    metro: ['train', 'ifv', 'tank', 'spg', 'sam', 'mlrs'], mini: ['tank', 'ifv', 'sam', 'aagun', 'mlrs', 'spg'], eau: ['sub', 'sub', 'sub', 'sub', 'sub', 'sub'], chute: ['jet', 'bomber', 'gunship', 'heli', 'jet', 'bomber'] };
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
    const nm = n < 4 ? 0 : n < 9 ? 1 : n < 17 ? 2 : 3, hp = n <= 3 ? 1 : Math.min(10, 1 + Math.floor((n - 1) / 3)), len = n === 1 ? 900 : n === 2 ? 1200 : Math.min(6500, 1500 + 280 * (n - 1));   // v093 : niveaux 1-2 courts (30-40 s)
    const mids = [];
    const pool = POOL[zone] || POOL.city, k = Math.floor((n - 1) / ZN.length), boss = pool[k % pool.length];
    for (let i = 0; i < nm; i++) { let mt = pool[(k + 1 + 2 * i) % pool.length]; if (mt === boss && zone !== 'eau') mt = pool[(k + 2 + 2 * i) % pool.length]; if (mt === boss && zone !== 'eau') mt = MINI[(n + i) % MINI.length]; mids.push({ d: Math.round(len * (i + 1) / (nm + 1)), type: mt, tint: (k + i + 3) % 6, variant: (k + i + 1) % 3, hp: Math.min(5, 2 + Math.floor(n / 12)) }); }
    return {
      n, zone, seed: 7000 + n * 131, len,
      difK: 0.35 + 0.075 * (n - 1),                    // v084 : la difficulté (cibles, ouvertures, missiles) monte DOUCEMENT avec le numéro du niveau (niveau 1 : 0,35 ; niveau 10 : 1 ; niveau 40 : 3,3)
      ease: Math.min(1, (n - 1) / 35),                 // 0 → 1 sur 35 niveaux : ouvertures, slaloms et virages passent de très larges à serrés
      hp,                                              // les trois premiers boss tombent d'un coup, ensuite de plus en plus de points de vie
      boss, bossTint: (k + ZN.indexOf(zone)) % 6, bossVar: k % 3, look: (k + 2 * ZN.indexOf(zone)) % 6, theme: th, mids,
      event: n < 3 ? null : { type: ['rain', 'storm', 'convoy'][(n + k) % 3], d: Math.round(len * (0.5 + 0.1 * ((n * 7) % 3))) },   // v083 : un événement par niveau (dès le niveau 3)
      // départ DIRECTEMENT dans la zone (même altitude que le lanceur) ; les zones en contrebas / en altitude (métro, profondeur, base aérienne) sont atteintes par une rampe très courte
      order: (flat ? [] : ['city']).concat(new Array(90).fill(zone)),
      chest: 10 + 3 * n,   // v086 : les écrous sont plus rares (le garage a maintenant 30 niveaux d'amélioration par pièce)
    };
  };
  CC.LM = { ZN, def, count: 120, THEMES, POOL };
})();

/* v076 : MODE NIVEAUX — des parcours de longueur fixe (de plus en plus longs et durs) qui se terminent par une arène et un MINI-BOSS ;
 * le vaincre ouvre le niveau suivant et donne un coffre d'écrous. Un niveau = une graine fixe (le même parcours à chaque essai), UNE zone
 * (qui change à chaque niveau), une longueur, un facteur de difficulté, un boss (hélicoptère, char, lance-missiles), un décor de lanceur. */
(function () {
  const ZN = ['city', 'forest', 'port', 'usine', 'tour', 'sky', 'metro', 'mini', 'eau', 'chute'];
  const BOSS = ['heli', 'tank', 'heli', 'sam'];
  const def = (n) => {
    n = Math.max(1, n | 0);
    const zone = ZN[(n - 1) % ZN.length], flat = CC.Zones.PROFILE[zone].elev === 0;
    return {
      n, zone, seed: 7000 + n * 131, len: Math.min(6500, 1500 + 280 * (n - 1)),
      difK: 0.7 + 0.3 * (n - 1),                       // la difficulté (cibles, ouvertures, missiles) monte avec le numéro du niveau
      hp: n <= 3 ? 1 : Math.min(8, 1 + Math.floor((n - 1) / 3)),   // les trois premiers boss tombent d'un coup, ensuite de plus en plus de points de vie
      boss: BOSS[(n - 1) % BOSS.length],
      // départ DIRECTEMENT dans la zone (même altitude que le lanceur) ; les zones en contrebas / en altitude (métro, profondeur, base aérienne) sont atteintes par une rampe très courte
      order: (flat ? [] : ['city']).concat(new Array(90).fill(zone)),
      chest: 25 + 10 * n,
    };
  };
  CC.LM = { ZN, def, count: 30 };
})();

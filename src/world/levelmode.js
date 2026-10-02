/* v075 : MODE NIVEAUX — des parcours de longueur fixe (de plus en plus longs et durs) qui se terminent par une arène et un MINI-BOSS ;
 * le vaincre ouvre le niveau suivant (et une nouvelle zone tous les deux niveaux) et donne un coffre d'écrous.
 * Un niveau = une graine fixe (le même parcours à chaque essai : on apprend, on progresse), une zone, une longueur, un facteur de difficulté. */
(function () {
  const ZN = ['city', 'forest', 'port', 'usine', 'tour', 'sky', 'metro', 'mini', 'eau', 'chute'];
  const def = (n) => {
    n = Math.max(1, n | 0);
    const zone = ZN[Math.floor((n - 1) / 2) % ZN.length];
    return {
      n, zone, seed: 7000 + n * 131, len: Math.min(6500, 1500 + 280 * (n - 1)),
      difK: 0.7 + 0.3 * (n - 1),                     // la difficulté (cibles, ouvertures, missiles) monte avec le numéro du niveau
      hp: 3 + Math.floor(n / 2),                       // points de vie du boss
      order: ['city'].concat(new Array(89).fill(zone)),   // on part toujours de la ville (altitude de départ), puis la zone du niveau
      chest: 25 + 10 * n,
    };
  };
  CC.LM = { ZN, def, count: 30 };
})();

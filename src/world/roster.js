/* v083 : ENNEMIS COHERENTS AVEC CHAQUE LIEU — pas d'hélicoptère sous l'eau ni en forêt, des avions à la base aérienne, des patrouilleurs au port, des sites antiaériens
 * à l'usine, des sous-marins et des mines en mer… Les niveaux (thèmes de levelmode.js) décident SEULEMENT de la proportion air / sol ; ce tableau décide QUI.
 *   ground : engins au sol (ou à l'eau pour le patrouilleur) · air : engins qui volent ou nagent à hauteur de la trajectoire. */
(function () {
  const R = CC.Roster = {};
  R.AIR = { heli: 1, jet: 1, sub: 1, mine: 1, gunship: 1 };
  R.ZONE = {
    city:   { ground: ['tank', 'truck', 'sam', 'ifv', 'tank'], air: ['heli'] },
    forest: { ground: ['tank', 'jeep', 'ifv', 'aagun', 'sam', 'jeep'], air: [] },
    port:   { ground: ['truck', 'sam', 'aaturret', 'boat', 'boat', 'tank'], air: [] },
    usine:  { ground: ['aaturret', 'truck', 'aagun', 'ifv', 'aaturret'], air: [] },
    tour:   { ground: [], air: ['heli', 'jet'] },
    sky:    { ground: ['sam', 'radar', 'aagun', 'truck'], air: ['jet', 'jet', 'heli'] },
    metro:  { ground: ['aaturret', 'ifv', 'jeep', 'tank'], air: [] },
    mini:   { ground: ['tank', 'ifv', 'jeep', 'sam'], air: [] },
    eau:    { ground: [], air: ['sub', 'sub', 'mine', 'sub'] },
    chute:  { ground: [], air: ['heli', 'jet'] },
  };
  const FORM = { city: 'heli', forest: 'jeep', port: 'truck', usine: 'truck', tour: 'jet', sky: 'jet', metro: 'jeep', mini: 'jeep', eau: 'mine', chute: 'jet' };
  const TL = { tank: 1, ifv: 1, spg: 1, mlrs: 1, aagun: 1, jeep: 1, aaturret: 1, boat: 1, destroyer: 1, train: 1 };   // engins « comme le char » : le modèle regarde vers −Z → on les retourne
  const SCALE = { tank: 2.4, truck: 2.4, sam: 2.4, heli: 2.2, ifv: 2.4, jeep: 2.5, aagun: 2.2, aaturret: 2.2, boat: 2.2, radar: 2.2, jet: 1.5, sub: 1.5, mine: 2.2, spg: 2.0, mlrs: 2.0 };
  R.RAD = { tank: 5.5, truck: 5.5, sam: 4.5, heli: 8, ifv: 6, jeep: 4.5, aagun: 6.5, aaturret: 7, boat: 8, radar: 6, jet: 10, sub: 8, mine: 6 };
  R.zone = (z) => R.ZONE[z] || R.ZONE.city;
  R.isAir = (type) => !!R.AIR[type];
  R.face = (type) => (TL[type] ? 180 : 0);
  // choisit un engin pour la zone : wantAir = le thème demande un engin volant (sinon, au sol) ; si la zone n'a que l'un des deux, on prend celui-là
  R.pick = (zone, wantAir, r) => { const z = R.zone(zone), a = z.air, g = z.ground; const list = wantAir ? (a.length ? a : g) : (g.length ? g : a); return list[Math.floor(r() * list.length)]; };
  R.goldType = (zone, r) => { const z = R.zone(zone), list = (r() < 0.5 && z.air.length ? z.air : z.ground.concat(z.air)).filter((t) => t !== 'mine' && t !== 'boat'); return (list.length ? list : ['heli'])[Math.floor(r() * list.length)] || 'heli'; };
  R.formationType = (zone) => FORM[zone] || 'heli';
  R.scale = (type) => SCALE[type] || 2.4;
  R.opts = (type, extra) => Object.assign({ scale: R.scale(type) * (extra && extra.gold ? 1.12 : 1), drift: R.isAir(type) ? (type === 'jet' ? 16 : type === 'sub' ? 9 : 5) : (type === 'boat' ? 3 : 2.2), driftSpeed: type === 'jet' ? 0.6 : 0.45 }, extra || {});
  // ennemis de garde (qui tirent) autorisés par zone, dérivés du tableau : tank = un engin au sol « comme le char », sam = lance-missiles ou site antiaérien, heli = avion, hélicoptère ou sous-marin
  const GT = { tank: 1, ifv: 1, jeep: 1, aagun: 1, spg: 1, mlrs: 1 }, GA = { heli: 1, jet: 1, sub: 1 };
  R.enemies = (zone) => { const z = R.zone(zone); return { tank: z.ground.some((t) => GT[t]) ? 1 : 0, sam: z.ground.some((t) => t === 'sam' || t === 'aaturret') ? 1 : 0, heli: z.air.some((t) => GA[t]) ? 1 : 0 }; };
  R.guardType = (kind, zone, r) => { const z = R.zone(zone), pool = kind === 'tank' ? z.ground.filter((t) => GT[t]) : kind === 'sam' ? z.ground.filter((t) => t === 'sam' || t === 'aaturret') : z.air.filter((t) => GA[t]); return pool.length ? pool[Math.floor(r() * pool.length)] : kind; };
  if (CC.Zones) CC.Zones.enemies = (zone) => R.enemies(zone);
})();

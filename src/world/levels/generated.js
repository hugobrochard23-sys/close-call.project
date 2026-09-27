/* Générateur de missions (v032) — fiche de niveau d'une mission générée.
 * Remplace la carte aléatoire AUTOMAP (v007) : la carte est un plan procédural complet (src/world/gen/), construit à la
 * volée d'après une graine et une difficulté (FACILE, MOYEN, DIFFICILE, IMPOSSIBLE). Même graine + même difficulté
 * = même carte, pour tout le monde (partage, défis, carte du jour).
 * Le plan fournit aussi les routes du pilote automatique : les missions restent enregistrables et mesurables par le
 * banc de test (`?test=1&autopilot=1&gen=hard&seed=1234`). */
(function () {
  const G = CC.Gen;

  /* Fiche de niveau à partir d'un plan de mission. */
  G.toLevel = function (plan) {
    const P = plan.profile, D = G.Difficulties.get(plan.difficulty), bd = plan.bounds, L = plan.launcher;
    const cx = (bd.x0 + bd.x1) / 2, cz = (bd.z0 + bd.z1) / 2;
    const env = JSON.parse(JSON.stringify(plan.env.def));
    const level = {
      id: 'gen-' + plan.difficulty, name: 'MISSION ' + D.label, hud: 'C', mode: 'targets',
      impactVariant: plan.env.dark > 0.4 ? 'cyan' : 'orange',
      seed: plan.seed, generated: true, difficulty: plan.difficulty, parTime: plan.parTime, fuel: plan.fuel,
      killY: -60, lookAhead: 14, fireDelay: 0.35, terminalRange: 30,
      launcher: { type: 'shoulder', pos: L.pos.slice(), yaw: L.yaw, pitch: L.pitch },
      env, foliage: plan.env.id === 'snow' ? '#5a7266' : plan.biome.id === 'desert' ? '#4a5a30' : undefined,
      menuView: { center: [cx, 30, cz], radius: Math.max(160, (bd.z1 - bd.z0) * 0.45), height: 70 },
      routes: plan.routes, route: plan.routes[0], routeActionsPer: plan.routeActions,
      aaThreat: P.enemyReaction, aaSalvo: !!P.salvo,              // menace des tirs : profil de la carte (bornes jouables de CC.CONFIG.aa)
      aaMaxAlive: P.maxMissiles,                                   // missiles ennemis en vol en même temps (FACILE 2 → IMPOSSIBLE 7)
      plan,
      mission: {
        seed: plan.seed, difficulty: plan.difficulty, label: D.label, biome: plan.biome.label, env: plan.env.label,
        targets: plan.targets.map((t) => G.TargetKinds.get(t.kind).label), score: plan.score.difficultyScore,
      },
      build(b) { G.Kit.build(b, plan, level); },
    };
    return level;
  };

  /* Compatibilité (banc de test, anciens appels) : difficulté + graine → fiche de niveau. */
  CC.GeneratedLevel = function (diffId, seed, opts) {
    return G.toLevel(G.generate(seed, diffId, opts));
  };
})();

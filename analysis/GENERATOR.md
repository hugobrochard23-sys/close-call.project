# Générateur de missions (v032)

COLD IMPACT ne se limite plus à quelques niveaux : la ligne **MISSIONS** du menu ouvre le **GÉNÉRATEUR DE MISSIONS**,
qui construit à la volée une carte complète à partir d'une **graine** et d'une **difficulté** (FACILE, MOYEN, DIFFICILE,
IMPOSSIBLE). Même graine + même difficulté = même carte, sur toutes les machines (partage, défis, carte du jour).
Rien n'est stocké : la graine suffit à tout reconstruire (`seed → génération → carte`).

## Architecture

```text
graine ──► flux aléatoires déterministes (un par couche : G.stream(graine, 'layout'), 'targets', 'decor'…)
        ──► profil de difficulté (11 paramètres, variés par carte)            profiles.js
        ──► famille de carte (biome) + ambiance                               biomes.js
        ──► COUCHE 1  disposition : routes, parcelles, relief                 layout.js
        ──► COUCHE 5  lanceur, cibles + mises en situation (réservations)     mission.js
        ──► COUCHE 2  structures : gabarits de zones (grammaire)              templates.js
        ──► COUCHE 3  obstacles de parcours, décor                            features.js
        ──► navigation 3D : couloirs d'approche réels (A*)                    nav.js
        ──► COUCHE 4  défenses sur les couloirs, hélicoptères en patrouille   mission.js
        ──► routes finales (prudentes), arrondi des virages, essence          generator.js
        ──► validation + réparation ──► score de carte ──► plage de difficulté ?  validate.js
              non → nouvel essai déterministe (graine, essai 1, 2…)
        ──► plan (donnée pure, sans THREE) ──► construction (LevelBuilder)    kit.js
```

Tout le plan est de la **donnée pure** (aucun objet 3D) : le générateur tourne aussi sous Node, sans navigateur, ce qui
permet de tester des centaines de cartes en quelques secondes (`tools/gentest.js`).

| Fichier | Rôle |
|---|---|
| `src/world/gen/core.js` | graines (`randomSeed`, `parseSeed` — un mot est aussi une graine —, `daily`), flux aléatoires, **registres** extensibles, géométrie (emprises orientées, index spatial, boîtes 3D) |
| `profiles.js` | les 4 difficultés et le **profil** de chaque carte |
| `biomes.js` | 9 ambiances (jour, couvert, brume de chaleur, aube, crépuscule, nuit, clair de lune, brouillard, neige) et 8 familles de cartes |
| `layout.js` | disposition en grille (ville, industrie, base, port, mixte), organique (campagne, désert) ou en vallée (montagne) ; relief |
| `templates.js` | types d'objets (emprise + boîtes de collision) et **gabarits de zones** |
| `mission.js` | lanceur, types de cible, mises en situation, défenses, hélicoptères |
| `features.js` | obstacles de parcours et décor |
| `nav.js` | grille d'occupation 3D (5 × 4 × 5 m), A* pondéré, danger précalculé, lissage |
| `validate.js` | validation, réparation, score de carte, signature de diversité |
| `generator.js` | la chaîne, les essais, les routes, l'arrondi des virages, l'alignement sur les portes |
| `kit.js` | construction 3D du plan avec les outils existants du jeu |
| `debugdraw.js` | vue de débogage (touche **G** en mission, ou `?gendebug=1`) |
| `src/entities/models_gen.js` | nouveaux modèles de cible : radar, dépôt de carburant, poste de commandement, lance-missiles |

### Ajouter un élément (extensibilité)

Tout passe par des registres : aucun `switch` à modifier.

```js
CC.Gen.Biomes.add('arctic', { layout: 'organic', terrain: 'hills', ground: 'white', clusters: { outpost: 2 }, … });
CC.Gen.Templates.add('radarField', { fits: (pc) => …, fill(plan, pc, r) { G.put(plan, { t: 'mast', … }); } });
CC.Gen.Items.add('pylon', { layer: 'obstacle', foot: (it) => …, solids: (it) => […] });   // + CC.Gen.Kit.builders.pylon = (b, it) => …
CC.Gen.TargetKinds.add('train', { type: 'truck', size: […], setups: { open: 1 } });
CC.Gen.Setups.add('bunker', { protection: 0.9, radius: 24, place(plan, site, K, dir, r) { … return { pos, gate, entry } } });
CC.Gen.Difficulties.add('cauchemar', { order: 4, base: { … }, … });
```

## Les quatre difficultés : un profil, pas une seule variable

`difficultyProfile` : `obstacleDensity, buildingDensity, tankDensity, helicopterDensity, defenseDensity,
targetProtection, availableSpace, routeComplexity, distance, enemyReaction, environmentalComplexity` — chaque valeur
varie de ±8 % d'une carte à l'autre, puis la famille de carte l'ajuste (un désert est plus ouvert, une ville plus dense).

| | FACILE | MOYEN | DIFFICILE | IMPOSSIBLE |
|---|---|---|---|---|
| Cibles | 2 | 3 | 3–4 | 4 |
| Tanks / lance-missiles / hélicoptères | 1–2 / 0 / 0–1 | 2–4 / 0 / 1 | 4–6 / 1 / 1–2 | 7–9 / 2–3 / 2–3 |
| Missiles ennemis en vol au plus | 2 | 3 | 4 (salves) | 7 (salves) |
| Mises en situation des cibles | à découvert | murs, filets | hangars, cours, ruelles | portes étroites, contourner |
| Largeur des rues / vallées | larges | moyennes | étroites | très étroites |
| Marge de passage du missile | 3,6 m | 2,8 m | 2,2 m | 1,7 m |
| Virage demandé au plus (60 m/s) | 1,8 rad/s | 2,6 | 3,6 | 5 |
| Les cibles tirent | non (elles visent) | non (elles visent) | oui | oui |
| Entrée finale couverte par les défenses | jamais | jamais | priorité | priorité |
| Réserve d'essence | ×1,9 | ×1,6 | ×1,35 | ×1,18 |
| Longueur des approches | ≈ 450 m | ≈ 600 m | ≈ 750 m | ≈ 850 m |
| Ambiances | plutôt jour | variées | plus sombres | nuit, brouillard |

La **menace** des tirs (précision, cadence, vitesse, virage des missiles ennemis) suit `enemyReaction`, **toujours dans
les bornes jouables** de `CC.CONFIG.aa` : un missile ennemi reste plus lent et moins maniable que la roquette.

## Règles (pas de hasard pur)

- **Cibles d'abord** : elles réservent leur zone et leur **allée d'approche** (longue de deux rayons de virage) ; aucune
  structure ni aucun décor ne s'y pose. Mises en situation : à découvert, murs de protection (ouverts d'un côté), hangar
  (portail), filet de camouflage, cour intérieure (un passage), ruelle en cul-de-sac, toit (hélicoptère), en vol
  (hélicoptère en patrouille). Plus la protection est forte, plus l'ouverture regarde loin du lanceur (il faut contourner).
- **Structures alignées** sur leur rue ou leur route, jamais superposées (index spatial), posées sur le sol réel.
- **Routes connexes** (vérifié), obstacles toujours franchissables (dessous, dessus ou à côté), jamais dans les 80
  premiers mètres, câbles balisés de boules rouges et blanches.
- **Défenses intelligentes** : les tanks et lance-missiles sont choisis parmi des emplacements dégagés en fonction de
  la part des **couloirs d'approche réels** qu'ils voient (lignes de vue calculées), de la protection des cibles et, en
  IMPOSSIBLE, de la diversité des angles (tirs croisés). En FACILE ils sont espacés et couvrent peu.
- **Hélicoptères** : zone de patrouille (sur place, orbite, circuit, points de passage), vitesse, sens, altitude
  au-dessus de tout ce que survole la boucle (+ 12 m) ; le vol réaliste existant est conservé (assiette, inertie).
- **Canons** : les tanks et lance-missiles gardent leur tourelle qui suit la roquette (même IA que les niveaux fixes).
- **Entrée finale sereine en FACILE et MOYEN** : aucune défense n'est placée pour couvrir l'allée d'approche d'une cible,
  les hélicoptères patrouillent à plus de 140 m des cibles, et les cibles elles-mêmes visent sans tirer. Mesuré : sans
  cette règle, un char-cible dans ses murs tirait de face à 55 m pendant la plongée, rendant certaines missions MOYEN
  quasi infaisables (le pilote automatique échouait 0/3). En DIFFICILE et IMPOSSIBLE, l'entrée finale est au contraire
  la priorité des défenses.

## Trajectoires

Une grille 3D d'occupation (5 × 4 × 5 m) marque les cellules où le missile, avec la marge du profil, toucherait
quelque chose. A* pondéré (longueur, altitude excessive, danger) → **couloir** de chaque cible, puis :
- tension (lignes droites), coins coupés et relâchement élastique là où il y a de la place ;
- **alignement** : si le couloir arrive de travers sur l'allée d'approche, une manœuvre en goutte d'eau (tangente +
  arc au rayon permis) l'aligne, au-dessus des toits ;
- **arrondi des virages** au rayon de la difficulté (arcs vérifiés dégagés) ;
- un **second couloir**, éloigné du premier, mesure si le joueur a un vrai choix ;
- les routes finales évitent le danger (tireurs qui voient chaque zone) : ce sont aussi celles du pilote automatique.

## Validation

Chaque carte est vérifiée **avant** d'être montrée : structures superposées (retirées), objets hors carte, véhicules
coincés dans une structure ou sur une pente, départ bloqué, tireur trop près du lanceur, **chaque segment de route
vérifié exactement** contre les boîtes de collision (rayon 0,55 m ; les vitres et caisses se traversent), cible
masquée depuis son entrée, virages infaisables (> 8,5 rad/s ramenés à 60 m/s : rayon < 7 m même en freinant),
virages plus serrés que le profil (hors difficulté → nouvel essai), essence insuffisante, réseau routier
coupé, décor collé à la cible. Défaut mineur → réparé ; défaut grave, ou score hors de la plage de la difficulté →
nouvel essai **déterministe** (la même graine redonne toujours la même carte finale). À partir du 6e essai, la carte est
« desserrée » (moins dense, plus d'espace, trajet plus simple) : c'est la correction automatique ; famille et ambiance
restent celles de la graine.

## Score de carte

`mapScore = { difficultyScore, visualComplexity, combatComplexity, traversalComplexity, obstacleComplexity, openness,
enemyPressure, fuelTightness, exposure, corridors, … }` — non montré au joueur, il vérifie qu'une carte FACILE ressemble
à une carte FACILE. Plages : FACILE 0–28, MOYEN 24–50, DIFFICILE 44–70, IMPOSSIBLE 66–100.

## Outils de test

```bash
node tools/gentest.js 100 all --determinism    # 100 cartes par difficulté : validité, temps, scores, diversité
node tools/gentest.js 20 hard --biome=port     # une famille précise
```

- `tools/genviewer.html?diff=hard&n=24` : des dizaines de plans en vue de dessus (cartes absurdes, répétitives…).
- `tools/genplay.js` (dans `?test=1&autopilot=1&gen=easy`) : le pilote automatique **joue** des missions complètes.
- En jeu : touche **G** → vue de débogage (graine, zones, départ, cibles, portes, portées de tir, danger, lignes de vue
  en direct, patrouilles, score, nombres d'objets, temps de génération et de construction).
- Banc de test : `?test=1&autopilot=1&gen=impossible&seed=1234&biome=port`.

## Résultats

Voir la section v032 de [VERSIONS.md](VERSIONS.md) et `analysis/generator/report.json` (produit par `tools/gentest.js`).

# CLOSE CALL

Prototype jouable en HTML/WebGL, inspiré de la bande-annonce du jeu *Dumbfire*.
On pilote un missile qui ne s'arrête jamais : il suit le réticule, frôle les murs pour gagner du style et doit toucher la cible.

Tous les assets (textures pixel-art, modèles, police, sons, musique) sont **originaux** et générés par le code.
Aucun fichier du jeu d'origine n'est utilisé, et le matériel de référence (vidéo, images extraites) n'est pas publié ici.

---

## Télécharger et jouer

1. Sur la page GitHub du dépôt : bouton vert **Code → Download ZIP**, puis décompresser.
   Ou en ligne de commande : `git clone` de l'adresse du dépôt.
2. Double-cliquer sur `index.html`. Fonctionne hors ligne, sans installation : three.js est copié dans `assets/lib`.

Si le navigateur bloque les fichiers locaux, lancer le petit serveur fourni puis ouvrir `http://localhost:8123` :

```bash
node tools/serve.js
```

Compatible Chrome, Edge, Firefox et Safari récents (WebGL requis).

## Contrôles

| Touche | Action |
|---|---|
| W,A,S,D | piloter à 360° autour des axes de l'écran : W / S basculent la roquette vers le haut / le bas de l'écran (maintenir = looping complet), A / D la font tourner comme sur un plateau (elle peut pointer vers la caméra) ; Z,Q,S,D sur AZERTY et les flèches marchent aussi |
| Espace (maintenue) | moteur : pousse tant qu'Espace est enfoncée, s'éteint dès qu'on la relâche ; consomme l'essence |
| Souris | viser aussi à la souris (facultatif) : la roquette suit le réticule |
| Clic gauche | tirer / réapparaître au lanceur |
| Clic droit (maintenu) | grappin : s'accroche au mur ou au disque visé, relâcher pour lâcher |
| Maj (maintenue) | rétro-fusées : freinage fort, le moteur principal s'éteint |
| R | recommencer |
| Échap | pause / menu |
| Tab | réglages (sensibilité, inversion Y, volumes, post-traitement, FPS) |
| F1 | liste des touches |
| H | masquer le HUD |

Dans les menus et la boutique, tout se fait à la souris (survol pour sélectionner, clic pour valider) ; **Échap** revient en arrière.

**Moteur et essence (v009, v010).** Au tir, la roquette a **0,5 s de poussée gratuite** (jauge bleue « FREE BOOST ») ;
ensuite elle ne pousse que si **Espace** est maintenue, et chaque seconde de poussée brûle 1 s d'essence (jauge orange en bas à gauche,
rouge sous 25 %). Réservoir vide : moteur coupé, la roquette plane puis tombe. Le réservoir est plein à chaque tir et sa taille
baisse avec la difficulté (la jauge est plus courte) :

| Niveau | CITY | BRICKWORKS | CANYON | CAVE | WOODS | CONSTRUCTION | NIGHT FOREST | AUTOMAP facile / moyen / difficile |
|---|---|---|---|---|---|---|---|---|
| Essence (s) | 29 | 26 | 23 | 22 | 21 | 20 | 16 | 18 / 19 / 23 |
| Réserve restante au pilote automatique (s) | 14,2 | 19,1 | 10,9 | 6,9 | 7,6 | 6,4 | 4,2 | 8,1 / 5,5 / 4,7 |

Sur AUTOMAP les cartes difficiles sont plus longues : le réservoir est plus grand, mais la marge est plus faible.
Réglages : `rocket.freeBoost`, `rocket.fuelDefault` dans `src/config.js`, `fuel` dans chaque fiche de niveau.

**Vol à inertie (v013).** La roquette pivote sur son centre : W,A,S,D ne déplacent que sa tête, sans courber la trajectoire.
Elle continue sur sa lancée ; seul le réacteur (Espace, dans l'axe du nez), la gravité (5,72 m/s², moyenne Terre / Lune)
et l'air la font changer de trajectoire. Pour tourner : pivoter, puis pousser ; pour freiner : retourner le nez et pousser
(ou rétro-fusées). La roquette ne tourne plus sur son axe long.
À l'écran : le **x** montre où pointe la tête, le **cercle vert** (v014) montre où va réellement la roquette ; en poussant,
le cercle glisse vers le x. Le cercle est masqué quand la roquette file vers la caméra.

**Caméra de vol (v012).** Au tir, la caméra garde l'orientation du lanceur et **ne tourne plus jamais** pendant le vol :
elle suit la roquette en translation, à distance constante, et la regarde donc toujours. La roquette peut pointer vers
la caméra ; si elle fonce vers elle, la caméra recule d'autant. Si un mur passe entre les deux, la caméra se rapproche
sans tourner. Le réticule indique la direction visée.

Un contact rasant avec le sol ou un toit fait **glisser** la roquette. Un choc de face la fait **exploser**.
Les vitres, les murs de briques fins et les caisses se brisent.

## Niveaux

Chaque niveau reconstruit une séquence de la vidéo, avec l'interface (HUD) qu'il a dans la vidéo.

| # | Niveau | Séquence | HUD | Mode | Cible |
|---|---|---|---|---|---|
| 1 | CITY | 0,0–15,4 s | A (STYLE, THRUST:45, COOLDOWN) | style | hélicoptère noir |
| 2 | BRICKWORKS | 15,4–23,6 s | B (TARGETS n/4, SCORE) | 4 cibles | 4 chars |
| 3 | CANYON | 23,6–36,0 s | C (STYLE, TIME:∞, SPEED) | style | char dans la fosse |
| 4 | CAVE | 36,0–48,2 s | C | style | camion sur plateforme |
| 5 | WOODS | 48,2–64,5 s | B (SCORE) | score | char dans la maison |
| 6 | CONSTRUCTION | 64,5–79,3 s | C (sans SPEED) | style | hélicoptère camouflé |
| 7 | NIGHT FOREST | 79,3–89,1 s | B (SCORE) | score | maison |
| 8 | AUTOMAP | hors vidéo | C | cibles | généré : 2 à 4 cibles selon la difficulté |

### Carte aléatoire (8e carte : AUTOMAP)

La dernière carte du menu n'est pas un niveau fixe. Un clic ouvre le choix de difficulté, puis la carte est **construite à la volée**
(≈ 45 ms : tracé de rue sinueux, pâtés d'immeubles, portiques, passerelles, vitres à briser, caisses, lasers, lampadaires,
points d'accroche, cibles, routes du pilote automatique).

| Difficulté | Cibles | Longueur | Largeur de rue | Immeubles | Obstacles | Ennemis | Ambiance |
|---|---|---|---|---|---|---|---|
| FACILE | 2 | 520 m | 60 m | 16–40 m | rares | aucun | plein jour |
| MOYEN | 3 | 720 m | 48 m | 24–62 m | modérés | 1 soldat | coucher de soleil |
| DIFFICILE | 4 | 940 m | 38 m | 32–92 m | denses, lasers rouges | 3 soldats | nuit étoilée |

Chaque appel tire une graine différente (affichée brièvement au début de la partie). **R** recommence la même carte ;
repasser par AUTOMAP en construit une autre. Les meilleurs temps sont enregistrés par difficulté.
Les cartes générées produisent aussi leurs routes de pilote automatique : elles sont donc jouables par `tools/record.js`
et `tools/compare.js` comme les niveaux fixes (`?test=1&gen=hard&seed=1234`).

### Boutique de cosmétiques (ROCKET SHOP)

Le menu principal ouvre une boutique : 20 apparences de roquette, à acheter avec le solde gagné en jouant.

| Catégorie | Prix | Fiches |
|---|---|---|
| STOCK | offert | la roquette d'origine |
| COMMUN (7) | 2,99 € | LE GAMIN, MONSIEUR BEDON, FUSEE V, MINUTEMEC, HACHETTE VOLANTE, CROQUETTE, BAGUETTE |
| RARE (8) | 4,99 € | TRIDENTIN, POISSON VOLANT, GARDIEN DE PAIX, TITANITE, SATANETTE, GROSSE BERTHE, CROISSANT, CHATON |
| ULTRA RARE (5) | 6,99 € | TSARINI, MAMAN DES BOMBES, BOMBE H, COLIS EXPRESS, CAILLOU |

Solde : 5 € offerts au premier lancement, puis 60 centimes par niveau terminé + 0,05 par point de STYLE + 1 € par nouveau record
(environ 2 à 3 € par niveau réussi). **Les prix sont fictifs : rien n'est encaissé, le solde vit dans la sauvegarde locale.**

Les noms s'inspirent librement de gros engins historiques sans en reprendre un seul ; cinq fiches sont des fantaisies
(baguette, croissant, chaton, colis, caillou). Un cosmétique change les couleurs, les proportions du corps et du nez,
le nombre d'ailerons, des pièces rapportées et la couleur de flamme.

> La police du HUD ne contient que l'ASCII (tout autre caractère s'affiche « ? ») : les fiches sont donc écrites sans
> accent, avec un tiret simple au lieu d'un tiret long, et les prix s'affichent en « EUR » au lieu de « € ».

## Architecture

```text
close-call/
├── index.html            point d'entrée (scripts classiques : marche en file://)
├── style.css             zone 16:9 centrée, HUD superposé
├── game.js               démarrage (et affichage des erreurs)
├── src/
│   ├── config.js         TOUS les paramètres réglables (GAME_CONFIG), annotés MESURÉ / ESTIMATION / CHOIX
│   ├── core/             util.js (maths, aléatoire à graine, formats 0:08,27 et 1.315), game.js (boucle, machine à états, banc de test)
│   ├── physics/          collision.js (boîtes orientées, terrain, tunnel ; balayage de sphère, distances, rayons)
│   ├── entities/         rocket.js (modèle de vol + capacités), targets.js (cibles, IA, destructibles, lasers),
│   │                     models.js, skins.js (fiches des 20 cosmétiques + STOCK)
│   ├── systems/          camera.js (1re personne → poursuite), style.js (combos et messages de style)
│   ├── rendering/        textures.js (pixel-art procédural), particles.js (voxels instanciés), postfx.js (vignette, aberration, tramage, bloom)
│   ├── world/            builder.js (géométrie fusionnée, murs percés, terrains, tunnel),
│   │                     levels/ (7 niveaux + generated.js : carte aléatoire)
│   ├── input/            input.js (souris/clavier + pilote automatique de test)
│   ├── ui/               font.js (police pixel originale), hud.js (3 variantes), menu.js, shop.js (boutique)
│   └── audio/            audio.js (sons et musique synthétisés, Web Audio)
├── assets/lib/           three.min.js (r149)
├── tests/                PROTOCOLE.md, reference_measurements.json
├── tools/                serve.js, record.js (enregistrement automatique), compare.js (comparaison à la référence),
│                         calibrate_color.js (calibration hors ligne de la balance des ombres)
├── recordings/           (non versionné) vidéos et télémétrie produites par tools/record.js
└── analysis/             ANALYSE_REFERENCE.md, VERSIONS.md, iterations/vXXX/ (rapports, planches de comparaison)
```

Machine à états : `BOOT → MENU → AIM (1re personne) → FLIGHT → IMPACT | CRASHED → RESPAWN → … → RESULTS`,
plus PAUSE et les surcouches SETTINGS / BINDS.

## Systèmes principaux et paramètres

Tout se règle dans `src/config.js`. Paramètres clés :

| Paramètre | Valeur | Origine |
|---|---|---|
| `rocket.ejectSpeed` | 31 m/s | MESURÉ (compteur SPEED après le tir) |
| `rocket.ignitionDelay` | 0,28 s | MESURÉ (le compteur SPEED passe 31→35 entre 0,23 et 0,33 s) |
| `rocket.thrust` | 50 m/s² (55 en v006) | MESURÉ (courbe SPEED du canyon : 31→55 m/s en 0,6 s) puis CHOIX v007 : la vitesse passait pour trop élevée ; le HUD affiche toujours « THRUST:45 » comme la vidéo |
| `rocket.dragK` | 0,0100 (0,0086 en v006) | MESURÉ (plafond ≈ 80 m/s en palier, 87 en piqué) puis CHOIX v007 : plafond ≈ 71 m/s |
| Vol à inertie (v013) | la tête pivote sur le centre, la trajectoire ne suit pas le nez ; `physics.gravity` = 5,715 m/s² (moyenne Terre / Lune) | CHOIX d'Hugo (v013) ; `grip`, `gripEngineOff`, `inducedDrag` supprimés ; `maxTurnRate` / `steerGain` ne servent plus qu'au grappin |
| `economy.*` | solde de départ 5 €, 60 + 0,05/pt + 1 € record | CHOIX v007 (boutique) |
| `abilities.retro.decel` | 25 m/s² (+ traînée) ; le moteur principal s'éteint pendant le freinage | MESURÉ (75→27 m/s en 1,75 s), OBSERVÉ |
| `camera.distance` / `height` | 1,85 m / 0,52 m | MESURÉ indirectement (nez à 55 %, tuyère à 67,8 % de la hauteur) |
| `camera.crosshairY` | 0,402 | MESURÉ |
| `camera.fovV` | 70° | ESTIMATION |
| `hud.*` | positions et tailles | MESURÉES (boîtes englobantes du texte) |
| `style.closeCallBase` / `bombSmashPerMs` | 100 / 7,5 | MESURÉ (x2,9 → +290 ; 67 m/s → +504) |

## Protocole de test et comparaison

Voir [tests/PROTOCOLE.md](tests/PROTOCOLE.md). En résumé :

```bash
npm install            # une fois : puppeteer-core, ffmpeg, pngjs (outils de test uniquement)
npm run record -- v002 # joue les 7 niveaux en pilote automatique, enregistre recordings/v002*.mp4
npm run compare -- v002
```

`compare` aligne chaque niveau sur l'instant du tir et produit, dans `analysis/iterations/v002/` :

- les planches original │ clone │ différence ;
- les écarts de l'interface (en pixels) ;
- le cadrage de la roquette ;
- la similarité des couleurs ;
- la courbe de vitesse ;
- les timings (allumage, éjection, impact).

## Différences connues

Voir le dernier rapport dans `analysis/iterations/` et [analysis/VERSIONS.md](analysis/VERSIONS.md). Limites de fond :

- **Géométrie des niveaux :** la vidéo ne montre que des fragments. Le reste est une ESTIMATION, donc les décors ne coïncident pas pixel à pixel.
- **Trajectoires du joueur :** inconnues. Le pilote automatique suit des routes estimées d'après la vidéo.
- **Audio :** la vidéo est muette, le son est entièrement une création.
- **Non montré dans la vidéo :** crash, menus, écran de résultats, collisions avec câbles, lasers et missiles. Choix de conception documentés.

## Prochaines améliorations

Voir la section « NEXT CORRECTIONS » du dernier rapport d'itération.

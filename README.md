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

## Travailler à plusieurs

Le dépôt GitHub `hugobrochard23-sys/close-call.project` (public) est la version de référence : **la version GitHub
prime toujours sur celle d'un ordinateur**. Tout le monde peut le lire et le télécharger ; pour y envoyer des
modifications (`git push`), il faut être invité comme collaborateur par Hugo (Settings → Collaborators).

```bash
git clone https://github.com/hugobrochard23-sys/close-call.project.git
cd close-call.project
node tools/serve.js 8123
```

Puis ouvrir `http://localhost:8123`. À chaque séance :

1. **Avant de modifier** : `git pull` (récupère le travail des autres).
2. Faire une modification à la fois, la tester dans le navigateur.
3. **Juste après** : `git add -A`, `git commit -m "ce qui a changé"`, `git pull` puis `git push`.
4. En cas de conflit, garder la version GitHub et refaire son changement par-dessus ; jamais de `git push --force`.

Tous les réglages sont dans `src/config.js` (chaque valeur est commentée) ; l'historique des changements est dans
`analysis/VERSIONS.md` (à compléter à chaque version). Sur ordinateur, `#touch` à la fin de l'adresse affiche les
commandes tactiles. Banc de test sans affichage : `?test=1&autopilot=1&level=N` (le pilote automatique doit finir
chaque niveau après une modification du vol, de l'essence ou des ennemis).

## Contrôles

| Touche | Action |
|---|---|
| W,A,S,D | piloter à 360° : W cabre, S pique, A gauche, D droite, par rapport à la roquette (loopings et vol sur le dos possibles ; Z,Q,S,D sur AZERTY et les flèches marchent aussi) |
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

**Sur téléphone ou tablette (v022)** : plein écran, aucun bouton sauf la pause. **Glisser le doigt** n'importe où dirige
la roquette ; **toucher** tire (ou fait réapparaître après un crash) ; **double toucher** en vol allume le moteur, qui reste
allumé jusqu'au double toucher suivant. **Bouton pause** (en haut à droite) : reprendre, son, musique, recommencer, menu.
Affichage réduit à la jauge d'essence, au réticule, aux repères de cibles et à l'alerte missile ; rendu à 1 pixel par point
et ombres 1024 pour la fluidité (`input.touch` dans `src/config.js`). Sur ordinateur, `#touch` dans l'adresse force ce mode.

Dans les menus et la boutique, tout se fait à la souris (survol pour sélectionner, clic pour valider) ; **Échap** revient en arrière.

**Moteur et essence (v009, v010).** Au tir, la roquette a **0,5 s de poussée gratuite** (jauge bleue « FREE BOOST ») ;
ensuite elle ne pousse que si **Espace** est maintenue, et chaque seconde de poussée brûle 1 s d'essence (jauge orange en bas à gauche,
rouge sous 25 %). Réservoir vide : moteur coupé, la roquette plane puis tombe. Le réservoir est plein à chaque tir et sa taille
baisse avec la difficulté (la jauge est plus courte) :

| Niveau | CITY | BRICKWORKS | CANYON | CAVE | WOODS | CONSTRUCTION | NIGHT FOREST | AUTOMAP facile / moyen / difficile |
|---|---|---|---|---|---|---|---|---|
| Essence (s) | 23 | 20 | 18 | 16 | 14 | 12 | 11 | 15 / 16 / 18 |
| Réserve restante au pilote automatique (s) | 13,8 | 15,8 | 8,6 | 6,5 | 5,8 | 6,1 | 3,2 | 7,5 / 5,5 / 3,9 |

Sur AUTOMAP les cartes difficiles sont plus longues : le réservoir est plus grand, mais la marge est plus faible.
Réglages : `rocket.freeBoost`, `rocket.fuelDefault` dans `src/config.js`, `fuel` dans chaque fiche de niveau.

**Caméra de vol (v010).** La caméra suit la roquette mais pas la visée : elle se réaligne peu à peu derrière la trajectoire
(`camera.followLag`, plus petit = caméra plus libre). En pilotant, on voit donc la roquette tourner à l'écran ; le réticule
indique la direction visée.

**Missiles anti-aériens (v020, v021).** Les tanks et les hélicoptères tirent sur la roquette quand ils la voient (jamais à travers
un bâtiment), entre 45 m et 90 à 140 m, et seulement s'ils sont devant elle (jamais de tir dans le dos). NIGHT FOREST a 2 tanks
de garde (ils tirent et se détruisent, mais ne comptent pas dans l'objectif : la cible reste la maison). La menace monte de CITY (0) à NIGHT FOREST (1) ; AUTOMAP : 0,3 / 0,6 / 0,95.
Avec elle : tirs plus rapprochés (5 s → 1,6 s), visée plus juste (erreur 6 m → 0,3 m), anticipation de la trajectoire,
missiles plus rapides (50 → 68 m/s). Ils restent moins maniables que la roquette (virage 0,5 → 1,1 rad/s contre 1,5 à 1,8)
et plus lents qu'elle à pleine poussée : on les sème en virant franchement, et ils explosent sur les murs.
« MISSILE! » clignote en rouge quand l'un d'eux approche (moins de 90 m). Réglages : `aa` dans `src/config.js`.

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
| `rocket.maxTurnRate` / `steerGain` / `grip` | 3,5 rad/s / 9 / 11 (3 / 7,5 / 9 en v006) | ESTIMATION, relevées en v007 : roquette plus maniable (traînée induite 0,085 → 0,070, glissade tolérée jusqu'à 27°) |
| `economy.*` | solde de départ 5 €, 60 + 0,05/pt + 1 € record | CHOIX v007 (boutique) |
| `physics.gravity` | 5,715 m/s² | CHOIX d'Hugo (v016) : moyenne Terre (9,81) / Lune (1,62), roquette seulement ; les G affichés restent en G terrestres |
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

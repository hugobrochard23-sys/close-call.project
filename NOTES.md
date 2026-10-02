# COLD IMPACT — notes de projet (état v079)

Jeu mobile de fusée (JS vanilla, Three.js r149, canvas 2D pour l'UI/HUD). Dépôt `hugobrochard23-sys/cold-impact.project`, branche `main`, déploiement GitHub Pages
(https://hugobrochard23-sys.github.io/cold-impact.project/). Le propriétaire teste sur téléphone ; **toujours donner ce lien à la fin d'un message** (cache à vider / navigation privée).
Tag `subway-v061` = ancien design « premium arcade » (abandonné).

## Vision (décidée par le propriétaire — ne pas la remettre en cause)
- Jeu **ultra simple** : chaque **cible touchée = 1 point + du carburant**. Cibles spéciales = plus de points (lance-missiles 2, radar 3). Le but : toucher le plus de cibles, avancer.
- **Niveaux définitifs** (pas de mode sans fin) : parcours de longueur fixe, de plus en plus longs et durs, finissant par une **arène + mini-boss** ; le vaincre = coffre d'écrous + niveau suivant.
- Difficulté = de plus en plus de cibles / d'ennemis / de missiles (nombre, pas précision), ouvertures qui rétrécissent. Pas de vitesse croissante.
- Style **pixel** (police Press Start 2P, menus pixel). Jamais de contour autour des textes. Jauge de carburant sans cadre.
- **Rien de superflu à l'écran** : pas de combo, style, multiplicateur, journal, voitures, véhicules, drones, poissons, avions, anneaux, flèches pixel. HUD = score + jauge (+ fine ligne de progression du niveau + vie du boss).
- Un seul index rouge de cible, petit, en gros pixels, près de la cible la plus proche (<150 m), jamais derrière.
- Indications : seulement les **flèches vertes translucides** de l'ancien niveau City (`CC.Models.guideArrow`, une tous les 45 m le long de la trajectoire).
- Pas de passage à travers les murs (même avec bouclier : rebond). Les cibles ne doivent jamais être dans un mur.
- Économie envisagée : parties courtes, pubs à récompense (continuer, ×2 écrous, coffre), plein écran rare (toutes les 2-3 morts), achat « sans pub ».

## Architecture (src/)
- `core/game.js` : boucle, états (MENU/AIM/FLIGHT/CRASHED/RESULTS), `startEndless(seed, {levelDef,home})`, `curLevelDef()`, `setLevel(n)`, `onTargetHit` (points/carburant/FX), `hitBoss` / `onBossDead`, `finishEndless` (résultats + coffre + sauvegarde `save.lvl`).
- `world/levelmode.js` : `CC.LM.def(n)` (zone, graine, longueur, difK, PV du boss, type de boss, ordre des zones, coffre). 30 niveaux, une zone par niveau (ville, forêt, port, usine, tour, base aérienne, métro, miniature, profondeur, chute, puis cycle).
- `world/endless.js` : `Track` (couloir qui **tourne** : cap θ(d), position P(d), `at(d,lx,y)`, `yawAcross`, `project`), `buildChunk` (cibles, ennemis de garde, flèches), `Run` (progression, score = points).
- `world/zones*.js` : framework de zones/scènes (`Z.plan`, `Z.build`, `Scene` avec `bx/cyl/item/gate…`), scènes par zone (`zones_a.js` = ville + métro), `zones_turns.js` (virages), `zones_chaos.js` (obstacles), `tight.js` (portes serrées + volets), `levelmode` arène (`arenaBuild` dans `zones.js`).
- `world/life.js` : `L.fleet` désactivé, `L.sweeper` seulement pour les volets.
- `ui/hud.js` + `ui/hud_simple.js` (HUD du mode niveaux), `ui/home.js` (accueil/menus pixel), `ui/levelmap.js` (carte des niveaux, résultat de niveau avec coffre), `ui/menu.js`.
- `systems/camera.js` : la caméra **pré-tourne** vers le virage ; `systems/progress.js` : XP, écrous, améliorations (COQUE remplacée par POINTS ×1,1…×1,5).
- `entities/targets.js` : cibles (échelle ×2,4, contour blanc proche, balancement, bruit de passage, `hp/boss/flyTo`), `rocket.js`.

## Mécaniques clés
- Carburant : ne se regagne qu'en touchant des cibles. Mort « panne sèche » seulement si plus d'essence ; fusée immobile avec essence = boost de secours.
- Boss : plusieurs PV (1 pour les niveaux 1-3), il **s'éloigne vers le fond de l'arène** à chaque coup (~420 m / PV) et tire.
- Un niveau échoué : % de progression ; après plusieurs échecs, +3 s de carburant par échec (max +15).
- Corrigé : écrans noirs = réglages de post-traitement indéfinis après un fondu d'ambiance (`applyEnvironment` complète avec `CONFIG.postfx`).

## Banc de test (hors dépôt, dossier `cctest` à côté du dépôt)
Puppeteer + Chrome headless. Serveur statique `node srv.js <dossier du jeu>` (port 8123). Paramètres d'URL utiles :
`?test=1&autopilot=1&fps=30&endless=1` + `&level=N` (niveau N) · `&notgt=1` (sans cibles) · `&skip=city1,escalier` (exclure des scènes) · `&order=city,forest` (ordre des zones).
Le pilote automatique ne sait pas viser, attendre un volet ni plonger verticalement : il s'écrase dans ces cas (limite du pilote, pas du jeu).

## v078
- 60 niveaux (carte en 2 pages). Chaque niveau a un THEME (`CC.LM.THEMES` : mixte, chasse aux hélicos, blindés, batteries de missiles, convoi, escadron, forteresse) qui règle le tirage des cibles et le poids des ennemis de garde.
- MINI-BOSS (`T.mids`, option `mini` des cibles) dès le niveau 4 : 1 à 3 par niveau, plusieurs PV, ils fuient à chaque coup, 3 points.
- `Z.noTargets` vidé : il y a des cibles dans toutes les zones (avant, tour/eau/chute n'en avaient pas : niveaux infinissables).
- Écran de fin : coffre pixel animé (`ui/levelmap.js`) ; icônes pièce/réglages pixel ; bouton NIVEAUX retiré de l'accueil (carte via l'onglet MAP).

## v079 — RELIEF
- `T.rel(d)` (endless.js) : le SOL monte et descend ; chaque scène « relief » (src/world/zones_relief.js) fournit `relief(T, sc, r)` → `{fn(d)}` nul aux deux bouts ; `base()` l'ajoute, tout (sol, trajectoire, cibles) suit.
- 9 scènes génériques habillées par zone (parois, accessoires `PROPS`) : colline, soussol (tunnel couvert), chuteLibre (falaise + barres de fer), montee (cheminée), pontPlongeon (canyon + tablier), gradins, montagnesRusses (portiques), defile (slalom en creux), salle (hall fermé : verre, cuves, conteneurs, grotte, serveurs…).
- En niveaux, une scène relief sur deux (`Z.plan`), jamais en première scène ; niveaux faciles (difK<1.3) : pas de chuteLibre/montee/pontPlongeon/gradins. `?norelief=1` pour comparer.
- Port : sol qui ne fait que monter (eau plate) ; mer : que descendre ; tour et chute : déjà verticales (pas de relief ajouté). Forêt est maintenant une zone à scènes (`plaine` = ancien décor).
- Banc de test : le pilote suit le relief (niveaux 2-5, 7-10, 12 finis de bout en bout) ; il échoue sur cheminee/city1 (anciennes scènes de ville).
- Boss : fuit moins loin (≤120 m par coup) et n'est plus mangé par le brouillard (`fog=false`).

## À vérifier au doigt (jamais testé sur téléphone)
Équilibrage des ennemis/missiles, difficulté des niveaux 2 à 5, taille de l'arène, caméra en virage, lisibilité des flèches (petites de loin), forêt dégagée.

## Idées en attente
Boss plus personnalisés par zone, plusieurs zones par niveau, missions du jour, récompense de fin de niveau, tutoriel « touche l'hélicoptère » au premier niveau.

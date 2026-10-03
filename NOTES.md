# COLD IMPACT — notes de projet (état v086)

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

## v081 — boss réalistes, looks
- `models_boss.js` : UNIQUEMENT du matériel militaire réaliste, détaillé comme le char : ifv, spg (obusier), mlrs, aagun (radars qui tournent), destroyer, train blindé (« comme le char » : `userData.tankLike` → même IA de tourelle `updateTank`), gunship (hélico lourd tandem), jet, bomber furtif, sub (3 variantes) (`gen/flying` → `Target.updateGeneric`) ; livrées 0-5 (`bossTint`). `CC.LM.POOL` : 6 engins par zone dans l'ordre des 6 passages (niveau n, n+10…). Pas d'animaux ni de robots.
- Entrée du boss en vol depuis le fond de l'arène (`opts.arrive`), sirène/secousse ; il tire plus vite à chaque coup (`rageK`). Mini-boss : mêmes designs.
- Cible spéciale = HELICOPTERE DORE (`opts.gold`, `helicopter(camo, gold)`) : brille et scintille, dérive large, 5 points + carburant, feu d'artifice. Formations de 5 hélicoptères (`grp`) : bonus quand toutes détruites. Son qui monte en série (`door`).
- `world/look.js` : 6 LOOKS (jour, couchant, nuit, givre, brique, jade) = teinte globale + remplacement de matériaux (`lookMat` dans `builder.js`) + ambiance (`Look.pool`, 5 nouveaux envs) + hauteur d'immeubles + toits différents (`top` : flèche, toit à pignon, château d'eau, mât, neige). Niveau n → look `(k + 2·zone) % 6`, k = ⌊(n−1)/10⌋ ; `?look=0..5` force. 8 nouvelles textures de façades (`facadeGlass/Sand/Brick/Mint/Navy/Lilac/White/Ochre`).
- Scène `galerie` (tube à nervures) dans toutes les zones. 120 niveaux (`LM.count`).
- Mer : plus de longs blocs traversables.
- Visionneuse des engins : `cctest/viewer/boss2.html` (hors dépôt).

## v082 — méta-progression (src/systems/meta.js + src/ui/meta_ui.js, sauvegarde `save.meta`)
- ETOILES par niveau : ★ fini, ★★ ≥ 65 % des cibles, ★★★ ≥ 90 % (`T.spawned` = cibles construites, `run.kills`). Affichées sur la carte et l'écran de fin.
- PASS de saison : 40 paliers de 100 XP, piste gratuite + premium, saison = mois (reset). XP : niveau fini 60 + 25/étoile, échec 8-28, quotidien. Premium : `CONFIG.shop.passLink` (lien Stripe, VIDE : le bouton affiche « bientôt ») ; `?premium=1` pour tester.
- MODULES (2 emplacements, 5 niveaux, doublons 2/4/8/16) : OGIVE (explose autour), BOUCLIER (arrête des missiles), SIPHON (+% essence), RADAR (portée du repère), FORTUNE (+% écrous). Trouvés dans les CAISSES VERTES lâchées par les hélicoptères dorés (`spawnModPickup`), le pass, les cadeaux. Page MODULES dans le garage (bouton dans le titre).
- QUOTIDIEN (bouton avec pastille sur l'accueil) : cadeau 7 jours, 3 missions du jour (kills, golden, wins, boss, stars), coffre gratuit toutes les 4 h.
- Amélioration MULTIPLICATEUR (morte) remplacée par PRECISION (`hitPad` : la roquette touche de plus loin).
- Test des écrans : activer le tactile (`CC.Touch.active=true; document.body.classList.add('cc-touch'); game.resize()`) pour avoir la mise en page portrait plein écran.

## v083 — E à I
- E · ENNEMIS PAR ZONE (`world/roster.js`, `entities/models_enemy.js`) : le thème du niveau décide air/sol, `CC.Roster.ZONE` décide QUI (forêt : chars, jeeps, ifv, canons AA, lance-missiles — aucun hélicoptère ; port : camions, patrouilleurs `boat` sur l'eau, sites AA ; usine : sites AA, camions, ifv ; base aérienne : jets, radars ; mer : sous-marins et mines…). Les engins de boss (ifv, aagun, jet, sub…) servent aussi d'ennemis ordinaires (échelle 1,5-2,5). N'importe quel ennemi peut être DORE (`opts.gold`, matériau doré partagé) : 5× les points, lâche une caisse verte.
- F · SURPRISES : un ÉVENEMENT par niveau dès le 3 (`def.event`) : `rain` (7 engins dorés en arc, tous détruits = bonus + caisse), `convoy` (colonne de 8), `storm` (menace et lance-missiles en plus sur 300 m, éclat rouge). Scène `monument` (arche colossale, trilithes, tours de refroidissement + conduite, colonnade). Tours rondes selon le look (`Look.round`).
- G · FANTOME du meilleur essai (`ghostRec/ghostPlay`, localStorage `coldimpact.ghosts`), RECORDS par niveau (`meta.rec`), DEFI D'AMI par lien `?c=niveau.score.temps` (bouton DEFIER, bannière sur l'accueil, caisse offerte si relevé). Un vrai classement mondial demande un serveur (non fait).
- H · PUB RECOMPENSEE : coffre de fin de niveau doublé, cadeau et coffre quotidiens ×2 ; achat SANS PUB (`CONFIG.shop.noAdsLink`, retour `utm_content=noads`) qui supprime seulement les interstitielles ; retour du pass premium (`utm_content=pass`).
- I · explications ponctuelles (première caisse verte, premier engin doré), CODE DE SAUVEGARDE (réglages : copier / coller), vibrations sur engin doré, caisse, formation.

## v084 — difficulté douce + limites de la carte
- `difK = 0.35 + 0.075·(n-1)` (niveau 1 : 0,35 ; niveau 10 : 1 ; niveau 40 : 3,3) et `ease = min(1,(n-1)/35)` (`T.ease`) : tout ce qui est technique (slaloms, portes serrées, virages en épingle, chutes, volets) en dépend.
- Niveau 1 : aucune porte serrée ; niveaux 2-5 : pas de slalom/défilé/salle ni scènes verticales (`ease < 0.12`) ; portes : trou de 26 m au départ (→ 8,5 m), 2,6× plus rares au début ; tube de dégagement `S.R` 12,5 m au départ (→ 6,6) ; slalom : amplitude 4,5 → 11 m, période 150 → 76 m, blocs à `R+6`.
- LIMITES (`Run.update`, endless.js) : plafond invisible à +26 m au-dessus de la trajectoire et bords latéraux (`vol+8`) ; la fusée glisse sans mourir. Plus de passage par-dessus les obstacles ni de sortie de carte.

## v086 — déblocages, garage à paliers, ouvertures animées
- Onglets : GARAGE (niveau de jeu 2), PASS (5), COFFRE DES ETOILES (10, icône sous le quotidien sur l'accueil), BOUTIQUE libre ; l'onglet MAP a disparu. `meta.isOpen(f)` (niveau atteint = `save.lvl.max`), `?unlockall=1` pour tester. Animation de déblocage (cadenas qui tremble puis éclate) + mini-guide en 3 cartes (`Home.drawUnlock`, déclenché sur l'accueil par `meta.pendingUnlock()`).
- Coffre des étoiles = l'écran des niveaux (refaire des niveaux) + une récompense toutes les 3 étoiles (`claimStar`, la 5e = caisse de modules). Coffre d'un niveau déjà fini : 40 %.
- GARAGE : 4 pièces × 6 paliers (gris, vert, bleu, violet, orange, rouge) × 5 niveaux = 30 niveaux ; au niveau 5 : PROMOUVOIR (`progress.buy` renvoie 'level' | 'promote') ; coûts ×2,1 par palier ; sauvegarde `P.up2`. Effets : ESSENCE +1 s/niveau, RENDEMENT −1,5 %/niveau, POINTS +5 %/niveau, PRECISION +0,15 m/niveau. Écrous plus rares (coffre 10+3n, moitié par cible, 1 par 400 m). Une seule icône de pièce (`Home.drawCoinIcon`).
- Ouverture animée (`Home.reveal`) pour cadeau, coffre gratuit, caisses du pass, étoiles : chute, secousse, éclat, cartes qui sortent. Sons : `ui` plus net, `uiTick/uiLock/uiBuy/uiPromote/unlock/chestShake/chestOpen/card` ; tic par seconde au « continuer ? ».

## À vérifier au doigt (jamais testé sur téléphone)
Équilibrage des ennemis/missiles, difficulté des niveaux 2 à 5, taille de l'arène, caméra en virage, lisibilité des flèches (petites de loin), forêt dégagée.

## Idées en attente
Boss plus personnalisés par zone, plusieurs zones par niveau, missions du jour, récompense de fin de niveau, tutoriel « touche l'hélicoptère » au premier niveau.

## v087
- Toucher : dans les menus, le tap est traité au touchend (tolérance 28 px) → plus de boutons (pub, fermer) qui ratent ; `Input.uiPress`.
- Flèches de guide : cause de l'inclinaison = `rotateX(0.6)` (supprimé) ; une flèche tous les 70 m, aussi dans les descentes/montées.
- Limites : plafond = point haut de la trajectoire sur -30/+100 m (+30 m), bord latéral sur la même fenêtre.
- Piqué : le sol ne tue plus (glissade) si la normale est quasi verticale.
- Garage simplifié : cartes plus grandes, flèche + prix, gris→vert GRATUIT, tuto (1re pièce gratuite + flèche verte), gros bouton ACCUEIL, bandeau SCORE retiré.

## v088
- Remontée auto près du sol (raycast vers le bas, pente max selon la hauteur) ; sensibilité tactile 3.0 → 2.3 + lissage ; `hitPad` +1,3 m au niveau 1 (→ 0 vers le niveau 12) ; grosse main animée au tuto (3 premiers vols).

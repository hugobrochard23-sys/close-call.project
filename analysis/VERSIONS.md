# Historique des versions

Chaque version est enregistrée par `tools/record.js` (recordings/vXXX*.mp4, télémétrie .json) et comparée à la référence
par `tools/compare.js` (analysis/iterations/vXXX/). Les anciennes vidéos sont conservées.

## v001 — première version complète

**Changements :** construction complète du jeu à partir de l'analyse :
- les 7 niveaux ;
- le modèle de vol (poussée, traînée, gravité, adhérence, virages) ;
- les capacités : moteur on/off, rétro-fusées, grappin, glissade ;
- les cibles et l'IA (char à tourelle, soldat lance-missile, hélicoptères) ;
- les objets destructibles (vitres, briques, caisses) et les lasers ;
- le système de style et ses messages ;
- le HUD en 3 variantes, les menus ;
- le post-traitement (vignette, aberration chromatique, tramage, bloom) ;
- les sons et la musique synthétisés ;
- le pilote automatique, la télémétrie, l'enregistrement et la comparaison automatiques.

Corrections faites pendant le développement, avant l'enregistrement v001 (étalonnage sur les premières images) :

| Problème | Correction | Raison |
|---|---|---|
| Flamme géante masquant tout l'écran | cubes 0,08→0,25 m, durée de vie 0,09–0,15 s, dégradé jaune→rouge plus rapide | comparaison visuelle avec la séq. 7 |
| Roquette minuscule à l'écran | caméra 4,3 m → 1,85 m derrière, hauteur 1,35 → 0,52 m | calcul d'après la position MESURÉE du nez (55 %) et de la tuyère (67,8 %) |
| Roquette colorée par sa propre flamme | lumière du moteur reculée de 1,6 m | la roquette est gris clair sur la vidéo |
| Rétro-fusées inefficaces moteur allumé | les rétro-fusées coupent le moteur principal, décélération 25 m/s² | OBSERVÉ séq. 4 (flamme principale éteinte), MESURÉ 75→27 m/s |
| G affichés trop élevés (10,9 G) | échelle d'affichage 0,55 → 0,26 | plage observée 3,9–4,7 G |

**Résultat du test :** voir [iterations/v001/RAPPORT_v001.md](iterations/v001/RAPPORT_v001.md).

## v002 — convergence gameplay / caméra / timing

**Raison :** priorités du rapport v001 (gameplay, puis physique, caméra, timing, couleurs).

| Problème (v001) | Correction v002 | Priorité |
|---|---|---|
| Cibles atteintes 1,5 à 3,3 fois trop vite | Les 7 niveaux sont allongés et complétés (détail ci-dessous) | 1 – gameplay / 4 – timing |
| Le pilote automatique ne coupe jamais le moteur | Actions `engineOff` et `retro` placées aux endroits observés (bâtiment, grotte, forêt, trémie) | 1 / 2 |
| Guidage final visant une autre cible | Le guidage terminal ne vise que la cible de la route | 1 |
| Missile ennemi toujours au but | Visée imprécise (décalage 5–8 m), virage 0,8 rad/s | 1 (OBSERVÉ : il frôle sans toucher) |
| Allumage trop tardif (0,7 s) | `ignitionDelay` 0,28 s, d'après le compteur SPEED du canyon | 2 – physique |
| Caméra qui traîne : roquette 17 % trop haute et cachée | Décalage fixe par rapport à la roquette ; seul le décalage est lissé | 3 – caméra |
| Couleurs | Soleil neutre (ville, chantier), briques moins saturées et plus claires, canyon assombri, grotte éclaircie, forêt moins verte | 8 – rendu |
| Fumée du tir masquant l'écran, lanceur contre la caméra | Cubes 0,3–0,7 m placés plus loin, 130 étincelles ; lanceur avancé de 0,5 m | 6 / 8 |
| Chrono du HUD A trop large | Taille et largeur de cellule propres à cet élément | 7 – interface |

Détail des niveaux allongés :

| Niveau | Changements |
|---|---|
| Ville | rue de 200 m, puits de 210 m de profondeur |
| Briques | bâtiment de 240 m : slalom de portes à l'étage, trémie, rez-de-chaussée, ruelle |
| Canyon | tunnel de 190 m, vallée allongée de 130 m |
| Grotte | tunnel d'environ 820 m |
| Forêt | parcours d'environ 750 m, 4 maisons |
| Chantier | toit de 300 m, cage d'escalier de 140 m |
| Forêt de nuit | maison à 630 m |

Durée jusqu'à la cible (pilote automatique, mesurée avant enregistrement) :

| Niveau | v001 | v002 | Référence |
|---|---|---|---|
| Ville | 9,2 | 12,9 | 14,4 |
| Briques | 2,0 | 6,4 | 8,0 |
| Canyon | 8,4 | 11,0 | 13,0 |
| Grotte | 8,7 | 15,8 | 15,6 |
| Forêt | 4,8 | 16,5 | 15,95 |
| Chantier | 5,2 | 11,2 | 14,7 |
| Forêt de nuit | 5,2 | 10,8 | > 8,9 |

**Résultat du test :** voir [iterations/v002/RAPPORT_v002.md](iterations/v002/RAPPORT_v002.md).

**Résultat du test v002 :** 7/7 niveaux, 10/10 cibles, 0 crash. L'écart moyen d'impact passe de 7,2 s à 1,6 s. La tuyère est à 1–14 px de la position mesurée (60–108 px en v001).

## v003 — physique, couleurs, structure forêt/chantier, police

**Raison :** rapport v002 (montée en vitesse trop lente, couleurs, structure des niveaux 5 et 6).

| Problème (v002) | Correction v003 | Priorité |
|---|---|---|
| Montée 31→55 m/s en 0,9 s au lieu de 0,6 s | Poussée 55 m/s², traînée 0,0086 : 40 m/s² à 40 m/s, plafond ≈ 80 m/s. « THRUST:45 » reste affiché | 2 – physique |
| Forêt : trop de forêt sombre, pas de grand toit en planches | Piles de planches et murets autour de la maison 1 ; grange de 110 m au toit survolé au ras | 1 – gameplay / 5 – proportions |
| Chantier : impact 3,5 s trop tôt, cage étroite | Toit de 400 m (slalom prolongé), cage de 16 m aux volées de 5 m, planée moteur coupé sur le toit | 1 / 4 |
| Couleurs L2, L3, L4, L5, L6, L7 | Éclairages recalés sur les moyennes RVB mesurées ; pas de disque solaire au canyon ; paroi de la grotte plus claire | 8 – rendu |
| Flamme trop large et trop jaune | Cubes 0,12–0,17 m, vie 0,08–0,13 s, dégradé plus rouge | 8 |
| Chrono B trop large, virgule | Chrono B : px 0,00312 H, largeur de cellule 1,1 ; virgule descendante | 7 – interface |
| « X2,3+230 » | Espace avant les points | 7 |
| Vitesse 0 au premier instant de la télémétrie | Vitesse initialisée au tir | outil |
| Timings L1–L4 | Hélicoptère de la ville et char n°1 éloignés ; coupures moteur du canyon et de la grotte ajustées | 4 – timing |

Durées mesurées avant enregistrement (pilote automatique, s) :

| Niveau | v003 | Référence |
|---|---|---|
| Ville | 13,8 | 14,4 |
| Briques | 6,6 | 8,0 |
| Canyon | 12,4 | 13,0 |
| Grotte | 15,9 | 15,6 |
| Forêt | 16,1 | 16,0 |
| Chantier | 13,9 | 14,7 |
| Forêt de nuit | 11,8 | > 8,9 |

**Résultat du test :** voir [iterations/v003/RAPPORT_v003.md](iterations/v003/RAPPORT_v003.md).

**Résultat du test v003 :** 7/7 niveaux, 10/10 cibles, 0 crash. Écart moyen d'impact 0,65 s (v002 : 1,6 s). La similarité des couleurs progresse sur les 7 niveaux (grotte 88 %, forêt de nuit 82 %).

## v004 — interface HUD B, freinages, briques, couleurs

| Problème (v003) | Correction v004 | Priorité |
|---|---|---|
| Messages de style affichés au HUD B | Aucun message de style au HUD B (OBSERVÉ : absents des séquences 2, 5 et 7) | 7 – interface / comportement |
| Canyon : freinage jusqu'à 3 m/s (réf. ≈ 30) | Rétro-fusées limitées à 2 segments | 2 – physique |
| Grotte : freinage final trop tardif | Freinage avant la chambre, puis réaccélération | 2 / 4 |
| Briques deux fois trop petites | Répétition de texture 1,6 → 2,6 m | 5 – proportions |
| Sol bleu trop foncé | Cyan clair (#58b0d2) | 8 |
| Couleurs L2, L3, L5, L6, L7 | Éclairages recalés (saturation, teinte, luminosité) | 8 |
| Outil : zone de détection STYLE recoupant le chrono | Marge verticale 18 → 7 px | outil |

**Résultat du test :** voir [iterations/v004/RAPPORT_v004.md](iterations/v004/RAPPORT_v004.md).

**Résultat du test v004 :** 7/7 niveaux, 10/10 cibles, 0 crash. Écart de vitesse de la grotte 19,7 → 12,8 m/s. Plus de messages de style au HUD B. Les couleurs des niveaux sombres gardent des ombres trop profondes.

## v005 — balance des ombres, freinage du canyon

| Problème (v004) | Correction v005 | Priorité |
|---|---|---|
| Noirs trop profonds, manque de bleu (L2, L3, L5, L7) | Post-traitement : relèvement des ombres `lift` #0a0a10, saturation 0,86 (paramètres `postfx.lift` / `postfx.saturation`) | 8 – rendu |
| Canyon : freinage jusqu'à 3 m/s | Action du pilote automatique `retro` avec `hold` (durée limitée) : 1,1 s | 2 – physique / 4 – timing |

**Résultat du test :** voir [iterations/v005/RAPPORT_v005.md](iterations/v005/RAPPORT_v005.md).

**Résultat du test v005 :** 7/7 niveaux, 10/10 cibles, 0 crash. Les couleurs moyennes se rapprochent, mais les histogrammes régressent sur les niveaux 1, 2 et 4 (régression partielle, voir le rapport).

## v006 — balance des ombres calibrée par niveau

| Problème (v005) | Correction v006 | Priorité |
|---|---|---|
| Relèvement unique mal adapté à certains niveaux | `tools/calibrate_color.js` : recherche par grille hors ligne sur les images v004 (saturation × relèvement R/V/B). Valeurs appliquées par niveau dans `env.postfx` | 8 – rendu |

**Résultat du test :** voir [iterations/v006/RAPPORT_v006.md](iterations/v006/RAPPORT_v006.md).

**Résultat du test v006 :** 7/7 niveaux, 10/10 cibles, 0 crash, 0 erreur JavaScript. Similarité d'histogramme moyenne 71,4 % → 74,9 %, six niveaux sur sept en progrès (L6 : −0,2, à confirmer). L'écart de luminance diminue sur cinq niveaux, mais le contraste se dégrade sur L3, L4 et L5 : le relèvement ne touche que les noirs. Les écarts de timing, de cadrage et de vitesse sont inchangés depuis v005, v006 ne modifiant que le rendu.

## v007 — carte aléatoire, boutique de cosmétiques, vol assoupli

**Raison :** demandes hors vidéo, donc hors protocole de comparaison : une carte générée avec difficulté réglable,
une roquette un peu moins rapide et un peu plus maniable, une boutique pour changer l'apparence du missile.

| Changement | Détail |
|---|---|
| Carte aléatoire | `src/world/levels/generated.js`, 8e carte « AUTOMAP » : 3 difficultés (2/3/4 cibles, 520/720/940 m), tracé de rue sinueux, pâtés d'immeubles, portiques, passerelles basses, vitres, caisses, lasers (difficile), lampadaires, points d'accroche, ambiances jour / coucher de soleil / nuit étoilée. Graine tirée à chaque clic ; les routes du pilote automatique sont générées elles aussi, donc une carte aléatoire reste testable et enregistrable (`?test=1&gen=hard&seed=1234`). |
| Boutique | 20 cosmétiques + STOCK : données déclaratives `src/entities/skins.js`, modèle 3D paramétré `src/entities/models.js`, interface `src/ui/shop.js`. Prix 2,99 € / 4,99 € / 6,99 € (fictifs), solde gagné en jouant (5 € offerts, puis 60 centimes + 0,05 par point de STYLE + 1 € par record), achat et équipement immédiats, sauvegarde locale. |
| Vol assoupli | Poussée 55 → 50 m/s², traînée 0,0086 → 0,0100 (plafond ≈ 80 → 71 m/s), vitesse de rotation 3,0 → 3,5 rad/s, gain de visée 7,5 → 9, adhérence 9 → 11, traînée induite 0,085 → 0,070, glissade tolérée jusqu'à 27°. |

Mesures du banc de test (pilote automatique, 30 images/s), mêmes niveaux fixes que v006 pour mesurer le réglage du vol :

| Niveau | v006 : cibles / crashs / vitesse max | v007 : cibles / crashs / vitesse max |
|---|---|---|
| 1 CITY | 1 / 0 / 78,1 m/s | 1 / 1 / 69,7 m/s |
| 2 BRICKWORKS | 4 / 0 / 78,7 m/s | 4 / 0 / 69,9 m/s |
| 3 CANYON | 1 / 0 / 79,6 m/s | 1 / 0 / 70,6 m/s |
| 4 CAVE | 1 / 0 / 74,8 m/s | 1 / 0 / 67,4 m/s |
| 5 WOODS | 1 / 0 / 76,4 m/s | 1 / 0 / 68,6 m/s |
| 6 CONSTRUCTION | 1 / 0 / 72,8 m/s | 1 / 0 / 66,6 m/s |
| 7 NIGHT FOREST | 1 / 0 / 77,6 m/s | 1 / 0 / 69,4 m/s |

Cartes aléatoires, 5 graines × 3 difficultés (4242, 1, 777, 90210, 987654321) : **15/15 cartes terminées, 15/15 cibles
détruites, 0 crash, 0 erreur JavaScript**. Construction : 0,1 ms pour la fiche de niveau, 43 ms pour la géométrie et les
collisions (premier appel plus lent : compilation des shaders). Butin : 1,87 à 3,04 € par niveau réussi.

**Résultat du test v007 :** aucune vidéo enregistrée pour cette version (elle ne cherche pas à se rapprocher de la référence) :
les sept niveaux fixes restent terminés par le pilote automatique, à la même vitesse réduite de ~10 %. Une seule régression :
sur L1, le pilote automatique touche le bord du puits (0 → 1 crash) — sa route avait été réglée sur l'ancien taux de rotation,
la roquette plus agile dépasse maintenant le point de descente. Le reste est inchangé. Les cartes aléatoires passent les
15 essais du banc de test, et la boutique est vérifiée de bout en bout (achat, solde insuffisant, équipement, reconstruction
du modèle 3D et changement de couleur de flamme).

## v009 — pilotage clavier, moteur maintenu, essence

**Changements (CHOIX de conception, hors vidéo) :**
- pilotage W,A,S,D (Z,Q,S,D et flèches toujours acceptés, souris facultative) ;
- moteur à la demande : **G maintenue** = poussée, relâchée = moteur coupé (remplace Espace on/off) ;
- 3 s de poussée automatique et gratuite après l'allumage (`rocket.freeBoost`) ;
- essence par niveau (`fuel`), pleine à chaque tir, décroissante avec la difficulté (20 → 8 s ; AUTOMAP 12 / 13 / 15 s) ;
- jauge d'essence en bas à gauche, cadre proportionnel au réservoir ; le pilote automatique maintient G sauf sur les tronçons « moteur coupé ».

**Vérification :** le pilote automatique termine les 7 niveaux et les 3 difficultés AUTOMAP avec l'essence limitée
(réserve minimale : 2,7 s sur NIGHT FOREST). Aucun enregistrement vidéo ni comparaison `compare.js` refaits pour cette version.

## v010 — caméra de poursuite indépendante, boost 0,5 s

**Changements (CHOIX) :**
- en vol, la caméra suit la trajectoire de la roquette avec retard (`camera.followLag` = 2,2/s) au lieu de tourner avec la visée ;
  le réticule suit la direction visée projetée à l'écran ;
- poussée gratuite au lancement : 3 s → 0,5 s ; réservoirs relevés de 3 s pour garder les marges (23 → 11 s ; AUTOMAP 15 / 16 / 18 s) ;
- écran F1 : colonne des touches décalée (« RIGHT CLICK (HOLD) » chevauchait sa description).

**Vérification :** pilote automatique : 7 niveaux + 3 AUTOMAP terminés, réserve minimale 3,2 s (NIGHT FOREST).
Virage à droite maintenu 0,5 s : la tuyère se déplace de 50 % à 36 % de la largeur de l'écran puis revient vers le centre en ≈ 1,5 s.


## v011 — pilotage à 360°, moteur sur Espace

**Changements (CHOIX) :**
- visée = orientation complète (quaternion) au lieu de lacet + tangage bornés à ±88° : W,A,S,D et la souris tournent la roquette
  dans son propre repère → loopings, vol sur le dos ; l'horizon se remet à plat doucement quand on ne cabre / pique pas
  (`input.autoLevel`) ; au lanceur, visée inchangée (tangage borné, sans roulis) ;
- la caméra de poursuite prend pour « haut » celui de la visée (avec retard) : pas de retournement en haut d'un looping ;
- moteur : G → **Espace** maintenue.

**Vérification :** pilote automatique : 10 cartes terminées, chiffres identiques à v010. Espace + W maintenues 6 s sur AUTOMAP facile :
601° de rotation de la trajectoire, toujours en vol ; tuyère à l'écran sans saut (≤ 1,9 % de l'écran par image).
Limite : pendant un looping continu la queue de la roquette sort légèrement par le bas de l'écran (retard de la caméra, `camera.followLag`).

## v012 — caméra fixe en orientation, pilotage selon les axes de l'écran

**Changements (CHOIX, à la demande d'Hugo) :**
- en vol, la caméra ne tourne plus : orientation figée au tir, translation seule à distance constante de la roquette
  (qui peut pointer vers la caméra) ; rapprochement sans rotation si un mur s'interpose ; plus de roulis en virage ;
- W,A,S,D / souris : rotations autour des axes fixes de l'écran (W/S : axe horizontal, looping complet ; A/D : axe vertical) ;
- supprimés : `camera.followLag`, `rollFromYawRate`, `rollLag`, `input.autoLevel` (devenus sans objet) ;
- télémétrie : pose de la caméra (`cam`) à chaque image.

**Vérification :** rotation de la caméra mesurée = 0° pendant un looping (5 s), un demi-tour (D) et un vol mixte (W+A) ;
distance caméra–roquette 1,92–1,93 m (0,95 m quand un mur s'interpose) ; la roquette se dirige vers la caméra dans les trois cas.
Pilote automatique : 10 cartes terminées, chiffres identiques à v011.

## v013 — pivot sur le centre, vol à inertie, gravité Terre / Lune

**Changements (CHOIX d'Hugo) :**
- la tête de la roquette suit directement la visée (pivot sur le centre, sans vitesse de rotation bornée) ;
- inertie : plus d'adhérence ni de traînée induite ; la trajectoire ne change que par la poussée (axe du nez), la gravité et l'air ;
- gravité 9,81 → 5,715 m/s² (moyenne Terre 9,81 / Lune 1,62), roquette seulement ; G affichés toujours en G terrestres ;
- plus de rotation continue sur l'axe long ; orientation du modèle prise sur la visée (pas de basculement des ailerons) ;
- pilote automatique : oriente la poussée pour corriger l'écart vitesse voulue / vitesse réelle, compense la gravité,
  ralentit avant les virages ; ignore les consignes « moteur coupé » / « rétro » de la vidéo (`test.apLegacyActions`) ;
- réservoirs redimensionnés (besoin mesuré + réserve v012) : 29 → 16 s ; AUTOMAP 18 / 19 / 23 s ; `fuelBarMax` 30.

**Vérification :** pivot D 0,5 s moteur coupé : cap de la trajectoire 0,0° → 0,0° (seule la tête bouge) ; puis 1 s de poussée
nez à droite : cap 0° → 38,8° ; gravité mesurée 5,72 m/s² (traînée retirée) ; ailerons immobiles entre deux images à 0,5 s d'écart.
Pilote automatique : 10 cartes terminées sans crash, réserve minimale 4,2 s (NIGHT FOREST).

## v014 — repère de trajectoire réelle

**Changement (CHOIX) :** cercle vert à trois branches (`hud.velocityMarker`) projeté dans la direction de la vitesse, en plus du
réticule « x » (direction de la tête). Masqué si la roquette file vers la caméra.

**Vérification :** tête pivotée à droite sans poussée : cercle dans l'axe de la rue, x à droite ; après 0,7 s de poussée :
le cercle s'est déplacé vers le x. Aucune erreur.

## v015 — retour au vol d'avant (loopings), gravité et cercle vert conservés

**Changements (à la demande d'Hugo) :** abandon du vol à inertie de v013 : `rocket.js`, `input.js`, `camera.js`, niveaux et
réglages de vol restaurés depuis v012 (trajectoire qui suit le nez, rotation continue sur l'axe long, pilote automatique
et réservoirs de v012). Conservés : gravité 5,715 m/s² (v013), G affichés en G terrestres, cercle vert de trajectoire (v014).

**Vérification :** pilote automatique : 10 cartes terminées sans crash, réserves identiques à v012 (minimum 3,2 s, NIGHT FOREST) ;
Espace + W 5 s : 497° de rotation de la trajectoire, toujours en vol ; rotation de la caméra 0° ; cercle vert affiché.

## v016 — retour à la v011, gravité Terre / Lune conservée

**Changements (à la demande d'Hugo) :** tout le code du jeu (`src/`, `index.html`, `style.css`, `game.js`) et le README restaurés
à l'identique de v011 : caméra qui suit la roquette avec retard (`camera.followLag`) et se met sur le dos avec elle, pilotage
dans le repère de la roquette, loopings. Abandonnés : caméra fixe (v012), vol à inertie (v013), cercle vert (v014).
Seule différence avec v011 : gravité 5,715 m/s² (moyenne Terre / Lune), G affichés maintenus en G terrestres.

**Vérification :** pilote automatique : 10 cartes terminées sans crash (réserve minimale 3,2 s) ; Espace + W 6 s : 601° de rotation,
toujours en vol, tuyère sans saut (≤ 1,6 % de l'écran par image) — mêmes valeurs que les mesures de v011.

## v017 — commandes tactiles et jeu en vertical (iPhone)

**Changements (à la demande d'Hugo) :** `src/input/touch.js` : joystick (visée, remplace souris / W,A,S,D), PROPULSION maintenue,
FEU, MENU, R ; actifs seulement sur écran tactile (ou `#touch`). Couché : vue 16:9, commandes par-dessus ; jauge d'essence
recentrée, SPEED sous TIME. Debout : vue pleine largeur au format 3:4 (`render.portraitHeight`), commandes dessous ;
textes du HUD rapportés à la largeur, textes de droite alignés au bord, annonces recentrées ; menus dessinés dans une bande
centrée (colonnes, titres et boutique redisposés : 2 colonnes). `CC.game` exposé pour le diagnostic.

**Vérification :** téléphone simulé (375×812 et 667×375, tactile) : FEU → vol, PROPULSION → moteur et essence qui baisse,
joystick → visée qui tourne, MENU → pause, FEU → reprise, R → recommence ; menu, difficulté, boutique, pause, résultats lisibles
sans débordement en vertical. Ordinateur : aucune commande tactile, pilote automatique 10 cartes sans crash.

## v018 — joystick moins sensible

**Changement (à la demande d'Hugo) :** `input.touch.rate` 2,4 → 1,5 rad/s à fond, `curve` 1,5 → 2 (plus fin près du centre).
Vitesse de rotation de la visée : 138 → 86 °/s à fond, 39 → 16 °/s à mi-course.

**Vérification :** téléphone simulé, joystick 0,5 s : 43° à fond (69° en v017), 8° à mi-course ; aucune erreur.

## v019 — caméra qui suit la tête, horizon à plat, roquette plus maniable

**Changements (à la demande d'Hugo) :**
- caméra : s'oriente vers la tête de la roquette (et non plus la trajectoire) par un double lissage (`noseLag` 3, `followLag` 2,0) ;
  plus d'inclinaison de l'horizon en virage (`rollFromYawRate` 0) ; le « haut » suit toujours la visée (loopings) ;
- maniabilité : `steerGain` 9 → 22, `maxTurnRate` 3,5 → 5, `grip` 11 → 24, `gripEngineOff` 4,6 → 9 ;
- pilote automatique : compensation du retard divisée par (grip / 11)² ; télémétrie : pose de la caméra (`cam`).

**Vérification (D maintenue 0,5 s, moteur allumé, AUTOMAP facile) :** retard de la trajectoire sur la visée 19,2° → 8,2° ;
horizon penché max 7,9° → 0° ; à-coup max de la caméra 174 → 92 °/s², rotation max 64 → 42 °/s.
Looping Espace + W : 508° en 5 s, tuyère sans saut (≤ 1,5 % / image). Pilote automatique : 10 cartes terminées.

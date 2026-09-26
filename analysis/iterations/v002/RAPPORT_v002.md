# FIREROCKET ITERATION REPORT

Version : v002
Date : 2026-09-21

Vidéos : `recordings/v002.mp4`, `recordings/v002_L<n>_<id>.mp4`. Mesures : [MESURES_v002.md](MESURES_v002.md). Changements : [../../VERSIONS.md](../../VERSIONS.md).

Protocole : 7/7 niveaux terminés, 10/10 cibles, 0 crash, 0 erreur JavaScript.
L'enregistreur a été fiabilisé : un Chrome neuf par niveau, avec une nouvelle tentative (échec de lancement de Chrome sur la grotte au premier passage).

## GAMEPLAY
Instant d'impact (clone / référence) :

| Niveau | v001 | v002 | Référence |
|---|---|---|---|
| CITY | 9,2 | 12,9 | 14,4 |
| BRICKWORKS | 2,0 | 6,4 | 8,0 |
| CANYON | 8,4 | 11,0 | 13,0 |
| CAVE | 8,7 | 15,8 | 15,6 |
| WOODS | 4,8 | 16,5 | 16,0 |
| CONSTRUCTION | 5,2 | 11,2 | 14,7 |
| NIGHT FOREST | 5,2 | 10,8 | > 8,9 |

- L'écart moyen passe de 7,2 s à 1,6 s.
- Les séquences (fenêtre, pièces, trémie, grange, cage d'escalier) arrivent désormais dans l'ordre et à peu près au moment observé.

## PHYSICS
- Allumage à 0,28 s : la courbe SPEED du canyon monte plus tôt, mais reste trop lente entre 0,3 et 0,9 s (46,8 m/s contre 55 à 0,9 s). **Le couple poussée/traînée est à recaler :** accélération de 40 m/s² à 40 m/s et plafond vers 80 m/s.
- Grotte : écart quadratique de vitesse 27,8 → 19 m/s grâce aux coupures moteur ; plage de vitesses 37–70 m/s (référence 27–78).
- Canyon : écart quadratique 10,7 → 15,4 m/s, car la phase de ralentissement finale est trop brutale (24 m/s à 9,1 s contre 67) et arrive trop tôt.

## CAMERA
- **Corrigé :** la tuyère est à y = 418–433 px contre 432 mesuré, soit 1 à 14 px d'écart (60 à 108 px en v001).
- La roquette est visible au bas-centre, flamme en dessous, comme sur la vidéo.

## VISUAL
Similarité des couleurs par niveau (v001 → v002) :

| Niveau | v001 | v002 | Remarque |
|---|---|---|---|
| L1 | 54,7 % | 59,8 % | |
| L2 | 47,5 % | 55,3 % | encore trop saturé (140,66,38 contre 119,69,55) |
| L3 | 78,6 % | 85,0 % | |
| L4 | 63,3 % | 81,0 % | encore trop sombre et trop saturé |
| L5 | 50,2 % | 57,3 % | trop sombre, trop vert |
| L6 | 74,6 % | 73,1 % | trop neutre et blanc |
| L7 | 76,2 % | 77,5 % | trop sombre |

- Flamme encore trop large et trop jaune dans la moitié basse de l'écran. Dans la vidéo, elle est plus fine et vire vite à l'orange.
- Canyon : disque solaire visible, alors que la référence ne montre qu'une lueur à l'horizon.
- Forêt : la référence est dominée par les piles de planches, les murs de briques et un très long toit en planches.
- Chantier : la référence descend une large cage d'escalier. Le clone arrivait trop tôt dans une cage étroite.

## UI
- Tous les éléments sont à moins de 5 px en hauteur.
- Chrono du HUD B : 12 à 15 px trop large. La virgule de la référence descend sous la ligne de base, ce que le clone ne fait pas.
- Messages : espace manquant entre le multiplicateur et les points (« X2,3+230 »).

## ANIMATION
- Lanceur et fumée de tir conformes. La référence a plus d'étincelles, très dispersées.

## AUDIO
- Sans objet (référence muette).

## CRITICAL DIFFERENCES
1. Montée en vitesse trop lente au départ, puis plafond et ralentissements mal calés (physique).
2. Couleurs des niveaux 2, 4, 5 et 7 (saturation et luminosité), flamme trop large (rendu).
3. Structure de la forêt et du chantier (planches, grange, large escalier), impact du chantier 3,5 s trop tôt.

## NEXT CORRECTIONS
1. Poussée 55 m/s² et traînée 0,0086, d'après la montée mesurée (40 m/s² à 40 m/s, plafond 80 m/s). La valeur « THRUST:45 » affichée est conservée.
2. Forêt : piles de planches, grange de 110 m au toit survolé. Chantier : toit de 400 m, cage d'escalier de 16 m aux volées de 5 m.
3. Éclairages par niveau recalés sur les couleurs moyennes mesurées ; plus de disque solaire au canyon ; flamme plus fine et plus rouge.
4. Police : virgule descendante, chrono B plus étroit ; espace dans les messages.

# FIREROCKET ITERATION REPORT

Version : v001
Date : 2026-09-21

Vidéos : `recordings/v001.mp4` (montage), `recordings/v001_L<n>_<id>.mp4`. Mesures détaillées : [MESURES_v001.md](MESURES_v001.md).
Planches original │ clone │ différence : `L<n>_<id>_comparaison.png`.

Résultat global du protocole : 7/7 niveaux terminés en pilote automatique, 10/10 cibles détruites, 0 crash, 0 erreur JavaScript.

## GAMEPLAY
- Toutes les mécaniques fonctionnent : tir, éjection, allumage, pilotage au réticule, moteur on/off, rétro-fusées, glissade, destruction des vitres, briques et caisses, cibles, respawn en mode TARGETS, résultats.
- **Écart majeur (timing de progression) :** les cibles sont atteintes 1,5 à 3,3 fois plus vite que dans la vidéo. Les niveaux reconstruits sont trop courts ; la référence enchaîne davantage de pièces, virages et détours.

| Niveau | Impact clone | Impact référence |
|---|---|---|
| CITY | 9,2 s | 14,4 s |
| BRICKWORKS (char 1) | 2,0 s | 8,0 s |
| CANYON | 8,4 s | 13,0 s |
| CAVE | 8,7 s | 15,6 s |
| WOODS | 4,8 s | 16,0 s |
| CONSTRUCTION | 5,2 s | 14,7 s |
| NIGHT FOREST | 5,2 s | > 8,9 s (vidéo coupée) |

## PHYSICS
- Éjection 30,8 m/s (réf. 31, MESURÉ) : conforme.
- CANYON, courbe SPEED : écart quadratique 10,7 m/s, biais −4 m/s.
  - Entre 1,5 et 7,5 s : écart inférieur à 5 m/s.
  - Début : l'accélération commence à 0,7 s (clone) contre environ 0,28 s (réf., le compteur passe 31 → 35 entre 0,23 et 0,33 s). **L'allumage est trop tardif.**
- CAVE : vitesse du clone ≈ 80 m/s contre 37–60 m/s sur la référence (écart quadratique 27,8, biais +22,9). Dans la vidéo, le joueur coupe souvent le moteur ; le pilote automatique ne le fait pas.

## CAMERA
- **Écart critique :** la tuyère est à y ≈ 324–333 px dans le clone contre ≈ 405–448 px dans la référence (médiane mesurée 432). La roquette est donc environ 17 % de la hauteur d'écran trop haut, et cachée derrière sa flamme.
- Cause : le lissage exponentiel de la position fait traîner la caméra (retard ≈ vitesse / 11 ≈ 5 m, borné à +2,2 m), au lieu de rester à 1,85 m.

## VISUAL
Similarité des histogrammes de couleur par niveau :

| Niveau | Similarité | Écart principal |
|---|---|---|
| L1 | 55 % | clone trop orange |
| L2 | 48 % | briques trop saturées et trop sombres (Δ luminance −29) |
| L3 | 79 % | canyon trop clair et trop orange |
| L4 | 63 % | grotte trop sombre (Δ −18) |
| L5 | 50 % | trop vert et jaune ; la référence est dominée par les briques rouges et le béton gris |
| L6 | 75 % | clone trop chaud ; la référence est neutre et bleutée |
| L7 | 76 % | proche |

- Fumée du tir : un cube blanc géant masque l'écran. La référence montre de petits cubes blancs et de nombreuses étincelles jaunes dispersées.
- Lanceur à l'épaule : trop sombre, avec un carré rouge trop grand.

## UI
- HUD : écarts de 0 à 3 px en hauteur pour tous les éléments (binds, chrono, STYLE, THRUST, TIME, SPEED, SCORE).
- Le chrono des HUD A et B est trop large : environ +19 px sur 7 caractères, soit une police environ 18 % trop large.
- Le chrono du HUD B est 6 px moins haut que la référence.
- Les messages de style sont conformes au format observé.

## ANIMATION
- Flamme, débris, éclats, rotor, tourelle : présents.
- La roquette reste presque toujours alignée sur la visée. Dans la référence, elle est souvent vue de trois-quarts car le joueur vise au-delà de la trajectoire.

## AUDIO
- Pas de référence (vidéo muette). Sons synthétisés fonctionnels ; non évaluables par comparaison.

## CRITICAL DIFFERENCES
1. Durée des niveaux et de la progression vers la cible : 1,5 à 3,3 fois trop courte (gameplay et timing).
2. Caméra de poursuite qui traîne : roquette trop haute à l'écran et masquée par sa flamme.
3. Allumage trop tardif (0,7 s contre environ 0,28 s) ; vitesse de croisière trop élevée dans la grotte.

## NEXT CORRECTIONS
1. Caméra : décalage fixe par rapport à la roquette (lissage de l'orientation seulement).
2. Allumage à 0,28 s, d'après le compteur SPEED du canyon.
3. Allonger les 7 niveaux pour retrouver les durées mesurées :
   - pièces et couloirs supplémentaires, puits et cage d'escalier plus profonds, forêt plus longue ;
   - le pilote automatique coupe le moteur et utilise les rétro-fusées aux endroits observés ;
   - grappin sur le disque du niveau 1.
4. Couleurs par niveau : éclairages et teintes recalés sur les moyennes RVB mesurées.
5. Fumée de tir plus petite et plus d'étincelles ; lanceur plus clair ; largeur de police par élément du HUD.

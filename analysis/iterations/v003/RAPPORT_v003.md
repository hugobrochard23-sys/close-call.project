# FIREROCKET ITERATION REPORT

Version : v003
Date : 2026-09-21

Vidéos : `recordings/v003.mp4`, `recordings/v003_L<n>_<id>.mp4`. Mesures : [MESURES_v003.md](MESURES_v003.md).

Protocole : 7/7 niveaux, 10/10 cibles, 0 crash, 0 erreur JavaScript.

## GAMEPLAY
Écart entre l'instant d'impact du clone et celui de la référence (s) :

| Niveau | v002 | v003 |
|---|---|---|
| CITY | 1,6 | 0,7 |
| BRICKWORKS | 1,6 | 1,4 |
| CANYON | 2,0 | 0,6 |
| CAVE | 0,2 | 0,3 |
| WOODS | 0,6 | 0,1 |
| CONSTRUCTION | 3,5 | 0,8 |

- Écart moyen : 1,6 s → 0,65 s.
- Forêt : grange au long toit en planches et piles de planches autour de la maison 1, présentes aux mêmes moments que dans la vidéo.
- Chantier : slalom plus long sur le toit, large cage d'escalier.

## PHYSICS
- CANYON : écart quadratique de vitesse 15,4 → 11,2 m/s.
  - Montée : 31 → 49 m/s à 0,9 s (réf. 55).
  - Croisière entre 1,5 et 8 s : moins de 6 m/s d'écart.
  - **Freinage final trop fort :** 3–9 m/s à 10,6–11,4 s contre 29–32 m/s.
- CAVE : écart quadratique 19,7 m/s. Le freinage de fin arrive environ 1 s trop tard (76 m/s à 13–14 s contre 48 → 28).

## CAMERA
- Tuyère à 0,6–4 px de la position mesurée sur les niveaux 2 à 5 et 7 ; 14–15 px sur les niveaux 1 et 6.

## VISUAL
Similarité des couleurs (v002 → v003) :

| Niveau | v002 | v003 |
|---|---|---|
| L1 | 59,8 % | 60,4 % |
| L2 | 55,3 % | 58,3 % |
| L3 | 85,0 % | 85,3 % |
| L4 | 81,0 % | 88,3 % |
| L5 | 57,3 % | 57,5 % |
| L6 | 73,1 % | 76,3 % |
| L7 | 77,5 % | 82,0 % |

Écarts restants (couleur moyenne RVB, clone contre référence) :

| Niveau | Écart | Clone | Référence |
|---|---|---|---|
| L2 | encore trop saturé | 126,59,39 | 119,69,55 |
| L3 | trop orange | 31,22,10 | 33,31,22 |
| L5 | pas assez rouge | 58,43,16 | 75,38,24 |
| L6 | trop lumineux | 138,132,120 | 122,118,117 |
| L7 | trop sombre | 21,38,13 | 34,45,24 |

- Briques : celles de la référence sont environ deux fois plus grosses.
- Sol bleu : cyan clair dans la référence.

## UI
- Chrono B corrigé : écart de hauteur 0 px, largeur −1/−3 px (v002 : +12/+15), virgule descendante.
- Les écarts de « STYLE » (−18 px en haut) viennent de l'outil : la zone de détection recoupait la virgule du chrono. Corrigé dans compare.js pour v004.
- **Nouvel écart identifié :** les séquences au HUD B (briques, forêt, forêt de nuit) n'affichent aucun message de style dans la vidéo. C'est une version antérieure du jeu, alors que le clone en affiche.

## ANIMATION / AUDIO
- Sans changement notable. Audio : sans objet (référence muette).

## CRITICAL DIFFERENCES
1. Messages de style affichés au HUD B alors qu'ils sont absents de la vidéo (interface / comportement).
2. Freinages du canyon (trop fort) et de la grotte (trop tardif) (physique / timing).
3. Taille des briques, couleur du sol bleu, balance de couleur des niveaux 2, 3, 5, 6 et 7 (rendu).

## NEXT CORRECTIONS
1. Pas de messages de style au HUD B.
2. Rétro-fusées du canyon raccourcies ; freinage de la grotte avancé, puis réaccélération.
3. Briques 2,6 m, sol cyan clair, éclairages L2, L3, L5, L6 et L7 recalés ; zone de détection du HUD resserrée dans compare.js.

# FIREROCKET ITERATION REPORT

Version : v004
Date : 2026-09-21

Vidéos : `recordings/v004.mp4`, `recordings/v004_L<n>_<id>.mp4`. Mesures : [MESURES_v004.md](MESURES_v004.md).

Protocole : 7/7 niveaux, 10/10 cibles, 0 crash, 0 erreur JavaScript.

## GAMEPLAY
- Instants d'impact inchangés, sauf la grotte (+0,7 s, freinage avancé) : écarts de 0,1 à 1,4 s.
- Plus aucun message de style au HUD B (briques, forêt, forêt de nuit), conformément à la vidéo.

## PHYSICS
- Grotte : écart quadratique de vitesse 19,7 → 12,8 m/s, biais −0,1 m/s. La phase freinage puis réaccélération correspond à la référence.
- Canyon : inchangé (11,2 m/s). Le raccourcissement de l'action est sans effet, car la jauge limite déjà les rétro-fusées à 1,6 s. **Il faut limiter la durée elle-même** (fait en v005).

## CAMERA
- Inchangée : tuyère à 0,4–15 px de la position mesurée.

## VISUAL
- Similarité des couleurs :

| Niveau | v003 | v004 |
|---|---|---|
| L1 | 60,4 % | 60,4 % |
| L2 | 58,3 % | 58,4 % |
| L3 | 85,3 % | 85,6 % |
| L4 | 88,3 % | 87,0 % |
| L5 | 57,5 % | 58,9 % |
| L6 | 76,3 % | 78,2 % |
| L7 | 82,0 % | 82,1 % |

- Briques deux fois plus grosses, sol bleu cyan clair : conformes à la séquence 2.
- **Tendance commune aux niveaux sombres :** le clone manque de bleu et ses noirs sont trop profonds. Écart moyen de −8 à −17 en R, 0 à −8 en V, −7 à −15 en B.

| Niveau | Clone (RVB) | Référence (RVB) |
|---|---|---|
| L3 | 30,23,11 | 33,31,22 |
| L5 | 58,40,15 | 75,38,24 |
| L7 | 24,45,15 | 34,45,24 |

- Les ombres de la vidéo sont grisées et bleutées, probablement par la compression et le post-traitement du jeu d'origine.

## UI
- Zone de détection resserrée : l'écart « STYLE » disparaît (0–1 px en hauteur).
- Tous les éléments sont à moins de 3 px en hauteur.
- Les écarts de largeur restants viennent de chaînes différentes (le score STYLE n'a pas la même valeur).

## ANIMATION / AUDIO
- Sans changement. Audio : sans objet.

## CRITICAL DIFFERENCES
1. Balance des ombres (noirs trop profonds, manque de bleu) sur les niveaux 2, 3, 5 et 7.
2. Canyon : freinage jusqu'à 3 m/s au lieu d'environ 30.
3. Ville et chantier : tuyère 15 px trop haut par rapport à la médiane mesurée (séquences 3 à 7).

## NEXT CORRECTIONS
1. Post-traitement : relèvement des ombres (#0a0a10) et saturation 0,86, d'après l'écart moyen mesuré.
2. Rétro-fusées du pilote automatique limitées dans le temps (1,1 s au canyon).

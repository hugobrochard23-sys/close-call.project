# FIREROCKET ITERATION REPORT

Version : v005
Date : 2026-09-22

Vidéos : `recordings/v005.mp4`, `recordings/v005_L<n>_<id>.mp4`. Mesures : [MESURES_v005.md](MESURES_v005.md).

Protocole : 7/7 niveaux, 10/10 cibles, 0 crash, 0 erreur JavaScript.

## GAMEPLAY
- Inchangé, sauf le canyon : impact à 11,8 s (réf. 13,0), soit 1,1 s d'écart contre 0,6 s en v004. C'est la contrepartie d'un freinage plus réaliste.

## PHYSICS
- CANYON : écart quadratique de vitesse 11,2 → 10,1 m/s. Vitesse minimale avant la fosse 7–20 m/s (réf. 26–43 ; v004 : 3).

## CAMERA
- Inchangée.

## VISUAL
Le relèvement global des ombres (#0a0a10, saturation 0,86) rapproche nettement les couleurs moyennes :

| Niveau | Clone v004 | Clone v005 | Référence |
|---|---|---|---|
| L2 | 120,60,40 | 120,67,54 | 119,69,55 |
| L7 | 24,45,15 | 34,51,31 | 34,45,24 |

Mais il **dégrade** la similarité d'histogramme :

| Niveau | v004 | v005 |
|---|---|---|
| L1 | 60,4 % | 58,9 % |
| L2 | 58,4 % | 54,4 % |
| L4 | 87,0 % | 80,9 % |

- Le bleu est trop relevé dans les niveaux 3, 4 et 7, et une valeur unique ne convient pas à tous les niveaux.
- Conclusion : **régression partielle.** Une calibration par niveau est nécessaire.

## UI / ANIMATION / AUDIO
- Sans changement.

## CRITICAL DIFFERENCES
1. Balance des ombres unique pour tous les niveaux : amélioration des moyennes, mais dégradation des histogrammes.
2. Canyon : impact 1,1 s trop tôt.

## NEXT CORRECTIONS
1. Nouvel outil `tools/calibrate_color.js` : il applique hors ligne la transformation du shader aux images de v004 et cherche par grille la saturation et le relèvement qui maximisent la similarité avec la référence, niveau par niveau.

Gain attendu (mesuré sur images réduites) :

| Niveau | Sans correction | Avec correction |
|---|---|---|
| L1 | 59,8 % | 61,5 % |
| L2 | 56,1 % | 58,3 % |
| L3 | 78,6 % | 80,4 % |
| L4 | 88,6 % | 89,4 % |
| L5 | 51,4 % | 55,7 % |
| L6 | 77,2 % | 78,5 % |
| L7 | 80,3 % | 83,5 % |

2. Ces valeurs sont appliquées par niveau en v006.

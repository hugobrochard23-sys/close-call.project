# FIREROCKET ITERATION REPORT

Version : v006
Date : 2026-09-22

Vidéos : `recordings/v006.mp4`, `recordings/v006_L<n>_<id>.mp4`. Mesures : [MESURES_v006.md](MESURES_v006.md).

Protocole : 7/7 niveaux, 10/10 cibles, 0 crash, 0 erreur JavaScript (510, 788, 451, 594, 579, 515 et 452 images à 30 i/s).

## MÉTHODE — calibration de la balance des ombres, niveau par niveau

Le rapport v005 concluait qu'une valeur unique de relèvement des ombres (`lift`) et de saturation ne pouvait pas convenir aux sept niveaux :
il rapprochait les couleurs moyennes mais dégradait les histogrammes des niveaux 1, 2 et 4.

v006 remplace cette valeur unique par une **calibration hors ligne par niveau**, produite par le nouvel outil `tools/calibrate_color.js` :

1. l'outil prend les images d'une version enregistrée **sans** la transformation — v004, dont `env.postfx` ne portait pas encore de `lift` ;
2. il leur applique exactement la transformation du shader de post-traitement (désaturation autour de la luminance, puis relèvement des ombres pondéré par `k = 1 − luminance/255 × 1,6`, donc maximal dans les noirs) ;
3. il compare à la référence, aux mêmes instants de course de chaque niveau, le coefficient de Bhattacharyya d'histogrammes 512 classes (8×8×8 canaux) et cherche par grille la saturation et le relèvement qui maximisent la similarité ;
4. le résultat est écrit dans `analysis/iterations/v004/calibration_couleur.json` et reporté à la main dans `env.postfx` des sept niveaux ;

Les valeurs par défaut redeviennent neutres dans `src/config.js` (`lift: '#000000'`, `saturation: 1.0`) : la transformation n'existe plus que par niveau.

| Niveau | Valeur calibrée (v006) | Similarité prévue sans correction | avec correction |
|---|---|---|---|
| L1 CITY | sat 0,80 · lift #100000 | 59,8 % | 61,5 % |
| L2 BRICKWORKS | sat 1,08 · lift #080008 | 56,1 % | 58,3 % |
| L3 CANYON | sat 0,80 · lift #040004 | 78,6 % | 80,4 % |
| L4 CAVE | sat 1,08 · lift #040408 | 88,6 % | 89,4 % |
| L5 WOODS | sat 0,80 · lift #100008 | 51,4 % | 55,7 % |
| L6 CONSTRUCTION | sat 1,08 · lift #040810 | 77,2 % | 78,5 % |
| L7 NIGHT FOREST | sat 1,08 · lift #100810 | 80,3 % | 83,5 % |

Les valeurs prévues ont été calculées sur des images réduites à 283×159 issues de v004, alors que `MESURES_v006.md` mesure à la résolution pleine (1132×636) : les deux séries ne sont pas comparables en valeur absolue, seule la tendance l'est.

## GAMEPLAY

- Inchangé par rapport à v005 : v006 ne touche qu'au rendu. Les instants d'impact sont identiques au centième (écarts de 0,1 à 1,4 s selon le niveau), 10/10 cibles, 0 crash.
- Le test automatique confirme aussi que les sept niveaux restent traversables par le menu du jeu (entrée dans chaque niveau, HUD attendu, aucune erreur JavaScript) en `file://` comme via `node tools/serve.js`.

## PHYSICS

- Inchangée : aucune constante de `src/config.js` n'a bougé. Les écarts quadratiques de vitesse restent 10,1 m/s (canyon) et 12,8 m/s (grotte), biais −3,8 m/s et −0,1 m/s, exactement comme en v005.

## CAMERA

- Inchangée. La tuyère reste à 0,4–14,8 px de la position mesurée d'après la télémétrie.

## VISUAL

Similarité d'histogramme, mesure de v005 → v006 :

| Niveau | v005 | v006 | Écart |
|---|---|---|---|
| L1 CITY | 58,9 % | 63,3 % | +4,4 |
| L2 BRICKWORKS | 54,4 % | 59,7 % | +5,3 |
| L3 CANYON | 84,8 % | 85,5 % | +0,7 |
| L4 CAVE | 80,9 % | 88,1 % | +7,2 |
| L5 WOODS | 59,3 % | 63,4 % | +4,1 |
| L6 CONSTRUCTION | 78,8 % | 78,6 % | −0,2 |
| L7 NIGHT FOREST | 82,5 % | 85,4 % | +2,9 |
| **Moyenne** | **71,4 %** | **74,9 %** | **+3,5** |

Six niveaux sur sept progressent. La correction est bien plus forte que prévu sur L1, L2 et L4 (+4,4 à +7,2 contre +0,8 à +2,2 annoncés), plus faible sur L3 (+0,7 contre +1,8) et légèrement négative sur L6.

Écart de luminance (clone − référence) et contraste :

| Niveau | Δ luminance v005 → v006 | Δ contraste v005 → v006 |
|---|---|---|
| L1 | 3,1 → 0,8 | 0 → 1,3 |
| L2 | −0,7 → −5,4 | −0,5 → −0,1 |
| L3 | 4,2 → −3,2 | 7,2 → 9,2 |
| L4 | 3,0 → −2,3 | 11,3 → 11,7 |
| L5 | 3,8 → 0,2 | 3,7 → 5,0 |
| L6 | 4,7 → 3,4 | 5,0 → 5,1 |
| L7 | 4,3 → 4,7 | 2,9 → 2,3 |

Cinq niveaux sur sept réduisent leur écart de luminance (le biais positif de v005, « tout est trop clair », disparaît). Le contraste se dégrade sur L3, L4 et L5 (+0,4 à +2,0 point) : c'est mécanique, le relèvement ne s'applique qu'aux noirs (facteur `k`), il écarte donc les noirs des hautes lumières intactes au lieu de les en rapprocher.

Couleur moyenne :

| Niveau | Référence | v005 | v006 |
|---|---|---|---|
| L1 | 112, 108, 105 | 115, 110, 109 | 118, 106, 103 |
| L2 | 119, 69, 55 | 120, 67, 54 | 127, 58, 42 |
| L3 | 34, 32, 23 | 40, 34, 29 | 35, 26, 19 |
| L4 | 45, 32, 27 | 44, 36, 36 | 40, 31, 27 |
| L5 | 75, 38, 24 | 64, 48, 31 | 68, 41, 27 |
| L6 | 122, 118, 117 | 129, 123, 114 | 127, 122, 111 |
| L7 | 34, 45, 24 | 34, 51, 31 | 36, 52, 26 |

- L4 : le bleu passe exactement à la valeur de la référence (27) et l'erreur de vert tombe de +4 à −1.
- L7 : le bleu se rapproche (31 → 26 pour une référence de 24), le relèvement `#100810` a bien joué son rôle.
- L2 : en revanche la saturation 1,08 éloigne la moyenne (rouge 8 trop haut, vert 11 et bleu 13 trop bas). Une similarité d'histogramme en hausse avec une moyenne qui s'écarte : la teinte globale se trompe un peu plus, mais la répartition se rapproche.
- L6 : le gain prévu était le plus faible des sept (+1,3) ; le −0,2 mesuré est de l'ordre du bruit de mesure, à confirmer avant toute nouvelle correction.

## UI / ANIMATION / AUDIO

- Sans changement. Les écarts relevés par l'outil sont inchangés et relèvent d'ailleurs de la détection, pas du HUD (voir ci-dessous).

## CRITICAL DIFFERENCES

1. **La calibration par niveau fonctionne** : +3,5 points de similarité moyenne, six niveaux sur sept en progression, sans toucher aux scènes ni aux éclairages.
2. **Mais c'est une transformation globale d'image**, appliquée après le rendu : elle ne peut pas corriger une scène dont les lumières sont fausses. L2 (59,7 %) et L5 (63,4 %) restent sous 65 % et plafonnent — le levier restant est l'éclairage de `env`, pas le post-traitement.
3. **Le contraste se dégrade sur L3, L4 et L5** (+0,4 à +2,0 point) parce que le relèvement ne touche que les noirs. Un relèvement appliqué aussi aux tons moyens serait à tester.
4. **L'allumage est détecté à 0,4 s alors que la référence est à 0,63 s sur les sept niveaux.** Un écart constant ne s'explique pas par un réglage de niveau : c'est très probablement une convention de mesure de `compare.js` (détection de flamme) contre celle de la référence (compteur SPEED). `ignitionDelay` vaut 0,28 s, valeur MESURÉE sur le compteur SPEED de la séquence 3.
5. **Le cadrage affiché par l'image contredit la télémétrie** : la tuyère mesurée par télémétrie reste à 0,4–14,8 px de la médiane de référence (563, 432) sur les sept niveaux, alors que le point chaud de flamme détecté à l'image est 23 à 85 px trop haut sur cinq d'entre eux (L6 : 85 px, L7 : 53 px), et pratiquement à la référence sur L3 et L5. Le détecteur attrape le haut de la flamme, et non la tuyère.
6. **Interface** : la boîte STYLE est décalée de 15 à 33 px sur L3, L4 et L6, la boîte TARGETS est 59 px trop large sur L2, la boîte COOLDOWN 30 px trop large sur L1. Trois éléments ne sont pas détectés du tout (TARGETS de L5, SPEED de L6, TARGETS de L7) : seuils de détection de l'outil.

## NEXT CORRECTIONS

1. **`compare.js` — cadrage** : mesurer la flamme sur le centre de masse de sa moitié basse, ou projeter la tuyère de la télémétrie sur l'image, au lieu du seul pixel le plus chaud. C'est l'écart le plus visible du rapport (L6, 85 px) et il est faux.
2. **`compare.js` — détection** : corriger les trois éléments non détectés (TARGETS de L5, SPEED de L6, TARGETS de L7) et les largeurs de boîte (STYLE sur L3/L4/L6, TARGETS sur L2, COOLDOWN sur L1) avant d'ajuster le HUD du jeu.
3. **Allumage** : trancher entre convention de mesure et retard réel. Si c'est une convention, corriger `compare.js` ; sinon, `ignitionDelay` est à revoir, et la valeur 0,28 s (MESURÉ sur le compteur SPEED) est à réconcilier avec les 0,63 s de la flamme.
4. **Timing des impacts** : L2 à 6,6 s pour 8,0 s et L3 à 11,8 s pour 13,0 s (≈ 1,1 à 1,4 s trop tôt) — allonger les routes ; L4 à 16,6 s pour 15,6 s (1,0 s trop tard) — raccourcir. L1 (−0,7 s) et L6 (−0,8 s) sont dans la même famille.
5. **Couleurs — scènes, plus post-traitement** : L2 (sat 1,08 éloigne la moyenne : 127, 58, 42 contre 119, 69, 55) et L5 (rouge 68 contre 75) plafonnent à cause de leurs éclairages, pas de leur `lift`. Reprendre `env.hemi` / `env.sun` de ces deux niveaux.
6. **Couleurs — contraste** : tester un relèvement qui remonte aussi les tons moyens sur L3, L4 et L5, seuls niveaux dont le contraste s'éloigne.
7. **Physique** : les freinages restent le principal écart — canyon 10,1 m/s d'écart quadratique (clone à 8,7 m/s à t = 10,6 s contre 29 dans la référence) et grotte 12,8 m/s. Rallonger la phase de rétro-fusées du canyon au-delà de 1,1 s, la limite de la jauge étant atteinte avant.
8. **Confirmer L6** : réenregistrer sans changement pour vérifier que le −0,2 point est du bruit avant de retoucher sa calibration.

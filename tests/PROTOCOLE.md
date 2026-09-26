# Protocole de test FIREROCKET

Le protocole est **rejouable à l'identique** : pas de temps fixe (1/30 s pour l'image, 1/240 s pour la physique),
aléatoire à graine fixe, entrées produites par le pilote automatique (mêmes commandes qu'un joueur : visée,
tir, rétro-fusées, moteur on/off). Deux exécutions de la même version donnent la même vidéo.

## Lancer

```bash
npm run record -- v002          # enregistre les 7 niveaux → recordings/v002_L<n>_<id>.mp4 + .json + recordings/v002.mp4
npm run compare -- v002         # compare à recordings/original_reference.mp4 → analysis/iterations/v002/
```

Un seul niveau : `node tools/record.js v002 3` puis `node tools/compare.js v002 3`.

Dans un navigateur, le même scénario se joue avec `index.html?test=1&level=3&autopilot=1`,
puis dans la console : `FR.harness.step(30)` (avance d'1 s), `FR.harness.telemetry()`.

## Scénarios

Chaque scénario suit la séquence correspondante de la vidéo de référence (voir `analysis/ANALYSE_REFERENCE.md`).
Le temps est celui du chrono du jeu, qui démarre au tir.

### TEST_001 — CITY (réf. 0,00–15,40 s, HUD A)
```
00:00  vue 1re personne derrière le lanceur sur trépied, toit à 40 m
00:00  tir → éjection 31 m/s, fumée blanche + étincelles
00:63  allumage du moteur
01–03  descente dans la rue entre les immeubles (PROXIMITY FLIGHT)
03–04  traversée du bâtiment B (vitres brisées)
05     traversée du bâtiment C (vitres), grue et panneau en vue
06     survol du toit bas, disque d'accroche
06–08  plongée dans le puits aux câbles, rétro-fusées
08–09  virage dans le couloir, ouverture sur le ciel
09+    impact sur l'hélicoptère noir → explosion orange, BOMB SMASH, résultats
```

### TEST_002 — BRICKWORKS (réf. 15,40–23,60 s, HUD B, 4 cibles)
```
00:00  tir depuis le toit en briques
01     fenêtre de l'étage brisée, porte de la cloison, trémie vers le rez-de-chaussée
02     char n°1 → onde cyan, "PRESS FIRE TO RESPAWN AT LAUNCHER", TARGETS 1/4
+      chars 2 (cour est), 3 (étage ouest, par la fenêtre ouest), 4 (rue ouest)
```

### TEST_003 — CANYON (réf. 23,60–36,03 s, HUD C)
```
00:00  tir sur le pont ferroviaire
01–05  tunnel à bandes de danger, graffiti
05–07  lasers rouges, passage sous le viaduc
07–09  le soldat sur le toit tire un missile
09–10  rétro-fusées, plongée dans la fosse néon → char → explosion orange
```

### TEST_004 — CAVE (réf. 36,03–48,17 s ; la vidéo commence à 0:04,52 de course)
```
00:00  tir dans la grotte ; vol sinueux entre les stalactites
fin    rétro-fusées, camion sur la plateforme blanche → explosion
```

### TEST_005 — WOODS (réf. 48,17–64,45 s, HUD B)
```
00:00  tir en forêt, passage sous la plateforme aux silos rouges
02     murs de briques de la maison 1 traversés
02–04  forêt dense, survol du toit en planches de la maison 2
04–05  fenêtre de la maison 3, char → onde cyan
```

### TEST_006 — CONSTRUCTION (réf. 64,45–79,25 s, HUD C sans SPEED)
```
00:00  tir sur la dalle en hauteur, slalom entre les piliers
02–03  rétro-fusées, flèche verte, entrée dans la trémie moteur coupé
03–04  descente de la cage d'escalier, couloir, fenêtre sur le ciel
05     hélicoptère camouflé → explosion orange
```

### TEST_007 — NIGHT FOREST (réf. 79,25–89,14 s, HUD B)
```
00:00  tir en forêt de nuit ; slalom entre les troncs
05+    maison-cible (la vidéo de référence se coupe avant l'impact)
```

## Mesures produites par tools/compare.js

| Mesure | Méthode |
|---|---|
| Différence spatiale / visuelle | planches original │ clone │ différence absolue (×2,2) à 6 instants par niveau |
| Couleurs | histogramme RVB 8×8×8, coefficient de Bhattacharyya ; couleur et luminance moyennes |
| Interface | boîtes englobantes du texte (pixels clairs bordés de sombre) comparées aux boîtes MESURÉES |
| Cadrage | point chaud de la flamme (médiane) vs référence ; position de la tuyère (télémétrie) |
| Mouvement / vitesse | courbe SPEED du clone vs lecture du compteur de la vidéo (niveaux 3 et 4) |
| Timings | allumage, vitesse d'éjection, temps d'impact vs chrono de la référence |

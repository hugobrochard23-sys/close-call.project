# FIREROCKET — Analyse de la vidéo de référence

Version : A1 (analyse initiale, avant développement) · Date : 2026-09-21
Statuts : **MESURÉ** (valeur chiffrée extraite des pixels/HUD) · **OBSERVÉ** (visible, non chiffré) · **ESTIMATION** (déduit) · **INCONNU**

Repère écran : zone de jeu 1132×637 px dans l'enregistrement (crop `1132:637:24:18`). Les positions sont données
en % de la zone de jeu, et en px pour un rendu 1920×1080 (facteur ×1,696).

---

## 0. Source et méthode

| Élément | Valeur | Statut |
|---|---|---|
| Fichier | `Desktop/ScreenRecording_09-18-2026 18-16-44_1.mov` | — |
| Capture | ReplayKit (iPad), 1180×892, ~60 fps (VFR, 5357 images), 89,14 s, H.264 | MESURÉ |
| Contenu | Page Steam du jeu **Dumbfire** (TitanGameDev) : lecteur vidéo de la bande-annonce + bande de miniatures | OBSERVÉ |
| Zone du jeu | x=24, y=18, 1132×637 (16:9) | MESURÉ |
| Éléments hors jeu | Flèches `<` `>` du lecteur Steam (t=0–3,5 s), miniatures sous la vidéo | OBSERVÉ |
| Audio | Piste AAC totalement silencieuse (−91 dB moyenne et crête) | MESURÉ |
| Vitesse de lecture | Chrono en jeu vs temps vidéo = 1:1 (séq. 3 : 0:00.35 @ 24,0 s → 0:12.93 @ 36,6 s) → pas de ralenti/accéléré de montage | MESURÉ |

Méthode : extraction ffmpeg (1, 4, 10 et 24 img/s), planches-contacts, recadrages pleine résolution, zooms ×2,
mesures automatiques de boîtes englobantes (texte HUD), détection du réticule par contraste local, suivi du
point chaud de la flamme (seuil jaune) sur 325 images, lecture des compteurs SPEED/STYLE/chrono.

Information externe (page Steam, texte uniquement) : missile qui ne peut pas s'arrêter, pilotage **relatif à la
caméra**, capacités annoncées : grappin, super boost, ralenti, parachute de freinage, rétro-fusées, glissade ;
éditeur de niveaux ; clavier + manette.

---

## 1. Structure (niveau 1)

La vidéo est une bande-annonce montée : **7 séquences de jeu**, séparées par des coupes franches (aucun fondu,
aucun écran titre, aucun menu, aucun écran de victoire/défaite, aucune cinématique).

| # | Début–fin (s) | Durée | Environnement | Mode / HUD | Début | Fin |
|---|---|---|---|---|---|---|
| 1 | 0,00–15,40 | 15,4 s | Ville de jour : rues d'immeubles à fenêtres bleues, traversée d'un bâtiment, grue jaune, panneau publicitaire, puits vertical rempli de câbles, ouverture vers le ciel | HUD « A » : STYLE + THRUST/COOLDOWN | Tir depuis un lanceur sur trépied (toit) | Impact sur un hélicoptère → explosion, « BOMB SMASH! (67 M/S) +504 » |
| 2 | 15,40–23,60 | 8,2 s | Bâtiment en briques la nuit : toit, fenêtre, pièces, échelle, sol bleu, char | HUD « B » : TARGETS 0/4 + SCORE | Tir depuis un lance-roquettes à l'épaule | Impact sur un char → onde cyan, TARGETS 1/4, « PRESS FIRE TO RESPAWN AT LAUNCHER » |
| 3 | 23,60–36,03 | 12,4 s | Canyon au coucher de soleil : voie ferrée sur pont, tunnel à bandes de danger, graffiti « NO MISSILES », lasers rouges, viaduc, immeuble sombre, soldat ennemi, fosse néon | HUD « C » : STYLE + TIME:∞ + SPEED | Tir (lanceur à l'épaule) | Impact sur un char dans la fosse → explosion orange |
| 4 | 36,03–48,17 | 12,1 s | Grotte sombre (stalactites, parois brun-rouge) | HUD « C » | Coupe en cours de vol (chrono 0:04.52) | Impact sur un camion/générateur posé sur une plateforme blanche |
| 5 | 48,17–64,45 | 16,3 s | Forêt sombre + maisons en briques, caisses en planches, toit en bois incliné, pièce intérieure avec char | HUD « B » (chrono + SCORE, sans TARGETS) | Tir (lanceur à l'épaule) | Impact sur un char → onde cyan |
| 6 | 64,45–79,25 | 14,8 s | Chantier en béton gris sous ciel bleu : piliers, grue, fosse, cage d'escalier, fenêtre vers la ville | HUD « C » | Tir (lanceur à l'épaule) | Impact sur un hélicoptère camouflé → explosion, « SPEED BONUS … » |
| 7 | 79,25–89,14 | 9,9 s | Forêt de nuit, ciel noir étoilé, herbe voxel, rochers, maison | HUD « B » (chrono + SCORE) | Tir (lanceur à l'épaule) | **Vidéo coupée pendant le vol** autour de la maison-cible |

---

## 2. Image (niveau 2)

### 2.1 Cadrage et caméra
- Ratio 16:9, aucune barre (plein cadre). MESURÉ
- Caméra à la 3e personne derrière et au-dessus de la roquette ; la roquette occupe le bas-centre. OBSERVÉ
- **Réticule** `×` gris clair, fin (~7 px), en **x = 50,0 %, y = 40,2 %** (961, 434 en 1080p). MESURÉ (5 images, ±1 %)
- **Tuyère/début de flamme** (médiane sur 196 images) : **x = 49,7 %, y = 67,8 %** ; p10–p90 : x 43,9–56,7 %, y 56,7–73,6 %. MESURÉ
- Nez de la roquette généralement entre y ≈ 55 et 62 %, orienté vers le réticule. OBSERVÉ
- Perspective marquée (grand angle). FOV vertical ≈ 70° — ESTIMATION

### 2.2 Post-traitement (présent dans les 7 séquences, intensité variable)
- Vignettage fort (bords assombris, surtout séq. 1 et 6). OBSERVÉ
- Aberration chromatique sur les bords (franges rouge/bleu, visibles séq. 5 et 7). OBSERVÉ
- **Tramage / halftone** (motif de points) dans les ombres et dégradés (très visible séq. 1). OBSERVÉ
- Bloom / halo autour des zones claires (ouvertures vers le ciel, flamme). OBSERVÉ
- Éclairage ponctuel orange émis par la flamme sur les murs proches (murs qui rougeoient au passage). OBSERVÉ
- Teinte rose/saumon dans les zones éclairées (séq. 1). OBSERVÉ
- Grille fine sur le sol et le terrain (textures quadrillées : béton, collines vertes, herbe). OBSERVÉ
- Textures pixel-art basse résolution (briques, planches, béton) avec filtrage « nearest ». OBSERVÉ

### 2.3 Palettes mesurées (moyenne 7×7 px)

| Séquence | Élément | Couleur |
|---|---|---|
| 6 Chantier | Ciel haut / ciel bas | `#6283a2` / `#bcc6d2` |
| 6 | Tours lointaines (silhouettes claires) | `#a9b8c2` |
| 6 | Sol / piliers béton | `#68645f` / `#6f6b68` |
| 3 Canyon | Ciel couchant | `#853415` |
| 3 | Collines vertes / sombres | `#132d10` / `#15160e` |
| 3 | Rails | `#9c8184` |
| 7 Forêt nuit | Ciel | `#000000` (+ étoiles blanches) |
| 7 | Herbe / ligne de grille | `#204918` / `#335a23` |
| 7 | Rocher | `#404958` |
| 2 Briques | Brique / joint éclairé | `#9e1b15` / `#d56229` |
| 1 Ville | Mur / vitre | `#8c8887` / `#20808e` |
| 4 Grotte | Paroi / sol | `#332826` / `#322a28` |
| HUD | Jauge jaune | `#fdfd02` |

---

## 3. Objets (niveau 3)

| Objet | Type | Observations | Statut |
|---|---|---|---|
| Roquette (joueur) | Entité joueur | Corps cylindrique gris, nez ogival avec point rouge, collier jaune (bande), 4 ailerons à l'arrière. Rapport longueur/diamètre ≈ 6:1 | OBSERVÉ |
| Flamme principale | Particules | Gros cubes voxel sans lumière propre : jaune vif près de la tuyère → orange → rouge, décroissance en taille, traînée courbe (reste dans l'espace monde) | OBSERVÉ |
| Fumée de lancement | Particules | Cubes blancs de grande taille + étincelles carrées jaunes, ~0,6 s | MESURÉ (durée) |
| Traînée de fumée blanche | Particules | Avant allumage du moteur, et derrière le missile ennemi | OBSERVÉ |
| Rétro-fusées | Particules | Petites flammes orange sortant à l'avant/sur les côtés de la roquette ; freinage fort | OBSERVÉ |
| Grappin | Corde | Ligne noire fine ; au tir, ligne ondulée ; s'accroche à un point (disque-cible rouge/blanc/orange ou façade) ; la roquette tourne autour ; moteur coupé pendant le balancement | OBSERVÉ |
| Disque d'accroche | Décor interactif | Disque à anneaux concentriques rouge/blanc/orange sur bord de toit (séq. 1) | OBSERVÉ |
| Jauge de capacité | UI | Barre jaune sur fond gris sous la roquette, se vide pendant l'usage (grappin, rétro-fusées) | MESURÉ (position) |
| Lanceur fixe | Décor | Tube noir sur trépied à fente rouge (séq. 1) | OBSERVÉ |
| Lance-roquettes à l'épaule | Vue 1re personne | Tube gris/noir tenu en bas au centre (séq. 2, 3, 5, 6, 7) | OBSERVÉ |
| Char | Cible / ennemi | Vert foncé, tourelle et canon qui **suivent la roquette** ; « ! » rouge au-dessus quand il détecte ; point rouge (marqueur) | OBSERVÉ |
| Hélicoptère noir | Cible | Stationnaire au-delà d'une ouverture (séq. 1), rotors en mouvement | OBSERVÉ |
| Hélicoptère camouflé | Cible | Type hélicoptère d'attaque, camouflage vert/brun, se déplace latéralement lentement (séq. 6) | OBSERVÉ |
| Soldat | Ennemi | Silhouette sur un toit avec « ! » rouge, **tire un missile** à fumée blanche vers la roquette (séq. 3) | OBSERVÉ |
| Missile ennemi | Projectile | Petit, traînée blanche, passe près de la roquette | OBSERVÉ |
| Camion / générateur | Cible | Sur une plateforme blanche entourée de garde-corps (séq. 4) | OBSERVÉ |
| Maison | Cible | Petite maison, murs gris, toit brun, point rouge (séq. 7) | OBSERVÉ |
| Vitres | Destructible | Se brisent en cubes translucides colorés au passage | OBSERVÉ |
| Murs en briques fins | Destructible | Explosent en cubes (briques) au passage (séq. 5) | OBSERVÉ |
| Câbles | Obstacles | Lignes noires tendues entre façades (séq. 1) | OBSERVÉ (collision INCONNU) |
| Poutres en I | Décor | Pièces sombres en forme d'haltère/I dans le puits (séq. 1) | OBSERVÉ |
| Lasers rouges | Obstacles ? | Faisceaux rouges horizontaux traversant le canyon (séq. 3) | OBSERVÉ (effet INCONNU) |
| Flèche verte | UI monde | Grande flèche verte vers le bas indiquant le trou à prendre (séq. 6) | OBSERVÉ |
| Panneau publicitaire | Décor | Logo du jeu original + « WISHLIST ON STEAM » (séq. 1) | OBSERVÉ |
| Graffiti « NO MISSILES » | Décor | Sur un mur de tunnel (séq. 3) | OBSERVÉ |
| Grue jaune | Décor | Grue à tour en treillis (séq. 1, 6) | OBSERVÉ |
| Tours lointaines | Décor | Parallélépipèdes blancs/clairs à l'horizon (skyline stylisée) | OBSERVÉ |
| Arbres | Décor | Troncs voxel bruns, forêt dense (séq. 5, 7) | OBSERVÉ |
| Caisses en planches | Décor | Blocs à texture de planches orange (séq. 5) | OBSERVÉ |
| Étoiles | Décor | Points blancs dans le ciel noir (séq. 7) | OBSERVÉ |
| Marqueur de cible hors champ | UI | Point rouge collé au bord de l'écran (séq. 3, 4) | ESTIMATION |

---

## 4. Mouvements et physique

### 4.1 Vitesse (compteur SPEED du HUD, en m/s d'après « BOMB SMASH! (67 M/S) »)

Séquence 3, lancement (chrono → vitesse) : 0:00.03→31 · 0:00.13→31 · 0:00.23→31 · 0:00.33→35 · 0:00.43→39 ·
0:00.53→44 · 0:00.63→48 · 0:00.73→52 · 0:00.82→55 · 0:00.92→55 · 0:01.03→55. MESURÉ

Séquence 3, vol (pas 0,25 s) : 37, 45, 55, 55, 57, 61, 66, 71, 73, 72, 71, 74, 79, 82, 81, 77, 73, 73, 72, 73,
79, 84, 85, 83, 83, 86, 87, 86, 83, 79, 76, 75, 73, 72, 72, 67, 58, 52, 43, 39, 34, 29, 26, 28, 32, 33, 34, 37,
40, 42, 47, 50, 54, 58, 63, 66 → impact → 4. MESURÉ

Séquence 4, rétro-fusées : 75 → 60 → 48 → 44 → 39 → 39 → 33 → 27 (pas 0,25 s). Puis moteur : 27 → 30 → 37 → 48 → 56. MESURÉ

| Grandeur | Valeur | Statut |
|---|---|---|
| Vitesse d'éjection au tir | 31 m/s, constante ~0,3 s | MESURÉ |
| Accélération moteur au départ | ≈ 45–48 m/s² (31→55 en 0,5 s) ; cohérent avec « THRUST: 45 » | MESURÉ / ESTIMATION |
| Plage de vitesse en vol | 26–87 m/s | MESURÉ |
| Réaccélération en vol | ≈ 20–25 m/s² | MESURÉ |
| Freinage rétro-fusées | ≈ −60 m/s² au début, puis ≈ −20 m/s² | MESURÉ |
| Perte de vitesse en virage serré/montée | 72 → 26 en ~2 s (moteur allumé) | MESURÉ |
| Moteur coupé | Vitesse conservée en gros, augmente en piqué (séq. 4 : 52→68 sans flamme) | MESURÉ |
| Gravité | ≈ 9,8 m/s² | ESTIMATION |
| Traînée | Quadratique, k ≈ 0,015 (45 m/s² ⇔ ~55 m/s en palier) | ESTIMATION |
| Rotation (réorientation vers le réticule) | Rapide mais pas instantanée, délai ≈ 0,1–0,25 s | ESTIMATION |
| Facteurs G affichés | 3,9 G à 4,7 G lors des virages | MESURÉ (texte) |
| Échelle | Roquette ≈ 1,2 m de long | ESTIMATION |

### 4.2 Contacts et collisions
- Traverse vitres et murs de briques fins (destruction en cubes). OBSERVÉ
- Glisse sur un toit en bois et sur un sol en béton sans exploser (« GROUND SKIM »). OBSERVÉ
- Impact sur une cible = explosion + arrêt (vitesse → 4). MESURÉ
- Collision frontale avec un mur solide : **jamais montrée**. INCONNU
- Collision avec câbles, lasers, missile ennemi : INCONNU

---

## 5. Timings

### 5.1 Lancement (séq. 7, 24 img/s ; chrono du jeu)
| t chrono | Événement | Statut |
|---|---|---|
| 0:00,00 | Vue 1re personne du lance-roquettes, anneau blanc (flash) à la bouche | MESURÉ |
| 0:00,03–0:00,13 | Explosion de cubes blancs + étincelles jaunes carrées | MESURÉ |
| 0:00,13–0:00,35 | Gros cubes de fumée qui passent devant la caméra (la caméra avance) | MESURÉ |
| 0:00,35–0:00,58 | Roquette visible devant, traînée blanche, pas de flamme | MESURÉ |
| 0:00,63 | Allumage du moteur (flamme jaune/orange) | MESURÉ |
| ~0:00,90 | Caméra de poursuite stabilisée | ESTIMATION |
Le chrono démarre au tir. Séq. 1 : même déroulé (flash ≈ 0,17 s après le début, flamme ≈ 0,7 s).

### 5.2 Messages de style
- Pendant l'action : compteur en direct, ex. « PROXIMITY 11 x1,1 » (valeur + multiplicateur jaune). MESURÉ
- À la fin : « PROXIMITY FLIGHT! +13 ». Durée d'affichage ≈ 1,3 s (séq. 1) à 2,6 s (séq. 6), puis montée ≈ 7 % de la hauteur et fondu ≈ 0,3 s. MESURÉ
- Empilement vertical de 1 à 5 lignes, interligne ≈ 3 % de la hauteur, zone x 59–97 %, y 38–65 %. MESURÉ
- Le STYLE du HUD = somme des gains finalisés (13 + 290 = 303 ; 304 + 142 = 446 ; 450 + 504 = 954). MESURÉ

### 5.3 Impact sur une cible
- Hélicoptère (séq. 1) : t+0 grands quads orange/rouges + traits jaunes ; t+0,4 s cubes gris/noirs projetés en étoile, fumée grise ; texte vert « BOMB SMASH! (67 M/S) +504 » ; ≥ 0,9 s avant la coupe. MESURÉ
- Char (séq. 2, 5) : flash cyan/blanc 0,1–0,2 s, onde de cubes cyan, puis explosion blanche en étoile ; texte centré « PRESS FIRE TO RESPAWN AT LAUNCHER » ; TARGETS passe de 0/4 à 1/4. MESURÉ
- Char (séq. 3) et camion (séq. 4) : quads orange + cubes sombres, traits jaunes, vitesse 4. MESURÉ

### 5.4 Grappin
- Séq. 1 (t=3,4 s) : tir en ligne ondulée → accroche → balancement ≈ 0,7 s moteur coupé → lâcher → rallumage ≈ 0,3 s après. MESURÉ
- Jauge : pleine au déclenchement, perd ≈ 10–50 % par utilisation, disparaît après ≈ 1,5 s d'inactivité. MESURÉ / ESTIMATION

---

## 6. Caméra
| Aspect | Observation | Statut |
|---|---|---|
| Type | 3e personne, poursuite, derrière et au-dessus | OBSERVÉ |
| Visée | Réticule fixe à 40,2 % de hauteur ; la roquette s'oriente vers la direction visée | MESURÉ / ESTIMATION |
| Pilotage | Relatif à la caméra (confirmé par la page Steam) | OBSERVÉ (externe) |
| Retard | La roquette dérive dans l'écran (x 44–57 %, y 57–74 %) : ressort/amortissement | MESURÉ |
| Roulis | La caméra tourne avec le vol (horizon incliné, vues à l'envers dans le puits) | OBSERVÉ |
| Distance / hauteur | ≈ 3,5 m derrière, ≈ 1 m au-dessus | ESTIMATION |
| Départ | Démarre à la position du lanceur, rattrape la roquette en ≈ 0,5 s | MESURÉ |
| Secousses | Pas de tremblement franc ; éclats de particules devant l'objectif lors des explosions | OBSERVÉ |
| Impact | Caméra figée sur l'explosion (pas de suivi des débris) | OBSERVÉ |

---

## 7. IA
| Ennemi | Comportement | Statut |
|---|---|---|
| Char | Tourelle + canon orientés vers la roquette ; « ! » rouge dès ≈ 20–30 m ; tir : INCONNU | OBSERVÉ / ESTIMATION |
| Soldat | « ! » rouge, tire un missile vers la roquette ; guidage : INCONNU | OBSERVÉ |
| Hélicoptère | Stationnaire ou dérive latérale lente ; pas d'attaque visible | OBSERVÉ |
| Réaction après perte de cible, patrouille, fuite | Jamais montrées | INCONNU |

---

## 8. Interface (HUD) — positions MESURÉES

| Élément | Contenu | Position (zone de jeu) | 1080p | Couleur |
|---|---|---|---|---|
| Bloc raccourcis (HUD A) | `BINDS:F1` / `SETTINGS:TAB` / `MENU:ESC` | x 1,4–11,5 %, y 2,4–9,6 %, 3 lignes | x 24–220, y 26–103 | Blanc |
| Bloc raccourcis (HUD C) | `RESET:R` / `MENU:ESC` / `SETTINGS:TAB` | x 1,2–9,5 %, y 2,0–8,2 % | x 24–181, y 22–88 | Blanc |
| Chrono | `0:08,27` (virgule décimale) | centré x 50 %, y 6,8–9,4 % | y 73–102 | Blanc |
| STYLE | `STYLE 1.315` (point des milliers) | centré x 50 %, y 11,6–14,8 % | y 125–159 | Blanc, plus grand |
| TARGETS (HUD B) | `TARGETS 0/4` | centré x 50 %, y 13,0–15,2 % | y 141–165 | Blanc |
| Haut-droite (A) | `THRUST:45` | fin x 96,0 %, y 7,4–9,3 % | fin x 1843 | Blanc |
| Haut-droite (A) | `COOLDOWN...` | fin x 97 %, y 12,7–14,9 % | — | Jaune `#fdfd02` |
| Haut-droite (B) | `SCORE` | x 85,7–93,0 %, y 6,8–8,9 % | x 1645–1786 | Blanc |
| Haut-droite (C) | `TIME:∞` | x 82,7–93,4 %, y 6,9–9,4 % | x 1588–1793 | Blanc |
| Bas-droite (C) | `SPEED:74` | x 82,0–96,3 %, y 90,9–93,9 % | x 1574–1849, y 982–1014 | Blanc |
| Jauge capacité | barre jaune sur gris | x 41,5–58,7 %, y 89,5–91,2 % (≈ 17 % × 1,8 %) | x 797–1128, y 967–986 | `#fdfd02` / gris |
| Réticule | `×` | x 50,0 %, y 40,2 % | 961, 434 | Gris clair |
| Messages de style | pile de lignes | x 59–97 %, y 38–65 % | — | Blanc ; multiplicateur jaune ; G-force orange/rouge ; BOMB SMASH vert ; SPEED BONUS bleu |
| Message central | `PRESS FIRE TO RESPAWN AT LAUNCHER` | centré, y ≈ 58 % | — | Noir à contour clair |
| Alerte ennemi | `!` rouge au-dessus de l'ennemi | espace monde | — | Rouge |

Typographie : police pixel (bitmap) à chasse quasi fixe, capitales, contour/ombre sombre ; hauteur de capitale
≈ 13 px (chrono, 1080p ≈ 22 px), ≈ 16–19 px (STYLE, 1080p ≈ 30 px), ≈ 8 px (raccourcis, 1080p ≈ 14 px).
Les messages de style sont en italique (inclinaison ≈ 15°). OBSERVÉ / MESURÉ

Trois variantes du HUD coexistent (versions différentes du jeu dans la bande-annonce) :
- **A** (séq. 1) : raccourcis BINDS/SETTINGS/MENU, chrono + STYLE, THRUST:45 + COOLDOWN...
- **B** (séq. 2, 5, 7) : chrono (+ TARGETS n/4 en séq. 2), SCORE ; pas de raccourcis
- **C** (séq. 3, 4, 6) : raccourcis RESET/MENU/SETTINGS, chrono + STYLE, TIME:∞, SPEED:N

---

## 9. Audio
Piste muette (−91 dB). Musique, bruitages, ambiance, voix, spatialisation : **tout est INCONNU**.

---

## 10. États de jeu observés
`TIR (1re personne)` → `VOL` → `IMPACT CIBLE` → (`PRESS FIRE TO RESPAWN AT LAUNCHER` → `TIR` en mode multi-cibles).
Non observés : menu principal, sélection de niveau, pause, réglages, défaite/crash, écran de résultats. INCONNU

---

## 11. Synthèse

### Éléments MESURÉS (réutilisables tels quels comme paramètres)
Crop et ratio · synchronisation temps réel du chrono · vitesse d'éjection 31 m/s · accélération au départ ≈ 45–48 m/s² ·
plage de vitesse 26–87 m/s · courbes de vitesse séq. 3 et 4 · freinage des rétro-fusées · chronologie du lancement
(flash 0,03 s, fumée jusqu'à 0,35 s, allumage 0,63 s) · position du réticule (50 %, 40,2 %) · distribution de la position
de la roquette à l'écran · positions et tailles de tous les éléments du HUD · couleurs de référence · formats numériques
(`0:04,62`, `1.315`) · barème STYLE (additivité, COLD IMPACT = base 100/200 × multiplicateur, BOMB SMASH ≈ 7,5 × vitesse) ·
durée des messages · séquence d'explosion.

### Éléments ESTIMÉS
Gravité · coefficient de traînée · vitesse de rotation · distance/hauteur/FOV de la caméra · échelle du monde · rayon de
détection des ennemis · règles exactes des bonus (PROXIMITY, MANOEUVRE ≈ 80 × (G − 2,95), GROUND SKIM) · recharge de la
jauge · marqueur de cible hors champ.

### Éléments INCONNUS
Contrôles réels · comportement en cas de crash · collisions avec câbles/lasers/missile ennemi · si les ennemis peuvent
détruire la roquette · capacités non montrées (super boost, ralenti, parachute) · menus, pause, réglages, écran de résultats ·
tout l'audio · géométrie des niveaux hors champ · trajectoires exactes et entrées du joueur.

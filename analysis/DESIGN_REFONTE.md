# Refonte visuelle (v028)

Faite le 26/09/2026 à la demande d'Hugo, d'abord dans une copie à part (« cold impact design »), puis intégrée à `main`
après validation (v028). Base : v027 (commit 95b6a19). Étapes : commits « Design 1 » à « Design 8 ».
Outils d'inspection visuelle (développement, jamais chargés par le jeu) : `tools/devhelpers.js` — dans la console d'une page
`?test=1` : `await import('/tools/devhelpers.js')`, puis `__multi`, `__side`, `__look`, `__orbit`, `__grid`.

## Ce qui a changé

**Particules (src/rendering/particles.js)** — transparence par particule, pools additifs (flamme, étincelles, éclairs),
effacement près de la caméra (la fumée et la flamme ne bouchent plus la vue), vent commun, turbulence, poussée d'Archimède.
Hasard visuel sur un générateur à part (`U.fx`) : le gameplay ne dépend plus du nombre de particules affichées.

**Propulsion** — panache attaché à la tuyère (vitesse d'éjection relative, ≈ 1 m, au lieu d'une traînée de 7 m que la caméra
traversait), 3 couches (cœur blanc, corps jaune-orange, enveloppe rouge), étincelles, fumée en volume qui reste dans le monde
et dérive, bouffée à l'allumage et à la coupure, jet de tuyère (disque incandescent + 2 cônes lumineux), lumière qui vacille
et se réchauffe, micro-vibration du corps. Tir du lanceur : plus de gros cubes blancs devant la caméra (souffle arrière hors champ).

**Explosions** — 9 étapes : éclair, noyau blanc, boule de feu qui monte, étincelles et traits, onde de choc, fumée noire qui
s'élève et dérive, débris dont certains brûlent et fument, colonne résiduelle de quelques secondes, trace de brûlure au sol.
Taille, fumée, débris, durée et direction tirées au hasard à chaque explosion. Lumière qui passe du blanc à l'orange.

**Épaves** — char calciné qui brûle, tourelle projetée qui retombe à côté ; hélicoptère qui tombe en vrille avec traînée de
fumée, explosion au sol puis épave en feu ; camion et maison (effondrée) calcinés.

**Chars** — modèle détaillé (chenilles profilées, 6 galets, barbotin, poulie, garde-boue, jupes, glacis incliné, grilles,
échappements, phares, coffres, tourelle à pans coupés, tourelleau, épiscopes, mitrailleuse, antenne, lance-fumigènes, panier,
canon avec évacuateur et frein de bouche), 3 teintes, posé exactement sur le sol. Tourelle à inertie (vitesse et accélération
bornées), hausse limitée, balayage lent au repos, vibration de moteur, fumées d'échappement. Tir : recul du tube, bascule de la
caisse, éclair de bouche + lumière + fumée + poussière, secousse de caméra si la roquette est proche, son de canon.

**Hélicoptères** — fuselage profilé, verrière, capot et échappements, 4 pales + disque flou, poutre effilée, dérive, rotor
anticouple, patins, boule optronique, feux (navigation, gyrophare, feu de queue qui clignotent), paniers de roquettes (camouflé).
Vol : assiette calculée à partir de la vitesse et de l'accélération réelles (nez qui pique, cabrage au freinage, inclinaison en
virage), cap qui tourne avec inertie vers la fuite ou vers la roquette, flottement lent, poussière soulevée près du sol.

**Autres modèles** — camion (cabine vitrée, bâche à arceaux, générateur), maison (pignons fermés, faîtage, fenêtres éclairées,
porte, marche), soldat, missile ennemi (bande rouge, ailettes, canards, tuyère lumineuse, rotation), roquette (joints, canards),
lance-roquettes à l'épaule et sur trépied.

**Décor** — façades sans fenêtre coupée par un angle (nombre entier de travées et d'étages par face), motif de 4 × 4 travées
variées (stores, rideaux, pièces éclairées ou sombres, climatiseurs, meneaux, appuis), rez-de-chaussée à vitrines et enseignes,
toits avec acrotère, climatiseurs, édicule, château d'eau, antenne à feu rouge (jamais sur un toit survolé par un parcours ni
sur le toit du lanceur), forêts de conifères (houppiers en 3 étages, troncs posés sur le sol réel), touffes d'herbe et rochers à
facettes posés sur le sol, nuages voxel les jours de beau temps, matériaux détaillés (béton banché, asphalte, métal riveté,
écorce, tuiles).

**Son** — réacteur en 5 couches synthétisées (bourdonnement grave, grondement de flammes, souffle de poussée, sifflement d'air,
crépitement) liées à la vitesse et à l'accélération ; allumage et coupure ; rotor d'hélicoptère, moteur de char, sifflement des
missiles ennemis selon la distance ; atténuation des sons ponctuels avec la distance ; tirs de char et d'hélicoptère.

**Interface** — crochets rouges autour des missiles ennemis proches à l'écran, flèche au bord de l'écran sinon.

## Vérifications

- Pilote automatique : 9 niveaux + AUTOMAP facile / moyen / difficile terminés, aucune erreur JavaScript.
- Difficulté : sur 32 cartes AUTOMAP (moyen + difficile), taux de touche des tirs ennemis 26 % (refonte) contre 23 % (actuel),
  dans le bruit (l'actuel varie de 16 à 25 % selon les séries). Le missile ennemi part visuellement du canon mais sa trajectoire
  de gameplay est inchangée.
- Performance : pièces fixes des modèles fusionnées (un char : ~80 → ~6 appels de dessin). Appels de dessin par image :
  ville 117 (actuel 110), briques 144 (170), forêt de nuit 55 (66), NIGHT CANYON 74 (97), TRENCH RUN 105 (140). Temps par image
  sur Mac égal ou inférieur à l'actuel.
- Son : rendu hors ligne sans valeur invalide ; réacteur ≈ −16 dB, crête 0,68 moteur + explosion (limiteur).

## Limites connues

- Les triangles augmentent (forêt de nuit ≈ 222 000 avec les ombres, contre 86 000) : sans effet mesurable sur Mac, à vérifier
  sur un vieux téléphone.
- iPhone : pas de vibration possible depuis le web (inchangé).

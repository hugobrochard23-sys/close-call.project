# Refonte mobile v034 — audit, conception, vérification

Objectif : que le joueur pense « je veux lancer la fusée », puis « encore une partie ». Accueil → lancement → vol →
récompenses → progression → retour au lanceur → nouveau lancement. Inspiration UX : les grands jeux mobiles accessibles
(action principale évidente, environnement vivant, très peu de boutons) — sans copier leur interface ni leurs assets.

## 1. Audit de départ (v033)

| Domaine | Constat |
|---|---|
| Architecture | Scripts classiques (`index.html`), tout le HUD et les menus dessinés dans un canvas 2D avec une police pixel ; moteur Three.js r149 ; boucle à pas fixe 1/240 s ; états `BOOT → MENU → AIM → FLIGHT → …`. Solide et testable (banc `?test=1`, pilote automatique) : **conservé**. |
| Accueil | 3 gros boutons (CLASSIQUE, DÉFI, BOUTIQUE) sur une vue en orbite d'une ville : lisible mais froid, et il faut *lire* pour comprendre. Aucun lien avec l'objet du jeu. |
| Mise à feu | Vue à la première personne (tube à l'épaule), tir au toucher. Correct mais anonyme : pas de charge, pas d'allumage, pas de moment mémorable. |
| HUD CLASSIQUE | Distance, record, palier, jauge d'essence avec libellé chiffré (« FUEL 17,86 S »), messages de STYLE en anglais, chrono, vitesse, rappel de touches clavier sur ordinateur. Beaucoup d'informations pour un jeu à une main. |
| Progression | Un seul record de distance. Rien à gagner en perdant. |
| Fin de partie | Texte sec (distance, palier, cause), REJOUER / MENU. |
| Publicités | Interstitielle tous les 3 niveaux (n'importe quand après le 2e), bannière en bas du menu, une récompensée « gain doublé » sans objet (plus d'argent gagné depuis v031). |
| Boost | Très bon (appui long, vibration continue, traînées jaunes) mais peu de « coup » à l'allumage ; la caméra zoomait *en avant*, ce qui réduit la sensation de vitesse. |
| Profondeur | Aucune indication de hauteur au sol autre que la perspective. |
| Mobile | Menus plein écran ≥ 44 pt, qualité AUTO/HIGH/MEDIUM/LOW, plafond 60 im/s, pause en arrière-plan (v030) : **conservés**. |

Mécaniques déjà satisfaisantes, gardées telles quelles : le vol (physique de la roquette), le frôlement qui recharge l'essence,
la traversée des cibles, le boost au doigt (appui long, relance en 0,6 s), les obstacles générés, les chars et missiles.

## 2. Conception

### 2.1 Le lanceur EST le bouton « jouer »
L'accueil du mode CLASSIQUE est le pas de tir : la roquette posée sur un rail incliné, sur une plate-forme au-dessus de la rue
qu'elle va parcourir, dans une baie sombre à bandes lumineuses. Elle respire (léger flottement), la vapeur s'échappe des évents, les
diodes du rail courent, les feux clignotent en ambre, la caméra dérive lentement. Un anneau pointillé pulse autour de la roquette
et — pour les 3 premiers vols seulement — un doigt blanc « appuie » dessous avec « TOUCHE POUR LANCER ». **Aucun bouton JOUER** :
un toucher n'importe où hors des icônes lance.

Le couloir est **déjà construit derrière** la scène : entre le toucher et le vol il n'y a aucun chargement.

### 2.2 La séquence de lancement (0,9 s avant le contrôle)

| t | Ce qui se passe | Retour |
|---|---|---|
| 0,00 | Toucher (dès que le doigt *touche*, pas au relâchement) | vibration ; clac des verrous ; sirène de charge qui monte ; feux ambre → rouge rapide ; jets de vapeur |
| 0,00 – 0,90 | Charge | la roquette tremble de plus en plus fort ; flamme de veille qui grossit ; halo derrière la roquette qui vire du cyan à l'orange ; diodes du rail en chenillard accéléré ; étincelles à la tuyère ; déflecteur qui rougeoie ; caméra qui avance (push-in −16 %) et tremble ; motif de vibrations qui se rapprochent |
| 0,90 | Allumage | flash + onde de choc ; nuage de vapeur et boules de feu vers l'arrière ; brides qui s'ouvrent ; détonation sourde ; grosse vibration ; la roquette quitte le rail à 14 m/s et **accélère à vue d'œil** (poussée gratuite 1 s) |
| 0,90 – 1,95 | Travelling | la caméra regarde d'abord la roquette partir puis glisse derrière elle ; l'angle de vue passe de 42° à celui du jeu ; l'interface de vol apparaît |

Le joueur a la main dès l'allumage. Un toucher dans les 1,8 s suivantes déclenche le boost immédiatement (pas besoin d'attendre l'appui
long de 0,4 s).

**Pourquoi cette séquence.** Une charge courte et *croissante* (tremblement, sirène, rythme des feux, vibrations) crée une tension que
le joueur apprend à anticiper ; l'allumage est un pic net (flash, son grave, gros nuage) ; le travelling « je vois ma fusée partir » puis
« je suis derrière elle » donne le sentiment d'avoir réellement lancé quelque chose plutôt que d'avoir changé d'écran. Elle dure
0,9 s : assez pour être un rituel, trop peu pour devenir un délai à la 50e partie.

### 2.3 Boucle
`Accueil (lanceur) → toucher → charge → allumage → vol → crash → [offre de continuer, pub récompensée] → récompenses (score,
XP, niveau, missions) → REJOUER → la nouvelle roquette descend dans le rail (0,75 s) → toucher → …`
REJOUER n'affiche jamais un menu : il ramène au lanceur (fondu de 0,2 s le temps de bâtir un nouveau couloir). Un toucher pendant
le rechargement est mémorisé : il lance dès que le rail est prêt.

### 2.4 Progression (compréhensible en 5 secondes)
- **Score** = mètres + points de bonus (frôlements, cibles, éclats, étoiles, ×2).
- **XP** = score ÷ 10 + missions terminées + primes (premier vol, record). Chaque vol en rapporte, même raté.
- **Niveaux** : 80 XP pour passer du 1 au 2, +40 par niveau ensuite. Rang affiché (RECRUE, PILOTE, AS, …).
- **Décors** : chaque niveau ouvre un décor (ville, désert, montagne, industrie, canyon, ville de nuit).
- **3 missions** en cours (distance, score, temps, cibles, cibles en un vol, boosts, éclats, frôlements, étoiles), renouvelées à la fin
  du vol, leur difficulté suit le niveau ; la plus avancée est visible à l'accueil et pendant le vol.

### 2.5 Éclats et bonus
Traînées de cristaux cyan le long de la trajectoire **sûre** du couloir (celle du pilote automatique : elle passe par les trous,
sous les poutres, vers les cibles) : les suivre = bien voler sans lire. Ramassage généreux (rayon 1,7 m), son qui monte de note en
note quand on enchaîne, étincelles, compteur qui saute. Rares : **étoile dorée** (+150 et 3 s d'essence), **×2** (12 s).

### 2.6 Interface en vol : « ai-je besoin de voir ça d'une main ? »
Gardé : **score** (gros, haut centre), **jauge d'essence** juste dessous (10 segments de 2 s, icône de flamme, clignote sous 25 %),
record (petit ; devient « NOUVEAU RECORD » quand on le bat), journal de 3 lignes (« FROLE +12 »), éclats ramassés et ×2 (haut gauche),
mission suivie (bas gauche), alertes (missile, altitude).
Supprimé : chrono (infini), vitesse (on la ressent), essence en chiffres (« 17,86 »), STYLE (son effet — recharger l'essence — se lit
sur la jauge ; ses messages deviennent du bonus lisible), palier écrit en permanence, rappel des touches (bureau), libellés anglais.

### 2.7 Boost, signature de COLD IMPACT
À l'allumage du boost : coup d'angle de vue (+10 % qui retombe en 0,35 s) puis champ **élargi** (les murs filent) au lieu de l'ancien
zoom avant, recul de la caméra (0,55 m), secousse, onde de choc et gerbe d'étincelles à la tuyère, flash de lumière, son
« whoosh + coup de grave », vibration d'attaque plus nette, aberration chromatique qui s'écarte sur les bords, **traits de vitesse**
radiaux, jauge d'essence qui rougeoie, traînées d'ailerons jaunes (existantes).

### 2.8 Ombre de la roquette
Un rayon vers le bas ; une tache sombre s'allonge dans le sens du vol sur le sol, un toit, un pont : petite et sombre près de la
surface, large et pâle en altitude. Un plan texturé et un rayon par image (grille de hachage).

### 2.9 Fin de partie
Score qui compte, record ou « PREMIER VOL », pastilles (distance, éclats, cibles), lignes d'XP qui tombent une à une, barre d'XP qui se
remplit (et monte de niveau : bandeau « NIVEAU 5 ! », décor débloqué, fanfare, vibration), missions avec leur avancement, puis un seul
gros bouton : REJOUER. Taper ailleurs termine les animations.

### 2.10 Publicités : la rétention avant la quantité
Vols de ~1 minute au début (14 s d'essence de départ, allongée par les cibles et les frôlements). Structure retenue = A + C :

| Type | Quand | Règles |
|---|---|---|
| **Récompensée : continuer** | Après un crash à ≥ 180 m, une fois par vol, 5,5 s pour accepter | choisie ; la roquette repart 24 m avant, protégée 2,4 s (tant qu'elle est dans un mur, le bouclier reste) |
| **Récompensée : XP ×2** | Écran de fin, si le vol a rapporté ≥ 25 XP | choisie ; la barre repart, un niveau peut se gagner sous les yeux du joueur |
| **Récompensée : cosmétique** | Boutique (existant) | 1 minute de publicité |
| **Interstitielle** | Entre l'écran de fin et le vol suivant, jamais en partie | ≥ 3 vols depuis la dernière ; pas avant le 4e vol ; ≥ 150 s depuis toute publicité (récompensée comprise) ; jamais après un record ni un niveau gagné ; jamais après un vol < 20 s ; fermable au bout de 5 s |
| **Bannière** | — | supprimée de l'accueil (`ads.banner` la remet) |

Les publicités restent des emplacements d'exemple (annonceurs fictifs, aucun lien, coupables dans RÉGLAGES).

## 3. Variété
- **Décors ouverts par niveau** (`progress.worlds`) : au niveau 1 la ville ; puis désert, montagne, industrie, canyon, nuit.
- **Drone** (nouveau, obstacle mobile, à partir du palier MOYEN) : balaie le couloir sur un rail rouge lumineux (le danger se lit de
  loin), vitesse croissante avec les paliers, touché = « DRONE ».
- Obstacles fixes, chars, missiles : inchangés, introduits par paliers (existant).

## 4. Ce qui a été supprimé / remplacé
Écran d'accueil à trois boutons (remplacé par le lanceur ; DÉFI et BOUTIQUE sont des icônes), bannière publicitaire, tir à l'épaule
en CLASSIQUE, chrono / vitesse / essence chiffrée / STYLE / palier permanent / rappel de touches dans le HUD CLASSIQUE, écran de
fin froid, menu pause anglais (remplacé par un menu français à gros boutons, avec « TERMINER ET VOIR MES GAINS »).

## 5. Vérification (Chrome headless, rendu logiciel SwiftShader, émulation Pixel 7 en 390 × 844 et 844 × 390, plus 1280 × 720)

| Test | Résultat |
|---|---|
| Ouverture, accueil (portrait, paysage, ordinateur) | rendu correct, aucune erreur de console |
| Toucher sur le lanceur → charge → allumage → travelling → vol | états `MENU → LAUNCH → FLIGHT` ; caméra `pad → handoff → chase` ; vue de jeu atteinte en ~1 s ; sans chargement |
| Boost au toucher (fenêtre de 1,8 s puis appui long), glissé de direction | boost immédiat, zoom / punch / traits de vitesse, direction suivie |
| Ramassage d'éclats, étoile, ×2 ; ombre | 4 à 19 éclats ramassés par le pilote automatique sur la trajectoire ; ombre visible sous 5 m |
| Collision drone | crash « DRONE » ; bouclier : traverse |
| Crash → offre de continuer → publicité → reprise | reprise 24 m avant, bouclier 2,4 s, état `FLIGHT` |
| Écran de récompenses (score, XP, niveau, missions), XP ×2 par publicité | animations dans l'ordre ; niveau 2 → 4 après ×2 ; missions renouvelées |
| REJOUER → interstitielle (règles) → lanceur | interstitielle affichée seulement si toutes les règles sont réunies, puis lanceur prêt |
| 5 cycles lancement / crash / REJOUER | géométries stables (≈ 155 en vol, ≈ 98 à l'accueil), boîtes de collision stables, pas de fuite visible |
| Coût de rendu | 90 à 154 appels de dessin, 36 000 à 64 000 triangles |
| Modes existants (pilote automatique) | CITY 14,90 s, CANYON 13,0 s, missions FACILE et DIFFICILE : toutes terminées ; navigation lanceur ↔ DÉFI ↔ niveaux ↔ lanceur vérifiée. Les secousses de caméra et le décalage des annonces de STYLE tirent désormais `U.fx` (visuel) et non `U.rng` (gameplay) : un effet visuel ne change plus le hasard des tirs ennemis — les temps de certains niveaux au pilote automatique bougent donc de quelques centièmes par rapport à v033 |
| Tous les sons | 22 sons joués sans exception, contexte audio actif |

## 6. Limites connues / à faire
- Testé sans téléphone réel : le ressenti du toucher, la vibration (Android : API Vibration ; iPhone : tics limités, bloqués depuis iOS 26.5) et
  les 60 im/s restent à valider sur appareil. Le rendu logiciel de test tourne à ~20–40 im/s, pas représentatif d'un téléphone.
- Les publicités sont des exemples (pas de régie) ; les règles sont prêtes pour brancher un vrai SDK derrière `CC.Ads.open`.
- Les bosses, non nécessaires au mode CLASSIQUE, n'ont pas été ajoutés (raison de jouer aux contenus secondaires : DÉFI).
- La boutique conserve son fonctionnement (paiement Stripe ou minute de publicité) : les niveaux ne débloquent volontairement **aucun**
  cosmétique payant.
- Le pilote automatique ne connaît pas les drones (banc de test seulement).

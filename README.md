# COLD IMPACT

Prototype jouable en HTML/WebGL, inspiré de la bande-annonce du jeu *Dumbfire*.
On pilote un missile qui ne s'arrête jamais : il frôle les murs, ramasse des éclats, détruit des cibles et va le plus loin possible.
**v034 : jeu pensé pour le téléphone** — la roquette sur son lanceur est le bouton « jouer », progression par XP et niveaux,
missions, récompenses de fin de partie (voir [analysis/REFONTE_MOBILE.md](analysis/REFONTE_MOBILE.md)).

Tous les assets (textures pixel-art, modèles, police, sons, musique) sont **originaux** et générés par le code.
Aucun fichier du jeu d'origine n'est utilisé, et le matériel de référence (vidéo, images extraites) n'est pas publié ici.

**▶ Jouer en ligne (ordinateur, téléphone, tablette) : https://hugobrochard23-sys.github.io/cold-impact.project/**

---

## Jouer en ligne

Le jeu est publié par **GitHub Pages** depuis la branche `main` (dossier racine) : chaque `git push` sur `main` met le
site à jour automatiquement en une à deux minutes. Rien à installer ; sur téléphone, les commandes tactiles s'activent seules.

## Télécharger et jouer hors ligne

1. Sur la page GitHub du dépôt : bouton vert **Code → Download ZIP**, puis décompresser.
   Ou en ligne de commande : `git clone` de l'adresse du dépôt.
2. Double-cliquer sur `index.html`. Fonctionne hors ligne, sans installation : three.js est copié dans `assets/lib`.

Si le navigateur bloque les fichiers locaux, lancer le petit serveur fourni puis ouvrir `http://localhost:8123` :

```bash
node tools/serve.js
```

Compatible Chrome, Edge, Firefox et Safari récents (WebGL requis).

## Travailler à plusieurs

Le dépôt GitHub `hugobrochard23-sys/cold-impact.project` (public) est la version de référence : **la version GitHub
prime toujours sur celle d'un ordinateur**. Tout le monde peut le lire et le télécharger ; pour y envoyer des
modifications (`git push`), il faut être invité comme collaborateur par Hugo (Settings → Collaborators).

```bash
git clone https://github.com/hugobrochard23-sys/cold-impact.project.git
cd cold-impact.project
node tools/serve.js 8123
```

Puis ouvrir `http://localhost:8123`. À chaque séance :

1. **Avant de modifier** : `git pull` (récupère le travail des autres).
2. Faire une modification à la fois, la tester dans le navigateur.
3. **Juste après** : `git add -A`, `git commit -m "ce qui a changé"`, `git pull` puis `git push`.
4. En cas de conflit, garder la version GitHub et refaire son changement par-dessus ; jamais de `git push --force`.

Tous les réglages sont dans `src/config.js` (chaque valeur est commentée) ; l'historique des changements est dans
`analysis/VERSIONS.md` (à compléter à chaque version). Sur ordinateur, `#touch` à la fin de l'adresse affiche les
commandes tactiles. Banc de test sans affichage : `?test=1&autopilot=1&level=N` (le pilote automatique doit finir
chaque niveau après une modification du vol, de l'essence ou des ennemis).

## Contrôles

| Touche | Action |
|---|---|
| W,A,S,D | piloter à 360° : W cabre, S pique, A gauche, D droite, par rapport à la roquette (loopings et vol sur le dos possibles ; Z,Q,S,D sur AZERTY et les flèches marchent aussi) |
| Espace (maintenue) | moteur : pousse tant qu'Espace est enfoncée, s'éteint dès qu'on la relâche ; consomme l'essence |
| Souris | viser aussi à la souris (facultatif) : la roquette suit le réticule |
| Clic gauche | tirer / réapparaître au lanceur |
| Clic droit (maintenu) | grappin : s'accroche au mur ou au disque visé, relâcher pour lâcher |
| Maj (maintenue) | rétro-fusées : freinage fort, le moteur principal s'éteint |
| R | recommencer |
| Échap | pause / menu |
| Tab | réglages (sensibilité, inversion Y, volumes, post-traitement, FPS) |
| F1 | liste des touches |
| H | masquer le HUD |

**Sur téléphone ou tablette (v024)** : plein écran, aucun bouton sauf la pause. **Toucher** : tir (animation du tube) ou
réapparition. **Glisser** en vol : diriger ; doigt tenu dans la **bande gauche / droite** de l'écran : virage sans fin
(haut / bas : glissé seulement). **Appui long** (doigt immobile ≥ 0,4 s) : boost tant que le doigt reste posé (il peut alors
bouger). Boost relâché : pendant **0,6 s** (fine barre jaune sous l'essence), reposer le doigt relance le boost aussitôt.
Mini vibration à chaque toucher en partie. Au lanceur, la vue ne bouge pas. Pas de curseur. **Pause** : reprendre, son, musique, vibration (OFF / LOW / MEDIUM /
HIGH), recommencer, niveau suivant, menu. Vibrations : Android (API Vibration) ; iPhone : petits « tics » seulement jusqu'à
iOS 26.4 (Apple a bloqué la méthode à partir d'iOS 26.5, Safari n'ayant pas l'API Vibration).

Dans les menus et la boutique, tout se fait à la souris (survol pour sélectionner, clic pour valider) ; **Échap** revient en arrière.

**Moteur et essence (v009, v010).** Au tir, la roquette a **0,5 s de poussée gratuite** (jauge bleue « FREE BOOST ») ;
ensuite elle ne pousse que si **Espace** est maintenue, et chaque seconde de poussée brûle 1 s d'essence (jauge orange en bas à gauche,
rouge sous 25 %). Réservoir vide : moteur coupé, la roquette plane puis tombe. Le réservoir est plein à chaque tir et sa taille
baisse avec la difficulté (la jauge est plus courte) :

| Niveau | CITY | BRICKWORKS | CANYON | CAVE | WOODS | CONSTRUCTION | NIGHT FOREST |
|---|---|---|---|---|---|---|---|
| Essence (s) | 23 | 20 | 18 | 16 | 14 | 12 | 11 |
| Réserve restante au pilote automatique (s) | 13,8 | 15,8 | 8,6 | 6,5 | 5,8 | 6,1 | 3,2 |

Missions générées (v032) : le réservoir est calculé pour la plus longue approche de la carte, avec une marge qui baisse
avec la difficulté (×1,9 FACILE → ×1,18 IMPOSSIBLE).
Réglages : `rocket.freeBoost`, `rocket.fuelDefault` dans `src/config.js`, `fuel` dans chaque fiche de niveau.

**Caméra de vol (v010).** La caméra suit la roquette mais pas la visée : elle se réaligne peu à peu derrière la trajectoire
(`camera.followLag`, plus petit = caméra plus libre). En pilotant, on voit donc la roquette tourner à l'écran ; le réticule
indique la direction visée.

**Missiles anti-aériens (v020, v021).** Les tanks et les hélicoptères tirent sur la roquette quand ils la voient (jamais à travers
un bâtiment), entre 45 m et 90 à 140 m, et seulement s'ils sont devant elle (jamais de tir dans le dos). NIGHT FOREST a 2 tanks
de garde (ils tirent et se détruisent, mais ne comptent pas dans l'objectif : la cible reste la maison). La menace monte de CITY (0) à NIGHT FOREST (1) ; missions générées : selon le profil de difficulté (≈ 0,25 → 1).
Avec elle : tirs plus rapprochés (5 s → 1,6 s), visée plus juste (erreur 6 m → 0,3 m), anticipation de la trajectoire,
missiles plus rapides (50 → 68 m/s). Ils restent moins maniables que la roquette (virage 0,5 → 1,1 rad/s contre 1,5 à 1,8)
et plus lents qu'elle à pleine poussée : on les sème en virant franchement, et ils explosent sur les murs.
« MISSILE! » clignote en rouge quand l'un d'eux approche (moins de 90 m), avec un bip répété et une vibration (v026) ;
« LOW FUEL » clignote sous 25 % d'essence (deux notes, vibration). Réglages : `aa` et `rocket.lowFuel` dans `src/config.js`.

**Traînées et boost (v026).** Une fine traînée part du bout de chaque aileron : blanche, jaune puis rouge pendant le boost ;
des filets d'air glissent du nez vers l'arrière pendant le boost ; la caméra zoome légèrement pendant le boost
(`camera.boostZoom`) et revient ensuite. Traînées effacées près de la caméra pour garder la vue dégagée (`trails`).

Un contact rasant avec le sol ou un toit fait **glisser** la roquette. Un choc de face la fait **exploser**.
Les vitres, les murs de briques fins et les caisses se brisent.

**Mobile (v030).** Menus tactiles plein écran à gros boutons, tutoriel des premiers vols, qualité graphique AUTO / HIGH /
MEDIUM / LOW (réglage GRAPHICS), 60 images/s au plus, pause et son coupé quand l'application passe en arrière-plan,
publicités d'exemple (bannière, interstitielle, récompensée — annonceurs fictifs, réglage SAMPLE ADS). Analyse et mesures :
[analysis/MOBILE_AUDIT.md](analysis/MOBILE_AUDIT.md).

**Refonte visuelle (v028).** Propulsion en couches attachée à la tuyère, fumée qui dérive, explosions en étapes, épaves
qui brûlent, chars et hélicoptères détaillés et animés (tourelle à inertie, recul, assiette de vol), façades sans fenêtre
coupée, toits équipés, forêts de conifères, son du réacteur en couches. Détails et mesures : [analysis/DESIGN_REFONTE.md](analysis/DESIGN_REFONTE.md).

## Modes de jeu

**L'accueil est le lanceur (v034).** Plus de bouton « JOUER » : la roquette est posée sur son rail, sur une plate-forme au-dessus de la
rue qu'elle va parcourir. **Toucher la roquette (ou n'importe où hors des icônes, ou Espace / clic sur ordinateur) la lance.** Autour :
niveau et barre d'XP (haut gauche), engrenage des réglages (haut droite), la mission la plus avancée (bas) et quatre icônes rondes
— MISSIONS, PROGRES, DEFIS, BOUTIQUE. Analyse, conception et tests : [analysis/REFONTE_MOBILE.md](analysis/REFONTE_MOBILE.md).

### CLASSIQUE — couloir infini (le cœur du jeu)

Le but : **aller le plus loin possible, en une seule vie, en ramassant, en frôlant et en détruisant**. Le couloir (rue entre des
immeubles, désert, montagne enneigée, zone industrielle, canyon, ville de nuit) est **généré à l'infini** devant la roquette, par
tronçons de 200 m construits en quelques millisecondes et détruits derrière elle (`src/world/endless.js`). Chaque partie a sa propre
graine. **Une partie dure environ une minute** au début.

**Le lancement (0,9 s).** Un toucher : vibration, clac des verrous, sirène de charge qui monte, feux ambre → rouge, vapeur ; la roquette
tremble de plus en plus fort, la flamme de veille grossit, la caméra avance ; puis allumage (flash, onde de choc, nuage de vapeur, brides
qui s'ouvrent, grosse vibration) : la roquette quitte le rail en accélérant et la caméra la suit en travelling jusqu'à la vue de jeu.
Aucun chargement : le couloir est déjà construit. Détail : `src/entities/pad.js`, réglages : `CC.CONFIG.pad`.

**Commandes tactiles.** Glisser : diriger. Doigt maintenu 0,4 s : **boost** (le doigt peut alors bouger). Doigt dans la bande gauche ou
droite : virage sans fin. Dans les 1,8 s qui suivent le lancement, ou 0,6 s après un boost, reposer le doigt relance le boost aussitôt.

**Interface en vol.** Score (haut, gros), jauge d'essence juste dessous (10 segments de 2 s, clignote sous 25 %), record (petit),
journal (« FROLE +12 »), éclats ramassés et ×2 (haut gauche), mission suivie (bas gauche). Pas de chrono, de vitesse, de chiffres
d'essence ni de touches clavier à l'écran.

**Score.** Mètres + bonus : frôlement (« FROLE », « RASE-MOTTES », « COLD IMPACT »), cible détruite (+100), éclat (+10), étoile dorée
(+150), le tout doublé pendant 12 s avec le ×2.

**Essence.** 14 s au départ, réservoir de 20 s. Elle se recharge en **frôlant** (chaque point de bonus de frôlement), en **détruisant les
cibles en route** (dépôts de carburant, camions : +4 s ; la roquette les traverse et continue) et avec les **étoiles dorées** (+3 s).
Réservoir vide : la roquette plane puis s'écrase.

**Éclats.** Traînées de cristaux cyan le long de la trajectoire sûre du couloir : les suivre = passer par les trous et sous les poutres.
Le son monte de note en note quand on enchaîne. Étoile dorée et ×2 : rares.

**Difficulté.** Paliers tous les 800 m : FACILE → MOYEN → DIFFICILE → IMPOSSIBLE (couloir de 40 m → 18 m, virages plus serrés,
obstacles plus rapprochés, trous plus petits, chars ennemis de plus en plus précis, **drones** qui balaient le couloir à partir de
MOYEN). Obstacles : barrière basse, poutre haute, pilier, vitre géante, passerelle, laser, mur percé d'un trou, slalom, fenêtre
entre deux poutres. Plafond à 48 m (alarme « TROP HAUT ! », puis explosion).

**Décors.** Une nouvelle zone tous les 1 000 m ; les décors s'ouvrent avec le niveau du joueur (niveau 1 : ville ; puis désert, montagne,
industrie, canyon, ville de nuit).

**Fin de partie.** Cause (MUR, MISSILE, LASER, DRONE, TROP HAUT, PANNE SECHE), **offre de continuer** (publicité récompensée, une fois
par vol, à partir de 180 m), puis l'écran de récompenses : score qui compte, record, distance / éclats / cibles, lignes d'XP, barre
d'XP qui se remplit (niveau gagné, décor débloqué), missions, et **REJOUER**, qui ramène au lanceur (la roquette suivante descend
dans le rail en 0,75 s ; un toucher pendant le rechargement est mémorisé).

### Progression (visible en quelques secondes)

- **XP** : score ÷ 10 + missions terminées + primes (premier vol +30, record +25). Chaque vol en rapporte, même raté.
- **Niveaux** : 80 XP pour le niveau 2, puis +40 par niveau (`CC.CONFIG.progress`). Rangs : RECRUE, PILOTE, AS, CAPITAINE, MAJOR,
  COMMANDANT, LEGENDE. Écran PROGRES : niveau, XP, décors (verrouillés / ouverts), statistiques.
- **Missions** : trois en cours, renouvelées à la fin du vol ; types : atteindre une distance, faire un score, survivre, détruire des
  cibles (au total ou en un vol), utiliser des boosts, ramasser des éclats, frôler les murs, prendre des étoiles dorées. Leur
  difficulté suit le niveau.
- Sauvegarde : `save.prog` (aucun serveur, aucune horloge).

Réglages : `CC.CONFIG.endless`, `pad`, `score`, `cells`, `progress`, `boost`, `shadow`, `revive`. Banc de test :
`?test=1&autopilot=1&endless=<graine>` (le pilote automatique part directement, sans lanceur), et `tools/endlessplay.js`.

### Publicités : la rétention avant la quantité

Les publicités sont des **exemples** (annonceurs fictifs, aucun lien, aucune donnée envoyée ; coupables dans RÉGLAGES). La structure :
- **Récompensées, choisies par le joueur** : CONTINUER après un crash (la roquette repart 24 m avant, protégée 2,4 s), XP ×2 sur
  l'écran de fin, cosmétique de la boutique (1 minute).
- **Interstitielle, rare, jamais en partie** : entre l'écran de fin et le vol suivant, au plus une tous les 3 vols, jamais avant le 4e vol,
  jamais dans les 150 s qui suivent une publicité (récompensée comprise), jamais après un record ni un niveau gagné, jamais après
  un vol de moins de 20 s ; fermable après 5 s.
- **Pas de bannière** sur l'accueil : le lanceur reste la seule invitation.
Réglages : `CC.CONFIG.ads`, `CC.CONFIG.revive`. Logique : `src/ui/ads.js`.

### DÉFI — cartes numérotées, étoiles et trophées

Quatre onglets **FACILE, MOYEN, DIFFICILE, IMPOSSIBLE** de **20 cartes numérotées** chacun (générées par le générateur de
missions à partir d'une graine fixe : les mêmes pour tous les joueurs), plus l'onglet **NIVEAUX** (les 9 niveaux d'origine).

- La carte suivante s'ouvre quand la précédente est terminée.
- **1 à 3 étoiles** au temps : 3 étoiles sous le temps de référence de la carte, 2 sous 1,5 fois ce temps, 1 étoile sinon
  (carte terminée). L'écran de fin donne le temps à battre pour l'étoile suivante.
- **Trophées** par difficulté : BRONZE à 10 étoiles, ARGENT à 20, OR à 40 (sur 60).
- Le bouton **MISSIONS LIBRES** ouvre l'ancien générateur (mission du jour, graine au choix, dernières missions).

Réglages : `CC.CONFIG.challenge`. Étalonnage : sur un vol propre, le pilote automatique met 75 à 82 % du temps de référence.

## Niveaux

Les 9 niveaux d'origine sont dans **DÉFI → NIVEAUX** (v033).

Chaque niveau reconstruit une séquence de la vidéo, avec l'interface (HUD) qu'il a dans la vidéo.

| # | Niveau | Séquence | HUD | Mode | Cible |
|---|---|---|---|---|---|
| 1 | CITY | 0,0–15,4 s | A (STYLE, THRUST:45, COOLDOWN) | style | hélicoptère noir |
| 2 | BRICKWORKS | 15,4–23,6 s | B (TARGETS n/4, SCORE) | 4 cibles | 4 chars |
| 3 | CANYON | 23,6–36,0 s | C (STYLE, TIME:∞, SPEED) | style | char dans la fosse |
| 4 | CAVE | 36,0–48,2 s | C | style | camion sur plateforme |
| 5 | WOODS | 48,2–64,5 s | B (SCORE) | score | char dans la maison |
| 6 | CONSTRUCTION | 64,5–79,3 s | C (sans SPEED) | style | hélicoptère camouflé |
| 7 | NIGHT FOREST | 79,3–89,1 s | B (SCORE) | score | maison |
| 8 | TRENCH RUN | création (v023, façon Star Wars) | C | style | hélicoptère qui s'enfuit dans une tranchée de 20 m, 19 obstacles, 9 tourelles |
| 9 | NIGHT CANYON | création (v023) | C | style | hélicoptère qui s'enfuit dans un canyon de nuit, convoi de 5 tanks en salves |
| 10 | MISSIONS | générateur (v032) | C | cibles | carte générée : 2 à 4 cibles selon la difficulté |

**Progression (v023)** : un niveau ne s'ouvre qu'une fois le précédent terminé (MISSIONS toujours libre) ; le menu pause
propose NEXT LEVEL quand le suivant est ouvert. Niveaux 1 et 3 : flèches vertes le long du chemin ; niveau 2 (v027) et suivants : repère rouge
permanent sur la cible. Salves anti-aériennes (2 missiles rapprochés, tirs groupés) sur les 3 derniers niveaux et les missions
DIFFICILE / IMPOSSIBLE ; les missiles ennemis accélèrent après le tir (on les voit partir). Essence réduite d'environ 15 %.

### Générateur de missions (v032 ; v033 : DÉFI → MISSIONS LIBRES)

Le bouton MISSIONS LIBRES de l'écran DÉFI ouvre le **GÉNÉRATEUR DE MISSIONS** : on choisit **FACILE, MOYEN, DIFFICILE ou IMPOSSIBLE**,
l'écran « GÉNÉRATION... » s'affiche, et une carte entière est **construite à la volée** (≈ 0,1 à 0,4 s sur ordinateur)
à partir d'une **graine** : même graine + même difficulté = même carte pour tout le monde. Rien n'est stocké à part la
graine, la difficulté, le temps (dernières missions, record par graine, record de la carte du jour).

- **8 familles de cartes** : zone urbaine, industrielle, militaire, rurale, montagneuse (vallées, arches, ponts, neige),
  désertique (dunes, avant-postes, puits de pétrole), portuaire (quais, grues, conteneurs, mer), mixte (plusieurs
  familles en bandes) ; **9 ambiances** (jour, couvert, brume de chaleur, aube, crépuscule, nuit, clair de lune,
  brouillard, neige).
- **Cibles variées** et toujours marquées en rouge : char, camion, hélicoptère (sur un toit ou en patrouille), maison,
  station radar, dépôt de carburant, poste de commandement — à découvert, derrière des murs, dans un hangar, sous un
  filet, au fond d'une cour ou d'une ruelle. Il faut parfois contourner pour s'aligner sur l'entrée.
- **Défenses** placées sur les vraies trajectoires d'approche (lignes de vue calculées) : tanks, lance-missiles (nouveaux,
  tourelle qui suit la roquette), hélicoptères en patrouille. Tirs croisés en IMPOSSIBLE, défenses espacées en FACILE.
- **Mission du jour** (même carte pour tous à une date donnée, DIFFICILE), **graine au choix** (un nombre ou un mot),
  **dernières missions** rejouables, graine affichée en pause et à l'écran de résultats (**NOUVELLE MISSION** enchaîne
  une autre carte de même difficulté). Lien partageable : `?mission=83927451&diff=hard`.
- Chaque carte est **validée avant d'être montrée** (aucune superposition, départ libre, chaque cible atteignable par
  une trajectoire vérifiée, virages faisables, essence suffisante, difficulté conforme) ; sinon une autre est tirée,
  toujours de façon déterministe.

| Difficulté | Cibles | Défenses | Missiles ennemis simultanés | Cibles protégées | Marge de passage | Réserve d'essence |
|---|---|---|---|---|---|---|
| FACILE | 2 (visent sans tirer) | 1–2 tanks | 2 | à découvert | 3,6 m | ×1,9 |
| MOYEN | 3 (visent sans tirer) | 2–4 tanks, 1 hélicoptère | 3 | murs, filets | 2,8 m | ×1,6 |
| DIFFICILE | 3–4 | 4–6 tanks, 1 lance-missiles, 1–2 hélicoptères, salves | 4 | hangars, cours, ruelles | 2,2 m | ×1,35 |
| IMPOSSIBLE | 4 | 7–9 tanks, 2–3 lance-missiles, 2–3 hélicoptères rapides, salves | 7 | entrées étroites, à contourner | 1,7 m | ×1,18 |

Détails, architecture, tests et résultats : [analysis/GENERATOR.md](analysis/GENERATOR.md). Touche **G** en mission : vue
de débogage (plan, danger, lignes de vue, score, temps de génération). Banc de test : `?test=1&autopilot=1&gen=hard&seed=1234`
(les missions produisent aussi leurs routes de pilote automatique, donc `tools/record.js` et `tools/genplay.js` les jouent).

### Boutique de cosmétiques (ROCKET SHOP)

Le menu principal ouvre une boutique : 20 apparences de roquette (plus la roquette d'origine, offerte). **Depuis la v031,
on ne gagne plus d'argent en jouant** : chaque cosmétique se débloque **en payant 2,29 €** (tous au même prix) **ou en
regardant une minute de publicité en entier** (4 annonces de 15 s ; fermer avant la fin ne débloque rien).

| Catégorie | Fiches |
|---|---|
| STOCK (offerte) | la roquette d'origine |
| COMMUN (7) | LE GAMIN, MONSIEUR BEDON, FUSEE V, MINUTEMEC, HACHETTE VOLANTE, CROQUETTE, BAGUETTE |
| RARE (8) | TRIDENTIN, POISSON VOLANT, GARDIEN DE PAIX, TITANITE, SATANETTE, GROSSE BERTHE, CROISSANT, CHATON |
| ULTRA RARE (5) | TSARINI, MAMAN DES BOMBES, BOMBE H, COLIS EXPRESS, CAILLOU |

**Paiement (Stripe).** Le bouton BUY ouvre le lien de paiement Stripe réglé dans `CC.CONFIG.shop.stripeLink`
(`src/config.js`, vide pour l'instant : le bouton affiche alors « PAYMENT LINK NOT SET YET »). Le jeu y ajoute
`client_reference_id` et `utm_content` = identifiant du cosmétique. Dans le Dashboard Stripe, régler le lien sur
**Après le paiement → Rediriger vers** : `https://hugobrochard23-sys.github.io/cold-impact.project/?paid=1&session_id={CHECKOUT_SESSION_ID}`.
Stripe recopie `utm_content` dans cette adresse : au retour, le jeu débloque et équipe le cosmétique, affiche un
remerciement et nettoie l'adresse. Limite : sans serveur, le paiement n'est pas vérifié auprès de Stripe (recopier
l'adresse de retour suffirait à débloquer) — à renforcer par une vérification de `session_id` côté serveur.
**Google Play** : dans une application Android publiée sur le Play Store, vendre un contenu numérique par un lien externe
n'est permis que dans les programmes de Google (facturation alternative / offres externes, avec frais) ; sinon il faut la
facturation Google Play.

Les noms s'inspirent librement de gros engins historiques sans en reprendre un seul ; cinq fiches sont des fantaisies
(baguette, croissant, chaton, colis, caillou). Un cosmétique change les couleurs, les proportions du corps et du nez,
le nombre d'ailerons, des pièces rapportées et la couleur de flamme.

> La police du HUD ne contient que l'ASCII (tout autre caractère s'affiche « ? ») : les fiches sont donc écrites sans
> accent, avec un tiret simple au lieu d'un tiret long, et les prix s'affichent en « EUR » au lieu de « € ».

## Architecture

```text
cold-impact/
├── index.html            point d'entrée (scripts classiques : marche en file://)
├── style.css             zone 16:9 centrée, HUD superposé
├── game.js               démarrage (et affichage des erreurs)
├── src/
│   ├── config.js         TOUS les paramètres réglables (GAME_CONFIG), annotés MESURÉ / ESTIMATION / CHOIX
│   ├── core/             util.js (maths, aléatoire à graine, formats 0:08,27 et 1.315), game.js (boucle, machine à états, banc de test)
│   ├── physics/          collision.js (boîtes orientées, terrain, tunnel ; balayage de sphère, distances, rayons)
│   ├── entities/         rocket.js (modèle de vol + capacités + bouclier), targets.js (cibles, IA, destructibles, lasers),
│   │                     models.js, skins.js (fiches des 20 cosmétiques + STOCK),
│   │                     pad.js (v034 : le LANCEUR et sa séquence de lancement), drone.js (v034 : obstacle mobile)
│   ├── systems/          camera.js (lanceur, travelling, poursuite, boost), style.js (combos de frôlement),
│   │                     progress.js (v034 : XP, niveaux, missions)
│   ├── rendering/        textures.js (pixel-art procédural), particles.js (voxels instanciés), postfx.js (vignette, aberration, tramage, bloom),
│   │                     shadow.js (v034 : ombre de la roquette)
│   ├── world/            builder.js (géométrie fusionnée, murs percés, terrains, tunnel),
│   │                     levels/ (9 niveaux + generated.js : fiche d'une mission générée),
│   │                     endless.js (v033 : mode CLASSIQUE, couloir infini par tronçons), collect.js (v034 : éclats, étoile, ×2),
│   │                     gen/ (v032 : générateur de missions — graine, profils, biomes, disposition, gabarits,
│   │                     mission, navigation, validation, construction ; voir analysis/GENERATOR.md)
│   ├── input/            input.js (souris/clavier + pilote automatique de test), touch.js (gestes), haptics.js (vibrations)
│   ├── ui/               font.js (police pixel originale), hud.js (3 variantes + HUD épuré du CLASSIQUE), menu.js (routage, pause,
│   │                     anciens écrans), home.js (v034 : accueil du lanceur, missions, progression, réglages, offre de continuer,
│   │                     écran de récompenses), shop.js (boutique), ads.js (publicités d'exemple)
│   └── audio/            audio.js (sons et musique synthétisés, Web Audio)
├── assets/lib/           three.min.js (r149)
├── tests/                PROTOCOLE.md, reference_measurements.json
├── tools/                serve.js, record.js (enregistrement automatique), compare.js (comparaison à la référence),
│                         calibrate_color.js (calibration hors ligne de la balance des ombres)
├── recordings/           (non versionné) vidéos et télémétrie produites par tools/record.js
└── analysis/             ANALYSE_REFERENCE.md, VERSIONS.md, iterations/vXXX/ (rapports, planches de comparaison)
```

Machine à états : `BOOT → MENU (le lanceur) → LAUNCH (charge 0,9 s) → FLIGHT → CRASHED → [REVIVE →] RESULTS → MENU …` pour le CLASSIQUE ;
`… → AIM (1re personne) → FLIGHT → IMPACT | CRASHED → RESPAWN → … → RESULTS` pour le DÉFI et les niveaux ; plus PAUSE et les
surcouches (quests, progress, msettings, revive, settings, binds, defi, shop, ad).

## Systèmes principaux et paramètres

Tout se règle dans `src/config.js`. Paramètres clés :

| Paramètre | Valeur | Origine |
|---|---|---|
| `rocket.ejectSpeed` | 31 m/s | MESURÉ (compteur SPEED après le tir) |
| `rocket.ignitionDelay` | 0,28 s | MESURÉ (le compteur SPEED passe 31→35 entre 0,23 et 0,33 s) |
| `rocket.thrust` | 50 m/s² (55 en v006) | MESURÉ (courbe SPEED du canyon : 31→55 m/s en 0,6 s) puis CHOIX v007 : la vitesse passait pour trop élevée ; le HUD affiche toujours « THRUST:45 » comme la vidéo |
| `rocket.dragK` | 0,0100 (0,0086 en v006) | MESURÉ (plafond ≈ 80 m/s en palier, 87 en piqué) puis CHOIX v007 : plafond ≈ 71 m/s |
| `rocket.maxTurnRate` / `steerGain` / `grip` | 3,5 rad/s / 9 / 11 (3 / 7,5 / 9 en v006) | ESTIMATION, relevées en v007 : roquette plus maniable (traînée induite 0,085 → 0,070, glissade tolérée jusqu'à 27°) |
| `economy.*` | solde de départ 5 €, 60 + 0,05/pt + 1 € record | CHOIX v007 (boutique) |
| `physics.gravity` | 5,715 m/s² | CHOIX d'Hugo (v016) : moyenne Terre (9,81) / Lune (1,62), roquette seulement ; les G affichés restent en G terrestres |
| `abilities.retro.decel` | 25 m/s² (+ traînée) ; le moteur principal s'éteint pendant le freinage | MESURÉ (75→27 m/s en 1,75 s), OBSERVÉ |
| `camera.distance` / `height` | 1,85 m / 0,52 m | MESURÉ indirectement (nez à 55 %, tuyère à 67,8 % de la hauteur) |
| `camera.crosshairY` | 0,402 | MESURÉ |
| `camera.fovV` | 70° | ESTIMATION |
| `hud.*` | positions et tailles | MESURÉES (boîtes englobantes du texte) |
| `style.coldImpactBase` / `bombSmashPerMs` | 100 / 7,5 | MESURÉ (x2,9 → +290 ; 67 m/s → +504) |

## Protocole de test et comparaison

Voir [tests/PROTOCOLE.md](tests/PROTOCOLE.md). En résumé :

```bash
npm install            # une fois : puppeteer-core, ffmpeg, pngjs (outils de test uniquement)
npm run record -- v002 # joue les 7 niveaux en pilote automatique, enregistre recordings/v002*.mp4
npm run compare -- v002
```

`compare` aligne chaque niveau sur l'instant du tir et produit, dans `analysis/iterations/v002/` :

- les planches original │ clone │ différence ;
- les écarts de l'interface (en pixels) ;
- le cadrage de la roquette ;
- la similarité des couleurs ;
- la courbe de vitesse ;
- les timings (allumage, éjection, impact).

## Différences connues

Voir le dernier rapport dans `analysis/iterations/` et [analysis/VERSIONS.md](analysis/VERSIONS.md). Limites de fond :

- **Géométrie des niveaux :** la vidéo ne montre que des fragments. Le reste est une ESTIMATION, donc les décors ne coïncident pas pixel à pixel.
- **Trajectoires du joueur :** inconnues. Le pilote automatique suit des routes estimées d'après la vidéo.
- **Audio :** la vidéo est muette, le son est entièrement une création.
- **Non montré dans la vidéo :** crash, menus, écran de résultats, collisions avec câbles, lasers et missiles. Choix de conception documentés.

## Prochaines améliorations

Voir la section « NEXT CORRECTIONS » du dernier rapport d'itération.

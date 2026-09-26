# Rétro-analyse mobile de Cold Impact (v030)

Analyse de tout le jeu du point de vue d'un téléphone (performance, batterie, mémoire, ergonomie tactile, monétisation),
faite le 26/09/2026 à la demande d'Hugo, puis corrections et mesures. Base : v029.

## 1. Architecture (rappel utile pour l'analyse)

- Rendu : three.js r149, une scène par niveau, post-traitement maison (`src/rendering/postfx.js` : scène → halo 1/4 de
  résolution → composition avec vignettage, aberration, tramage, grain).
- Boucle : `requestAnimationFrame` → `Game.tick(dt)` : mise à jour (physique à pas fixe 1/240 s), rendu 3D, HUD sur un
  canvas 2D superposé (police pixel dessinée par le code).
- Physique : grille de hachage + OBB, terrains, tube de grotte (`src/physics/collision.js`) ; la roquette est balayée
  240 fois par seconde.
- Interface : tout est dessiné dans le canvas du HUD (`src/ui/menu.js`, `shop.js`) ; les clics / touchers sont testés
  contre une liste de rectangles.
- Mobile : `src/input/touch.js` (glisser, toucher, appui long, bords), `src/input/haptics.js` (vibrations).

## 2. Constats

| # | Constat | Effet sur téléphone | Gravité |
|---|---|---|---|
| 1 | 70 à 214 vecteurs / matrices / quaternions créés par image en vol (physique 240 Hz, caméra, commandes, traînées, missiles) | le ramasse-miettes se déclenche souvent → micro-saccades | haute |
| 2 | Aucune limite d'images par seconde | écran 120 Hz : 2× plus de calcul, chauffe, batterie | haute |
| 3 | Rien ne se passe quand l'application passe en arrière-plan | la partie continue, musique et moteur continuent dans une WebView Android | haute |
| 4 | Anticrénelage 4× du post-traitement toujours actif | coût le plus lourd du rendu mobile, invisible avec le style pixelisé | moyenne |
| 5 | Aucun réglage de qualité ni adaptation automatique | un téléphone modeste reste bloqué sous 30 images/s | moyenne |
| 6 | Menu principal en portrait dessiné dans une bande 16:9 centrée : lignes de niveau de ~14 px, mots coupés | touchers ratés, lisibilité faible | haute |
| 7 | Boutons = texte seul, pas de cadre, zones de toucher de 20 à 30 px | on ne voit pas ce qui se touche ; erreurs de toucher | haute |
| 8 | Libellés clavier sur mobile (« RETRY (CLICK) », « MAIN MENU (ESC) ») | incohérent sur téléphone | basse |
| 9 | Écran de résultats en portrait : 3 boutons de 44 px espacés de 28 px | boutons qui se chevauchent | moyenne |
| 10 | Aucune aide au premier vol (seulement « TAP TO FIRE HOLD: BOOST » au lanceur) | le glissé et les bords ne sont jamais expliqués | moyenne |
| 11 | En menu et en pause, rendu plein régime | batterie consommée pour une image fixe | basse |
| 12 | Pas d'emplacement publicitaire | modèle économique mobile absent | demande d'Hugo |

## 3. Corrections (v030)

**Mémoire (1)** — objets de calcul réutilisés dans les chemins appelés à chaque image ou à chaque pas de physique :
balayage du monde (`sweep`, terrain, tube : résultat réutilisé, valable jusqu'à l'appel suivant), collision roquette /
cibles, caméra, commandes, traînées, missiles ennemis, boîtes des hélicoptères mises à jour en place, test de ligne de vue
sans allocation (`World.blocked`). Mesure (outil `tools/alloc.html`, roquette en vol, sans pilote automatique) :

| Niveau | v029 | v030 |
|---|---|---|
| CITY | 69,5 objets / image | 6 |
| CAVE | 83 | 6 |
| NIGHT FOREST | 105 | 6 |
| NIGHT CANYON | 111,8 | 13,3 |
| TRENCH RUN | 214,1 | 6,3 |

Comportement identique au bit près : les 9 niveaux au pilote automatique donnent les mêmes temps et les mêmes STYLE qu'en v029.

**Cadence (2, 11)** — 60 images/s au plus sur écran tactile, 20 en menu / pause / résultats (`CC.CONFIG.quality`).

**Arrière-plan (3)** — `visibilitychange` / `pagehide` : partie en pause, son suspendu, vibration arrêtée ; au retour,
le son reprend et la partie attend que le joueur appuie sur RESUME.

**Qualité (4, 5)** — `src/core/quality.js` : HIGH (ordinateur : rendu d'origine), MEDIUM (téléphone : 1 pixel par point,
ombres 1024, sans anticrénelage), LOW (0,75 pixel par point, sans ombres ni halo, 55 % des particules). Réglage GRAPHICS :
AUTO (par défaut ; descend d'un niveau sous 42 images/s en vol, jamais de remontée automatique) / HIGH / MEDIUM / LOW.

**Interface (6 à 10)** :
- boutons encadrés sur écran tactile, zone de toucher d'au moins 44 points de haut ;
- menu principal portrait sur toute la hauteur : une ligne par niveau (≥ 44 points), temps record à droite, polices
  calculées pour tenir dans la largeur de l'écran ;
- pause et résultats en pleine hauteur, boutons espacés ; réglages GRAPHICS et SAMPLE ADS dans la pause ;
- libellés sans raccourcis clavier sur mobile ;
- tutoriel des 3 premiers vols (jusqu'au premier niveau terminé) : DRAG TO STEER → HOLD FINGER: BOOST → FINGER ON AN EDGE:
  TURN, avec un pictogramme animé du geste, en haut de l'écran (hors trajectoire).

**Publicités d'exemple (12)** — `src/ui/ads.js`, réglages `CC.CONFIG.ads`. Annonceurs inventés, mention « SAMPLE AD » sur
chaque visuel, aucun lien, aucune donnée envoyée :
- bannière en bas du menu principal (jamais en partie) ;
- interstitielle en quittant l'écran de résultats, au plus une fois tous les 3 niveaux terminés et 90 s, jamais après le
  premier niveau, fermable après 5 s, musique coupée pendant la publicité ;
- récompensée, facultative : « WATCH AD: CASH X2 » sur l'écran de résultats (8 s à regarder, gain du niveau doublé).
Le joueur peut les couper (SAMPLE ADS: OFF). Désactivées au banc de test.

## 4. Vérifications

- Pilote automatique : 9 niveaux + AUTOMAP facile / moyen / difficile terminés, aucune erreur ; temps et STYLE identiques à v029.
- Téléphone simulé 375 × 812 : AUTO choisit MEDIUM (1 pixel par point, 0 échantillon d'anticrénelage) ; menu, pause,
  résultats, tutoriel, bannière, interstitielle (fermeture impossible avant 5 s, niveau relancé après), récompensée (gain
  doublé une seule fois, rien si fermée avant la fin), délai de 90 s entre deux publicités respecté.
- Ordinateur : AUTO choisit HIGH (rendu d'origine), menus inchangés hormis la bannière en bas à droite et les réglages.

## 5. Reste à faire (hors de ce lot)

- **Vraie publicité** : remplacer `src/ui/ads.js` par un SDK (AdMob via Capacitor, ou AdSense H5 Games pour le web) —
  mêmes points d'appel (`beforeContinue`, `rewarded`, bannière) ; consentement RGPD obligatoire en Europe.
- **Application Android** : permission `android.permission.VIBRATE` dans l'AndroidManifest.xml (voir v029).
- **Installation web (PWA)** : manifeste + icônes + service worker → icône sur l'écran d'accueil, plein écran, jeu hors ligne.
- **Achat « sans publicité »** : bouton et vérification d'achat (Google Play Billing / App Store).
- **Particules** : chaque émission crée encore un petit objet de paramètres (≈ 700 / s moteur allumé) ; une API à
  arguments positionnels supprimerait ce reste.
- **Forêts** : 700 arbres en géométrie fusionnée ; des arbres instanciés avec niveau de détail allégeraient les ombres.
- **HUD** : redessiné à chaque image ; ne redessiner que ce qui change économiserait un peu de processeur.
- **Mesure réelle** : ces chiffres viennent d'un Mac et d'un téléphone simulé ; à confirmer sur un Android d'entrée de
  gamme (réglage SHOW FPS sur ordinateur, ou `?showfps` dans l'adresse).

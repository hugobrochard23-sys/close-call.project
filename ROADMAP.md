# COLD IMPACT — ce qu'il manque pour un jeu compétitif et rentable

État au 2026-09-23, après le renommage et le premier passage de simplification.
Rien de cette liste n'est implémenté : c'est le plan pour la reprise.

---

## Déjà en place (à ne pas refaire)

- Chronomètre au centième, système de STYLE avec combos et multiplicateurs.
- Meilleur temps + meilleur score de style enregistrés par niveau (`save.best`).
- Pas de temps fixe à 1/240 s, aléatoire à graine, télémétrie image par image.
  **C'est la fondation du fantôme et du replay : le plus dur est déjà fait.**
- Cartes générées reproductibles par graine (`?gen=hard&seed=1234`).
- Pilote automatique et outils d'enregistrement/comparaison headless.
- Boutique de 20 cosmétiques, monnaie de jeu, prix fictifs.
- Jouable hors ligne en double-cliquant sur `index.html`.

---

## 1. Boucle de compétition et temps record

C'est le cœur de la demande. Par ordre de rapport qualité/effort.

| # | Élément | Pourquoi ça marche | Effort |
|---|---|---|---|
| 1.1 | **Médailles par niveau** (bronze / argent / or / auteur) avec seuils de temps | Donne un objectif chiffré immédiat. C'est le principal moteur du « encore un essai » dans Trackmania et les jeux de plateforme rapides. Sans palier, un temps brut ne motive personne. | faible |
| 1.2 | **Delta en direct** face au meilleur temps perso (`-0,24` en vert / `+0,58` en rouge) | Transforme chaque seconde de la course en information. C'est ce qui rend un run tendu au lieu d'attendre l'écran de fin. | faible |
| 1.3 | **Secteurs / checkpoints** avec temps intermédiaires | Permet de savoir *où* on perd du temps, donc de progresser. Sans ça le joueur plafonne et abandonne. | moyen |
| 1.4 | **Fantôme du meilleur run** rejoué en transparence | Référence visuelle permanente. La télémétrie enregistre déjà position et orientation : il suffit de les sauvegarder et de les rejouer sur un maillage semi-transparent. | moyen |
| 1.5 | **Replay rejouable** du dernier run et du record | Alimente le partage et l'analyse. Même source de données que le fantôme. | moyen |
| 1.6 | **Redémarrage instantané** (< 200 ms, aucun écran intermédiaire, touche maintenue) | Le temps entre deux essais est la variable qui décide de la rétention dans un jeu difficile. | faible |
| 1.7 | **Tableau des records local** : top 10 par niveau, avec date et cosmétique utilisé | Mémoire de la progression. | faible |
| 1.8 | **Défi du jour** : une graine générée à partir de la date, un seul essai classé | Raison de revenir chaque jour, sans serveur : la graine est déductible de la date. | faible |
| 1.9 | **Classement en ligne** | Le vrai moteur compétitif, mais demande un serveur, un stockage et une identité joueur. | élevé |
| 1.10 | **Anti-triche** : rejouer les entrées du joueur côté serveur et vérifier que le temps correspond | Sans ça un classement en ligne est mort en une semaine. Le pas fixe déterministe rend cette vérification possible. | élevé |
| 1.11 | **Compteur de tentatives** et « meilleur du jour » | Contextualise l'effort. | faible |

**Prérequis bloquant :** le bug de `finishLevel` (`r.newRecord = !!best || true`, toujours vrai)
fausse la notion même de record et verse le bonus à chaque partie. À corriger avant tout le reste.

---

## 2. Lisibilité et sensation de jeu

Ce qui fait qu'un joueur relance au lieu de fermer l'onglet.

- **Écran de fin orienté action** : delta au record, prochain palier chiffré
  (« il te manque 0,42 s pour l'or »), bouton rejouer en évidence.
- **Cause de l'échec affichée** : MUR / SOL / MISSILE / HORS ZONE. Un échec incompris est frustrant.
- **Ralenti court sur l'impact final** et sur la mort.
- **Confort et accessibilité** (impact direct sur la rétention et sur le taux de rebond) :
  réglage du champ de vision, secousse de caméra désactivable, aberration chromatique et grain
  désactivables, daltonisme, remappage des touches.
- **Manette** (Gamepad API) et **tactile** — voir aussi §5, c'est ce qui ouvre le mobile.
- **Tutoriel intégré au niveau 1** plutôt qu'un écran de touches : montrer le grappin et les
  rétro-fusées en situation. La majorité des joueurs ne lisent jamais l'écran F1.

---

## 3. Progression et déblocage

- Objectifs multiples par niveau : terminer / médaille d'or / sans crash / X points de style.
- Déblocage des niveaux suivants par médailles cumulées (garde le joueur sur les premiers niveaux
  jusqu'à ce qu'il les maîtrise, au lieu de le laisser tout survoler).
- Missions quotidiennes et hebdomadaires.
- Série de jours joués, avec récompense croissante.
- Niveau de joueur et expérience, palier visible en permanence.
- Statistiques de carrière : distance parcourue, temps de vol cumulé, crashes, meilleur combo.

---

## 4. Contenu sans fin

C'est le vrai multiplicateur de rentabilité : sans contenu, tout le reste plafonne.

- **Mode sans fin** bâti sur AUTOMAP : difficulté croissante, score cumulé, une seule vie.
- **Éditeur de niveau avec code de partage.** C'est le point le plus rentable de toute la liste :
  dans les jeux qui vivent longtemps, les joueurs produisent plus de niveaux que les auteurs.
  Le constructeur de niveaux (`LevelBuilder`) est déjà déclaratif, donc sérialisable.
- **Campagnes et playlists communautaires**, notation des niveaux.

---

## 5. Acquisition et viralité

- **Partage en un clic** : image du résultat générée + lien contenant la graine et le temps à battre.
- **Rejouer le run d'un ami** depuis son lien (le fantôme sert ici aussi).
- **Mobile et tactile** : c'est ce qui multiplie l'audience le plus fortement. Le jeu est en 16:9
  letterbox et ne gère que souris et clavier aujourd'hui.
- **Application installable (PWA)** avec mode hors ligne.
- **Métadonnées de partage** (Open Graph) : titre, description, miniature, sinon les liens
  partagés sont gris et ne convertissent pas.
- **Temps de chargement** maîtrisé et démarrage en un clic, sans compte — déjà le cas, à préserver.
- **Vidéo de 20 s en boucle** sur la page d'accueil.

---

## 6. Monétisation

Aujourd'hui la boutique affiche des prix en euros mais **n'encaisse rien** : le solde est une
monnaie de jeu locale. Passer au réel demande des décisions, pas seulement du code.

- Pistes possibles : cosmétiques payants (Stripe, Lemon Squeezy, Paddle), pass saisonnier,
  version Steam payante avec démo web gratuite comme entonnoir.
- **Publicités récompensées** : possible, mais incompatibles avec un mode chronométré classé.
  À réserver aux modes non compétitifs, sinon le classement perd toute crédibilité.
- **Mesure** : sans entonnoir instrumenté (arrivée → premier tir → premier niveau terminé →
  retour le lendemain), toute optimisation se fait à l'aveugle.
- **Points juridiques à traiter avant d'encaisser** : conditions de vente, TVA, droit de
  rétractation sur le contenu numérique, mentions légales, et pas de mécanique aléatoire payante
  (coffres) — plusieurs pays l'encadrent strictement pour les mineurs.

---

## 7. Fondations techniques manquantes

À faire **avant** d'ajouter des fonctionnalités, sinon chaque ajout devient risqué.

- **Aucun versionnage.** Le projet n'est pas sous git ; le seul filet est la copie
  `Bureau/FIREROCKET v007`. C'est la première chose à mettre en place.
- **Aucun test automatisé** en dehors du protocole de comparaison à la vidéo.
  Il faut au minimum un test de non-régression sur les temps du pilote automatique.
- **Sauvegarde locale uniquement** : un vidage de cache navigateur efface records, solde et
  cosmétiques. Bloquant dès qu'il y a de l'argent réel ou un classement.
- **Pas d'identité joueur** : indispensable pour un classement en ligne.

---

## Ordre de reprise proposé

1. `git init` et premier commit de l'état actuel.
2. Corriger le bug `newRecord`.
3. Médailles + delta en direct + redémarrage instantané (§1.1, 1.2, 1.6) — effet immédiat,
   effort faible, et c'est déjà « le jeu compétitif » demandé.
4. Fantôme du meilleur run (§1.4).
5. Défi du jour et partage de graine (§1.8, §5).
6. Le reste selon ce qui compte le plus pour toi : mobile, éditeur, ou monétisation.

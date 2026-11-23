# MIKO – Le Petit Ingénieur

Jeu de plateforme et de construction basé sur la physique, pour iPhone (Expo / React Native).

## Tester sur iPhone

1. Installer **Expo Go** depuis l'App Store.
2. Sur le PC : `npx expo start`
3. Scanner le QR code avec l'appareil photo de l'iPhone. Le téléphone doit être sur le même Wi-Fi que le PC.
   Si ça ne se connecte pas (réseau isolé) : `npx expo start --tunnel`.

En mode paysage. Commandes tactiles : ◀ ▶ pour bouger, ⤒ pour sauter, 🔧 Atelier pour construire (le temps se fige), ▶ Tester pour relancer la physique, 👁 pour afficher les forces.

Sur le web (`npx expo start --web`) : ← → bouger · ↑/Espace sauter · B atelier · F forces · E pivoter · R reprendre une pièce / recommencer.

> Si Metro plante avec `ENOSPC: System limit for number of file watchers reached`, la limite inotify de Linux est trop basse :
> `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p`

## Structure

| Fichier | Rôle |
|---|---|
| `App.tsx` | Écrans : titre → carte des mondes → aventures du chapitre → jeu |
| `src/components/Miko.tsx` | Design de Miko (SVG) et ses 6 expressions |
| `src/game/chapters.ts` | Les 5 chapitres, les aventures, les pièces (masses) et les fiches physique |
| `src/game/engine.ts` | Boucle de jeu, physique matter-js, mode construction, catapulte |
| `src/game/GameScreen.tsx` | Rendu, couche « forces », HUD, écran de fin avec fiche physique |
| `src/game/types.ts` | Types des données de niveau |

Une aventure se décrit entièrement en données dans `chapters.ts` (terrain, bascules, objets à ramasser, indices, fiche physique). Pour en ajouter une, il suffit d'ajouter un objet `AdventureDef` au chapitre.

## Design de Miko

Mélange Pixar × steampunk : grosse tête en cuivre et émail, deux yeux-objectifs en laiton avec des paupières en cuivre (elles portent les expressions), antenne-ampoule qui change de couleur selon l'humeur, plaque de réparation rivetée sur la tête, jauge d'énergie sur le ventre, sacoche à outils, clé de remontage dans le dos (qui l'a remonté ?). Il ne parle pas : ses expressions sont `idle`, `curious`, `happy`, `surprise`, `focus` (atelier) et `fail`.

## Chapitres

| # | Monde | Objectif | Physique | État |
|---|---|---|---|---|
| 1 | La forêt mécanique | Traverser des obstacles | Gravité, leviers | **Jouable : 3 aventures** |
| 2 | La montagne | Escalader et transporter | Poulies, forces | À construire |
| 3 | Le désert | Construire des systèmes d'eau | Pression, fluides | À construire |
| 4 | La ville abandonnée | Restaurer les machines | Engrenages, énergie | À construire |
| 5 | Le laboratoire | Résoudre des défis complexes | Électricité, magnétisme | À construire |

### Chapitre 1 — La forêt mécanique

1. **Le ravin** (centre de gravité). Le ravin fait 3 m de large, trop pour sauter. On pose la planche en porte-à-faux au-dessus du vide. Seule, elle bascule dès que son centre de gravité dépasse le bord. Avec la caisse en contrepoids à l'arrière, elle tient et Miko saute depuis le bout. Miko (4 kg) ne peut pas pousser la caisse (9 kg) : il doit sauter par-dessus.
2. **La catapulte** (leviers, masse). Une bascule avec un pivot décentré : bras long de 1,85 m, bras court de 0,85 m. Lâcher la caisse sur le bras court ne lance pas Miko assez haut. L'enclume (56 kg), si. Plus elle tombe de haut, et plus Miko se tient loin du pivot, plus il monte haut.
3. **Le vieux chêne** (synthèse). On empile la caisse pour franchir une racine, on refait une catapulte, puis on gagne les **jambes-ressorts**, qui servent à passer le mur de racines. Elles restent acquises pour la suite.

Fil rouge : des fragments de plan signés « E. » (« Projet M — prototype n°7 »…).

### Physique visible

- 👁 Forces : vecteur poids P = m·g dessiné depuis le centre de gravité de chaque objet, avec sa masse en kg.
- Sur les bascules : le pivot et les bras de levier d₁ / d₂, en mètres (100 px = 1 m).
- En atelier, le temps est figé et une grille de 1 m s'affiche.
- La trajectoire de chaque saut ou lancer laisse une parabole en pointillés.
- À la fin de chaque aventure, une **fiche physique** (principe, formule, expérience à essayer).

## Prochaines étapes

- Chapitre 2 (poulies, cordes, contrepoids).
- Sauvegarder la progression (AsyncStorage).
- Glisser-déposer les pièces en atelier (aujourd'hui : toucher pour poser ou déplacer).
- Sons et animations de réussite et d'échec de Miko.

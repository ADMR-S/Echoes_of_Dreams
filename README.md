# Echoes_of_Dreams

Embarquez pour un voyage onirique déroutant ! Echoes of Dreams est un jeu en réalité virtuelle mélangeant puzzle et railshooter qui vous immergera dans le rêve de son personnage principal. Les lois de la physique s'y trouvent déformées et les effets de perspectives pourraient bien vous jouer un tour... Vous devrez parvenir à utiliser ces règles à votre avantage pour progresser dans le rêve et espérer parvenir au bout de la nuit.

Pour jouer au jeu, visitez le site sur lequel il est hébergé depuis un navigateur: [https://echoes-of-dreams-stable.onrender.com/](https://echoes-of-dreams-stable.onrender.com/). 

Il est préférable voire nécessaire d'utiliser un casque de réalité virtuelle et des manettes compatibles (le jeu a été développé et testé avec le [Meta Quest 2](https://www.meta.com/fr/en/quest/products/quest-2/)).

- [Lien du jeu](https://echoes-of-dreams-stable.onrender.com/)
- [Documentation](./Documentation.md)
- [Présentation vidéo](https://www.youtube.com/watch?v=Uwqi30tmJPo)

Jeu conçu et implémenté par :
Adam MIR-SADJADI
Noé FLORENCE
Allah-Eddine CHERIGUI

## Démarche 

Notre projet consiste à réaliser un jeu en Réalité Virtuelle comportant plusieurs scènes et phases de gameplay indépendantes. Le joueur s'y retrouve immergé dans un rêve décousu, où se succèdent différentes séquences allant de l'étrange au merveilleux. Le but de chaque niveau est d'atteindre la sortie, qui permet de passer au monde suivant. Une musique émanera de la sortie des niveaux, dont le design graphique reste à déterminer, et deviendra plus forte à mesure que l'on s'en rapproche. Une mort/défaite équivaudra au réveil du personnage que le joueur incarne au milieu de la nuit. Une animation le montrera se rendormir, ce qui aura pour effet de recommencer le rêve depuis le début (ou depuis la dernière séquence atteinte selon la difficulté et la durée du jeu).
Le but du jeu est de terminer toutes les séquences de jeu à la suite, équivalant à une bonne nuit de sommeil pour le personnage (nous espérions aussi pouvoir intégrer une cinématique en fin de jeu).

L'idée principale consistait à utiliser le contexte du rêve pour proposer durant les premiers niveaux plusieurs séquences de puzzle jouant sur la perspective forcée, inspirées du jeu [Superliminal](https://youtu.be/kl5qbQQsV3I?si=2YzUdbAHoxBdny6Z). L'une des motivations principales étant de mettre ce jeu de perspective à l'épreuve de la VR, considérant la différence existante entre un rendu 2D classique et un rendu de réalité virtuelle qui crée 2 images distinctes (une pour chaque oeil). Nous souhaitions d'abord relever le défi de parvenir à recréer cet effet à partir de nos observations et des informations récoltées quant à son fonctionnement, mais également voir si l'effet fonctionnait aussi bien en VR que dans Superliminal. À l'issue des ces phases de puzzle, le joueur est récompensé par une séquence entraînante type Railshooter où il pilote un lit volant avec lequel il doit éviter puis détruire des monstruosités en se dirigeant vers le soleil du petit matin.

## Résultat

Nous sommes parvenu à créer 2 scènes, l'une pour la partie Puzzle et l'autre pour la partie Railshooter. Nous travaillons encore à lier les deux scènes pour passer de l'une à l'autre fluidement (actuellement il faut appuyer sur le bouton B depuis l'une des scènes puis relancer l'expérience comme montré dans la vidéo de présentation du jeu).

La mécanique de perspective "Superliminal" a pu être développée avec succès pour la partie Puzzle, non sans mal et moyennant un débuggage minutieux, particulièrement après avoir intégré le moteur physique Havok à nos scènes pour pouvoir rapidement proposer au joueur un environnement "Bac à sable" dans lequel s'amuser avec cette mécanique. Nous travaillons encore sur l'intégration des puzzles et d'une scène Blender plus fournie pour enrichir l'expérience (obstacles, fossés, nouveaux angles de vue...), qui propose pour le moment simplement une boule de lumière et un pion d'échec manipulables en les sélectionnant/ déselectionnant avec le bouton X, ainsi qu'un mur pour tester les jeux de perspective.

La séquence Railshooter "à dos de lit" est plus fournie et est divisée en 3 phases : 
- Évitement d'obstacles : Il faut éviter les ennemis en pilotant le lit à l'aide du levier qui s'y trouve avec la gâchette droite et en inclinant la manette.
- Phase de tir : Détruisez les ennemis qui vous foncent dessus en leur tirant dessus avec votre gâchette
- Phase à l'épée : Découpez les ennemis qui vous attaquent pour finalement parvenir au bout de la nuit.

Merci à CGI France, l'équipe de Babylon JS et Michel BUFFA pour l'organisation de ce concours, l'opportunité qu'elle a représenté d'expérimenter dans un contexte ludique, et l'aide apportée durant le développement.

## Déploiement local : 

Installer les modules nécessaires : 

```
npm i
```

Déployer : 

```
 npm run dev
```

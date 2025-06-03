# Echoes_of_Dreams

Embarquez pour un voyage onirique déroutant ! Echoes of Dreams est un jeu en réalité virtuelle mélangeant puzzle et railshooter qui vous immergera dans le rêve de son personnage principal. Les lois de la physique s'y trouvent déformées et les effets de perspectives pourraient bien vous jouer un tour... Vous devrez parvenir à utiliser ces règles à votre avantage pour progresser dans le rêve et espérer parvenir au bout de la nuit.

Pour jouer au jeu, visitez le site sur lequel il est hébergé depuis un navigateur: [https://echoes-of-dreams-stable.onrender.com/](https://echoes-of-dreams-stable.onrender.com/). 

Il est préférable voire nécessaire d'utiliser un casque de réalité virtuelle et des manettes compatibles (le jeu a été développé et testé avec le [Meta Quest 2](https://www.meta.com/fr/en/quest/products/quest-2/)).

- [Lien du jeu](https://echoes-of-dreams-stable.onrender.com/)
- [Documentation](./Documentation.md)
- [Présentation vidéo](https://www.youtube.com/watch?v=Uwqi30tmJPo)

## Le Concept du Jeu

Jeu conçu et implémenté par :
Adam MIR-SADJADI
Noé FLORENCE
Allah-Eddine CHERIGUI

to run :
```bash
 npm run dev
```

modules to install :
```
npm install --save-dev @babylonjs/havok
npm install --save-dev @babylonjs/inspector
npm install --save-dev @babylonjs/core 

OR 

npm i
``` 


Pour changer de scène initiale, changer la scène créée dans createScene.ts. 
Ex :
```
export const getSceneModule = (): CreateSceneClass => {
    return new SceneNiveau3();
}
```
Remplacé par 
```
export const getSceneModule = (): CreateSceneClass => {
    return new Scene1Superliminal();
}
```



-----------------------------------------

DEMARCHE :

Notre projet est de réaliser un jeu en Réalité Virtuelle comportant plusieurs scènes et phases de gameplay indépendantes. Le joueur serait immergé dans un rêve décousu, où se succèdent différentes séquences allant de l'horrifique au merveilleux. Le but de chaque niveau est d'atteindre la sortie, qui permet de passer au monde suivant. Une musique émanera de la sortie, dont le design graphique reste à déterminer, et deviendra plus forte à mesure que l'on s'en rapproche.
Une mort/défaite (si implémentée) équivaudra au réveil du personnage que le joueur incarne au milieu de la nuit. Une cinématique pourrait le montrer se rendormir, ce qui aura pour effet de recommencer le rêve depuis le début (ou depuis la dernière séquence atteinte selon la difficulté du jeu).
Le but du jeu est de terminer toutes les séquences de jeu à la suite, équivalant à une bonne nuit de sommeil pour le personnage (nous espérons aussi pouvoir intégrer une cinématique en fin de jeu).

Nous travaillons actuellement sur deux phases distinctes (le jeu peut être amené à subir des changements majeurs en fonction des résultats des premières phases de développement): 
- Des séquences de Puzzle, inspirées du jeu Superliminal, dont la difficulté est de gérer les effets de grossissements et de perspective des objets. 
Nous développerons en priorité une séquence dans un monde féérique inspiré d'Alice au Pays des Merveilles, avec des sucreries dans le décor et un système d'îles flottantes qu'il faut traverser à l'aide de la mécanique de Puzzle. 
Si le temps le permet, nous développerons également une autre séquence dans une atmosphère de donjon, où le joueur commence dans la pénombre et doit allumer des lumières à l'aide de la mécanique de puzzle implémentée.

- Une séquence de railshooter en 2 phases, où le joueur contrôle un lit flottant dans l'espace qu'il contrôle à l'aide d'un levier. Il doit d'abord esquiver puis détruire des météorites qui foncent sur lui (nous testons actuellement un canon et une épée pour ces phases).


-----------------------------------------

TRAVAIL REALISE :

Pour le moment : 
- L'architecture globale du code a été posée pour un développement en TypeScript et fonctionne en déploiement grâce à Vite. La conception va être revue à la lumière des réultats des premiers tests effectués par chaque membre du groupe au sein des différentes scènes pour que le code soit maintenable et compréhensible par chaque membre. Il reste à mettre en place un build automatique pour héberger le jeu sur les pages github.
- Le moteur de physique Havok a été importé et activé dans nos scènes.
- Les mécaniques d'aggrandissement/rétrécissement des objets sont en train d'être développées pour la séquence de Puzzle Superliminal dans la scène Scene1Superliminal. Nous testons également des possibilités pour le changement entre deux scènes dans le fichier TS correspondant. Le déplacement du joueur est actuellement réalisé à l'aide du joystick mais sera remplacé par une mécanique de téléportation. Un test avec une skybox a également été effectué pour voir le rendu en VR.
- La séquence de railshooter est développée dans la scène SceneNiveau3. Le chargement des météorites en tant qu'Asset en est à ses balbutiements et doit être revu car il fait chuter drastiquement les performances du jeu. Des screenshots ont été pris pour la partie graphique du travail réalisé et se trouvent dans un répertoire "Screenshots" à la racine du projet

Nous devrons effectuer des tests approfondis concernant les effets de Motion Sickness qui pourraient apparaître et la difficulté pour le joueur à comprendre le but de chaque phase de gameplay. Nous porterons donc une attention particulière à ces points lors du développement.

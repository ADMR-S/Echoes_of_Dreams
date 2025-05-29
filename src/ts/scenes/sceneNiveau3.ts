import {Scene} from "@babylonjs/core/scene";
import {Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";
import {HemisphericLight} from "@babylonjs/core/Lights/hemisphericLight";
import 'babylonjs-loaders';
//import "@babylonjs/core/Physics/physicsEngineComponent";
// If you don't need the standard material you will still need to import it since the scene requires it.
//import "@babylonjs/core/Materials/standardMaterial";
import {PhysicsMotionType} from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import {HavokPlugin} from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import {havokModule} from "../externals/havok";
import {CreateSceneClass} from "../createScene";


import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
// @ts-ignore
import {
    Color3,
    Color4,
    Matrix,
    Mesh,
    MeshBuilder,
    Particle,
    ParticleSystem,
    PhysicsAggregate,
    PhysicsPrestepType,
    PhysicsShapeType,
    PointerDragBehavior,
    Ray,
    Scalar, Sound,
    StandardMaterial,
    WebXRControllerPhysics
} from "@babylonjs/core";

import {AbstractEngine} from "@babylonjs/core/Engines/abstractEngine";
import HavokPhysics from "@babylonjs/havok";

import {WebXRInputSource} from "@babylonjs/core/XR/webXRInputSource";
import {XRSceneWithHavok2} from "./a_supprimer/xrSceneWithHavok2.ts";
import {SceneLoader} from "@babylonjs/core/Loading/sceneLoader";
import {AbstractMesh} from "@babylonjs/core/Meshes/abstractMesh";
import {CubeTexture} from "@babylonjs/core/Materials/Textures/cubeTexture";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import {AdvancedDynamicTexture, Control, Rectangle, TextBlock} from "@babylonjs/gui";


export class SceneNiveau3 implements CreateSceneClass {
    preTasks = [havokModule];
    private hudTexture: AdvancedDynamicTexture | undefined;
    private distanceText: TextBlock | undefined;
    private hudBackground: Rectangle | undefined;

    private scoreFeedbackText: TextBlock | undefined;
    private scoreFeedbackTimeout: number | undefined;
    private backgroundMusic: Sound | null = null;

    // @ts-ignore
    createScene = async (engine: AbstractEngine, canvas : HTMLCanvasElement, audioContext : AudioContext): Promise<Scene> => {
        const scene: Scene = new Scene(engine);

        const light: HemisphericLight = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;
        const havokInstance = await HavokPhysics();


        const hk = new HavokPlugin(true, havokInstance);

        scene.enablePhysics(new Vector3(0, -9.8, 0), hk);
        // @ts-ignore
        const physicsEngine = scene.getPhysicsEngine();

        const platform = MeshBuilder.CreateGround("ground", { width: 2, height: 5 }, scene);
        const lit = await SceneLoader.ImportMeshAsync("", "/asset/", "lit.glb", scene);
        const litMesh = lit.meshes[0];

        litMesh.scaling.x = 2;
        litMesh.scaling.y = 2;
        litMesh.scaling.z = 2;
        litMesh.parent = platform;

        litMesh.position = new Vector3(0.7, -0.5, 0);
        litMesh.isPickable = true;
        platform.isVisible = false;


        //const platformAggregate = new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 1, restitution: 0.1 }, scene);
        /* if (platformAggregate.body.setMotionType) {
             platformAggregate.body.setMotionType(PhysicsMotionType.A);
         }*/

       // const barAsset = await SceneLoader.ImportMeshAsync("", "/asset/", "bar.glb", scene);
      //  let handlebar: AbstractMesh;
       // handlebar = barAsset.meshes[1];
       // handlebar.name = "handlebar";

        // @ts-ignore
        // handlebar.scaling = new Vector3(0.05, 0.1, 0.05);
       //const handlebar = MeshBuilder.CreateBox("handlebar", { height: 0.8, width: 0.1, depth: 0.1 }, scene);
        //const neutralLocalPos = new Vector3(0, 0.5, 0.9);

        const handlebar = MeshBuilder.CreateBox("handlebar", { height: 0.8, width: 0.1, depth: 0.1 }, scene);
        const neutralLocalPos = new Vector3(0, 1, 0.9);
        handlebar.parent = platform;
        handlebar.position = neutralLocalPos.clone();
        handlebar.isPickable = true;


        const dragBehavior = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 1, 0) });
        dragBehavior.moveAttached = false; // Désactive le déplacement automatique
        handlebar.addBehavior(dragBehavior);

        var skybox = MeshBuilder.CreateBox("skyBox", {size:1000.0}, scene);
        var skyboxMaterial = new StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture("asset/texture/GloriousPink", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skybox.material = skyboxMaterial;

        // Création du tunnel
        const tunnel = MeshBuilder.CreateBox("tunnel", { width: 10, height: 10, depth: 1000 }, scene);

        tunnel.position.z = 500;

        // Chargement du GLB
        const glbResult = await SceneLoader.ImportMeshAsync("", "/asset/", "test10.glb", scene);

        const glbMeshTemplate = glbResult.meshes[1];
        glbMeshTemplate.scaling.setAll(0.5);

        glbMeshTemplate.setEnabled(false);


        const obstacleAssetNames: string[] = [];
        for (let i = 1; i <= 9; i++) {
            obstacleAssetNames.push(`obstacle (${i}).glb`); // Attention aux espaces dans les noms de fichiers
        }
        const obstacleTemplates: AbstractMesh[] = [];
        for (const assetName of obstacleAssetNames) {
            try {
                // Assurez-vous que le chemin "/asset/" est correct pour ces obstacles
                const result = await SceneLoader.ImportMeshAsync("", "/asset/", assetName, scene);
                const templateMesh = result.meshes[1] as AbstractMesh; // Ou result.meshes[1] selon la structure du GLB
                if (templateMesh) {
                    templateMesh.setEnabled(false);
                    templateMesh.rotationQuaternion = null;

                   // templateMesh.rotation.z = Math.PI;
                    templateMesh.rotation.x = Math.PI*1.5; // Exemple pour pivoter sur X
                    templateMesh.scaling.setAll(0.03);

                    // templateMesh.rotation.z = Math.PI;

                    obstacleTemplates.push(templateMesh);
                } else {
                    console.warn(`Le mesh principal de ${assetName} n'a pas été trouvé.`);
                }
            } catch (e) {
                console.error(`Échec du chargement de l'asset d'obstacle ${assetName}:`, e);
            }
        }




        const obstacles: AbstractMesh [] = [];
        let nextObstacleSpawnZ = 20;
        const spawnAheadDistance = 100;
        const maxLevelZ = 700;
        const obstacleSpawnIntervalMin = 4;
        const obstacleSpawnIntervalMax = 8;
        let obstacleCounter = 0;

        // Fonction pour créer un obstacle
        const createSingleObstacle = (spawnZ: number): AbstractMesh | null => {
            obstacleCounter++;
            let obstacle: AbstractMesh | null = null;
            const isCustomAssetType = Math.random() < 0.7;
            let soundFile = "";

            if (isCustomAssetType && obstacleTemplates.length > 0) {
                const randomIndex = Math.floor(Math.random() * obstacleTemplates.length);
                const selectedTemplate = obstacleTemplates[randomIndex];
                if (!selectedTemplate) {
                    console.warn("Le template d'obstacle sélectionné est indéfini.");
                    return null;
                }
                // @ts-ignore
                obstacle = selectedTemplate.createInstance("customObstacle_" + obstacleCounter);

                if (obstacle) {
                    obstacle.setEnabled(true);
                    (obstacle as any).particleSmokeTrail = createBlackSmokeTrail(scene, obstacle);
                    (obstacle as any).obstacleGameType = "penalty";
                    soundFile = "/asset/sounds/boo.mp3";
                } else {
                    console.warn("Échec de la création d'une instance d'obstacle GLB personnalisé.");
                    return null;
                }
            } else {
                if (!glbMeshTemplate) return null;
                // @ts-ignore
                obstacle = glbMeshTemplate.createInstance("obstacleStarInstance_" + obstacleCounter);
                if (obstacle) {
                    (obstacle as any).particleAura = createRotatingRedAura(scene, obstacle);
                    (obstacle as any).obstacleGameType = "star";
                    soundFile = "/asset/sounds/starSparkle.mp3";

                } else {
                    console.warn("Impossible de créer une instance d'étoile");
                    return null;
                }
            }
            if (!obstacle) return null;

            const x = Math.random() * 8 - 4;
            const y = Math.random() * 8 - 4;
            obstacle.position.set(x, y, spawnZ);
            obstacle.isPickable = true;

            new PhysicsAggregate(obstacle, PhysicsShapeType.BOX, { mass: 0, restitution: 0 }, scene);

            if (soundFile) {
                const obstacleSound = new Sound(
                    "sound_" + obstacle.uniqueId,
                    soundFile,
                    scene,
                    () => {

                        if (obstacle && !obstacle.isDisposed() && obstacleSound) {
                            obstacleSound.attachToMesh(obstacle);
                            obstacleSound.play();
                        }
                    },
                    {
                        loop: true,
                        autoplay: false,
                        volume: 0.2,
                        spatialSound: true,
                        distanceModel: "linear",
                        maxDistance: 50,
                        rolloffFactor: 1.2
                    }
                );
                (obstacle as any).ambientSound = obstacleSound;


            }

            return obstacle;
        };

        const xr = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: 'immersive-vr'
            },
            optionalFeatures: true
        });

        var camera=  xr.baseExperience.camera;
        camera.parent = platform;

        const cameraHitbox = MeshBuilder.CreateSphere("cameraHitbox", { diameter: 1.1 }, scene);
        cameraHitbox.parent = camera;

        cameraHitbox.isVisible = false;
        cameraHitbox.isPickable = true;


        this.hudTexture = AdvancedDynamicTexture.CreateFullscreenUI("HUD_UI", true, scene);

        this.hudTexture = AdvancedDynamicTexture.CreateFullscreenUI("HUD_UI", true, scene);

        //HUD
        this.hudBackground = new Rectangle("hudBackground");
        this.hudBackground.width = "320px";
        this.hudBackground.height = "70px";
        this.hudBackground.cornerRadius = 10;
        this.hudBackground.color = "black";
        this.hudBackground.thickness = 2;
        this.hudBackground.background = "skyblue";
        this.hudBackground.alpha = 0.85;
        this.hudBackground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.hudBackground.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.hudBackground.paddingTop = "20px";
        this.hudTexture.addControl(this.hudBackground);

        this.distanceText = new TextBlock("hudMainText", "Chargement...");
        this.distanceText.color = "black";
        this.distanceText.fontSize = 18;
        this.distanceText.fontWeight = "bold";
        this.distanceText.textWrapping = true;
        this.distanceText.lineSpacing = "5px";
        this.distanceText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.distanceText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.hudBackground.addControl(this.distanceText);

        this.hudBackground.isVisible = true;

        this.scoreFeedbackText = new TextBlock("scoreFeedbackText", "");
        this.scoreFeedbackText.fontSize = 38;
        this.scoreFeedbackText.fontWeight = "bold";
        this.scoreFeedbackText.top = "100px";
        this.scoreFeedbackText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.scoreFeedbackText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.scoreFeedbackText.isVisible = false;
        this.hudTexture.addControl(this.scoreFeedbackText);


        //timer when shooting
        let timer = 0;
        //interval
        let interval = 300;
        let forwardSpeed = 1.5;   // déplacement en z
        let lateralSpeed = 0;   // sensibilité sur x
        let verticalSpeed = 0;  // sensibilité sur y
        let isDragging = false;
        let deltax = 0;
        let deltaz = 0;
        let currentTiltX = 0;
        let currentTiltZ = 0;
        let initialPosition = handlebar.position.clone();
        const projectiles: Mesh[] = [];
        let meteorSpawnTimer = 0; // en ms
        let part2StartTime: number | null = null;
        let part2Started = false;
        const meteores: Mesh[] = [];
        const swords: Mesh[] = [];
        let partie = 1;
        let gameProgressZ = 0;
        let part3StartTime: number | null = null;
        let part3Started = false;
        let timerpart2 = 180000;
        let timerpart3 = 180000;
        const spawnObstaclesIfNeeded = (currentProgressZ: number) => {

            while (nextObstacleSpawnZ < currentProgressZ + spawnAheadDistance && nextObstacleSpawnZ < maxLevelZ) {
                const numberOfObstaclesInWave = 1 + Math.floor(Math.random() * 3);
                for (let i = 0; i < numberOfObstaclesInWave; i++) {
                    const individualSpawnZ = nextObstacleSpawnZ + (Math.random() - 0.5) * 2;
                    const newObstacle = createSingleObstacle(individualSpawnZ);
                    if (newObstacle) {
                        obstacles.push(newObstacle);
                    }
                }
                nextObstacleSpawnZ += obstacleSpawnIntervalMin + Math.random() * (obstacleSpawnIntervalMax - obstacleSpawnIntervalMin);
            }
        };
        //partie 2
        xr.input.onControllerAddedObservable.add((controller) => {
            if (controller.inputSource.handedness === 'right') {
                controller.onMotionControllerInitObservable.add((motionController) => {
                    const triggerComponent = motionController.getComponent("xr-standard-trigger");
                    console.log(triggerComponent);
                    if (triggerComponent )  {
                        console.log("test");

                        triggerComponent.onButtonStateChangedObservable.add((component) => {
                            if (component.pressed && partie == 2) {
                                console.log("test");
                                if (Date.now() - timer < interval) {
                                    return;
                                }
                                else {
                                    timer = Date.now();
                                    shootProjectile(controller, scene, projectiles);

                                }
                            }
                        });
                    }
                });
            }
        });

        this.backgroundMusic = new Sound(
            "backgroundMusic",
            "/asset/sounds/background.mp3",
            scene,
            () => {
                if (this.backgroundMusic) {
                    this.backgroundMusic.play();
                    console.log("Musique de fond démarrée.");
                }
            },
            {
                loop: true,
                autoplay: false,
                volume: 0.6
            }
        );





        scene.onBeforeRenderObservable.add(() => {
            const dtMs = engine.getDeltaTime();
            const deltaTime = dtMs / 1000;

            const currentFrameForwardMovement = forwardSpeed * deltaTime;

            if (partie == 1) {
                if (this.hudBackground && !this.hudBackground.isVisible) {
                    this.hudBackground.isVisible = true;
                }
                gameProgressZ += currentFrameForwardMovement;

                spawnObstaclesIfNeeded(gameProgressZ);

                const lateralMovement = lateralSpeed * deltaTime;
                const verticalMovement = verticalSpeed * deltaTime;

                if (isDragging) {
                    if (deltax > 0) lateralSpeed += deltax * 0.1;
                    else if (deltax < 0) lateralSpeed += deltax * 0.1;

                    if (deltaz > 0) verticalSpeed += deltaz * 0.01;
                    else if (deltaz < 0) verticalSpeed += deltaz * 0.3;

                    verticalSpeed = Scalar.Clamp(verticalSpeed, -0.5, 0.5);
                    lateralSpeed = Scalar.Clamp(lateralSpeed, -0.5, 0.5);
                } else {
                    lateralSpeed = Scalar.Lerp(lateralSpeed, 0, deltaTime * 5);
                    verticalSpeed = Scalar.Lerp(verticalSpeed, 0, deltaTime * 5);
                }

                platform.position.y += verticalMovement;
                platform.position.x += lateralMovement;

                platform.position.y = Scalar.Clamp(platform.position.y, -1.8, 3);
                platform.position.x = Scalar.Clamp(platform.position.x, -4, 4);

                forwardSpeed += 0.002;
                if (this.distanceText) {
                    const distanceRestante = Math.max(0, (maxLevelZ+150) - gameProgressZ);
                    this.distanceText.text = `Partie 1\nDistance: ${distanceRestante.toFixed(0)}m`;
                }

                obstacles.forEach(obstacle => {
                    obstacle.position.z -= currentFrameForwardMovement;
                });

                //Nettoyage des obstacles
                for (let i = obstacles.length - 1; i >= 0; i--) {
                    const currentObstacle = obstacles[i];
                    let disposedThisFrame = false;
                    const playerHit = cameraHitbox.intersectsMesh(currentObstacle, false);
                    const bedHit = litMesh && (litMesh.intersectsMesh(currentObstacle, false) || litMesh.getChildMeshes(false).some(m => m.intersectsMesh(currentObstacle, true)));
                    if (playerHit || bedHit) {
                        console.log(`Collision détectée avec ${currentObstacle.name} par ${playerHit ? 'joueur' : 'lit'}!`);
                        const obstacleType = (currentObstacle as any).obstacleGameType;

                        if (obstacleType === "penalty") {
                            gameProgressZ -= 15;
                            this.showScoreFeedback("-15", "red");
                        } else if (obstacleType === "star") {
                            gameProgressZ -= 20;
                            this.showScoreFeedback("+20", "green");
                        }
                        if ((currentObstacle as any).ambientSound) {
                            (currentObstacle as any).ambientSound.stop();
                            (currentObstacle as any).ambientSound.dispose();
                        }
                        if ((currentObstacle as any).particleAura) {
                            (currentObstacle as any).particleAura.dispose(true,true);
                        }
                        if ((currentObstacle as any).particleSmokeTrail) {
                            (currentObstacle as any).particleSmokeTrail.dispose(true,true);
                        }
                        currentObstacle.dispose(false, true);
                        obstacles.splice(i, 1);
                        disposedThisFrame = true;

                    }

                    // Nettoyage des obstacles hors champ
                    if (!disposedThisFrame && currentObstacle.position.z < xr.baseExperience.camera.globalPosition.z - 20) {
                        if ((currentObstacle as any).ambientSound) {
                            (currentObstacle as any).ambientSound.stop();
                            (currentObstacle as any).ambientSound.dispose();
                        }
                        if ((currentObstacle as any).particleAura) {
                            (currentObstacle as any).particleAura.dispose(true,true);
                        }
                        if ((currentObstacle as any).particleSmokeTrail) {
                            (currentObstacle as any).particleSmokeTrail.dispose(true,true);
                        }
                        currentObstacle.dispose(false, true);
                        obstacles.splice(i, 1);
                    }
                    /*
                    if (currentObstacle.position.z < xr.baseExperience.camera.globalPosition.z - 20) {
                        if ((currentObstacle as any).particleAura) {
                            (currentObstacle as any).particleAura.dispose();
                        }
                        currentObstacle.dispose();
                        obstacles.splice(i, 1);
                        disposed = true;
                    } else if (!disposed && cameraHitbox.intersectsMesh(currentObstacle, false)) {
                        console.log("Collision détectée avec obstacle !");
                        if ((currentObstacle as any).particleAura) {
                            (currentObstacle as any).particleAura.dispose();
                        }
                        currentObstacle.dispose();
                        obstacles.splice(i, 1);
                    }*/
                }

              //  console.log(nextObstacleSpawnZ)
           //     console.log(obstacles.length)
                if (nextObstacleSpawnZ >= maxLevelZ && obstacles.length === 0) {
                    console.log("Partie 1 terminée");
                    partie = 2;
                    if(tunnel) tunnel.dispose();


                }
                if (nextObstacleSpawnZ >= maxLevelZ && obstacles.length === 0) {
                    console.log("Partie 1 terminée");
                    partie = 2;
                    if(tunnel) tunnel.dispose();
                }
            }
            // Partie 2
            else if (partie == 2) {
                if (!part2Started) {
                    part2Started = true;
                    part2StartTime = Date.now();
                    console.log("Partie 2 : les météores arrivent !");
                }

                if (this.distanceText && part2StartTime !== null) {
                    const elapsed = Date.now() - part2StartTime;
                    const remainingTime = timerpart2 - elapsed;
                    if (remainingTime <= 0) {
                        this.distanceText.text = "Partie 2\nTemps écoulé !";
                    } else {
                        this.distanceText.text = `Partie 2\nTemps restant: ${formatTime(remainingTime)}`;
                    }
                }

                const elapsedPart2Check = Date.now() - (part2StartTime as number);
                if (elapsedPart2Check >= timerpart2) {
                    console.log("Fin de la Partie 2, début Partie 3");
                    partie = 3;
                    projectiles.forEach(p => p.dispose());
                    projectiles.length = 0;
                    meteores.forEach(m => {
                        if (m.material) m.material.dispose();
                        m.dispose();
                    });
                    meteores.length = 0;
                    return;
                }

                const spawnInterval = 2000 - ((2000 - 500) * (elapsedPart2Check / 180000));
                meteorSpawnTimer += dtMs;
                if (meteorSpawnTimer >= spawnInterval) {
                    meteorSpawnTimer = 0;
                    const meteor = spawnMeteor(scene, platform);
                    meteores.push(meteor);
                }

                const meteorSpeed = 1.5;

                // Mise à jour de chaque météore
                for (let i = meteores.length - 1; i >= 0; i--) {
                    const meteor = meteores[i];
                    if (!meteor) { continue; }
                    const direction = platform.position.subtract(meteor.position).normalize();
                    meteor.position.addInPlace(direction.scale(meteorSpeed * deltaTime));

                    if (meteor.intersectsMesh(cameraHitbox, false)) {
                        console.log("Un météore a touché le joueur !");
                        meteor.dispose();
                        meteores.splice(i, 1);
                        continue;
                    }

                    for (let j = projectiles.length - 1; j >= 0; j--) {
                        const projectile = projectiles[j];
                        if (!projectile) { continue; }
                        if (meteor.intersectsMesh(projectile, false)) {
                            projectile.dispose();
                            projectiles.splice(j, 1);

                            meteor.metadata.hits = (meteor.metadata.hits || 0) + 1;
                            console.log(`Météore touché : ${meteor.metadata.hits} fois`);

                            const meteorMat = (meteor.material as StandardMaterial);
                            if (meteor.metadata.hits === 1) {
                                meteorMat.diffuseColor = new Color3(1, 0.5, 0.5);
                            } else if (meteor.metadata.hits === 2) {
                                meteorMat.diffuseColor = new Color3(1, 0.3, 0.3);
                            } else if (meteor.metadata.hits >= 3) {
                                console.log("Météore explosé !");
                                //TODO: explosion
                                meteor.dispose();
                                meteores.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }
            else if (partie == 3) {
                if (!part3Started) {
                    part3Started = true;
                    part3StartTime = Date.now();
                    console.log("Partie 3 : Attaque à l'épée !");
                    // Création des épées
                    xr.input.controllers.forEach((controller) => {
                        if (controller.grip) {
                            let swordExists = false;
                            for (const s of swords) {
                                if (s.parent === controller.grip) {
                                    swordExists = true;
                                    break;
                                }
                            }
                            if (!swordExists) {
                                const sword = createSword(controller, scene);
                                swords.push(sword);
                            }
                        }
                    });
                }

                if (this.distanceText && part3StartTime !== null) {
                    const elapsed = Date.now() - part3StartTime;
                    const remainingTime = timerpart3 - elapsed;
                    if (remainingTime <= 0) {
                        this.distanceText.text = "Partie 3\nNIVEAU TERMINÉ !";
                    } else {
                        this.distanceText.text = `Partie 3\nTemps restant: ${formatTime(remainingTime)}`;
                    }
                }

                const elapsedPart3Check = Date.now() - (part3StartTime as number);
                if (elapsedPart3Check >= timerpart3) {
                    console.log("Fin du niveau (Partie 3 terminée)");
                    //TODO fin
                    return;
                }

                const spawnInterval = 2000 - ((2000 - 500) * (elapsedPart3Check / 180000));
                meteorSpawnTimer += dtMs;
                if (meteorSpawnTimer >= spawnInterval) {
                    meteorSpawnTimer = 0;
                    const meteor = spawnMeteor(scene, platform);
                    meteores.push(meteor);
                }

                const meteorSpeed = 1.5;

                for (let i = meteores.length - 1; i >= 0; i--) {
                    const meteor = meteores[i];
                    if (!meteor) { continue; }
                    const direction = platform.position.subtract(meteor.position).normalize();
                    meteor.position.addInPlace(direction.scale(meteorSpeed * deltaTime));

                    if (meteor.intersectsMesh(cameraHitbox, false)) {
                        console.log("Un météore a touché le joueur !");
                        meteor.dispose();
                        meteores.splice(i, 1);
                        continue;
                    }

                    for (let s = 0; s < swords.length; s++) {
                        const sword = swords[s];
                        if (meteor.intersectsMesh(sword, false)) {
                            meteor.metadata.hits = (meteor.metadata.hits || 0) + 3;
                            console.log(`Météore touché par épée : ${meteor.metadata.hits} fois`);

                            const meteorMat = (meteor.material as StandardMaterial);
                            if (meteor.metadata.hits === 1) {
                                meteorMat.diffuseColor = new Color3(1, 0.5, 0.5);
                            } else if (meteor.metadata.hits === 2) {
                                meteorMat.diffuseColor = new Color3(1, 0.3, 0.3);
                            } else if (meteor.metadata.hits >= 3) {
                                console.log("Météore explosé !");
                                //TODO: explosion
                                meteor.dispose();
                                meteores.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            } else {
                if (this.hudBackground && this.hudBackground.isVisible) {
                    if (this.distanceText && this.distanceText.text !== "Partie 3\nNIVEAU TERMINÉ !") {
                        this.distanceText.text = "JEU TERMINÉ";
                    }
                }
            }


        });


        engine.runRenderLoop(() => {
            scene.render();
        });

        window.addEventListener("resize", () => {
            engine.resize();
        });

        hk.onCollisionObservable.add((ev) => {
            console.log(ev.type);
        });

        hk.onCollisionEndedObservable.add((ev) => {
            console.log(ev.type);
        })

        dragBehavior.onDragStartObservable.add((_event) => {
            isDragging = true;
            console.log("Guidon saisi");
            initialPosition = handlebar.position.clone();
        });

        dragBehavior.onDragObservable.add((event) => {
            const sensitivity = 0.05;
            currentTiltX += event.delta.z * sensitivity;
            currentTiltZ += event.delta.x * sensitivity;

            const maxTilt = Math.PI / 3;
            currentTiltX = Math.max(-maxTilt, Math.min(maxTilt, currentTiltX));
            currentTiltZ = Math.max(-maxTilt, Math.min(maxTilt, currentTiltZ));

            handlebar.rotation.x = currentTiltX;
            handlebar.rotation.z = currentTiltZ;

            handlebar.position.copyFrom(initialPosition);

            deltax = event.delta.x;
            deltaz = event.delta.z;
            /*
            if (event.delta.x > 0) {
                console.log("Guidon tiré vers la droite");
            } else if (event.delta.x < 0) {
                console.log("Guidon tiré vers la gauche");
            }
            if (event.delta.z > 0) {
                console.log("Guidon tiré vers l'avant");
            } else if (event.delta.z < 0) {
                console.log("Guidon tiré vers soi");
            }*/
        });

        dragBehavior.onDragEndObservable.add((_event) => {
            isDragging = false;
            console.log("Guidon relâché" , lateralSpeed, verticalSpeed);

        });

        scene.onBeforeRenderObservable.add(() => {
            if (!isDragging) {
                const dt = engine.getDeltaTime() / 1000;
                const returnSpeed = 1;

                currentTiltX = Scalar.Lerp(currentTiltX, 0, dt * returnSpeed);
                currentTiltZ = Scalar.Lerp(currentTiltZ, 0, dt * returnSpeed);

                handlebar.rotation.x = currentTiltX;
                handlebar.rotation.z = currentTiltZ;
            }
        });


        return scene;
    };

    private showScoreFeedback(text: string, color: string, duration: number = 1500) {
       if (!this.scoreFeedbackText) return;

        if (this.scoreFeedbackTimeout) {
            clearTimeout(this.scoreFeedbackTimeout);
        }
        this.scoreFeedbackText.text = text;
        this.scoreFeedbackText.color = color;
        this.scoreFeedbackText.isVisible = true;

        this.scoreFeedbackTimeout = window.setTimeout(() => {
            if (this.scoreFeedbackText) { // Vérifier si toujours existant (ex: changement de scène)
                this.scoreFeedbackText.isVisible = false;
            }
            this.scoreFeedbackTimeout = undefined;
        }, duration);
    }
}

export default new SceneNiveau3();


function spawnMeteor(scene: Scene, platform: Mesh): Mesh {

    const meteor = MeshBuilder.CreateSphere("obstacle", { diameter: 2 }, scene);
    const meteorMat = new StandardMaterial("meteorMat", scene);
    meteorMat.diffuseColor = new Color3(1, 1, 0);
    meteor.material = meteorMat;

    meteor.metadata = { hits: 0 };

    const spawnDistance = 100;
    const heightOffset = (Math.random() - 0.5) * 20;
    const zOffset = (Math.random() - 0.5) * 40;

    meteor.position = new Vector3(
        platform.position.x - spawnDistance,
        platform.position.y + heightOffset,
        platform.position.z + zOffset
    );

    return meteor;
}
function createSword(controller: WebXRInputSource, scene: Scene): Mesh {
    const sword = MeshBuilder.CreateBox("sword", { height: 1.2, width: 0.1, depth: 0.1 }, scene);
    sword.position = new Vector3(0, -0.3, 0.2);
    const swordMat = new StandardMaterial("swordMat", scene);
    swordMat.diffuseColor = new Color3(0.8, 0.8, 0.8);
    sword.material = swordMat;

    if (controller.grip) {
        sword.parent = controller.grip;
    }
    sword.isPickable = false;
    return sword;
}

function shootProjectile(controller: WebXRInputSource, scene: Scene, projectiles: Mesh[]) {
    const projectile = MeshBuilder.CreateSphere("projectile", { diameter: 0.2 }, scene);

    const aggregateProjectile = new PhysicsAggregate(projectile, PhysicsShapeType.SPHERE, { mass: 10 }, scene);
    aggregateProjectile.body.setMotionType(PhysicsMotionType.DYNAMIC);

    // Position de départ du projectile
    let startPos: Vector3;
    if (controller.grip) {
        startPos = controller.grip.getAbsolutePosition().clone();
    } else if (controller.pointer) {
        startPos = controller.pointer.getAbsolutePosition().clone();
    } else {
        startPos = scene.activeCamera!.position.clone();
    }
    projectile.position = startPos.clone();

    const tmpRay = new Ray(new Vector3(), new Vector3(), Infinity);
    controller.getWorldPointerRayToRef(tmpRay, true);
    tmpRay.direction.normalize();
    const impulseMagnitude = 150;
    aggregateProjectile.body.applyImpulse(
        tmpRay.direction.scale(impulseMagnitude),
        projectile.absolutePosition
    );

    projectiles.push(projectile);
}

// @ts-ignore
function switchScene(engine: AbstractEngine, scene : Scene) {
    scene.dispose();

    const newSceneInstance = new XRSceneWithHavok2();
    newSceneInstance.createScene(engine).then(newScene => {
        engine.runRenderLoop(() => {
            newScene.render();
        });
    });
}

// @ts-ignore
function addKeyboardControls(xr: any, moveSpeed: number) {

    window.addEventListener("keydown", (event: KeyboardEvent) => {

        switch (event.key) {
            case "z":
                xr.baseExperience.camera.position.z += moveSpeed;
                break;
            case "s":
                xr.baseExperience.camera.position.z -= moveSpeed;
                break;
            case "q":
                xr.baseExperience.camera.position.x -= moveSpeed;
                break;
            case "d":
                xr.baseExperience.camera.position.x += moveSpeed;
                break;
            case "f":
                xr.baseExperience.camera.position.y -= moveSpeed;
                break;
            case "r":
                xr.baseExperience.camera.position.y += moveSpeed;
                break;
        }
    });
}

// @ts-ignore
function addXRControllersRoutine(scene: Scene, xr: any, eventMask: number) {
    xr.input.onControllerAddedObservable.add((controller: any) => {        console.log("Ajout d'un controller")
        if (controller.inputSource.handedness === "left") {
            controller.onMotionControllerInitObservable.add((motionController: any) => {
                const xrInput = motionController.getComponent("xr-standard-thumbstick");
                if (xrInput) {
                    xrInput.onAxisValueChangedObservable.add((axisValues: any) => {
                        const speed = 0.05;
                        xr.baseExperience.camera.position.x += axisValues.x * speed;
                        xr.baseExperience.camera.position.z -= axisValues.y * speed;
                    });
                }
            });
        }
    });


    xr.input.onControllerAddedObservable.add((controller: any) => {
        controller.onMotionControllerInitObservable.add((motionController: any) => {
            // @ts-ignore
            motionController.onModelLoadedObservable.add((mc: any) => {

                console.log("Ajout d'un mesh au controller");

                const controllerMesh = MeshBuilder.CreateBox("controllerMesh", { size: 0.1 }, scene);
                controllerMesh.parent = controller.grip;
                controllerMesh.position = Vector3.ZeroReadOnly;
                controllerMesh.rotationQuaternion = Quaternion.Identity();

                const controllerAggregate = new PhysicsAggregate(controllerMesh, PhysicsShapeType.BOX, { mass: 1 }, scene);
                controllerAggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
                controllerAggregate.body.setPrestepType(PhysicsPrestepType.TELEPORT);
                controllerAggregate.body.setCollisionCallbackEnabled(true);
                controllerAggregate.body.setEventMask(eventMask);



                controllerMesh.isVisible = false;
                controllerMesh.isPickable = false;

                console.log("CONTROLLER")
                console.log(controller)
                const controllerPhysics = xr.baseExperience.featuresManager.enableFeature(WebXRControllerPhysics.Name, 'latest')
                controller.physics = controllerPhysics
                console.log("ICI")
                console.log(controllerPhysics)
                console.log(controllerPhysics.getImpostorForController(controller))

            });
        });
    });
}

function createRotatingRedAura(scene: Scene, parentObstacle: AbstractMesh): ParticleSystem {

    const particleSystem = new ParticleSystem("aura_" + parentObstacle.name, 200, scene);

    particleSystem.particleTexture = new Texture("https://playground.babylonjs.com/textures/flare.png", scene);

    particleSystem.emitter = parentObstacle;

    particleSystem.color1 = new Color4(1, 0.2, 0.2, 0.8);
    particleSystem.color2 = new Color4(0.8, 0, 0, 0.5);
    particleSystem.colorDead = new Color4(0.5, 0, 0, 0.0);


    const baseSize = 0.1;
    particleSystem.minSize = baseSize;
    particleSystem.maxSize = baseSize * 2.5;

    particleSystem.minLifeTime = 0.8;
    particleSystem.maxLifeTime = 1.5;

    particleSystem.emitRate = 150;

    const baseEmitPower = 0.2;
    particleSystem.minEmitPower = baseEmitPower;
    particleSystem.maxEmitPower = baseEmitPower * 1.5;
    particleSystem.updateSpeed = 0.005;

    parentObstacle.computeWorldMatrix(true);
    const boundingInfo = parentObstacle.getBoundingInfo();

    const localRadius = boundingInfo.boundingSphere.radius;
    const auraOrbitRadiusLocal = localRadius * 1.5;

    const localBoundingBox = boundingInfo.boundingBox;
    const localHeight = localBoundingBox.maximum.y - localBoundingBox.minimum.y; // Hauteur locale

    // @ts-ignore
    particleSystem.startPositionFunction = (worldMatrix: Matrix, positionToUpdate: Vector3, particle: Particle, isLocal: boolean): void => {
        const angle = Math.random() * Math.PI * 2;
        const x = auraOrbitRadiusLocal * Math.cos(angle);
        const z = auraOrbitRadiusLocal * Math.sin(angle);

        const y = localBoundingBox.center.y + (Math.random() - 0.5) * localHeight * 0.75;

        Vector3.TransformCoordinatesFromFloatsToRef(x, y, z, worldMatrix, positionToUpdate);
    };
    // @ts-ignore
    particleSystem.startDirectionFunction = (worldMatrix: Matrix, directionToUpdate: Vector3, particle: Particle, isLocal: boolean): void => {
        const particleWorldPosition = particle.position;
        const emitterWorldPosition = parentObstacle.absolutePosition;
        const worldRadialVector = particleWorldPosition.subtract(emitterWorldPosition);

        const localYAxisInWorld = Vector3.TransformNormal(Vector3.UpReadOnly, worldMatrix);

        let tangentWorld: Vector3;
        if (Math.abs(Vector3.Dot(worldRadialVector.normalize(), localYAxisInWorld.normalize())) > 0.99) {
            tangentWorld = Vector3.TransformNormal(Vector3.RightReadOnly, worldMatrix).normalize();
        } else {
            tangentWorld = Vector3.Cross(localYAxisInWorld, worldRadialVector).normalize();
        }

        directionToUpdate.copyFrom(tangentWorld);
    };

    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

    particleSystem.start();
    return particleSystem;
}
function createBlackSmokeTrail(scene: Scene, emitterMesh: AbstractMesh): ParticleSystem {
    const particleSystem = new ParticleSystem("distinctRearCloud_" + emitterMesh.name, 2000, scene); // Nom pour refléter le changement

    particleSystem.particleTexture = new Texture("https://playground.babylonjs.com/textures/flare.png", scene);

    particleSystem.emitter = emitterMesh;
    emitterMesh.computeWorldMatrix(true);

    const meshBoundingBox = emitterMesh.getBoundingInfo().boundingBox;
    const extendSize = meshBoundingBox.extendSize;
    const rearEmitterOffset = -(extendSize.y * 2);
    const headVolumeDepth = extendSize.y * 1.1;
    const headVolumeWidth = extendSize.x * 2 * 0.9;
    const headVolumeHeight = extendSize.z * 2 * 0.9;
    // @ts-ignore
    particleSystem.startPositionFunction = (worldMatrix: Matrix, positionToUpdate: Vector3, particle: Particle, isLocal: boolean): void => {
        const startYLocalForCloud = meshBoundingBox.maximum.y + rearEmitterOffset;

        const localPosition = new Vector3(
            (Math.random() - 0.5) * headVolumeWidth,
            startYLocalForCloud + (Math.random() * headVolumeDepth),
            (Math.random() - 0.5) * headVolumeHeight
        );
        Vector3.TransformCoordinatesToRef(localPosition, worldMatrix, positionToUpdate);
    };

    particleSystem.color1 = new Color4(0.1, 0.1, 0.1, 0.05);
    particleSystem.color2 = new Color4(0.12, 0.12, 0.12, 0.75);
    particleSystem.colorDead = new Color4(0.05, 0.05, 0.05, 0.0);

    const baseParticleSize = 0.008;
    particleSystem.minSize = baseParticleSize * 1.1;
    particleSystem.maxSize = baseParticleSize * 2.2;
    particleSystem.minLifeTime = 0.6;
    particleSystem.maxLifeTime = 1.2;
    particleSystem.emitRate = 850;

    particleSystem.minEmitPower = 0.0018;
    particleSystem.maxEmitPower = 0.0040;

    particleSystem.direction1 = new Vector3(-0.25, 0.4, -0.25);
    particleSystem.direction2 = new Vector3(0.25, 0.9, 0.25);

    particleSystem.minAngularSpeed = -Math.PI;
    particleSystem.maxAngularSpeed = Math.PI;

    // Gradients
    particleSystem.addSizeGradient(0, 0.2);
    particleSystem.addSizeGradient(0.25, 1.0);
    particleSystem.addSizeGradient(0.75, 0.3);
    particleSystem.addSizeGradient(1.0, 0.05);

    particleSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    particleSystem.start();
    return particleSystem;
}

function formatTime(ms: number): string {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
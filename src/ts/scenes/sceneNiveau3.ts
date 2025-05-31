import {Scene} from "@babylonjs/core/scene";
import {Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";
import {HemisphericLight} from "@babylonjs/core/Lights/hemisphericLight";
import 'babylonjs-loaders';
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
    PhysicsShapeType,
    PointerDragBehavior,
    Ray,
    Scalar, Sound,
    StandardMaterial, TransformNode
} from "@babylonjs/core";

import {AbstractEngine} from "@babylonjs/core/Engines/abstractEngine";
import HavokPhysics from "@babylonjs/havok";

import {WebXRInputSource} from "@babylonjs/core/XR/webXRInputSource";
import {SceneLoader} from "@babylonjs/core/Loading/sceneLoader";
import {AbstractMesh} from "@babylonjs/core/Meshes/abstractMesh";
import {CubeTexture} from "@babylonjs/core/Materials/Textures/cubeTexture";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import {AdvancedDynamicTexture, Control, Rectangle, TextBlock} from "@babylonjs/gui";
import {Tools} from "@babylonjs/core/Misc/tools";
import {Player} from "../Player.ts";
import XRHandler from "../XRHandler.ts";


export class SceneNiveau3 implements CreateSceneClass {
    preTasks = [havokModule];
    private hudTexture: AdvancedDynamicTexture | undefined;
    private distanceText: TextBlock | undefined;
    private hudBackground: Rectangle | undefined;

    private scoreFeedbackText: TextBlock | undefined;
    private scoreFeedbackTimeout: number | undefined;
    private backgroundMusic: Sound | null = null;
    private meteorCounter = 0;

    private shootSound: Sound | null = null;
    private isTriggerPressed: boolean = false;
    private lastProjectileShotTime: number = 0;
    private projectileFireRate: number = 120;
    private projectiles: Mesh[] = [];
    private readonly PROJECTILE_SPEED: number = 50;
    private readonly PROJECTILE_MAX_LIFETIME_MS: number = 3000;

    private swordSwingSounds: Sound[] = [];
    private lastSwordSwingSoundIndex: number = -1;
    private readonly SWORD_SWING_ANGULAR_VELOCITY_THRESHOLD: number = 2.5;
    private readonly SWORD_SWING_COOLDOWN_MS: number = 250;
    private lastSwingTimes: { [controllerId: string]: number } = {};
    private previousControllerRotations: { [controllerId: string]: Quaternion } = {};
    private swords: AbstractMesh[] = [];

    // @ts-ignore
    createScene = async (engine: AbstractEngine, canvas: HTMLCanvasElement, audioContext: AudioContext, player: Player, requestSceneSwitchFn: () => Promise<void>
    ): Promise<Scene> => {
        const scene: Scene = new Scene(engine);
        scene.metadata = { gameTime: 0 };

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
        if (glbMeshTemplate) {
            glbMeshTemplate.scaling.setAll(0.5);
            glbMeshTemplate.setEnabled(false);
        } else {
            console.warn("erreur test10.glb");
        }


        const obstacleAssetNames: string[] = [];
        for (let i = 1; i <= 9; i++) {
            obstacleAssetNames.push(`obstacle (${i}).glb`);
        }
        const obstacleTemplates: AbstractMesh[] = [];
        for (const assetName of obstacleAssetNames) {
            try {
                const result = await SceneLoader.ImportMeshAsync("", "/asset/", assetName, scene);
                const templateMesh = result.meshes[1] as AbstractMesh;
                if (templateMesh) {
                    templateMesh.setEnabled(false);
                    templateMesh.rotationQuaternion = null;

                   // templateMesh.rotation.z = Math.PI;
                    templateMesh.rotation.x = Math.PI*1.5;
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
        const maxLevelZ = 400;
        const obstacleSpawnIntervalMin = 4;
        const obstacleSpawnIntervalMax = 8;
        let obstacleCounter = 0;

        // Fonction obstacle
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
                    obstacle.setEnabled(true);
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

        console.log("BASE EXPERIENCE Scene1Superliminal");
        console.log(xr.baseExperience);

        new XRHandler(scene, xr, player, requestSceneSwitchFn);


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
       // let timer = 0;
        //interval
        let forwardSpeed = 1.5;
        let lateralSpeed = 0;
        let verticalSpeed = 0;
        let isDragging = false;
        let deltax = 0;
        let deltaz = 0;
        let currentTiltX = 0;
        let currentTiltZ = 0;
        let initialPosition = handlebar.position.clone();

        let meteorSpawnTimer = 0;
        let part2StartTime: number | null = null;
        let part2Started = false;
        const meteores: AbstractMesh[] = [];
      //  const swords: Mesh[] = [];
        let partie = 1;
        let gameProgressZ = 0;
        let part3StartTime: number | null = null;
        let part3Started = false;
        let timerpart2 = 180000;
        let timerpart3 = 180000;

        this.shootSound = new Sound("shootSound", "/asset/sounds/laser_shoot.wav", scene, null, { // Assurez-vous d'avoir un fichier son ici
            loop: false,
            autoplay: false,
            volume: 0.4
        });

        const swordSoundFiles = [
            "/asset/sounds/sword_swing_1.wav",
            "/asset/sounds/sword_swing_2.wav",
            "/asset/sounds/sword_swing_3.wav",
            "/asset/sounds/sword_swing_4.wav",
            "/asset/sounds/sword_swing_5.wav"
        ];
        swordSoundFiles.forEach((filePath, index) => {
            const sound = new Sound(`swordSwing${index}`, filePath, scene, null, {
                loop: false,
                autoplay: false,
                volume: 0.4
            });
            this.swordSwingSounds.push(sound);
        });

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
            (controller as any).aimNode = null;
            (controller as any).hasSword = false;

            controller.onMotionControllerInitObservable.add((motionController) => {
                if (controller.inputSource.handedness === 'right') {
                    const aimNodeParent = controller.pointer || controller.grip;
                    if (aimNodeParent) {
                        const aimNode = new TransformNode(`aimNode_${controller.uniqueId}`, scene);
                        aimNode.parent = aimNodeParent;
                        aimNode.rotation.x = Tools.ToRadians(-5);

                        (controller as any).aimNode = aimNode;
                    } else {
                        console.warn("Impossible de trouver un parent (pointer ou grip) pour l'aimNode de la manette droite.");
                    }

                    const triggerComponent = motionController.getComponent("xr-standard-trigger");
                    if (triggerComponent) {
                        triggerComponent.onButtonStateChangedObservable.add((component) => {
                            if (partie === 2) {
                                this.isTriggerPressed = component.pressed;
                                if (this.isTriggerPressed && (Date.now() - this.lastProjectileShotTime > this.projectileFireRate)) {
                                    this.shootProjectileInternal(controller, scene);
                                    this.lastProjectileShotTime = Date.now();
                                }
                            } else {
                                this.isTriggerPressed = false;
                            }
                        });
                    }
                }
                if (controller.grip && controller.grip.rotationQuaternion) {
                    this.previousControllerRotations[controller.uniqueId] = controller.grip.rotationQuaternion.clone();
                    this.lastSwingTimes[controller.uniqueId] = 0;
                }
            });
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
                volume: 0.5
            }
        );



        const MAX_METEOR_LIFETIME_MS = 30000;
        const MAX_STATIONARY_TIME_MS = 4000;
        const MIN_MOVEMENT_SQ_THRESHOLD = (0.05 * 0.05);

        scene.onBeforeRenderObservable.add(() => {
            const dtMs = engine.getDeltaTime();
            const deltaTime = dtMs / 1000;

            if (scene.metadata && typeof scene.metadata.gameTime === 'number') {
                scene.metadata.gameTime += dtMs;
            }
            if (this.isTriggerPressed && partie === 2) {
                if (Date.now() - this.lastProjectileShotTime > this.projectileFireRate) {
                    const rightController = xr.input.controllers.find(c => c.inputSource.handedness === 'right');
                    if (rightController) {
                        this.shootProjectileInternal(rightController, scene);
                        this.lastProjectileShotTime = Date.now();
                    }
                }
            }

            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.projectiles[i];
                if (projectile.isDisposed()) {
                    this.projectiles.splice(i, 1);
                    continue;
                }

                if (projectile.metadata && projectile.metadata.velocity) {
                    const moveDistance = projectile.metadata.velocity.scale(deltaTime);
                    projectile.position.addInPlace(moveDistance);

                    const lifetime = scene.metadata.gameTime - projectile.metadata.spawnTime;
                    const distanceFromOrigin = Vector3.Distance(projectile.position, xr.baseExperience.camera.globalPosition);

                    if (lifetime > this.PROJECTILE_MAX_LIFETIME_MS || distanceFromOrigin > 200) {
                        if ((projectile as any).projectileTrail) {
                            (projectile as any).projectileTrail.stop();
                            setTimeout(() => (projectile as any).projectileTrail?.dispose(true), 500);
                        }
                        projectile.dispose();
                        this.projectiles.splice(i, 1);
                    }
                }
            }

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
                            gameProgressZ += 20;
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
                    this.projectiles.forEach(p => p.dispose());
                    this.projectiles.length = 0;
                    meteores.forEach(m => {
                        if ((m as any).ambientSound) {
                            (m as any).ambientSound.stop(); (m as any).ambientSound.dispose();
                        }
                        if ((m as any).particleSmokeTrail) {
                            (m as any).particleSmokeTrail.dispose(true,true);
                        }
                        if (m.material)
                            m.material.dispose();
                        m.dispose(false, true);
                    });
                    meteores.length = 0;
                    return;
                }

                const spawnInterval = 2000 - ((2000 - 500) * (elapsedPart2Check / 180000));
                meteorSpawnTimer += dtMs;
                if (meteorSpawnTimer >= spawnInterval) {
                    meteorSpawnTimer = 0;
                    const meteor = spawnMeteor(scene, platform, obstacleTemplates, this.meteorCounter++);
                    if (meteor)
                        meteores.push(meteor);
                }

                const meteorSpeed = 2.5;

                for (let i = meteores.length - 1; i >= 0; i--) {
                    const meteor = meteores[i];
                    if (!meteor || meteor.isDisposed()) {
                        meteores.splice(i,1);
                        continue;
                    }
                    if (scene.metadata.gameTime - meteor.metadata.spawnTime > MAX_METEOR_LIFETIME_MS) {
                        disposeMeteor(meteor, meteores, i, "lifetime exceeded");
                        continue;
                    }
                    // @ts-ignore
                    const oldPos = meteor.position.clone();
                    const direction = platform.position.subtract(meteor.position).normalize();
                    meteor.position.addInPlace(direction.scale(meteorSpeed * deltaTime));
                    const distanceSq = Vector3.DistanceSquared(meteor.position, meteor.metadata.lastPosition);

                    if (distanceSq < MIN_MOVEMENT_SQ_THRESHOLD * deltaTime) {
                        meteor.metadata.stationaryAccumulator += dtMs;
                    } else {
                        meteor.metadata.stationaryAccumulator = 0;
                        meteor.metadata.lastPosition.copyFrom(meteor.position);
                    }
                    if (meteor.metadata.stationaryAccumulator > MAX_STATIONARY_TIME_MS) {
                        disposeMeteor(meteor, meteores, i, "inactivity"); continue;
                    }
                    if (meteor.intersectsMesh(cameraHitbox, false)) {
                        disposeMeteor(meteor, meteores, i, "hit player (P2)"); continue;
                    }
                    /*
                    if (meteor.intersectsMesh(cameraHitbox, false)) {
                        //console.log("Un météore a touché le joueur !");
                        if ((meteor as any).ambientSound) {
                            (meteor as any).ambientSound.stop();
                            (meteor as any).ambientSound.dispose();
                        }
                        if ((meteor as any).particleSmokeTrail) {
                            (meteor as any).particleSmokeTrail.dispose(true,true);
                        }
                        meteor.dispose(false, true);
                        meteores.splice(i, 1);
                        continue;
                    }*/

                    for (let j = this.projectiles.length - 1; j >= 0; j--) {
                        const projectile = this.projectiles[j];
                        if (!projectile || projectile.isDisposed()) { this.projectiles.splice(j, 1); continue; }
                        if (meteor.intersectsMesh(projectile, false)) {
                            if ((projectile as any).projectileTrail) { (projectile as any).projectileTrail.stop(); setTimeout(()=> (projectile as any).projectileTrail?.dispose(true), 500); }
                            projectile.dispose(); this.projectiles.splice(j, 1);
                            meteor.metadata.hits = (meteor.metadata.hits || 0) + 1;
                            const shrinkFactor = 0.75; meteor.scaling.scaleInPlace(shrinkFactor);
                            if (meteor.metadata.hits >= 3) { disposeMeteor(meteor, meteores, i, "destroyed by projectile (P2)"); break; }
                        }
                    }
                }
            }
            // Partie 3
            else if (partie == 3) {
                if (!part3Started) {
                    part3Started = true; part3StartTime = Date.now(); console.log("Partie 3 : Attaque à l'épée !");
                    xr.input.controllers.forEach((controller) => {
                        if (controller.grip) {
                            const existingSword = this.swords.find(s => s.parent === controller.grip);
                            if (!existingSword) {
                                const sword = createSword(controller, scene);
                                this.swords.push(sword);
                                (controller as any).hasSword = true;
                                if (controller.grip.rotationQuaternion) {
                                    this.previousControllerRotations[controller.uniqueId] = controller.grip.rotationQuaternion.clone();
                                }
                            }
                        }
                    });
                }
                if (this.distanceText && part3StartTime !== null) {
                    const elapsed = Date.now() - part3StartTime; const remainingTime = timerpart3 - elapsed;
                    this.distanceText.text = remainingTime <= 0 ? "Partie 3\nNIVEAU TERMINÉ !" : `Partie 3\nTemps restant: ${formatTime(remainingTime)}`;
                }
                const elapsedPart3Check = Date.now() - (part3StartTime as number);
                if (elapsedPart3Check >= timerpart3) {
                    console.log("Fin du niveau (Partie 3 terminée)"); partie = 4;
                    for (let i = meteores.length - 1; i >= 0; i--) { disposeMeteor(meteores[i], meteores, i, "part transition 3->End");}
                    this.swords.forEach(s => s.dispose());
                    this.swords.length = 0;
                    return;
                }
                const spawnInterval = Math.max(500, 2000 - ((2000 - 500) * (elapsedPart3Check / timerpart3)));
                meteorSpawnTimer += dtMs;
                if (meteorSpawnTimer >= spawnInterval) {
                    meteorSpawnTimer = 0;
                    const meteor = spawnMeteor(scene, platform, obstacleTemplates, this.meteorCounter++);
                    if (meteor) meteores.push(meteor);
                }
                const meteorSpeed = 2.0;

                if (this.swordSwingSounds.length > 0) {
                    xr.input.controllers.forEach(controller => {
                        if ((controller as any).hasSword && controller.grip && controller.grip.rotationQuaternion) {
                            const controllerId = controller.uniqueId;
                            const currentRotation = controller.grip.rotationQuaternion;
                            const previousRotation = this.previousControllerRotations[controllerId];

                            if (previousRotation) {
                                const diffQuaternion = currentRotation.multiply(Quaternion.Inverse(previousRotation));
                                let angleChange = 2 * Math.acos(Math.min(1, Math.abs(diffQuaternion.w)));
                                if (angleChange > Math.PI) angleChange = (2 * Math.PI) - angleChange;

                                const angularSpeed = angleChange / deltaTime;

                                if (angularSpeed > this.SWORD_SWING_ANGULAR_VELOCITY_THRESHOLD) {
                                    const now = Date.now();
                                    if (now - (this.lastSwingTimes[controllerId] || 0) > this.SWORD_SWING_COOLDOWN_MS) {
                                        this.lastSwordSwingSoundIndex = (this.lastSwordSwingSoundIndex + 1) % this.swordSwingSounds.length;
                                        const soundToPlay = this.swordSwingSounds[this.lastSwordSwingSoundIndex];

                                        const swordMesh = this.swords.find(s => s.parent === controller.grip);
                                        if (swordMesh && soundToPlay) {
                                            soundToPlay.attachToMesh(swordMesh);
                                        }
                                        soundToPlay?.play();
                                        this.lastSwingTimes[controllerId] = now;
                                    }
                                }
                            }
                            if(currentRotation) {
                                this.previousControllerRotations[controllerId] = currentRotation.clone();
                            }
                        }
                    });
                }

                for (let i = meteores.length - 1; i >= 0; i--) {
                    const meteor = meteores[i];
                    if (!meteor || meteor.isDisposed()) {
                        meteores.splice(i, 1);
                        continue;
                    }

                    if (scene.metadata.gameTime - meteor.metadata.spawnTime > MAX_METEOR_LIFETIME_MS) {
                        disposeMeteor(meteor, meteores, i, "lifetime exceeded (P3)");
                        continue;
                    }

                    const direction = platform.position.subtract(meteor.position).normalize();
                    meteor.position.addInPlace(direction.scale(meteorSpeed * deltaTime));

                    const distanceSq = Vector3.DistanceSquared(meteor.position, meteor.metadata.lastPosition);
                    if (distanceSq < MIN_MOVEMENT_SQ_THRESHOLD * deltaTime) {
                        meteor.metadata.stationaryAccumulator += dtMs;
                    } else {
                        meteor.metadata.stationaryAccumulator = 0;
                        meteor.metadata.lastPosition.copyFrom(meteor.position);
                    }
                    if (meteor.metadata.stationaryAccumulator > MAX_STATIONARY_TIME_MS) {
                        disposeMeteor(meteor, meteores, i, "inactivity (P3)");
                        continue;
                    }

                    if (meteor.intersectsMesh(cameraHitbox, false)) {
                        disposeMeteor(meteor, meteores, i, "hit player (P3)");
                        continue;
                    }

                    for (let s = this.swords.length - 1; s >= 0; s--) {
                        const sword = this.swords[s];
                        if (sword.isDisposed()) {
                            this.swords.splice(s,1);
                            continue;
                        }
                        if (meteor.intersectsMesh(sword, false)) {
                            meteor.metadata.hits = (meteor.metadata.hits || 0) + 3;
                            meteor.scaling.scaleInPlace(0.50);
                            if (meteor.metadata.hits >= 3) {
                                disposeMeteor(meteor, meteores, i, "destroyed by sword (P3)");
                                //gotoNextMeteorLoopIteration: break;  }
                        }
                    }

                }


            }
            }
            else if (partie === 4) {
                if (this.distanceText && this.distanceText.text !== "NIVEAU TERMINÉ !") {
                    this.distanceText.text = "NIVEAU TERMINÉ !";
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

    private shootProjectileInternal(controller: WebXRInputSource, scene: Scene) {
        const projectile = MeshBuilder.CreateSphere("projectile_" + this.projectiles.length, { diameter: 0.2 }, scene);
        const aimNode = (controller as any).aimNode as TransformNode;

        let startPos: Vector3;
        let fireDirection: Vector3;

        if (aimNode) {
            startPos = aimNode.getAbsolutePosition();
            fireDirection = aimNode.forward.normalize();
        } else {
            console.warn(`AimNode non trouvé pour la manette ${controller.uniqueId}. Utilisation de la direction par défaut du pointer/grip.`);
            const fallbackParent = controller.pointer || controller.grip;
            if (fallbackParent) {
                startPos = fallbackParent.getAbsolutePosition();
                const tempRay = new Ray(Vector3.Zero(), Vector3.Forward(), 1);
                controller.getWorldPointerRayToRef(tempRay, true);
                fireDirection = tempRay.direction.normalize();
            } else {
                startPos = scene.activeCamera!.position.clone();
                fireDirection = scene.activeCamera!.getDirection(Vector3.Forward());
            }
        }

        projectile.position = startPos.clone();
        projectile.metadata = {
            velocity: fireDirection.scale(this.PROJECTILE_SPEED),
            spawnTime: scene.metadata.gameTime
        };

        (projectile as any).projectileTrail = createPinkProjectileTrail(scene, projectile);
        this.projectiles.push(projectile);

        if (this.shootSound) {
            this.shootSound.play();
        }
      //  const linePoints = [startPos.clone(), startPos.clone().add(tmpRay.direction.scale(10))];
       // const lineMesh = MeshBuilder.CreateLines("debugLine", {points: linePoints}, scene);
        //setTimeout(() => lineMesh.dispose(), 500);
    }

    private showScoreFeedback(text: string, color: string, duration: number = 1500) {
       if (!this.scoreFeedbackText) return;

        if (this.scoreFeedbackTimeout) {
            clearTimeout(this.scoreFeedbackTimeout);
        }
        this.scoreFeedbackText.text = text;
        this.scoreFeedbackText.color = color;
        this.scoreFeedbackText.isVisible = true;

        this.scoreFeedbackTimeout = window.setTimeout(() => {
            if (this.scoreFeedbackText) {
                this.scoreFeedbackText.isVisible = false;
            }
            this.scoreFeedbackTimeout = undefined;
        }, duration);
    }
}

export default new SceneNiveau3();


// @ts-ignore
function disposeMeteor(meteor: AbstractMesh, meteorsArray: AbstractMesh[], index: number, reason: string) {
    if ((meteor as any).ambientSound) {
        (meteor as any).ambientSound.stop();
        (meteor as any).ambientSound.dispose();
    }
    if ((meteor as any).particleSmokeTrail) {
        (meteor as any).particleSmokeTrail.dispose(true, true);
    }
    if ((meteor as any).particleAura) {
        (meteor as any).particleAura.dispose(true,true);
    }
    meteor.dispose(false, true);
    if (index >= 0 && index < meteorsArray.length) {
        meteorsArray.splice(index, 1);
    } else if (meteorsArray.includes(meteor)) {
        const idx = meteorsArray.indexOf(meteor);
        if (idx > -1) meteorsArray.splice(idx, 1);
    }
}


function spawnMeteor(scene: Scene, platform: Mesh, obstacleTemplates: AbstractMesh[], meteorId: number): AbstractMesh | null {
    if (!obstacleTemplates || obstacleTemplates.length === 0) {
        console.warn("spawnMeteor: obstacleTemplates vide. Pas de création de météore.");
        return null;
    }
    const randomIndex = Math.floor(Math.random() * obstacleTemplates.length);
    const selectedTemplate = obstacleTemplates[randomIndex];
    if (!selectedTemplate) {
        console.warn("spawnMeteor: Template sélectionné indéfini.");
        return null;
    }

    // @ts-ignore
    const meteor = selectedTemplate.createInstance("meteorInstance_" + meteorId) as AbstractMesh;
    if (!meteor) {
        console.warn("spawnMeteor: Échec création instance.");
        return null;
    }
    meteor.setEnabled(true);

    (meteor as any).particleSmokeTrail = createBlackSmokeTrail(scene, meteor);
    (meteor as any).obstacleGameType = "penalty_meteor";

    meteor.metadata = {
        hits: 0,
        spawnTime: scene.metadata.gameTime,
        lastPosition: meteor.position.clone(),
        stationaryAccumulator: 0
    };

    const soundFile = "/asset/sounds/boo.mp3";
    const meteorSound = new Sound("sound_meteor_" + meteor.uniqueId, soundFile, scene,
        () => {
        if (meteor && !meteor.isDisposed() && meteorSound) {
            meteorSound.attachToMesh(meteor);
            meteorSound.play(); }},
        {loop: true, autoplay: false, volume: 0.2, spatialSound: true, distanceModel: "linear", maxDistance: 50, rolloffFactor: 1.2}
    );
    (meteor as any).ambientSound = meteorSound;

    const forwardAngle = Math.PI / 2;
    const spreadAngle = Math.PI / 3; 

    const randomOffsetAngle = (Math.random() - 0.5) * spreadAngle;

    const angleXZ = forwardAngle + randomOffsetAngle;    const randomRadius = Math.random() * 40 + 30;
    const xOffset = Math.cos(angleXZ) * randomRadius;
    const zOffset = Math.sin(angleXZ) * randomRadius;
    const heightOffset = Math.random() * 20 + 15;

    meteor.position = new Vector3(
        platform.position.x + xOffset,
        platform.position.y + heightOffset,
        platform.position.z + zOffset
    );
    meteor.isPickable = true;
    new PhysicsAggregate(meteor, PhysicsShapeType.BOX, { mass: 0, restitution: 0 }, scene);

    meteor.metadata.lastPosition.copyFrom(meteor.position);

    return meteor;
}

function createPinkProjectileTrail(scene: Scene, emitterMesh: AbstractMesh): ParticleSystem {
    const particleSystem = new ParticleSystem("projectileTrail_" + emitterMesh.name, 500, scene);
    particleSystem.particleTexture = new Texture("https://playground.babylonjs.com/textures/flare.png", scene); // Même texture, couleurs différentes

    particleSystem.emitter = emitterMesh;

    particleSystem.color1 = new Color4(1, 0.4, 0.8, 0.8);
    particleSystem.color2 = new Color4(0.8, 0.2, 0.6, 0.6);
    particleSystem.colorDead = new Color4(0.5, 0.1, 0.3, 0.0);

    const baseSize = 0.08;
    particleSystem.minSize = baseSize * 0.5;
    particleSystem.maxSize = baseSize * 1.2;

    particleSystem.minLifeTime = 0.1;
    particleSystem.maxLifeTime = 0.4;

    particleSystem.emitRate = 300;

    particleSystem.minEmitPower = 0.1;
    particleSystem.maxEmitPower = 0.3;
    particleSystem.updateSpeed = 0.005;

    particleSystem.direction1 = new Vector3(-0.1, -0.1, -0.1);
    particleSystem.direction2 = new Vector3(0.1, 0.1, 0.1);

    particleSystem.addVelocityGradient(0, 0.5);
    particleSystem.addVelocityGradient(1.0, 0.1);

    particleSystem.addSizeGradient(0, 0.2);
    particleSystem.addSizeGradient(0.5, 1);
    particleSystem.addSizeGradient(1.0, 0.1);


    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
    particleSystem.start();
    return particleSystem;
}

function createSword(controller: WebXRInputSource, scene: Scene): Mesh {
    const lanceHeight = 2.5;
    const lanceWidth = 0.08;
    const lanceDepth = 0.08;

    const sword = MeshBuilder.CreateBox("sword", {
        height: lanceHeight,
        width: lanceWidth,
        depth: lanceDepth
    }, scene);

    sword.position = new Vector3(
        0,
        -0.05,
        lanceHeight / 2
    );
    sword.position = new Vector3(0, -0.3, 0.2);
    const swordMat = new StandardMaterial("swordMat", scene);
    swordMat.diffuseColor = new Color3(0.6, 0.6, 0.7);
    sword.material = swordMat;

    if (controller.grip) {
        sword.parent = controller.grip;
        sword.rotationQuaternion = null;
        sword.rotation = new Vector3(
            Tools.ToRadians(-90),
            0,
            0
        );
    }
    sword.isPickable = false;
    return sword;
}
/*
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
*/
// @ts-ignore
/*
function switchScene(engine: AbstractEngine, scene : Scene) {
    scene.dispose();

    const newSceneInstance = new XRSceneWithHavok2();
    newSceneInstance.createScene(engine).then(newScene => {
        engine.runRenderLoop(() => {
            newScene.render();
        });
    });
}
*/

// @ts-ignore
/*
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
*/

// @ts-ignore
/*
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
*/

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
    const particleSystem = new ParticleSystem("distinctRearCloud_" + emitterMesh.name, 300, scene);

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
    particleSystem.maxSize = baseParticleSize * 1.8;
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
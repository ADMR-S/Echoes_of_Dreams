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
    Scalar,
    StandardMaterial,
    WebXRControllerPhysics,
    WebXRDefaultExperience
} from "@babylonjs/core";

import {AbstractEngine} from "@babylonjs/core/Engines/abstractEngine";
import HavokPhysics from "@babylonjs/havok";

import {WebXRInputSource} from "@babylonjs/core/XR/webXRInputSource";
import {XRSceneWithHavok2} from "./a_supprimer/xrSceneWithHavok2.ts";
import {SceneLoader} from "@babylonjs/core/Loading/sceneLoader";
import {AbstractMesh} from "@babylonjs/core/Meshes/abstractMesh";
import {CubeTexture} from "@babylonjs/core/Materials/Textures/cubeTexture";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import {AdvancedDynamicTexture, Rectangle, TextBlock} from "@babylonjs/gui";


export class SceneNiveau3 implements CreateSceneClass {
    preTasks = [havokModule];
    private hudTexture: AdvancedDynamicTexture;
    private distanceText: TextBlock;
    private hudBackground: Rectangle;
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
        //use lit.glb for the platform
        const litMesh = lit.meshes[0];

        litMesh.scaling.x = 2;
        litMesh.scaling.y = 2;
        litMesh.scaling.z = 2;
        litMesh.parent = platform;

        litMesh.position = new Vector3(0.7, -0.5, 0);

        platform.isVisible = false;


        //const platformAggregate = new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 1, restitution: 0.1 }, scene);
       /* if (platformAggregate.body.setMotionType) {
            platformAggregate.body.setMotionType(PhysicsMotionType.A);
        }*/

        const barAsset = await SceneLoader.ImportMeshAsync("", "/asset/", "bar.glb", scene);
        let handlebar: AbstractMesh;
        handlebar = barAsset.meshes[1];
        handlebar.name = "handlebar";


        // @ts-ignore
       // handlebar.scaling = new Vector3(0.05, 0.1, 0.05);
        //const handlebar = MeshBuilder.CreateBox("handlebar", { height: 0.8, width: 0.1, depth: 0.1 }, scene);
        const neutralLocalPos = new Vector3(0, 0.5, 0.9);
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
     //   const tunnelMat = new StandardMaterial("tunnelMat", scene);
     //   tunnelMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
       // tunnelMat.backFaceCulling = false;
       // tunnel.material = tunnelMat;
        tunnel.position.z = 500;

        // Chargement du GLB
        const glbResult = await SceneLoader.ImportMeshAsync("", "/asset/", "test10.glb", scene);
    //    const glbMeshTemplate = glbResult.meshes[1];
      //  console.log("Résultat du chargement GLB:", glbResult);
      //  console.log("Meshes chargés:", glbResult.meshes);
       // const meshParent = glbResult.meshes[1];
        const glbMeshTemplate = glbResult.meshes[1];
        glbMeshTemplate.scaling.setAll(0.5); // Ajustez la taille si nécessaire
        // Positionnez-le pour le voir
        glbMeshTemplate.setEnabled(false); // Assurez-vous qu'il est visible
      //x  console.log("Template de l'étoile:"meshEnfant.parent = meshParent;

        // on le cache

        // Matériau unique pour les cubes
        const cubeMat = new StandardMaterial("cubeMat", scene);
        cubeMat.diffuseColor = new Color3(0, 1, 0);

        const obstacles: AbstractMesh [] = []; // Reste la liste des obstacles actifs
        let nextObstacleSpawnZ = 20; // Commencer à spawner des obstacles à Z=20
                                     // Ajustez en fonction de la position initiale de la plateforme
        const spawnAheadDistance = 150; // Générer des obstacles jusqu'à 150 unités devant la plateforme
        const maxLevelZ = 1000; // Z maximal pour la partie 1
        const obstacleSpawnIntervalMin = 4; // Z minimum entre chaque "vague" d'obstacles
        const obstacleSpawnIntervalMax = 8; // Z maximum entre chaque "vague" d'obstacles
        let obstacleCounter = 0;

        // Fonction pour créer un obstacle (cube ou étoile)
        const createSingleObstacle = (spawnZ: number): AbstractMesh | null => {
            obstacleCounter++;
            const isCube = Math.random() < 0.5;
            let obstacle: Mesh;

            if (isCube) {
                obstacle = MeshBuilder.CreateBox("obstacleCube_" + obstacleCounter, { size: 1 }, scene);
                obstacle.material = cubeMat;
            } else {
                if (!glbMeshTemplate) return null; // Sécurité si le template n'est pas chargé
                // @ts-ignore
                obstacle = glbMeshTemplate.createInstance("obstacleStarInstance_" + obstacleCounter);
                if (obstacle) { // createInstance peut retourner null si le template a des soucis
                    (obstacle as any).particleAura = createRotatingRedAura(scene, obstacle); // createRotatingRedAura doit être définie
                } else {
                    console.warn("Impossible de créer une instance d'étoile");
                    return null;
                }
            }

            const x = Math.random() * 8 - 4; // Un peu moins large pour éviter les bords du tunnel ?
            const y = Math.random() * 8 - 4; // Ajustez selon la taille du tunnel/zone jouable
            obstacle.position.set(x, y, spawnZ);

            // Collision simplifiée : BOX pour tout le monde
            new PhysicsAggregate(obstacle, PhysicsShapeType.BOX, { mass: 0, restitution: 0 }, scene);
            return obstacle;
        };

        // Fonction pour vérifier et générer des obstacles si nécessaire
        const spawnObstaclesIfNeeded = () => {
            // Condition pour continuer à spawner pendant la partie 1
            while (nextObstacleSpawnZ < platform.position.z + spawnAheadDistance && nextObstacleSpawnZ < maxLevelZ) {
                // Vous pouvez décider de spawner un ou plusieurs obstacles à chaque "vague"
                const numberOfObstaclesInWave = 1 + Math.floor(Math.random() * 3); // 1 à 3 obstacles par vague
                for (let i = 0; i < numberOfObstaclesInWave; i++) {
                    // Léger décalage en Z pour les obstacles d'une même vague pour éviter une ligne parfaite
                    const individualSpawnZ = nextObstacleSpawnZ + (Math.random() - 0.5) * 2;
                    const newObstacle = createSingleObstacle(individualSpawnZ);
                    if (newObstacle) {
                        obstacles.push(newObstacle);
                    }
                }
                nextObstacleSpawnZ += obstacleSpawnIntervalMin + Math.random() * (obstacleSpawnIntervalMax - obstacleSpawnIntervalMin);
            }
        };

       /* const target = MeshBuilder.CreateBox("target", { size: 1 }, scene);
        target.position = new Vector3(0, 1, 5);
        var targetAggregate = new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 0 }, scene);
        targetAggregate.body.setCollisionCallbackEnabled(true);

*/

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
        let part3StartTime: number | null = null;
        let part3Started = false;
        let timerpart2 = 180000;
        let timerpart3 = 180000;

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




        scene.onBeforeRenderObservable.add(() => {
            const dtMs = engine.getDeltaTime();      // dtMs en millisecondes
            const deltaTime = dtMs / 1000;        // deltaTime en secondes

            if (partie == 1) {
                // Générer de nouveaux obstacles si nécessaire
                spawnObstaclesIfNeeded();

                // Si nextObstacleSpawnZ a dépassé la limite ET qu'il n'y a plus d'obstacles à l'écran
                if (nextObstacleSpawnZ >= maxLevelZ && obstacles.length === 0) {
                    console.log("Partie 1 terminée");
                    partie = 2;
                    // Potentiellement, commencez déjà à nettoyer des éléments de la partie 1 ici si besoin
                    // tunnel.dispose(); // Vous le faites déjà au début de la partie 2, c'est bien
                } else { // Continue la logique de la partie 1
                    const forwardMovement = forwardSpeed * deltaTime;
                    const lateralMovement = lateralSpeed * deltaTime;
                    const verticalMovement = verticalSpeed * deltaTime;
                    //forwardSpeed += 0.0005; // J'ai un peu réduit l'accélération, ajustez si besoin

                    forwardSpeed += 0.002;

                    //   console.log("lateralSpeed", lateralSpeed);
                    //   console.log("verticalSpeed", verticalSpeed);
                    //  console.log("lateralMovement", lateralMovement);
                    //  console.log("verticalMovement", verticalMovement);
                    if (isDragging) {
                        if (deltax > 0) lateralSpeed += deltax * 0.1;
                        else if (deltax < 0) lateralSpeed += deltax * 0.1;

                        if (deltaz > 0) verticalSpeed += deltaz * 0.01; // Vers l'avant du guidon
                        else if (deltaz < 0) verticalSpeed += deltaz * 0.3; // Vers soi

                        verticalSpeed = Scalar.Clamp(verticalSpeed, -0.5, 0.5);
                        lateralSpeed = Scalar.Clamp(lateralSpeed, -0.5, 0.5);
                    } else {
                        lateralSpeed = Scalar.Lerp(lateralSpeed, 0, deltaTime * 5); // Retour plus doux
                        verticalSpeed = Scalar.Lerp(verticalSpeed, 0, deltaTime * 5); // Retour plus doux
                    }

                    platform.position.y += verticalMovement;
                    platform.position.x += lateralMovement;

                    // Clamp platform position
                    platform.position.y = Scalar.Clamp(platform.position.y, -1.8, 3);
                    platform.position.x = Scalar.Clamp(platform.position.x, -4, 4);


                    // Déplacement des obstacles existants
                    // Ce forEach ne s'exécutera que sur les obstacles actuellement dans le tableau `obstacles`
                    obstacles.forEach(obstacle => {
                        // Les obstacles sont statiques en X et Y par rapport au "monde du tunnel"
                        // C'est la plateforme qui bouge latéralement et verticalement.
                        // Les obstacles ne bougent qu'en Z vers le joueur (ou le joueur avance vers eux)
                        obstacle.position.z -= forwardMovement; // Le monde défile vers le joueur
                    });


                    // Nettoyage des obstacles dépassés ou touchés
                    for (let i = obstacles.length - 1; i >= 0; i--) {
                        const currentObstacle = obstacles[i];
                        let disposed = false;

                        // Condition de nettoyage basée sur la position Z de la caméra (ou de la plateforme si la caméra est enfant)
                        // Assurez-vous que platform.position.z est la référence correcte pour "derrière le joueur"
                        if (currentObstacle.position.z < xr.baseExperience.camera.globalPosition.z - 20) { // 20 unités derrière la caméra
                            if ((currentObstacle as any).particleAura) {
                                (currentObstacle as any).particleAura.dispose();
                            }
                            currentObstacle.dispose();
                            obstacles.splice(i, 1);
                            disposed = true;
                        } else if (!disposed && cameraHitbox.intersectsMesh(currentObstacle, false)) { // Utilisez cameraHitbox
                            console.log("Collision détectée avec obstacle !");
                            // Ici, vous pourriez vouloir déclencher un effet, perdre une vie, etc.
                            // avant de disposer l'obstacle.
                            if ((currentObstacle as any).particleAura) {
                                (currentObstacle as any).particleAura.dispose();
                            }
                            currentObstacle.dispose(); // Disposez après la gestion de la collision
                            obstacles.splice(i, 1);
                        }
                    }
                } // Fin de la logique de la partie 1
            }
            // Partie 2
            else if (partie == 2) {
                if (!part2Started) {
                    part2Started = true;
                    part2StartTime = Date.now();
                    console.log("Partie 2 : les météores arrivent !");
                    tunnel.dispose();
                }

                const elapsed = Date.now() - (part2StartTime as number);
                if (elapsed >= timerpart2) { // 3 minutes
                    console.log("Fin du niveau");
                    partie = 3;
                    return;
                }

                const spawnInterval = 2000 - ((2000 - 500) * (elapsed / 180000));
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

                    console.log("Partie 3 : les météores arrivent !");
                    xr.input.controllers.forEach((controller) => {
                        const sword = createSword(controller, scene);
                        swords.push(sword);
                    });
                }

                const elapsed = Date.now() - (part3StartTime as number);
                if (elapsed >= timerpart3) { // 3 minutes
                    console.log("Fin du niveau");
                    //TODO: fin du niveau
                    return;
                }

                const spawnInterval = 2000 - ((2000 - 500) * (elapsed / 180000));
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

// Add movement with left joystick
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


    // Add physics to controllers when the mesh is loaded
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
                controllerAggregate.body.setMotionType(PhysicsMotionType.ANIMATED); // Set motion type to ANIMATED
                controllerAggregate.body.setPrestepType(PhysicsPrestepType.TELEPORT);
                controllerAggregate.body.setCollisionCallbackEnabled(true);
                controllerAggregate.body.setEventMask(eventMask);



                // Make the controller mesh invisible and non-pickable
                controllerMesh.isVisible = false;
                controllerMesh.isPickable = false;

                // Attach WebXRControllerPhysics to the controller
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
    // Crée un système de particules standard
    const particleSystem = new ParticleSystem("aura_" + parentObstacle.name, 200, scene); // Max 200 particules par système

    // Texture des particules (une simple image de point/flare)
    // Remplacez par l'URL de votre texture si vous en avez une spécifique
    particleSystem.particleTexture = new Texture("https://playground.babylonjs.com/textures/flare.png", scene);

    // L'émetteur est l'obstacle lui-même
    particleSystem.emitter = parentObstacle;

    // Couleurs : rouge, s'estompant vers le transparent
    particleSystem.color1 = new Color4(1, 0.2, 0.2, 0.8); // Rouge vif
    particleSystem.color2 = new Color4(0.8, 0, 0, 0.5);   // Rouge plus sombre
    particleSystem.colorDead = new Color4(0.5, 0, 0, 0.0); // Disparition en rouge transparent

    // Taille des particules
    // Ajustez ces valeurs en fonction de la taille de vos étoiles après scaling
    const baseSize = 0.1;
    particleSystem.minSize = baseSize;
    particleSystem.maxSize = baseSize * 2.5;

    // Durée de vie des particules
    particleSystem.minLifeTime = 0.8;
    particleSystem.maxLifeTime = 1.5;

    // Taux d'émission
    particleSystem.emitRate = 150;

    // Vitesse initiale des particules
    const baseEmitPower = 0.2;
    particleSystem.minEmitPower = baseEmitPower;
    particleSystem.maxEmitPower = baseEmitPower * 1.5;
    particleSystem.updateSpeed = 0.005; // Ralentissement optionnel des particules

    // Force la mise à jour de la matrice et des informations de délimitation de l'obstacle
    parentObstacle.computeWorldMatrix(true);
    const boundingInfo = parentObstacle.getBoundingInfo();

    // Utilise les dimensions locales pour définir la forme de l'émission par rapport au pivot de l'obstacle
    const localRadius = boundingInfo.boundingSphere.radius; // Rayon local de la sphère de délimitation
    const auraOrbitRadiusLocal = localRadius * 1.5; // Rayon de l'orbite en unités locales (1.5x la taille de l'objet)

    const localBoundingBox = boundingInfo.boundingBox;
    const localHeight = localBoundingBox.maximum.y - localBoundingBox.minimum.y; // Hauteur locale

    // Fonction pour définir la position de départ des particules
    particleSystem.startPositionFunction = (worldMatrix: Matrix, positionToUpdate: Vector3, particle: Particle, isLocal: boolean): void => {
        const angle = Math.random() * Math.PI * 2; // Angle aléatoire pour une distribution circulaire
        const x = auraOrbitRadiusLocal * Math.cos(angle);
        const z = auraOrbitRadiusLocal * Math.sin(angle);
        // Répartit les particules le long de l'axe Y local de l'obstacle, centré sur sa boîte de délimitation
        const y = localBoundingBox.center.y + (Math.random() - 0.5) * localHeight * 0.75;

        // Transforme les coordonnées locales (x, y, z) en coordonnées mondiales
        Vector3.TransformCoordinatesFromFloatsToRef(x, y, z, worldMatrix, positionToUpdate);
    };

    // Fonction pour définir la direction de départ des particules (pour l'effet de rotation)
    particleSystem.startDirectionFunction = (worldMatrix: Matrix, directionToUpdate: Vector3, particle: Particle, isLocal: boolean): void => {
        const particleWorldPosition = particle.position; // Position mondiale de la particule (déjà définie par startPositionFunction)
        const emitterWorldPosition = parentObstacle.absolutePosition; // Position mondiale de l'émetteur (centre de l'obstacle)

        // Vecteur du centre de l'émetteur à la particule, en coordonnées mondiales
        const worldRadialVector = particleWorldPosition.subtract(emitterWorldPosition);

        // Axe Y local de l'obstacle, transformé en coordonnées mondiales
        const localYAxisInWorld = Vector3.TransformNormal(Vector3.UpReadOnly, worldMatrix);

        let tangentWorld: Vector3;
        if (Math.abs(Vector3.Dot(worldRadialVector.normalize(), localYAxisInWorld.normalize())) > 0.99) {
            tangentWorld = Vector3.TransformNormal(Vector3.RightReadOnly, worldMatrix).normalize();
        } else {
            // Calcule la tangente par produit vectoriel (donne un vecteur perpendiculaire aux deux autres)
            tangentWorld = Vector3.Cross(localYAxisInWorld, worldRadialVector).normalize();
        }

        // if (Math.random() < 0.5) { tangentWorld.scaleInPlace(-1); }

        directionToUpdate.copyFrom(tangentWorld);
    };

    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

    particleSystem.start();
    return particleSystem;
}


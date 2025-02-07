// IMPLEMENTATION D'ADAM INSPIREE DES EXEMPLES DE BABYLONJS

import { Scene } from "@babylonjs/core/scene";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
//import "@babylonjs/core/Physics/physicsEngineComponent";

// If you don't need the standard material you will still need to import it since the scene requires it.
//import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { havokModule } from "../externals/havok";
import { CreateSceneClass } from "../createScene";


import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {
    Mesh,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsShapeType,
    PhysicsPrestepType,
    WebXRControllerPhysics, Ray, StandardMaterial, Color3,
    StandardMaterial
} from "@babylonjs/core";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import HavokPhysics from "@babylonjs/havok";
import {XRSceneWithHavok2} from "./xrSceneWithHavok2.ts";

import XRDrumKit from "../xrDrumKit"
import {WebXRInputSource} from "@babylonjs/core/XR/webXRInputSource";


export class XRSceneWithHavok3 implements CreateSceneClass {
    preTasks = [havokModule];

    
    createScene = async (engine: AbstractEngine, canvas : HTMLCanvasElement, audioContext : AudioContext): Promise<Scene> => {
        const scene: Scene = new Scene(engine);

        const light: HemisphericLight = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;
        const havokInstance = await HavokPhysics();


        const hk = new HavokPlugin(true, havokInstance);

        scene.enablePhysics(new Vector3(0, -9.8, 0), hk);
        const physicsEngine = scene.getPhysicsEngine();

        const platform = MeshBuilder.CreateGround("ground", { width: 2, height: 5 }, scene);
        //const platformAggregate = new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 1, restitution: 0.1 }, scene);
       /* if (platformAggregate.body.setMotionType) {
            platformAggregate.body.setMotionType(PhysicsMotionType.A);
        }*/







        const tunnel = MeshBuilder.CreateBox("tunnel", { width: 10, height: 10, depth: 1000 }, scene);
        const tunnelMat = new StandardMaterial("tunnelMat", scene);
        tunnelMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
        tunnelMat.backFaceCulling = false;
        tunnel.material = tunnelMat;
        tunnel.position.z = 500;
        const obstacles: Mesh[] = [];

        let positionz = -10;
        while (positionz < 1000) {
            const isCube = Math.random() < 0.5;
            let obstacle: Mesh;
            const size = 1;
            if (isCube) {
                obstacle = MeshBuilder.CreateBox("obstacle", { size: size }, scene);
            } else {
                obstacle = MeshBuilder.CreateSphere("obstacle", { diameter: size }, scene);
            }
            const obstacleMat = new StandardMaterial("obstacleMat", scene);
            obstacleMat.diffuseColor = new Color3(0, 1, 0);
            obstacle.material = obstacleMat;

            const x = Math.random() * 10;
            const y = Math.random() * 10;
            positionz = 1 + Math.random() * 2 +positionz;
            obstacle.position = new Vector3(x, y, positionz);

            const shapeType = isCube ? PhysicsShapeType.BOX : PhysicsShapeType.SPHERE;
            new PhysicsAggregate(obstacle, shapeType, { mass: 0, restitution: 0 }, scene);
            obstacles.push(obstacle);
        }

        const target = MeshBuilder.CreateBox("target", { size: 1 }, scene);
        target.position = new Vector3(0, 1, 5);
        var targetAggregate = new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 0 }, scene);
        targetAggregate.body.setCollisionCallbackEnabled(true);

        const xr = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: 'immersive-vr'
            },
            optionalFeatures: true
        });

        var camera=  xr.baseExperience.camera;

        camera.parent = platform;

        //timer when shooting
        let timer = 0;
        //interval
        let interval = 500;





        xr.input.onControllerAddedObservable.add((controller) => {
            if (controller.inputSource.handedness === 'right') {
                controller.onMotionControllerInitObservable.add((motionController) => {
                    const triggerComponent = motionController.getComponent("xr-standard-trigger");
                    console.log(triggerComponent);
                    if (triggerComponent) {
                        triggerComponent.onButtonStateChangedObservable.add((component) => {
                            if (component.pressed) {
                                console.log("test");
                                if (Date.now() - timer < interval) {
                                    return;
                                }
                                else {
                                    timer = Date.now();
                                    shootProjectile(controller, scene, target);

                                }
                            }
                        });
                    }
                });
            }
        });

        const forwardSpeed = 1;   // déplacement en z

        scene.onBeforeRenderObservable.add(() => {
            const deltaTime = engine.getDeltaTime() / 1000; // en secondes

            const forwardMovement = forwardSpeed * deltaTime;
            obstacles.forEach(obstacle => {
                obstacle.position.z -= forwardMovement;
            })

            obstacles.forEach(obstacle => {
                if (platform.intersectsMesh(obstacle, false)) {
                    console.log("Collision détectée !");
                }
            });

            // Nettoyage des obstacles dépassés
            for (let i = obstacles.length - 1; i >= 0; i--) {
                if (obstacles[i].position.z < platform.position.z - 10) {
                    obstacles[i].dispose();
                    obstacles.splice(i, 1);
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


        return scene;
    };
}

export default new XRSceneWithHavok3();

function shootProjectile(controller: WebXRInputSource, scene: Scene) {
    const projectile = MeshBuilder.CreateSphere("projectile", { diameter: 0.2 }, scene);

    const aggregateProjectile = new PhysicsAggregate(projectile, PhysicsShapeType.SPHERE, { mass: 10 }, scene);
    aggregateProjectile.body.setMotionType(PhysicsMotionType.DYNAMIC);
    let startPos: Vector3;
    if (controller.grip) {
        startPos = controller.grip.getAbsolutePosition().clone();
    } else if (controller.pointer) {
        startPos = controller.pointer.getAbsolutePosition().clone();
    } else {
        startPos = scene.activeCamera!.position.clone();
    }
    projectile.position = startPos;
    console.log("startPos");
    console.log(startPos);
    projectile.position = new Vector3(startPos.x, startPos.y, startPos.z);
    console.log(projectile.position)

    const tmpRay = new Ray(
        new Vector3(),
        new Vector3(),
        Infinity
    );

    controller.getWorldPointerRayToRef(tmpRay, true);


    tmpRay.direction.normalize()
    let direc = tmpRay.direction.normalize()
    const impulseMagnitude = 100;
    aggregateProjectile.body.applyImpulse(
        direc.scale(impulseMagnitude),
        projectile.absolutePosition
    );
}



function switchScene(engine: AbstractEngine, scene : Scene) {
    scene.dispose();

    const newSceneInstance = new XRSceneWithHavok2();
    newSceneInstance.createScene(engine).then(newScene => {
        engine.runRenderLoop(() => {
            newScene.render();
        });
    });
}


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


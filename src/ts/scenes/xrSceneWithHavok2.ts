import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, PhysicsPrestepType, WebXRControllerPhysics } from "@babylonjs/core";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import HavokPhysics from "@babylonjs/havok";
import { CreateSceneClass } from "../createScene.ts";
import { havokModule } from "../externals/havok.ts";
import XRDrumKit from "../xrDrumKit.ts";
import XRHandler from "../XRHandler.ts";

export class XRSceneWithHavok2 implements CreateSceneClass {
    preTasks = [havokModule];

    createScene = async (engine: AbstractEngine, canvas: HTMLCanvasElement, audioContext: AudioContext): Promise<Scene> => {
        const scene: Scene = new Scene(engine);

        const light: HemisphericLight = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;

        const ground: Mesh = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);

        const xr = await scene.createDefaultXRExperienceAsync({
            floorMeshes: [ground],
        });
        console.log("BASE EXPERIENCE");
        console.log(xr.baseExperience);

        new XRHandler(scene, xr);

        const havokInstance = await HavokPhysics();
        const hk = new HavokPlugin(true, havokInstance);

        scene.enablePhysics(new Vector3(0, -9.8, 0), hk);

        var groundAggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

        const started = hk._hknp.EventType.COLLISION_STARTED.value;
        const continued = hk._hknp.EventType.COLLISION_CONTINUED.value;
        const finished = hk._hknp.EventType.COLLISION_FINISHED.value;

        const eventMask = started | continued | finished;

        const drum = new XRDrumKit(audioContext, scene, eventMask, xr, hk);

        var camera = xr.baseExperience.camera;

        addXRControllersRoutine(scene, xr, eventMask);

        const moveSpeed = 1;
        addKeyboardControls(xr, moveSpeed);

        groundAggregate.body.getCollisionObservable().add((collisionEvent: any) => {
            if (collisionEvent.type === "COLLISION_STARTED") {
                var collidedBody = null;
                if (collisionEvent.collider != groundAggregate.body) {
                    collidedBody = collisionEvent.collider;
                } else {
                    collidedBody = collisionEvent.collidedAgainst;
                }
                const position = collidedBody.transformNode.position;
                collidedBody.transformNode.position = new Vector3(position.x, ground.position.y + 5, position.z);
                collidedBody.setLinearVelocity(Vector3.Zero());
                collidedBody.setAngularVelocity(Vector3.Zero());
            }
        });

        let sceneAlreadySwitched = false;

        scene.onBeforeAnimationsObservable.add(() => {
            const isWithinX = camera.position.x > 9 && camera.position.x < 11;
            const isWithinZ = camera.position.z > 9 && camera.position.z < 11;

            if (!sceneAlreadySwitched && isWithinX && isWithinZ) {
                sceneAlreadySwitched = true;
                console.log("La caméra est proche de (10, 10). Changement de scène...");

                switchScene2(engine, scene);
            }
        });

        // Chargez le modèle gun.glb
        loadGunModel(scene);

        return scene;
    };
}

export default new XRSceneWithHavok2();

function loadGunModel(scene: Scene) {
    SceneLoader.ImportMesh(
        "", // Nom du mesh, laissez vide pour charger tous les meshes
        "./asset/AZURE Nature/gun.glb", // Chemin vers le dossier contenant gun.glb
        "gun.glb", // Nom du fichier
        scene,
        (meshes) => {
            // Positionnez le modèle dans la scène
            meshes.forEach(mesh => {
                mesh.position = new Vector3(0, 1, 0); // Ajustez la position selon vos besoins
            });
        },
        null,
        (scene, message, exception) => {
            console.error("Erreur lors du chargement du modèle:", message, exception);
        }
    );
}

function resetSceneObjects(scene: Scene) {
    scene.meshes.forEach(mesh => {
        if (mesh.name !== "ground") {
            mesh.dispose();
        }
    });

    // Ajoutez d'autres objets si nécessaire
}

function switchScene(engine: AbstractEngine, scene: Scene) {
    resetSceneObjects(scene);
}

function switchScene2(engine: AbstractEngine, scene: Scene) {
    resetSceneObjects(scene);
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

function addXRControllersRoutine(scene: Scene, xr: any, eventMask: number) {
    xr.input.onControllerAddedObservable.add((controller: any) => {
        console.log("Ajout d'un controller");
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
            });
        });
    });
}
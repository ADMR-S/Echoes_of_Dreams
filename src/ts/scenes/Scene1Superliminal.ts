// IMPLEMENTATION D'ADAM INSPIREE DES EXEMPLES DE BABYLONJS

import { Scene } from "@babylonjs/core/scene";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
//import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
//import "@babylonjs/core/Physics/physicsEngineComponent";

// If you don't need the standard material you will still need to import it since the scene requires it.
//import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsMotionType, PhysicsPrestepType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { havokModule } from "../externals/havok.ts";
import HavokPhysics from "@babylonjs/havok";
import { CreateSceneClass } from "../createScene.ts";


import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
// @ts-ignore
import { HemisphericLight, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, WebXRControllerPhysics } from "@babylonjs/core";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import {XRSceneWithHavok2} from "./a_supprimer/xrSceneWithHavok2.ts";

import XRDrumKit from "../xrDrumKit.ts"

import XRHandler from "../XRHandler.ts"
import {Player} from "../Player.ts"

import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import "@babylonjs/core/Helpers/sceneHelpers";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { Object3DPickable } from "../object/Object3DPickable";


export class Scene1Superliminal implements CreateSceneClass {
    preTasks = [havokModule];

    // @ts-ignore
    createScene = async (engine: AbstractEngine, canvas : HTMLCanvasElement, audioContext : AudioContext, player : Player): Promise<Scene> => {
        const scene: Scene = new Scene(engine);

        //const light: HemisphericLight = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        //light.intensity = 0.7;

        // Our built-in 'ground' shape.
        const ground: Mesh = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);

        const xr = await scene.createDefaultXRExperienceAsync({
            floorMeshes: [ground],
        });
        console.log("BASE EXPERIENCE")
        console.log(xr.baseExperience)

        new XRHandler(scene, xr, player);

          //Good way of initializing Havok
        // initialize plugin
        const havokInstance = await HavokPhysics();
        // pass the engine to the plugin
        const hk = new HavokPlugin(true, havokInstance);


        // enable physics in the scene with a gravity
        scene.enablePhysics(new Vector3(0, -9.8, 0), hk);

        var groundAggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

        const started = hk._hknp.EventType.COLLISION_STARTED.value;
        const continued = hk._hknp.EventType.COLLISION_CONTINUED.value;
        const finished = hk._hknp.EventType.COLLISION_FINISHED.value;

    const eventMask = started | continued | finished;
      
    // @ts-ignore
    const drum = new XRDrumKit(audioContext, scene, eventMask, xr, hk);

    // Skybox
	var skybox = MeshBuilder.CreateBox("skyBox", {size:1000.0}, scene);
	var skyboxMaterial = new StandardMaterial("skyBox", scene);
	skyboxMaterial.backFaceCulling = false;
	skyboxMaterial.reflectionTexture = new CubeTexture("asset/texture/skyboxSpace", scene);
	skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
	skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
	skyboxMaterial.specularColor = new Color3(0, 0, 0);
	skybox.material = skyboxMaterial;			
	    

        //addScaleRoutineToSphere(sphereObservable);

        var camera=  xr.baseExperience.camera;

        addXRControllersRoutine(scene, xr, eventMask); //eventMask est-il indispensable ?

        // Add keyboard controls for movement
        const moveSpeed = 1;
        addKeyboardControls(xr, moveSpeed);



        // Add collision detection for the ground
        groundAggregate.body.getCollisionObservable().add((collisionEvent: any) => {
          if (collisionEvent.type === "COLLISION_STARTED") {
                var collidedBody = null;
                if(collisionEvent.collider != groundAggregate.body){
                    collidedBody = collisionEvent.collider;
                }
                else{
                    collidedBody = collisionEvent.collidedAgainst;
                }
                const position = collidedBody.transformNode.position;
                collidedBody.transformNode.position = new Vector3(position.x, ground.position.y + 5, position.z); // Adjust the y-coordinate to be just above the ground
                collidedBody.setLinearVelocity(Vector3.Zero());
                collidedBody.setAngularVelocity(Vector3.Zero());
            }
        });

        //-------------------------------------------------------------------------------------------------------
        // Game loop

        let sceneAlreadySwitched = false;


        scene.onBeforeAnimationsObservable.add( ()=> {
            const isWithinX = camera.position.x > 9 && camera.position.x < 11;
            const isWithinZ = camera.position.z > 9 && camera.position.z < 11;

            /*
            console.log(camera.position.x)
            console.log(camera.position.z)
            console.log(isWithinX, isWithinZ)
            */

            if (!sceneAlreadySwitched && isWithinX && isWithinZ) {
                sceneAlreadySwitched = true;
                console.log("La caméra est proche de (10, 10). Changement de scène...");
                console.log("La caméra est proche de (10, 10). Changement de scène...");
                console.log("La caméra est proche de (10, 10). Changement de scène...");

                switchScene(engine, scene);

            }
        })

        // --- Add a wall on the right side (x = +5, z = 0), 5 meters high ---
        const wallWidth = 0.5;
        const wallHeight = 5;
        const wallLength = 10;
        const wallPosition = new Vector3(5, wallHeight / 2, 0); // y = height/2 to sit on ground

        const wall = MeshBuilder.CreateBox("rightWall", { width: wallWidth, height: wallHeight, depth: wallLength }, scene);
        wall.position = wallPosition;
        wall.isPickable = true;

        // Optional: give the wall a material
        const wallMat = new StandardMaterial("wallMat", scene);
        wallMat.diffuseColor = new Color3(0.8, 0.8, 0.9);
        wall.material = wallMat;

        // Optional: add physics to the wall
        new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0 }, scene);

        //@ts-ignore
        var lightBulb = createLightBulbPickable(scene, eventMask);

        return scene;
    };
}

export default new Scene1Superliminal();

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
    xr.input.onControllerAddedObservable.add((controller: any) => {        
        console.log("Ajout d'un controller")
        if (controller.inputSource.handedness === "left") {
            controller.onMotionControllerInitObservable.add((motionController: any) => {
                const xrInput = motionController.getComponent("xr-standard-thumbstick");
                if (xrInput) {
                    xrInput.onAxisValueChangedObservable.add((axisValues: any) => {
                        const speed = 0.05;
                        // Move relative to camera orientation
                        const camera = xr.baseExperience.camera;
                        const forward = camera.getDirection(new Vector3(0, 0, 1));
                        const right = camera.getDirection(new Vector3(1, 0, 0));
                        // Remove y component to keep movement horizontal
                        forward.y = 0;
                        right.y = 0;
                        forward.normalize();
                        right.normalize();
                        camera.position.addInPlace(forward.scale(-axisValues.y * speed));
                        camera.position.addInPlace(right.scale(axisValues.x * speed));
                    });
                }
                // --- Disable teleportation feature for left controller ---
                const teleportation = xr.baseExperience.featuresManager.getEnabledFeature("xr-teleportation");
                if (teleportation && teleportation.attachedController && teleportation.attachedController === controller) {
                    teleportation.detach();
                }

                // --- Jump on A button press ---
                const aButton = motionController.getComponent("a-button");
                if (aButton) {
                    aButton.onButtonStateChangedObservable.add((button: any) => {
                        if (button.pressed) {
                            // Apply jump to camera (simple upward velocity)
                            const camera = xr.baseExperience.camera;
                            // If camera has a physics impostor/body, apply velocity, else just move up
                            if ((camera as any).physicsImpostor) {
                                (camera as any).physicsImpostor.setLinearVelocity(new Vector3(0, 5, 0));
                            } else if ((camera as any).body && (camera as any).body.setLinearVelocity) {
                                (camera as any).body.setLinearVelocity(new Vector3(0, 5, 0));
                            } else {
                                camera.position.y += 1; // fallback: move up by 1 unit
                            }
                        }
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
                //const controllerPhysics = xr.baseExperience.featuresManager.enableFeature(WebXRControllerPhysics.Name, 'latest')
                //controller.physics = controllerPhysics
            });
        });
    });
}

// Create a light bulb as an Object3DPickable
function createLightBulbPickable(scene: Scene, eventMask : number): Object3DPickable {
    // Usage in scene :
    // const bulbPickable = createLightBulbPickable(scene);
    // Access mesh: bulbPickable.mesh
    // Access light: bulbPickable.extra.pointLight
    // Access physics: bulbPickable.extra.bulbAggregate

    const mat = new StandardMaterial("bulbMat", scene);
    mat.emissiveColor = new Color3(1, 0.8, 0.2);

    return new Object3DPickable(
        scene,
        "lightBulb",
        mat,
        PhysicsShapeType.SPHERE, // Use sphere shape for bulb
        0.2, // Diameter of the bulb
        (scene, name, material, size) => {
            const mesh = MeshBuilder.CreateSphere(name, { diameter: size }, scene);
            mesh.material = material;
            // Place the bulb on the ground (y = radius)
            mesh.position = new Vector3(0, size / 2, 2);

            const pointLight = new PointLight("bulbLight", Vector3.Zero(), scene);
            pointLight.diffuse = new Color3(1, 0.8, 0.2);
            // Scale intensity with size (tune the multiplier as needed)
            pointLight.intensity = 0.05;
            pointLight.parent = mesh;

            new GlowLayer("glow", scene);

            const aggregate = new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE, { mass: 1 }, scene);

            aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
            aggregate.body.setPrestepType(PhysicsPrestepType.DISABLED);
            aggregate.body.setCollisionCallbackEnabled(true);
            aggregate.body.setEventMask(eventMask);

            aggregate.body.getCollisionObservable().add((collisionEvent: any) => {
                if (collisionEvent.type === "COLLISION_STARTED") {
                }
            });

            // --- Ensure the light always snaps to the bulb's position (in case parenting is lost) ---
            /*
            scene.onBeforeRenderObservable.add(() => {
                pointLight.position.copyFrom(mesh.position);
            });
            */
            return { mesh, extra: { pointLight }, aggregate }; // store aggregate at top-level
        }
    );
}


import { Scene } from "@babylonjs/core/scene";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
//import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
//import "@babylonjs/core/Physics/physicsEngineComponent";

// If you don't need the standard material you will still need to import it since the scene requires it.
import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsMotionType, PhysicsPrestepType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { havokModule } from "../externals/havok.ts";
import HavokPhysics from "@babylonjs/havok";
import { CreateSceneClass } from "../createScene.ts";


import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
// @ts-ignore
import { HemisphericLight, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Sound, WebXRControllerPhysics } from "@babylonjs/core";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import {XRSceneWithHavok2} from "./a_supprimer/xrSceneWithHavok2.ts";

//import XRDrumKit from "../xrDrumKit.ts"

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

import { WebXRFeatureName } from "@babylonjs/core";
//import * as GUI from "@babylonjs/gui/2D";
import { AssetsManager } from "@babylonjs/core/Misc/assetsManager";

export class Scene1Superliminal implements CreateSceneClass {
    preTasks = [havokModule];

    private backgroundMusic: Sound | null = null;
    

    // @ts-ignore
    createScene = async (engine: AbstractEngine, canvas: HTMLCanvasElement, audioContext: AudioContext, player: Player, requestSceneSwitchFn: () => Promise<void>
    ): Promise<Scene> => {
        const scene: Scene = new Scene(engine);
        scene.metadata = { sceneName: "Scene1Superliminal" };

        //const light: HemisphericLight = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        //light.intensity = 0.7;

        // Our built-in 'ground' shape.
        const ground: Mesh = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);

        const xr = await scene.createDefaultXRExperienceAsync({
            floorMeshes: [ground],
        });
        console.log("BASE EXPERIENCE")
        console.log(xr.baseExperience)

        new XRHandler(scene, xr, player, requestSceneSwitchFn);

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
    //const drum = new XRDrumKit(audioContext, scene, eventMask, xr, hk);

    // Skybox
    var skybox = MeshBuilder.CreateBox("skyBox", {size:1000.0}, scene);
    var skyboxMaterial = new StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new CubeTexture("asset/texture/skybox_space", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxMaterial.specularColor = new Color3(0, 0, 0);
    skybox.material = skyboxMaterial;			
        

        //addScaleRoutineToSphere(sphereObservable);

        var camera=  xr.baseExperience.camera;

        addXRControllersRoutine(scene, xr, eventMask, ground); //eventMask est-il indispensable ?

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

        this.backgroundMusic = new Sound(
                    "backgroundMusic",
                    "/asset/sounds/backgroundScene1.ogg",
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

        //SWITCH SCENE BUTTON
                /*
         const plane = MeshBuilder.CreatePlane("plane", {
            width: 2,
            height: 1,
          });
          plane.parent = camera;
          plane.position.z = 5;

        const advancedTexture =
            GUI.AdvancedDynamicTexture.CreateForMesh(plane);

          const button1 = GUI.Button.CreateSimpleButton(
            "but1",
            "Click Me",
          );
          button1.width = 2;
          button1.height = 1;
          button1.color = "white";
          button1.fontSize = 200;
          button1.background = "green";
          button1.onPointerUpObservable.add(function () {
            window.location.pathname = "/scene3";
        });
          advancedTexture.addControl(button1);

          */
          //FIN SWITCH SCENE BUTTON

        // --- Asset Manager for Chess Pieces ---
        const assetsManager = new AssetsManager(scene);

        // Example: Load the queen chess piece from asset/chess/queen
        // Assumes a .glb file named queen.glb in that folder
        const queenTask = assetsManager.addMeshTask(
            "loadQueen",
            "", // mesh names, empty for all
            "asset/chess/",
            "queen.glb"
        );

        queenTask.onSuccess = (task) => {
            // Find the first loaded mesh that is a Mesh and has geometry
            const mesh = task.loadedMeshes.find(
                m => m instanceof Mesh && typeof m.getTotalVertices === "function" && m.getTotalVertices() > 0
            ) as Mesh | undefined;
            if (!mesh) {
                console.error("No valid Mesh with geometry found in loadedMeshes for queen.");
                return;
            }
            mesh.position = new Vector3(-4, 0.5, 3);
            mesh.scaling = new Vector3(0.3, 0.3, 0.3);
            mesh.isPickable = true;

            // --- Correction du centre de la bounding box à y=0.5 ---
            mesh.computeWorldMatrix(true);
            mesh.refreshBoundingInfo(true, true);
            const bbox = mesh.getBoundingInfo().boundingBox;
            const center = bbox.centerWorld;
            // Décale la mesh pour que le centre de la bounding box soit à y=0.5
            mesh.position.y += (0.5 - center.y);

            // --- Ensure the queen has a StandardMaterial for highlight ---
            if (!(mesh.material && mesh.material instanceof StandardMaterial)) {
                mesh.material = new StandardMaterial("queenMat", scene);
            }

            // Create Object3DPickable for the queen
            //@ts-ignore
            const queenPickable = new Object3DPickable(
                scene,
                "queenPickable",
                mesh.material,
                PhysicsShapeType.MESH,
                1,
                // Custom mesh factory to use the imported mesh and add physics
                //@ts-ignore
                (scene, name, material, size) => {
                    mesh.name = name;
                    mesh.material = material;
                    // Add physics aggregate (MESH shape for complex mesh)
                    const aggregate = new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 1 }, scene);
                    aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
                    aggregate.body.setPrestepType(PhysicsPrestepType.ACTION);
                    aggregate.body.setCollisionCallbackEnabled(true);
                    aggregate.body.setEventMask(eventMask);
                    return { mesh, aggregate };
                }
            );
            // --- Ensure the mesh has a reference to its Object3DPickable for highlighting/selection ---
            (mesh as any).object3DPickable = queenPickable;

            console.log("Queen chess piece loaded and pickable.");
        };

        //@ts-ignore
        queenTask.onError = (task, message, exception) => {
            console.error("Failed to load queen chess piece:", message, exception);
        };

        // You can add more mesh tasks for other pieces here

        assetsManager.load();

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
function addXRControllersRoutine(scene: Scene, xr: any, eventMask: number, ground : Mesh) {
    // Store rotation state
    var rotationInput = 0;
    var xPositionInput = 0;
    var yPositionInput = 0;

    let teleportationEnabled = true;
    const featuresManager = xr.baseExperience.featuresManager;

    xr.input.onControllerAddedObservable.add((controller: any) => {        
        console.log("Ajout d'un controller")
        if (controller.inputSource.handedness === "left") {
            controller.onMotionControllerInitObservable.add((motionController: any) => {
                const leftStick = motionController.getComponent("xr-standard-thumbstick");
                if (leftStick) {
                    leftStick.onAxisValueChangedObservable.add((axisValues: any) => {
                        xPositionInput = axisValues.x;
                        yPositionInput = axisValues.y;
                    });
                }

                const yButton = motionController.getComponent("y-button");
                if (yButton) {
                    yButton.onButtonStateChangedObservable.add(() => {
                        if (yButton.changes.pressed && yButton.pressed) {
                            teleportationEnabled = !teleportationEnabled;
                            if (teleportationEnabled) {
                                // Enable teleportation
                                featuresManager.enableFeature(
                                    WebXRFeatureName.TELEPORTATION,
                                    "stable",
                                    {
                                        xrInput: xr.input,
                                        floorMeshes: [ground],
                                    }
                                );
                                console.log("Teleportation ENABLED");
                            } else {
                                // Disable teleportation
                                featuresManager.disableFeature(WebXRFeatureName.TELEPORTATION);
                                console.log("Teleportation DISABLED");
                            }
                        }
                    });
                }
            });
        }
        // Right controller:
        if (controller.inputSource.handedness === "right") {
            controller.onMotionControllerInitObservable.add((motionController: any) => {
                const xrInput = motionController.getComponent("xr-standard-thumbstick");
                if (xrInput) {
                    xrInput.onAxisValueChangedObservable.add((axisValues: any) => {
                        rotationInput = axisValues.x;
                    });
                }
            });
        }
    });

    // Smooth rotation in the render loop
    scene.onBeforeRenderObservable.add(() => {
        const rotationSpeed = 0.04; // Adjust for desired sensitivity
        const movementSpeed = 0.05;
        const camera = xr.baseExperience.camera;

        if (Math.abs(rotationInput) > 0.01) {
            console.log("Rotation input: " + rotationInput);
            console.log("Camera rotation before: " + camera.rotationQuaternion.toEulerAngles().y);
            // Rotate around Y axis (yaw)
            if (Math.abs(rotationInput) > 0.01) {
            // Rotate around the WORLD Y axis (not local)
            const deltaYaw = rotationInput * rotationSpeed;
            const yawQuaternion = Quaternion.FromEulerAngles(0, deltaYaw, 0);
            camera.rotationQuaternion = yawQuaternion.multiply(camera.rotationQuaternion!);
        }
            console.log("Camera rotation after: " + camera.rotationQuaternion.toEulerAngles().y);
        }
        // Smooth movement relative to camera's facing direction
        if (Math.abs(xPositionInput) > 0.01 || Math.abs(yPositionInput) > 0.01) {
            // Calculate forward and right vectors based on camera rotation
            const forward = camera.getDirection(new Vector3(0, 0, 1));
                const right = camera.getDirection(new Vector3(1, 0, 0));
                // Remove y component to keep movement horizontal
                forward.y = 0;
                right.y = 0;
                forward.normalize();
                right.normalize();
                camera.position.addInPlace(forward.scale(-yPositionInput * movementSpeed));
                camera.position.addInPlace(right.scale(xPositionInput * movementSpeed));
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


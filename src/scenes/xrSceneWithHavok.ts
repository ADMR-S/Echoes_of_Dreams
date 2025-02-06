// IMPLEMENTATION D'ADAM INSPIREE DES EXEMPLES DE BABYLONJS

import {Scene} from "@babylonjs/core/scene";
import {Quaternion, Vector3} from "@babylonjs/core/Maths/math.vector";
import {HemisphericLight, HemisphericLight} from "@babylonjs/core/Lights/hemisphericLight";
import {TerrainMaterial} from 'babylonjs-materials';

//import "@babylonjs/core/Materials/standardMaterial";
import {PhysicsMotionType} from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import {HavokPlugin} from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import {havokModule} from "../externals/havok";
import {CreateSceneClass} from "../createScene";
import {StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";


import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {
    Color3, KeyboardEventTypes,
    Mesh,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsPrestepType,
    PhysicsShapeType, ShapeCastResult,
    WebXRControllerPhysics
} from "@babylonjs/core";
import {AbstractEngine} from "@babylonjs/core/Engines/abstractEngine";
import HavokPhysics from "@babylonjs/havok";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import {ShadowGenerator} from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import {DirectionalLight} from "@babylonjs/core/Lights/directionalLight";
import {IPhysicsShapeCastQuery} from "@babylonjs/core/Physics/physicsShapeCastQuery";


export class XRSceneWithHavok implements CreateSceneClass {
    preTasks = [havokModule];

    
    createScene = async (engine: AbstractEngine): Promise<Scene> => {
    const scene: Scene = new Scene(engine);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene).intensity = 0.7;
    var light2 = new DirectionalLight("dir01", new Vector3(0.25, -1, 0.5), scene);
    light2.position = new Vector3(0, 10, 0);

    // Shadows
    var shadowGenerator = new ShadowGenerator(1024, light2);
    shadowGenerator.useBlurExponentialShadowMap = true;

    const ground: Mesh = MeshBuilder.CreateGroundFromHeightMap(
        "ground",
        "src/textures/untitled.png",
        {
            width: 500,
            height: 500,
            subdivisions: 100,
            minHeight: 0,
            maxHeight: 300,
        },
        scene
    );
    const groundTexture = new Texture("src/textures/Terrain_Daisies_Blue.png", scene);

    groundTexture.wrapU = Texture.WRAP_ADDRESSMODE;
    groundTexture.wrapV = Texture.WRAP_ADDRESSMODE;


    groundTexture.anisotropicFilteringLevel = 4;
    groundTexture.uScale = 40;
    groundTexture.vScale = 40;
    const groundMaterial = new StandardMaterial("groundMat", scene);
    groundMaterial.diffuseTexture = groundTexture;

    ground.material = groundMaterial;

    const terrainMaterial = new TerrainMaterial("terrainMaterial", scene);
    terrainMaterial.mixTexture = new Texture("mixMap.png", scene);
    terrainMaterial.diffuseTexture1  = new Texture("grass.png", scene);
    terrainMaterial.diffuseTexture2 = new Texture("rock.png", scene);
    terrainMaterial.diffuseTexture3 = new Texture("floor.png", scene);

    terrainMaterial.bumpTexture1 = new Texture("grassn.png", scene);
    terrainMaterial.bumpTexture2 = new Texture("rockn.png", scene);
    terrainMaterial.bumpTexture3 = new Texture("floor_bump.png", scene);

    //ground.material = terrainMaterial;




    const xr = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [ground],
    });

    xr.baseExperience.camera.position = new Vector3(0, 50, -10);

    console.log("BASE EXPERIENCE")
    console.log(xr.baseExperience)
  
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
      
    // const drum = new XRDrum(audioContext, scene, eventMask, xr, hk);

    //addScaleRoutineToSphere(sphereObservable);
        // Character
    const characterMesh = MeshBuilder.CreateCapsule("character", {height: 1.8, radius: 0.45 });
    const characterMaterial = new StandardMaterial("character");
    characterMaterial.diffuseColor = new Color3(1, 0.56, 0.56);
    characterMesh.material = characterMaterial;
    characterMesh.position.set(0, 50, -10);
    const characterAggregate = new PhysicsAggregate(characterMesh,
        PhysicsShapeType.CAPSULE,
        { mass: 1, friction: 0.5, restitution: 0 },
        scene);
    const characterBody = characterAggregate.body;
    characterBody.disablePreStep = false;
    characterBody.setMassProperties({ inertia: Vector3.ZeroReadOnly });
    var inputVelocity = new Vector3(0,0,0);

    test(scene, inputVelocity);


    shadowGenerator.addShadowCaster(characterMesh, true);
    shadowGenerator.addShadowCaster(ground, true);

    characterMesh.receiveShadows = true;
    ground.receiveShadows = true;
    ground.receiveShadows = true;


    addGrabbableObjects(scene);

    addXRControllersRoutine(scene, xr, eventMask); //eventMask est-il indispensable ?

// Add keyboard controls for movement
    const moveSpeed = 0.5;
    addKeyboardControls(xr, moveSpeed);

    // Add collision detection for the ground
    groundAggregate.body.getCollisionObservable().add((collisionEvent: any) => {
      if (collisionEvent.type === "COLLISION_STARTED") {
            var collidedBody = null;
            if(collisionEvent.collider != groundAggregate.body){
                console.log("OUI")
                collidedBody = collisionEvent.collider;
            }
            else{
                console.log("NON")
                collidedBody = collisionEvent.collidedAgainst;
            }
            const position = collidedBody.transformNode.position;
            console.log("Position du sol : " + ground.position.y);
            collidedBody.transformNode.position = new Vector3(position.x, ground.position.y + 5, position.z);
            collidedBody.setLinearVelocity(Vector3.Zero());
            collidedBody.setAngularVelocity(Vector3.Zero());
        }
    });

    var time = 0;
    // character state: is he falling? and the platform it's currently over.
    var falling = false;

    scene.onBeforeAnimationsObservable.add( ()=> {
        // get camera world direction and right vectors. Character will move in camera space.
        var cameraDirection = xr.baseExperience.camera.getDirection(new Vector3(0,0,1));
        cameraDirection.y = 0;
        cameraDirection.normalize();
        var cameraRight = xr.baseExperience.camera.getDirection(new Vector3(1,0,0));
        cameraRight.y = 0;
        cameraRight.normalize();

        // by default, character velocity is 0. It won't move if no input or not falling
        var linearVelocity = new Vector3(0,0,0);

        //print position
        console.log(characterMesh.position)


        if (!falling) {
            // transform input velocity by camera vectors: character forward is camera forward. Same for right.
            //cameraDirection.scaleAndAddToRef(inputVelocity.x, linearVelocity);
            //cameraRight.scaleAndAddToRef(inputVelocity.z, linearVelocity);
            // interpolate between current velocity and targeted velocity. This will make acceleration and decceleration more visible
            //linearVelocity = Vector3.Lerp(characterBody.getLinearVelocity(), linearVelocity, 0.2)
            // if on a platform, add the platform velocity

            //linearVelocity.y = characterBody.getLinearVelocity().y;
        } else {
            // damping while in air. Replace 0.9 by a smaller value to get a stronger damping effect
            linearVelocity.copyFrom(characterBody.getLinearVelocity());
            linearVelocity.x *= 0.9;
            linearVelocity.z *= 0.9;
        }
        // Apply computed linear velocity. Each frame is the same: get current velocity, transform it, apply it, ...
        characterBody.setLinearVelocity(linearVelocity);

        // Camera control: Interpolate the camera target with character position. compute an amount of distance to travel to be in an acceptable range.
        //xr.baseExperience.camera.setTarget(Vector3.Lerp(xr.baseExperience.camera.getTarget(), characterMesh.position, 0.1));
        //var dist = Vector3.Distance(xr.baseExperience.camera.position, characterMesh.position);
        //const amount = (Math.min(dist-10, 0) + Math.max(dist-15, 0)) * 0.02;
        //cameraDirection.scaleAndAddToRef(amount, xr.baseExperience.camera.position);


        // Casting the shape to the ground below. It works like a raycast but with thickness
        const shapeLocalResult = new ShapeCastResult();
        const hitWorldResult = new ShapeCastResult();
        hk.shapeCast(<IPhysicsShapeCastQuery>{
            shape: characterAggregate.shape,
            rotation: characterMesh.rotationQuaternion,
            startPosition: characterMesh.position,
            endPosition: new Vector3(characterMesh.position.x, characterMesh.position.y - 10, characterMesh.position.z),
            shouldHitTriggers: false,
        }, shapeLocalResult, hitWorldResult);

        // move the debug sphere to the position detected by the shape cast
        //sphereHitWorld.position = hitWorldResult.hitPoint;

        // falling is when there is a too much distance between the character and the ground
        falling = (characterMesh.position.y - hitWorldResult.hitPoint.y) > 0.91; // 0.9 + little margin

        // character can't fall. If it's under a threshold, reset it back to it's default spawn point
        if (characterMesh.position.y < -1)
            characterMesh.position.set(0,1,-3);

        // advance in time. deltaTime is in milliseonds, convert to seconds.
        time += engine.getDeltaTime() * 0.001;

        // hide progressively the GUI
        //textBlock.alpha = Math.max(textBlock.alpha - 0.02, 0);

    });

    return scene;
    };
}

export default new XRSceneWithHavok();

function test( scene : Scene, inputVelocity : Vector3){
    scene.onKeyboardObservable.add((kbInfo) => {
    const muliplier = (kbInfo.type == KeyboardEventTypes.KEYDOWN) ? 2 : 0;
    switch (kbInfo.event.key) {
        case 'ArrowUp':
            inputVelocity.x = muliplier;
            break;
        case 'ArrowDown':
            inputVelocity.x = -muliplier;
            break;
        case 'ArrowLeft':
            inputVelocity.z = -muliplier;
            break;
        case 'ArrowRight':
            inputVelocity.z = muliplier;
            break;
    }
})
    return inputVelocity;
}

function addKeyboardControls(xr: any, moveSpeed: number) {
    window.addEventListener("keydown", (event: KeyboardEvent) => {
        switch (event.key) {
            case "z":
                console.log("w pressé !");
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

function addGrabbableObjects(scene: Scene) {
    for (let i = 0; i < 5; i++) {
        const box = MeshBuilder.CreateBox("grabbableBox" + i, { size: 0.5 }, scene);
        box.position = new Vector3(2 + i, 50, -10);
        (box as any).physicsAggregate = new PhysicsAggregate(box, PhysicsShapeType.BOX, {mass: 1}, scene);
        (box as any).isGrabbable = true;
    }

    const sphere = MeshBuilder.CreateSphere("grabbableSphere", { diameter: 0.5 }, scene);
    sphere.position = new Vector3(-2, 50, -10);
    (sphere as any).physicsAggregate = new PhysicsAggregate(sphere, PhysicsShapeType.SPHERE, {mass: 1}, scene);
    (sphere as any).isGrabbable = true;
}


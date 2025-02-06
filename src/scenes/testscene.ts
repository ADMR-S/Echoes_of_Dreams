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
    CharacterSupportedState,
    Color3, FreeCamera, HingeConstraint, KeyboardEventTypes,
    Mesh,
    MeshBuilder,
    PhysicsAggregate, PhysicsCharacterController,
    PhysicsPrestepType,
    PhysicsShapeType, PointerEventTypes, SceneLoader, ShapeCastResult,
    WebXRControllerPhysics
} from "@babylonjs/core";
import {AbstractEngine} from "@babylonjs/core/Engines/abstractEngine";
import HavokPhysics from "@babylonjs/havok";
import {Texture} from "@babylonjs/core/Materials/Textures/texture";
import {ShadowGenerator} from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import {DirectionalLight} from "@babylonjs/core/Lights/directionalLight";
import {IPhysicsShapeCastQuery} from "@babylonjs/core/Physics/physicsShapeCastQuery";
import {XRSceneWithHavok} from "./xrSceneWithHavok.ts";


    export class testscene implements CreateSceneClass {
    preTasks = [havokModule];

    createScene = async (engine: AbstractEngine): Promise<Scene> => {
        // This creates a basic Babylon Scene object (non-mesh)
        var scene = new Scene(engine);



        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        var light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // Initialize Havok plugin
        const havokInstance = await HavokPhysics();
        // pass the engine to the plugin
        const hk = new HavokPlugin(true, havokInstance);
        // Enable physics in the scene with a gravity
        scene.enablePhysics(new Vector3(0, -9.8, 0), hk);

        // Load GLB exported from Blender using Physics extension enabled
        SceneLoader.ImportMeshAsync("", "https://raw.githubusercontent.com/CedricGuillemet/dump/master/CharController/", "levelTest.glb", scene).then(async () => {
            // Load a texture that will be used as lightmap. This Lightmap was made using this process : https://www.youtube.com/watch?v=Q4Ajd06eTak
            var lightmap = new Texture("https://raw.githubusercontent.com/CedricGuillemet/dump/master/CharController/lightmap.jpg");
            // Meshes using the lightmap
            var lightmapped = ["level_primitive0", "level_primitive1", "level_primitive2"];
            lightmapped.forEach((meshName) => {
                var mesh = scene.getMeshByName(meshName);
                // Create static physics shape for these particular meshes
                new PhysicsAggregate(mesh, PhysicsShapeType.MESH);
                mesh.isPickable = false;
                mesh.material.lightmapTexture = lightmap;
                mesh.material.useLightmapAsShadowmap = true;
                mesh.material.lightmapTexture.uAng = Math.PI;
                mesh.material.lightmapTexture.level = 1.6;
                mesh.material.lightmapTexture.coordinatesIndex = 1;
                mesh.freezeWorldMatrix();
                mesh.doNotSyncBoundingInfo = true;
            });
            // static physics cubes
            var cubes = ["Cube", "Cube.001", "Cube.002", "Cube.003", "Cube.004", "Cube.005"];
            cubes.forEach((meshName) => {
                new PhysicsAggregate(scene.getMeshByName(meshName), PhysicsShapeType.BOX, {mass: 0.1});
            });
            // inclined plane
            var planeMesh = scene.getMeshByName("Cube.006");
            planeMesh.scaling.set(0.03, 3, 1);
            var fixedMass = new PhysicsAggregate(scene.getMeshByName("Cube.007"), PhysicsShapeType.BOX, {mass: 0});
            var plane = new PhysicsAggregate(planeMesh, PhysicsShapeType.BOX, {mass: 0.1});

            const xr = await scene.createDefaultXRExperienceAsync({
                floorMeshes: [planeMesh],
            });

            // This creates and positions a free camera (non-mesh)
            var camera = xr.baseExperience.camera;
            xr.baseExperience.camera.position= new Vector3(0, 5, -5);

            // plane joint
            var joint = new HingeConstraint(
                new Vector3(0.75, 0, 0),
                new Vector3(-0.25, 0, 0),
                new Vector3(0, 0, -1),
                new Vector3(0, 0, 1),
                scene);
            fixedMass.body.addConstraint(plane.body, joint);

            // Player/Character state
            var state = "IN_AIR";
            var inAirSpeed = 8.0;
            var onGroundSpeed = 10.0;
            var jumpHeight = 1.5;
            var wantJump = false;
            var inputDirection = new Vector3(0, 0, 0);
            var forwardLocalSpace = new Vector3(0, 0, 1);
            let characterOrientation = Quaternion.Identity();
            let characterGravity = new Vector3(0, -18, 0);

            // Physics shape for the character
            let h = 1.8;
            let r = 0.6;
            let displayCapsule = MeshBuilder.CreateCapsule("CharacterDisplay", {height: h, radius: r}, scene);
            let characterPosition = new Vector3(3., 0.3, -8.);
            let characterController = new PhysicsCharacterController(characterPosition, {
                capsuleHeight: h,
                capsuleRadius: r
            }, scene);
            camera.setTarget(characterPosition);

            // State handling
            // depending on character state and support, set the new state
            var getNextState = function (supportInfo) {
                if (state == "IN_AIR") {
                    if (supportInfo.supportedState == CharacterSupportedState.SUPPORTED) {
                        return "ON_GROUND";
                    }
                    return "IN_AIR";
                } else if (state == "ON_GROUND") {
                    if (supportInfo.supportedState != CharacterSupportedState.SUPPORTED) {
                        return "IN_AIR";
                    }

                    if (wantJump) {
                        return "START_JUMP";
                    }
                    return "ON_GROUND";
                } else if (state == "START_JUMP") {
                    return "IN_AIR";
                }
            }

            // From aiming direction and state, compute a desired velocity
            // That velocity depends on current state (in air, on ground, jumping, ...) and surface properties
            var getDesiredVelocity = function (deltaTime, supportInfo, characterOrientation, currentVelocity) {
                let nextState = getNextState(supportInfo);
                if (nextState != state) {
                    state = nextState;
                }

                let upWorld = characterGravity.normalizeToNew();
                upWorld.scaleInPlace(-1.0);
                let forwardWorld = forwardLocalSpace.applyRotationQuaternion(characterOrientation);
                if (state == "IN_AIR") {
                    let desiredVelocity = inputDirection.scale(inAirSpeed).applyRotationQuaternion(characterOrientation);
                    let outputVelocity = characterController.calculateMovement(deltaTime, forwardWorld, upWorld, currentVelocity, Vector3.ZeroReadOnly, desiredVelocity, upWorld);
                    // Restore to original vertical component
                    outputVelocity.addInPlace(upWorld.scale(-outputVelocity.dot(upWorld)));
                    outputVelocity.addInPlace(upWorld.scale(currentVelocity.dot(upWorld)));
                    // Add gravity
                    outputVelocity.addInPlace(characterGravity.scale(deltaTime));
                    return outputVelocity;
                } else if (state == "ON_GROUND") {
                    // Move character relative to the surface we're standing on
                    // Correct input velocity to apply instantly any changes in the velocity of the standing surface and this way
                    // avoid artifacts caused by filtering of the output velocity when standing on moving objects.
                    let desiredVelocity = inputDirection.scale(onGroundSpeed).applyRotationQuaternion(characterOrientation);

                    let outputVelocity = characterController.calculateMovement(deltaTime, forwardWorld, supportInfo.averageSurfaceNormal, currentVelocity, supportInfo.averageSurfaceVelocity, desiredVelocity, upWorld);
                    // Horizontal projection
                    {
                        outputVelocity.subtractInPlace(supportInfo.averageSurfaceVelocity);
                        let inv1k = 1e-3;
                        if (outputVelocity.dot(upWorld) > inv1k) {
                            let velLen = outputVelocity.length();
                            outputVelocity.normalizeFromLength(velLen);

                            // Get the desired length in the horizontal direction
                            let horizLen = velLen / supportInfo.averageSurfaceNormal.dot(upWorld);

                            // Re project the velocity onto the horizontal plane
                            let c = supportInfo.averageSurfaceNormal.cross(outputVelocity);
                            outputVelocity = c.cross(upWorld);
                            outputVelocity.scaleInPlace(horizLen);
                        }
                        outputVelocity.addInPlace(supportInfo.averageSurfaceVelocity);
                        return outputVelocity;
                    }
                } else if (state == "START_JUMP") {
                    let u = Math.sqrt(2 * characterGravity.length() * jumpHeight);
                    let curRelVel = currentVelocity.dot(upWorld);
                    return currentVelocity.add(upWorld.scale(u - curRelVel));
                }
                return Vector3.Zero();
            }

            // Display tick update: compute new camera position/target, update the capsule for the character display
            scene.onBeforeRenderObservable.add((scene) => {
                displayCapsule.position.copyFrom(characterController.getPosition());

                // camera following
                var cameraDirection = camera.getDirection(new Vector3(0, 0, 1));
                cameraDirection.y = 0;
                cameraDirection.normalize();
                camera.setTarget(Vector3.Lerp(camera.getTarget(), displayCapsule.position, 0.1));
                var dist = Vector3.Distance(camera.position, displayCapsule.position);
                const amount = (Math.min(dist - 6, 0) + Math.max(dist - 9, 0)) * 0.04;
                cameraDirection.scaleAndAddToRef(amount, camera.position);
                camera.position.y += (displayCapsule.position.y + 2 - camera.position.y) * 0.04;
            });

            // After physics update, compute and set new velocity, update the character controller state
            scene.onAfterPhysicsObservable.add((_) => {
                if (scene.deltaTime == undefined) return;
                let dt = scene.deltaTime / 1000.0;
                if (dt == 0) return;

                let down = new Vector3(0, -1, 0);
                let support = characterController.checkSupport(dt, down);

                Quaternion.FromEulerAnglesToRef(0, camera.rotation.y, 0, characterOrientation);
                let desiredLinearVelocity = getDesiredVelocity(dt, support, characterOrientation, characterController.getVelocity());
                characterController.setVelocity(desiredLinearVelocity);

                characterController.integrate(dt, support, characterGravity);
            });

            // Rotate camera
            // Add a slide vector to rotate arount the character
            let isMouseDown = false;
            scene.onPointerObservable.add((pointerInfo) => {
                switch (pointerInfo.type) {
                    case PointerEventTypes.POINTERDOWN:
                        isMouseDown = true;
                        break;

                    case PointerEventTypes.POINTERUP:
                        isMouseDown = false;
                        break;

                    case PointerEventTypes.POINTERMOVE:
                        if (isMouseDown) {
                            var tgt = camera.getTarget().clone();
                            camera.position.addInPlace(camera.getDirection(Vector3.Right()).scale(pointerInfo.event.movementX * -0.02));
                            camera.setTarget(tgt);
                        }
                        break;
                }
            });
            // Input to direction
            // from keys down/up, update the Vector3 inputDirection to match the intended direction. Jump with space
            scene.onKeyboardObservable.add((kbInfo) => {
                console.log(kbInfo.type)
                switch (kbInfo.type) {
                    case KeyboardEventTypes.KEYDOWN:
                        if (kbInfo.event.key == 'w' || kbInfo.event.key == 'ArrowUp') {
                            inputDirection.z = 1;
                        } else if (kbInfo.event.key == 's' || kbInfo.event.key == 'ArrowDown') {
                            inputDirection.z = -1;
                        } else if (kbInfo.event.key == 'a' || kbInfo.event.key == 'ArrowLeft') {
                            inputDirection.x = -1;
                        } else if (kbInfo.event.key == 'd' || kbInfo.event.key == 'ArrowRight') {
                            inputDirection.x = 1;
                        } else if (kbInfo.event.key == ' ') {
                            wantJump = true;
                        }
                        break;
                    case KeyboardEventTypes.KEYUP:
                        if (kbInfo.event.key == 'w' || kbInfo.event.key == 's' || kbInfo.event.key == 'ArrowUp' || kbInfo.event.key == 'ArrowDown') {
                            inputDirection.z = 0;
                        }
                        if (kbInfo.event.key == 'a' || kbInfo.event.key == 'd' || kbInfo.event.key == 'ArrowLeft' || kbInfo.event.key == 'ArrowRight') {
                            inputDirection.x = 0;
                        } else if (kbInfo.event.key == ' ') {
                            wantJump = false;
                        }
                        break;
                }
            });
        });

        return scene;
    }

}

export default new testscene();

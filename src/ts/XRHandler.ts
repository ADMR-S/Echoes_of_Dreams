import { Scene } from "@babylonjs/core/scene";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { WebXRAbstractMotionController } from "@babylonjs/core/XR/motionController/webXRAbstractMotionController";
// @ts-ignore
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
// @ts-ignore
import { Object3DPickable } from "./object/Object3DPickable";
// @ts-ignore
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Player } from "./Player";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color"; // Add this import
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WebXRFeatureName } from "@babylonjs/core";
import XRLogger from "./XRLogger";
//@ts-ignore
import { WebXRMotionControllerTeleportation } from "@babylonjs/core/XR/features/WebXRControllerTeleportation";

export class XRHandler{

    xr: WebXRDefaultExperience;
    leftController: WebXRAbstractMotionController | null;
    rightController: WebXRAbstractMotionController | null;
    scene: Scene;
    player : Player;
    headset: WebXRInputSource | null;
    private highlightedMesh: AbstractMesh | null = null;
    private highlightingObservable: any;
    private glowLayer: GlowLayer | null = null;
    private requestSceneSwitch: () => Promise<void>;

    constructor(
        scene: Scene,
        xr: WebXRDefaultExperience,
        player: Player,
        requestSceneSwitchFn: () => Promise<void>,
        eventMask : number,
        ground : AbstractMesh
    ) {
        this.scene = scene;
        this.xr = xr;
        this.player = player;
        this.requestSceneSwitch = requestSceneSwitchFn;
        this.leftController = null;
        this.rightController = null;
        this.headset = null; //TODO : Get headset
        this.highlightedMesh = null;
        // Add a GlowLayer for highlighting effect if not already present
        this.glowLayer = scene.getGlowLayerByName?.("xrHighlightGlow") as GlowLayer;
        if (!this.glowLayer) {
            this.glowLayer = new GlowLayer("xrHighlightGlow", scene);
            this.glowLayer.intensity = 1.5; // Increase for stronger glow
        }
        this.getLeftAndRightControllers();
        this.addXRControllersRoutine(scene, xr, eventMask, ground, player);
        this.setupObjectSelection();
        this.setupHighlighting(); // Add highlighting setup
        this.setupSceneSwitchControls();
        this.syncCapsuleWithCameraOnTeleport(xr, player, ground);
        new XRLogger(xr, scene); // Initialize XRLogger
    }

    getLeftAndRightControllers(){
        this.xr.input.onControllerAddedObservable.add((controller) => {
            controller.onMotionControllerInitObservable.add((motionController) => {
                const handedness = motionController.handedness;
                if (handedness === 'left') {
                    this.leftController = motionController;
                    console.log("left controller added");
                    console.log(this.leftController);

                } else if (handedness === 'right') {
                    this.rightController = motionController;
                    console.log("right controller added");
                    console.log(this.rightController);
                }
            });
        });
    }

    setupObjectSelection() {
        this.xr.input.onControllerAddedObservable.add((controller) => {
            controller.onMotionControllerInitObservable.add((motionController) => {
                const handedness = motionController.handedness;
                if (handedness === 'left') {
                    const xButtonComponent = motionController.getComponent("x-button");
                    if (xButtonComponent) {
                        xButtonComponent.onButtonStateChangedObservable.add((button) => {
                            if (button.pressed) {
                                console.log("X Button pressed");
                                const camera = this.xr.baseExperience.camera;
                                const ray = camera.getForwardRay();

                                // --- Cone picking logic ---
                                const meshes = this.scene.meshes.filter(mesh =>
                                    !!mesh && mesh.isPickable && (mesh as any).object3DPickable
                                );
                                let bestPick: { mesh: AbstractMesh, point: Vector3, angle: number, distance: number } | null = null;
                                const maxAngle = Math.PI / 16; // ~11.25° cone, increase for more margin
                                const maxDistance = 10; // max picking distance

                                for (const mesh of meshes) {
                                    const boundingInfo = mesh.getBoundingInfo();
                                    const center = boundingInfo.boundingBox.centerWorld;
                                    const toCenter = center.subtract(ray.origin);
                                    const distance = toCenter.length();
                                    if (distance > maxDistance) continue;
                                    const angle = Math.acos(Vector3.Dot(ray.direction.normalize(), toCenter.normalize()));
                                    if (angle < maxAngle) {
                                        if (!bestPick || angle < bestPick.angle || (angle === bestPick.angle && distance < bestPick.distance)) {
                                            bestPick = { mesh, point: center, angle, distance };
                                        }
                                    }
                                }

                                if (bestPick) {
                                    this.player.selectObject(bestPick.mesh, bestPick.point, this.xr, this.scene);
                                    (bestPick.mesh as any).object3DPickable.onSelect?.();
                                    const distance = camera.position.subtract(bestPick.point).length();
                                    this.scene.onBeforeRenderObservable.remove(this.highlightingObservable);
                                    console.log("Distance to target:", distance);
                                } else if (this.player.selectedObject) {
                                    (this.player.selectedObject as any).object3DPickable.onDeselect?.();
                                    this.player.deselectObject(this.scene);
                                    this.setupHighlighting(); // Reset highlighting if no object is selected
                                }
                            }
                        });
                    }
                }
            });
        });
    }

    setupHighlighting() {
        this.highlightingObservable = this.scene.onBeforeRenderObservable.add(() => {
            if(!this.player.selectedObject){
                const camera = this.xr.baseExperience.camera;
                const ray = camera.getForwardRay();

                // --- Cone highlighting logic ---
                const meshes = this.scene.meshes.filter(mesh =>
                    !!mesh && mesh.isPickable && (mesh as any).object3DPickable
                );
                let bestPick: { mesh: AbstractMesh, angle: number, distance: number } | null = null;
                const maxAngle = Math.PI / 16; // ~11.25° cone, increase for more margin
                const maxDistance = 10;

                for (const mesh of meshes) {
                    const boundingInfo = mesh.getBoundingInfo();
                    const center = boundingInfo.boundingBox.centerWorld;
                    const toCenter = center.subtract(ray.origin);
                    const distance = toCenter.length();
                    if (distance > maxDistance) continue;
                    const angle = Math.acos(Vector3.Dot(ray.direction.normalize(), toCenter.normalize()));
                    if (angle < maxAngle) {
                        if (!bestPick || angle < bestPick.angle || (angle === bestPick.angle && distance < bestPick.distance)) {
                            bestPick = { mesh, angle, distance };
                        }
                    }
                }

                // Remove highlight from previous mesh
                if (this.highlightedMesh && this.highlightedMesh !== bestPick?.mesh) {
                    const mat = this.highlightedMesh.material;
                    if (mat && mat instanceof StandardMaterial && (mat as any)._originalDiffuseColor) {
                        mat.diffuseColor = (mat as any)._originalDiffuseColor;
                    }
                    if (mat && mat instanceof StandardMaterial && (mat as any)._originalEmissiveColor) {
                        mat.emissiveColor = (mat as any)._originalEmissiveColor;
                    }
                    this.highlightedMesh = null;
                }

                // Highlight the new mesh
                if (bestPick) {
                    const mesh = bestPick.mesh as AbstractMesh;
                    let mat = mesh.material;
                    // --- Clone material if shared to avoid flickering ---
                    if (mat && mat instanceof StandardMaterial && mat.getScene().meshes.filter(m => m.material === mat).length > 1) {
                        mat = mat.clone(mesh.name + "_highlightMat");
                        mesh.material = mat;
                    }
                    if (mat && mat instanceof StandardMaterial) {
                        if (!(mat as any)._originalDiffuseColor) {
                            (mat as any)._originalDiffuseColor = mat.diffuseColor.clone();
                        }
                        if (!(mat as any)._originalEmissiveColor) {
                            (mat as any)._originalEmissiveColor = mat.emissiveColor.clone();
                        }
                        mat.diffuseColor = Color3.FromHexString("#A020F0"); // Violet
                        mat.emissiveColor = Color3.FromHexString("#A020F0"); // Violet for glow
                    }
                    this.highlightedMesh = mesh;
                }
            }
        });
    }

    setupSceneSwitchControls() {
        this.xr.input.onControllerAddedObservable.add((controller) => {
            controller.onMotionControllerInitObservable.add((motionController) => {
                // y ou b
                if (motionController.handedness === 'right') {
                    const bButton = motionController.getComponent("b-button");
                    if (bButton) {
                        bButton.onButtonStateChangedObservable.add((buttonState) => {
                            if (buttonState.pressed) {
                                console.log("B button pressed - requesting scene switch.");
                                this.requestSceneSwitch();
                            }
                        });
                    } else {
                        console.warn("B-button component not found on right controller.");
                    }
                }
            });
        });
    }

    // Add movement with left joystick
    //@ts-ignore
    addXRControllersRoutine(scene: Scene, xr: any, eventMask: number, ground: AbstractMesh, player: Player) {
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
                                player.teleportationEnabled = teleportationEnabled;
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
            // --- Disable movement and rotation if teleportation is enabled ---
            if (!teleportationEnabled) {
                const camera = xr.baseExperience.camera;


                player.setDesiredVelocityAndRotationFromInput(
                    xPositionInput,
                    yPositionInput,
                    rotationInput,
                    camera
                );
            } else {
                // If teleportation is enabled, stop movement and rotation
                player.setDesiredVelocityAndRotationFromInput(0, 0, 0, xr.baseExperience.camera);
            }
        });
    
        /*
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
        */
    }
    
    //@ts-ignore
    syncCapsuleWithCameraOnTeleport(xr: WebXRDefaultExperience, player: Player, ground : AbstractMesh) {
        const sessionManager = xr.baseExperience.sessionManager;
        sessionManager.onXRReferenceSpaceChanged.add(() => {
                (player.characterController as any)._position = xr.baseExperience.camera.position.clone();
                player.playerCapsule!.position = player.characterController!.getPosition();
        });
    }

}
export default XRHandler;

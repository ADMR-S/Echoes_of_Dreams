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

export class XRHandler{

    xr: WebXRDefaultExperience;
    leftController: WebXRAbstractMotionController | null;
    rightController: WebXRAbstractMotionController | null;
    scene: Scene;
    player : Player;
    headset: WebXRInputSource | null;
    private highlightedMesh: AbstractMesh | null = null;
    private glowLayer: GlowLayer | null = null;

    constructor(scene: Scene, xr : WebXRDefaultExperience, player : Player){
        this.scene = scene;
        this.xr = xr;
        this.player = player;
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
        this.setupObjectSelection();
        this.setupHighlighting(); // Add highlighting setup
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
                                    const distance = camera.position.subtract(bestPick.point).length();
                                    console.log("Distance to target:", distance);
                                } else if (this.player.selectedObject) {
                                    this.player.deselectObject(this.scene);
                                }
                            }
                        });
                    }
                }
            });
        });
    }

    setupHighlighting() {
        this.scene.onBeforeRenderObservable.add(() => {
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
                    const mat = mesh.material;
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

}
export default XRHandler;

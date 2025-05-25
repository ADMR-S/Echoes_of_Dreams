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
                                // Only pick meshes that belong to Object3DPickable
                                const pickResult = this.scene.pickWithRay(ray, (mesh) =>
                                    !!mesh && mesh.isPickable && (mesh as any).object3DPickable
                                );
                                if (pickResult && pickResult.pickedMesh && pickResult.pickedPoint) {
                                    // Only select if not already selected, or if selecting a different object
                                    if (!this.player.selectedObject || this.player.selectedObject !== pickResult.pickedMesh) {
                                        this.player.selectObject(pickResult.pickedMesh, pickResult.pickedPoint, this.xr, this.scene);
                                        const distance = camera.position.subtract(pickResult.pickedPoint).length();
                                        console.log("Distance to target:", distance);
                                    } else {
                                        // If already selected, deselect
                                        this.player.deselectObject(this.scene);
                                    }
                                } else if (this.player.selectedObject) {
                                    // Deselect if nothing is picked but something is selected
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
                // Only highlight meshes that belong to Object3DPickable
                const pickResult = this.scene.pickWithRay(ray, (mesh) => 
                    !!mesh && mesh.isPickable && (mesh as any).object3DPickable
                );

                // Remove highlight from previous mesh
                if (this.highlightedMesh && this.highlightedMesh !== pickResult?.pickedMesh) {
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
                if (pickResult && pickResult.pickedMesh) {
                    const mesh = pickResult.pickedMesh as AbstractMesh;
                    const mat = mesh.material;
                    if (mat && mat instanceof StandardMaterial) {
                        if (!(mat as any)._originalDiffuseColor) {
                            (mat as any)._originalDiffuseColor = mat.diffuseColor.clone();
                        }
                        if (!(mat as any)._originalEmissiveColor) {
                            (mat as any)._originalEmissiveColor = mat.emissiveColor.clone();
                        }
                        // Set to violet
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

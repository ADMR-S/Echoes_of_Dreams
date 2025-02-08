import { Scene } from "@babylonjs/core/scene";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { WebXRAbstractMotionController } from "@babylonjs/core/XR/motionController/webXRAbstractMotionController";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Object3DPickable } from "./object/Object3DPickable";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Player } from "./Player";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";

export class XRHandler{

    xr: WebXRDefaultExperience;
    leftController: WebXRAbstractMotionController | null;
    rightController: WebXRAbstractMotionController | null;
    scene: Scene;
    player : Player;

    constructor(scene: Scene, xr : WebXRDefaultExperience, player : Player){
        this.scene = scene;
        this.xr = xr;
        this.player = player;
        this.leftController = null;
        this.rightController = null;
        this.getLeftAndRightControllers();
        this.setupObjectSelection();
    }

    getLeftAndRightControllers(){
        this.xr.input.onControllerAddedObservable.add((controller) => {
            controller.onMotionControllerInitObservable.add((motionController) => {
                const handedness = motionController.handedness;
                if (handedness === 'left') {
                    this.leftController = motionController;

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
                                this.selectObject(controller);
                            }
                        });
                    }
                }
            });
        });
    }

    selectObject(controller : WebXRInputSource) {
        const pickResult = this.xr.pointerSelection.getMeshUnderPointer(controller.uniqueId);
        console.log("ON SELECTIONNE : ");
        console.log(pickResult);
        if (pickResult) {
            const selectedObject = pickResult;
            selectedObject.parent = this.xr.baseExperience.camera;
            this.player.selectedObject = selectedObject;
            this.animateObject(selectedObject);
        }
    }

    animateObject(object : AbstractMesh) {
        this.scene.onBeforeRenderObservable.add(() => {
            object.rotation.x += 0.01;
            object.rotation.y += 0.01;
        });
    }
}
export default XRHandler;

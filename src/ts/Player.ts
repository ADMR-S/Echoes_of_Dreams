import { WebXRDefaultExperience, WebXRInputSource } from "@babylonjs/core";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";

export class Player{
    
    selectedObject : TransformNode | null;

    constructor(){
        this.selectedObject = null;
    }

    selectObject(object : TransformNode, xr : WebXRDefaultExperience, scene : Scene){
        if(this.selectedObject){ //In case an object is already selected
            return;
        }
        console.log("ON SELECTIONNE : ");
        console.log(object);
        object.parent = xr.baseExperience.camera;
        this.animateObject(object, scene);
        this.selectedObject = object;
    }

    animateObject(object : TransformNode, scene : Scene){ //A déplacer, mais pickMesh renvoie un Mesh et pas un Object3DPickable (faire un get par id dans la scene ?)
        scene.onBeforeRenderObservable.add(() => {
            object.rotation.x += 0.01;
            object.rotation.y += 0.01;
        });
    }
}
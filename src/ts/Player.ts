import { WebXRDefaultExperience, WebXRInputSource } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";

//Sortir les attributs de l'objet de la classe Player vers la classe ObjetPickable

export class Player{
    
    selectedObject : AbstractMesh | null;
    private animationObservable: any;

    constructor(){
        this.selectedObject = null;
        this.animationObservable = null;
    }

    selectObject(object : AbstractMesh, xr : WebXRDefaultExperience, scene : Scene){
        if(this.selectedObject){ //In case an object is already selected
         
            console.log("Un objet est déjà sélectionné !");
            console.log("On déselectionne : ");
            console.log(this.selectedObject);
            this.selectedObject.setParent(null);
            if (this.animationObservable) {
                scene.onBeforeRenderObservable.remove(this.animationObservable);
                this.animationObservable = null;
            }
            this.selectedObject = null;
            return;
        }
        else{
            console.log("ON SELECTIONNE : ");
            console.log(object);
            object.setParent(xr.baseExperience.camera);
            this.animateObject(object, scene);
            this.selectedObject = object;
    }
}

    animateObject(object : AbstractMesh, scene : Scene){
        this.animationObservable = scene.onBeforeRenderObservable.add(() => {
            const deltaRotation = Quaternion.RotationYawPitchRoll(0.01, 0.01, 0);
            object.rotationQuaternion = object.rotationQuaternion
                ? object.rotationQuaternion.multiply(deltaRotation)
                : deltaRotation;
        });
    }
}
import { WebXRDefaultExperience, WebXRInputSource } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export class Player{
    
    selectedObject : AbstractMesh | null;

    constructor(){
        this.selectedObject = null;
    }

    selectObject(object : AbstractMesh, xr : WebXRDefaultExperience, scene : Scene){
        if(this.selectedObject){ //In case an object is already selected
         
            console.log("Un objet est déjà sélectionné !");
            console.log("On déselectionne : ");
            console.log(this.selectedObject);
            this.selectedObject.setParent(null);
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

    animateObject(object : AbstractMesh, scene : Scene){ //A déplacer, mais pickMesh renvoie un Mesh et pas un Object3DPickable (faire un get par id dans la scene ?)
        scene.onBeforeRenderObservable.add(() => {
            object.rotation.x += 0.01;
            object.rotation.y += 0.01;
        });
    }
}
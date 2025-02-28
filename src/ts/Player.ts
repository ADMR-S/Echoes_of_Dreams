import { WebXRDefaultExperience, WebXRInputSource } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";

//Sortir les attributs de l'objet de la classe Player vers la classe ObjetPickable
//Snapping et displacement en cours de dev

const DEFAULTCAMERAPITCHVALUE = 2; //The value of the camera's pitch when no object is selected
const DEFAULT_DISPLACEMENT = new Vector3(0, 0, 0); // Default displacement if no hit or too far

export class Player{
    
    selectedObject : AbstractMesh | null;
    initialCameraPitch : number; //To update the selected object's size
    private animationObservable: any;
    private resizeObservable: any;
    private displacementObservable: any;

    constructor(){
        this.selectedObject = null;
        this.animationObservable = null;
        this.initialCameraPitch = 0;
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
                scene.onBeforeRenderObservable.remove(this.resizeObservable);
                this.resizeObservable = null;
                this.initialCameraPitch = DEFAULTCAMERAPITCHVALUE;
                scene.onBeforeRenderObservable.remove(this.displacementObservable);
                this.displacementObservable = null;
            }
            this.selectedObject = null;
            return;
        }
        else{
            console.log("ON SELECTIONNE : ");
            console.log(object);
            object.setParent(xr.baseExperience.camera);
            this.animateObject(object, scene);
            this.resizeObject(object, scene, xr);
            this.selectedObject = object;
            this.snapObjectToRayHit(xr, scene);
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

    resizeObject(object : AbstractMesh, scene : Scene, xr : WebXRDefaultExperience){
        this.resizeObservable = scene.onBeforeRenderObservable.add(() => {
            const scaleFactor = this.calculateScaleFactor(xr);
            console.log("scaleFactor");
            console.log(scaleFactor);
            object.scaling.set(scaleFactor, scaleFactor, scaleFactor);
        });
    }

    calculateScaleFactor(xr : WebXRDefaultExperience){
        const camera = xr.baseExperience.camera;
        console.log("camera");
        console.log(camera);
        if(camera != null){
            if(this.initialCameraPitch === DEFAULTCAMERAPITCHVALUE){
                this.initialCameraPitch = camera.rotationQuaternion.x;
            }
        }
        const scaleFactor = 1 + (this.initialCameraPitch-camera.rotationQuaternion.x);
        return scaleFactor;
    }

    snapObjectToRayHit(xr: WebXRDefaultExperience, scene: Scene) {
        this.displacementObservable = scene.onBeforeRenderObservable.add(() => {
        const camera = xr.baseExperience.camera;
        const ray = new Ray(camera.position, camera.getForwardRay().direction, 50);
        const hit = scene.pickWithRay(ray, (mesh) => mesh !== this.selectedObject);
        if(this.selectedObject !=null){     
            if (hit && hit.pickedPoint) {
                this.selectedObject.position = hit.pickedPoint;
            } 
            else {
                this.selectedObject.position = camera.position.add(camera.getForwardRay().direction.scale(1));
            }
        }
    });
    }
}
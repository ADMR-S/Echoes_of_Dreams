import { WebXRDefaultExperience } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import { RayHelper } from "@babylonjs/core/Debug/rayHelper";
import { Color3 } from "@babylonjs/core/Maths/math.color";

//Sortir les attributs de l'objet de la classe Player vers la classe ObjetPickable
//Snapping et displacement en cours de dev

export class Player{
    
    selectedObject : AbstractMesh | null;
    selectedObjectInitialDistance : number | null = null; //To update the selected object's size
    private selectedObjectOriginalScaling: Vector3 | null = null; // Store original scaling
    private animationObservable: any;
    private resizeObservable: any;
    private displacementObservable: any;
    private rayHelper: RayHelper | null = null;

    constructor(){
        this.selectedObject = null;
        this.selectedObjectInitialDistance = null;
        this.animationObservable = null;
    }

    selectObject(object : AbstractMesh, objectCoordinates : Vector3, xr : WebXRDefaultExperience, scene : Scene){
        if(this.selectedObject){ //In case an object is already selected
         
            console.log("Un objet est déjà sélectionné !");
            console.log("On déselectionne : ");
            console.log(this.selectedObject);
            this.selectedObject.parent = null;
            this.selectedObject.isPickable = true; // Make it pickable again
            if (this.animationObservable) {
                scene.onBeforeRenderObservable.remove(this.animationObservable);
                this.animationObservable = null;
                scene.onBeforeRenderObservable.remove(this.resizeObservable);
                this.resizeObservable = null;
                scene.onBeforeRenderObservable.remove(this.displacementObservable);
                this.displacementObservable = null;
            }
            this.selectedObject = null;
            this.selectedObjectInitialDistance = null;
            this.selectedObjectOriginalScaling = null;
            return;
        }
        else{
            console.log("ON SELECTIONNE : ");
            console.log(object);
            // Do NOT parent to camera
            // object.parent = xr.baseExperience.camera;
            this.selectedObject = object;
            this.selectedObject.isPickable = false; // Make it not pickable
            this.selectedObjectOriginalScaling = object.scaling.clone(); // Store original scaling
            this.animateObject(object, scene);
            this.resizeObject(object, scene, xr);
            this.snapObjectToRayHit(xr, scene);

            const distance = xr.baseExperience.camera.position.subtract(objectCoordinates).length();
            this.selectedObjectInitialDistance = distance;
            console.log("Distance to target:", distance)
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
            const camera = xr.baseExperience.camera;
            const ray = camera.getForwardRay();
            // Pick the first mesh hit by the ray (ignoring the camera itself)
            const pickResult = scene.pickWithRay(ray, (mesh) => !!mesh && mesh.isPickable);

            var distance = 0;
            if(pickResult?.pickedPoint){
                distance = camera.position.subtract(pickResult.pickedPoint).length();
            }
            else{
                //Valeur par défaut si trop loin ou pas de hit
            }

            if(this.selectedObjectInitialDistance && this.selectedObjectOriginalScaling){
                const scaleFactor = this.calculateScaleFactor(this.selectedObjectInitialDistance, distance);
                // Always scale from the original scaling
                object.scaling.copyFrom(this.selectedObjectOriginalScaling.scale(scaleFactor));
            }
        });
    }

    calculateScaleFactor(initialDistance : number, distance: number): number {
        const scaleFactor = distance/initialDistance;
        return scaleFactor;
    }

    snapObjectToRayHit(xr: WebXRDefaultExperience, scene: Scene) {
        this.displacementObservable = scene.onBeforeRenderObservable.add(() => {
            const camera = xr.baseExperience.camera;
            var cameraRay = camera.getForwardRay();

            //For visibility : 
            const offset = new Vector3(0.1, 0, 0);
            cameraRay.origin.addInPlace(offset);

            this.visualizeRay(cameraRay, scene);

            const hit = scene.pickWithRay(cameraRay, (mesh) => mesh !== this.selectedObject);
            if(this.selectedObject !=null){     
                if (hit && hit.pickedPoint) {
                    this.selectedObject.position = hit.pickedPoint;
                } 
                else {
                    //this.selectedObject.position = camera.position.add(camera.getForwardRay().direction.scale(0.1));
                }
            }
        });
    }

    visualizeRay(ray: Ray, scene: Scene) {
        if (this.rayHelper) {
            this.rayHelper.dispose();
        }
        this.rayHelper = new RayHelper(ray);
        this.rayHelper.show(scene, new Color3(0, 1, 0)); // Set ray color to green
    }
}
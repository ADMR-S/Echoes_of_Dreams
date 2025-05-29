import { WebXRDefaultExperience } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import { RayHelper } from "@babylonjs/core/Debug/rayHelper";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PhysicsMotionType, PhysicsPrestepType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
//Sortir les attributs de l'objet de la classe Player vers la classe ObjetPickable
//Snapping et displacement en cours de dev

export class Player{
    
    selectedObject : AbstractMesh | null;
    selectedObjectInitialDistance : number | null = null; //To update the selected object's size
    private selectedObjectOriginalScaling: Vector3 | null = null; // Store original scaling
    private animationObservable: any;
    private resizeAndRepositionObjectObservable: any;
    private rayHelper: RayHelper | null = null;

    constructor(){
        this.selectedObject = null;
        this.selectedObjectInitialDistance = null;
        this.animationObservable = null;
    }

    deselectObject(scene: Scene){
        if(this.selectedObject){
            console.log("Un objet est déjà sélectionné !");
            console.log("On déselectionne : ");
            console.log(this.selectedObject);
            this.selectedObject.parent = null;
            this.selectedObject.isPickable = true;
            console.log("Set isPickable = true for", this.selectedObject.name, "uniqueId:", this.selectedObject.uniqueId);
            if (this.animationObservable) {
                scene.onBeforeRenderObservable.remove(this.animationObservable);
                this.animationObservable = null;
                scene.onBeforeRenderObservable.remove(this.resizeAndRepositionObjectObservable);
                this.resizeAndRepositionObjectObservable = null;
            }
            (this.selectedObject as any).object3DPickable.extra.aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
            (this.selectedObject as any).object3DPickable.extra.aggregate.body.setPrestepType(PhysicsPrestepType.DISABLED);
            this.selectedObject = null;
            this.selectedObjectInitialDistance = null;
            this.selectedObjectOriginalScaling = null;
            return;
        }
    }


    selectObject(object : AbstractMesh, objectCoordinates : Vector3, xr : WebXRDefaultExperience, scene : Scene){
        if(this.selectedObject){ //In case an object is already selected
            this.deselectObject(scene);
        }
        else{
            if (!(object as any).object3DPickable){
                return; // Not a pickable object
            }
            // Stop motion if physics body exists
            const object3DPickable = (object as any).object3DPickable;
            const body = object3DPickable.extra.aggregate.body;
            body.setLinearVelocity(Vector3.Zero());
            body.setAngularVelocity(Vector3.Zero());
                        // Set motion type to ANIMATED to prevent physics simulation
            body.setMotionType(PhysicsMotionType.ANIMATED);
            body.setPrestepType(PhysicsPrestepType.TELEPORT);

            console.log("ON SELECTIONNE : ");
            console.log(object);
            // Do NOT parent to camera
            // object.parent = xr.baseExperience.camera;
            this.selectedObject = object;
            object.isPickable = false;
            console.log("Set isPickable = false for", this.selectedObject.name, "uniqueId:", this.selectedObject.uniqueId);
            this.selectedObjectOriginalScaling = object.scaling.clone();

            // Calculate offset distance based on bounding box
            const boundingInfo = object.getBoundingInfo();
            const min = boundingInfo.boundingBox.minimumWorld;
            const max = boundingInfo.boundingBox.maximumWorld;
            const size = max.subtract(min);
            const greatestDimension = Math.max(size.x, size.y, size.z);
            const selectedObjectBaseOffsetDistance = greatestDimension / 2 + 0.01; // Add small epsilon

            
            // Delay displacement observable by one frame to ensure isPickable is updated
            setTimeout(() => {
                this.animateObject(object, scene);
                this.resizeAndRepositionObject(object, scene, xr, selectedObjectBaseOffsetDistance);
            }, 0);

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

    resizeAndRepositionObject(object : AbstractMesh, scene : Scene, xr : WebXRDefaultExperience, selectedObjectBaseOffsetDistance: number = 0.01) {
        this.resizeAndRepositionObjectObservable = scene.onBeforeRenderObservable.add(() => {
        
            const camera = xr.baseExperience.camera;
            const ray = camera.getForwardRay();
            // Pick the first mesh hit by the ray (ignoring the camera itself)
            const pickResult = scene.pickWithRay(ray, (mesh) => !this.selectedObject && mesh.isPickable);

            //Displace ray slightly to avoid picking the camera itself
            const offset = new Vector3(0.1, 0, 0);
            ray.origin.addInPlace(offset);

            var distance = 0;
            if(pickResult?.pickedPoint && pickResult.pickedMesh){
                distance = camera.position.subtract(pickResult.pickedPoint).length();
                console.log("DISPLACEMENT Picked mesh:", pickResult.pickedMesh.name, "uniqueId:", pickResult.pickedMesh.uniqueId, "Selected object:", this.selectedObject?.name, "uniqueId:", this.selectedObject?.uniqueId);

            }
            /* //Restrict distance to a maximum value and handle no hit cases
            else{
                distance = 100;
                //Valeur par défaut si trop loin ou pas de hit
            }
            if(distance > 100){
                distance = 100
            }
            */


            /*
            //For visibility : 
            const offset = new Vector3(0.1, 0, 0);
            ray.origin.addInPlace(offset);
            */

            //this.visualizeRay(cameraRay, scene);


            if(this.selectedObject){     
                if (pickResult && pickResult.pickedPoint) {
                    
                // Use precomputed offset distance
                const offsetVec = ray.direction.scale(-selectedObjectBaseOffsetDistance);
                this.selectedObject.position = pickResult.pickedPoint.add(offsetVec);
                } 
                else if (this.selectedObjectInitialDistance && this.selectedObjectOriginalScaling) {
                    this.selectedObject.position = camera.position.add(ray.direction.scale(this.selectedObjectInitialDistance*(this.selectedObject.scaling.clone().length()/this.selectedObjectOriginalScaling.length())));
                }
            }

            if(this.selectedObjectInitialDistance && this.selectedObjectOriginalScaling){
                const scaleFactor = this.calculateScaleFactor(this.selectedObjectInitialDistance, distance, selectedObjectBaseOffsetDistance);
                // Always scale from the original scaling
                object.scaling.copyFrom(this.selectedObjectOriginalScaling.scale(scaleFactor));
            }
        });
    }

    calculateScaleFactor(initialDistance : number, distance: number, offsetDistance: number = 0): number {
        // Subtract offsetDistance from the measured distance to keep the object in front of the surface
        const scaleFactor = (distance - offsetDistance) / initialDistance;
        return scaleFactor > 0 ? scaleFactor : 0.01; // Prevent negative or zero scale
    }

    visualizeRay(ray: Ray, scene: Scene) {
        if (this.rayHelper) {
            this.rayHelper.dispose();
        }
        this.rayHelper = new RayHelper(ray);
        this.rayHelper.show(scene, new Color3(0, 1, 0)); // Set ray color to green
    }
}
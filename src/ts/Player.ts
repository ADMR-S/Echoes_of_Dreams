import { WebXRDefaultExperience } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import { RayHelper } from "@babylonjs/core/Debug/rayHelper";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { BoundingBox } from "@babylonjs/core/Culling/boundingBox"; // Add this import

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
            this.selectedObject.isPickable = true;
            console.log("Set isPickable = true for", this.selectedObject.name, "uniqueId:", this.selectedObject.uniqueId);
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
            object.isPickable = false;
            console.log("Set isPickable = false for", this.selectedObject.name, "uniqueId:", this.selectedObject.uniqueId);
            this.selectedObjectOriginalScaling = object.scaling.clone();

            // Calculate offset distance based on bounding box
            const boundingInfo = object.getBoundingInfo();
            const min = boundingInfo.boundingBox.minimumWorld;
            const max = boundingInfo.boundingBox.maximumWorld;
            const size = max.subtract(min);
            const greatestDimension = Math.max(size.x, size.y, size.z);
            const selectedObjectOffsetDistance = greatestDimension / 2 + 0.01; // Add small epsilon

            this.animateObject(object, scene);
            this.resizeObject(object, scene, xr, selectedObjectOffsetDistance);

            // Delay displacement observable by one frame to ensure isPickable is updated
            setTimeout(() => {
                this.snapObjectToRayHit(xr, scene, selectedObjectOffsetDistance);
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

    resizeObject(object : AbstractMesh, scene : Scene, xr : WebXRDefaultExperience, selectedObjectOffsetDistance: number = 0.1) {
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
                const scaleFactor = this.calculateScaleFactor(this.selectedObjectInitialDistance, distance, selectedObjectOffsetDistance);
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

    snapObjectToRayHit(xr: WebXRDefaultExperience, scene: Scene, selectedObjectOffsetDistance: number = 0) {
        this.displacementObservable = scene.onBeforeRenderObservable.add(() => {
            const camera = xr.baseExperience.camera;
            const cameraRay = camera.getForwardRay();

            //For visibility : 
            const offset = new Vector3(0.1, 0, 0);
            cameraRay.origin.addInPlace(offset);

            //this.visualizeRay(cameraRay, scene);

            // Only pick meshes that are not the selected object (Babylon.js already ignores non-pickable meshes)
            const hit = scene.pickWithRay(cameraRay, (mesh) => mesh !== this.selectedObject);

            // Debug: log what mesh is being picked
            if (hit && hit.pickedMesh) {
                console.log("DISPLACEMENT Picked mesh:", hit.pickedMesh.name, "uniqueId:", hit.pickedMesh.uniqueId, "Selected object:", this.selectedObject?.name, "uniqueId:", this.selectedObject?.uniqueId);
            }

            if(this.selectedObject != null){     
                if (hit && hit.pickedPoint) {
                    
                    //GET OBJECT CLOSER TO AVOID CLIPPING
                    // Iteratively move the object closer to the camera until no collision
                    let offsetDistance = selectedObjectOffsetDistance;
                    const minOffset = 0.01;
                    var step = 0.1;
                    let foundSafe = false;
                    let maxIterations = 20;

                    while (offsetDistance >= minOffset && maxIterations-- > 0) {
                        const testPosition = hit.pickedPoint.add(cameraRay.direction.scale(-offsetDistance));
                        this.selectedObject.position.copyFrom(testPosition);

                        // If you want to rescale as you get closer, do it here:
                        if (this.selectedObjectInitialDistance && this.selectedObjectOriginalScaling) {
                            const cameraToTest = camera.position.subtract(testPosition).length();
                            const scaleFactor = this.calculateScaleFactor(this.selectedObjectInitialDistance, cameraToTest, offsetDistance);
                            this.selectedObject.scaling.copyFrom(this.selectedObjectOriginalScaling.scale(scaleFactor));
                        }

                        // Check for collisions using physics engine
                        const physicsBody = (this.selectedObject as any).physicsBody || (this.selectedObject as any)._physicsBody;
                        let isColliding = false;
                        if (physicsBody && physicsBody.getCollisionObservable) {
                            // If you have a way to check for collisions directly, use it here.
                            // Otherwise, use bounding box intersection as a fallback:
                            const boundingBox = this.selectedObject.getBoundingInfo().boundingBox;
                            for (const mesh of scene.meshes) {
                                if (mesh !== this.selectedObject && mesh.isEnabled() && mesh.isVisible && mesh.isPickable) {
                                    const otherBox = mesh.getBoundingInfo().boundingBox;
                                    if (BoundingBox.Intersects(boundingBox, otherBox)) {
                                        isColliding = true;
                                        break;
                                    }
                                }
                            }
                        } else {
                            // Fallback: bounding box intersection
                            const boundingBox = this.selectedObject.getBoundingInfo().boundingBox;
                            for (const mesh of scene.meshes) {
                                if (mesh !== this.selectedObject && mesh.isEnabled() && mesh.isVisible && mesh.isPickable) {
                                    const otherBox = mesh.getBoundingInfo().boundingBox;
                                    if (BoundingBox.Intersects(boundingBox, otherBox)) {
                                        isColliding = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!isColliding) {
                            foundSafe = true;
                            break;
                        }
                        step *= 2; // Double the step size to speed up the search
                        offsetDistance += step;
                    }
                    if(!foundSafe) {
                        console.log("ERROR : No safe position found for object:", this.selectedObject.name, "uniqueId:", this.selectedObject.uniqueId);
                    }
                    // If no safe position found, keep at the last tested position
                } 
                else if (this.selectedObjectInitialDistance && this.selectedObjectOriginalScaling) {
                    this.selectedObject.position = camera.position.add(cameraRay.direction.scale(this.selectedObjectInitialDistance*(this.selectedObject.scaling.clone().length()/this.selectedObjectOriginalScaling.length())));
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
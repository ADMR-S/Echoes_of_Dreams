import { Camera, MeshBuilder, WebXRDefaultExperience } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import { RayHelper } from "@babylonjs/core/Debug/rayHelper";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PhysicsMotionType, PhysicsPrestepType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { Object3DPickable } from "./object/Object3DPickable";
import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";
//Sortir les attributs de l'objet de la classe Player vers la classe ObjetPickable
//Snapping et displacement en cours de dev

export class Player{
    
    MAX_DISTANCE = 20; // Maximum distance for object placement
    selectedObject : AbstractMesh | null;
    selectedObjectInitialDistance : number | null = null; //To update the selected object's size
    private selectedObjectOriginalScaling: Vector3 | null = null; // Store original scaling
    private selectedObjectLightInitialIntensity: number | null = null; // Store original light intensity if needed
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
            const objPickable = (this.selectedObject as any).object3DPickable;
            // --- Refresh physics aggregate on deselect ---
            objPickable.refreshPhysicsAggregate(
                this.selectedObject.getScene(),
                objPickable.shapeType,
                { mass: 1 }
            );
            objPickable.aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
            objPickable.aggregate.body.setPrestepType(PhysicsPrestepType.DISABLED);
            // Enable air friction after refreshing aggregate
            objPickable.enableAirFriction(0.98); // or your preferred damping factor
            this.selectedObject = null;
            this.selectedObjectInitialDistance = null;
            this.selectedObjectOriginalScaling = null;
            this.selectedObjectLightInitialIntensity = null; // Reset light intensity if needed
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
            const object3DPickable = (object as any).object3DPickable as Object3DPickable;
            if(object3DPickable.aggregate){
                const body = object3DPickable.aggregate.body;
                body.setLinearVelocity(Vector3.Zero());
                body.setAngularVelocity(Vector3.Zero());
                            // Set motion type to ANIMATED to prevent physics simulation
                body.setMotionType(PhysicsMotionType.ANIMATED);
                body.setPrestepType(PhysicsPrestepType.TELEPORT);
            }
            console.log("ON SELECTIONNE : ");
            console.log(object);
            // Do NOT parent to camera
            // object.parent = xr.baseExperience.camera;
            // Store the pickable for later use if needed
            this.selectedObject = object;
            object.isPickable = false;
            console.log("Set isPickable = false for", this.selectedObject.name, "uniqueId:", this.selectedObject.uniqueId);
            this.selectedObjectOriginalScaling = object.scaling.clone();
            if(object3DPickable.extra.pointLight){
            this.selectedObjectLightInitialIntensity = object3DPickable.extra.pointLight.intensity; // Store original light intensity if needed
            }

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
                this.resizeAndRepositionObject(object3DPickable, scene, xr, selectedObjectBaseOffsetDistance);
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

    resizeAndRepositionObject(
        objectPickable: Object3DPickable,
        scene: Scene,
        xr: WebXRDefaultExperience,
        //@ts-ignore
        offsetDistance: number = 0.01
    ) {
        this.resizeAndRepositionObjectObservable = scene.onBeforeRenderObservable.add(() => {
        
            const camera = xr.baseExperience.camera;
            const ray = camera.getForwardRay();
            // Pick the first mesh hit by the ray (ignoring the camera itself)
            const pickResult = scene.pickWithRay(ray, (mesh) => !!mesh && mesh.isPickable);

            if(pickResult?.pickedMesh){
                // If a mesh is picked, log the details
                console.log("Picked mesh:", pickResult.pickedMesh.name, "uniqueId:", pickResult.pickedMesh.uniqueId);
            }


            var distance = 0;
            if(pickResult?.pickedPoint && pickResult.pickedMesh){
                distance = camera.position.subtract(pickResult.pickedPoint).length();
                console.log("DISPLACEMENT Picked mesh:", pickResult.pickedMesh.name, "uniqueId:", pickResult.pickedMesh.uniqueId, "Selected object:", this.selectedObject?.name, "uniqueId:", this.selectedObject?.uniqueId);

            }
             //Restrict distance to a maximum value and handle no hit cases
            else{
                distance = this.MAX_DISTANCE;
                //Valeur par défaut si trop loin ou pas de hit
            }
            if(distance > this.MAX_DISTANCE){
                distance = this.MAX_DISTANCE;
            }
            


            /*
            //For visibility : 
            const offset = new Vector3(0.1, 0, 0);
            ray.origin.addInPlace(offset);
            */

            //this.visualizeRay(cameraRay, scene);
            var currentOffset = distance/20;
            const maxIterations = 5;
            for(let i = 0; i < maxIterations; i++){
                this.resizeObject(objectPickable, distance, Math.abs(ray.direction.scale(-currentOffset).length()));
                if(distance === this.MAX_DISTANCE){//If distance >= MAX_DISTANCE, we use the ray direction to position the object
                    this.displaceObject(objectPickable, ray, currentOffset, camera, undefined);
                } else {
                    this.displaceObject(objectPickable, ray, currentOffset, camera, pickResult?.pickedPoint || undefined);
                }
                if(!this.checkNearbyBoundingBoxes(objectPickable)){
                    // If no nearby bounding boxes, break the loop
                    console.log("CORRECT POSITION FOUND");
                    break;
                } else {
                    console.log("MESHES INTERSECTING, REPOSITIONNING");
                    currentOffset *= 2;
                    if(i == maxIterations - 1){
                        //Use initial positionning :
                        this.resizeObject(objectPickable, distance, Math.abs(ray.direction.scale(-offsetDistance).length()));
                        this.displaceObject(objectPickable, ray, offsetDistance, camera, pickResult?.pickedPoint || undefined);
                        console.log("Max iterations reached, using initial positioning");
                    }
                }
            }
            
        });
    }

    resizeObject(objectPickable: Object3DPickable, distance : number, offsetDistance : number) {
        if(this.selectedObjectInitialDistance && this.selectedObjectOriginalScaling){
            const scaleFactor = this.calculateScaleFactor(this.selectedObjectInitialDistance, distance, offsetDistance);
            objectPickable.mesh.scaling.copyFrom(this.selectedObjectOriginalScaling.scale(scaleFactor));
            
            //Prevent meshes size to reach 0 : 
            if(objectPickable.mesh.scaling.x < 0.01 || objectPickable.mesh.scaling.y < 0.01 || objectPickable.mesh.scaling.z < 0.01){
                objectPickable.mesh.scaling = new Vector3(0.01, 0.01, 0.01);
            }
            if(objectPickable.extra.pointLight && this.selectedObjectLightInitialIntensity !== null) {
                // Clamp intensity to a maximum of 100
                const newIntensity = Math.min(this.selectedObjectLightInitialIntensity * scaleFactor, 100);
                objectPickable.extra.pointLight.intensity = newIntensity;
            }
        }
    }
    displaceObject(
        objectPickable: Object3DPickable,
        ray : Ray,
        offsetDistance : number,
        camera : Camera,
        targetPoint? : Vector3){                    
                if(targetPoint){
                    if(camera.position.subtract(targetPoint).length() > this.MAX_DISTANCE){
                        objectPickable.mesh.position = camera.position.add(ray.direction.scale(this.MAX_DISTANCE));
                    }
                    else{
                    // Use precomputed offset distance
                    const offsetVec = ray.direction.scale(-offsetDistance);
                    this.showVector(targetPoint, offsetVec, objectPickable.mesh.getScene(), Color3.Blue(), "offsetVector");
                    console.log("DISPLACEMENT : Offset vector:", offsetVec);
                    objectPickable.mesh.position = targetPoint.add(offsetVec);
                    }
                }
                else if(this.selectedObjectInitialDistance && this.selectedObjectOriginalScaling){
                    const scaleFactor = objectPickable.mesh.scaling.clone().length()/this.selectedObjectOriginalScaling.length()
                    objectPickable.mesh.position = camera.position.add(ray.direction.scale(this.selectedObjectInitialDistance*scaleFactor));
                }
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

    showVector(origin: Vector3, vector: Vector3, scene: Scene, color: Color3 = Color3.Red(), name: string = "vectorLine") {
        // Remove previous line if exists
        const oldLine = scene.getMeshByName(name);
        if (oldLine) {
            oldLine.dispose();
        }
        const points = [origin, origin.add(vector)];
        const line = MeshBuilder.CreateLines(name, { points }, scene);
        (line as any).color = color;
    }

    checkNearbyBoundingBoxes(objectPickable: Object3DPickable) {
        const myBoundingInfo = objectPickable.mesh.getBoundingInfo();
        const myWorldBox = new BoundingBox(
            myBoundingInfo.boundingBox.minimumWorld,
            myBoundingInfo.boundingBox.maximumWorld
        );
        const myCenter = myWorldBox.centerWorld;
        const myRadius = myWorldBox.extendSize.length();

        const scene = objectPickable.mesh.getScene();
        // Exclude self and skyBox
        const otherMeshes = scene.meshes.filter(mesh =>
            mesh !== objectPickable.mesh &&
            mesh.name !== "skyBox"
        );
        for (const mesh of otherMeshes) {
            // Defensive: skip meshes without bounding info (e.g., ground sometimes)
            if (!mesh.getBoundingInfo) continue;
            const otherBoundingInfo = mesh.getBoundingInfo();
            if (!otherBoundingInfo) continue;
            const otherWorldBox = new BoundingBox(
                otherBoundingInfo.boundingBox.minimumWorld,
                otherBoundingInfo.boundingBox.maximumWorld
            );
            const otherCenter = otherWorldBox.centerWorld;
            const otherRadius = otherWorldBox.extendSize.length();

            // --- Sphere radius sum quick check ---
            const centerDist = myCenter.subtract(otherCenter).length();
            if (centerDist > myRadius + otherRadius) continue; // Too far, skip expensive check

            if (BoundingBox.Intersects(myWorldBox, otherWorldBox)) {
                // Do something on intersection
                console.log("Bounding boxes intersect:", mesh.name);
                return true;
            }
        }
        return false; // No intersections found
    }
}
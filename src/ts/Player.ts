import { Camera, MeshBuilder, WebXRDefaultExperience } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import { RayHelper } from "@babylonjs/core/Debug/rayHelper";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PhysicsMotionType, PhysicsPrestepType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { Object3DPickable } from "./object/Object3DPickable";
import { BoundingBox } from "@babylonjs/core";
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
            //console.log("Un objet est déjà sélectionné !");
            //console.log("On déselectionne : ");
            //console.log(this.selectedObject);
            this.selectedObject.parent = null;
            this.selectedObject.isPickable = true;
            //console.log("Set isPickable = true for", this.selectedObject.name, "uniqueId:", this.selectedObject.uniqueId);
            if (this.resizeAndRepositionObjectObservable) {
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
            // Enable collision callbacks and restore event mask
            objPickable.aggregate.body.setCollisionCallbackEnabled(true);
            if (objPickable._savedEventMask !== undefined) {
                objPickable.aggregate.body.setEventMask(objPickable._savedEventMask);
                delete objPickable._savedEventMask;
            }
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
                // --- Disable collision callbacks and save event mask ---
                (object3DPickable as any)._savedEventMask = body.getEventMask?.();
                body.setCollisionCallbackEnabled(false);
                body.setEventMask(0);
            }
            //console.log("ON SELECTIONNE : ");
            //console.log(object);
            // Do NOT parent to camera
            // object.parent = xr.baseExperience.camera;
            // Store the pickable for later use if needed
            this.selectedObject = object;
            object.isPickable = false;
            //console.log("Set isPickable = false for", this.selectedObject.name, "uniqueId:", this.selectedObject.uniqueId);
            this.selectedObjectOriginalScaling = object.scaling.clone();
            if(object3DPickable.extra?.pointLight){
                this.selectedObjectLightInitialIntensity = object3DPickable.extra.pointLight.intensity; // Store original light intensity if needed
            }

            // --- Set pivot point to bounding box center (in local space) ---
            const boundingInfo = object.getBoundingInfo();
            const centerWorld = boundingInfo.boundingBox.centerWorld;
            const centerLocal = centerWorld.subtract(object.getAbsolutePosition());
            object.setPivotPoint(centerLocal);

            // Calculate offset distance based on bounding box
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
            
            
            const pickResult = scene.pickWithRay(ray, (mesh) => !!mesh && mesh != this.selectedObject && mesh.isPickable);

            var distance = 0;

            if (pickResult && pickResult.pickedPoint) {
                distance = camera.position.subtract(pickResult.pickedPoint).length();
            }
            else{
                distance = this.MAX_DISTANCE;
            }
            if(distance > this.MAX_DISTANCE){
                distance = this.MAX_DISTANCE;
            }

            // Use the closest occluding distance if available
            const closestOccluder = this.getClosestOccludingMesh(scene, camera, this.selectedObject!, distance);
            
            if(closestOccluder){
                distance = closestOccluder?.distance
                console.log("Closest occluder found:", closestOccluder.mesh.name, "at distance:", distance);
            }
            
            
            


            /*
            //For visibility : 
            const offset = new Vector3(0.1, 0, 0);
            ray.origin.addInPlace(offset);
            */

            //this.visualizeRay(cameraRay, scene);
            var currentOffset = distance/20;
            const maxIterations =5;
            for(let i = 0; i < maxIterations; i++){
                const offsetLen = ray.direction.scale(-currentOffset/ray.direction.length()).length();
                this.resizeObject(objectPickable, distance, offsetLen);
                if(distance === this.MAX_DISTANCE){
                    this.displaceObject(objectPickable, ray, currentOffset, camera, undefined);
                } else if(closestOccluder){
                    this.displaceObject(objectPickable, ray, currentOffset, camera, undefined);
                }
                else{
                    this.displaceObject(objectPickable, ray, currentOffset, camera, pickResult?.pickedPoint || undefined);
                }
                objectPickable.mesh.computeWorldMatrix(true);
                objectPickable.mesh.refreshBoundingInfo(true, true); // <-- Force update bounding box

                
                // If offset length is greater than distance, break and put object close to camera
                if (currentOffset > distance) {
                    this.resizeObject(objectPickable, distance*0.2, 0);
                    objectPickable.mesh.position = camera.position.add(ray.direction.scale(distance*0.2/ray.direction.length()));
                    objectPickable.mesh.computeWorldMatrix(true);
                    objectPickable.mesh.refreshBoundingInfo(true, true); // <-- Force update bounding box
                    console.log("Offset length > distance, moving object close to camera.");
                    break;
                }
                

                if(!this.checkNearbyBoundingBoxes(objectPickable)){
                    // If no nearby bounding boxes, break the loop
                    console.log("CORRECT POSITION FOUND");
                    console.log("CORRECT Distance to target:", distance, "Offset distance:", currentOffset);
                    break;
                } else {
                    //console.log("MESHES INTERSECTING, REPOSITIONNING");
                    currentOffset *= 2;
                    if(i === maxIterations - 1){
                        
                        /*
                        //Use initial positionning :
                        this.resizeObject(objectPickable, distance, ray.direction.scale(-offsetDistance/ray.direction.length()).length());
                        this.displaceObject(objectPickable, ray, offsetDistance, camera, pickResult?.pickedPoint || undefined);
                        console.log("Max iterations reached, using initial positioning");
                        console.log("Distance to target:", distance, "Offset distance:",offsetDistance);
                        */

                        
                        
                        // If no valid position found after all attempts, set minimal scale and move close to camera
                        this.resizeObject(objectPickable, distance*0.2, 0);
                        objectPickable.mesh.position = camera.position.add(ray.direction.scale(distance*0.2/ray.direction.length()));
                        objectPickable.mesh.computeWorldMatrix(true);
                        objectPickable.mesh.refreshBoundingInfo(true, true); // <-- Force update bounding box
                        console.log("No valid position found: setting minimal scale and moving object close to camera.");
                        if(this.checkNearbyBoundingBoxes(objectPickable)){
                            console.log("Even minimal scale intersects with object" );
                        }
                        
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
            if(objectPickable.mesh.scaling.x < 0.001 || objectPickable.mesh.scaling.y < 0.001 || objectPickable.mesh.scaling.z < 0.001){
                objectPickable.mesh.scaling = new Vector3(0.001, 0.001, 0.001);
                console.log("RESIZE : Object scaling too small, setting to minimum size.");
            }
            if(objectPickable.extra?.pointLight && this.selectedObjectLightInitialIntensity !== null) {
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
                    const distanceToPickedPoint = camera.position.subtract(targetPoint).length();
                    if(distanceToPickedPoint > this.MAX_DISTANCE){
                        objectPickable.mesh.position = camera.position.add(ray.direction.scale((this.MAX_DISTANCE - offsetDistance)/ray.direction.length()));
                    }
                    else{
                    // Use precomputed offset distance
                    const offsetVec = ray.direction.scale(-offsetDistance/ray.direction.length());
                    //this.showVector(targetPoint, offsetVec, objectPickable.mesh.getScene(), Color3.Blue(), "offsetVector");
                    //console.log("DISPLACEMENT : Offset vector length:", offsetVec.length());
                    objectPickable.mesh.position = targetPoint.add(offsetVec);
                    }
                }
                else if(this.selectedObjectInitialDistance && this.selectedObjectOriginalScaling){
                    console.log("No target point provided, using initial distance and scaling.");
                    //Calculate displacement based on scaleFactor
                    const scaleFactor = objectPickable.mesh.scaling.clone().length()/this.selectedObjectOriginalScaling.length()
                    objectPickable.mesh.position = camera.position.add(ray.direction.scale((this.selectedObjectInitialDistance*scaleFactor)/ray.direction.length()));
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
        const end = origin.add(vector);
        const points = [origin, end];

        // Draw main line
        const line = MeshBuilder.CreateLines(name, { points }, scene);
        (line as any).color = color;

        // Draw arrowhead
        const arrowLength = Math.min(vector.length() * 0.2, 0.5); // Arrowhead size
        if (arrowLength > 0) {
            const dir = vector.normalize();
            // Perpendicular vectors for arrowhead (pick arbitrary axis if parallel)
            let perp = Vector3.Cross(dir, Vector3.Up());
            if (perp.lengthSquared() < 0.001) perp = Vector3.Cross(dir, Vector3.Right());
            perp.normalize();

            const arrowLeft = end.subtract(dir.scale(arrowLength)).add(perp.scale(arrowLength * 0.5));
            const arrowRight = end.subtract(dir.scale(arrowLength)).subtract(perp.scale(arrowLength * 0.5));
            const arrowPoints = [end, arrowLeft, end, arrowRight];
            const arrow = MeshBuilder.CreateLines(name + "_arrow", { points: arrowPoints }, scene);
            (arrow as any).color = color;
        }
    }

    checkNearbyBoundingBoxes(objectPickable: Object3DPickable) {
        const myBoundingInfo = objectPickable.mesh.getBoundingInfo();
        const myWorldBox = new BoundingBox(
            myBoundingInfo.boundingBox.minimumWorld,
            myBoundingInfo.boundingBox.maximumWorld);
        const myCenter = myWorldBox.centerWorld;
        const myRadius = myWorldBox.extendSize.length();

        const scene = objectPickable.mesh.getScene();
        // Exclude self, skyBox, laserPointers, rotationCone, and any mesh with "joint" or "jointparent" in the name
        const otherMeshes = scene.meshes.filter(mesh =>
            mesh !== objectPickable.mesh &&
            mesh.name !== "skyBox" &&
            mesh.name !== "laserPointer" &&
            mesh.name !== "rotationCone" &&
            !mesh.name.toLowerCase().includes("joint") &&
            !mesh.name.toLowerCase().includes("teleportation") &&
            !mesh.name.toLowerCase().includes("hand")


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
                console.log("Bounding boxes intersect:", mesh.name);
                return true;
            }
        }
    }

    getClosestOccludingMesh(
    scene: Scene,
    camera: Camera,
    selectedObject: AbstractMesh,
    maxDistance : number
    ): { mesh: AbstractMesh, distance: number } | null {
        if (!selectedObject) return null;

        function projectToScreen(point: Vector3, scene: Scene, camera: Camera): Vector3 {
            return Vector3.Project(
                point,
                Matrix.Identity(),
                scene.getTransformMatrix(),
                camera.viewport.toGlobal(
                    scene.getEngine().getRenderWidth(),
                    scene.getEngine().getRenderHeight()
                )
            );
        }

        function getScreenRect(mesh: AbstractMesh, scene: Scene, camera: Camera) {
            const boundingBox = mesh.getBoundingInfo().boundingBox;
            const corners = boundingBox.vectorsWorld;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const cameraForward = camera.getForwardRay().direction.normalize();

            let anyInFront = false;
            for (const corner of corners) {
                // Only consider corners in front of the camera
                const toCorner = corner.subtract(camera.position).normalize();
                if (Vector3.Dot(cameraForward, toCorner) < 0.01) continue;
                anyInFront = true;
                const screen = projectToScreen(corner, scene, camera);
                minX = Math.min(minX, screen.x);
                minY = Math.min(minY, screen.y);
                maxX = Math.max(maxX, screen.x);
                maxY = Math.max(maxY, screen.y);
            }
            // If no corners are in front, return an impossible rectangle
            if (!anyInFront) {
                return { minX: 1, minY: 1, maxX: -1, maxY: -1 };
            }
            return { minX, minY, maxX, maxY };
        }

        function rectsOverlap(a: any, b: any) {
            return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
        }

        const selectedRect = getScreenRect(selectedObject, scene, camera);
        //const selectedObjectDistance = camera.position.subtract(selectedObject.getBoundingInfo().boundingBox.centerWorld).length();

        let closest: { mesh: AbstractMesh, distance: number } | null = null;

        for (const mesh of scene.meshes) {
            if (
                mesh === selectedObject ||
                !mesh.isPickable ||
                !mesh.isEnabled() ||
                !mesh.isVisible
            ) continue;

            const meshRect = getScreenRect(mesh, scene, camera);
            if (rectsOverlap(selectedRect, meshRect)) {
                const corners = mesh.getBoundingInfo().boundingBox.vectorsWorld;
                // Find the closest corner that is between camera and selected object and within MAX_DISTANCE
                for (const corner of corners) {
                    const distance = camera.position.subtract(corner).length();
                    if (
                        //distance < selectedObjectDistance &&
                        distance <= maxDistance &&
                        (!closest || distance < closest.distance)
                    ) {
                        closest = { mesh, distance };
                    }
                }
            }
        }

        return closest;
    }
}
import { Object3D } from "./Object3D";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { Material } from "@babylonjs/core/Materials/material";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, PhysicsPrestepType } from "@babylonjs/core/Physics";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class Object3DPickable implements Object3D{
    mesh: Mesh;
    shapeType: PhysicsShapeType ; // Default shape type
    isSelected: boolean = false;
    aggregate?: PhysicsAggregate; // Store aggregate directly
    extra: any;

    constructor(
      scene: Scene,
      name: string,
      material: Material,
      shapeType: PhysicsShapeType,
      size: number = 1,
      customMeshFactory?: (scene: Scene, name: string, material: Material, size: number) => { mesh: Mesh, extra?: any, aggregate?: PhysicsAggregate }
    ) 
    {
        this.shapeType = shapeType;
        if (customMeshFactory) {
            const { mesh, extra, aggregate} = customMeshFactory(scene, name, material, size);
            this.mesh = mesh;
            this.extra = extra;
            this.aggregate = aggregate;
        } else {
            this.mesh = this.createMesh(scene, name, shapeType, size);
            this.mesh.material = material;
        }
        // Store a reference to this Object3DPickable on the mesh
        (this.mesh as any).object3DPickable = this;

        // --- Ensure mesh.isPickable is true for highlight logic ---
        this.mesh.isPickable = true;
        this.mesh.scaling = new Vector3(Math.abs(this.mesh.scaling.x), this.mesh.scaling.y, this.mesh.scaling.z)
        
        // --- Fix: Always reset mesh pivot to (0,0,0) on creation ---
        // This avoids unexpected displacement when using setPivotPoint later
        if (typeof this.mesh.setPivotPoint === "function") {
            this.mesh.setPivotPoint(new Vector3(0, 0, 0));
        }


        this.enableAirFriction(); // Enable air friction by default

        // --- Log mesh transform info for debugging ---
        console.log(`[Object3DPickable] Created: ${this.mesh.name}`);
        console.log("  position:", this.mesh.position?.toString());
        console.log("  scaling:", this.mesh.scaling?.toString());
        console.log("  rotation:", this.mesh.rotation?.toString());
        console.log("  rotationQuaternion:", this.mesh.rotationQuaternion ? this.mesh.rotationQuaternion.toString() : "undefined");
        console.log("  pivotPoint:", (typeof this.mesh.getPivotPoint === "function") ? this.mesh.getPivotPoint().toString() : "n/a");
        // Also log bounding box center
        if (this.mesh.getBoundingInfo) {
            const bbox = this.mesh.getBoundingInfo().boundingBox;
            console.log("  boundingBox center:", bbox.center.toString());
            console.log("  boundingBox centerWorld:", bbox.centerWorld.toString());
        }
    }
  
    createMesh(scene: Scene, name: string, type: PhysicsShapeType, size: number): Mesh {
      switch (type) {
        case PhysicsShapeType.SPHERE:
          return MeshBuilder.CreateSphere(name, { diameter: size }, scene);
        default:
          return MeshBuilder.CreateBox(name, { size }, scene);
      }
    }

    /**
     * Dispose the old physics aggregate (if any) and create a new one for the current mesh size.
     * @param scene The Babylon.js scene
     * @param shapeType The PhysicsShapeType (e.g., PhysicsShapeType.SPHERE)
     * @param options The physics options (e.g., { mass: 1 })
     */
    refreshPhysicsAggregate(scene: Scene, shapeType: PhysicsShapeType, options: any) {
        if (this.aggregate) {
            this.aggregate.body.dispose();
            this.aggregate.dispose();
        }
        const aggregate = new PhysicsAggregate(this.mesh, shapeType, options, scene);
        const body = aggregate.body;
        // Set motion type to ANIMATED to prevent physics simulation
        body.setMotionType(PhysicsMotionType.ANIMATED);
        body.setPrestepType(PhysicsPrestepType.TELEPORT);
        this.aggregate = aggregate;
        return this.aggregate;
    }

    /**
     * Enable air friction by damping velocity each frame while the object is moving.
     * @param dampingFactor A value between 0 and 1 (e.g., 0.98 for light friction)
     */
    enableAirFriction(dampingFactor: number = 0.99) {
        if (!this.aggregate || !this.aggregate.body) return;
        const body = this.aggregate.body;
        const scene = this.mesh.getScene();
        // Avoid multiple subscriptions
        if ((this as any)._airFrictionObserver) {
            scene.onBeforeRenderObservable.remove((this as any)._airFrictionObserver);
        }
        (this as any)._airFrictionObserver = scene.onBeforeRenderObservable.add(() => {
            const v = body.getLinearVelocity();
            if (v.length() > 0.001) {
                v.scaleInPlace(dampingFactor);
                body.setLinearVelocity(v);
            }
        });
    }

    // Utility: Log mesh transform info 
    logMeshTransform(context: string = "") {
        console.log(`[Object3DPickable] ${context} mesh: ${this.mesh.name}`);
        console.log("  position:", this.mesh.position?.toString());
        console.log("  scaling:", this.mesh.scaling?.toString());
        console.log("  rotation:", this.mesh.rotation?.toString());
        console.log("  rotationQuaternion:", this.mesh.rotationQuaternion ? this.mesh.rotationQuaternion.toString() : "undefined");
        console.log("  pivotPoint:", (typeof this.mesh.getPivotPoint === "function") ? this.mesh.getPivotPoint().toString() : "n/a");
        if (this.mesh.getBoundingInfo) {
            const bbox = this.mesh.getBoundingInfo().boundingBox;
            console.log("  boundingBox center:", bbox.center.toString());
            console.log("  boundingBox centerWorld:", bbox.centerWorld.toString());
        }
    }

    onSelect() {
        this.isSelected = true;
        this.logMeshTransform("onSelect");
    }

    onDeselect() {
        this.isSelected = false;
        this.logMeshTransform("onDeselect");
    }
}
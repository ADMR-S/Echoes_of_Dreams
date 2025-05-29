import { Object3D } from "./Object3D";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { Material } from "@babylonjs/core/Materials/material";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, PhysicsPrestepType } from "@babylonjs/core/Physics";


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

    
}
import * as BABYLON from "@babylonjs/core";

export class Object3D {
  mesh: BABYLON.Mesh;
  material: BABYLON.Material;

  constructor(
    scene: BABYLON.Scene,
    name: string,
    material: BABYLON.Material,
    type: "box" | "sphere" | "plane" = "box",
    size: number = 1
  ) {
    this.mesh = this.createMesh(scene, name, type, size);
    this.material = material;
    this.mesh.material = this.material;
    this.enableInteractions(scene);
  }

  private createMesh(scene: BABYLON.Scene, name: string, type: string, size: number): BABYLON.Mesh {
    switch (type) {
      case "sphere":
        return BABYLON.MeshBuilder.CreateSphere(name, { diameter: size }, scene);
      case "plane":
        return BABYLON.MeshBuilder.CreatePlane(name, { size }, scene);
      default:
        return BABYLON.MeshBuilder.CreateBox(name, { size }, scene);
    }
  }

  private enableInteractions(scene: BABYLON.Scene) {
    this.mesh.actionManager = new BABYLON.ActionManager(scene);

    this.mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
        console.log(`Objet ${this.mesh.name} cliqué !`);
        this.mesh.scaling.scaleInPlace(1.1); // Augmente la taille de l'objet au clic
      })
    );

    this.mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
        this.mesh.material = new BABYLON.StandardMaterial("hoverMat", scene);
        (this.mesh.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(0, 1, 0); // Vert
      })
    );

    this.mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
        this.mesh.material = this.material; // Remettre le matériau d'origine
      })
    );
  }
}

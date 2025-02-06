/*import {Scene} from "@babylonjs/core/scene";
import {ArcRotateCamera} from "@babylonjs/core/Cameras/arcRotateCamera";
import {Nullable, PickingInfo, PointerEventTypes} from "@babylonjs/core";
import {Vector3} from "@babylonjs/core/Maths/math.vector";

export class TeleportMovement {
    private pointerObserver: any;

    constructor(private scene: Scene, private camera: ArcRotateCamera) {
        this.initPointer();
    }

    private initPointer() {
        // Observer le pointer pour détecter le clic sur le sol
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                const pickInfo: Nullable<PickingInfo> = pointerInfo.pickInfo;
                if (pickInfo?.hit && pickInfo.pickedMesh && pickInfo.pickedMesh.name === "ground") {
                    // La position de téléportation correspond au point cliqué sur le sol
                    this.teleportTo(pickInfo.pickedPoint);
                }
            }
        });
    }

    private teleportTo(target: Nullable<Vector3>) {
        if (!target) return;
        // Pour une transition plus fluide, vous pouvez ajouter une interpolation
        this.camera.position.x = target.x;
        this.camera.position.z = target.z;
        // Ajuster la cible de la caméra (si nécessaire)
        this.camera.target.x = target.x;
        this.camera.target.z = target.z;
    }

    public dispose() {
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
        }
    }
}*/

import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

export class Player{
    
    selectedObject : TransformNode | null;

    constructor(){
        this.selectedObject = null;
    }

    selectObject(object : TransformNode){
    }
}
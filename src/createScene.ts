
import type { Scene } from "@babylonjs/core/scene";

// Change this import to check other scenes
import { PhysicsSceneWithHavok } from "./scenes/physicsSceneWithHavok";
import xrSceneWithHavok, { XRSceneWithHavok } from "./scenes/xrSceneWithHavok";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import {testscene} from "./scenes/testscene.ts";

export interface CreateSceneClass {
    createScene: (engine: AbstractEngine, canvas: HTMLCanvasElement) => Promise<Scene>;
    preTasks?: Promise<unknown>[];
}

export interface CreateSceneModule {
    default: CreateSceneClass;
}

export const getSceneModule = (): CreateSceneClass => {
    return new testscene();
}
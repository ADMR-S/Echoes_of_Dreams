
import type { Scene } from "@babylonjs/core/scene";

// Change this import to check other scenes
import { XRSceneWithHavok } from "./scenes/xrSceneWithHavok";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Player } from "./Player";
import { SceneNiveau3 } from "./scenes/sceneNiveau3.ts";
import {XRSceneWithHavok5} from "./scenes/XrSceneWithHavok5";
import {XRSceneWithHavok4} from "./scenes/XRSceneWithHavok4.ts";

export interface CreateSceneClass {
    createScene: (engine: AbstractEngine, canvas: HTMLCanvasElement, audiocontext : AudioContext, player : Player) => Promise<Scene>;
    preTasks?: Promise<unknown>[];


}

export interface CreateSceneModule {
    default: CreateSceneClass;
}

export const getSceneModule = (): CreateSceneClass => {
    return new XRSceneWithHavok4();

}


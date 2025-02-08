
import type { Scene } from "@babylonjs/core/scene";

// Change this import to check other scenes
import { XRSceneWithHavok } from "./scenes/xrSceneWithHavok";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Player } from "./Player";
import { XRSceneWithHavok3 } from "./scenes/xrSceneWithHavok3";
import {XRSceneWithHavok5} from "./scenes/XrSceneWithHavok5";

export interface CreateSceneClass {
    createScene: (engine: AbstractEngine, canvas: HTMLCanvasElement, audiocontext : AudioContext, player : Player) => Promise<Scene>;
    preTasks?: Promise<unknown>[];


}

export interface CreateSceneModule {
    default: CreateSceneClass;
}

export const getSceneModule = (): CreateSceneClass => {
    return new XRSceneWithHavok5();
}


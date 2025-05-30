import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { getSceneModule } from "./createScene";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Player } from "./Player";
import { Utility } from "./Utility";



// ----- AUDIO INIT ------
const audioContext: AudioContext = new AudioContext();
// ----- END OF AUDIO INIT ------

// @ts-ignore
let scene: Scene | null = null; //Utile ?
let sceneToRender: Scene | null = null; //Utile ?
let engine: AbstractEngine | null = null;
let currentPlayer: Player | null = null;
let currentSceneInstance: Scene | null = null;

const SCENE_SUPERLIMINAL = "Scene1Superliminal";
const SCENE_NIVEAU3 = "SceneNiveau3";
let currentSceneName: string = SCENE_SUPERLIMINAL;

const loadAndRunScene = async (sceneName: string) => {
    if (currentSceneInstance) {
        console.log(`Disposing scene: ${currentSceneInstance.metadata?.sceneName || 'unknown'}`);
        currentSceneInstance.dispose();
        currentSceneInstance = null;
        sceneToRender = null;
    }

    if (!engine) {
        console.error("Engine not initialized!");
        return;
    }
    if (!currentPlayer) {
        console.error("Player not initialized!");
        return;
    }

    currentSceneName = sceneName;
    const createSceneModule = getSceneModule(sceneName);

    await Promise.all(createSceneModule.preTasks || []);

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    // Create the scene
    currentSceneInstance = await createSceneModule.createScene(engine, canvas, audioContext, currentPlayer, requestSceneSwitch);
    currentSceneInstance.metadata = { ...currentSceneInstance.metadata, sceneName: sceneName };

    sceneToRender = currentSceneInstance;

    Utility.setupInspectorControl(currentSceneInstance);
    // JUST FOR TESTING. Not needed for anything else
    (window as any).scene = currentSceneInstance;

    console.log(`Scene ${sceneName} loaded.`);
};

const requestSceneSwitch = async () => {
    console.log("Scene switch requested.");

    const nextScene = currentSceneName === SCENE_SUPERLIMINAL ? SCENE_NIVEAU3 : SCENE_SUPERLIMINAL;
    await loadAndRunScene(nextScene);
};

export const babylonInit = async (): Promise<Scene> => {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    engine = await createEngine(canvas);

    console.log(engine);

    currentPlayer = new Player();
    await loadAndRunScene(currentSceneName);

    if (!currentSceneInstance) {
        throw new Error("Scene could not be initialized.");
    }

    // Register a render loop to repeatedly render the scene
    startRenderLoop(engine);

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine?.resize();
    });

    return currentSceneInstance;
};

window.onload = () => {
    // @ts-ignore
    babylonInit().then((scene) => {

        console.log("Babylon initialized, initial scene loaded.");
    }).catch(error => {
        console.error("Error during Babylon initialization:", error);
    });
};

const startRenderLoop = (engineInstance: AbstractEngine) => {
    engineInstance.runRenderLoop(() => {
        if (sceneToRender && sceneToRender.activeCamera) {
            sceneToRender.render();
        }
    });
};

const createEngine = async (canvas: HTMLCanvasElement): Promise<AbstractEngine> => {
    const engineType =
        location.search.split("engine=")[1]?.split("&")[0] || "webgl";
    let createdEngine: AbstractEngine;

    if (engineType === "webgpu") {
        const webGPUSupported = await WebGPUEngine.IsSupportedAsync;
        if (webGPUSupported) {
            await import("@babylonjs/core/Engines/WebGPU/Extensions/");
            const webgpu = new WebGPUEngine(canvas, {
                adaptToDeviceRatio: true,
                antialias: true,
            });
            await webgpu.initAsync();
            createdEngine = webgpu;
        } else {
            createdEngine = createDefaultEngine(canvas);
        }
    } else {
        createdEngine = createDefaultEngine(canvas);
    }
    return createdEngine;
};

const createDefaultEngine = (canvas: HTMLCanvasElement): Engine => {
    return new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false });
};

window.onclick = () => {
    audioContext.resume();
};
export { requestSceneSwitch };

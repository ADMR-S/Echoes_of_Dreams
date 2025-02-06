import { AdvancedDynamicTexture, Button, Control } from '@babylonjs/gui';
import {MovementMode} from "../Type.ts";

export class Menu {
    private advancedTexture!: AdvancedDynamicTexture;
    private continuousButton!: Button;
    private teleportButton!: Button;
    private onModeSelected!: (mode: MovementMode)=>void;

    constructor( onModeSelected: (mode: MovementMode)=>void ) {
        this.createUI();
        this.onModeSelected = onModeSelected;
    }

    private createUI() {
        // Création de l'AdvancedDynamicTexture qui sert de couche d'interface sur le canvas
        this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        // Bouton pour le déplacement continu
        this.continuousButton = Button.CreateSimpleButton("continuous", "Déplacement Continu");
        this.continuousButton.width = "200px";
        this.continuousButton.height = "50px";
        this.continuousButton.color = "white";
        this.continuousButton.background = "green";
        this.continuousButton.top = "-40px";
        this.continuousButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.continuousButton.onPointerUpObservable.add(() => {
            this.onModeSelected(MovementMode.Continuous);
            this.hide();
        });
        this.advancedTexture.addControl(this.continuousButton);

        // Bouton pour la téléportation
        this.teleportButton = Button.CreateSimpleButton("teleport", "Téléportation");
        this.teleportButton.width = "200px";
        this.teleportButton.height = "50px";
        this.teleportButton.color = "white";
        this.teleportButton.background = "blue";
        this.teleportButton.top = "40px";
        this.teleportButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.teleportButton.onPointerUpObservable.add(() => {
            this.onModeSelected(MovementMode.Teleportation);
            this.hide();
        });
        this.advancedTexture.addControl(this.teleportButton);
    }

    private hide() {
        // Masquer l'interface une fois le choix effectué
        this.advancedTexture.dispose();
    }
}

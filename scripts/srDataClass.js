import { Constants } from "./const.js";

const getArData = (userId = game.user.id) => deepClone(game.settings.get(Constants.ID, "arData")[userId]);


class ArData {

    constructor() {
        this.trayData = getDefaultData("tray");
        this.buttonsData = getDefaultData("buttons");
        this.warningsData = getDefaultData("warnings");
        this.addData = {
            buttonsDirection: "col",
            warningsDisplay: "full"
        }
    }
}


const getDefaultData = () => {
    return {
        tray: {
            x: 60,
            y: 5,
            posUnit: "%",
            height: 60,
            width: 250,
            sizeUnit: "px"
        },
        buttons: {
            x: 60,
            y: 10,
            posUnit: "%",
            height: 60,
            width: 30,
            sizeUnit: "px",
            bind: "right"
        },
        levels: {
            x: 60,
            y: 15,
            posUnit: "%",
            height: 60,
            width: 250,
            sizeUnit: "px",
            bind: "top"
        }
    }
}
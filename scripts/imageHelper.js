import { Constants as C } from "./const.js";
import { getRequestData } from "./main.js";

export class ImageHelper extends FormApplication {
    constructor(focusEl = null) {
        super();
        this.focusEl = focusEl
    }

    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            resizable: true,
            id: "ImageHelper",
            width: 560,
            height: 245,
            template: `modules/${C.ID}/templates/image-helper.hbs`,
            title: `Image Helper`,
            userId: game.userId,
            closeOnSubmit: false,
            submitOnChange: false,
            dragDrop: [
                {
                    dropSelector: '.ih-drop-box',
                },
            ]
        };
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
        return mergedOptions;
    }

    async getData() {
        const useForRequests = game.settings.get(C.ID, "useForRequests")

        // imageHelperData
        const defaultUserImg = "icons/svg/mystery-man.svg" // (HOW DO I GET A FUCKING SYSTEM DEFAULT AVATAR?)
        const defaultImg = useForRequests == "user" ? defaultUserImg : Actor.implementation.getDefaultArtwork({type: "someActorType"}).img
        const requestData = getRequestData(null, useForRequests)
        const _srcExists = await srcExists(requestData.img)

        const imageHelperData = {
            imagePath: decodeURI(requestData.img),
            hasImage: (requestData.img && requestData.img != defaultImg),
            name: requestData.name,
            hasName: !!requestData.name,
            useActor: ["playerActor", "playerToken", "actor", "token"].includes(useForRequests),
            hasActor: !!["playerActor", "playerToken"].includes(useForRequests) ? !!game.user.character : !!game.actors.get(game.settings.get(C.ID, "selectedActorId")),
            imageDoesntExist: !_srcExists
        }
        
        // disableInputs
        const disableInputs = game.settings.get(C.ID, "useForRequests") != "custom"

        // options
        const choices = game.settings.settings.get(`${C.ID}.useForRequests`).choices
        const options = Object.keys(choices).reduce((acc, current) => { 
            acc.push({
                name: game.i18n.localize(choices[current]), 
                key: current,
                selected: current == useForRequests
            })
            return acc
        }, [])

        //focusEl
        let focusEl = this.focusEl

        return { ...imageHelperData, disableInputs: disableInputs, options: options , focusEl: focusEl }
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Изменить селектор
        html[0].querySelector(".ih-select").addEventListener("change", async (event) => {
            const key = event.target.value
            await game.settings.set(C.ID, "useForRequests", key)
            this.render(true) 
        })

        // Очистить выбор актёра
        html[0].querySelector(".ih-actor-box").addEventListener("contextmenu", async () => {
            const useForRequests = game.settings.get(C.ID, "useForRequests")
            const useCharActor = ["playerToken", "playerActor"].includes(useForRequests)
            if (useCharActor) {
                await game.user.update({character: null})
            } else {
                await game.settings.set(C.ID, "selectedActorId", "")
            }
            this.render(true)
        })

        // Изменение пути изображения
        html[0].querySelector(".ih-image-path").addEventListener("input", async (event) => {
            const value = event.target.value || ""
            const boxEl = event.target.closest(".ih-box")
            if (value) {
                const imgIsExist = await srcExists(value)
                if (!imgIsExist) {
                    boxEl.querySelector("i").className = "fas fa-triangle-exclamation"
                    boxEl.dataset.tooltip = game.i18n.localize(`${C.ID}.imageHelper.imageDoesntExistTooltip`)
                } else {
                    boxEl.querySelector("i").className = "fas fa-check"
                    boxEl.dataset.tooltip = null
                    await game.settings.set(C.ID, "customImage", value)
                }
            } else {
                boxEl.querySelector("i").className = "fas fa-xmark"
                boxEl.dataset.tooltip = null
                await game.settings.set(C.ID, "customImage", value)
            }
        })

        // Изменение имени
        html[0].querySelector(".ih-name").addEventListener("input", async (event) => {
            const iEl = event.target.closest(".ih-box").querySelector("i")
            const value = event.target.value || ""
            if (value) {
                iEl.className = "fas fa-check"
            } else {
                iEl.className = "fas fa-xmark"
            }
            await game.settings.set(C.ID, "customName", value)
        })
    }
    
    async _updateObject(event, formData) {
    }

    async _onDrop(event) {
        const actorData = event.dataTransfer.getData('text/plain');
        if (!actorData || actorData === "") return
        let transferData = JSON.parse(actorData)
        if (transferData?.type != "Actor") return

        const id = transferData.uuid?.split(".")?.pop() || ""
        const actor = game.actors.get(id)
        if (!actor) {
            ui.notifications.error(game.i18n.localize(`${C.ID}.errors.actorNotFound`))
            console.log("Actor not found")
            console.log("transferData: ", transferData)
            return
        }

        const useForRequests = game.settings.get(C.ID, "useForRequests")
        const useCharActor = ["playerToken", "playerActor"].includes(useForRequests)

        if (useCharActor) {
            await game.user.update({character: actor})
        } else {
            await game.settings.set(C.ID, "selectedActorId", id)
        }
        this.render(true)
    }
}
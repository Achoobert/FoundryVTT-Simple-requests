import { AdvancedRequestsApp } from "./main.js";
import { Constants as C } from "./const.js";

Hooks.once('init', function() {
    const registerSettings = (key, _scope = 'world', _config = true, _type = Boolean, _default = true, _filePicker = null, onChange = () => {}, choices = null) => {
        game.settings.register(C.ID, key, {
        ...{
            name: game.i18n.localize(`${C.ID}.settings.${key}`),
            hint: game.i18n.localize(`${C.ID}.settings.${key}Hint`),
            scope: _scope,
            config: _config,
            type: _type,
            default: _default,
            onChange: onChange,
        }, 
        ...(_filePicker ? {filePicker: _filePicker} : {}),
        ...(choices ? { choices: choices } : {}),
    });
    }

    // Сбросить выбранного актёра
    game.settings.registerMenu(C.ID, "resetActor", {
        name: game.i18n.localize(`${C.ID}.settings.resetActor`),
        label: game.i18n.localize(`${C.ID}.settings.resetActorLabel`),
        hint: game.i18n.localize(`${C.ID}.settings.resetActorHint`),
		icon: 'fas fa-user-xmark',
		restricted: true,
        type: ResetActor,
    })

    // Воспроизводить звук при создании заявок
    registerSettings("soundCreate", "client", true, Boolean, true)
    // Воспроизводить звук при активации заявок
    registerSettings("soundActivate", "client", true, Boolean, true)
    // Сообщение при активации заявок
    registerSettings("messageActivate", "client", true, Boolean, true)
    // Ширина поля заявок в Свободном окне зависит от количества заявок
    registerSettings("widthDependOnQueue", "client", true, Boolean, false, null, reRender)
    // Звук заявок (путь к файлу)
    registerSettings("reqClickSound", "client", true, String, "modules/advanced-requests/assets/samples/fingerSnapping.wav", "audio")
    // Что использовать для заявок
    const ufrChooseList = {
        "playerToken": game.i18n.localize(`${C.ID}.settings.ufrPlayerToken`),
        "playerActor": game.i18n.localize(`${C.ID}.settings.ufrPlayerActor`),
        "token": game.i18n.localize(`${C.ID}.settings.ufrToken`), 
        "actor": game.i18n.localize(`${C.ID}.settings.ufrActor`), 
        "user": game.i18n.localize(`${C.ID}.settings.ufrUser`), 
        "controlled": game.i18n.localize(`${C.ID}.settings.ufrControlled`), 
        "custom": game.i18n.localize(`${C.ID}.settings.ufrCustom`)
    };
    registerSettings("useForRequests", "client", true, String, "token", null, false, ufrChooseList)
    // Кастомное изображение для заявок
    registerSettings("customImage", "client", true, String, "", "image")
    // Кастомное имя для заявок
    registerSettings("customName", "client", true, String, "")
    // Высота списка заявок под чатом
    registerSettings("chatQueueHeight", "client", true, Number, 60, null, changeChatQueueHeight)
    // Положение окна заявок
    registerSettings("requestsPosition", "client", true, String, "chat", null, false, {"chat": game.i18n.localize(`${C.ID}.settings.qpChat`), "freeScreen": game.i18n.localize(`${C.ID}.settings.qpFreeScreen`)})
    // zIndex окна заявок
    registerSettings("freeScreenZIndex", "client", true, Number, 10, null, reRender)

    // Отображать заявки:
    // - 1-й уровень заявок
    registerSettings("firstRequest", "world", true, Boolean, true, null, updateChatRequestButtons)
    // - 2-й уровень заявок
    registerSettings("secondRequest", "world", true, Boolean, true, null, updateChatRequestButtons)
    // - 3-й уровень заявок
    registerSettings("thirdRequest", "world", true, Boolean, true, null, updateChatRequestButtons)

    // СКРЫТЫЕ
    // ID выбранного игроком Актёра
    registerSettings("selectedActorId", "client", false, String, "")
    // Очередь заявок
    registerSettings("queue", "world", false, Array, [])
    // Данные окна заявок в свободке
    registerSettings("freeScreenData", "client", false, Object, {})
});

Hooks.on("ready", () => {
    AdvancedRequestsApp.activate();
})

function changeChatQueueHeight() {
    const chatQueueEl = document.getElementById("advanced-requests-chat-body");
    if (chatQueueEl) {
        const elHeight = game.settings.get(C.ID, "chatQueueHeight")
        chatQueueEl.style.minHeight = `${elHeight}px`
        chatQueueEl.style.maxHeight = `${elHeight}px`
    }
}

function updateChatRequestButtons() {
    const buttonsBoxEl = document.getElementById("advanced-requests-chat-body")?.querySelector(".ar-chat-buttons")
    if (buttonsBoxEl) {
        buttonsBoxEl.innerHTML = "";
        ["first", "second", "third"].forEach((reqLevel, i) => {
            if (!game.settings.get(C.ID, `${reqLevel}Request`)) return
            const button = document.createElement('div')
            button.className = `ar-chat-button ar-level-${i}`
            button.innerHTML = `<i class="fa-${i == 0 ? "regular" : "solid"} fa-hand${i == 2 ? "-sparkles" : ""} ar-request-icon"></i>`
            button.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.${reqLevel}RequestTooltip`)
            button.addEventListener("click", async () => {
                await addRequest(i)
            })
            buttonsBoxEl.append(button)
        })
    }
    AdvancedRequestsApp._render()
}

function reRender() {
    AdvancedRequestsApp._render()
}

export class ResetActor extends FormApplication {
    constructor() {
        super();
    }
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.title = '';
        options.id = 'ar-reset-actor';
        options.template = `modules/${C.ID}/templates/actorReset.html`;
        options.closeOnSubmit = true;
        options.popOut = true;
        options.width = 1;
        options.height = 1;
        return options;
    }
    static async createBackup(app) {
        await game.settings.set(C.ID, "selectedActorId", "");
        ui.notifications.info(game.i18n.localize(`${C.ID}.settings.actorReset`));
        app.close({ force: true });
    }
}
Hooks.on("renderResetActor", ResetActor.createBackup);
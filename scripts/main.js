import { Constants as C } from "./const.js";
import { ImageHelper } from "./imageHelper.js";

// Рендер окна заявок в чате
Hooks.on("renderSidebarTab", (app, html, data) => {
    if (app.tabName !== "chat") return;
    const div = document.createElement("div");
    div.classList.add("advanced-requests-chat-body");
    if (game.settings.get(C.ID, "requestsPosition") != "chat") div.style.display = "none";
    div.id = "advanced-requests-chat-body";
    const height = game.settings.get(C.ID, "chatQueueHeight") + "px";
    div.style.minHeight = height
    div.style.maxHeight = height
    // Очередь
    const queueBox = document.createElement("div");
    queueBox.classList.add("ar-chat-queue");
    queueBox.id = "ar-chat-queue"
    const queue = getQueue();
    queue.forEach((item) => {
        // Токены в очереди
        const containerEl = getRequestElement(item)
        queueBox.append(containerEl)
    })
    // Кнопка смены расположения
    const transferButton = document.createElement("div");
    transferButton.className = "ar-chat-queue-transfer ar-hidden";
    transferButton.innerHTML = `<i class="fas fa-up-right-from-square"></i>`
    transferButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.queueTransferTooltip`);
    let isElementHovered = false
    div.addEventListener("mouseover", (e) => {
        // Если шифт зажат - создаём кнопку смены расположения
        isElementHovered = true
        if (e.shiftKey) {
            transferButton.classList.toggle("ar-hidden", false);
            queueBox.querySelectorAll(".ar-request-container-chat").forEach((el) => {
                el.classList.toggle("ar-hidden", true);
            })
        }
    })
    div.addEventListener("mouseout", (e) => {
        isElementHovered = false
        transferButton.classList.toggle("ar-hidden", true);
        queueBox.querySelectorAll(".ar-request-container-chat").forEach((el) => {
            el.classList.toggle("ar-hidden", false);
        })
    })
    document.addEventListener("keydown", (e) => {
        if ((e.code == "ShiftLeft" || e.code == "ShiftRight") && isElementHovered) {
            // Если шифт зажат - создаём кнопку смены расположения
            transferButton.classList.toggle("ar-hidden", false);
            queueBox.querySelectorAll(".ar-request-container-chat").forEach((el) => {
                el.classList.toggle("ar-hidden", true);
            })
        }
    })
    document.addEventListener("keyup", (e) => {
        if ((e.code == "ShiftLeft" || e.code == "ShiftRight") && isElementHovered) {
            // Если шифт зажат - создаём кнопку смены расположения
            transferButton.classList.toggle("ar-hidden", true);
            queueBox.querySelectorAll(".ar-request-container-chat").forEach((el) => {
                el.classList.toggle("ar-hidden", false);
            })
        }
    })
    transferButton.addEventListener("click", async () => {
        await game.settings.set(C.ID, "requestsPosition", "freeScreen")
        AdvancedRequestsApp._render(true)
        document.getElementById("advanced-requests-chat-body").style.display = "none"
    })
    queueBox.append(transferButton);
    div.append(queueBox);
    // Кнопки
    const buttonDiv = document.createElement("div");
    buttonDiv.classList.add("ar-chat-buttons");
    ["first", "second", "third"].forEach((reqLevel, i) => {
        if (!game.settings.get(C.ID, `${reqLevel}Request`)) return
        const button = document.createElement('div')
        button.className = `ar-chat-button ar-level-${i}`
        button.innerHTML = `<i class="fa-${i == 0 ? "regular" : "solid"} fa-hand${i == 2 ? "-sparkles" : ""} ar-request-icon"></i>`
        button.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.${reqLevel}RequestTooltip`)
        button.addEventListener("click", async () => {
            await addRequest(i)
        })
        buttonDiv.append(button)
    })
    div.append(buttonDiv);
    html[0].querySelector("#chat-controls").prepend(div);
});

const getRequestElement = (item) => {
    // Контейнер
    const containerEl = document.createElement('div')
    containerEl.className = `ar-request-container-chat ar-level-${item.level}`
    containerEl.dataset.id = item.id
    containerEl.dataset.tooltip = item.name
    addRequestListener(containerEl)
    // Изображение
    const tokenImgEl = document.createElement('img')
    tokenImgEl.src = item.img
    containerEl.append(tokenImgEl)
    // Знак предупреждения
    const warningEl = document.createElement('div')
    warningEl.className = `ar-queue-warning ar-level-${item.level}`
    warningEl.innerHTML = `<img src="modules/${C.ID}/assets/request${item.level}.webp"/>`
    containerEl.append(warningEl)
    return containerEl
}

const getQueue = () => deepClone(game.settings.get(C.ID, "queue"));


function addRequestListener(element, reRender = false) {
    const elId = element?.dataset?.id
    if (!game.user.isGM && game.user.id != elId) return
    element?.addEventListener('contextmenu', async () => {
        await deleteRequest(elId, reRender)
    })
    element?.addEventListener('click', async () => {
        if (game.user.isGM) {
            const messageActivate = game.settings.get(C.ID, "messageActivate")
            if (messageActivate) {
                const _user = game.users.find(u=>u.isGM) || game.user
                ChatMessage.create({
                    user: _user.id,
                    speaker: {alias: _user.name},
                    content: game.i18n.localize(`${C.ID}.chatMessage.activateRequest1`) + game.users.find(u=>u.id == elId)?.name + game.i18n.localize(`${C.ID}.chatMessage.activateRequest2`) // изменить по типу "Игрок какой-то там сделал заявку"
                })
            }
        }
        await deleteRequest(elId, reRender)
    })
    if (reRender) AdvancedRequestsApp._render(true)
}

async function addRequest(reqLevel, reRender = false) {
    const useForRequests = game.settings.get(C.ID, "useForRequests");
    const data = getRequestData(reqLevel, useForRequests);

    // Проверяем что имеется картинка для реквеста
    const defaultUserImg = "icons/svg/mystery-man.svg" // (HOW DO I GET A FUCKING SYSTEM DEFAULT AVATAR?)
    const defaultImg = useForRequests == "user" ? defaultUserImg : Actor.implementation.getDefaultArtwork({type: "someActorType"}).img

    const hasImage = (data.img && data.img != defaultImg && await srcExists(defaultImg))
    

    if (hasImage) {
        const queue = getQueue();
        if (queue.some(item=>item.id == data.id)) {
            queue.splice(queue.findIndex(item => item.id === data.id), 1);
        }
        const index = queue.findLastIndex((item) => item.level > reqLevel);
        queue.splice(index + 1, 0, data);
    
        const options = {changes: ['addRequest'], reqId: data.id};
        if (game.user.isGM) {
            await game.settings.set(C.ID, 'queue', queue, options);
        } else {
            game.socket.emit(`module.${C.ID}`, {
                type: 'queue',
                settingData: queue,
                options
            });
        }
        if (reRender) AdvancedRequestsApp._render(true)
    } else if (useForRequests == "controlled") {
        ui.notifications.warn(game.i18n.localize(`${C.ID}.errors.noControlledTokens`));
    } else {
        new ImageHelper().render(true)
    }
}


async function deleteRequest(id, reRender = false) {
    const queue = getQueue();
    queue.splice(queue.findIndex(item => item.id === id), 1);
    const options = {changes: ['deleteRequest'], reqId: id};
    if (game.user.isGM) {
        await game.settings.set(C.ID, 'queue', queue, options);
    } else {
        game.socket.emit(`module.${C.ID}`, {
            type: 'queue',
            settingData: queue,
            options
        });
    }
    if (reRender) AdvancedRequestsApp._render(true)
}

export const getRequestData = (reqLevel = 0, useForRequests) => {
    let data = {
        level: reqLevel,
        id: game.user.id
    }
    const _actor = game.actors.get(game.settings.get(C.ID, "selectedActorId"))
    const _controlled = canvas.tokens.controlled[0]
    switch (useForRequests) {
        case "token":
            data.img = _actor?.prototypeToken?.texture?.src
            data.name = _actor?.prototypeToken?.name
            break;
        case "actor":
            data.img = _actor?.img
            data.name = _actor?.name
            break;
        case "playerToken":
            data.img = game.user.character?.prototypeToken?.texture?.src 
            data.name = game.user.character?.prototypeToken?.name
            break;
        case "playerActor":
            data.img = game.user.character?.img
            data.name = game.user.character?.name
            break;
        case "user":
            data.img = game.user.avatar
            data.name = game.user.name
            break;
        case "custom":
            data.img = game.settings.get(C.ID, "customImage")
            data.name = game.settings.get(C.ID, "customName")
            break;
        case "controlled":
            data.img = _controlled?.document?.texture?.src
            data.name = _controlled?.document?.name
            break;
        default:
            data.img = game.user.avatar
            data.name = game.user.name
            break;
    }
    data.img = data.img || ""
    data.name = data.name || ""
    return data
}

// Свободное окно
export class AdvancedRequestsApp extends FormApplication {
    static instance = null
    constructor() {
        super();
    }
    
    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            popOut: false,
            classes: ['advanced-requests-app'],
            width: '100%',
            height: '100%',
            resizable: false,
            editable: false,
            id: "AdvancedRequestsApp",
            template: `modules/${C.ID}/templates/advanced-requests.hbs`,
            title: `Advanced Requests`,
            userId: game.userId,
            closeOnSubmit: false,
            submitOnChange: false,
        };
        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
        return mergedOptions;
    }

    getData(options) {

        const data = {
            queue: game.settings.get(C.ID, "queue"),
            show: (game.settings.get(C.ID, "requestsPosition") == "freeScreen"),
            firstRequest: game.settings.get(C.ID, "firstRequest"),
            secondRequest: game.settings.get(C.ID, "secondRequest"),
            thirdRequest: game.settings.get(C.ID, "thirdRequest"),
            widthDependOnQueue: game.settings.get(C.ID, "widthDependOnQueue"),
        }

        let freeScreenData = game.settings.get(C.ID, "freeScreenData");
        const freeScreenDataTemplate = {_x: 30, _y: 10, _w: 250, _h: game.settings.get(C.ID, "chatQueueHeight"), _z: game.settings.get(C.ID, "freeScreenZIndex")};
        freeScreenData = foundry.utils.mergeObject(freeScreenData, freeScreenDataTemplate, {overwrite: false});
        freeScreenData._w = data.widthDependOnQueue ? "fit-content" : `${freeScreenData._w}px`
        
        return { ...data, ...freeScreenData };
    }

    static activate() {
        this.instance = new AdvancedRequestsApp();
        this.instance.render(true);
    }

    static _render() {
        this.instance.render(true);
    }

    activateListeners(html) {
        super.activateListeners(html);

        // mover
        const grabEl = html[0].querySelector(".ar-freeScreen-mover");
        const requestsWindow = html[0]
        let isDragging = false;
        let startX, startY, initialX, initialY;
        grabEl.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseFloat(requestsWindow.style.right) || 0;
            initialY = parseFloat(requestsWindow.style.top) || 0;
            grabEl.style.cursor = 'grabbing';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        function onMouseMove(e) {
            if (!isDragging) return;
            const dx = (e.clientX - startX) / window.innerWidth * 100
            const dy = (e.clientY - startY) / window.innerHeight * 100
            const shiftPressed = e.shiftKey;
            if (shiftPressed) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    requestsWindow.style.right = `${(initialX - dx)}%`;
                    requestsWindow.style.top = `${initialY}%`;
                } else {
                    requestsWindow.style.top = `${initialY + dy}%`;
                    requestsWindow.style.right = `${(initialX)}%`;
                }
            } else {
                requestsWindow.style.top = `${initialY + dy}%`;
                requestsWindow.style.right= `${(initialX - dx)}%`;
            }
        }

        async function onMouseUp() {
            isDragging = false;
            grabEl.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            let _data = game.settings.get(C.ID, "freeScreenData");
            _data._x = parseFloat(requestsWindow.style.right) || 0;
            _data._y = parseFloat(requestsWindow.style.top) || 0;
            await game.settings.set(C.ID, "freeScreenData", _data);
        }

        // Перенести окно в чат
        html[0].querySelector(".ar-window-to-chat").addEventListener("click", async () => {
            await game.settings.set(C.ID, "requestsPosition", "chat");
            AdvancedRequestsApp._render();
            document.getElementById("advanced-requests-chat-body").style.display = null
        })

        // Заявки
        const requestEls = html[0].querySelectorAll(".ar-request-container-freeScreen")
        requestEls.forEach((el) => {addRequestListener(el, true)})

        // Кнопки заявок
        const addReqButtons = html[0].querySelectorAll(".ar-freeScreen-button")
        addReqButtons.forEach((el) => {
            el.addEventListener("click", async () => {
                await addRequest(parseInt(el.dataset.level), true)
            })
        })

        // Кнопка изменения размера
        const resizeEl = html[0].querySelector(".ar-resizable-handle");
        const queueEl = requestsWindow.querySelector(".ar-freeScreen-queue");
        let isResizing = false;
        let startW, startH, initialW, initialH;
        let widthDependOnQueue
        resizeEl.addEventListener('mousedown', (e) => {
            isResizing = true;
            startW = e.clientX;
            startH = e.clientY;
            widthDependOnQueue = game.settings.get(C.ID, "widthDependOnQueue");
            initialW = parseInt(queueEl.style.width) || 0;
            initialH = parseInt(requestsWindow.style.height) || 0;

            document.addEventListener('mousemove', onMouseMoveResize);
            document.addEventListener('mouseup', onMouseUpResize);
        });
        function onMouseMoveResize(e) {
            if (!isResizing) return;
            const dw = (e.clientX - startW)
            const dh = (e.clientY - startH)
            const shiftPressed = e.shiftKey;
            // Math.max добавлены в качестве ограничителя, чтобы ширина не могла быть меньше высоты и чтобы ограничить минимальную высоту 55-ю пикселями (ну вот надо так)
            if (shiftPressed) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    queueEl.style.width = widthDependOnQueue ? "fit-content" : (`${Math.max(initialW - dw, initialH)}px`);
                    requestsWindow.style.height = `${Math.max(initialH, 55)}px`;
                } else {
                    requestsWindow.style.height = `${Math.max(initialH + dh, 55)}px`;
                    queueEl.style.width = widthDependOnQueue ? "fit-content" : (`${initialW}px`);
                }
            } else {
                requestsWindow.style.height = `${Math.max(initialH + dh, 55)}px`;
                queueEl.style.width = widthDependOnQueue ? "fit-content" : (`${(Math.max(initialW - dw, initialH + dh))}px`);
            }
        }

        async function onMouseUpResize() {
            isResizing = false;
            document.removeEventListener('mousemove', onMouseMoveResize);
            document.removeEventListener('mouseup', onMouseUpResize);
            let _data = game.settings.get(C.ID, "freeScreenData");
            _data._w = parseInt(queueEl.style.width) || 0;
            _data._h = parseInt(requestsWindow.style.height) || 0;
            await game.settings.set(C.ID, "freeScreenData", _data);
        }
    }

    async _updateObject(event, formData) {
    }
}

Hooks.on("updateSetting", async (setting, value, options, userId) => {
    if (!setting.key == `${C.ID}.queue`) return
    const queueEl = document.getElementById("ar-chat-queue")
    const queue = setting.value
    const changes = options.changes || []
    if (changes.includes("addRequest")) {
        const queueItemData = queue.find((item) => item.id == options.reqId)
        if (!queueItemData) return
        const existingEls = queueEl.querySelectorAll(`[data-id="${options.reqId}"]`)
        existingEls.forEach(el => el.remove())
        const requestEl = getRequestElement(queueItemData)
        const index = queue.findIndex((item) => item.id == queueItemData.id);
        const prevEl = queueEl.children[index]
        if (prevEl) {
            queueEl.insertBefore(requestEl, prevEl)
        } else {
            queueEl.append(requestEl)
        }
        if (game.settings.get(C.ID, "soundCreate")) {
            AudioHelper.play({
                src: `modules/${C.ID}/assets/request${queueItemData.level}.wav`,
                volume: game.settings.get("core", "globalInterfaceVolume"),
            });
        }
    }
    if (changes.includes("deleteRequest")) {
        queueEl.removeChild(queueEl.querySelector(`[data-id="${options.reqId}"]`))
        const soundActivate = game.settings.get(C.ID, "soundActivate")
        if (soundActivate) {
            const reqClickSound = game.settings.get(C.ID, "reqClickSound")
            if (reqClickSound && await srcExists(reqClickSound)) {
                AudioHelper.play({
                    src: reqClickSound,
                    volume: game.settings.get("core", "globalInterfaceVolume"),
                });
            } else {
                ui.notifications.warn(game.i18n.localize(`${C.ID}.errors.noReqClickSound`) + " — " + reqClickSound);
            }
        }
    }
    AdvancedRequestsApp._render()
})

Hooks.on('setup', () => {
    game.socket.on(`module.${C.ID}`, async ({ type, settingData, options }) => {
        if (game.user.isGM) {
            switch (type) {
                case 'queue':
                    await game.settings.set(C.ID, 'queue', settingData, options);
                    ;
                default:
                    ;
            }
        }
    });
});

/*
TODO:

✖ Синхроназация настроек с ГМом
✔ Звук только для того кто кликнул слышен, балбес (чё?)
✔ Предупреждение если выбрано "controlled" для реквеста и токенов под контролем нет
✔ Да "выбранный токен на сцене" вообще в целом то не работает, лол
✔ Добавить кнопку открытия меню настройки заявки в меню настроек

✖ В каком углу стрелочка
✖ Наличие границы всей коробки (+вместе со стрелочкой или без неё)
✖ Наличие границы для стрелочки
✖ Цвет иконок и фона/границы заявок/стрелочки
✖ Стрелочку не видно пока не наведёшь
✖ Лок перемещения
✖ Форма границы стрелочки
✖ Форма кнопок заявок
✖ Размер стрелочки
✖ Размер кнопок заявок
✖ Положение восклицательных знаков
✖ Наличие/отсутствие изображений токенов/аватаров
✖ Граница для изображений токенов/аватаров
✖ Стрелочка внутри/снаружи коробки
✖ Возможность вообще засунуть нахуй заявки в чат вместо приложения



Способы уведомления при клике на заявку:
- ui.notification.warn
- Игра ставится на паузу
- Супер скучное сообщение в чате без какого либо воображения
- Звук (разные для разных сеттингов)
- Картика говна
*/
import { Constants as C } from "./const.js";

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
    // Кнопка открытия менюшки заявок
    const requestsMenuButton = document.createElement("div");
    requestsMenuButton.classList.add("ar-chat-requests-menu");
    requestsMenuButton.innerHTML = `<i class="fas fa-gear"></i>`
    requestsMenuButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.requestsMenuTooltip`);
    requestsMenuButton.addEventListener("click", () => {
        new ImageHelper().render(true)
    })
    queueBox.append(requestsMenuButton)
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

    // Remove any existing dash to avoid duplicates
    console.error("Removing existing dash");
    html[0].querySelectorAll(".adv-requests-dash").forEach(el => el.remove());
    // Create the dash
    const dash = document.createElement("section");
    dash.className = "adv-requests-dash";
    dash.innerHTML = "<button>Hello World</button>";
    // Insert above dice-tray if present, else at end
    const diceTray = html[0].querySelector(".dice-tray");
    if (diceTray) diceTray.parentNode.insertBefore(dash, diceTray);
    else html[0].appendChild(dash);

    // --- Injection point update for Foundry v13+ ---
    let injected = false;
    // Foundry v13+ uses '.chat-sidebar .chat-controls', older uses '#chat-controls'
    if (game.release && game.release.generation >= 13) {
        // Try to find the new chat controls container
        const chatControls = html[0].querySelector('.chat-sidebar .chat-controls') || html[0].querySelector('.chat-controls');
        if (chatControls) {
            chatControls.prepend(div);
            injected = true;
        }
    }
    if (!injected) {
        // Fallback for older versions
        const oldChatControls = html[0].querySelector('#chat-controls');
        if (oldChatControls) {
            oldChatControls.prepend(div);
            injected = true;
        }
    }
    if (!injected) {
        // As a last resort, prepend to the main html
        html[0].prepend(div);
    }
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
        const isGM = game.user.isGM
        if (isGM) {
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
        await deleteRequest(elId, reRender, isGM)
    })
    if (reRender) AdvancedRequestsApp._render(true)
}

async function addRequest(reqLevel, reRender = false) {
    const useForRequests = game.settings.get(C.ID, "useForRequests");
    const data = getRequestData(reqLevel, useForRequests);

    // Проверяем что имеется картинка для реквеста
    const defaultUserImg = "icons/svg/mystery-man.svg" // (HOW DO I GET A FUCKING SYSTEM DEFAULT AVATAR?)
    const defaultImg = useForRequests == "user" ? defaultUserImg : Actor.implementation.getDefaultArtwork({type: "someActorType"}).img;
    

    const hasImage = (data.img && data.img != defaultImg && await srcExists(defaultImg))
    

    if (hasImage) {
        const queue = getQueue();
        if (queue.some(item=>item.id == data.id)) {
            queue.splice(queue.findIndex(item => item.id === data.id), 1);
        }
        const index = queue.findLastIndex((item) => item.level > reqLevel);
        queue.splice(index + 1, 0, data);
    
        const options = {changes: ['addRequest', 'playSound'], reqId: data.id};
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


async function deleteRequest(id, reRender = false, playSound = false) {
    const queue = getQueue();
    queue.splice(queue.findIndex(item => item.id === id), 1);
    const options = {changes: ['deleteRequest'], reqId: id};
    if (playSound) options.changes.push("playSound")
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

// Remove AdvancedRequestsApp and ApplicationV2 usage for now
// let AdvancedRequestsApp;
// Hooks.once('init', function() {
//   AdvancedRequestsApp = class AdvancedRequestsApp extends ApplicationV2 {
//     ...
//   }
//   window.AdvancedRequestsApp = AdvancedRequestsApp;
//   Hooks.once('ready', () => {
//     AdvancedRequestsApp.activate();
//   });
// });

Hooks.on("updateSetting", async (setting, value, options, userId) => {
    if (!setting.key == `${C.ID}.queue`) return
    const queueEls = document.querySelectorAll(".ar-chat-queue")
    const queue = setting.value
    const changes = options.changes || []
    if (changes.includes("addRequest")) {
        const queueItemData = queue.find((item) => item.id == options.reqId)
        if (!queueItemData) return
        queueEls.forEach((queueEl) => {
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
        })
        if (game.settings.get(C.ID, "soundCreate") && changes.includes("playSound")) {
            let volume = game.settings.get(C.ID, "useFoundryInterfaceVolume") ? game.settings.get("core", "globalInterfaceVolume") : game.settings.get(C.ID, "soundCreateVolume") * 0.01
            if (queueItemData.level == 2) volume *= 1.9
            AudioHelper.play({
                src: `modules/${C.ID}/assets/request${queueItemData.level}.wav`,
                volume: volume,
            });
        }
    }
    if (changes.includes("deleteRequest")) {
        queueEls.forEach((queueEl) => {
            queueEl.removeChild(queueEl.querySelector(`[data-id="${options.reqId}"]`))
        })
        const soundActivate = game.settings.get(C.ID, "soundActivate") && changes.includes("playSound")
        if (soundActivate) {
            const reqClickSound = game.settings.get(C.ID, "reqClickSound")
            if (reqClickSound && await srcExists(reqClickSound)) {
                const volume = game.settings.get(C.ID, "useFoundryInterfaceVolume") ? game.settings.get("core", "globalInterfaceVolume") : game.settings.get(C.ID, "soundActivateVolume") * 0.01
                AudioHelper.play({
                    src: reqClickSound,
                    volume: volume,
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

// Синхронизация с Visual Novel
Hooks.on("updateSetting", async (setting, value, _options, userId) => {
    if (setting.key == `visual-novel-dialogues.advancedRequestsSync`) {
        await game.settings.set(C.ID, 'visualNovelSync', value.key)
    } else if (setting.key == `visual-novel-dialogues.vnData`) {
        if (_options.stopFuckingAround) return
        const changes = _options.change
        const queue = getQueue();
        const vnData = foundry.utils.deepClone(setting.value)
        const reqId = _options.requestId
        let data = vnData.requests.find((item) => item.id == _options.requestId)
        if (changes.includes("requestAdd") && data) {
            data.level -= 1
            if (queue.some(item=>item.id == reqId)) {
                queue.splice(queue.findIndex(item => item.id === reqId), 1);
            }
            const index = queue.findLastIndex((item) => item.level > reqLevel);
            queue.splice(index + 1, 0, data);
        
            const options = {changes: ['addRequest'], reqId: reqId, stopFuckingAround: true};
            if (game.user.isGM) {
                await game.settings.set(C.ID, 'queue', queue, options);
            } else {
                game.socket.emit(`module.${C.ID}`, {
                    type: 'queue',
                    settingData: queue,
                    options
                });
            }
            AdvancedRequestsApp._render(true)
        }
        if (changes.includes("requestsRemove")) {
            queue.splice(queue.findIndex(item => item.id === reqId), 1);
            const options = {changes: ['deleteRequest'], reqId: reqId, stopFuckingAround: true};
            if (game.user.isGM) {
                await game.settings.set(C.ID, 'queue', queue, options);
            } else {
                game.socket.emit(`module.${C.ID}`, {
                    type: 'queue',
                    settingData: queue,
                    options
                });
            }
            AdvancedRequestsApp._render(true)
        }
    }
})

function injectAdvRequestsDash() {
    const chatMessage = document.getElementById("chat-message");
    if (!chatMessage) {
        console.warn("[Advanced Requests] #chat-message not found");
        return;
    }
    // Remove any existing dash to avoid duplicates
    chatMessage.parentNode.querySelectorAll(".adv-requests-dash").forEach(el => el.remove());
    // Create the dash
    const dash = document.createElement("section");
    dash.className = "adv-requests-dash";
    dash.innerHTML = "<button>Hello World</button>";
    // Insert above chat-message
    chatMessage.parentNode.insertBefore(dash, chatMessage);
    console.log("[Advanced Requests] adv-requests-dash injected above chat-message", dash);
}

Hooks.once("renderChatLog", injectAdvRequestsDash);
Hooks.on("renderChatLog", injectAdvRequestsDash);
Hooks.on("closeChatLog", injectAdvRequestsDash);
Hooks.on("activateChatLog", injectAdvRequestsDash);
Hooks.on("deactivateChatLog", injectAdvRequestsDash);
Hooks.on("collapseSidebar", injectAdvRequestsDash);
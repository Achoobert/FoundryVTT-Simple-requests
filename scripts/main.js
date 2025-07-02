import { Constants as C } from "./const.js";

// Ensure CONFIG.ADVREQUESTS and queue are always initialized
if (!window.CONFIG) window.CONFIG = {};
if (!CONFIG.ADVREQUESTS) CONFIG.ADVREQUESTS = {};
if (!Array.isArray(CONFIG.ADVREQUESTS.queue)) CONFIG.ADVREQUESTS.queue = [];

// queue logic
/**
 * Get the current request queue, sorted by urgency (level) and recency (timestamp, newest first)
 */
function pop_request_LOCAL_QUEUE() {
   let queue = CONFIG.ADVREQUESTS.queue || [];
   // Sort by level (descending: urgent first), then by timestamp (descending: newest first)
   return queue.slice().sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.timestamp - a.timestamp;
   });
   // TODO remove from queue
}

/**
 * Get the current request queue, sorted by urgency (level) and recency (timestamp, newest first)
 */
function get_requests_LOCAL_QUEUE() {
    let queue = CONFIG.ADVREQUESTS.queue || [];
    // Sort by level (descending: urgent first), then by timestamp (descending: newest first)
    return queue.slice().sort((a, b) => {
       if (b.level !== a.level) return b.level - a.level;
       return b.timestamp - a.timestamp;
    });
 }

/**
 * Add a new request to the queue, including a timestamp. Insert relative to urgency and recency.
 * @param {Object} requestData - Must include userId, name, img, level
 */
function add_new_request_LOCAL_QUEUE(requestData) {
   let queue = CONFIG.ADVREQUESTS.queue || [];
   // if user has a request with same urgency
   const existing = queue.find(r => r.userId === requestData.userId);
   if (existing && existing.level === requestData.level) {
      // Do not update 
      return queue;
   }
   // Add timestamp if not present
   if (!requestData.timestamp) requestData.timestamp = Date.now();
   // Remove any existing request from this user
   queue = queue.filter(r => r.userId !== requestData.userId);
   // Insert and sort
   queue.push(requestData);
   queue = queue.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.timestamp - a.timestamp;
   });
   CONFIG.ADVREQUESTS.queue = queue;
   return queue;
}

/**
 * Remove a request from the queue. Defaults to removing the newest and most urgent for a user.
 * @param {string} userId
 */
function remove_request_LOCAL_QUEUE(userId) {
   let queue = CONFIG.ADVREQUESTS.queue || [];
   // Remove the most urgent, newest request for this user
   let idx = queue.findIndex(r => r.userId === userId);
   if (idx !== -1) queue.splice(idx, 1);
   CONFIG.ADVREQUESTS.queue = queue;
   return queue;
}

/**
 * Load a queue from another user (e.g., after refresh or join)
 * @param {Array} newQueue
 */
function load_queue_requests_LOCAL_QUEUE(newQueue) {
   // Validate and sort, most urgent + oldest
//    there should only be one request per user
   if (!Array.isArray(newQueue)) return;
   CONFIG.ADVREQUESTS.queue = newQueue.slice().sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.timestamp - a.timestamp;
   });
   return CONFIG.ADVREQUESTS.queue;
}

let log_socket = (str, obj) => {
    let message = "advanced-requests: " + str;
    console.log({message, data: obj});
}

Hooks.on("renderChatInput", (app, html, data) => {
    // Foundry VTT v11+: html is an object mapping selectors to elements
    const chatInput = html["#chat-message"];
    if (!chatInput) {
        console.error("Chat input not available");
        return;
    }
    // Remove any existing dash to avoid duplicates
    chatInput.parentNode.querySelectorAll(".adv-requests-dash").forEach(el => el.remove());
    // Create the dash
    const dash = renderAdvRequestsDash();
    dash.id = "adv-requests-dash";
    // Insert BEFORE the chat input
    chatInput.parentNode.insertBefore(dash, chatInput);
    CONFIG.ADVREQUESTS.element = dash;
});
Hooks.on("userConnected", (user) => {
    // Only run this logic if there is more than one user online
    // load_queue_requests_LOCAL_QUEUE
    if (game.users?.filter(u => u.active).length > 1) {
        // Only the first active GM or the first user in the list should send the queue
        // (to avoid all users sending at once)
        const activeUsers = game.users.filter(u => u.active);
        const isFirstUser = activeUsers[0]?.id === game.user.id;
        const isFirstGM = game.user.isGM && !activeUsers.some(u => u.isGM && u.id < game.user.id);
        if (isFirstUser || isFirstGM) {
            // Send the current queue to the new user
            if (window.advancedRequests && typeof window.advancedRequests.syncQueueToOthers === "function") {
                window.advancedRequests.syncQueueToOthers();
            }
        }
    }
});
Hooks.on("renderSidebarTab", (app, html, data) => {
    debugger
    if (app.tabName !== "chat") return;
    const div = document.createElement("div");
    div.classList.add("advanced-requests-chat-body");
    if (game.settings.get(C.ID, "requestsPosition") != "chat") div.style.display = "none";
    div.id = "advanced-requests-chat-body";
    const height = game.settings.get(C.ID, "chatQueueHeight") + "px";
    div.style.minHeight = height
    div.style.maxHeight = height
    const queueBox = document.createElement("div");
    queueBox.classList.add("ar-chat-queue");
    queueBox.id = "ar-chat-queue"
    const queue = getQueue();
    queue.forEach((item) => {
        const containerEl = getRequestElement(item)
        queueBox.append(containerEl)
    })
    const requestsMenuButton = document.createElement("div");
    requestsMenuButton.classList.add("ar-chat-requests-menu");
    requestsMenuButton.innerHTML = `<i class="fas fa-gear"></i>`
    requestsMenuButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.requestsMenuTooltip`);
    requestsMenuButton.addEventListener("click", () => {
        new ImageHelper().render(true)
    })
    queueBox.append(requestsMenuButton)
    const transferButton = document.createElement("div");
    transferButton.className = "ar-chat-queue-transfer ar-hidden";
    transferButton.innerHTML = `<i class="fas fa-up-right-from-square"></i>`
    transferButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.queueTransferTooltip`);
    let isElementHovered = false
    div.addEventListener("mouseover", (e) => {
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
            // If shift is held down - create the button to change location
            transferButton.classList.toggle("ar-hidden", false);
            queueBox.querySelectorAll(".ar-request-container-chat").forEach((el) => {
                el.classList.toggle("ar-hidden", true);
            })
        }
    })
    document.addEventListener("keyup", (e) => {
        if ((e.code == "ShiftLeft" || e.code == "ShiftRight") && isElementHovered) {
            // If shift is held down - create the button to change location
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
    // Insert above dice-tray if present, else at end
    const diceTray = html[0].querySelector(".dice-tray");
    if (diceTray) diceTray.parentNode.insertBefore(dash, diceTray);
    else html[0].appendChild(dash);

    // Foundry v13+ uses '.chat-sidebar .chat-controls'

        // Try to find the new chat controls container
        const chatControls = html[0].querySelector('.chat-sidebar .chat-controls') || html[0].querySelector('.chat-controls');
        if (chatControls) {
            chatControls.prepend(div);
        }
    
});
// --- SocketLib integration ---

class AdvancedRequestsManager {
  constructor() {
    this.moduleName = "advanced-requests";
    this.socket = socketlib.registerModule(this.moduleName);
    this.socket.register("createRequest", this._createRequest.bind(this));
    this.socket.register("addRequest", this._addRequest.bind(this));
    this.socket.register("removeRequest", this._removeRequest.bind(this));
    this.socket.register("activateRequest", this._activateRequest.bind(this));
    this.socket.register("updateRequestQueue", this._updateRequestQueue.bind(this));
    this.socket.register("syncQueue", this._syncQueue.bind(this));
    // Debug handler
    this.socket.register("debugPing", this._debugPing.bind(this));
  }

  _debugPing(senderName) {
    console.log(`[Advanced Requests] Received debug ping from: ${senderName}`);
  }

  sendDebugPing() {
    this.socket.executeForOthers("debugPing", game.user.name);
  }

  _syncQueue(newQueue) {
    log_socket("syncing queue", newQueue);
    load_queue_requests_LOCAL_QUEUE(newQueue);
    moveAdvRequestsDash();
  }
  _createRequest(newQueue) {
    log_socket("syncing queue", newQueue);
    load_queue_requests_LOCAL_QUEUE(newQueue);
    moveAdvRequestsDash();
  }

  syncQueueToOthers() {
    log_socket("sending queue", CONFIG.ADVREQUESTS.queue);
    this.socket.executeForOthers("syncQueue", CONFIG.ADVREQUESTS.queue);
  }

  // When THIS CLIENT creates a request locally
  createRequest(requestData) {
    log_socket("creating request locally", requestData);
    add_new_request_LOCAL_QUEUE(requestData);
    moveAdvRequestsDash();
    // Send to all other clients
    this.socket.executeForOthers("addRequest", requestData);
  }

  // When receiving a request from another client
  _addRequest(requestData) {
    log_socket("receiving request from other client", requestData);
    add_new_request_LOCAL_QUEUE(requestData);
    moveAdvRequestsDash();
  }

  // Check if user is authorized to remove this request
  isAuthorizedToRemove(userId) {
    return game.user.isGM || game.user.id === userId;
  }

  // When THIS CLIENT removes a request locally
  removeRequest(userId) {
    if (!this.isAuthorizedToRemove(userId)) {
      log_socket("unauthorized remove attempt", { userId, user: game.user.id, isGM: game.user.isGM });
      return;
    }
    log_socket("removing request locally", userId);
    remove_request_LOCAL_QUEUE(userId);
    moveAdvRequestsDash();
    // Send to all other clients
    this.socket.executeForOthers("removeRequest", userId);
  }

  // When receiving a remove request from another client
  _removeRequest(userId) {
    log_socket("receiving remove request from other client", userId);
    remove_request_LOCAL_QUEUE(userId);
    moveAdvRequestsDash();
  }

  // Update entire queue (for bulk operations)
  updateRequestQueue(queueData) {
    log_socket("updating entire queue", queueData);
    load_queue_requests_LOCAL_QUEUE(queueData);
    moveAdvRequestsDash();
    this.socket.executeForOthers("updateRequestQueue", queueData);
  }

  // When receiving queue update from another client
  _updateRequestQueue(queueData) {
    log_socket("receiving queue update from other client", queueData);
    load_queue_requests_LOCAL_QUEUE(queueData);
    moveAdvRequestsDash();
  }

  _activateRequest(userId) {
    log_socket("activating request", userId);
    let queue = CONFIG.ADVREQUESTS.queue || [];
    const req = queue.find(r => r.userId === userId);
    if (!req) return;
    // Play sound
    const sound = game.settings.get(this.moduleName, "reqClickSound") || "modules/advanced-requests/assets/samples/fingerSnapping.wav";
    foundry.audio.AudioHelper.play({ src: sound, volume: 0.8, autoplay: true, loop: false });
    // Chat message
    ChatMessage.create({
      user: game.user.id,
      speaker: { alias: game.user.name },
      content: `${req.name} ${game.i18n.localize("advanced-requests.chatMessage.activateRequest2")}`
    });
    // Remove request
    remove_request_LOCAL_QUEUE(userId);
    moveAdvRequestsDash();
    this.syncQueueToOthers();
  }

  activateRequest(userId) {
    this.socket.executeForEveryone("activateRequest", userId);
  }
}

// Initialize manager after SocketLib is ready
Hooks.once("socketlib.ready", () => {
  window.advancedRequests = new AdvancedRequestsManager();
});

// this is legacy code, but we should use these logic patterns.
function getRequestElement(item) {
    // Container
    console.error("rendering element")
    const containerEl = document.createElement('div');
    containerEl.className = `ar-request-container-chat ar-level-${item.level}`;
    containerEl.dataset.id = item.userId;
    containerEl.dataset.tooltip = item.name;
    // Image
    const tokenImgEl = document.createElement('img');
    tokenImgEl.src = item.img;
    containerEl.append(tokenImgEl);
    // Warning sign
    const warningEl = document.createElement('div');
    warningEl.className = `ar-queue-warning ar-level-${item.level}`;
    warningEl.innerHTML = `<img src="modules/${C.ID}/assets/request${item.level}.webp"/>`;
    containerEl.append(warningEl);

    // Event listeners for request management
    containerEl.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (game.user.isGM && game.user.id !== item.userId) {
            window.advancedRequests.activateRequest(item.userId);
        } else if (game.user.id === item.userId) {
            window.advancedRequests.removeRequest(item.userId);
        }
    });
    containerEl.addEventListener('contextmenu', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (game.user.isGM) {
            window.advancedRequests.removeRequest(item.userId);
        } else if (game.user.id === item.userId) {
            window.advancedRequests.removeRequest(item.userId);
        }
    });
    return containerEl;
}

// function addRequestListener(element, reRender = false) {
//     const elId = element?.dataset?.id
//     if (!game.user.isGM && game.user.id != elId) return
//     element?.addEventListener('contextmenu', async () => {
//         await deleteRequest(elId, reRender)
//     })
//     element?.addEventListener('click', async () => {
//         const isGM = game.user.isGM
//         if (isGM) {
//             const messageActivate = game.settings.get(C.ID, "messageActivate")
//             if (messageActivate) {
//                 const _user = game.users.find(u=>u.isGM) || game.user
//                 ChatMessage.create({
//                     user: _user.id,
//                     speaker: {alias: _user.name},
//                     content: game.i18n.localize(`${C.ID}.chatMessage.activateRequest1`) + game.users.find(u=>u.id == elId)?.name + game.i18n.localize(`${C.ID}.chatMessage.activateRequest2`) // изменить по типу "Игрок какой-то там сделал заявку"
//                 })
//             }
//         }
//         await deleteRequest(elId, reRender, isGM)
//     })
//     if (reRender) AdvancedRequestsApp._render(true)
// }

async function addRequest(reqLevel, reRender = false) {
    debugger
    log_socket("original add request", {reqLevel, reRender})
    const useForRequests = game.settings.get(C.ID, "useForRequests");
    // const data = getRequestData(reqLevel, useForRequests);

    // Check that there is an image for the request
    const defaultUserImg = "icons/svg/mystery-man.svg" // (HOW DO I GET A FUCKING SYSTEM DEFAULT AVATAR?)
    const defaultImg = useForRequests == "user" ? defaultUserImg : Actor.implementation.getDefaultArtwork({type: "someActorType"}).img;
    
    const hasImage = (data.img && data.img != defaultImg && await srcExists(defaultImg))
    
    if (hasImage) {
        // Use the new manager to create the request
        const requestData = {
            userId: data.id,
            name: data.name,
            img: data.img,
            level: reqLevel
        };
        window.advancedRequests.createRequest(requestData);
    } else if (useForRequests == "controlled") {
        ui.notifications.warn(game.i18n.localize(`${C.ID}.errors.noControlledTokens`));
    } else {
        new ImageHelper().render(true)
    }
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

// Hooks.on("updateSetting", async (setting, value, _options, userId) => {
//     if (setting.key == `visual-novel-dialogues.advancedRequestsSync`) {
//         await game.settings.set(C.ID, 'visualNovelSync', value.key)
//     }
// })

function renderAdvRequestsDash() {
    const dash = document.createElement("section");
    dash.className = "adv-requests-dash flexcol";

    // Queue display
    const queueRow = document.createElement("div");
    queueRow.className = "adv-requests-queue flexrow";
    for (const req of get_requests_LOCAL_QUEUE()) {
        const chip = document.createElement("div");
        chip.className = `adv-request-chip level-${req.level}`;
        chip.title = `${req.name} (${["Common", "Important", "Urgent", "test"][req.level]})`;
        chip.innerHTML = `<img src="${req.img || "icons/svg/mystery-man.svg"}" style="width:24px;height:24px;border-radius:50%;"> ${req.name}`;
        // Remove on click (if own or GM)
        if (game.user.isGM) {
            chip.onclick = (event) => {
                event.preventDefault();
                // GM can pop the oldest, most urgent request
                pop_request_LOCAL_QUEUE();
                moveAdvRequestsDash();
            };
        }
        if (req.userId === game.user.id) {
            chip.onclick = (event) => {
                event.preventDefault();
                window.advancedRequests.removeRequest(game.user.id);
            };
        }
        queueRow.appendChild(chip);
    }
    dash.appendChild(queueRow);

    // Add request buttons
    const btnRow = document.createElement("div");
    btnRow.className = "adv-requests-buttons flexrow";
    // GM-only button to pop oldest, most urgent
    if (game.user.isGM) {
        const popBtn = document.createElement("button");
        popBtn.type = "button";
        popBtn.textContent = "Pop Oldest/Urgent";
        popBtn.onclick = (event) => {
            event.preventDefault();
            pop_request_LOCAL_QUEUE();
            moveAdvRequestsDash();
        };
        btnRow.appendChild(popBtn);
    }
    ["Common", "Important", "Urgent", "test"].forEach((label, level) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        if (label === "test") {
            btn.onclick = (event) => {
                event.preventDefault();
                window.advancedRequests.sendDebugPing();
                console.log("[Advanced Requests] Sent Hello World to all other users from test button.");
            };
        } else {
            btn.onclick = (event) => {
                event.preventDefault();
                const requestData = {
                    userId: game.user.id,
                    name: game.user.name,
                    img: game.user.avatar,
                    level
                };
                window.advancedRequests.createRequest(requestData);
            };
        }
        btnRow.appendChild(btn);
    });
    dash.appendChild(btnRow);

    return dash;
}

function moveAdvRequestsDash() {
    log_socket("moveAdvRequestsDash called by", game.user.name);
    log_socket("current queue", CONFIG.ADVREQUESTS.queue);
    const chatInput = document.querySelector("#chat-message.chat-input");
    if (!chatInput) {
        if (CONFIG.ADVREQUESTS.element?.parentNode) CONFIG.ADVREQUESTS.element.parentNode.removeChild(CONFIG.ADVREQUESTS.element);
        return;
    }
    chatInput.parentNode.querySelectorAll(".adv-requests-dash").forEach(el => el.remove());
    const dash = renderAdvRequestsDash();
    dash.id = "adv-requests-dash";
    CONFIG.ADVREQUESTS.element = dash;
    // Insert BEFORE the chat input
    chatInput.parentNode.insertBefore(dash, chatInput);
}

Hooks.once("renderChatLog", moveAdvRequestsDash);
Hooks.on("renderChatLog", moveAdvRequestsDash);
Hooks.on("closeChatLog", moveAdvRequestsDash);
Hooks.on("activateChatLog", moveAdvRequestsDash);
Hooks.on("deactivateChatLog", moveAdvRequestsDash);
Hooks.on("collapseSidebar", moveAdvRequestsDash);


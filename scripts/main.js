import { Constants as C } from "./const.js";
const default_img = "icons/magic/control/debuff-energy-hold-blue-yellow.webp" // TODO link better

// Ensure CONFIG.ADV_REQUESTS and queue are always initialized
if (!window.CONFIG) window.CONFIG = {};
if (!CONFIG.ADV_REQUESTS) CONFIG.ADV_REQUESTS = {};
if (!Array.isArray(CONFIG.ADV_REQUESTS.queue)) CONFIG.ADV_REQUESTS.queue = [];

// Version detection and initialization
let init = () => {
   // init for version 13
   console.log("Simple Requests: Initializing for Foundry VTT v13");
};

// Check if we're in version 12 (older Foundry)
// if (game.version && game.version.startsWith("12")) {
if (false) {
   init = () => {
      // initialize things for version 12
      console.error("Simple Requests: Initializing for Foundry VTT v12");
      initV12();
   };
}
init();

// Version 12 specific functionality
function initV12() {
   // Initialize version 12 specific hooks and functionality
   initV12Hooks();
}
initV12Hooks();


// queue logic
function pop_request_LOCAL_QUEUE() {
   let queue = CONFIG.ADV_REQUESTS.queue || [];
   log_socket("old", queue)
   // Sort by level (descending: urgent first), then by timestamp ( oldest first )
   let selected_request = queue.slice().sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return a.timestamp - b.timestamp;
   });
   selected_request = selected_request[0] || selected_request;
   // remove for GM
   remove_request_LOCAL_QUEUE(selected_request.userId)
   log_socket("new", queue)
   log_socket("pop_request_LOCAL_QUEUE", selected_request)
   return selected_request
};

function get_requests_LOCAL_QUEUE() {
   let queue = CONFIG.ADV_REQUESTS.queue || [];
   // Sort by level (descending: urgent first), then by timestamp ( oldest first )
   return queue.slice().sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return a.timestamp - b.timestamp;
   });
}

/**
 * Add a new request to the queue, including a timestamp. Insert relative to urgency and recency.
 * @param {Object} requestData - Must include userId, name, img, level
 */
function add_new_request_LOCAL_QUEUE(requestData) {
   let queue = CONFIG.ADV_REQUESTS.queue || [];
   // if user has a request with same urgency
   const existing = queue.find(r => r.userId === requestData.userId);
   if (existing && existing.level === requestData.level) {
      // Do not update 
      return queue;
   }
   if (!requestData.timestamp) requestData.timestamp = Date.now();
   queue = queue.filter(r => r.userId !== requestData.userId);
   queue.push(requestData);
   queue = queue.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return a.timestamp - b.timestamp;
   });
   CONFIG.ADV_REQUESTS.queue = queue;
   return queue;
}

/**
 * Remove a request from the queue. Defaults to removing the newest and most urgent for a user.
 * @param {string} userId
 */
function remove_request_LOCAL_QUEUE(userId) {
   let queue = CONFIG.ADV_REQUESTS.queue || [];
   if (typeof userId === 'undefined' || userId === null) {
      // Remove the first (oldest, most urgent) request
      if (queue.length > 0) queue.splice(0, 1);
   } else {
      // Remove any/all requests for this user
      queue = queue.filter(r => r.userId !== userId);
   }
   CONFIG.ADV_REQUESTS.queue = queue;
   return queue;
}

/**
 * Load a queue from another user (e.g., after refresh or join)
 * @param {Array} newQueue
 */
function load_queue_requests_LOCAL_QUEUE(newQueue) {
   // Validate and sort, most urgent & oldest
   // there should only be one request per user
   if (!Array.isArray(newQueue)) return;
   CONFIG.ADV_REQUESTS.queue = newQueue.slice().sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return a.timestamp - b.timestamp;
   });
   return CONFIG.ADV_REQUESTS.queue;
}

// enable when debugging
let log_socket = (str, obj) => {
   let message = "simple-requests: " + str;
   console.log({message, data: obj});
   return;
}

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
         if (window.simpleRequests && typeof window.simpleRequests.syncQueueToOthers === "function") {
            window.simpleRequests.syncQueueToOthers();
         }
      }
   }
});

// --- SocketLib integration ---

class SimpleRequestsManager {
   constructor() {
      this.moduleName = "simple-requests";
      this.socket = socketlib.registerModule(this.moduleName);
      // this.socket.register("createRequest", this._createRequest.bind(this));
      this.socket.register("addRequest", this._addRequest.bind(this));
      this.socket.register("removeRequest", this._removeRequest.bind(this));
      this.socket.register("activateRequest", this._activateRequest.bind(this));
      this.socket.register("updateRequestQueue", this._updateRequestQueue.bind(this));
      this.socket.register("syncQueue", this._syncQueue.bind(this));
      // Debug handler
      // this.socket.register("debugPing", this._debugPing.bind(this));
   }

   //   _debugPing(senderName) {
   //     console.log(`[Simple Requests] Received debug ping from: ${senderName}`);
   //   }

   //   sendDebugPing() {
   //     this.socket.executeForOthers("debugPing", game.user.name);
   //   }

   async _syncQueue(newQueue) {
      log_socket("syncing queue", newQueue);
      load_queue_requests_LOCAL_QUEUE(newQueue);
      await moveAdvRequestsDash();
   }
   async _createRequest(newQueue) {
      
      log_socket("syncing queue", newQueue);
      load_queue_requests_LOCAL_QUEUE(newQueue);
      await moveAdvRequestsDash();
   }

   syncQueueToOthers() {
      log_socket("sending queue", CONFIG.ADV_REQUESTS.queue);
      this.socket.executeForOthers("syncQueue", CONFIG.ADV_REQUESTS.queue);
   }

   // can only be called by a GM
   async gm_callout_top_request() {
      const toShow = pop_request_LOCAL_QUEUE()
      log_socket("sending pop_top_request", toShow);
      // popup message for all
      this.socket.executeForOthers("showEpicPrompt", toShow);
      _showEpicPrompt(toShow);
      await moveAdvRequestsDash();
   }

   // When THIS CLIENT creates a request locally
   async createRequest(requestData) {
      
      log_socket("creating request locally", requestData);
      add_new_request_LOCAL_QUEUE(requestData);
      // Send to all other clients
      this.socket.executeForOthers("addRequest", requestData);
      await moveAdvRequestsDash();
   }

   // img: "images/Edmund_Carter.webp"
   // level: 0
   // name: "Player2"
   // timestamp: 1751550901413
   // userId: "T07N5SnoLPF0O5Nj"

   // When receiving a request from another client
   async _addRequest(requestData) {
      log_socket("receiving request from other client", requestData);
      add_new_request_LOCAL_QUEUE(requestData);
      await moveAdvRequestsDash();
      // Play sound for new request if not from self
      if (requestData.userId !== game.user.id) {
         const soundCreate = game.settings.get("simple-requests", "soundCreate");
         const soundVolume = (game.settings.get("simple-requests", "soundCreateVolume") || 100) / 100;
         if (soundCreate) {
            let soundSettingKey;
            switch (requestData.level) {
            case 0:
               soundSettingKey = "firstRequestSound";
               break;
            case 1:
               soundSettingKey = "secondRequestSound";
               break;
            case 2:
               soundSettingKey = "thirdRequestSound";
               break;
            default:
               soundSettingKey = "firstRequestSound";
            }
            const soundSrc = game.settings.get("simple-requests", soundSettingKey) || "modules/simple-requests/assets/request0.ogg";
            playSound(soundVolume, soundSrc);
         }
      }
   }

   // Check if user is authorized to remove this request
   isAuthorizedToRemove(userId) {
      return game.user.isGM || game.user.id === userId;
   }

   // When THIS CLIENT removes a request locally
   async removeRequest(userId) {
      if (this.isAuthorizedToRemove(userId)) {
         log_socket("removing request locally", userId);
         remove_request_LOCAL_QUEUE(userId);
         await moveAdvRequestsDash();
         // Send to all other clients
         this.socket.executeForOthers("removeRequest", userId);
      }
   }

   // When receiving a remove request from another client
   async _removeRequest(userId) {
      log_socket("receiving remove request from other client", userId);
      remove_request_LOCAL_QUEUE(userId);
      await moveAdvRequestsDash();
   }

   // Update entire queue (for bulk operations)
   async updateRequestQueue(queueData) {
      log_socket("updating entire queue", queueData);
      load_queue_requests_LOCAL_QUEUE(queueData);
      await moveAdvRequestsDash();
      this.socket.executeForOthers("updateRequestQueue", queueData);
   }

   // When receiving queue update from another client
   async _updateRequestQueue(queueData) {
      log_socket("receiving queue update from other client", queueData);
      load_queue_requests_LOCAL_QUEUE(queueData);
      await moveAdvRequestsDash();
   }

   async _activateRequest(userId) {
      log_socket("activating request", userId);
      let queue = CONFIG.ADV_REQUESTS.queue || [];
      const req = queue.find(r => r.userId === userId);
      if (!req) return;
      // Play sound
      const sound = game.settings.get(this.moduleName, "reqClickSound") || "modules/simple-requests/assets/samples/fingerSnapping.ogg";
      foundry.audio.AudioHelper.play({ src: sound, volume: 0.8, autoplay: true, loop: false });
      // Chat message
      ChatMessage.create({
         user: game.user.id,
         speaker: { alias: game.user.name },
         content: `${req.name} ${game.i18n.localize("simple-requests.chatMessage.activateRequest2")}`
      });
      // Remove request
      remove_request_LOCAL_QUEUE(userId);
      await moveAdvRequestsDash();
      this.syncQueueToOthers();
   }

   activateRequest(userId) {
      this.socket.executeForEveryone("activateRequest", userId);
   }
}

// Initialize manager after SocketLib is ready
Hooks.once("socketlib.ready", () => {
   window.simpleRequests = new SimpleRequestsManager();
   window.simpleRequests.socket.register("showEpicPrompt", async (data) => {
      remove_request_LOCAL_QUEUE(data.userId);
      // update UI
      await moveAdvRequestsDash();
      _showEpicPrompt(data);
   });
});

// async function renderAdvRequestsDash() {
//    // // Prepare data for template
//    // const queue = get_requests_LOCAL_QUEUE();
//    // const chatElement = document.getElementById("chat");
//    // const sidebarContent = document.getElementById("sidebar-content");
//    // const isChatVisible = chatElement && chatElement.offsetParent !== null;
//    // const isSidebarExpanded = sidebarContent && sidebarContent.classList.contains("expanded");
   
//    // const templateData = {
//    //    queue: queue,
//    //    showButtons: isChatVisible && isSidebarExpanded,
//    //    isGM: game.user.isGM,
//    //    getLevelName: (level) => ["Common", "Important", "Urgent", "test"][level] || "Unknown"
//    // };
   
//    // Render template
//    let template;
//    try {
//       template = await renderTemplate(`modules/${C.ID}/templates/simple-requests-dashboard.hbs`, templateData);
//    } catch (error) {
//       console.warn("Simple Requests: Template not found, falling back to manual DOM creation", error);
//       // Fallback to manual DOM creation
//       // return renderAdvRequestsDashFallback();
//       return renderSimpleRequestsQueue();
//    }
//    const tempDiv = document.createElement('div');
//    tempDiv.innerHTML = template;
//    const dash = tempDiv.firstElementChild;
   
//    // Add event listeners
//    dash.querySelectorAll('.adv-request-chip').forEach(chip => {
//       const userId = chip.dataset.userId;
//       const req = queue.find(r => r.userId === userId); // ? unused
      
//       if (game.user.isGM) {
//          chip.onclick = async (event) => {
//             event.preventDefault();
//             // GM can pop the oldest, most urgent request
//             await window.simpleRequests.gm_callout_top_request();
//             await moveAdvRequestsDash();
//          };
//          chip.oncontextmenu = async (event) => {
//             event.preventDefault();
//             await window.simpleRequests.removeRequest(userId);
//          };
//       } else if (userId === game.user.id) {
//          chip.onclick = async (event) => {
//             event.preventDefault();
//             await window.simpleRequests.removeRequest(game.user.id);
//          };
//       }
//    });
   
//    // Add button event listeners
//    dash.querySelectorAll('.pop-oldest-btn').forEach(btn => {
//       btn.onclick = async (event) => {
//          event.preventDefault();
//          await window.simpleRequests.gm_callout_top_request();
//          await moveAdvRequestsDash();
//       };
//    });
   
//    // dash.querySelectorAll('.request-btn').forEach(btn => {
//    //    btn.onclick = async (event) => {
//    //       event.preventDefault();
//    //       const level = parseInt(btn.dataset.level);
//    //       const requestData = {
//    //          userId: game.user.id,
//    //          name: game.user.name,
//    //          img: game.user.avatar,
//    //          level
//    //       };
//    //       await window.simpleRequests.createRequest(requestData);
//    //    };
//    // });
   
//    return dash;
// }
async function renderSimpleRequestsQueue() {
   // Get the chat controls container
   const chatControls = getChatControlsContainer();
   if (!chatControls) return;

   // Remove any existing instance of the requests UI
   const oldDiv = document.getElementById("simple-requests-chat-body");
   if (oldDiv && oldDiv.parentNode) oldDiv.parentNode.removeChild(oldDiv);

   // Create the main container div
   const new_request_element = document.createElement("div");
   new_request_element.classList.add("simple-requests-chat-body");
   new_request_element.id = "simple-requests-chat-body";

   // Queue display
   const queueBox = document.createElement("div");
   queueBox.classList.add("ar-chat-queue");
   queueBox.id = "ar-chat-queue";
   const queue = get_requests_LOCAL_QUEUE();
   queue.forEach((item) => {
      const containerEl = getV12RequestElement(item);
      queueBox.append(containerEl);
   });

   // Requests menu button
   const requestsMenuButton = document.createElement("div");
   requestsMenuButton.classList.add("ar-chat-requests-menu");
   requestsMenuButton.innerHTML = `<i class="fas fa-gear"></i>`;
   requestsMenuButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.requestsMenuTooltip`);
   queueBox.append(requestsMenuButton);

   // Transfer button
   const transferButton = document.createElement("div");
   transferButton.className = "ar-chat-queue-transfer ar-hidden";
   transferButton.innerHTML = `<i class="fas fa-up-right-from-square"></i>`;
   transferButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.queueTransferTooltip`);
   queueBox.append(transferButton);

   // (Event listeners for hover, shift, etc. remain unchanged)
   let isElementHovered = false;
   new_request_element.addEventListener("mouseover", (e) => {
      isElementHovered = true;
      if (e.shiftKey) {
         transferButton.classList.toggle("ar-hidden", false);
         queueBox.querySelectorAll(".ar-request-container-chat").forEach((el) => {
            el.classList.toggle("ar-hidden", true);
         });
      }
   });
   new_request_element.addEventListener("mouseout", (e) => {
      isElementHovered = false;
      transferButton.classList.toggle("ar-hidden", true);
      queueBox.querySelectorAll(".ar-request-container-chat").forEach((el) => {
         el.classList.toggle("ar-hidden", false);
      });
   });
   document.addEventListener("keydown", (e) => {
      if ((e.code == "ShiftLeft" || e.code == "ShiftRight") && isElementHovered) {
         transferButton.classList.toggle("ar-hidden", false);
         queueBox.querySelectorAll(".ar-request-container-chat").forEach((el) => {
            el.classList.toggle("ar-hidden", true);
         });
      }
   });
   document.addEventListener("keyup", (e) => {
      if ((e.code == "ShiftLeft" || e.code == "ShiftRight") && isElementHovered) {
         transferButton.classList.toggle("ar-hidden", true);
         queueBox.querySelectorAll(".ar-request-container-chat").forEach((el) => {
            el.classList.toggle("ar-hidden", false);
         });
      }
   });
   transferButton.addEventListener("click", async () => {
      if (window.SimpleRequestsApp) {
         window.SimpleRequestsApp._render(true);
      }
      document.getElementById("simple-requests-chat-body").style.display = "none";
   });

   new_request_element.append(queueBox);

   // Request buttons
   const buttonDiv = document.createElement("div");
   buttonDiv.classList.add("ar-chat-buttons");
   ["first", "second", "third"].forEach((reqLevel, i) => {
      const button = document.createElement('div');
      button.className = `ar-chat-button ar-level-${i}`;
      button.innerHTML = `<i class="fa-${i == 0 ? "regular" : "solid"} fa-hand${i == 2 ? "-sparkles" : ""} ar-request-icon"></i>`;
      button.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.${reqLevel}RequestTooltip`);
      
      button.onclick = async (event) => {
         event.preventDefault();
         const requestData = {
            userId: game.user.id,
            name: game.user.name,
            img: game.user.avatar,
            level: i
         };
         await window.simpleRequests.createRequest(requestData);
      };
      buttonDiv.append(button);
   });
   new_request_element.append(buttonDiv);

   return new_request_element;
}

let moveAdvRequestsDashTimeout;
async function moveAdvRequestsDashImpl() {
   log_socket("moveAdvRequestsDash called by", game.user.name);
   log_socket("current queue", CONFIG.ADV_REQUESTS.queue);
   let chatInput = getChatInput();

   // TODO don't render if chat is closed
   removeAllDash();
   // const dash = await renderAdvRequestsDash();
   const dash = await renderSimpleRequestsQueue();
   if (!dash) return; // Prevent errors if dash is undefined
   dash.id = "adv-requests-dash";
   CONFIG.ADV_REQUESTS.element = dash;

   if (!chatInput) {
      // we may be on v12
      // class="simple-requests-chat-body"
      const chatControls = getChatControlsContainer();
      if(!chatControls){
         if (CONFIG.ADV_REQUESTS.element?.parentNode) CONFIG.ADV_REQUESTS.element.parentNode.removeChild(CONFIG.ADV_REQUESTS.element);
         return;
      }
      chatControls.prepend(dash);
      return;
   }

   // Insert BEFORE the chat input
   chatInput.parentNode.insertBefore(dash, chatInput);
}

function moveAdvRequestsDash(...args) {
   if (moveAdvRequestsDashTimeout) clearTimeout(moveAdvRequestsDashTimeout);
   moveAdvRequestsDashTimeout = setTimeout(() => {
      moveAdvRequestsDashImpl.apply(this, args);
   }, 500);
}

// Wrapper functions for async moveAdvRequestsDash in hooks
const moveAdvRequestsDashWrapper = () => Promise.resolve(moveAdvRequestsDash()).catch(console.error);

Hooks.once("renderChatLog", moveAdvRequestsDashWrapper);
Hooks.on("closeChatLog", moveAdvRequestsDashWrapper);
Hooks.on("activateChatLog", moveAdvRequestsDashWrapper);
Hooks.on("deactivateChatLog", moveAdvRequestsDashWrapper);
// Function collapseSidebar
// collapseSidebar(sidebar: Sidebar, collapsed: boolean): 
Hooks.on("collapseSidebar", moveAdvRequestsDashWrapper);

// Utility to show a fullscreen epic prompt
// WIP, should allow themeing per each system! 
function _showEpicPrompt(data) {
   const name = data.name || "Player";
   const img = data.img || "icons/svg/mystery-man.svg";
   const level = typeof data.level === "number" ? data.level : 0;
   // Remove any existing prompt
   document.querySelectorAll('#ar-epic-prompt').forEach(el => el.remove());
   // Create overlay
   const overlay = document.createElement('div');
   overlay.id = 'ar-epic-prompt';
   overlay.className = 'ar-epic-prompt-overlay';
   // Overlay image for request level
   const overlayImgSrc = `modules/simple-requests/assets/request${level}.webp`;
   overlay.innerHTML = `
      <div class="epic-prompt-container" style="background: rgba(30,30,30,0.9); border-radius: 2em; padding: 2em; box-shadow: 0 0 40px #000; text-align: center; min-width: 320px; position: relative;">
         <img src="${img}" alt="${name}" style="width: 160px; height: 160px; border-radius: 50%; object-fit: cover; margin-bottom: 1em; border: 4px solid #fff; box-shadow: 0 0 20px #000;">
         <img class="simple-requests-img ar-level-${data.level}" src="${overlayImgSrc}" alt="Request Level" style="position: absolute; top: 30px; left: 40%; transform: translateX(-50%); width: 80px; height: 80px; pointer-events: none; opacity: 0.85;">
         <h1 style="color: #fff; font-size: 2.5em; margin: 0;">${name} has the floor</h1>
      </div>
   `;
   // Remove on click or after 5 seconds
   overlay.addEventListener('click', () => overlay.remove());
   setTimeout(() => overlay.remove(), 50000);
   document.body.appendChild(overlay);
}

// Remove any existing dash to avoid duplicates
function removeAllDash() {
   document.querySelectorAll(".adv-requests-dash").forEach(el => el.remove());
   document.querySelectorAll("#adv-requests-dash").forEach(el => el.remove());
}

function playSound(volume = 0.8, src = "modules/simple-requests/assets/request0.ogg") {
   foundry.audio.AudioHelper.play({
      src,
      volume,
      autoplay: true,
      loop: false
   });
}

// ===== VERSION 12 SPECIFIC CODE =====

// Version 12 hooks initialization
function initV12Hooks() {
   // Settings update hook for v12
   Hooks.on("updateSetting", async (setting, value, options, userId) => {
      if (setting.key !== `${C.ID}.queue`) return;
      const queueEls = document.querySelectorAll(".ar-chat-queue");
      const queue = setting.value;
      const changes = options.changes || [];
      
      if (changes.includes("addRequest")) {
         const queueItemData = queue.find((item) => item.id == options.reqId);
         if (!queueItemData) return;
         queueEls.forEach((queueEl) => {
            const existingEls = queueEl.querySelectorAll(`[data-id="${options.reqId}"]`);
            existingEls.forEach(el => el.remove());
            const requestEl = getV12RequestElement(queueItemData);
            const index = queue.findIndex((item) => item.id == queueItemData.id);
            const prevEl = queueEl.children[index];
            if (prevEl) {
               queueEl.insertBefore(requestEl, prevEl);
            } else {
               queueEl.append(requestEl);
            }
         });
         
         if (game.settings.get(C.ID, "soundCreate") && changes.includes("playSound")) {
            let volume = game.settings.get(C.ID, "useFoundryInterfaceVolume") ? 
               game.settings.get("core", "globalInterfaceVolume") : 
               game.settings.get(C.ID, "soundCreateVolume") * 0.01;
            if (queueItemData.level == 2) volume *= 1.9;
            AudioHelper.play({
               src: `modules/${C.ID}/assets/request${queueItemData.level}.wav`,
               volume: volume,
            });
         }
      }
      
      if (changes.includes("deleteRequest")) {
         queueEls.forEach((queueEl) => {
            const el = queueEl.querySelector(`[data-id="${options.reqId}"]`);
            if (el) queueEl.removeChild(el);
         });
         
         const soundActivate = game.settings.get(C.ID, "soundActivate") && changes.includes("playSound");
         if (soundActivate) {
            const reqClickSound = game.settings.get(C.ID, "reqClickSound");
            if (reqClickSound && await srcExists(reqClickSound)) {
               const volume = game.settings.get(C.ID, "useFoundryInterfaceVolume") ? 
                  game.settings.get("core", "globalInterfaceVolume") : 
                  game.settings.get(C.ID, "soundActivateVolume") * 0.01;
               AudioHelper.play({
                  src: reqClickSound,
                  volume: volume,
               });
            } else {
               ui.notifications.warn(game.i18n.localize(`${C.ID}.errors.noReqClickSound`) + " — " + reqClickSound);
            }
         }
      }
      
      if (window.SimpleRequestsApp) {
         window.SimpleRequestsApp._render();
      }
   });
}

// Version 12 helper functions
function getV12RequestElement(item) {
   const containerEl = document.createElement('div');
   containerEl.className = `ar-request-container-chat ar-level-${item.level}`;
   containerEl.dataset.id = item.id;
   containerEl.dataset.tooltip = item.name;
   addV12RequestListener(containerEl);
   
   const tokenImgEl = document.createElement('img');
   tokenImgEl.src = item.img;
   containerEl.append(tokenImgEl);
   
   const warningEl = document.createElement('div');
   warningEl.className = `ar-queue-warning ar-level-${item.level}`;
   warningEl.innerHTML = `<img src="modules/${C.ID}/assets/request${item.level}.webp"/>`;
   containerEl.append(warningEl);
   
   return containerEl;
}

function addV12RequestListener(element, reRender = false) {
   const elId = element?.dataset?.id;
   if (!game.user.isGM && game.user.id != elId) return;
   
   element?.addEventListener('contextmenu', async () => {
      window.simpleRequests.removeRequest(element?.dataset?.id);
   });
   
   element?.addEventListener('click', async () => {
      const isGM = game.user.isGM;
      if (isGM) {
         // TODO modify gm_callout_top_request allow calling out non-top requiest if one passed in
         window.simpleRequests.gm_callout_top_request();
      }
   });
   
   if (reRender && window.SimpleRequestsApp) {
      window.SimpleRequestsApp._render(true);
   }
}

function getV12RequestData(reqLevel = 0, useForRequests) {
   let data = {
      level: reqLevel,
      id: game.user.id
   };
   
   const _actor = game.actors.get(game.settings.get(C.ID, "selectedActorId"));
   const _controlled = canvas.tokens.controlled[0];
   
   switch (useForRequests) {
   case "token":
      data.img = _actor?.prototypeToken?.texture?.src;
      data.name = _actor?.prototypeToken?.name;
      break;
   case "actor":
      data.img = _actor?.img;
      data.name = _actor?.name;
      break;
   case "playerToken":
      data.img = game.user.character?.prototypeToken?.texture?.src;
      data.name = game.user.character?.prototypeToken?.name;
      break;
   case "playerActor":
      data.img = game.user.character?.img;
      data.name = game.user.character?.name;
      break;
   case "user":
      data.img = game.user.avatar;
      data.name = game.user.name;
      break;
   case "custom":
      data.img = game.settings.get(C.ID, "customImage");
      data.name = game.settings.get(C.ID, "customName");
      break;
   case "controlled":
      data.img = _controlled?.document?.texture?.src;
      data.name = _controlled?.document?.name;
      break;
   default:
      data.img = game.user.avatar;
      data.name = game.user.name;
      break;
   }

   data.img = data.img || default_img;

   return data;
}

// Helper function to check if source exists (for v12 compatibility)
async function srcExists(src) {
   return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
   });
}

// Export getRequestData function for use in other modules
export function getRequestData(reqLevel = 0, useForRequests) {
   let data = {
      level: reqLevel,
      id: game.user.id
   };
   
   const _actor = game.actors.get(game.settings.get(C.ID, "selectedActorId"));
   const _controlled = canvas.tokens.controlled[0];
   
   switch (useForRequests) {
   case "token":
      data.img = _actor?.prototypeToken?.texture?.src;
      data.name = _actor?.prototypeToken?.name;
      break;
   case "actor":
      data.img = _actor?.img;
      data.name = _actor?.name;
      break;
   case "playerToken":
      data.img = game.user.character?.prototypeToken?.texture?.src;
      data.name = game.user.character?.prototypeToken?.name;
      break;
   case "playerActor":
      data.img = game.user.character?.img;
      data.name = game.user.character?.name;
      break;
   case "user":
      data.img = game.user.avatar;
      data.name = game.user.name;
      break;
   case "custom":
      data.img = game.settings.get(C.ID, "customImage");
      data.name = game.settings.get(C.ID, "customName");
      break;
   case "controlled":
      data.img = _controlled?.document?.texture?.src;
      data.name = _controlled?.document?.name;
      break;
   default:
      data.img = game.user.avatar;
      data.name = game.user.name;
      break;
   }
   
   data.img = data.img || default_img;
   data.name = data.name || "";
   return data;
}

function getChatControlsContainer() {
  // Try v13+ selector first
  let el = document.querySelector('.chat-controls');
  if (el) return el;
  // Fallback to v12 selector
  return document.querySelector('#chat-controls');
}

function getChatInput() {
  // Try v13+ selector first
  let el = document.querySelector('.chat-message-form');
  if (el) return el;
  // Fallback to v12 selector
  return document.querySelector('#chat-message.chat-input');
}
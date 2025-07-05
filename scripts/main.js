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
if (game.version && game.version.startsWith("12")) {
   init = () => {
      // initialize things for version 12
      console.log("Simple Requests: Initializing for Foundry VTT v12");
      initV12();
   };
}

init();

// Version 12 specific functionality
function initV12() {
   // Initialize version 12 specific hooks and functionality
   initV12Hooks();
   initV12App();
}

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
//    there should only be one request per user
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
      this.socket.register("createRequest", this._createRequest.bind(this));
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
      await moveAdvRequestsDash();
      // Send to all other clients
      this.socket.executeForOthers("addRequest", requestData);
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

// Remove SimpleRequestsApp and ApplicationV2 usage for now
// let SimpleRequestsApp;
// Hooks.once('init', function() {
//   SimpleRequestsApp = class SimpleRequestsApp extends ApplicationV2 {
//     ...
//   }
//   window.SimpleRequestsApp = SimpleRequestsApp;
//   Hooks.once('ready', () => {
//     SimpleRequestsApp.activate();
//   });
// });

// Hooks.on("updateSetting", async (setting, value, _options, userId) => {
//     if (setting.key == `visual-novel-dialogues.simpleRequestsSync`) {
//         await game.settings.set(C.ID, 'visualNovelSync', value.key)
//     }
// })

async function renderAdvRequestsDash() {
   // Prepare data for template
   const queue = get_requests_LOCAL_QUEUE();
   const chatElement = document.getElementById("chat");
   const sidebarContent = document.getElementById("sidebar-content");
   const isChatVisible = chatElement && chatElement.offsetParent !== null;
   const isSidebarExpanded = sidebarContent && sidebarContent.classList.contains("expanded");
   
   const templateData = {
      queue: queue,
      showButtons: isChatVisible && isSidebarExpanded,
      isGM: game.user.isGM,
      getLevelName: (level) => ["Common", "Important", "Urgent", "test"][level] || "Unknown"
   };
   
   // Render template
   let template;
   try {
      template = await renderTemplate(`modules/${C.ID}/templates/simple-requests-dashboard.hbs`, templateData);
   } catch (error) {
      console.warn("Simple Requests: Template not found, falling back to manual DOM creation", error);
      // Fallback to manual DOM creation
      return renderAdvRequestsDashFallback();
   }
   const tempDiv = document.createElement('div');
   tempDiv.innerHTML = template;
   const dash = tempDiv.firstElementChild;
   
   // Add event listeners
   dash.querySelectorAll('.adv-request-chip').forEach(chip => {
      const userId = chip.dataset.userId;
      const req = queue.find(r => r.userId === userId);
      
      if (game.user.isGM) {
         chip.onclick = async (event) => {
            event.preventDefault();
            // GM can pop the oldest, most urgent request
            await window.simpleRequests.gm_callout_top_request();
            await moveAdvRequestsDash();
         };
         chip.oncontextmenu = async (event) => {
            event.preventDefault();
            await window.simpleRequests.removeRequest(userId);
         };
      } else if (userId === game.user.id) {
         chip.onclick = async (event) => {
            event.preventDefault();
            await window.simpleRequests.removeRequest(game.user.id);
         };
      }
   });
   
   // Add button event listeners
   dash.querySelectorAll('.pop-oldest-btn').forEach(btn => {
      btn.onclick = async (event) => {
         event.preventDefault();
         await window.simpleRequests.gm_callout_top_request();
         await moveAdvRequestsDash();
      };
   });
   
   dash.querySelectorAll('.request-btn').forEach(btn => {
      btn.onclick = async (event) => {
         event.preventDefault();
         const level = parseInt(btn.dataset.level);
         const requestData = {
            userId: game.user.id,
            name: game.user.name,
            img: game.user.avatar,
            level
         };
         await window.simpleRequests.createRequest(requestData);
      };
   });
   
   return dash;
}

// Fallback function for manual DOM creation if template fails
function renderAdvRequestsDashFallback() {
   const dash = document.createElement("section");
   dash.className = "adv-requests-dash flexcol";

   // Queue display
   const queueRow = document.createElement("div");
   queueRow.className = "adv-requests-queue flexrow";
   for (const req of get_requests_LOCAL_QUEUE()) {
      const chip = document.createElement("div");
      chip.className = `adv-request-chip ar-text-level-${req.level}`;
      chip.title = `${req.name} (${["Common", "Important", "Urgent", "test"][req.level]})`;
      chip.innerHTML = `<img class="ar-queue-warning ar-level-${req.level}" src="${req.img || "icons/svg/mystery-man.svg"}" style="width:24px;height:24px;border-radius:50%;"> ${req.name}`;
      // Remove on click (if own or GM)
      if (game.user.isGM) {
         chip.onclick = async (event) => {
            event.preventDefault();
            // GM can pop the oldest, most urgent request
            await window.simpleRequests.gm_callout_top_request();
            await moveAdvRequestsDash();
         };
         chip.oncontextmenu = async (event) => {
            event.preventDefault();
            await window.simpleRequests.removeRequest(req.userId);
         };
      } else if (req.userId === game.user.id) {
         chip.onclick = async (event) => {
            event.preventDefault();
            await window.simpleRequests.removeRequest(game.user.id);
         };
      }
      queueRow.appendChild(chip);
   }
   dash.appendChild(queueRow);

   // Add request buttons only if chat is visible and #sidebar-content is expanded
   const chatElement = document.getElementById("chat");
   const sidebarContent = document.getElementById("sidebar-content");
   const isChatVisible = chatElement && chatElement.offsetParent !== null;
   const isSidebarExpanded = sidebarContent && sidebarContent.classList.contains("expanded");
   if (isChatVisible && isSidebarExpanded) {
      // Add request buttons
      const btnRow = document.createElement("div");
      btnRow.className = "adv-requests-buttons flexrow";
      // GM-only button to pop oldest & most urgent
      if (game.user.isGM) {
         const popBtn = document.createElement("button");
         popBtn.type = "button";
         popBtn.textContent = "Pop Oldest/Urgent";
         popBtn.onclick = async (event) => {
            event.preventDefault();
            await window.simpleRequests.gm_callout_top_request();
            await moveAdvRequestsDash();
         };
         btnRow.appendChild(popBtn);
      }
      ["Common", "Important", "Urgent"].forEach((label, level) => {
         const btn = document.createElement("button");
         btn.type = "button";
         btn.textContent = label;
         btn.onclick = async (event) => {
            event.preventDefault();
            const requestData = {
               userId: game.user.id,
               name: game.user.name,
               img: game.user.avatar,
               level
            };
            await window.simpleRequests.createRequest(requestData);
         };
         btnRow.appendChild(btn);
      });
      dash.appendChild(btnRow);
   }

   return dash;
}

async function moveAdvRequestsDash() {
   log_socket("moveAdvRequestsDash called by", game.user.name);
   log_socket("current queue", CONFIG.ADV_REQUESTS.queue);
   const chatInput = document.querySelector("#chat-message.chat-input");
   if (!chatInput) {
      if (CONFIG.ADV_REQUESTS.element?.parentNode) CONFIG.ADV_REQUESTS.element.parentNode.removeChild(CONFIG.ADV_REQUESTS.element);
      return;
   }
   removeAllDash();
   const dash = await renderAdvRequestsDash();
   dash.id = "adv-requests-dash";
   CONFIG.ADV_REQUESTS.element = dash;
   // Insert BEFORE the chat input
   chatInput.parentNode.insertBefore(dash, chatInput);
}

// Wrapper functions for async moveAdvRequestsDash in hooks
const moveAdvRequestsDashWrapper = () => moveAdvRequestsDash().catch(console.error);

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
         <img src="${overlayImgSrc}" alt="Request Level" style="position: absolute; top: 30px; left: 50%; transform: translateX(-50%); width: 80px; height: 80px; pointer-events: none; opacity: 0.85;">
         <h1 style="color: #fff; font-size: 2.5em; margin: 0;">${name} has the floor</h1>
      </div>
   `;
   // Remove on click or after 5 seconds
   overlay.addEventListener('click', () => overlay.remove());
   setTimeout(() => overlay.remove(), 5000);
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
   // Render requests in chat sidebar (v12 style)
   Hooks.on("renderSidebarTab", (app, html, data) => {
      if (app.tabName !== "chat") return;
      const div = document.createElement("div");
      div.classList.add("simple-requests-chat-body");
      if (game.settings.get(C.ID, "requestsPosition") != "chat") div.style.display = "none";
      div.id = "simple-requests-chat-body";
      const height = game.settings.get(C.ID, "chatQueueHeight") + "px";
      div.style.minHeight = height;
      div.style.maxHeight = height;
      
      // Queue display
      const queueBox = document.createElement("div");
      queueBox.classList.add("ar-chat-queue");
      queueBox.id = "ar-chat-queue";
      const queue = getV12Queue();
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
      
      let isElementHovered = false;
      div.addEventListener("mouseover", (e) => {
         isElementHovered = true;
         if (e.shiftKey) {
            transferButton.classList.toggle("ar-hidden", false);
            queueBox.querySelectorAll(".ar-request-container-chat").forEach((el) => {
               el.classList.toggle("ar-hidden", true);
            });
         }
      });
      
      div.addEventListener("mouseout", (e) => {
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
         await game.settings.set(C.ID, "requestsPosition", "freeScreen");
         if (window.SimpleRequestsApp) {
            window.SimpleRequestsApp._render(true);
         }
         document.getElementById("simple-requests-chat-body").style.display = "none";
      });
      
      queueBox.append(transferButton);
      div.append(queueBox);
      
      // Request buttons
      const buttonDiv = document.createElement("div");
      buttonDiv.classList.add("ar-chat-buttons");
      ["first", "second", "third"].forEach((reqLevel, i) => {
         if (!game.settings.get(C.ID, `${reqLevel}Request`)) return;
         const button = document.createElement('div');
         button.className = `ar-chat-button ar-level-${i}`;
         button.innerHTML = `<i class="fa-${i == 0 ? "regular" : "solid"} fa-hand${i == 2 ? "-sparkles" : ""} ar-request-icon"></i>`;
         button.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.${reqLevel}RequestTooltip`);
         button.addEventListener("click", async () => {
            await addV12Request(i);
         });
         buttonDiv.append(button);
      });
      div.append(buttonDiv);
      html[0].querySelector("#chat-controls").prepend(div);
   });

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

   // Socket setup for v12
   Hooks.on('setup', () => {
      game.socket.on(`module.${C.ID}`, async ({ type, settingData, options }) => {
         if (game.user.isGM) {
            switch (type) {
               case 'queue':
                  await game.settings.set(C.ID, 'queue', settingData, options);
                  break;
               default:
                  break;
            }
         }
      });
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

function getV12Queue() {
   return foundry.utils.deepClone(game.settings.get(C.ID, "queue") || []);
}

function addV12RequestListener(element, reRender = false) {
   const elId = element?.dataset?.id;
   if (!game.user.isGM && game.user.id != elId) return;
   
   element?.addEventListener('contextmenu', async () => {
      await deleteV12Request(elId, reRender);
   });
   
   element?.addEventListener('click', async () => {
      const isGM = game.user.isGM;
      if (isGM) {
         const messageActivate = game.settings.get(C.ID, "messageActivate");
         if (messageActivate) {
            const _user = game.users.find(u=>u.isGM) || game.user;
            ChatMessage.create({
               user: _user.id,
               speaker: {alias: _user.name},
               content: game.i18n.localize(`${C.ID}.chatMessage.activateRequest1`) + 
                       game.users.find(u=>u.id == elId)?.name + 
                       game.i18n.localize(`${C.ID}.chatMessage.activateRequest2`)
            });
         }
      }
      await deleteV12Request(elId, reRender, isGM);
   });
   
   if (reRender && window.SimpleRequestsApp) {
      window.SimpleRequestsApp._render(true);
   }
}

async function addV12Request(reqLevel, reRender = false) {
   const useForRequests = game.settings.get(C.ID, "useForRequests");
   const data = getV12RequestData(reqLevel, useForRequests);

   const defaultUserImg = "icons/svg/mystery-man.svg";
   const defaultImg = useForRequests == "user" ? defaultUserImg : 
                     Actor.implementation.getDefaultArtwork({type: "someActorType"}).img;

   const hasImage = (data.img && data.img != defaultImg && await srcExists(defaultImg));

   if (hasImage) {
      const queue = getV12Queue();
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
      if (reRender && window.SimpleRequestsApp) {
         window.SimpleRequestsApp._render(true);
      }
   } else if (useForRequests == "controlled") {
      ui.notifications.warn(game.i18n.localize(`${C.ID}.errors.noControlledTokens`));
   } else {
      // use default image when no valid image is found
      const queue = getV12Queue();
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
      if (reRender && window.SimpleRequestsApp) {
         window.SimpleRequestsApp._render(true);
      }
   }
}

async function deleteV12Request(id, reRender = false, playSound = false) {
   const queue = getV12Queue();
   queue.splice(queue.findIndex(item => item.id === id), 1);
   const options = {changes: ['deleteRequest'], reqId: id};
   if (playSound) options.changes.push("playSound");
   
   if (game.user.isGM) {
      await game.settings.set(C.ID, 'queue', queue, options);
   } else {
      game.socket.emit(`module.${C.ID}`, {
         type: 'queue',
         settingData: queue,
         options
      });
   }
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
   data.name = data.name || "";
   return data;
}

// Version 12 App initialization
function initV12App() {
   // Initialize the SimpleRequestsApp for v12
   if (typeof FormApplication !== 'undefined') {
      window.SimpleRequestsApp = class SimpleRequestsApp extends FormApplication {
         static instance = null;
         
         constructor() {
            super();
         }
         
         static get defaultOptions() {
            const defaults = super.defaultOptions;
            const overrides = {
               popOut: false,
               classes: ['simple-requests-app'],
               width: '100%',
               height: '100%',
               resizable: false,
               editable: false,
               id: "SimpleRequestsApp",
               template: `modules/${C.ID}/templates/simple-requests.hbs`,
               title: `Simple Requests`,
               userId: game.userId,
               closeOnSubmit: false,
               submitOnChange: false,
            };
            return foundry.utils.mergeObject(defaults, overrides);
         }

         getData(options) {
            const data = {
               queue: game.settings.get(C.ID, "queue"),
               show: (game.settings.get(C.ID, "requestsPosition") == "freeScreen"),
               firstRequest: game.settings.get(C.ID, "firstRequest"),
               secondRequest: game.settings.get(C.ID, "secondRequest"),
               thirdRequest: game.settings.get(C.ID, "thirdRequest"),
               widthDependOnQueue: game.settings.get(C.ID, "widthDependOnQueue"),
            };

            let freeScreenData = game.settings.get(C.ID, "freeScreenData");
            const freeScreenDataTemplate = {
               _x: 30, 
               _y: 10, 
               _w: 250, 
               _h: game.settings.get(C.ID, "chatQueueHeight"), 
               _z: game.settings.get(C.ID, "freeScreenZIndex")
            };
            freeScreenData = foundry.utils.mergeObject(freeScreenData, freeScreenDataTemplate, {overwrite: false});
            freeScreenData._w = data.widthDependOnQueue ? "fit-content" : `${freeScreenData._w}px`;
            
            return { ...data, ...freeScreenData };
         }

         static activate() {
            this.instance = new SimpleRequestsApp();
            this.instance.render(true);
         }

         static _render() {
            if (this.instance) {
               this.instance.render(true);
            }
         }

         activateListeners(html) {
            super.activateListeners(html);

            // Move functionality
            const grabEl = html[0].querySelector(".ar-freeScreen-mover");
            const requestsWindow = html[0];
            let isDragging = false;
            let startX, startY, initialX, initialY;
            
            if (grabEl) {
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
            }

            function onMouseMove(e) {
               if (!isDragging) return;
               const dx = (e.clientX - startX) / window.innerWidth * 100;
               const dy = (e.clientY - startY) / window.innerHeight * 100;
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
                  requestsWindow.style.right = `${(initialX - dx)}%`;
               }
            }

            async function onMouseUp() {
               isDragging = false;
               if (grabEl) grabEl.style.cursor = 'grab';
               document.removeEventListener('mousemove', onMouseMove);
               document.removeEventListener('mouseup', onMouseUp);
               
               let _data = game.settings.get(C.ID, "freeScreenData");
               _data._x = parseFloat(requestsWindow.style.right) || 0;
               _data._y = parseFloat(requestsWindow.style.top) || 0;
               await game.settings.set(C.ID, "freeScreenData", _data);
            }

            // Transfer to chat button
            const transferToChatBtn = html[0].querySelector(".ar-window-to-chat");
            if (transferToChatBtn) {
               transferToChatBtn.addEventListener("click", async () => {
                  await game.settings.set(C.ID, "requestsPosition", "chat");
                  SimpleRequestsApp._render();
                  const chatBody = document.getElementById("simple-requests-chat-body");
                  if (chatBody) chatBody.style.display = null;
               });
            }

            // Request elements
            const requestEls = html[0].querySelectorAll(".ar-request-container-freeScreen");
            requestEls.forEach((el) => {
               addV12RequestListener(el, true);
            });

            // Add request buttons
            const addReqButtons = html[0].querySelectorAll(".ar-freeScreen-button");
            addReqButtons.forEach((el) => {
               el.addEventListener("click", async () => {
                  await addV12Request(parseInt(el.dataset.level), true);
               });
            });

            // Resize functionality
            const resizeEl = html[0].querySelector(".ar-resizable-handle");
            const queueEl = requestsWindow.querySelector(".ar-freeScreen-queue");
            
            if (resizeEl && queueEl) {
               let isResizing = false;
               let startW, startH, initialW, initialH;
               let widthDependOnQueue;
               
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
                  const dw = (e.clientX - startW);
                  const dh = (e.clientY - startH);
                  const shiftPressed = e.shiftKey;
                  
                  if (shiftPressed) {
                     if (Math.abs(dw) > Math.abs(dh)) {
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
         }

         async _updateObject(event, formData) {
            // No form submission needed
         }
      };

      // Activate the app
      Hooks.once('ready', () => {
         SimpleRequestsApp.activate();
      });
   }
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
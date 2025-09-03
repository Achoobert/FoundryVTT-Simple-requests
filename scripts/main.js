import { Constants as C } from "./const.js";
const default_img = "icons/magic/control/debuff-energy-hold-blue-yellow.webp" // TODO link better

// Ensure CONFIG.ADV_REQUESTS and queue are always initialized
if (!window.CONFIG) window.CONFIG = {};
if (!CONFIG.ADV_REQUESTS) CONFIG.ADV_REQUESTS = {};
if (!Array.isArray(CONFIG.ADV_REQUESTS.queue)) CONFIG.ADV_REQUESTS.queue = [];

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
         if (window.SimplePrompts && typeof window.SimplePrompts.syncQueueToOthers === "function") {
            window.SimplePrompts.syncQueueToOthers();
         }
      }
   }
});

// --- SocketLib integration ---

class SimplePromptsManager {
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
   
   // get list of all currently active players, and create requests on their behalf
   async createSocialInitiative() {
      // TODO offer an option to randomize this
      const Active_Users = game.users.players.filter((user) => user.active == true);
      Active_Users.forEach(user => {
         window.SimplePrompts.createRequest({
            userId: user.id,
            name: user.name,
            img: user.avatar,
            level: 0
         })
      });
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
            playSound(soundSrc);
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
      playSound(sound);
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
   window.SimplePrompts = new SimplePromptsManager();
   window.SimplePrompts.socket.register("showEpicPrompt", async (data) => {
      remove_request_LOCAL_QUEUE(data.userId);
      // update UI
      await moveAdvRequestsDash();
      _showEpicPrompt(data);
   });
});

async function renderSimplePromptsQueue() {
   // Get the chat controls container
   // ? why? 
   const chatControls = getChatControlsContainer();
   if (!chatControls) return;

   // Create the main container section
   const new_request_element = document.createElement("section");
   new_request_element.id = "simple-requests-chat-body";
   new_request_element.classList.add("simple-requests-chat-body");

   // Queue display
   const queueBox = document.createElement("div");
   queueBox.classList.add("ar-chat-queue");
   queueBox.id = "ar-chat-queue";
   const queue = get_requests_LOCAL_QUEUE();
   queue.forEach((item) => {
      const containerEl = getRequestElement(item);
      queueBox.append(containerEl);
   });

   // force queue of all players button
   const queueAllMenuButton = document.createElement("div");
   queueAllMenuButton.classList.add("queueAll-button");
   queueAllMenuButton.innerHTML = `<i class="fas fa-list"></i>`;
   queueAllMenuButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.queueAllMenuTooltip`);
   queueBox.append(queueAllMenuButton);

   if (game.user.isGM) {
      queueAllMenuButton.addEventListener("click", () => {
         window.SimplePrompts.createSocialInitiative();
      })
   }

   // Requests menu button
   // const requestsMenuButton = document.createElement("div");
   // requestsMenuButton.classList.add("ar-chat-requests-menu");
   // requestsMenuButton.innerHTML = `<i class="fas fa-gear"></i>`;
   // requestsMenuButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.requestsMenuTooltip`);
   // queueBox.append(requestsMenuButton);

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
      if (window.SimplePromptsApp) {
         window.SimplePromptsApp._render(true);
      }
      document.getElementById("simple-requests-chat-body").style.display = "none";
   });

   new_request_element.append(queueBox);

   // Request buttons
   const buttonDiv = document.createElement("div");
   buttonDiv.classList.add("ar-chat-buttons");
   ["first", "second", "third"].forEach((reqLevel, i) => {
      const button = document.createElement('div');
      button.className = `ar-chat-button {i}`;
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
         await window.SimplePrompts.createRequest(requestData);
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

   // TODO don't render if chat is closed on v12
   removeAllDash();
   const dash = await renderSimplePromptsQueue();
   if (!dash) return; // Prevent errors if simple-requests-chat-body is undefined
   CONFIG.ADV_REQUESTS.element = dash;

   if (!chatInput) {
      const chatControls = getChatControlsContainer();
      if(!chatControls){
         if (CONFIG.ADV_REQUESTS.element?.parentNode) CONFIG.ADV_REQUESTS.element.parentNode.removeChild(CONFIG.ADV_REQUESTS.element);
         return;
      }
      chatControls.prepend(dash);
      return;
   }
   chatInput.parentNode.insertBefore(dash, chatInput);
}

function moveAdvRequestsDash(...args) {
   if (moveAdvRequestsDashTimeout) clearTimeout(moveAdvRequestsDashTimeout);
   moveAdvRequestsDashTimeout = setTimeout(() => {
      moveAdvRequestsDashImpl.apply(this, args);
   }, 100);
}

// Wrapper functions for async moveAdvRequestsDash in hooks
const moveAdvRequestsDashWrapper = () => Promise.resolve(moveAdvRequestsDash()).catch(console.error);

Hooks.once("renderChatLog", moveAdvRequestsDashWrapper);
Hooks.on("closeChatLog", moveAdvRequestsDashWrapper);
Hooks.on("activateChatLog", moveAdvRequestsDashWrapper);
Hooks.on("deactivateChatLog", moveAdvRequestsDashWrapper);
// Function collapseSidebar
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
      <div class="epic-prompt-container">
         <img class="prompt-img ar-img-level-${data.level}" src="${img}" alt="${name}" >
         <img class="epic-prompt-warning ar-level-${data.level}" src="${overlayImgSrc}" alt="Request Level">
         <h1 class="epic-prompt-name" >${name} has the floor</h1>
      </div>
   `;
   _promptShowSound()
   // we'll remove onclick, or after 5 seconds
   overlay.addEventListener('click', () => overlay.remove());
   setTimeout(() => overlay.remove(), 5000);
   document.body.appendChild(overlay);
}
function _promptShowSound() {
   if (!game.settings.get("simple-requests", "soundOnPromptActivate")) return;
   // Get the file path from settings, or use the default
   const sound = game.settings.get("simple-requests", "promptShowSound") || "modules/simple-requests/assets/samples/fingerSnapping.ogg";
   playSound(sound);
}

// Remove any existing dash to avoid duplicates
function removeAllDash() {
   document.querySelectorAll(".simple-requests-chat-body").forEach(el => el.remove());
   document.querySelectorAll("#simple-requests-chat-body").forEach(el => el.remove());
}

function playSound(src = "modules/simple-requests/assets/request0.ogg") {
   const volume = game.settings.get("core", "globalInterfaceVolume");
   foundry.audio.AudioHelper.play({
      src,
      volume,
      autoplay: true,
      loop: false
   });
}

function getRequestElement(item) {
   const containerEl = document.createElement('div');
   containerEl.className = `ar-request-container-chat ar-level-${item.level}`;
   containerEl.dataset.id = item.userId;
   containerEl.dataset.tooltip = item.name;
   addRequestListener(containerEl);
   
   const tokenImgEl = document.createElement('img');
   tokenImgEl.src = item.img;
   containerEl.append(tokenImgEl);
   
   const warningEl = document.createElement('div');
   warningEl.className = `ar-queue-warning ar-level-${item.level}`;
   warningEl.innerHTML = `<img src="modules/${C.ID}/assets/request${item.level}.webp"/>`;
   containerEl.append(warningEl);
   
   return containerEl;
}

function addRequestListener(element, reRender = false) {
   const elId = element?.dataset?.id;
   if (!game.user.isGM && game.user.id != elId) return;
   
   element?.addEventListener('contextmenu', async () => {
      window.SimplePrompts.removeRequest(element?.dataset?.id);
   });
   
   element?.addEventListener('click', async () => {
      if (game.user.isGM) {
         // TODO modify gm_callout_top_request allow calling out non-top requiest if one passed in
         window.SimplePrompts.gm_callout_top_request();
      }
   });
   
   if (reRender && window.SimplePromptsApp) {
      window.SimplePromptsApp._render(true);
   }
}

function getChatControlsContainer() {
   // Try v13+ selector first
   let el = document.querySelector('.chat-controls');
   if (el) return el;
   // Fallback to v12 selector
   return document.querySelector('#chat-controls');
}

function getChatInput() {
   const chatInput = document.querySelector("#chat-message.chat-input");
   return chatInput
}
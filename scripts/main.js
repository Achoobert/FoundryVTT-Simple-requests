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
   let message = "advanced-requests: " + str;
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
         if (window.advancedRequests && typeof window.advancedRequests.syncQueueToOthers === "function") {
            window.advancedRequests.syncQueueToOthers();
         }
      }
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
      // this.socket.register("debugPing", this._debugPing.bind(this));
   }

   //   _debugPing(senderName) {
   //     console.log(`[Advanced Requests] Received debug ping from: ${senderName}`);
   //   }

   //   sendDebugPing() {
   //     this.socket.executeForOthers("debugPing", game.user.name);
   //   }

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
      log_socket("sending queue", CONFIG.ADV_REQUESTS.queue);
      this.socket.executeForOthers("syncQueue", CONFIG.ADV_REQUESTS.queue);
   }

   // can only be called by a GM
   gm_callout_top_request() {
      const toShow = pop_request_LOCAL_QUEUE()
      log_socket("sending pop_top_request", toShow);
      // popup message for all
      this.socket.executeForOthers("showEpicPrompt", toShow);
      _showEpicPrompt(toShow);
      moveAdvRequestsDash();
   }

   // When THIS CLIENT creates a request locally
   createRequest(requestData) {
      log_socket("creating request locally", requestData);
      add_new_request_LOCAL_QUEUE(requestData);
      moveAdvRequestsDash();
      // Send to all other clients
      this.socket.executeForOthers("addRequest", requestData);
   }

// img: "images/Edmund_Carter.webp"
// level: 0
// name: "Player2"
// timestamp: 1751550901413
// userId: "T07N5SnoLPF0O5Nj"

   // When receiving a request from another client
   _addRequest(requestData) {
      log_socket("receiving request from other client", requestData);
      add_new_request_LOCAL_QUEUE(requestData);
      // Play sound for new request if not from self
      if (requestData.userId !== game.user.id) {
         if (game.settings.get("advanced-requests", "soundCreate")) {
            // requestData.level
            playSound (
                soundVolume,
                // TODO game.settings.get("advanced-requests", "soundCreate")
            )
         }
      }
      moveAdvRequestsDash();
   }

   // Check if user is authorized to remove this request
   isAuthorizedToRemove(userId) {
      return game.user.isGM || game.user.id === userId;
   }

   // When THIS CLIENT removes a request locally
   removeRequest(userId) {
      if (this.isAuthorizedToRemove(userId)) {
         log_socket("removing request locally", userId);
         remove_request_LOCAL_QUEUE(userId);
         moveAdvRequestsDash();
         // Send to all other clients
         this.socket.executeForOthers("removeRequest", userId);
      }
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
      let queue = CONFIG.ADV_REQUESTS.queue || [];
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
   window.advancedRequests.socket.register("showEpicPrompt", (data) => {
      // TOOD Is this the best way to do this?
      remove_request_LOCAL_QUEUE(data.userId);
      _showEpicPrompt(data);
   });
});

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
      chip.className = `adv-request-chip ar-text-level-${req.level}`;
      chip.title = `${req.name} (${["Common", "Important", "Urgent", "test"][req.level]})`;
      chip.innerHTML = `<img class="ar-queue-warning ar-level-${req.level}" src="${req.img || "icons/svg/mystery-man.svg"}" style="width:24px;height:24px;border-radius:50%;"> ${req.name}`;
      // Remove on click (if own or GM)
      if (game.user.isGM) {
         chip.onclick = (event) => {
            event.preventDefault();
            // GM can pop the oldest, most urgent request
            window.advancedRequests.gm_callout_top_request();
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
         popBtn.onclick = (event) => {
            event.preventDefault();
            window.advancedRequests.gm_callout_top_request();
            moveAdvRequestsDash();
         };
         btnRow.appendChild(popBtn);
      }
      ["Common", "Important", "Urgent"].forEach((label, level) => {
         const btn = document.createElement("button");
         btn.type = "button";
         btn.textContent = label;
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
         btnRow.appendChild(btn);
      });
      dash.appendChild(btnRow);
   }

   return dash;
}

function moveAdvRequestsDash() {
   log_socket("moveAdvRequestsDash called by", game.user.name);
   log_socket("current queue", CONFIG.ADV_REQUESTS.queue);
   const chatInput = document.querySelector("#chat-message.chat-input");
   if (!chatInput) {
      if (CONFIG.ADV_REQUESTS.element?.parentNode) CONFIG.ADV_REQUESTS.element.parentNode.removeChild(CONFIG.ADV_REQUESTS.element);
      return;
   }
   removeAllDash();
   const dash = renderAdvRequestsDash();
   dash.id = "adv-requests-dash";
   CONFIG.ADV_REQUESTS.element = dash;
   // Insert BEFORE the chat input
   chatInput.parentNode.insertBefore(dash, chatInput);
}

Hooks.once("renderChatLog", moveAdvRequestsDash);
Hooks.on("closeChatLog", moveAdvRequestsDash);
Hooks.on("activateChatLog", moveAdvRequestsDash);
Hooks.on("deactivateChatLog", moveAdvRequestsDash);
// Function collapseSidebar
// collapseSidebar(sidebar: Sidebar, collapsed: boolean): 
Hooks.on("collapseSidebar", moveAdvRequestsDash);

// Utility to show a fullscreen epic prompt
// WIP, should allow themeing per each system! 
function _showEpicPrompt(data) {
   const name = data.name || "Player";
   const img = data.img || "icons/svg/mystery-man.svg";
   // Remove any existing prompt
   document.querySelectorAll('#ar-epic-prompt').forEach(el => el.remove());
   // Create overlay
   const overlay = document.createElement('div');
   overlay.id = 'ar-epic-prompt';
   overlay.className = 'ar-epic-prompt-overlay';
   overlay.innerHTML = `
      <div class="epic-prompt-container" style="background: rgba(30,30,30,0.9); border-radius: 2em; padding: 2em; box-shadow: 0 0 40px #000; text-align: center; min-width: 320px;">
        <img src="${img}" alt="${name}" style="width: 160px; height: 160px; border-radius: 50%; object-fit: cover; margin-bottom: 1em; border: 4px solid #fff; box-shadow: 0 0 20px #000;">
        <h1 style="color: #fff; font-size: 2.5em; margin: 0;">${name} has the floor</h1>
      </div>
    `;
   // play sound if messageActivate
   if ( game.settings.get("advanced-requests", "soundCreateVolume") ){
      playSound(
         (game.settings.get("advanced-requests", "soundCreateVolume") / 100)
         // TODO add custom sound for each level of urgency
      )
   }
   // Remove on click or after 3 seconds
   overlay.addEventListener('click', () => overlay.remove());
   setTimeout(() => overlay.remove(), 5000);
   document.body.appendChild(overlay);
}

// Remove any existing dash to avoid duplicates
function removeAllDash() {
   document.querySelectorAll(".adv-requests-dash").forEach(el => el.remove());
   document.querySelectorAll("#adv-requests-dash").forEach(el => el.remove());
}

function playSound ( volume=50, src="modules/advanced-requests/assets/request0.wav"){

       foundry.audio.AudioHelper.play({
          src,
          volume,
          autoplay: true,
          loop: false
       });

}
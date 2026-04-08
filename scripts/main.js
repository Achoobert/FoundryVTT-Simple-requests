import {
   Constants as C,
   PLAYER_CALLOUT_DIE_FACES,
   PLAYER_CALLOUT_ROLL_COUNT_MAX,
   PLAYER_CALLOUT_ROLL_COUNT_MIN,
   escapeHtmlForAttr
} from "./const.js";
import { showEpicPrompt } from "./epic-prompt.js";

const default_img = "icons/magic/control/debuff-energy-hold-blue-yellow.webp" // TODO link better

// Ensure CONFIG.SMP_REQUESTS and queue are always initialized
if (!window.CONFIG) window.CONFIG = {};
if (!CONFIG.SMP_REQUESTS) CONFIG.SMP_REQUESTS = {};
if (!Array.isArray(CONFIG.SMP_REQUESTS.queue)) CONFIG.SMP_REQUESTS.queue = [];

// queue logic
function pop_request_LOCAL_QUEUE() {
   let queue = CONFIG.SMP_REQUESTS.queue || [];
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
   let queue = CONFIG.SMP_REQUESTS.queue || [];
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
   let queue = CONFIG.SMP_REQUESTS.queue || [];
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
   CONFIG.SMP_REQUESTS.queue = queue;
   return queue;
}

/**
 * Remove a request from the queue. Defaults to removing the newest and most urgent for a user.
 * @param {string} userId
 */
function remove_request_LOCAL_QUEUE(userId) {
   let queue = CONFIG.SMP_REQUESTS.queue || [];
   if (typeof userId === 'undefined' || userId === null) {
      // Remove the first (oldest, most urgent) request
      if (queue.length > 0) queue.splice(0, 1);
   } else {
      // Remove any/all requests for this user
      queue = queue.filter(r => r.userId !== userId);
   }
   CONFIG.SMP_REQUESTS.queue = queue;
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
   CONFIG.SMP_REQUESTS.queue = newQueue.slice().sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return a.timestamp - b.timestamp;
   });
   return CONFIG.SMP_REQUESTS.queue;
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
      await moveSimpleRequestsDash();
   }
   async _createRequest(newQueue) {
      
      log_socket("syncing queue", newQueue);
      load_queue_requests_LOCAL_QUEUE(newQueue);
      await moveSimpleRequestsDash();
   }

   syncQueueToOthers() {
      log_socket("sending queue", CONFIG.SMP_REQUESTS.queue);
      this.socket.executeForOthers("syncQueue", CONFIG.SMP_REQUESTS.queue);
   }

   // can only be called by a GM
   async gm_callout_top_request() {
      const toShow = pop_request_LOCAL_QUEUE()
      log_socket("sending pop_top_request", toShow);
      // popup message for all
      this.socket.executeForOthers("showEpicPrompt", toShow);
      showEpicPrompt(toShow);
      await moveSimpleRequestsDash();
   }

   /**
    * GM-only: show epic prompt on one player’s client immediately (no queue).
    * Uses executeForEveryone like activateRequest; non-recipients ignore via __srTargeted.
    */
   gmSendTargetedPlayerCallout(payload) {
      if (!game.user.isGM) return;
      log_socket("targeted epic prompt", payload);
      this.socket.executeForEveryone("showEpicPrompt", {
         __srTargeted: true,
         __srRecipientId: payload.userId,
         skipQueueSync: true,
         userId: payload.userId,
         name: payload.name,
         img: payload.img,
         level: typeof payload.level === "number" ? payload.level : 0,
         headlineText: payload.headlineText,
         rollFormula: payload.rollFormula
      });
   }

   // When THIS CLIENT creates a request locally
   async createRequest(requestData) {
      
      log_socket("creating request locally", requestData);
      add_new_request_LOCAL_QUEUE(requestData);
      // Send to all other clients
      this.socket.executeForOthers("addRequest", requestData);
      await moveSimpleRequestsDash();
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
      await moveSimpleRequestsDash();
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
         await moveSimpleRequestsDash();
         // Send to all other clients
         this.socket.executeForOthers("removeRequest", userId);
      }
   }

   // When receiving a remove request from another client
   async _removeRequest(userId) {
      log_socket("receiving remove request from other client", userId);
      remove_request_LOCAL_QUEUE(userId);
      await moveSimpleRequestsDash();
   }

   // Update entire queue (for bulk operations)
   async updateRequestQueue(queueData) {
      log_socket("updating entire queue", queueData);
      load_queue_requests_LOCAL_QUEUE(queueData);
      await moveSimpleRequestsDash();
      this.socket.executeForOthers("updateRequestQueue", queueData);
   }

   // When receiving queue update from another client
   async _updateRequestQueue(queueData) {
      log_socket("receiving queue update from other client", queueData);
      load_queue_requests_LOCAL_QUEUE(queueData);
      await moveSimpleRequestsDash();
   }

   async _activateRequest(userId) {
      log_socket("activating request", userId);
      let queue = CONFIG.SMP_REQUESTS.queue || [];
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
      await moveSimpleRequestsDash();
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
      const targeted = data.__srTargeted === true;
      const recipientId = data.__srRecipientId;
      if (targeted && recipientId !== game.user.id) return;

      const { __srTargeted: _srT, __srRecipientId: _srR, ...rest } = data;
      if (!rest.skipQueueSync) {
         remove_request_LOCAL_QUEUE(rest.userId);
         await moveSimpleRequestsDash();
      }
      showEpicPrompt(rest);
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
   queueBox.classList.add("sr-chat-queue");
   queueBox.id = "sr-chat-queue";
   const queue = get_requests_LOCAL_QUEUE();
   queue.forEach((item) => {
      const containerEl = getRequestElement(item);
      queueBox.append(containerEl);
   });

   const menuStack = document.createElement("div");
   menuStack.classList.add("sr-queue-menu-actions");

   const queueAllMenuButton = document.createElement("div");
   queueAllMenuButton.classList.add("queueAll-button");
   queueAllMenuButton.innerHTML = `<i class="fas fa-list"></i>`;
   queueAllMenuButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.queueAllMenuTooltip`);
   menuStack.append(queueAllMenuButton);

   if (game.user.isGM) {
      const pickPlayerMenuButton = document.createElement("div");
      pickPlayerMenuButton.classList.add("queueAll-button");
      pickPlayerMenuButton.innerHTML = `<i class="fas fa-bullhorn"></i>`;
      pickPlayerMenuButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.pickPlayerCalloutTooltip`);
      menuStack.append(pickPlayerMenuButton);
      queueAllMenuButton.addEventListener("click", () => {
         window.SimplePrompts.createSocialInitiative();
      });
      pickPlayerMenuButton.addEventListener("click", () => {
         openPlayerCalloutDialog();
      });
   }

   queueBox.append(menuStack);

   // Requests menu button
   // const requestsMenuButton = document.createElement("div");
   // requestsMenuButton.classList.add("sr-chat-requests-menu");
   // requestsMenuButton.innerHTML = `<i class="fas fa-gear"></i>`;
   // requestsMenuButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.requestsMenuTooltip`);
   // queueBox.append(requestsMenuButton);

   // Transfer button
   const transferButton = document.createElement("div");
   transferButton.className = "sr-chat-queue-transfer sr-hidden";
   transferButton.innerHTML = `<i class="fas fa-up-right-from-square"></i>`;
   transferButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.queueTransferTooltip`);
   queueBox.append(transferButton);

   // (Event listeners for hover, shift, etc. remain unchanged)
   let isElementHovered = false;
   new_request_element.addEventListener("mouseover", (e) => {
      isElementHovered = true;
      if (e.shiftKey) {
         transferButton.classList.toggle("sr-hidden", false);
         queueBox.querySelectorAll(".sr-request-container-chat").forEach((el) => {
            el.classList.toggle("sr-hidden", true);
         });
      }
   });
   new_request_element.addEventListener("mouseout", (e) => {
      isElementHovered = false;
      transferButton.classList.toggle("sr-hidden", true);
      queueBox.querySelectorAll(".sr-request-container-chat").forEach((el) => {
         el.classList.toggle("sr-hidden", false);
      });
   });
   document.addEventListener("keydown", (e) => {
      if ((e.code == "ShiftLeft" || e.code == "ShiftRight") && isElementHovered) {
         transferButton.classList.toggle("sr-hidden", false);
         queueBox.querySelectorAll(".sr-request-container-chat").forEach((el) => {
            el.classList.toggle("sr-hidden", true);
         });
      }
   });
   document.addEventListener("keyup", (e) => {
      if ((e.code == "ShiftLeft" || e.code == "ShiftRight") && isElementHovered) {
         transferButton.classList.toggle("sr-hidden", true);
         queueBox.querySelectorAll(".sr-request-container-chat").forEach((el) => {
            el.classList.toggle("sr-hidden", false);
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
   buttonDiv.classList.add("sr-chat-buttons");
   ["first", "second", "third"].forEach((reqLevel, i) => {
      const button = document.createElement('div');
      button.className = `sr-chat-button sr-level-${i}`;
      button.innerHTML = `<i class="fa-${i == 0 ? "regular" : "solid"} fa-hand${i == 2 ? "-sparkles" : ""} sr-request-icon"></i>`;
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

let moveSimpleRequestsDashTimeout;
async function moveSimpleRequestsDashImpl() {
   log_socket("moveSimpleRequestsDash called by", game.user.name);
   log_socket("current queue", CONFIG.SMP_REQUESTS.queue);
   let chatInput = getChatInput();

   // TODO don't render if chat is closed on v12
   removeAllDash();
   const dash = await renderSimplePromptsQueue();
   if (!dash) return; // Prevent errors if simple-requests-chat-body is undefined
   CONFIG.SMP_REQUESTS.element = dash;

   if (!chatInput) {
      const chatControls = getChatControlsContainer();
      if(!chatControls){
         if (CONFIG.SMP_REQUESTS.element?.parentNode) CONFIG.SMP_REQUESTS.element.parentNode.removeChild(CONFIG.SMP_REQUESTS.element);
         return;
      }
      chatControls.prepend(dash);
      return;
   }
   chatInput.parentNode.insertBefore(dash, chatInput);
}

function moveSimpleRequestsDash(...args) {
   if (moveSimpleRequestsDashTimeout) clearTimeout(moveSimpleRequestsDashTimeout);
   moveSimpleRequestsDashTimeout = setTimeout(() => {
      moveSimpleRequestsDashImpl.apply(this, args);
   }, 100);
}

// Wrapper functions for async moveSimpleRequestsDash in hooks
const moveSimpleRequestsDashWrapper = () => Promise.resolve(moveSimpleRequestsDash()).catch(console.error);

Hooks.once("renderChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("closeChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("activateChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("deactivateChatLog", moveSimpleRequestsDashWrapper);
// Function collapseSidebar
Hooks.on("collapseSidebar", moveSimpleRequestsDashWrapper);

function openPlayerCalloutDialog() {
   if (!game.user.isGM || !window.SimplePrompts) return;
   const L = (k) => game.i18n.localize(`${C.ID}.pickPlayerCallout.${k}`);
   const players = game.users.players.filter((u) => u.active);
   if (!players.length) {
      ui.notifications.warn(L("noPlayers"));
      return;
   }
   const dieButtons = PLAYER_CALLOUT_DIE_FACES.map(
      (f) => `<button type="button" class="sr-callout-die" data-faces="${f}">d${f}</button>`
   ).join("");
   let countOptions = "";
   for (let n = PLAYER_CALLOUT_ROLL_COUNT_MIN; n <= PLAYER_CALLOUT_ROLL_COUNT_MAX; n++) {
      countOptions += `<option value="${n}">${n}</option>`;
   }
   const userOptions = players.map(
      (u) => `<option value="${u.id}">${escapeHtmlForAttr(u.name)}</option>`
   ).join("");

   new Dialog({
      title: L("dialogTitle"),
      content: `
<form class="sr-pick-player-callout-form">
  <div class="form-group">
    <label>${L("playerLabel")}</label>
    <select name="userId">${userOptions}</select>
  </div>
  <div class="form-group">
    <label>${L("calloutType")}</label>
    <div class="sr-callout-mode">
      <label class="sr-callout-mode-opt"><input type="radio" name="calloutMode" value="up" checked> ${L("modeUp")}</label>
      <label class="sr-callout-mode-opt"><input type="radio" name="calloutMode" value="dice"> ${L("modeDice")}</label>
    </div>
  </div>
  <div class="form-group sr-callout-dice-row" style="display:none">
    <label>${L("pickDie")}</label>
    <div class="sr-callout-dice-buttons">${dieButtons}</div>
    <input type="hidden" name="dieFaces" value="">
  </div>
  <div class="form-group sr-callout-count-row" style="display:none">
    <label>${L("countLabel")}</label>
    <select name="diceCount">${countOptions}</select>
  </div>
</form>`,
      buttons: {
         send: {
            icon: '<i class="fas fa-bullhorn"></i>',
            label: L("submit"),
            callback: (html) => {
               const userId = html.find('[name="userId"]').val();
               const mode = html.find('[name="calloutMode"]:checked').val();
               const target = game.users.get(userId);
               if (!target) {
                  ui.notifications.warn(L("noPlayers"));
                  return false;
               }
               let img = target.avatar;
               if (!img && target.character) {
                  const actor = game.actors.get(target.character);
                  img = actor?.img;
               }
               img = img || "icons/svg/mystery-man.svg";
               if (mode === "up") {
                  window.SimplePrompts.gmSendTargetedPlayerCallout({
                     userId: target.id,
                     name: target.name,
                     img,
                     level: 0,
                     headlineText: L("upHeadline")
                  });
                  return true;
               }
               const faces = html.find('[name="dieFaces"]').val();
               const count = parseInt(html.find('[name="diceCount"]').val(), 10);
               if (!faces || !count) {
                  ui.notifications.warn(L("needDieAndCount"));
                  return false;
               }
               const formula = `${count}d${faces}`;
               const headlineText = L("rollHeadline").replaceAll("{formula}", formula);
               window.SimplePrompts.gmSendTargetedPlayerCallout({
                  userId: target.id,
                  name: target.name,
                  img,
                  level: 0,
                  headlineText,
                  rollFormula: formula
               });
               return true;
            }
         }
      },
      default: "send",
      render: (html) => {
         const syncDiceRows = () => {
            const mode = html.find('[name="calloutMode"]:checked').val();
            const show = mode === "dice";
            html.find(".sr-callout-dice-row").toggle(show);
            html.find(".sr-callout-count-row").toggle(show);
         };
         html.find('[name="calloutMode"]').on("change", syncDiceRows);
         syncDiceRows();
         html.find(".sr-callout-die").on("click", (ev) => {
            const btn = ev.currentTarget;
            html.find(".sr-callout-die").removeClass("active");
            btn.classList.add("active");
            html.find('[name="dieFaces"]').val(btn.dataset.faces);
         });
      }
   }).render(true);
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
   containerEl.className = `sr-request-container-chat sr-level-${item.level}`;
   containerEl.dataset.id = item.userId;
   containerEl.dataset.tooltip = item.name;
   addRequestListener(containerEl);
   
   const tokenImgEl = document.createElement('img');
   tokenImgEl.src = item.img;
   containerEl.append(tokenImgEl);
   
   const warningEl = document.createElement('div');
   warningEl.className = `sr-queue-warning sr-level-${item.level}`;
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
   
   if (reRender && window.SimpleRequestsApp) {
      window.SimpleRequestsApp._render(true);
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
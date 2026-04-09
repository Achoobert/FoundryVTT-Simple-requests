import { Constants as C } from "./const.js";
import { log_socket } from "./debug-log.js";
import { openPlayerCalloutDialog } from "./player-callout-dialog.js";
import { get_requests_LOCAL_QUEUE } from "./queue-store.js";

function removeAllDash() {
   document.querySelectorAll(".simple-requests-chat-body").forEach(el => el.remove());
   document.querySelectorAll("#simple-requests-chat-body").forEach(el => el.remove());
}

function getRequestElement(item) {
   const containerEl = document.createElement("div");
   containerEl.className = `sr-request-container-chat sr-level-${item.level}`;
   containerEl.dataset.id = item.userId;
   containerEl.dataset.tooltip = item.name;
   addRequestListener(containerEl);

   const tokenImgEl = document.createElement("img");
   tokenImgEl.src = item.img;
   containerEl.append(tokenImgEl);

   const warningEl = document.createElement("div");
   warningEl.className = `sr-queue-warning sr-level-${item.level}`;
   warningEl.innerHTML = `<img src="modules/${C.ID}/assets/request${item.level}.webp"/>`;
   containerEl.append(warningEl);

   return containerEl;
}

function addRequestListener(element, reRender = false) {
   const elId = element?.dataset?.id;
   if (!game.user.isGM && game.user.id != elId) return;

   element?.addEventListener("contextmenu", async () => {
      window.SimplePrompts.removeRequest(element?.dataset?.id);
   });

   element?.addEventListener("click", async () => {
      if (game.user.isGM) {
         window.SimplePrompts.gm_callout_top_request();
      }
   });

   if (reRender && window.SimpleRequestsApp) {
      window.SimpleRequestsApp._render(true);
   }
}

function getChatControlsContainer() {
   let el = document.querySelector(".chat-controls");
   if (el) return el;
   return document.querySelector("#chat-controls");
}

function getChatInput() {
   return document.querySelector("#chat-message.chat-input");
}

async function renderSimplePromptsQueue() {
   const chatControls = getChatControlsContainer();
   if (!chatControls) return;

   const new_request_element = document.createElement("section");
   new_request_element.id = "simple-requests-chat-body";
   new_request_element.classList.add("simple-requests-chat-body");

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

   if (game.user.isGM) {
      const gmActions = document.createElement("div");
      gmActions.classList.add("sr-queue-gm-actions");

      const queueAllMenuButton = document.createElement("div");
      queueAllMenuButton.classList.add("sr-queue-gm-button", "sr-queue-gm-queue-all");
      queueAllMenuButton.innerHTML = `<i class="fas fa-list"></i>`;
      queueAllMenuButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.queueAllMenuTooltip`);
      queueAllMenuButton.addEventListener("click", () => {
         window.SimplePrompts.createSocialInitiative();
      });

      const pickPlayerMenuButton = document.createElement("div");
      pickPlayerMenuButton.classList.add("sr-queue-gm-button", "sr-queue-gm-pick-player");
      pickPlayerMenuButton.innerHTML = `<i class="fas fa-bullhorn"></i>`;
      pickPlayerMenuButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.pickPlayerCalloutTooltip`);
      pickPlayerMenuButton.addEventListener("click", () => {
         openPlayerCalloutDialog().catch((e) => console.error(e));
      });

      gmActions.append(queueAllMenuButton, pickPlayerMenuButton);
      menuStack.append(gmActions);
   }

   queueBox.append(menuStack);

   const transferButton = document.createElement("div");
   transferButton.className = "sr-chat-queue-transfer sr-hidden";
   transferButton.innerHTML = `<i class="fas fa-up-right-from-square"></i>`;
   transferButton.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.queueTransferTooltip`);
   queueBox.append(transferButton);

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
   new_request_element.addEventListener("mouseout", () => {
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

   const buttonDiv = document.createElement("div");
   buttonDiv.classList.add("sr-chat-buttons");
   ["first", "second", "third"].forEach((reqLevel, i) => {
      const button = document.createElement("div");
      button.className = `sr-chat-button sr-chat-hand-level-${i}`;
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
   const chatInput = getChatInput();

   removeAllDash();
   const dash = await renderSimplePromptsQueue();
   if (!dash) return;
   CONFIG.SMP_REQUESTS.element = dash;

   if (!chatInput) {
      const chatControls = getChatControlsContainer();
      if (!chatControls) {
         if (CONFIG.SMP_REQUESTS.element?.parentNode) CONFIG.SMP_REQUESTS.element.parentNode.removeChild(CONFIG.SMP_REQUESTS.element);
         return;
      }
      chatControls.prepend(dash);
      return;
   }
   chatInput.parentNode.insertBefore(dash, chatInput);
}

export function moveSimpleRequestsDash(...args) {
   if (moveSimpleRequestsDashTimeout) clearTimeout(moveSimpleRequestsDashTimeout);
   moveSimpleRequestsDashTimeout = setTimeout(() => {
      moveSimpleRequestsDashImpl.apply(this, args);
   }, 100);
}

export function moveSimpleRequestsDashWrapper() {
   return Promise.resolve(moveSimpleRequestsDash()).catch(console.error);
}

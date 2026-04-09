import { playSound } from "./audio.js";
import { Constants as C } from "./const.js";
import { log_socket } from "./debug-log.js";
import { showEpicPrompt } from "./epic-prompt.js";
import { moveSimpleRequestsDash } from "./chat-queue-ui.js";
import {
   add_new_request_LOCAL_QUEUE,
   load_queue_requests_LOCAL_QUEUE,
   pop_request_LOCAL_QUEUE,
   remove_request_LOCAL_QUEUE
} from "./queue-store.js";

function soundSettingKeyForRequestLevel(level) {
   switch (level) {
   case 0:
      return "firstRequestSound";
   case 1:
      return "secondRequestSound";
   case 2:
      return "thirdRequestSound";
   default:
      return "firstRequestSound";
   }
}

function playCreateRequestSoundForLevel(level) {
   const key = soundSettingKeyForRequestLevel(level);
   const soundSrc = game.settings.get(C.ID, key) || "modules/simple-requests/assets/request0.ogg";
   playSound(soundSrc);
}

function playActivateRequestSoundIfEnabled() {
   if (!game.settings.get(C.ID, "soundActivate")) return;
   const sound = game.settings.get(C.ID, "reqClickSound")
      || "modules/simple-requests/assets/samples/fingerSnapping.ogg";
   playSound(sound);
}

function shuffleArrayInPlace(array) {
   for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
   }
   return array;
}

function getActiveUsersForQueueAll(playersOnly) {
   if (playersOnly) {
      return game.users.players.filter((u) => u.active);
   }
   return game.users.filter((u) => u.active);
}

class SimplePromptsManager {
   constructor() {
      this.moduleName = C.ID;
      this.socket = socketlib.registerModule(this.moduleName);
      this.socket.register("addRequest", this._addRequest.bind(this));
      this.socket.register("removeRequest", this._removeRequest.bind(this));
      this.socket.register("activateRequest", this._activateRequest.bind(this));
      this.socket.register("playActivateSound", playActivateRequestSoundIfEnabled);
      this.socket.register("updateRequestQueue", this._updateRequestQueue.bind(this));
      this.socket.register("syncQueue", this._syncQueue.bind(this));
   }

   async _syncQueue(newQueue) {
      log_socket("syncing queue", newQueue);
      load_queue_requests_LOCAL_QUEUE(newQueue);
      await moveSimpleRequestsDash();
   }

   syncQueueToOthers() {
      log_socket("sending queue", CONFIG.SMP_REQUESTS.queue);
      this.socket.executeForOthers("syncQueue", CONFIG.SMP_REQUESTS.queue);
   }

   async gm_callout_top_request() {
      this.socket.executeForEveryone("playActivateSound");
      const toShow = pop_request_LOCAL_QUEUE();
      log_socket("sending pop_top_request", toShow);
      this.socket.executeForOthers("showEpicPrompt", toShow);
      await showEpicPrompt(toShow);
      await moveSimpleRequestsDash();
   }

   gmSendTargetedPlayerCallout(payload) {
      if (!game.user.isGM) return;
      log_socket("targeted epic prompt", payload);
      this.socket.executeForEveryone("playActivateSound");
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

   async createRequest(requestData) {
      log_socket("creating request locally", requestData);
      add_new_request_LOCAL_QUEUE(requestData);
      if (game.settings.get(this.moduleName, "soundCreate") && requestData.userId === game.user.id) {
         playCreateRequestSoundForLevel(requestData.level);
      }
      this.socket.executeForOthers("addRequest", requestData);
      await moveSimpleRequestsDash();
   }

   async createSocialInitiative() {
      const playersOnly = game.settings.get(this.moduleName, "queueAllPlayersOnly");
      const users = getActiveUsersForQueueAll(playersOnly).slice();
      shuffleArrayInPlace(users);
      const baseTs = Date.now();
      for (let i = 0; i < users.length; i++) {
         const user = users[i];
         await this.createRequest({
            userId: user.id,
            name: user.name,
            img: user.avatar,
            level: 0,
            timestamp: baseTs + i
         });
      }
   }

   async _addRequest(requestData) {
      log_socket("receiving request from other client", requestData);
      add_new_request_LOCAL_QUEUE(requestData);
      await moveSimpleRequestsDash();
      if (game.settings.get(this.moduleName, "soundCreate")) {
         playCreateRequestSoundForLevel(requestData.level);
      }
   }

   isAuthorizedToRemove(userId) {
      return game.user.isGM || game.user.id === userId;
   }

   async removeRequest(userId) {
      if (this.isAuthorizedToRemove(userId)) {
         log_socket("removing request locally", userId);
         remove_request_LOCAL_QUEUE(userId);
         await moveSimpleRequestsDash();
         this.socket.executeForOthers("removeRequest", userId);
      }
   }

   async _removeRequest(userId) {
      log_socket("receiving remove request from other client", userId);
      remove_request_LOCAL_QUEUE(userId);
      await moveSimpleRequestsDash();
   }

   async updateRequestQueue(queueData) {
      log_socket("updating entire queue", queueData);
      load_queue_requests_LOCAL_QUEUE(queueData);
      await moveSimpleRequestsDash();
      this.socket.executeForOthers("updateRequestQueue", queueData);
   }

   async _updateRequestQueue(queueData) {
      log_socket("receiving queue update from other client", queueData);
      load_queue_requests_LOCAL_QUEUE(queueData);
      await moveSimpleRequestsDash();
   }

   async _activateRequest(userId) {
      log_socket("activating request", userId);
      const queue = CONFIG.SMP_REQUESTS.queue || [];
      const req = queue.find(r => r.userId === userId);
      if (!req) return;
      playActivateRequestSoundIfEnabled();
      ChatMessage.create({
         user: game.user.id,
         speaker: { alias: game.user.name },
         content: game.i18n.format("simple-requests.chatMessage.activateRequest", { name: req.name })
      });
      remove_request_LOCAL_QUEUE(userId);
      await moveSimpleRequestsDash();
      this.syncQueueToOthers();
   }

   activateRequest(userId) {
      this.socket.executeForEveryone("activateRequest", userId);
   }
}

Hooks.on("userConnected", () => {
   if (game.users?.filter(u => u.active).length > 1) {
      const activeUsers = game.users.filter(u => u.active);
      const isFirstUser = activeUsers[0]?.id === game.user.id;
      const isFirstGM = game.user.isGM && !activeUsers.some(u => u.isGM && u.id < game.user.id);
      if (isFirstUser || isFirstGM) {
         if (window.SimplePrompts && typeof window.SimplePrompts.syncQueueToOthers === "function") {
            window.SimplePrompts.syncQueueToOthers();
         }
      }
   }
});

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
      await showEpicPrompt(rest);
   });
});

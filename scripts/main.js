import { Constants as C } from "./const.js";
import "./queue-store.js";
import { moveSimpleRequestsDashWrapper } from "./chat-queue-ui.js";
import { openPlayerCalloutDialog } from "./player-callout-dialog.js";
import "./simple-prompts-manager.js";

Hooks.once("ready", () => {
   const mod = game.modules.get(C.ID);
   if (mod) {
      mod.api = { openPlayerCalloutDialog };
   }
});

Hooks.once("renderChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("closeChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("activateChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("deactivateChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("collapseSidebar", moveSimpleRequestsDashWrapper);

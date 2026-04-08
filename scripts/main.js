import "./queue-store.js";
import { moveSimpleRequestsDashWrapper } from "./chat-queue-ui.js";
import "./simple-prompts-manager.js";

Hooks.once("renderChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("closeChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("activateChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("deactivateChatLog", moveSimpleRequestsDashWrapper);
Hooks.on("collapseSidebar", moveSimpleRequestsDashWrapper);

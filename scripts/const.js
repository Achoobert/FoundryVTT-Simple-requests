export const Constants = {
   ID: "simple-requests"
};

/** Die types offered in the GM player-callout dialog (includes d10). */
export const PLAYER_CALLOUT_DIE_FACES = [2, 3, 4, 6, 8, 10, 12, 20, 100];

export const D2_MASK_URL = "icons/svg/coins.svg";

export const PLAYER_CALLOUT_ROLL_COUNT_MIN = 1;
export const PLAYER_CALLOUT_ROLL_COUNT_MAX = 10;

import {
   resolveAssignedActorName,
   resolveRequestDisplayName
} from "./request-display-name.mjs";

export { resolveRequestDisplayName, resolveAssignedActorName } from "./request-display-name.mjs";

export function getRequestDisplayName(user) {
   const useCharacterName = game.settings.get(Constants.ID, "useCharacterName");
   const actorName = resolveAssignedActorName(user, (id) => game.actors.get(id)?.name);
   return resolveRequestDisplayName(user, useCharacterName, actorName);
}

/** Display name for a queued request (live lookup when setting on). */
export function getQueueItemDisplayName(item) {
   const user = item?.userId ? game.users.get(item.userId) : null;
   return getRequestDisplayName(user) || item?.name || "Player";
}

export function escapeHtmlForAttr(text) {
   return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
}

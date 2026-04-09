export const Constants = {
   ID: "simple-requests"
}

/** Die types offered in the GM player-callout dialog (includes d10). */
export const PLAYER_CALLOUT_DIE_FACES = [4, 6, 8, 10, 12, 20, 100];

export const PLAYER_CALLOUT_DIE_FACES_ICONS = ["icons/dice/d4black.svg", "icons/dice/d6black.svg", "icons/dice/d8black.svg", "icons/dice/d10black.svg", "icons/dice/d12black.svg", "icons/dice/d20black.svg"];

export const PLAYER_CALLOUT_ROLL_COUNT_MIN = 1;
export const PLAYER_CALLOUT_ROLL_COUNT_MAX = 20;

export function escapeHtmlForAttr(text) {
   return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
}

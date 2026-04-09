export const Constants = {
   ID: "simple-requests"
}

/** Die types offered in the GM player-callout dialog (includes d10). */
export const PLAYER_CALLOUT_DIE_FACES = [2, 3, 4, 6, 8, 10, 12, 20, 100];

export const D2_MASK_URL = "icons/svg/coins.svg";
// export const D2_IMG_URL = "icons/commodities/currency/coin-plain-gold.webp";
// icons/svg/d20-highlight.svg
export const PLAYER_CALLOUT_ROLL_COUNT_MIN = 1;
export const PLAYER_CALLOUT_ROLL_COUNT_MAX = 10;

export function escapeHtmlForAttr(text) {
   return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
}

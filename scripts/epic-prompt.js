import { Constants as C, escapeHtmlForAttr, PLAYER_CALLOUT_DIE_FACES } from "./const.js";

const DICE_MASK_FALLBACK = "icons/dice/d20black.svg";

const D10_MASK_URL = "icons/dice/d10black.svg";

/**
 * @param {string | null} formula - e.g. "2d6"
 * @returns {{ showDiceOverlay: boolean, dicePercentile?: boolean, diceMaskUrl?: string | null }}
 */
function diceOverlayFromFormula(formula) {
   if (!formula) return { showDiceOverlay: false };
   const m = formula.trim().match(/^(\d+)d(\d+)$/i);
   if (!m) return { showDiceOverlay: false };
   const faces = parseInt(m[2], 10);
   if (!Number.isFinite(faces)) return { showDiceOverlay: false };
   if (faces === 100) {
      return { showDiceOverlay: true, dicePercentile: true };
   }
   const url = PLAYER_CALLOUT_DIE_FACES.includes(faces)
      ? `icons/dice/d${faces}black.svg`
      : DICE_MASK_FALLBACK;
   return { showDiceOverlay: true, diceMaskUrl: url };
}

function playInterfaceSound(src) {
   const volume = game.settings.get("core", "globalInterfaceVolume");
   foundry.audio.AudioHelper.play({
      src,
      volume,
      autoplay: true,
      loop: false
   });
}

function promptShowSound() {
   if (!game.settings.get(C.ID, "soundOnPromptActivate")) return;
   const sound = game.settings.get(C.ID, "promptShowSound")
      || `modules/${C.ID}/assets/samples/fingerSnapping.ogg`;
   playInterfaceSound(sound);
}

/**
 * Fullscreen epic prompt. If data.rollFormula is set, first click evaluates the roll,
 * posts to chat, then closes; auto-dismiss is extended. Otherwise click or 5s closes.
 * @param {object} data
 * @param {string} [data.name]
 * @param {string} [data.img]
 * @param {number} [data.level]
 * @param {string} [data.headlineText] - overrides epicPromptHeadline template
 * @param {string} [data.rollFormula] - e.g. "2d6"
 * @returns {Promise<void>}
 */
export async function showEpicPrompt(data) {
   const name = data.name || "Player";
   const safeName = escapeHtmlForAttr(name);
   const img = data.img || "icons/svg/mystery-man.svg";
   const level = typeof data.level === "number" ? Math.min(2, Math.max(0, data.level)) : 0;

   let headlineHtml;
   if (typeof data.headlineText === "string" && data.headlineText.trim()) {
      headlineHtml = escapeHtmlForAttr(data.headlineText.trim());
   } else {
      let headlineTemplate = game.settings.get(C.ID, "epicPromptHeadline");
      if (typeof headlineTemplate !== "string" || !headlineTemplate.trim()) {
         headlineTemplate = "{name} has the floor";
      }
      // World setting may contain HTML; {name} is escaped.
      headlineHtml = headlineTemplate.replaceAll("{name}", safeName);
   }

   document.querySelectorAll("#sr-epic-prompt").forEach((el) => el.remove());

   const rollFormula = typeof data.rollFormula === "string" && data.rollFormula.trim()
      ? data.rollFormula.trim()
      : null;
   const { showDiceOverlay, dicePercentile, diceMaskUrl } = diceOverlayFromFormula(rollFormula);

   const overlay = document.createElement("div");
   overlay.id = "sr-epic-prompt";
   overlay.className = "sr-epic-prompt-overlay";
   const overlayImgSrc = `modules/${C.ID}/assets/request${level}.webp`;
   const template = `modules/${C.ID}/templates/epic-prompt-overlay.hbs`;
   try {
      overlay.innerHTML = await foundry.applications.handlebars.renderTemplate(template, {
         img,
         safeName,
         level,
         overlayImgSrc,
         headlineHtml,
         showDiceOverlay,
         dicePercentile: !!dicePercentile,
         diceMaskUrl,
         d10MaskUrl: D10_MASK_URL
      });
   } catch (err) {
      console.error("simple-requests: epic-prompt template failed", err);
      ui.notifications?.error?.("simple-requests: could not show epic prompt.");
      return;
   }

   promptShowSound();

   let dismissed = false;
   const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      overlay.remove();
   };

   const autoMs = rollFormula ? 120000 : 5000;
   const timeoutId = setTimeout(dismiss, autoMs);

   overlay.addEventListener("click", async () => {
      if (dismissed) return;
      if (rollFormula) {
         try {
            const roll = new Roll(rollFormula);
            await roll.evaluate({ async: true });
            await roll.toMessage({
               speaker: ChatMessage.getSpeaker({ user: game.user })
            });
         } catch (err) {
            console.error("simple-requests: roll failed", err);
            ui.notifications?.warn?.(game.i18n.localize(`${C.ID}.pickPlayerCallout.rollFailed`));
         }
         clearTimeout(timeoutId);
         dismiss();
         return;
      }
      clearTimeout(timeoutId);
      dismiss();
   });

   document.body.appendChild(overlay);
}

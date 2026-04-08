import {
   Constants as C,
   PLAYER_CALLOUT_DIE_FACES,
   PLAYER_CALLOUT_ROLL_COUNT_MAX,
   PLAYER_CALLOUT_ROLL_COUNT_MIN,
   escapeHtmlForAttr
} from "./const.js";

export function openPlayerCalloutDialog() {
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

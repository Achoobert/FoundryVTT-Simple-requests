import {
   Constants as C,
   PLAYER_CALLOUT_DIE_FACES,
   PLAYER_CALLOUT_ROLL_COUNT_MAX,
   PLAYER_CALLOUT_ROLL_COUNT_MIN
} from "./const.js";

export async function openPlayerCalloutDialog() {
   if (!game.user.isGM || !window.SimplePrompts) return;
   const L = (k) => game.i18n.localize(`${C.ID}.pickPlayerCallout.${k}`);
   const players = game.users.players.filter((u) => u.active);
   if (!players.length) {
      ui.notifications.warn(L("noPlayers"));
      return;
   }
   const diceCounts = [];
   for (let n = PLAYER_CALLOUT_ROLL_COUNT_MIN; n <= PLAYER_CALLOUT_ROLL_COUNT_MAX; n++) {
      diceCounts.push(n);
   }
   const template = `modules/${C.ID}/templates/pick-player-callout.hbs`;
   let content;
   try {
      content = await foundry.applications.handlebars.renderTemplate(template, {
         players: players.map((u) => ({ id: u.id, name: u.name })),
         dieFaces: PLAYER_CALLOUT_DIE_FACES,
         diceCounts
      });
   } catch (err) {
      console.error("simple-requests: pick-player-callout template failed", err);
      ui.notifications.error("simple-requests: could not open player callout dialog.");
      return;
   }

   new Dialog({
      title: L("dialogTitle"),
      content,
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

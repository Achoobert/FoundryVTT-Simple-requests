import {
  Constants as C,
  getRequestDisplayName,
  PLAYER_CALLOUT_DIE_FACES,
  PLAYER_CALLOUT_ROLL_COUNT_MAX,
  PLAYER_CALLOUT_ROLL_COUNT_MIN,
} from "./const.js";

function resolveCalloutTarget(html, L) {
  const userId = html.find('[name="userId"]').val();
  const target = game.users.get(userId);
  if (!target) {
    ui.notifications.warn(L("noPlayers"));
    return null;
  }
  let img = target.avatar;
  if (!img && target.character) {
    const actor = game.actors.get(target.character);
    img = actor?.img;
  }
  img = img || "icons/svg/mystery-man.svg";
  return {
    userId: target.id,
    name: getRequestDisplayName(target),
    img,
    level: 0,
  };
}

export async function openPlayerCalloutDialog() {
  if (!game.user.isGM || !window.SimplePrompts) return;
  const L = (k) => game.i18n.localize(`${C.ID}.pickPlayerCallout.${k}`);
  const players = game.users.players.filter((u) => u.active);
  if (!players.length) {
    players.push(game.user);
  }
  const diceCounts = [];
  for (
    let n = PLAYER_CALLOUT_ROLL_COUNT_MIN;
    n <= PLAYER_CALLOUT_ROLL_COUNT_MAX;
    n++
  ) {
    diceCounts.push(n);
  }
  const template = `modules/${C.ID}/templates/pick-player-callout.hbs`;
  let content;
  try {
    content = await foundry.applications.handlebars.renderTemplate(template, {
      players: players.map((u) => ({
        id: u.id,
        name: getRequestDisplayName(u),
      })),
      dieFaces: PLAYER_CALLOUT_DIE_FACES,
      diceCounts,
      messageDefault: game.i18n.localize(
        `${C.ID}.pickPlayerCallout.messageDefault`,
      ),
    });
  } catch (err) {
    console.error("simple-requests: pick-player-callout template failed", err);
    ui.notifications.error(
      "simple-requests: could not open player callout dialog.",
    );
    return;
  }

  let dialog;
  dialog = new Dialog({
    title: L("dialogTitle"),
    content,
    buttons: {
      close: {
        icon: '<i class="fas fa-times"></i>',
        label: L("cancel"),
        callback: () => true,
      },
    },
    render: (html) => {
      html.find(".sr-callout-message-form").on("submit", (ev) => {
        ev.preventDefault();
        const base = resolveCalloutTarget(html, L);
        if (!base) return;
        const text = String(
          html.find('[name="calloutMessage"]').val() ?? "",
        ).trim();
        if (!text) {
          ui.notifications.warn(L("needMessage"));
          return;
        }
        window.SimplePrompts.gmSendTargetedPlayerCallout({
          ...base,
          headlineText: text,
        });
        dialog.close();
      });
      const advCheckbox = html.find('[name="advantage"]');
      const disCheckbox = html.find('[name="disadvantage"]');
      advCheckbox.on("change", () => {
        if (advCheckbox.is(":checked")) disCheckbox.prop("checked", false);
      });
      disCheckbox.on("change", () => {
        if (disCheckbox.is(":checked")) advCheckbox.prop("checked", false);
      });
      html.find(".sr-callout-dice-form").on("submit", (ev) => {
        ev.preventDefault();
        const submitter = ev.originalEvent?.submitter;
        const faces = submitter?.value ?? submitter?.getAttribute?.("value");
        const count = parseInt(
          String(html.find('[name="diceCount"]').val()),
          10,
        );
        if (!faces || !Number.isFinite(count) || count < 1) {
          ui.notifications.warn(L("needDieAndCount"));
          return;
        }
        const base = resolveCalloutTarget(html, L);
        if (!base) return;
        const hideRoll = html.find('[name="hideRoll"]').is(":checked");
        const advantage = html.find('[name="advantage"]').is(":checked");
        const disadvantage = html.find('[name="disadvantage"]').is(":checked");
        const keepSuffix = advantage ? "kh1" : disadvantage ? "kl1" : "";
        const formula = `${count}d${faces}${keepSuffix}`;
        const headlineText = L("rollHeadline").replaceAll("{formula}", formula);
        window.SimplePrompts.gmSendTargetedPlayerCallout({
          ...base,
          headlineText,
          rollFormula: formula,
          hideRoll,
        });
        dialog.close();
      });
    },
  });
  dialog.render(true);
}

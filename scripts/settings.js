import { Constants as C } from "./const.js";
import { moveSimpleRequestsDash } from "./chat-queue-ui.js";

Hooks.once('init', function() {
   const registerSettings = (key, _scope = 'world', _config = true, _type = Boolean, _default = true, _filePicker = null, onChange = () => {}, _choices = null, _range = null) => {
      game.settings.register(C.ID, key, {
         ...{
            name: game.i18n.localize(`${C.ID}.settings.${key}`),
            hint: game.i18n.localize(`${C.ID}.settings.${key}Hint`),
            scope: _scope,
            config: _config,
            type: _type,
            default: _default,
            onChange: onChange,
         },
         ...(_filePicker ? {filePicker: _filePicker} : {}),
         ...(_choices ? { choices: _choices } : {}),
         ...(_range ? { range: _range } : {})
      });
   };

   registerSettings("soundCreate", "world", true, Boolean, true);
   registerSettings("soundOnPromptActivate", "world", true, Boolean, true);
   registerSettings("promptShowSound", "world", true, String, "modules/simple-requests/assets/request0.ogg", "audio");
   registerSettings("epicPromptHeadline", "world", true, String, "{name} has the floor");
   registerSettings("soundActivate", "world", true, Boolean, true);
   registerSettings("reqClickSound", "world", true, String, "modules/simple-requests/assets/request0.ogg", "audio");

   registerSettings("firstRequest", "world", true, Boolean, true, null, updateChatRequestButtons);
   registerSettings("firstRequestSound", "world", true, String, "modules/simple-requests/assets/request0.ogg", "audio");
   registerSettings("secondRequest", "world", true, Boolean, true, null, updateChatRequestButtons);
   registerSettings("secondRequestSound", "world", true, String, "modules/simple-requests/assets/request1.ogg", "audio");
   registerSettings("thirdRequest", "world", true, Boolean, true, null, updateChatRequestButtons);
   registerSettings("thirdRequestSound", "world", true, String, "modules/simple-requests/assets/request2.ogg", "audio");

   registerSettings("queueAllPlayersOnly", "world", true, Boolean, false);

   registerSettings("queue", "world", false, Array, []);
});

function updateChatRequestButtons() {
   moveSimpleRequestsDash();
}

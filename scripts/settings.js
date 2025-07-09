import { Constants as C, visualNoverIsActive } from "./const.js";

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
   }

   // Play sound when creating requests
   registerSettings("soundCreate", "world", true, Boolean, true)
   // Play sound when activating requests
   registerSettings("soundOnPromptActivate", "world", true, Boolean, true)
   // prompt sound (file path)
   registerSettings("promptShowSound", "world", true, String, "modules/simple-requests/assets/samples/fingerSnapping.ogg", "audio")
   // ? TODO out of scope?
   // // What to use for requests
   // const ufrChooseList = {
   //    "playerToken": game.i18n.localize(`${C.ID}.settings.ufrPlayerToken`),
   //    "playerActor": game.i18n.localize(`${C.ID}.settings.ufrPlayerActor`),
   //    "token": game.i18n.localize(`${C.ID}.settings.ufrToken`), 
   //    "actor": game.i18n.localize(`${C.ID}.settings.ufrActor`), 
   //    "user": game.i18n.localize(`${C.ID}.settings.ufrUser`), 
   //    "controlled": game.i18n.localize(`${C.ID}.settings.ufrControlled`), 
   //    "custom": game.i18n.localize(`${C.ID}.settings.ufrCustom`)
   // };
   // DISPLAY REQUESTS:
   // - 1st level requests (0 in button array)
   registerSettings("firstRequest", "world", true, Boolean, true, null, updateChatRequestButtons)
   registerSettings("firstRequestSound", "world", true, String, "modules/simple-requests/assets/request0.ogg", "audio")
   // TODO custom string name 
   // - 2nd level requests
   registerSettings("secondRequest", "world", true, Boolean, true, null, updateChatRequestButtons)
   registerSettings("secondRequestSound", "world", true, String, "modules/simple-requests/assets/request1.ogg", "audio")
   // - 3rd level requests
   registerSettings("thirdRequest", "world", true, Boolean, true, null, updateChatRequestButtons)
   registerSettings("thirdRequestSound", "world", true, String, "modules/simple-requests/assets/request2.ogg", "audio")

   // HIDDEN
   // Request queue
   registerSettings("queue", "world", false, Array, [])
});

function changeChatQueueHeight() {
   const chatQueueEl = document.getElementById("simple-requests-chat-body");
   if (chatQueueEl) {
      const elHeight = game.settings.get(C.ID, "chatQueueHeight")
      chatQueueEl.style.minHeight = `${elHeight}px`
      chatQueueEl.style.maxHeight = `${elHeight}px`
   }
}

function updateChatRequestButtons() {
   const buttonsBoxEl = document.getElementById("simple-requests-chat-body")?.querySelector(".ar-chat-buttons")
   if (buttonsBoxEl) {
      buttonsBoxEl.innerHTML = "";
      ["first", "second", "third"].forEach((reqLevel, i) => {
         if (!game.settings.get(C.ID, `${reqLevel}Request`)) return
         const button = document.createElement('div')
         button.className = `ar-chat-button ar-level-${i}`
         button.innerHTML = `<i class=\"fa-${i == 0 ? "regular" : "solid"} fa-hand${i == 2 ? "-sparkles" : ""} ar-request-icon\"></i>`
         button.dataset.tooltip = game.i18n.localize(`${C.ID}.buttons.${reqLevel}RequestTooltip`)
         button.addEventListener("click", async () => {
            await addRequest(i)
         })
         buttonsBoxEl.append(button)
      })
   }
   SimpleRequestsApp._render()
}

function reRender() {
   SimpleRequestsApp._render()
}

function updatePosition(value) {
   SimpleRequestsApp._render();
   document.getElementById("simple-requests-chat-body").style.display = (value == "chat" ? null : "none")
}
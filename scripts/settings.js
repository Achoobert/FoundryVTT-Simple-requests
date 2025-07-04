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
   registerSettings("soundCreate", "client", true, Boolean, true)
   // Volume of sound when creating requests
   registerSettings("soundCreateVolume", "client", true, Number, 50, null, null, null, {min: 0, max: 100, step: 1})
   // Play sound when activating requests
   registerSettings("soundActivate", "client", true, Boolean, true)
   // Volume of sound when activating requests
   registerSettings("soundActivateVolume", "client", true, Number, 50, null, null, null, {min: 0, max: 100, step: 1})
   // Use Foundry interface volume
   registerSettings("useFoundryInterfaceVolume", "client", true, Boolean, true)
   // sound when activating requests
   registerSettings("messageActivate", "client", true, Boolean, true)
   // Width of the request field in FreeScreen window depends on the number of requests
   //    registerSettings("widthDependOnQueue", "client", true, Boolean, false, null, reRender)
   // Request sound (file path)
   registerSettings("reqClickSound", "client", true, String, "modules/advanced-requests/assets/samples/fingerSnapping.wav", "audio")
   // What to use for requests
//    const ufrChooseList = {
//       "playerToken": game.i18n.localize(`${C.ID}.settings.ufrPlayerToken`),
//       "playerActor": game.i18n.localize(`${C.ID}.settings.ufrPlayerActor`),
//       "token": game.i18n.localize(`${C.ID}.settings.ufrToken`), 
//       "actor": game.i18n.localize(`${C.ID}.settings.ufrActor`), 
//       "user": game.i18n.localize(`${C.ID}.settings.ufrUser`), 
//       "controlled": game.i18n.localize(`${C.ID}.settings.ufrControlled`), 
//       "custom": game.i18n.localize(`${C.ID}.settings.ufrCustom`)
//    };
//    registerSettings("useForRequests", "client", true, String, "playerToken", null, false, ufrChooseList)
   // ID of the actor selected by the player
   //    registerSettings("selectedActorId", "client", true, String, "")
   // Custom image for requests
   //    registerSettings("customImage", "client", true, String, "", "image")
   // Custom name for requests
   //    registerSettings("customName", "client", true, String, "")
   // Height of the request list under the chat
   //    registerSettings("chatQueueHeight", "client", true, Number, 60, null, changeChatQueueHeight)
   // Position of the requests window
   //    registerSettings("requestsPosition", "client", true, String, "chat", null, updatePosition, {"chat": game.i18n.localize(`${C.ID}.settings.qpChat`), "freeScreen": game.i18n.localize(`${C.ID}.settings.qpFreeScreen`)})
   // zIndex of the requests window
   //    registerSettings("freeScreenZIndex", "client", true, Number, 10, null, reRender)

   // DISPLAY REQUESTS:
   // - 1st level requests (0 in button array)
   registerSettings("firstRequest", "world", true, Boolean, true, null, updateChatRequestButtons)
   registerSettings("firstRequestSound", "client", true, String, "modules/advanced-requests/assets/request0.wav", "audio")
   // TODO custom string name instead of
   // - 2nd level requests
   registerSettings("secondRequest", "world", true, Boolean, true, null, updateChatRequestButtons)
   registerSettings("secondRequestSound", "client", true, String, "modules/advanced-requests/assets/request1.wav", "audio")
   // - 3rd level requests
   registerSettings("thirdRequest", "world", true, Boolean, true, null, updateChatRequestButtons)
   registerSettings("secondRequestSound", "client", true, String, "modules/advanced-requests/assets/request2.wav", "audio")

   // HIDDEN
   // Request queue
   registerSettings("queue", "world", false, Array, [])
   // Data for the requests window in FreeScreen
   registerSettings("freeScreenData", "client", false, Object, {})
});

// function changeChatQueueHeight() {
//    const chatQueueEl = document.getElementById("advanced-requests-chat-body");
//    if (chatQueueEl) {
//       const elHeight = game.settings.get(C.ID, "chatQueueHeight")
//       chatQueueEl.style.minHeight = `${elHeight}px`
//       chatQueueEl.style.maxHeight = `${elHeight}px`
//    }
// }

function updateChatRequestButtons() {
   const buttonsBoxEl = document.getElementById("advanced-requests-chat-body")?.querySelector(".ar-chat-buttons")
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
   AdvancedRequestsApp._render()
}

function reRender() {
   AdvancedRequestsApp._render()
}

function updatePosition(value) {
   AdvancedRequestsApp._render();
   document.getElementById("advanced-requests-chat-body").style.display = (value == "chat" ? null : "none")
}
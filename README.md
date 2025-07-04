<h1>Advanced requests</h1>
install
```
https://github.com/achoobert/FoundryVTT-Advanced-requests/releases/latest/download/module.json
```

<h2>EN</h2>
<p>This module introduces a "Requests" system that allows players to smoothly insert their lines at the right moment without disrupting the gameplay, enabling players to create requests with three levels of importance during the game to express their desire to speak without unnecessary interruptions and chaos in the dialogues:</p> <p>Are you a GM tired of players constantly interrupting you in the middle of a vivid description? Do players constantly argue about who gets to speak when? Are you a shy, quiet player who can’t get a word in between two loud teammates? This module will solve all your problems!</p> <p>Convenient and accessible requests with three levels of importance will allow you to take the initiative in dialogue without interrupting others mid-sentence, while preserving role-play and immersion in the game.</p> <p><strong>Requests come in three types:</strong></p> <ul> <li> <p><strong>Common</strong> — suitable for non-urgent suggestions that can wait until the current dialogue or event finishes.</p> </li> <li> <p><strong>Important</strong> — needed to insert a line immediately after a sentence finishes.</p> </li> <li> <p><strong>URGENT!</strong> — allows you to insert your line RIGHT NOW, interrupting everyone and everything.</p> </li> </ul> <p>Moreover, you can always remove the request levels you don’t need in the module settings.</p> <h3>Usage</h3> <p>The request queue will be displayed in the menu below the chat. You can create requests using the buttons on the right side of the request menu.</p> 

![Foundry_Virtual_Tabletop_MLnZrxNzaG](https://github.com/user-attachments/assets/f81cace1-f74b-45e8-8f84-5eaafa2e7621)
<p>When a player clicks on their request using LMB or RMB, or when the GM clicks on a request using RMB, the request is silently removed.</p> <p>When the GM clicks on a request using LMB, they "activate" it, triggering the request's activation sound and creating a chat message notifying that the request has been activated.</p> 

![Foundry_Virtual_Tabletop_Dwx9wd4gOd](https://github.com/user-attachments/assets/a58fc66a-d755-49d5-9ef5-2e88d3ae9b1e)
<p>You can choose which image is used for requests in the settings, for example, "Token/player's actor image," "Player avatar," "Token of the actor selected on the scene," and so on. If an image for the request wasn't found, an option window will appear when attempting to create a request, which you can also access by clicking the gear icon in the request window.</p> 

![Foundry_Virtual_Tabletop_V8xDqAttez](https://github.com/user-attachments/assets/4fae1615-b362-4784-a075-2cbc31c5c38b)
<p>Additionally, you can <strong>move the request window </strong>from under the chat to any free spot on the screen by selecting the corresponding option in the settings or <strong>hovering over the request window while holding down the "Shift" key and clicking LMB.</strong></p> 

![Foundry_Virtual_Tabletop_GYit8nraq2](https://github.com/user-attachments/assets/bf801d43-00c0-4e5e-aac7-5bf3c7c0e44c)
<p>You can return the request window back under the chat using the chat icon button in the free request window.</p> <p>Additionally, you can freely move the request window around the screen while it's not under the chat. You can also adjust the height and width of the request window in the module settings.</p>

Macro to call out top request
```
window.advancedRequests.gm_callout_top_request();
```

Macro to clear all requests
```
window.advancedRequests.load_queue_requests_LOCAL_QUEUE([]);
```

# TODOS:

Already working: advanced-requests page in GM settings
Implementation Notes:
- Use the same UI look, DOM placement and CSS structure as dice-calculator for the default (above chat message input) position.
- Use a single source of truth for the queue (e.g., a setting or in-memory object, synchronized via SocketLib). Copy `raise-my-hand`'s Implementation
- Modularize the code so the queue UI and logic can be reused regardless of UI state:  both docked and floating modes. 
- add options to match notification features of `raise-my-hand`

BASIC
5. Synchronization
   x All requests and queue changes should be synchronized across all clients (using SocketLib).

6. Accessibility
   - Ensure the UI is accessible and visually clear for all users.
   x GM should be able to customise an audio sound for each category of request.

1. Player Request Queue UI
   x Render a queue UI below (or above) the chat input, inside the chat sidebar.
   x Each request in the queue should display:
     x The player's name and image (configurable: token, avatar, etc.)
     x The request's importance level (Common, Important, Urgent), visually distinct.
   x Provide buttons for players to add a request at any level.

2. Request Management
   x Players can remove their own requests by clicking (LMB or RMB).
   x: GMs can remove any request with RMB, or "activate" a request with LMB (triggers a sound and chat message).


ADVANDED
3. Custom Images
   - Allow players to choose the image used for their request (token, avatar, etc.) via settings.
   - If no image is found, prompt the user to set one.
4. Movable/Detachable Window
   - Allow the request queue to be moved from under the chat to a free position on the screen (via settings or Shift+LMB).
   - Provide a button to return the queue to its default position.
   - Allow resizing the queue window via settings.

7. add playbook e2e tests

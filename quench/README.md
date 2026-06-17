# Simple Requests Quench harness

Foundry companion module **`simple-requests-tests`**: registers Quench batches for [Simple Requests](../README.md). UI flows stay in root Cypress ([`cypress/e2e/simple-requests-module.cy.js`](../cypress/e2e/simple-requests-module.cy.js)).

## Setup

1. From repo root: `npm install`
2. Copy [`fvtt.config.example.js`](./fvtt.config.example.js) → `quench/fvtt.config.js` and set `userDataPath` / `baseURL`
3. `npm run quench:build` or `npm run quench:watch` (writes to `Data/modules/simple-requests-tests`)
4. Foundry running with world **`simple_requests`**
5. Enable modules: **Quench**, **simple-requests**, **simple-requests-tests**, **socketlib**

## Commands (repo root)

| Script | Purpose |
|--------|---------|
| `npm run quench:watch` | Webpack watch → deploy test module |
| `npm run quench:build` | One-off production build |
| `npm run test:quench` | Cypress drives Quench UI (Foundry must be up) |
| `npm test` | Watch + `test:quench` via `concurrently` |
| `npm run test:all` | Unit tests + Quench Cypress |

## Quench batches

| Batch ID | Topic |
|----------|--------|
| `simple-requests.smoke` | Module active, socketlib, `window.SimplePrompts`, queue config |
| `simple-requests.settings` | Registered world settings |
| `simple-requests.api` | `openPlayerCalloutDialog` on module API (GM) |
| `simple-requests.queue` | Create / sort / remove via `SimplePrompts` (GM, no DOM) |

In-world: Quench sidebar → run batches. Headless: `npm run test:quench`.

## UI tests

Chat queue buttons, epic prompt overlay, and similar DOM checks are intentionally **not** in Quench. See [`docs/QUENCH_UI_DEFERRED.md`](./docs/QUENCH_UI_DEFERRED.md).

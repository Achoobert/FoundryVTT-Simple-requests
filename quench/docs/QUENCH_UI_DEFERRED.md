# UI coverage (Cypress, not Quench)

Simple Requests relies on Cypress for end-to-end UI tests:

- [`cypress/e2e/simple-requests-module.cy.js`](../../cypress/e2e/simple-requests-module.cy.js) — chat queue, request icons, epic prompt
- [`cypress/e2e/quench.cy.js`](../../cypress/e2e/quench.cy.js) — runs all Quench batches in-browser

Quench batches in this harness cover module smoke, settings registration, public API, and queue logic without DOM assertions.

Possible follow-ups (still Cypress-first): sheet interactions, multi-client queue sync, player (non-GM) request flows.

// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************


// Custom commands for Foundry VTT testing
Cypress.Commands.add('loginAsGM', () => {
   // Custom command to login as GM
   // This would need to be customized based on Foundry VTT's authentication
   cy.log('Logging in as GM')
   cy.get('select[name="userid"] option').then(options => {
      if (options.length > 1) {
         cy.get('select[name="userid"]').select(options[1].value, { force: true })
      }
   })
      
   // Click join game button
   cy.get('button[name="join"]', { timeout: 10000 }).should('be.visible').click({ force: true })
   cy.visit('/game')

   // // if foundry v12
   // // this should be visible:
   // // class="player-name self"
   // cy.get('.player-name.self', { timeout: 10000 }).should('be.visible')
   
   // if foundry v13
   // class="player-name ellipsis"
   cy.get('.player-name.ellipsis', { timeout: 10000 }).should('be.visible')

})

Cypress.Commands.add('loginAsPlayer', (playerName) => {
   // Custom command to login as a player
   cy.log(`Logging in as player: ${playerName}`)
   // Add actual login logic here
})

Cypress.Commands.add('createTestWorld', () => {
   // Custom command to create a test world
   cy.log('Creating test world')
   // Add world creation logic here
})

Cypress.Commands.add('enableModule', (moduleName) => {
   // Custom command to enable a module
   cy.log(`Enabling module: ${moduleName}`)
   // Add module enabling logic here
}) 


Cypress.Commands.add("disableIntercepts", () => {
   cy.intercept({ method: "GET" }, { log: false });
   cy.intercept({ resourceType: "fetch" }, { log: false });
   cy.intercept({ resourceType: "POST" }, { log: false });
});


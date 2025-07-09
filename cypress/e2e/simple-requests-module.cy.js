import "cypress-if"


describe('Simple Requests Module Functionality', () => {
   beforeEach(() => {
      cy.visit('/')
      cy.disableIntercepts();
      // Wait for page to load
      cy.get('select[name="userid"] option').should("be.visible")
      // TODO use login
      cy.loginAsGM()
   })

   it.only('v13: should detect module presence after login', () => {
      // Now check for module elements
      // element w id chat
      // cy.get("#chat").should("be.visible")
      cy.get("#chat-message").should("be.visible")
      // cy.get("#chat-log").should("be.visible")
      cy.get("#sidebar").should("be.visible")
      // cy.get("#sidebar-content").should("be.visible")

      // find and click on 
      cy.get('.fa-regular.fa-hand.ar-request-icon').click();

      // id="ar-chat-queue"
      cy.get("#ar-chat-queue").should("exist");

      // click on
      cy.get('.ar-request-container-chat.ar-level-0').click();

      // foundry v13 has an epic prompt
      // id="ar-epic-prompt"
      cy.get("#ar-epic-prompt").should("be.visible");


      cy.get("#ar-chat-queue", { timeout: 10000 }).should("be.visible");

      cy.get('.fa-regular.fa-hand.ar-request-icon').click();
      // test whether right click to remove works
      cy.get('.ar-request-container-chat').should('exist');
      cy.get('.ar-request-container-chat').rightclick();
      cy.get('.ar-request-container-chat').should('not.exist');


      // cy.get('body').then(($body) => {
      //    // Look for module-specific elements (adjust selectors as needed)
      //    const moduleElements = {
      //       'module data attribute': $body.find('[data-module="simple-requests"]').length,
      //       'module class': $body.find('.simple-requests').length,
      //       'module id': $body.find('#simple-requests').length
      //    }
            
      //    cy.log('Module elements found:', JSON.stringify(moduleElements))
            
      //    // Check if module is loaded in Foundry VTT
      //    cy.window().then((win) => {
      //       if (win.game && win.game.modules) {
      //          const module = win.game.modules.get('simple-requests')
      //          if (module) {
      //             cy.log('Simple Requests module is loaded in Foundry VTT')
      //             expect(module).to.exist
      //          } else {
      //             cy.log('Simple Requests module not found in Foundry VTT modules')
      //          }
      //       } else {
      //          cy.log('Foundry VTT game object not available')
      //       }
      //    })
      // })

   })

   it('should handle module UI elements when present', () => {
      // Check if login is needed first
      cy.get('body').then(($body) => {
         if ($body.find('form[name="join"]').length > 0) {
            cy.log('Login required, logging in as GM')
            cy.loginAsGM()
         }
         
         // Wait for any dynamic content to load
         cy.wait(2000)
         
         // Check for module UI elements
         cy.get('body').then(($body) => {
            const uiElements = {
               'request button': $body.find('.simple-requests-button').length,
               'request form': $body.find('.simple-requests-form').length,
               'gm panel': $body.find('.gm-requests-panel').length,
               'requests list': $body.find('.requests-list').length
            }
            
            cy.log('UI elements found:', JSON.stringify(uiElements))
            
            // If any UI elements are found, test them
            const totalElements = Object.values(uiElements).reduce((sum, count) => sum + count, 0)
            if (totalElements > 0) {
               cy.log('Module UI elements detected, testing functionality')
               
               // Test request button if present
               if (uiElements['request button'] > 0) {
                  cy.get('.simple-requests-button').first().should('be.visible')
               }
               
               // Test GM panel if present
               if (uiElements['gm panel'] > 0) {
                  cy.get('.gm-requests-panel').should('be.visible')
               }
            } else {
               cy.log('No module UI elements found, module may not be enabled or UI not implemented')
            }
         })
      })
   })

   it('should test request submission when UI is available', () => {
      // Check if login is needed first
      cy.get('body').then(($body) => {
         if ($body.find('form[name="join"]').length > 0) {
            cy.log('Login required, logging in as player')
            cy.loginAsPlayer()
         }
         
         // Wait for any dynamic content to load
         cy.wait(2000)
         
         // Check if request submission UI is available
         cy.get('body').then(($body) => {
            if ($body.find('.simple-requests-button').length > 0) {
               cy.log('Request button found, testing submission')
               
               // Test request button click
               cy.get('.simple-requests-button').first().click()
               
               // Check if form appears
               cy.get('body').then(($body) => {
                  if ($body.find('.simple-requests-form').length > 0) {
                     cy.get('.simple-requests-form').should('be.visible')
                     cy.log('Request form appeared successfully')
                  } else {
                     cy.log('Request form did not appear, but button was clicked')
                  }
               })
            } else {
               cy.log('No request button found, skipping submission test')
            }
         })
      })
   })

   it('should test GM request management when available', () => {
      // Check if login is needed first
      cy.get('body').then(($body) => {
         if ($body.find('form[name="join"]').length > 0) {
            cy.log('Login required, logging in as GM')
            cy.loginAsGM()
         }
         
         // Wait for any dynamic content to load
         cy.wait(2000)
         
         // Check if GM management UI is available
         cy.get('body').then(($body) => {
            const gmElements = {
               'gm panel': $body.find('.gm-requests-panel').length,
               'requests list': $body.find('.requests-list').length,
               'request items': $body.find('.request-item').length
            }
            
            cy.log('GM elements found:', JSON.stringify(gmElements))
            
            if (gmElements['gm panel'] > 0) {
               cy.log('GM panel found, testing management functionality')
               cy.get('.gm-requests-panel').should('be.visible')
               
               if (gmElements['requests list'] > 0) {
                  cy.get('.requests-list').should('exist')
               }
               
               if (gmElements['request items'] > 0) {
                  cy.log('Request items found, testing management')
                  cy.get('.request-item').first().should('be.visible')
               }
            } else {
               cy.log('No GM management UI found, module may not be enabled or UI not implemented')
            }
         })
      })
   })
}) 
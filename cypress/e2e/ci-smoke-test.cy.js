describe('Foundry VTT CI Smoke Test', () => {
   beforeEach(() => {
      cy.visit('/')
      // Wait for page to load
      cy.get(".join").should("be.visible")
   })

   it('should load Foundry VTT and detect page state', () => {
      // Check if the page loads
      cy.get('body').should('be.visible')
      
      // Check current URL and page state
      cy.url().then((url) => {
         cy.log(`Current URL: ${url}`)
         
         if (url.includes('/setup')) {
            cy.log('Foundry VTT is in setup mode')
            cy.get('body').should('contain', 'Setup')
         } else if (url.includes('/join')) {
            cy.log('Foundry VTT is showing join page')
            // Check for login form elements
            cy.get('body').then(($body) => {
               if ($body.find('form[name="join"]').length > 0) {
                  cy.get('form[name="join"]').should('be.visible')
                  cy.get('select[name="userid"]').should('be.visible')
                  cy.get('button[name="join"]').should('be.visible')
               }
            })
         } else {
            cy.log('Foundry VTT is in main application mode')
            cy.get('#app').should('exist')
         }
      })
   })

   it('should handle login when form is present', () => {
      // Check if login form is present
      cy.get('body').then(($body) => {
         // id="join-game"
         cy.get('#join-game').should("exist")
         cy.log('Login form found, attempting GM login')
         cy.loginAsGM()
         cy.get('body').should('not.contain', 'Loading...')
      })
   })
}) 
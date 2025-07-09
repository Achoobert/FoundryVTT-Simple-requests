const { defineConfig } = require('cypress')

module.exports = defineConfig({
   e2e: {
      baseUrl: 'http://localhost:30000',
      viewportWidth: 1280,
      viewportHeight: 768,
      video: false,
      screenshotOnRunFailure: true,
      defaultCommandTimeout: 15000,
      requestTimeout: 15000,
      responseTimeout: 15000,
      pageLoadTimeout: 60000,
      retries: {
         runMode: 2,
         openMode: 0
      },
      setupNodeEvents(on, config) {
         // implement node event listeners here
         on('task', {
            log(message) {
               console.log(message)
               return null
            }
         })
      },
   },
   component: {
      devServer: {
         framework: 'react',
         bundler: 'vite',
      },
   },
}) 
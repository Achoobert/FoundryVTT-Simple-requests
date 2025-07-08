const { defineConfig } = require('cypress')

module.exports = defineConfig({
   e2e: {
      baseUrl: 'http://localhost:30000',
      viewportWidth: 1280,
      viewportHeight: 720,
      video: false,
      screenshotOnRunFailure: true,
      defaultCommandTimeout: 10000,
      requestTimeout: 10000,
      responseTimeout: 10000,
      setupNodeEvents(on, config) {
         // implement node event listeners here
      },
   },
   component: {
      devServer: {
         framework: 'react',
         bundler: 'vite',
      },
   },
}) 
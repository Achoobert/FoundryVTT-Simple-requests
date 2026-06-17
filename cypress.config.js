const { defineConfig } = require('cypress')
const fs = require('fs')
const path = require('path')

function resolveBaseUrl() {
   const defaultUrl = 'http://localhost:30000'
   const configPath = path.join(__dirname, 'quench', 'fvtt.config.js')
   if (!fs.existsSync(configPath)) return defaultUrl
   const text = fs.readFileSync(configPath, 'utf8')
   const match = text.match(/baseURL:\s*['"]([^'"]+)['"]/)
   return match ? match[1] : defaultUrl
}

module.exports = defineConfig({
   e2e: {
      baseUrl: resolveBaseUrl(),
      viewportWidth: 1280,
      viewportHeight: 770,
      video: false,
      screenshotOnRunFailure: true,
      defaultCommandTimeout: 10000,
      requestTimeout: 10000,
      responseTimeout: 10000,
      setupNodeEvents(on, config) {
         // implement node event listeners here
      },
      env: {
         ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
      }
   },
   component: {
      devServer: {
         framework: 'react',
         bundler: 'vite',
      },
   },
})

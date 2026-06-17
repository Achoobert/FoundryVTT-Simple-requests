/**
 * Copy to fvtt.config.js and set userDataPath / baseURL for your Foundry install.
 * userDataPath: Foundry user data folder (e.g. ~/Library/Application Support/FoundryVTT)
 * baseURL: same host/port Cypress uses (also read by root cypress.config.js when present)
 */

const developmentOptions = {
  userDataPath: '/path/to/FoundryVTT',
  baseURL: 'http://localhost:30000'
}

export default developmentOptions

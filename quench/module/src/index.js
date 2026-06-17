/* global Hooks */
import registerSmoke from './quench/batches/smoke.js'
import registerSettings from './quench/batches/settings.js'
import registerApi from './quench/batches/api.js'
import registerQueue from './quench/batches/queue.js'
import registerDisplayName from './quench/batches/display-name.js'

const BATCH_REGISTRARS = [
  registerSmoke,
  registerSettings,
  registerApi,
  registerQueue,
  registerDisplayName
]

Hooks.on('quenchReady', (quench) => {
  for (const register of BATCH_REGISTRARS) {
    register(quench)
  }
})

/* global game */
import { MODULE_ID } from '../helpers.js'

export default function register(quench) {
  quench.registerBatch(
    'simple-requests.api',
    (context) => {
      const { describe, it, assert } = context

      describe('Simple Requests public API', function () {
        it('exposes openPlayerCalloutDialog for GM', function () {
          if (!game.user.isGM) {
            this.skip()
          }
          const mod = game.modules.get(MODULE_ID)
          assert.isObject(mod.api)
          assert.isFunction(mod.api.openPlayerCalloutDialog)
        })
      })
    },
    { displayName: 'Public API' }
  )
}

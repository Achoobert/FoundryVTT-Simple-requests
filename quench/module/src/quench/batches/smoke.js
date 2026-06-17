/* global CONFIG, game, window */
import { MODULE_ID } from '../helpers.js'

export default function register(quench) {
  quench.registerBatch(
    'simple-requests.smoke',
    (context) => {
      const { describe, it, assert } = context

      describe('Simple Requests module', function () {
        it('is active in this world', function () {
          const mod = game.modules.get(MODULE_ID)
          assert.isOk(mod, 'simple-requests module missing')
          assert.isTrue(mod.active, 'simple-requests is not enabled')
        })

        it('has socketlib available', function () {
          const socketlib = game.modules.get('socketlib')
          assert.isOk(socketlib, 'socketlib module missing')
          assert.isTrue(socketlib.active, 'socketlib is not enabled')
        })

        it('exposes SimplePrompts on window', function () {
          assert.isObject(window.SimplePrompts)
          assert.isFunction(window.SimplePrompts.createRequest)
          assert.isFunction(window.SimplePrompts.removeRequest)
        })

        it('initializes CONFIG.SMP_REQUESTS.queue', function () {
          assert.isObject(CONFIG.SMP_REQUESTS)
          assert.isArray(CONFIG.SMP_REQUESTS.queue)
        })
      })
    },
    { displayName: 'Module smoke' }
  )
}

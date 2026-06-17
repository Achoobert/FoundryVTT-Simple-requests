/* global game */
import { EXPECTED_SETTING_KEYS, MODULE_ID } from '../helpers.js'

export default function register(quench) {
  quench.registerBatch(
    'simple-requests.settings',
    (context) => {
      const { describe, it, assert } = context

      describe('Simple Requests settings', function () {
        for (const key of EXPECTED_SETTING_KEYS) {
          it('registers setting: ' + key, function () {
            assert.isDefined(
              game.settings.settings.get(`${MODULE_ID}.${key}`),
              'Missing setting: ' + key
            )
          })
        }
      })
    },
    { displayName: 'Settings' }
  )
}

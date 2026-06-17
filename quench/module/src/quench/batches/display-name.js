/* global game */
import { MODULE_ID } from '../helpers.js'

function expectedAssignedActorName(user) {
  const char = user?.character
  if (!char) return null
  if (typeof char === 'object' && char.name) return char.name
  const id = typeof char === 'string' ? char : char?.id
  return id ? game.actors.get(id)?.name ?? null : null
}

export default function register(quench) {
  quench.registerBatch(
    'simple-requests.display-name',
    (context) => {
      const { describe, it, beforeEach, afterEach, assert } = context
      let savedUseCharacterName

      describe('Request display names', function () {
        beforeEach(function () {
          savedUseCharacterName = game.settings.get(MODULE_ID, 'useCharacterName')
        })

        afterEach(async function () {
          await game.settings.set(MODULE_ID, 'useCharacterName', savedUseCharacterName)
        })

        function api() {
          return game.modules.get(MODULE_ID).api
        }

        it('getRequestDisplayName uses user name when useCharacterName is off', async function () {
          await game.settings.set(MODULE_ID, 'useCharacterName', false)
          assert.equal(api().getRequestDisplayName(game.user), game.user.name)
        })

        it('getRequestDisplayName respects useCharacterName when on', async function () {
          await game.settings.set(MODULE_ID, 'useCharacterName', true)
          const actorName = expectedAssignedActorName(game.user)
          const expected = actorName || game.user.name
          assert.equal(api().getRequestDisplayName(game.user), expected)
        })

        it('getQueueItemDisplayName live-resolves when useCharacterName is on', async function () {
          await game.settings.set(MODULE_ID, 'useCharacterName', true)
          const expected = api().getRequestDisplayName(game.user) || 'Player'
          const item = { userId: game.user.id, name: 'stale' }
          assert.equal(api().getQueueItemDisplayName(item), expected)
        })
      })
    },
    { displayName: 'Display names' }
  )
}

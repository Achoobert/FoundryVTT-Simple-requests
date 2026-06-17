/* global CONFIG, game, window */
import { clearRequestQueue, sampleRequest } from '../helpers.js'

export default function register(quench) {
  quench.registerBatch(
    'simple-requests.queue',
    (context) => {
      const { describe, it, beforeEach, afterEach, assert } = context

      describe('Request queue (SimplePrompts)', function () {
        beforeEach(function () {
          if (!game.user.isGM) {
            this.skip()
          }
          clearRequestQueue()
        })

        afterEach(function () {
          clearRequestQueue()
        })

        it('adds a request via createRequest', async function () {
          const data = sampleRequest({ level: 0 })
          await window.SimplePrompts.createRequest(data)
          assert.lengthOf(CONFIG.SMP_REQUESTS.queue, 1)
          assert.equal(CONFIG.SMP_REQUESTS.queue[0].userId, data.userId)
        })

        it('sorts higher urgency before lower', async function () {
          const low = sampleRequest({ level: 0, timestamp: 1000 })
          const high = sampleRequest({
            userId: 'quench-test-high-urgency',
            name: 'High',
            level: 2,
            timestamp: 2000
          })
          await window.SimplePrompts.createRequest(low)
          await window.SimplePrompts.createRequest(high)
          assert.equal(CONFIG.SMP_REQUESTS.queue[0].userId, high.userId)
          assert.equal(CONFIG.SMP_REQUESTS.queue[1].userId, low.userId)
        })

        it('sorts same level by timestamp (older first)', async function () {
          const older = sampleRequest({
            userId: 'quench-test-older',
            name: 'Older',
            level: 1,
            timestamp: 100
          })
          const newer = sampleRequest({
            userId: 'quench-test-newer',
            name: 'Newer',
            level: 1,
            timestamp: 200
          })
          await window.SimplePrompts.createRequest(newer)
          await window.SimplePrompts.createRequest(older)
          assert.equal(CONFIG.SMP_REQUESTS.queue[0].userId, older.userId)
          assert.equal(CONFIG.SMP_REQUESTS.queue[1].userId, newer.userId)
        })

        it('removes a request via removeRequest', async function () {
          const data = sampleRequest()
          await window.SimplePrompts.createRequest(data)
          await window.SimplePrompts.removeRequest(data.userId)
          assert.lengthOf(CONFIG.SMP_REQUESTS.queue, 0)
        })
      })
    },
    { displayName: 'Request queue' }
  )
}

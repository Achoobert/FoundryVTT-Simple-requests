/* global CONFIG, game */

export const MODULE_ID = 'simple-requests'

/** World settings registered in scripts/settings.js */
export const EXPECTED_SETTING_KEYS = [
  'useCharacterName',
  'soundCreate',
  'soundOnPromptActivate',
  'promptShowSound',
  'epicPromptHeadline',
  'soundActivate',
  'reqClickSound',
  'firstRequest',
  'firstRequestSound',
  'secondRequest',
  'secondRequestSound',
  'thirdRequest',
  'thirdRequestSound',
  'queueAllPlayersOnly',
  'queue'
]

export function clearRequestQueue() {
  if (CONFIG.SMP_REQUESTS) {
    CONFIG.SMP_REQUESTS.queue = []
  }
}

export function sampleRequest(overrides = {}) {
  const user = game.user
  return {
    userId: user.id,
    name: user.name,
    img: user.avatar,
    level: 0,
    timestamp: Date.now(),
    ...overrides
  }
}

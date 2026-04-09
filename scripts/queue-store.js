import { log_socket } from "./debug-log.js";

if (!window.CONFIG) window.CONFIG = {};
if (!CONFIG.SMP_REQUESTS) CONFIG.SMP_REQUESTS = {};
if (!Array.isArray(CONFIG.SMP_REQUESTS.queue)) CONFIG.SMP_REQUESTS.queue = [];

function sortByUrgencyThenAge(a, b) {
   if (b.level !== a.level) return b.level - a.level;
   return a.timestamp - b.timestamp;
}

export function pop_request_LOCAL_QUEUE() {
   const queue = CONFIG.SMP_REQUESTS.queue || [];
   log_socket("old", queue);
   const sorted = queue.slice().sort(sortByUrgencyThenAge);
   let selected_request = sorted[0] || sorted;
   remove_request_LOCAL_QUEUE(selected_request.userId);
   log_socket("new", queue);
   log_socket("pop_request_LOCAL_QUEUE", selected_request);
   return selected_request;
}

export function get_requests_LOCAL_QUEUE() {
   const queue = CONFIG.SMP_REQUESTS.queue || [];
   return queue.slice().sort(sortByUrgencyThenAge);
}

/**
 * Add a new request to the queue, including a timestamp. Insert relative to urgency and recency.
 * @param {Object} requestData - Must include userId, name, img, level
 */
export function add_new_request_LOCAL_QUEUE(requestData) {
   let queue = CONFIG.SMP_REQUESTS.queue || [];
   const existing = queue.find(r => r.userId === requestData.userId);
   if (existing && existing.level === requestData.level) {
      return queue;
   }
   if (!requestData.timestamp) requestData.timestamp = Date.now();
   queue = queue.filter(r => r.userId !== requestData.userId);
   queue.push(requestData);
   queue = queue.sort(sortByUrgencyThenAge);
   CONFIG.SMP_REQUESTS.queue = queue;
   return queue;
}

/**
 * Remove a request from the queue. Defaults to removing the newest and most urgent for a user.
 * @param {string} userId
 */
export function remove_request_LOCAL_QUEUE(userId) {
   let queue = CONFIG.SMP_REQUESTS.queue || [];
   if (typeof userId === "undefined" || userId === null) {
      if (queue.length > 0) queue.splice(0, 1);
   } else {
      queue = queue.filter(r => r.userId !== userId);
   }
   CONFIG.SMP_REQUESTS.queue = queue;
   return queue;
}

/**
 * Load a queue from another user (e.g., after refresh or join)
 * @param {Array} newQueue
 */
export function load_queue_requests_LOCAL_QUEUE(newQueue) {
   if (!Array.isArray(newQueue)) return;
   CONFIG.SMP_REQUESTS.queue = newQueue.slice().sort(sortByUrgencyThenAge);
   return CONFIG.SMP_REQUESTS.queue;
}

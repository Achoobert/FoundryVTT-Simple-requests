/** Enable when debugging socket / queue flow */
export function log_socket(str, obj) {
   const message = "simple-requests: " + str;
   console.log({ message, data: obj });
}

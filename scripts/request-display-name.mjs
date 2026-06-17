/**
 * Pure display-name logic (unit-tested without Foundry globals).
 * @param {object | null | undefined} user
 * @param {boolean} useCharacterName
 * @param {string | null | undefined} actorName
 * @returns {string}
 */
export function resolveRequestDisplayName(user, useCharacterName, actorName) {
   if (!user) return "Player";
   if (useCharacterName) return actorName || user.name;
   return user.name;
}

/**
 * @param {object | null | undefined} user
 * @param {(id: string) => string | null | undefined} getActorNameById
 * @returns {string | null}
 */
export function resolveAssignedActorName(user, getActorNameById) {
   if (!user?.character) return null;
   const c = user.character;
   if (typeof c === "string") {
      return getActorNameById(c) ?? null;
   }
   if (typeof c === "object" && c !== null) {
      if (typeof c.name === "string" && c.name) return c.name;
      if (typeof c.id === "string") {
         return getActorNameById(c.id) ?? null;
      }
   }
   return null;
}

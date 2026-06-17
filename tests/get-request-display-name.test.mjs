import test from "node:test";
import assert from "node:assert/strict";
import {
   resolveAssignedActorName,
   resolveRequestDisplayName
} from "../scripts/request-display-name.mjs";

test("resolveRequestDisplayName uses character name when enabled, else user name", () => {
   const user = { name: "AccountName", character: "actorId1" };

   assert.equal(resolveRequestDisplayName(null, true, "Hero"), "Player");
   assert.equal(resolveRequestDisplayName(user, false, "Hero"), "AccountName");
   assert.equal(resolveRequestDisplayName(user, true, "Hero"), "Hero");
   assert.equal(resolveRequestDisplayName(user, true, null), "AccountName");

   const actorDoc = { id: "actorId1", name: "InlineHero" };
   assert.equal(
      resolveAssignedActorName({ character: actorDoc }, () => "FromCollection"),
      "InlineHero"
   );
   assert.equal(
      resolveAssignedActorName({ character: "missingId" }, () => undefined),
      null
   );
   assert.equal(
      resolveAssignedActorName({ character: "actorId1" }, (id) => (id === "actorId1" ? "CollectionHero" : null)),
      "CollectionHero"
   );
});

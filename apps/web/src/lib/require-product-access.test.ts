import test from "node:test";
import assert from "node:assert/strict";
import { decideEnforcement } from "./product-enforcement";

test("product enforcement matrix preserves off and shadow behavior", () => {
  const denied = { allowed: false, reason: "NO_RECORD_LEGACY" as const, status: null, graceUntil: null, graceDaysLeft: null };
  const allowed = { ...denied, allowed: true, reason: "ACTIVE" as const };

  assert.deepEqual(decideEnforcement("off", denied), { block: false, wouldDeny: false });
  assert.deepEqual(decideEnforcement("shadow", denied), { block: false, wouldDeny: true });
  assert.deepEqual(decideEnforcement("enforce", denied), { block: true, wouldDeny: true });
  assert.deepEqual(decideEnforcement("enforce", allowed), { block: false, wouldDeny: false });
});

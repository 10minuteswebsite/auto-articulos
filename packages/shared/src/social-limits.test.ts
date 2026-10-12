import assert from "node:assert/strict";
import test from "node:test";
import { resolveSocialDailyLimit } from "./social-limits";

test("sin valor guardado o inválido, el cupo es 1", () => {
  assert.equal(resolveSocialDailyLimit(null, "threads"), 1);
  assert.equal(resolveSocialDailyLimit({}, "threads"), 1);
  assert.equal(resolveSocialDailyLimit({ threads: "5" }, "threads"), 1);
  assert.equal(resolveSocialDailyLimit({ threads: 2.5 }, "threads"), 1);
  assert.equal(resolveSocialDailyLimit({ threads: -1 }, "threads"), 1);
  assert.equal(resolveSocialDailyLimit([5], "threads"), 1);
});

test("el cupo guardado se respeta y 0 bloquea la red", () => {
  assert.equal(resolveSocialDailyLimit({ threads: 5 }, "threads"), 5);
  assert.equal(resolveSocialDailyLimit({ threads: 0 }, "threads"), 0);
  assert.equal(resolveSocialDailyLimit({ threads: 5 }, "bluesky"), 1);
});

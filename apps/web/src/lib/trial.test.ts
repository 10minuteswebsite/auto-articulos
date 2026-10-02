import assert from "node:assert/strict";
import test from "node:test";
import { hasTrialAccess } from "./trial";

const expiredTrial = {
  role: "user",
  isTrialSignup: true,
  trialStartedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  trialUnlocked: false,
};

test("el interruptor apagado conserva acceso aunque el trial haya vencido", () => {
  assert.equal(hasTrialAccess(expiredTrial, false), true);
});

test("el interruptor encendido conserva la regla actual", () => {
  assert.equal(hasTrialAccess(expiredTrial, true), false);
  assert.equal(hasTrialAccess({ ...expiredTrial, trialUnlocked: true }, true), true);
});

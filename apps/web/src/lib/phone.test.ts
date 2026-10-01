import test from "node:test";
import assert from "node:assert/strict";
import { normalizeE164Phone, normalizeLegacyPhone } from "./phone";

test("normalizes explicitly international formatting", () => {
  assert.equal(normalizeE164Phone("+1 (415) 555-0100"), "+14155550100");
  assert.equal(normalizeE164Phone("00 34 606 915 173"), "+34606915173");
});

test("does not guess an unknown local country", () => {
  assert.equal(normalizeE164Phone("606 915 173"), null);
  assert.equal(normalizeLegacyPhone("606 915 173"), null);
});

test("normalizes known legacy NANP values without changing digits", () => {
  assert.equal(normalizeLegacyPhone("7861234567"), "+17861234567");
  assert.equal(normalizeLegacyPhone("17861234567"), "+17861234567");
});

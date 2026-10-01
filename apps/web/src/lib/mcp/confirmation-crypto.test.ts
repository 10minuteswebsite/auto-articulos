import test from "node:test";
import assert from "node:assert/strict";
import {
  generateConfirmationToken,
  hashConfirmationToken,
  MCP_CONFIRMATION_PREFIX,
  operationHash,
} from "./confirmation-crypto";

test("confirmation tokens are opaque, unique and hashable", () => {
  const first = generateConfirmationToken();
  const second = generateConfirmationToken();
  assert.ok(first.startsWith(MCP_CONFIRMATION_PREFIX));
  assert.notEqual(first, second);
  assert.equal(hashConfirmationToken(first), hashConfirmationToken(first));
  assert.notEqual(hashConfirmationToken(first), first);
});

test("operation hashes are stable for the exact same operation", () => {
  const operation = { ids: ["a", "b"], disableIndexing: false };
  assert.equal(operationHash(operation), operationHash({ ...operation }));
  assert.notEqual(operationHash(operation), operationHash({ ...operation, disableIndexing: true }));
});

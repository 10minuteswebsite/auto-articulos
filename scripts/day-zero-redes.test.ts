import assert from "node:assert/strict";
import test from "node:test";
import { planRedesChanges, REDES_FIELDS } from "./day-zero-redes";

const user = (id: string, role = "user", value = false) => ({
  id, role, ...Object.fromEntries(REDES_FIELDS.map((field) => [field, value])),
});

test("planifica usuarios normales y conserva sus valores previos", () => {
  const result = planRedesChanges([user("u1"), user("admin", "admin"), user("u2", "user", true)]);
  assert.deepEqual(result, [{ id: "u1", oldValues: Object.fromEntries(REDES_FIELDS.map((field) => [field, false])) }]);
});

test("es idempotente cuando todos los campos ya están activos", () => {
  assert.deepEqual(planRedesChanges([user("u1", "user", true)]), []);
});

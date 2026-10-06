import assert from "node:assert/strict";
import test from "node:test";
import { REDES_PUBLISHING_FIELDS, redesProfile } from "./redes-profile";

test("la cuenta vacía recibe todos los campos actuales de Redes y el módulo", () => {
  const profile = redesProfile();
  assert.ok(profile);
  assert.deepEqual(REDES_PUBLISHING_FIELDS.map((field) => profile[field]), Array(9).fill(true));
  assert.deepEqual(JSON.parse(profile.disabledModules), { "oportunidades-redes": "enabled" });
});

test("conserva otros overrides y habilita solo oportunidades-redes", () => {
  const profile = redesProfile({
    disabledModules: JSON.stringify({ historial: "disabled", "oportunidades-redes": "disabled" }),
  });
  assert.deepEqual(JSON.parse(profile!.disabledModules), {
    historial: "disabled",
    "oportunidades-redes": "enabled",
  });
});

test("el formato histórico de array elimina solo el módulo social", () => {
  const profile = redesProfile({ disabledModules: JSON.stringify(["historial", "oportunidades-redes"]) });
  assert.deepEqual(JSON.parse(profile!.disabledModules), ["historial"]);
});

test("un módulo ya habilitado y el perfil son idempotentes", () => {
  const first = redesProfile({ disabledModules: JSON.stringify({ "oportunidades-redes": "enabled" }) });
  const second = redesProfile({ disabledModules: first!.disabledModules });
  assert.deepEqual(second, first);
});

test("los administradores no reciben ningún patch", () => {
  assert.equal(redesProfile({ role: "admin", disabledModules: "{\"historial\":\"disabled\"}" }), null);
});

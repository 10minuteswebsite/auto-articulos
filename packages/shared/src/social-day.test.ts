import assert from "node:assert/strict";
import test from "node:test";
import { startOfSocialDay } from "./social-day";

test("verano (EDT, UTC-4): el día empieza a las 04:00 UTC", () => {
  assert.equal(startOfSocialDay(new Date("2026-10-12T19:30:00Z")).toISOString(), "2026-10-12T04:00:00.000Z");
  // 02:00 UTC del 13 = 22:00 del 12 en Florida: sigue siendo el día 12.
  assert.equal(startOfSocialDay(new Date("2026-10-13T02:00:00Z")).toISOString(), "2026-10-12T04:00:00.000Z");
  // 04:00 UTC del 13 = medianoche en Florida: empieza el día 13.
  assert.equal(startOfSocialDay(new Date("2026-10-13T04:00:00Z")).toISOString(), "2026-10-13T04:00:00.000Z");
});

test("invierno (EST, UTC-5): el día empieza a las 05:00 UTC", () => {
  assert.equal(startOfSocialDay(new Date("2026-12-15T12:00:00Z")).toISOString(), "2026-12-15T05:00:00.000Z");
  assert.equal(startOfSocialDay(new Date("2026-12-15T04:59:00Z")).toISOString(), "2026-12-14T05:00:00.000Z");
});

test("cambio de horario: el horario de verano termina el 1 de noviembre de 2026", () => {
  // Ese día empieza aún en EDT (04:00 UTC) y dura 25 horas.
  assert.equal(startOfSocialDay(new Date("2026-11-01T12:00:00Z")).toISOString(), "2026-11-01T04:00:00.000Z");
  assert.equal(startOfSocialDay(new Date("2026-11-02T12:00:00Z")).toISOString(), "2026-11-02T05:00:00.000Z");
});

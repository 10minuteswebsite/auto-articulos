import assert from "node:assert/strict";
import test from "node:test";
import { startOfSocialDay, startOfSocialMonth } from "./social-day";

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

test("caso Nancy Cruz: 5 artículos a las 02:09 UTC del 14 son del día 13 en Florida", () => {
  const publicado = new Date("2026-10-14T02:09:10Z");
  const ahora = new Date("2026-10-14T14:00:00Z"); // mañana del 14 en Florida
  assert.ok(publicado < startOfSocialDay(ahora));
});

test("el mes de Florida empieza el día 1 a medianoche de Florida", () => {
  // 02:00 UTC del 1 de noviembre = 22:00 del 31 de octubre en Florida: sigue octubre.
  assert.equal(startOfSocialMonth(new Date("2026-11-01T02:00:00Z")).toISOString(), "2026-10-01T04:00:00.000Z");
  assert.equal(startOfSocialMonth(new Date("2026-12-15T12:00:00Z")).toISOString(), "2026-12-01T05:00:00.000Z");
});

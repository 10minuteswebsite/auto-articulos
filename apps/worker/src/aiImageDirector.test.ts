import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetBriefing } from "./aiImageGenerator";
import { DIRECTOR_PROMPT_V2 } from "./directorPromptV2";

// El parser de decideCreativeDirection exige `text that reads: "mensaje"` en la respuesta
// del director. El prompt debe pedir exactamente esa forma y la línea de ejemplo debe cumplirla.
test("el prompt del director v2 conserva el contrato de salida con el parser", () => {
  assert.ok(DIRECTOR_PROMPT_V2.includes('text that reads: "TITULAR EN ESPAÑOL"'));
  const sample = 'Bright daylight candid phone photo, vertical 9:16: a family at a sunny table. Baked Spanish headline in a clean area (clear sky, never over faces), bold condensed white letters with high-contrast text that reads: "¿YA TIENES TU PLAN?". Use only ONE attached logo. No prices.';
  const match = sample.match(/^(.*?)text that reads:\s*["“]([^"”]+)["”]/is);
  assert.ok(match);
  assert.equal(match[2], "¿YA TIENES TU PLAN?");
});

test("el prompt v2 conoce los materiales de marca y los formatos de las redes", () => {
  for (const needle of ["LOGO", "FOTO DE LA PERSONA", "Persona en ESTA pieza", "vertical 2:3", "9:16", "4:5", "SOLO UNA"]) {
    assert.ok(DIRECTOR_PROMPT_V2.includes(needle), `falta: ${needle}`);
  }
});

test("el briefing lista los adjuntos en orden: foto del artículo, logos, persona", () => {
  const text = buildAssetBriefing({ logoCount: 2, personPhotoCount: 3, includePerson: true });
  assert.match(text, /1\) foto del artículo.*2\) logo principal.*3\) logo alternativo.*4\) foto de la persona/);
  assert.match(text, /Logos disponibles: 2/);
  assert.match(text, /Fotos de la persona subidas: 3\. Persona en ESTA pieza: sí/);
});

test("sin logos ni foto de la persona el briefing no inventa adjuntos", () => {
  const text = buildAssetBriefing({ logoCount: 0, personPhotoCount: 0, includePerson: true });
  assert.ok(!/logo principal|foto de la persona \(/.test(text));
  assert.match(text, /Persona en ESTA pieza: no/);
});

test("con fotos subidas pero sin permiso de usarlas, la persona no aparece", () => {
  const text = buildAssetBriefing({ logoCount: 1, personPhotoCount: 2, includePerson: false });
  assert.match(text, /Persona en ESTA pieza: no/);
  assert.ok(!text.includes("foto de la persona (su rostro real)"));
});

import { mergeDirectorPrompt, DIRECTOR_ADDENDUM_MARKER } from "./directorPromptV2";

test("la guía se añade al prompt del panel sin reemplazarlo y no se duplica", () => {
  const panel = "# ROL\n\nEres un DIRECTOR CREATIVO SENIOR...\n\nLA SALIDA FINAL ES UNA SOLA LÍNEA.";
  const once = mergeDirectorPrompt(panel);
  assert.ok(once.startsWith(panel));
  assert.equal(once.split(DIRECTOR_ADDENDUM_MARKER).length - 1, 1);
  const twice = mergeDirectorPrompt(once);
  assert.equal(twice, once);
  assert.ok(once.includes("Persona en ESTA pieza"));
});

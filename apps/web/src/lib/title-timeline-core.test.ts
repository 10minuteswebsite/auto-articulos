import { test } from "node:test";
import assert from "node:assert/strict";
import { hitosDesdeEventos, iconoDeEstado } from "./title-timeline-core";

test("de decenas de pasos técnicos solo salen los hitos que entiende una persona", () => {
  const mensajes = [
    "Diagnóstico de guardado: sigue en el formulario=false, botón deshabilitado=null",
    "DIAGNÓSTICO [tras el FAQ]: #type=2 chars #titlees=no existe",
    "Sitemap enviado a Google Search Console (envío diario).",
    "Artículo publicado con éxito.",
    "Imagen generada.",
    "✓ Artículo generado con éxito por OpenAI. Título: \"X\"",
    "Validando si el artículo está repetido...",
    "Sitemap enviado a Google Search Console (envío diario).",
  ];
  assert.deepEqual(hitosDesdeEventos(mensajes), [
    "Se revisó que no existiera ya un artículo igual",
    "La inteligencia artificial escribió el artículo",
    "Se creó la imagen de portada",
    "Se publicó en tu sitio",
    "Se avisó a Google de que hay contenido nuevo",
  ]);
  assert.deepEqual(hitosDesdeEventos([]), []);
});

test("el estado se muestra como ícono", () => {
  assert.equal(iconoDeEstado("success"), "ok");
  assert.equal(iconoDeEstado("error"), "error");
  assert.equal(iconoDeEstado("cancelled"), "cancelado");
  assert.equal(iconoDeEstado("processing"), "espera");
});

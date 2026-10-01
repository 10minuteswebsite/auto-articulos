import { test } from "node:test";
import assert from "node:assert/strict";
import { hasSocialPublishingApproval, hasSocialModuleAccess } from "./social-access";

test("oculta difusión para un usuario sin aprobaciones de redes o blogs", () => {
  assert.equal(
    hasSocialPublishingApproval({ role: "user" }),
    false,
  );
});

test("muestra difusión cuando Administración aprueba una red o blog", () => {
  assert.equal(
    hasSocialPublishingApproval({ role: "user", allowBloggerPublishing: true }),
    true,
  );
});

test("los administradores conservan acceso para soporte", () => {
  assert.equal(
    hasSocialPublishingApproval({ role: "admin" }),
    true,
  );
});

// Instancia superior del módulo (1/10/2026): el administrador aprueba o
// quita la pantalla entera, aparte de qué redes concretas puede usar.
test("módulo: sin decisión del administrador, se mantiene el comportamiento histórico", () => {
  assert.equal(hasSocialModuleAccess({ role: "user" }), false);
  assert.equal(
    hasSocialModuleAccess({ role: "user", allowBloggerPublishing: true }),
    true,
  );
});

test("módulo: 'Habilitado' lo muestra aunque no tenga ninguna red aprobada todavía", () => {
  assert.equal(
    hasSocialModuleAccess({
      role: "user",
      disabledModules: JSON.stringify({ "oportunidades-redes": "enabled" }),
    }),
    true,
  );
});

test("módulo: 'Deshabilitado' lo oculta aunque tenga redes aprobadas", () => {
  assert.equal(
    hasSocialModuleAccess({
      role: "user",
      allowBloggerPublishing: true,
      disabledModules: JSON.stringify({ "oportunidades-redes": "disabled" }),
    }),
    false,
  );
});

test("módulo: los administradores siempre lo tienen, incluso 'Deshabilitado'", () => {
  assert.equal(
    hasSocialModuleAccess({
      role: "admin",
      disabledModules: JSON.stringify({ "oportunidades-redes": "disabled" }),
    }),
    true,
  );
});

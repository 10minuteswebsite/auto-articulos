import { test } from "node:test";
import assert from "node:assert/strict";
import { hasSocialPublishingApproval, hasSocialModuleAccess } from "./social-access";
import { hasLegacySocialModuleAccess } from "@auto-articulos/shared";

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
    hasSocialModuleAccess({ role: "user", name: "Hector Travasillo", allowBloggerPublishing: true }),
    false,
  );
});

test("módulo: 'Habilitado' lo muestra aunque no tenga ninguna red aprobada todavía", () => {
  assert.equal(
    hasSocialModuleAccess({
      role: "user",
      name: "Lorena Alvarez",
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

test("web y worker conservan la misma regla legacy de Redes", () => {
  const cases = [
    { role: "admin", disabledModules: JSON.stringify({ "oportunidades-redes": "disabled" }), allowBloggerPublishing: false },
    { role: "user", disabledModules: null, allowBloggerPublishing: false },
    { role: "user", disabledModules: null, allowBloggerPublishing: true },
    { role: "user", disabledModules: JSON.stringify({ "oportunidades-redes": "enabled" }), allowBloggerPublishing: false },
    { role: "user", disabledModules: JSON.stringify({ "oportunidades-redes": "disabled" }), allowBloggerPublishing: true },
    { role: "user", disabledModules: JSON.stringify(["oportunidades-redes"]), allowBloggerPublishing: true },
    { role: "user", disabledModules: "{malformed", allowBloggerPublishing: true },
  ] as const;
  for (const user of cases) {
    assert.equal(
      // Cuenta piloto: la lista de identidad ya no interviene y se compara solo la regla legacy.
      hasSocialModuleAccess({ ...user, name: "Lorena Alvarez" }),
      hasLegacySocialModuleAccess({ role: user.role, disabledModules: user.disabledModules, approvals: [user.allowBloggerPublishing] }),
      JSON.stringify(user),
    );
  }
});

// Redes por dominio: en redes.lasolucionweb.com (HUB) siempre activo; en
// seototal.lasolucionweb.com sigue la lista de cuentas piloto.
test("dominio redes: cuenta cualquiera con redes aprobadas accede sin estar en la lista piloto", () => {
  assert.equal(
    hasSocialModuleAccess({ role: "user", name: "Hector Travasillo", allowBloggerPublishing: true }, { redesHost: true }),
    true,
  );
});

test("dominio redes: 'Deshabilitado' explícito de Administración se respeta", () => {
  assert.equal(
    hasSocialModuleAccess(
      { role: "user", allowBloggerPublishing: true, disabledModules: JSON.stringify({ "oportunidades-redes": "disabled" }) },
      { redesHost: true },
    ),
    false,
  );
});

test("otros dominios: cuenta fuera de la lista piloto sigue sin acceso", () => {
  assert.equal(
    hasSocialModuleAccess({ role: "user", name: "Hector Travasillo", allowBloggerPublishing: true }, {}),
    false,
  );
  assert.equal(
    hasSocialModuleAccess({ role: "user", name: "Lorena Alvarez", allowBloggerPublishing: true }, {}),
    true,
  );
});

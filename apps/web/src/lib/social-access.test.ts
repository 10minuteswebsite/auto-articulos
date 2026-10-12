import { test } from "node:test";
import assert from "node:assert/strict";
import { isNetworkApprovedForPublishing, type SocialPublishingPermissionUser, hasSocialPublishingApproval, hasSocialModuleAccess, openAllNetworks } from "./social-access";
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

test("dominio redes: todas las redes quedan abiertas aunque Administración no marque ninguna", () => {
  const opened = openAllNetworks<SocialPublishingPermissionUser>({ role: "user", allowInstagramPublishing: false }, { redesHost: true });
  assert.equal(opened.allowInstagramPublishing, true);
  assert.equal(opened.allowTumblrPublishing, true);
  assert.equal(hasSocialPublishingApproval(opened), true);
  assert.equal(hasSocialModuleAccess({ role: "user", name: "Hector Travasillo" }, { redesHost: true }), true);
});

test("otros dominios: las marcas por red de Administración no se tocan", () => {
  const user = { role: "user", allowInstagramPublishing: false };
  assert.equal(openAllNetworks(user, {}), user);
  assert.equal(openAllNetworks(user, {}).allowInstagramPublishing, false);
});

// Regresión (2026-10-11): `redesHost || platform === "pinterest" ? A : B` se leía como
// `(redesHost || pinterest) ? A : B` y en redes.lasolucionweb.com Tumblr y Bluesky
// comprobaban la aprobación de Pinterest.
test("dominio redes: Pinterest, Tumblr y Bluesky quedan abiertos aunque no haya ninguna aprobación", () => {
  for (const network of ["pinterest", "tumblr", "bluesky"] as const) {
    assert.equal(isNetworkApprovedForPublishing({ role: "user" }, network, { redesHost: true }), true, network);
  }
});

test("otros dominios: cada red usa SU propia aprobación, no la de otra", () => {
  const onlyPinterest = { role: "user", allowPinterestPublishing: true };
  assert.equal(isNetworkApprovedForPublishing(onlyPinterest, "pinterest"), true);
  assert.equal(isNetworkApprovedForPublishing(onlyPinterest, "tumblr"), false);
  assert.equal(isNetworkApprovedForPublishing(onlyPinterest, "bluesky"), false);
  const onlyTumblr = { role: "user", allowTumblrPublishing: true };
  assert.equal(isNetworkApprovedForPublishing(onlyTumblr, "tumblr"), true);
  assert.equal(isNetworkApprovedForPublishing(onlyTumblr, "pinterest"), false);
});

test("los administradores pueden publicar en las tres redes y una cuenta inexistente no", () => {
  for (const network of ["pinterest", "tumblr", "bluesky"] as const) {
    assert.equal(isNetworkApprovedForPublishing({ role: "admin" }, network), true);
    assert.equal(isNetworkApprovedForPublishing(null, network), false);
  }
});

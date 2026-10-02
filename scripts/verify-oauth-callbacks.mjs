#!/usr/bin/env node

/**
 * Verificación local y sin red de callbacks OAuth.
 * Genera la matriz que Milton debe registrar y comprueba que cada proveedor
 * tiene exactamente el callback esperado en los tres hosts del checklist.
 * No lee secretos, no contacta proveedores y no modifica configuración.
 */

const hosts = [
  "https://seototal.lasolucionweb.com",
  "https://seototal.articulos.lasolucionweb.com",
  "https://seototal.redes.lasolucionweb.com",
];

const providers = {
  "Google Search Console": "/api/search-integrations/google/callback",
  "Google Analytics": "/api/google-analytics/callback",
  "Google Business Profile": "/api/business-profile/callback",
  "Bing Webmaster": "/api/search-integrations/bing/callback",
  "Meta / Instagram": "/api/search-integrations/instagram/callback",
  "Meta / Threads": "/api/search-integrations/threads/callback",
  LinkedIn: "/api/search-integrations/linkedin/callback",
  Pinterest: "/api/search-integrations/pinterest/callback",
  Tumblr: "/api/search-integrations/tumblr/callback",
  X: "/api/search-integrations/twitter/callback",
  Blogger: "/api/search-integrations/blogger/callback",
  Composio: "/api/composio/callback?app=<app>",
};

function expectedCallbacks() {
  return Object.fromEntries(
    Object.entries(providers).map(([provider, path]) => [
      provider,
      hosts.map((host) => `${host}${path}`),
    ]),
  );
}

function validate(matrix) {
  const errors = [];
  for (const [provider, callbacks] of Object.entries(matrix)) {
    if (callbacks.length !== hosts.length) {
      errors.push(`${provider}: se esperaban ${hosts.length} callbacks`);
    }
    for (const callback of callbacks) {
      const parsed = new URL(callback.replace("<app>", "placeholder"));
      if (!hosts.includes(parsed.origin)) errors.push(`${provider}: host no permitido: ${parsed.origin}`);
      if (!parsed.pathname.endsWith("/callback")) errors.push(`${provider}: ruta inválida: ${parsed.pathname}`);
    }
  }
  return errors;
}

const matrix = expectedCallbacks();
const errors = validate(matrix);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else if (process.argv.includes("--json")) {
  console.log(JSON.stringify(matrix, null, 2));
} else {
  for (const [provider, callbacks] of Object.entries(matrix)) {
    console.log(`\n${provider}`);
    for (const callback of callbacks) console.log(`  ${callback}`);
  }
  console.log(`\nOK: ${Object.keys(providers).length} proveedores × ${hosts.length} hosts; verificación offline, sin red ni secretos.`);
}

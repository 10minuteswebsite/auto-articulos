import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Todo callback OAuth debe devolver a la persona al host (producto) desde el
// que empezó, vía oauthReturnBase; nunca con request.url, que es siempre el
// host canónico de seototal y mandaba a Redes y Artículos al lugar equivocado.
const BASE = join(process.cwd(), "src/app/api");
const CALLBACKS = [
  "business-profile", "google-analytics", "search-integrations/bing", "search-integrations/blogger",
  "search-integrations/facebook-pages", "search-integrations/google", "search-integrations/instagram",
  "search-integrations/linkedin", "search-integrations/pinterest", "search-integrations/threads",
  "search-integrations/twitter",
];

for (const dir of CALLBACKS) {
  test(`callback ${dir} devuelve con oauthReturnBase y no con request.url`, () => {
    const file = join(BASE, dir, "callback/route.ts");
    assert.ok(existsSync(file), file);
    const source = readFileSync(file, "utf8");
    assert.match(source, /oauthReturnBase\(request\)/);
    assert.doesNotMatch(source, /new URL\([^)]*,\s*request\.url\)/);
  });
}

test("hay callback para cada carpeta con callback (no se olvida ninguno)", () => {
  const found = readdirSync(join(BASE, "search-integrations"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(BASE, "search-integrations", d.name, "callback/route.ts")))
    .map((d) => `search-integrations/${d.name}`);
  const known = new Set([...CALLBACKS, "search-integrations/tumblr"]);
  for (const f of found) assert.ok(known.has(f), `callback sin cubrir: ${f}`);
});

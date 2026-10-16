import { test } from "node:test";
import assert from "node:assert/strict";
import { create } from "qrcode/lib/core/qrcode";
import { qrSvg } from "./qr";
import { makeEnv, send, get, provisionTenant, articleData } from "./test-helpers";

test("el QR codifica exactamente el enlace wa.me (misma matriz que la librería de referencia)", () => {
  const url = "https://wa.me/13055550100";
  const svg = qrSvg(url, "Escanea");
  const { modules } = create(url, { errorCorrectionLevel: "M" });
  const dark = [...svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map((m) => `${Number(m[2]) - 4},${Number(m[1]) - 4}`);
  const expected: string[] = [];
  for (let r = 0; r < modules.size; r++) for (let c = 0; c < modules.size; c++) if (modules.get(r, c)) expected.push(`${r},${c}`);
  assert.deepEqual(dark, expected);
  assert.match(svg, /role="img"/);
  assert.match(svg, /viewBox="0 0 (\d+) \1"/);
});

test("el artículo muestra QR junto al botón solo con número válido", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test", { whatsapp: "+1 305 555 0100" });
  await provisionTenant(env, "t2", "blog.dos.test", { whatsapp: "abc" });
  await send(env, "t1", "article.publish", articleData(1));
  await send(env, "t2", "article.publish", articleData(1));
  const con = await (await get(env, "blog.uno.test", "/articulo-1/")).text();
  assert.match(con, /<svg[^>]+role="img"[^>]+aria-label="Escanea para conversar por WhatsApp"/);
  assert.match(con, /Escanea para conversar por WhatsApp/);
  const sin = await (await get(env, "blog.dos.test", "/articulo-1/")).text();
  assert.doesNotMatch(sin, /<svg[^>]+role="img"/);
});

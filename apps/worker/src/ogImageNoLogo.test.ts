import test from "node:test";
import assert from "node:assert/strict";
import { getArticleOpenGraphImage } from "./socialPublish";

const html = (ogUrl: string) => `<html><head><meta property='og:image' content='${ogUrl}'></head>
<body><img src="/images/user-logo/logo.png"><img src="/images/foto-cuerpo.jpg"></body></html>`;

function stubFetch(responses: Record<string, { status: number; body?: string }>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const hit = responses[`${init?.method ?? "GET"} ${url}`] ?? responses[url];
    if (!hit) return new Response("no", { status: 404 });
    const res = new Response(hit.body ?? "", { status: hit.status, headers: { "content-type": hit.body ? "text/html" : "image/jpeg" } });
    Object.defineProperty(res, "url", { value: url });
    return res;
  }) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

test("si la og:image declarada da 404 no se usa el logo ni otra imagen del cuerpo", async () => {
  const restore = stubFetch({
    "https://site.test/a1": { status: 200, body: html("https://site.test/missing.jpg") },
    "HEAD https://site.test/missing.jpg": { status: 404 },
    "HEAD https://site.test/images/user-logo/logo.png": { status: 200 },
    "HEAD https://site.test/images/foto-cuerpo.jpg": { status: 200 },
  });
  try {
    assert.equal(await getArticleOpenGraphImage("https://site.test/a1"), null);
  } finally { restore(); }
});

test("si la og:image declarada existe se devuelve esa", async () => {
  const restore = stubFetch({
    "https://site.test/a2": { status: 200, body: html("https://site.test/foto.jpg") },
    "HEAD https://site.test/foto.jpg": { status: 200 },
  });
  try {
    assert.equal(await getArticleOpenGraphImage("https://site.test/a2"), "https://site.test/foto.jpg");
  } finally { restore(); }
});

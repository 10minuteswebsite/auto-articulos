import assert from "node:assert/strict";
import test from "node:test";
import {
  createTumblrPhotoPost,
  exchangeTumblrAccessToken,
  getTumblrBlogs,
  requestTumblrRequestToken,
} from "./tumblr-api";

const credentials = { clientId: "consumer-key", clientSecret: "consumer-secret" };
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("solicita y canjea tokens Tumblr con OAuth1", async () => {
  const calls: RequestInit[] = [];
  globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
    calls.push(init ?? {});
    return new Response(calls.length === 1
      ? "oauth_token=request-token&oauth_token_secret=request-secret&oauth_callback_confirmed=true"
      : "oauth_token=access-token&oauth_token_secret=access-secret", { status: 200 });
  }) as typeof fetch;

  const requestToken = await requestTumblrRequestToken(credentials);
  const accessToken = await exchangeTumblrAccessToken(requestToken, "verifier", credentials);

  assert.deepEqual(requestToken, { oauthToken: "request-token", oauthTokenSecret: "request-secret" });
  assert.deepEqual(accessToken, { oauthToken: "access-token", oauthTokenSecret: "access-secret" });
  assert.doesNotMatch(String((calls[0].headers as Record<string, string>).Authorization), /oauth_callback/);
  assert.match(String((calls[0].headers as Record<string, string>).Authorization), /oauth_signature=/);
  assert.equal((calls[0].headers as Record<string, string>)["User-Agent"], "La Solucion IA SEO TOTAL/1.0 (+https://hub.lasolucionweb.net)");
  assert.match(String((calls[1].headers as Record<string, string>).Authorization), /oauth_verifier/);
  assert.match(String((calls[1].headers as Record<string, string>).Authorization), /oauth_token/);
  assert.equal(calls[1].method, "GET");
  assert.equal((calls[1].headers as Record<string, string>)["User-Agent"], "La Solucion IA SEO TOTAL/1.0 (+https://hub.lasolucionweb.net)");
});

test("firma las consultas de blogs y publicaciones con el token OAuth1", async () => {
  const calls: Array<{ input: URL | RequestInfo; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls.push({ input, init });
    if (calls.length === 1) {
      return new Response(JSON.stringify({ response: { user: { blogs: [{ name: "mi-blog", title: "Mi blog" }] } } }), { status: 200 });
    }
    return new Response(JSON.stringify({ response: { id: "123", post_url: "https://www.tumblr.com/mi-blog/123" } }), { status: 200 });
  }) as typeof fetch;

  const blogs = await getTumblrBlogs("access-token", "access-secret", credentials);
  await createTumblrPhotoPost("access-token", "mi-blog", { caption: "Texto", link: "https://example.com", imageUrl: "https://example.com/image.jpg" }, "access-secret", credentials);

  assert.deepEqual(blogs, [{ identifier: "mi-blog", title: "Mi blog", url: null }]);
  for (const call of calls) {
    assert.match(String((call.init?.headers as Record<string, string>).Authorization), /^OAuth /);
    assert.equal((call.init?.headers as Record<string, string>)["User-Agent"], "La Solucion IA SEO TOTAL/1.0 (+https://hub.lasolucionweb.net)");
  }
  assert.equal((calls[1].init?.method), "POST");
  assert.match(String((calls[1].init?.body as URLSearchParams).toString()), /type=photo/);
});

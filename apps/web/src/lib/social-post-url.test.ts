import test from "node:test";
import assert from "node:assert/strict";
import { socialPostUrl } from "./social-post-url";

test("Facebook arma el enlace real de la publicación", () => {
  assert.equal(socialPostUrl("facebook-page", "123_456"), "https://www.facebook.com/123_456");
});

test("una URL guardada se respeta tal cual", () => {
  assert.equal(socialPostUrl("instagram-post", "https://www.instagram.com/p/abc/"), "https://www.instagram.com/p/abc/");
  assert.equal(socialPostUrl("blogger", "https://example.blogspot.com/2026/10/post.html"), "https://example.blogspot.com/2026/10/post.html");
  assert.equal(socialPostUrl("pinterest", "https://www.pinterest.com/pin/123/"), "https://www.pinterest.com/pin/123/");
  assert.equal(socialPostUrl("tumblr", "https://example.tumblr.com/post/123/title"), "https://example.tumblr.com/post/123/title");
});

test("Threads, X y LinkedIn siguen funcionando", () => {
  assert.equal(socialPostUrl("threads", "AB1"), "https://www.threads.com/t/AB1");
  assert.equal(
    socialPostUrl("threads", "https://www.threads.com/@soyvivirmejor/post/DeKL78jG7rT"),
    "https://www.threads.com/@soyvivirmejor/post/DeKL78jG7rT",
  );
  assert.equal(socialPostUrl("x", "99"), "https://x.com/i/status/99");
  assert.equal(socialPostUrl("twitter", "99"), "https://x.com/i/status/99");
  assert.equal(socialPostUrl("linkedin", "urn:li:share:1"), "https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A1");
});

test("sin enlace conocido devuelve null y nunca «#»", () => {
  assert.equal(socialPostUrl("instagram-post", "17900000000"), null);
  assert.equal(socialPostUrl("facebook-page", ""), null);
  assert.equal(socialPostUrl("pinterest", "77"), null);
  assert.equal(socialPostUrl("blogger", "post-77"), null);
  assert.equal(socialPostUrl("threads", null), null);
});

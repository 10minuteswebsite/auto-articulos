import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMeClient } from "./me-client";

const response = (value: unknown, ok = true) =>
  ({ ok, json: async () => value }) as Response;

describe("me-client", () => {
  it("shares an in-flight request and caches it for three seconds", async () => {
    let now = 100;
    let resolveRequest!: (value: Response) => void;
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      if (calls > 1) return Promise.resolve(response({ role: "admin" }));
      return new Promise<Response>((resolve) => { resolveRequest = resolve; });
    };
    const client = createMeClient({ now: () => now, fetcher });

    const first = client.fetchMe();
    const second = client.fetchMe();
    assert.equal(calls, 1);
    resolveRequest(response({ role: "user" }));
    assert.deepEqual(await Promise.all([first, second]), [
      { role: "user" },
      { role: "user" },
    ]);

    now = 3_099;
    await client.fetchMe();
    assert.equal(calls, 1);
    now = 3_100;
    assert.deepEqual(await client.fetchMe(), { role: "admin" });
    assert.equal(calls, 2);
  });

  it("expires the cache, supports forced refresh, and does not cache failures", async () => {
    let now = 0;
    let index = 0;
    const results = [response({ version: 1 }), response({ version: 2 }), response(null, false), response({ version: 3 })];
    const fetcher = () => Promise.resolve(results[index++]);
    const client = createMeClient({ now: () => now, fetcher });

    assert.deepEqual(await client.fetchMe(), { version: 1 });
    assert.deepEqual(await client.fetchMe({ force: true }), { version: 2 });
    now = 3_000;
    assert.equal(await client.fetchMe(), null);
    assert.deepEqual(await client.fetchMe(), { version: 3 });
    assert.equal(index, 4);
  });
});

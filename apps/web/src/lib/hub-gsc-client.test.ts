import test from "node:test";
import assert from "node:assert/strict";
import { readHubGscEvidence, readHubGscRanking } from "./hub-gsc-client";

const dates = { currentStart: "2026-09-16", currentEnd: "2026-10-30", previousStart: "2026-08-02", previousEnd: "2026-09-15" };
const row = { keys: ["home"], clicks: 1, impressions: 10, ctr: 0.1, position: 2 };

test("central evidence reads each period and the country dimension", async () => {
  const calls: string[][] = [];
  const result = await readHubGscEvidence("tenant", "connection", dates, async (_tenant, _connection, _start, _end, dimensions) => {
    calls.push(dimensions);
    return [row];
  });
  assert.deepEqual(calls, [["query", "page"], ["query", "page"], ["country"]]);
  assert.deepEqual(result, { currentRows: [row], previousRows: [row], countryRows: [row] });
});

test("a central timeout or provider error leaves the legacy source available", async () => {
  const result = await readHubGscEvidence("tenant", "connection", dates, async () => { throw new Error("provider unavailable"); });
  assert.equal(result, null);
});

test("Redes reads only through its own grant and falls back on failure", async () => {
  const calls: Array<{ dimensions: string[]; app: string | undefined }> = [];
  const result = await readHubGscRanking("tenant", "connection", dates, async (_tenant, _connection, _start, _end, dimensions, app) => {
    calls.push({ dimensions, app });
    return [row];
  });
  assert.deepEqual(result, [[row], [row]]);
  assert.deepEqual(calls, [{ dimensions: ["page", "query"], app: "auto-redes" }, { dimensions: ["page"], app: "auto-redes" }]);
  assert.equal(await readHubGscRanking("tenant", "connection", dates, async () => { throw new Error("offline"); }), null);
});

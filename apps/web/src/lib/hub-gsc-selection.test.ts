import assert from "node:assert/strict";
import test from "node:test";
import { chooseHubGscConnection, hubGscPilotEnabled } from "./hub-gsc-selection";
import { resolveHubGsc } from "./hub-gsc-client";

const tenant = "11111111-1111-4111-8111-111111111111";
const first = { id: "33333333-3333-4333-8333-333333333333", site_url: "sc-domain:one.test", validated_at: "2026-11-04T00:00:00Z" };
const second = { id: "44444444-4444-4444-8444-444444444444", site_url: "sc-domain:two.test", validated_at: "2026-11-04T00:00:00Z" };

test("pilot is off by default and only accepts an explicitly listed Hub tenant", () => {
  delete process.env.HUB_GSC_CONSUMER_PILOT_IDS;
  assert.equal(hubGscPilotEnabled(tenant), false);
  process.env.HUB_GSC_CONSUMER_PILOT_IDS = tenant;
  assert.equal(hubGscPilotEnabled(tenant), true);
  assert.equal(hubGscPilotEnabled(second.id), false);
  delete process.env.HUB_GSC_CONSUMER_PILOT_IDS;
});

test("choose only an equivalent property; never guess between multiple accounts", () => {
  assert.deepEqual(chooseHubGscConnection([first]), first);
  assert.deepEqual(chooseHubGscConnection([first, second], second.site_url), second);
  assert.equal(chooseHubGscConnection([first, second]), null);
  assert.equal(chooseHubGscConnection([first], second.site_url), null);
  assert.equal(chooseHubGscConnection([{ ...first, validated_at: "invalid" }]), null);
});

test("a legacy property is not replaced merely because the pilot is enabled", async () => {
  process.env.HUB_GSC_CONSUMER_PILOT_IDS = tenant;
  try { assert.equal(await resolveHubGsc(tenant, first.site_url), null); }
  finally { delete process.env.HUB_GSC_CONSUMER_PILOT_IDS; }
});

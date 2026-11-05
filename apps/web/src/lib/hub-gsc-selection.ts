export type HubGscConnection = { id: string; site_url: string; validated_at: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function hubGscPilotEnabled(hubUserId: string | null | undefined) {
  if (!hubUserId || !UUID.test(hubUserId)) return false;
  return (process.env.HUB_GSC_CONSUMER_PILOT_IDS ?? "").split(",").map((value) => value.trim().toLowerCase()).includes(hubUserId.toLowerCase());
}

/** Never guess among properties, and never replace an unrelated legacy site. */
export function chooseHubGscConnection(items: unknown, expectedSiteUrl?: string | null): HubGscConnection | null {
  if (!Array.isArray(items) || items.some((item: unknown) => !item || typeof item !== "object"
    || typeof (item as Record<string, unknown>).id !== "string" || !UUID.test((item as { id: string }).id)
    || typeof (item as Record<string, unknown>).site_url !== "string" || !(item as { site_url: string }).site_url
    || typeof (item as Record<string, unknown>).validated_at !== "string" || !Number.isFinite(Date.parse((item as { validated_at: string }).validated_at)))) return null;
  const matches = expectedSiteUrl ? items.filter((item) => item.site_url === expectedSiteUrl) : items;
  return matches.length === 1 ? matches[0] as HubGscConnection : null;
}

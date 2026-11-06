const BROKER = "https://hub-workload-credential-broker.10minuteswebsite.workers.dev";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type HubGscConnection = { id: string; site_url: string; validated_at: string };
export type HubGscOperation =
  | { operation: "list" }
  | { operation: "sitemaps"; connection_id: string }
  | { operation: "inspect"; connection_id: string; target_url: string }
  | { operation: "query"; connection_id: string; start_date: string; end_date: string; dimensions: string[] };

/** Empty by default: no existing tenant performs a new request without a pilot. */
export function hubGscPilotEnabled(hubUserId: string | null | undefined) {
  if (!hubUserId || !UUID.test(hubUserId)) return false;
  return (process.env.HUB_GSC_CONSUMER_PILOT_IDS ?? "").split(",").map((value) => value.trim().toLowerCase()).includes(hubUserId.toLowerCase());
}

async function githubIdentity(audience: "github-connections" | "github-sitemap" = "github-connections") {
  if (process.env.GITHUB_ACTIONS !== "true") throw new Error("hub_connections_unavailable");
  const raw = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!raw || !requestToken) throw new Error("hub_connections_unavailable");
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("hub_connections_unavailable"); }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".actions.githubusercontent.com") || url.username || url.password || url.port) throw new Error("hub_connections_unavailable");
  url.searchParams.set("audience", `${BROKER}/${audience}`);
  const response = await fetch(url, { headers: { authorization: `Bearer ${requestToken}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("hub_connections_unavailable");
  const body = await response.json() as { value?: unknown };
  if (typeof body.value !== "string" || body.value.length > 16384 || !/^[A-Za-z0-9_.-]{32,}$/.test(body.value)) throw new Error("hub_connections_unavailable");
  return body.value;
}

/** Isolated sitemap audience; do not retry or fall back after an unknown result. */
export async function submitHubGscSitemap(hubUserId: string, connectionId: string, targetUrl: string) {
  if (!UUID.test(hubUserId) || !UUID.test(connectionId) || !targetUrl || targetUrl.length > 2048) throw new Error("hub_sitemap_unconfirmed");
  const token = await githubIdentity("github-sitemap");
  const response = await fetch(`${BROKER}/connections-sitemap`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ hub_user_id: hubUserId, app: "seo-total", connection_id: connectionId, target_url: targetUrl }),
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(59000),
  });
  if (!response.ok) throw new Error("hub_sitemap_unconfirmed");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("data" in body) || !body.data || typeof body.data !== "object"
    || !("submitted" in body.data) || body.data.submitted !== true) throw new Error("hub_sitemap_unconfirmed");
}

/** The broker validates the workflow identity; Hub rechecks tenant, entitlement and grant. */
export async function hubGscRead(hubUserId: string, operation: HubGscOperation) {
  if (!UUID.test(hubUserId)) throw new Error("hub_connections_unavailable");
  const token = await githubIdentity();
  const response = await fetch(`${BROKER}/connections-read`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ hub_user_id: hubUserId, app: "seo-total", ...operation }),
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(59000),
  });
  if (!response.ok) throw new Error("hub_connections_unavailable");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("data" in body) || !body.data || typeof body.data !== "object" || Array.isArray(body.data)) throw new Error("hub_connections_unavailable");
  return body.data as Record<string, unknown>;
}

export async function listHubGscConnections(hubUserId: string): Promise<HubGscConnection[]> {
  const body = await hubGscRead(hubUserId, { operation: "list" });
  if (!Array.isArray(body.connections) || body.connections.some((item: unknown) => !item || typeof item !== "object"
    || typeof (item as Record<string, unknown>).id !== "string" || !UUID.test((item as { id: string }).id)
    || typeof (item as Record<string, unknown>).site_url !== "string" || !(item as { site_url: string }).site_url
    || typeof (item as Record<string, unknown>).validated_at !== "string" || !Number.isFinite(Date.parse((item as { validated_at: string }).validated_at)))) throw new Error("hub_connections_unavailable");
  return body.connections as HubGscConnection[];
}

/** Select only an unambiguous property; failures never disable a legacy source. */
export async function resolveHubGsc(hubUserId: string | null, legacySite: string | null, list = listHubGscConnections) {
  if (!hubGscPilotEnabled(hubUserId) || !hubUserId) return null;
  try {
    const all = await list(hubUserId);
    const matches = legacySite ? all.filter((item) => item.site_url === legacySite) : all;
    return matches.length === 1 ? matches[0] : null;
  } catch { return null; }
}

export async function inspectHubGsc(hubUserId: string, connectionId: string, targetUrl: string) {
  const body = await hubGscRead(hubUserId, { operation: "inspect", connection_id: connectionId, target_url: targetUrl });
  const result = body.inspection;
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("hub_connections_unavailable");
  const inspection = result as Record<string, unknown>;
  if ((inspection.verdict !== undefined && typeof inspection.verdict !== "string")
    || (inspection.coverageState !== undefined && typeof inspection.coverageState !== "string")) throw new Error("hub_connections_unavailable");
  return { verdict: inspection.verdict as string | undefined, coverageState: inspection.coverageState as string | undefined };
}

/** A separate Composio namespace for Hub-owned connections. Legacy accounts
 * always use native user IDs and are never looked up, modified, or deleted. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,160}$/;
const CALLBACK_ORIGIN = "https://hub.lasolucionweb.net";
const DIMENSIONS = new Set(["query", "page", "country", "device", "date"]);

type Site = { siteUrl: string; permissionLevel: string };
type Account = { id: string; status: string; userId: string | null; toolkitSlug: string | null; authConfigId: string | null };
type Input =
  | { operation: "start"; tenantId: string; attemptId: string }
  | { operation: "sites"; tenantId: string; attemptId: string; accountId: string }
  | { operation: "query"; tenantId: string; attemptId: string; accountId: string; siteUrl: string; startDate: string; endDate: string; dimensions: string[] }
  | { operation: "sitemaps"; tenantId: string; attemptId: string; accountId: string; siteUrl: string }
  | { operation: "inspect" | "submit_sitemap"; tenantId: string; attemptId: string; accountId: string; siteUrl: string; targetUrl: string };

export type HubGscDependencies = {
  config(): Promise<{ apiKey: string; authConfigId: string }>;
  start(apiKey: string, input: { authConfigId: string; userId: string; callbackUrl: string }): Promise<{ redirectUrl: string; connectedAccountId: string }>;
  account(apiKey: string, accountId: string): Promise<Account>;
  sites(account: { apiKey: string; userId: string; connectedAccountId: string }): Promise<Site[]>;
  query(account: { apiKey: string; userId: string; connectedAccountId: string }, siteUrl: string, startDate: string, endDate: string, dimensions: string[]): Promise<unknown[]>;
  inspect(account: { apiKey: string; userId: string; connectedAccountId: string }, siteUrl: string, targetUrl: string): Promise<unknown>;
  sitemaps(account: { apiKey: string; userId: string; connectedAccountId: string }, siteUrl: string): Promise<string[]>;
  submitSitemap(account: { apiKey: string; userId: string; connectedAccountId: string }, siteUrl: string, targetUrl: string): Promise<void>;
};

export class HubGscError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

export function hubGscProviderUser(tenantId: string, attemptId: string) {
  if (!UUID.test(tenantId) || !UUID.test(attemptId)) throw new HubGscError("invalid_request", 400);
  return `hub-connections-${tenantId.toLowerCase()}-${attemptId.toLowerCase()}`;
}

function exactKeys(value: Record<string, unknown>, expected: string[]) {
  return Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function parseHubGscRequest(value: unknown): Input {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HubGscError("invalid_request", 400);
  const body = value as Record<string, unknown>;
  if (typeof body.tenantId !== "string" || !UUID.test(body.tenantId) || typeof body.attemptId !== "string" || !UUID.test(body.attemptId)) throw new HubGscError("invalid_request", 400);
  if (body.operation === "start" && exactKeys(body, ["operation", "tenantId", "attemptId"]) && typeof body.attemptId === "string" && UUID.test(body.attemptId)) {
    return { operation: "start", tenantId: body.tenantId, attemptId: body.attemptId };
  }
  if (typeof body.accountId !== "string" || !ACCOUNT_ID.test(body.accountId)) throw new HubGscError("invalid_request", 400);
  if (body.operation === "sites" && exactKeys(body, ["operation", "tenantId", "attemptId", "accountId"])) return { operation: "sites", tenantId: body.tenantId, attemptId: body.attemptId, accountId: body.accountId };
  if (body.operation === "sitemaps" && exactKeys(body, ["operation", "tenantId", "attemptId", "accountId", "siteUrl"])
    && typeof body.siteUrl === "string" && body.siteUrl.length > 0 && body.siteUrl.length <= 256) {
    return { operation: "sitemaps", tenantId: body.tenantId, attemptId: body.attemptId, accountId: body.accountId, siteUrl: body.siteUrl };
  }
  if ((body.operation === "inspect" || body.operation === "submit_sitemap") && exactKeys(body, ["operation", "tenantId", "attemptId", "accountId", "siteUrl", "targetUrl"])
    && typeof body.siteUrl === "string" && body.siteUrl.length > 0 && body.siteUrl.length <= 256
    && typeof body.targetUrl === "string" && body.targetUrl.length > 0 && body.targetUrl.length <= 2048) {
    return { operation: body.operation, tenantId: body.tenantId, attemptId: body.attemptId, accountId: body.accountId, siteUrl: body.siteUrl, targetUrl: body.targetUrl };
  }
  if (body.operation === "query" && exactKeys(body, ["operation", "tenantId", "attemptId", "accountId", "siteUrl", "startDate", "endDate", "dimensions"])
    && typeof body.siteUrl === "string" && body.siteUrl.length > 0 && body.siteUrl.length <= 256
    && validDate(body.startDate) && validDate(body.endDate)
    && Date.parse(body.endDate) >= Date.parse(body.startDate) && Date.parse(body.endDate) - Date.parse(body.startDate) <= 93 * 86400000
    && Array.isArray(body.dimensions) && body.dimensions.length <= 5
    && body.dimensions.every((dimension) => typeof dimension === "string" && DIMENSIONS.has(dimension))
    && new Set(body.dimensions).size === body.dimensions.length) {
    return { operation: "query", tenantId: body.tenantId, attemptId: body.attemptId, accountId: body.accountId, siteUrl: body.siteUrl, startDate: body.startDate, endDate: body.endDate, dimensions: body.dimensions };
  }
  throw new HubGscError("invalid_request", 400);
}

/** Both the selected property and the target must be within the same Google property. */
export function targetBelongsToProperty(siteUrl: string, targetUrl: string) {
  try {
    const target = new URL(targetUrl);
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password || target.port) return false;
    if (siteUrl.startsWith("sc-domain:")) {
      const domain = siteUrl.slice("sc-domain:".length).toLowerCase();
      return Boolean(domain) && (target.hostname === domain || target.hostname.endsWith(`.${domain}`));
    }
    const property = new URL(siteUrl);
    return ["http:", "https:"].includes(property.protocol) && !property.username && !property.password
      && target.origin === property.origin && target.pathname.startsWith(property.pathname);
  } catch { return false; }
}

/** The only write is creating a new provider authorization under the Hub namespace. */
export async function runHubGscAdapter(input: Input, deps: HubGscDependencies) {
  const userId = hubGscProviderUser(input.tenantId, input.attemptId);
  const { apiKey, authConfigId } = await deps.config();
  if (!apiKey || !authConfigId) throw new HubGscError("adapter_unavailable", 503);
  if (input.operation === "start") {
    const callback = new URL("/api/connections/google-search-console/callback", CALLBACK_ORIGIN);
    callback.searchParams.set("attempt", input.attemptId);
    const link = await deps.start(apiKey, { authConfigId, userId, callbackUrl: callback.toString() });
    let url: URL;
    try { url = new URL(link.redirectUrl); } catch { throw new HubGscError("adapter_unavailable", 503); }
    if (url.protocol !== "https:" || url.hostname !== "connect.composio.dev" || url.username || url.password || url.port || !ACCOUNT_ID.test(link.connectedAccountId)) {
      throw new HubGscError("adapter_unavailable", 503);
    }
    return { redirectUrl: url.toString(), accountId: link.connectedAccountId };
  }

  const account = await deps.account(apiKey, input.accountId);
  if (account.id !== input.accountId || account.status !== "ACTIVE" || account.userId !== userId
    || account.toolkitSlug?.toLowerCase() !== "google_search_console" || account.authConfigId !== authConfigId) {
    throw new HubGscError("connection_not_validated", 409);
  }
  const context = { apiKey, userId, connectedAccountId: input.accountId };
  const sites = await deps.sites(context);
  const safeSites = sites
    .filter((site) => typeof site.siteUrl === "string" && site.siteUrl.length > 0 && site.siteUrl.length <= 256 && typeof site.permissionLevel === "string" && site.permissionLevel.length <= 80)
    .map(({ siteUrl, permissionLevel }) => ({ siteUrl, permissionLevel }));
  if (input.operation === "sites") return { sites: safeSites };
  if (!safeSites.some((site) => site.siteUrl === input.siteUrl)) throw new HubGscError("site_not_authorized", 403);
  if (input.operation === "query") return { rows: await deps.query(context, input.siteUrl, input.startDate, input.endDate, input.dimensions) };
  if (input.operation === "sitemaps") return { sitemaps: await deps.sitemaps(context, input.siteUrl) };
  if (!targetBelongsToProperty(input.siteUrl, input.targetUrl)) throw new HubGscError("site_not_authorized", 403);
  if (input.operation === "inspect") return { inspection: await deps.inspect(context, input.siteUrl, input.targetUrl) };
  await deps.submitSitemap(context, input.siteUrl, input.targetUrl);
  return { submitted: true };
}

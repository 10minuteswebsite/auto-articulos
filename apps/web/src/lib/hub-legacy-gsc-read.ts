import { targetBelongsToProperty } from "./hub-gsc-adapter";

type Source = "native" | "composio";
export type LegacyGscInput = { operation: "verify" | "sitemaps" | "query" | "inspect"; tenantId: string; sourceRef: string; siteUrl: string; startDate?: string; endDate?: string; dimensions?: string[]; targetUrl?: string };
export type LegacyGscRecord = { tenantId: string; source: Source; id: string; userId: string; siteUrl: string; connectedAccountId?: string; encryptedRefreshToken?: string };
export type LegacyGscProvider = { source: "native"; accessToken: string } | { source: "composio"; apiKey: string; accountId: string; userId: string; status: string; toolkitSlug: string | null };
export type LegacyGscReadDependencies = {
  load(tenantId: string, source: Source, id: string): Promise<LegacyGscRecord | null>;
  open(record: LegacyGscRecord): Promise<LegacyGscProvider>;
  sites(provider: LegacyGscProvider): Promise<Array<{ siteUrl: string; permissionLevel: string }>>;
  sitemaps(provider: LegacyGscProvider, siteUrl: string): Promise<string[]>;
  inspect(provider: LegacyGscProvider, siteUrl: string, targetUrl: string): Promise<unknown>;
  query(provider: LegacyGscProvider, siteUrl: string, startDate: string, endDate: string, dimensions: string[]): Promise<unknown[]>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REF = /^legacy-ref:(native|composio):([A-Za-z0-9_-]{1,128})$/;
const DIMENSIONS = new Set(["query", "page", "country", "device", "date"]);
const exact = (body: Record<string, unknown>, keys: string[]) => Object.keys(body).length === keys.length && keys.every((key) => Object.hasOwn(body, key));
const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export class LegacyGscReadError extends Error {
  constructor(readonly code: "invalid_request" | "connection_unavailable" | "provider_unavailable", readonly status: number) { super(code); }
}

export function parseLegacyGscInput(value: unknown): LegacyGscInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LegacyGscReadError("invalid_request", 400);
  const body = value as Record<string, unknown>;
  if (typeof body.tenantId !== "string" || !UUID.test(body.tenantId) || typeof body.sourceRef !== "string" || !REF.test(body.sourceRef)
    || typeof body.siteUrl !== "string" || !body.siteUrl || body.siteUrl.length > 256 || /[\u0000-\u001f\u007f]/.test(body.siteUrl)) throw new LegacyGscReadError("invalid_request", 400);
  const base = { tenantId: body.tenantId, sourceRef: body.sourceRef, siteUrl: body.siteUrl };
  if ((body.operation === "verify" || body.operation === "sitemaps") && exact(body, ["operation", "tenantId", "sourceRef", "siteUrl"])) return { ...base, operation: body.operation };
  if (body.operation === "inspect" && exact(body, ["operation", "tenantId", "sourceRef", "siteUrl", "targetUrl"]) && typeof body.targetUrl === "string"
    && body.targetUrl.length <= 2048 && targetBelongsToProperty(body.siteUrl, body.targetUrl)) return { ...base, operation: "inspect", targetUrl: body.targetUrl };
  if (body.operation === "query" && exact(body, ["operation", "tenantId", "sourceRef", "siteUrl", "startDate", "endDate", "dimensions"])
    && validDate(body.startDate) && validDate(body.endDate) && Date.parse(body.endDate) >= Date.parse(body.startDate)
    && Date.parse(body.endDate) - Date.parse(body.startDate) <= 93 * 86400000 && Array.isArray(body.dimensions) && body.dimensions.length <= 5
    && body.dimensions.every((d) => typeof d === "string" && DIMENSIONS.has(d)) && new Set(body.dimensions).size === body.dimensions.length) {
    return { ...base, operation: "query", startDate: body.startDate, endDate: body.endDate, dimensions: body.dimensions as string[] };
  }
  throw new LegacyGscReadError("invalid_request", 400);
}

/** Recheck the original row and provider on every call, including after a
 * disconnect or property change. Nothing here creates or revokes a credential. */
export async function executeLegacyGscRead(input: LegacyGscInput, deps: LegacyGscReadDependencies) {
  const match = REF.exec(input.sourceRef);
  if (!match) throw new LegacyGscReadError("invalid_request", 400);
  const source = match[1] as Source;
  const row = await deps.load(input.tenantId, source, match[2]);
  if (!row || row.tenantId !== input.tenantId || row.source !== source || row.id !== match[2] || row.siteUrl !== input.siteUrl
    || !row.userId || (source === "native" && !row.encryptedRefreshToken) || (source === "composio" && !row.connectedAccountId)) {
    throw new LegacyGscReadError("connection_unavailable", 404);
  }
  try {
    const provider = await deps.open(row);
    if (provider.source !== source || (provider.source === "composio" && (provider.accountId !== row.connectedAccountId
      || provider.userId !== row.userId || provider.status !== "ACTIVE" || provider.toolkitSlug?.toLowerCase() !== "google_search_console"))) {
      throw new LegacyGscReadError("connection_unavailable", 404);
    }
    const sites = await deps.sites(provider);
    if (!sites.some((site) => site.siteUrl === row.siteUrl && ["siteOwner", "siteFullUser", "siteRestrictedUser"].includes(site.permissionLevel))) {
      throw new LegacyGscReadError("connection_unavailable", 404);
    }
    if (input.operation === "verify") return { verified: true };
    if (input.operation === "sitemaps") return { sitemaps: await deps.sitemaps(provider, row.siteUrl) };
    if (input.operation === "inspect" && input.targetUrl) return { inspection: await deps.inspect(provider, row.siteUrl, input.targetUrl) };
    if (input.operation === "query" && input.startDate && input.endDate && input.dimensions) return { rows: await deps.query(provider, row.siteUrl, input.startDate, input.endDate, input.dimensions) };
    throw new LegacyGscReadError("invalid_request", 400);
  } catch (error) {
    if (error instanceof LegacyGscReadError) throw error;
    throw new LegacyGscReadError("provider_unavailable", 503);
  }
}

export async function handleLegacyGscRead(request: Request, deps: LegacyGscReadDependencies & { authenticate(request: Request): Promise<boolean> }) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
  try { if (!(await deps.authenticate(request))) return reply({ error: "unauthorized" }, 401); }
  catch { return reply({ error: "provider_unavailable" }, 503); }
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 4096) return reply({ error: "invalid_request" }, 413);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 4096) return reply({ error: "invalid_request" }, 413);
    return reply({ data: await executeLegacyGscRead(parseLegacyGscInput(JSON.parse(raw)), deps) });
  } catch (error) {
    if (error instanceof LegacyGscReadError) return reply({ error: error.code }, error.status);
    if (error instanceof SyntaxError) return reply({ error: "invalid_request" }, 400);
    return reply({ error: "provider_unavailable" }, 503);
  }
}

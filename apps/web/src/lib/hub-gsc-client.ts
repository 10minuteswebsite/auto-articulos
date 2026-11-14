import { hubConnectionsRead, hubConnectionsSubmitSitemap } from "./hub-credential-transport";
import { chooseHubGscConnection, hubGscPilotEnabled } from "./hub-gsc-selection";
import type { GoogleSearchAnalyticsRow } from "@auto-articulos/shared";

/** Failure to reach Hub leaves the current legacy resolver unchanged. */
export async function resolveHubGsc(hubUserId: string | null | undefined, expectedSiteUrl?: string | null, app: "seo-total" | "auto-redes" = "seo-total") {
  // A matching central property is not a cutover decision. Keep the legacy
  // source until the resource exposes a verified, durable replacement decision.
  if (expectedSiteUrl) return null;
  if (!hubGscPilotEnabled(hubUserId)) return null;
  try {
    const response = await hubConnectionsRead({ hub_user_id: hubUserId, app, operation: "list" });
    if (!response.ok) return null;
    const body = await response.json() as { data?: { connections?: unknown } };
    return chooseHubGscConnection(body.data?.connections, expectedSiteUrl);
  } catch { return null; }
}

export async function queryHubGsc(hubUserId: string, connectionId: string, startDate: string, endDate: string, dimensions: string[], app: "seo-total" | "auto-redes" = "seo-total") {
  const response = await hubConnectionsRead({ hub_user_id: hubUserId, app, operation: "query", connection_id: connectionId, start_date: startDate, end_date: endDate, dimensions });
  if (!response.ok) throw new Error("hub_connections_unavailable");
  const body = await response.json() as { data?: { rows?: unknown } };
  if (!Array.isArray(body.data?.rows) || body.data.rows.some((row: unknown) => !row || typeof row !== "object"
    || !Array.isArray((row as Record<string, unknown>).keys) || !(row as { keys: unknown[] }).keys.every((key) => typeof key === "string")
    || ["clicks", "impressions", "ctr", "position"].some((field) => typeof (row as Record<string, unknown>)[field] !== "number" || !Number.isFinite((row as Record<string, number>)[field])))) throw new Error("hub_connections_unavailable");
  return body.data.rows as GoogleSearchAnalyticsRow[];
}

export async function inspectHubGsc(hubUserId: string, connectionId: string, targetUrl: string) {
  const response = await hubConnectionsRead({ hub_user_id: hubUserId, app: "seo-total", operation: "inspect", connection_id: connectionId, target_url: targetUrl });
  if (!response.ok) throw new Error("hub_connections_unavailable");
  const body = await response.json() as { data?: { inspection?: unknown } };
  const inspection = body.data?.inspection;
  if (!inspection || typeof inspection !== "object" || Array.isArray(inspection)) throw new Error("hub_connections_unavailable");
  const item = inspection as Record<string, unknown>;
  if ((item.verdict !== undefined && typeof item.verdict !== "string") || (item.coverageState !== undefined && typeof item.coverageState !== "string")) throw new Error("hub_connections_unavailable");
  return { verdict: item.verdict as string | undefined, coverageState: item.coverageState as string | undefined };
}

/** Unknown responses remain unconfirmed; never fall back to a second write. */
export async function submitHubGscSitemap(hubUserId: string, connectionId: string, targetUrl: string) {
  const response = await hubConnectionsSubmitSitemap({ hub_user_id: hubUserId, app: "seo-total", connection_id: connectionId, target_url: targetUrl });
  if (!response.ok) throw new Error("hub_sitemap_unconfirmed");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("data" in body) || !body.data || typeof body.data !== "object"
    || !("submitted" in body.data) || body.data.submitted !== true) throw new Error("hub_sitemap_unconfirmed");
}

/** Redes uses its own grant; on any failure callers keep their legacy source. */
export async function readHubGscRanking(
  hubUserId: string,
  connectionId: string,
  dates: { currentStart: string; currentEnd: string; previousStart: string; previousEnd: string },
  query: typeof queryHubGsc = queryHubGsc,
) {
  try {
    return await Promise.all([
      query(hubUserId, connectionId, dates.currentStart, dates.currentEnd, ["page", "query"], "auto-redes"),
      query(hubUserId, connectionId, dates.previousStart, dates.previousEnd, ["page"], "auto-redes"),
    ]);
  } catch { return null; }
}

/** A failed central read must leave the existing connection available. */
export async function readHubGscEvidence(
  hubUserId: string,
  connectionId: string,
  dates: { currentStart: string; currentEnd: string; previousStart: string; previousEnd: string },
  query: typeof queryHubGsc = queryHubGsc,
) {
  try {
    const [currentRows, previousRows, countryRows] = await Promise.all([
      query(hubUserId, connectionId, dates.currentStart, dates.currentEnd, ["query", "page"]),
      query(hubUserId, connectionId, dates.previousStart, dates.previousEnd, ["query", "page"]),
      query(hubUserId, connectionId, dates.currentStart, dates.currentEnd, ["country"]),
    ]);
    return { currentRows, previousRows, countryRows };
  } catch {
    return null;
  }
}

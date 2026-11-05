import { hubConnectionsRead } from "./hub-credential-transport";
import { chooseHubGscConnection, hubGscPilotEnabled } from "./hub-gsc-selection";
import type { GoogleSearchAnalyticsRow } from "@auto-articulos/shared";

/** Failure to reach Hub leaves the current legacy resolver unchanged. */
export async function resolveHubGsc(hubUserId: string | null | undefined, expectedSiteUrl?: string | null) {
  if (!hubGscPilotEnabled(hubUserId)) return null;
  try {
    const response = await hubConnectionsRead({ hub_user_id: hubUserId, app: "seo-total", operation: "list" });
    if (!response.ok) return null;
    const body = await response.json() as { data?: { connections?: unknown } };
    return chooseHubGscConnection(body.data?.connections, expectedSiteUrl);
  } catch { return null; }
}

export async function queryHubGsc(hubUserId: string, connectionId: string, startDate: string, endDate: string, dimensions: string[]) {
  const response = await hubConnectionsRead({ hub_user_id: hubUserId, app: "seo-total", operation: "query", connection_id: connectionId, start_date: startDate, end_date: endDate, dimensions });
  if (!response.ok) throw new Error("hub_connections_unavailable");
  const body = await response.json() as { data?: { rows?: unknown } };
  if (!Array.isArray(body.data?.rows) || body.data.rows.some((row: unknown) => !row || typeof row !== "object"
    || !Array.isArray((row as Record<string, unknown>).keys) || !(row as { keys: unknown[] }).keys.every((key) => typeof key === "string")
    || ["clicks", "impressions", "ctr", "position"].some((field) => typeof (row as Record<string, unknown>)[field] !== "number" || !Number.isFinite((row as Record<string, number>)[field])))) throw new Error("hub_connections_unavailable");
  return body.data.rows as GoogleSearchAnalyticsRow[];
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

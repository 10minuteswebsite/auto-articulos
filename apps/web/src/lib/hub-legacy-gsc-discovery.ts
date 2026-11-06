/** Read-only discovery of existing GSC configurations. The original row remains
 * the authority for credentials and can change or be disconnected at any time. */
export type LegacyGscRow = {
  id: string;
  siteDomain: string;
  siteUrl: string | null;
  sitemapUrl: string | null;
  lastAccessError?: string | null;
};

export type LegacyGscCandidate = {
  source: "native" | "composio";
  sourceRef: string;
  siteUrl: string;
  siteDomain: string;
  sitemapUrl: string | null;
  needsValidation: true;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REF = /^[a-zA-Z0-9_-]{1,128}$/;
const MAX_ROWS = 100;

/** The explicit projection prevents provider credentials and local user IDs
 * from crossing the app boundary, even if a caller supplies a larger object. */
export function projectLegacyGscRows(source: "native" | "composio", rows: LegacyGscRow[]): LegacyGscCandidate[] {
  return rows.flatMap((row) => {
    if (!REF.test(row.id) || typeof row.siteUrl !== "string" || !row.siteUrl.trim() || row.siteUrl.length > 256
      || typeof row.siteDomain !== "string" || row.siteDomain.length > 256
      || (row.sitemapUrl !== null && (typeof row.sitemapUrl !== "string" || row.sitemapUrl.length > 2048))) return [];
    return [{ source, sourceRef: `${source}:${row.id}`, siteUrl: row.siteUrl, siteDomain: row.siteDomain, sitemapUrl: row.sitemapUrl, needsValidation: true as const }];
  });
}

export async function handleLegacyGscDiscovery(request: Request, deps: {
  authenticate(request: Request): Promise<boolean>;
  load(tenantId: string, limit: number): Promise<{ native: LegacyGscRow[]; composio: LegacyGscRow[] }>;
}) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
  try {
    if (!(await deps.authenticate(request))) return reply({ error: "unauthorized" }, 401);
  } catch { return reply({ error: "adapter_unavailable" }, 503); }
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 1024) return reply({ error: "invalid_request" }, 413);
    const text = await request.text();
    if (Buffer.byteLength(text) > 1024) return reply({ error: "invalid_request" }, 413);
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)
      || Object.keys(body).length !== 1 || !("tenantId" in body)
      || typeof body.tenantId !== "string" || !UUID.test(body.tenantId)) return reply({ error: "invalid_request" }, 400);
    const rows = await deps.load(body.tenantId, MAX_ROWS + 1);
    const truncated = rows.native.length > MAX_ROWS || rows.composio.length > MAX_ROWS;
    const candidates = [
      ...projectLegacyGscRows("native", rows.native.slice(0, MAX_ROWS)),
      ...projectLegacyGscRows("composio", rows.composio.slice(0, MAX_ROWS)),
    ];
    return reply({ data: { candidates, truncated } });
  } catch (error) {
    if (error instanceof SyntaxError) return reply({ error: "invalid_request" }, 400);
    return reply({ error: "adapter_unavailable" }, 503);
  }
}

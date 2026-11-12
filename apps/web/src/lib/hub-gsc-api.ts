import { HubGscError, parseHubGscRequest, runHubGscAdapter, type HubGscDependencies } from "./hub-gsc-adapter";

/** The browser never authenticates here. Start remains closed until the Hub
 * callback, property selection and consuming applications are ready. */
export async function handleHubGscRequest(request: Request, deps: {
  authenticate(request: Request): Promise<boolean>;
  adapter: HubGscDependencies;
  startEnabled: boolean;
  sitemapEnabled: boolean;
}) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
  let authenticated = false;
  try { authenticated = await deps.authenticate(request); } catch { return reply({ error: "hub_unavailable" }, 503); }
  if (!authenticated) return reply({ error: "unauthorized" }, 401);
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return reply({ error: "invalid_request" }, 413);
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 4096) return reply({ error: "invalid_request" }, 413);
    const input = parseHubGscRequest(JSON.parse(text));
    if ((input.operation === "start" || input.operation === "verify_callback") && !deps.startEnabled) return reply({ error: "connection_setup_unavailable" }, 503);
    if (input.operation === "submit_sitemap" && !deps.sitemapEnabled) return reply({ error: "connection_setup_unavailable" }, 503);
    return reply({ data: await runHubGscAdapter(input, deps.adapter) });
  } catch (error) {
    if (error instanceof SyntaxError) return reply({ error: "invalid_request" }, 400);
    if (error instanceof HubGscError) {
      console.warn(JSON.stringify({ event: "hub_gsc_adapter_failure", code: error.code, status: error.status }));
      return reply({ error: error.code }, error.status);
    }
    // Provider error bodies can contain credentials or tenant data; only log a safe class/status.
    const safeStatus = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : null;
    console.warn(JSON.stringify({ event: "hub_gsc_adapter_failure", error_type: error instanceof Error ? error.name : "unknown", status: safeStatus }));
    return reply({ error: "adapter_unavailable" }, 503);
  }
}

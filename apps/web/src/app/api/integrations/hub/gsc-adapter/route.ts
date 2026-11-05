import { validHubBackend } from "@/lib/hub-credential-transport";
import { getStoredAuthConfigIds, getStoredComposioApiKey } from "@/lib/composio";
import { HubGscError } from "@/lib/hub-gsc-adapter";
import { handleHubGscRequest } from "@/lib/hub-gsc-api";
import { composioInspectUrl, composioListSitemaps, composioListSearchConsoleSites, composioQuerySearchAnalytics, composioSubmitSitemap, createConnectLink, getConnectedAccount } from "@auto-articulos/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleHubGscRequest(request, {
    authenticate: validHubBackend,
    // A setting alone must not turn on a flow whose Hub callback is unfinished.
    startEnabled: false,
    adapter: {
      async config() {
        const [apiKey, configs] = await Promise.all([getStoredComposioApiKey(), getStoredAuthConfigIds()]);
        if (!apiKey || !configs.google_search_console) throw new HubGscError("adapter_unavailable", 503);
        return { apiKey, authConfigId: configs.google_search_console };
      },
      start: createConnectLink,
      account: getConnectedAccount,
      sites: composioListSearchConsoleSites,
      query: composioQuerySearchAnalytics,
      inspect: composioInspectUrl,
      sitemaps: composioListSitemaps,
      submitSitemap: composioSubmitSitemap,
    },
  });
}

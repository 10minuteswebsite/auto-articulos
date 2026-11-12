import { validHubBackend } from "@/lib/hub-credential-transport";
import { getStoredAuthConfigIds, getStoredComposioApiKey } from "@/lib/composio";
import { HubGscError } from "@/lib/hub-gsc-adapter";
import { handleHubGscRequest } from "@/lib/hub-gsc-api";
import { completeConnectedAccount, composioInspectUrl, composioListSitemaps, composioListSearchConsoleSites, composioQuerySearchAnalytics, composioSubmitSitemap, createConnectLink, getConnectedAccount } from "@auto-articulos/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleHubGscRequest(request, {
    authenticate: validHubBackend,
    // Closed by default; enable only after the Hub callback and pilot checks pass.
    startEnabled: process.env.HUB_GSC_START_ENABLED === "true",
    sitemapEnabled: false,
    adapter: {
      async config() {
        const [apiKey, configs] = await Promise.all([getStoredComposioApiKey(), getStoredAuthConfigIds()]);
        if (!apiKey || !configs.google_search_console) {
          console.warn(JSON.stringify({ event: "hub_gsc_config_missing", api_key_present: Boolean(apiKey), auth_config_present: Boolean(configs.google_search_console) }));
          throw new HubGscError("adapter_unavailable", 503);
        }
        return { apiKey, authConfigId: configs.google_search_console };
      },
      start: createConnectLink,
      completeAuth: completeConnectedAccount,
      account: getConnectedAccount,
      sites: composioListSearchConsoleSites,
      query: composioQuerySearchAnalytics,
      inspect: composioInspectUrl,
      sitemaps: composioListSitemaps,
      submitSitemap: composioSubmitSitemap,
    },
  });
}

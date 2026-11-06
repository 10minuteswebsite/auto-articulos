import { prisma } from "@auto-articulos/db";
import {
  composioInspectUrl, composioListSearchConsoleSites, composioListSitemaps, composioQuerySearchAnalytics,
  decryptSecret, getConnectedAccount, getGoogleAccessToken, inspectGoogleUrl,
  listGoogleSearchConsoleSites, listGoogleSitemaps, queryGoogleSearchAnalytics,
} from "@auto-articulos/shared";
import { getStoredComposioApiKey } from "@/lib/composio";
import { validHubBackend } from "@/lib/hub-credential-transport";
import { handleLegacyGscRead, type LegacyGscProvider } from "@/lib/hub-legacy-gsc-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const composioAccount = (provider: Extract<LegacyGscProvider, { source: "composio" }>) => ({
  apiKey: provider.apiKey, userId: provider.userId, connectedAccountId: provider.accountId,
});

/** Read-only reuse: the original app remains the token owner and checks the
 * current tenant, selected property and provider account on each request. */
export async function POST(request: Request) {
  return handleLegacyGscRead(request, {
    authenticate: validHubBackend,
    async load(tenantId, source, id) {
      const user = await prisma.user.findUnique({ where: { hubUserId: tenantId }, select: { id: true } });
      if (!user) return null;
      if (source === "native") {
        const row = await prisma.searchIntegration.findFirst({ where: { id, userId: user.id, provider: "google" }, select: { id: true, siteUrl: true, encryptedRefreshToken: true } });
        return row?.siteUrl ? { tenantId, source, id: row.id, userId: user.id, siteUrl: row.siteUrl, encryptedRefreshToken: row.encryptedRefreshToken } : null;
      }
      const row = await prisma.composioConnection.findFirst({ where: { id, userId: user.id, app: "google_search_console", status: "ACTIVE" }, select: { id: true, siteUrl: true, connectedAccountId: true } });
      return row?.siteUrl ? { tenantId, source, id: row.id, userId: user.id, siteUrl: row.siteUrl, connectedAccountId: row.connectedAccountId } : null;
    },
    async open(row) {
      if (row.source === "native") {
        if (!row.encryptedRefreshToken) throw Error("unavailable");
        return { source: "native", accessToken: await getGoogleAccessToken(decryptSecret(row.encryptedRefreshToken)) };
      }
      const apiKey = await getStoredComposioApiKey();
      if (!apiKey || !row.connectedAccountId) throw Error("unavailable");
      const account = await getConnectedAccount(apiKey, row.connectedAccountId);
      return { source: "composio", apiKey, accountId: account.id, userId: account.userId ?? "", status: account.status, toolkitSlug: account.toolkitSlug };
    },
    async sites(provider) { return provider.source === "native" ? listGoogleSearchConsoleSites(provider.accessToken) : composioListSearchConsoleSites(composioAccount(provider)); },
    async sitemaps(provider, site) { return provider.source === "native" ? listGoogleSitemaps(provider.accessToken, site) : composioListSitemaps(composioAccount(provider), site); },
    async inspect(provider, site, target) { return provider.source === "native" ? inspectGoogleUrl(provider.accessToken, site, target) : composioInspectUrl(composioAccount(provider), site, target); },
    async query(provider, site, start, end, dimensions) { return provider.source === "native" ? queryGoogleSearchAnalytics(provider.accessToken, site, start, end, dimensions) : composioQuerySearchAnalytics(composioAccount(provider), site, start, end, dimensions); },
  });
}

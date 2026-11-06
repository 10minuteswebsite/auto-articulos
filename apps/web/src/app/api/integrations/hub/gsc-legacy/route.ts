import { prisma } from "@auto-articulos/db";
import { validHubBackend } from "@/lib/hub-credential-transport";
import { handleLegacyGscDiscovery } from "@/lib/hub-legacy-gsc-discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Discovery only: no OAuth, token export, provider calls or data mutation. */
export async function POST(request: Request) {
  return handleLegacyGscDiscovery(request, {
    authenticate: validHubBackend,
    async load(tenantId, limit) {
      const user = await prisma.user.findUnique({ where: { hubUserId: tenantId }, select: { id: true } });
      if (!user) return { native: [], composio: [] };
      const [native, composio] = await Promise.all([
        prisma.searchIntegration.findMany({
          where: { userId: user.id, provider: "google", siteUrl: { not: null }, encryptedRefreshToken: { not: "" } },
          select: { id: true, siteDomain: true, siteUrl: true, sitemapUrl: true },
          orderBy: { id: "asc" }, take: limit,
        }),
        prisma.composioConnection.findMany({
          where: { userId: user.id, app: "google_search_console", status: "ACTIVE", siteUrl: { not: null } },
          select: { id: true, siteDomain: true, siteUrl: true, sitemapUrl: true },
          orderBy: { id: "asc" }, take: limit,
        }),
      ]);
      return { native, composio };
    },
  });
}

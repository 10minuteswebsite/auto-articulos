import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { POST as sendGoogleSitemapRoute } from "@/app/api/sitemap/send/route";
import { POST as sendBingSitemapRoute } from "@/app/api/sitemap/send-bing/route";
import { consumeConfirmation, issueConfirmation } from "../confirmation";
import { readRoute, toolText, type ToolDef } from "./shared";

async function confirmOrPreview(input: { userId: string; toolName: string; operation: unknown; confirmar: unknown; confirmacion: unknown; preview: string }) {
  if (input.confirmar !== true) {
    const token = await issueConfirmation({ userId: input.userId, toolName: input.toolName, operation: input.operation });
    return { confirmed: false, text: `${input.preview}\n\nPide confirmación explícita y vuelve a llamar con confirmar=true y confirmacion="${token}".` };
  }
  const confirmed = await consumeConfirmation({ userId: input.userId, toolName: input.toolName, operation: input.operation, token: input.confirmacion });
  return confirmed ? { confirmed: true, text: "" } : { confirmed: false, text: "La confirmación expiró, ya fue usada o no corresponde a esta vista previa. Genera una vista previa nueva." };
}

async function sitemapPreview(provider: "google" | "bing", userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
  const integration = await prisma.searchIntegration.findFirst({
    where: { userId, provider, ...(user.selectedSiteDomain ? { siteDomain: user.selectedSiteDomain } : {}) },
    select: { siteUrl: true, sitemapUrl: true, lastSitemapSyncAt: true, lastSitemapSyncStatus: true },
  });
  return { user, integration };
}

function sitemapTool(provider: "google" | "bing", route: () => Promise<Response>): ToolDef {
  const label = provider === "google" ? "Google Search Console" : "Bing Webmaster Tools";
  const name = provider === "google" ? "enviar_sitemap_google" : "enviar_sitemap_bing";
  return {
    name,
    title: `Enviar sitemap a ${label}`,
    description: `Envía el sitemap del sitio seleccionado a ${label}. Es una operación externa y siempre requiere vista previa y confirmación.`,
    inputSchema: { type: "object", properties: { confirmar: { type: "boolean" }, confirmacion: { type: "string" } }, additionalProperties: false },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    handler: async (args) => {
      const userId = await getCurrentUserId();
      const { user, integration } = await sitemapPreview(provider, userId);
      const operation = { provider, siteDomain: user.selectedSiteDomain ?? null, siteUrl: integration?.siteUrl ?? null, sitemapUrl: integration?.sitemapUrl ?? null };
      const confirmation = await confirmOrPreview({
        userId,
        toolName: name,
        operation,
        confirmar: args.confirmar,
        confirmacion: args.confirmacion,
        preview: `Sin enviar todavía: ${label}, sitio ${integration?.siteUrl ?? user.selectedSiteDomain ?? "no configurado"}, sitemap ${integration?.sitemapUrl ?? "predeterminado o no configurado"}.`,
      });
      if (!confirmation.confirmed) return toolText(confirmation.text, args.confirmar === true);
      const { ok, data } = await readRoute(await route());
      return ok
        ? toolText(`Sitemap enviado a ${label}. Estado: ${String(data.lastSitemapSyncStatus ?? "success")}.`)
        : toolText(String(data.error ?? `No se pudo enviar el sitemap a ${label}.`), true);
    },
  };
}

export const INDEXING_TOOLS: ToolDef[] = [
  sitemapTool("google", sendGoogleSitemapRoute),
  sitemapTool("bing", sendBingSitemapRoute),
];

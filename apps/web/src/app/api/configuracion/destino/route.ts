import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { destinationRevision } from "@/lib/hub-blog-destination";
import { destinationSwitchEnabled, fetchBlogState, HubBlogStateError, type BlogHubState } from "@/lib/hub-blog-state";
import { chooseCategory, deriveView, disconnectBlog, friendlyError, previewPending, useBlog, useWebsite, waitingRuns } from "@/lib/destination-switch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

async function context(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hubUserId: true, publishMethod: true, platformDomain: true, blogIaBlog: true },
  });
  if (!user) return null;
  const [credential, mcp] = await Promise.all([
    prisma.credential.findUnique({ where: { userId_platform: { userId, platform: "10minutesWebsite" } }, select: { userId: true } }),
    prisma.mcpConnection.findFirst({ where: { userId, revokedAt: null }, select: { id: true } }),
  ]);
  return { user, hasWebsite: Boolean(credential || mcp) };
}
async function hubState(hubUserId: string | null): Promise<{ ok: true; state: BlogHubState } | { ok: false }> {
  if (!hubUserId) return { ok: false };
  try { return { ok: true, state: await fetchBlogState(hubUserId) }; } catch (e) {
    if (!(e instanceof HubBlogStateError)) console.error("[DESTINO] error inesperado", e);
    return { ok: false };
  }
}

export async function GET() {
  if (!destinationSwitchEnabled()) return json({ enabled: false });
  const userId = await getCurrentUserId();
  const ctx = await context(userId);
  if (!ctx) return json({ enabled: false });
  const isOwner = !(await headers()).get("x-acting-admin-id");
  const hub = await hubState(ctx.user.hubUserId);
  const target = ctx.user.publishMethod === "BLOG" ? "website" : "blog";
  const [pending, waiting] = await Promise.all([previewPending(prisma, userId, target), waitingRuns(prisma, userId)]);
  const blog = ctx.user.blogIaBlog;
  const view = deriveView({
    publishMethod: ctx.user.publishMethod, hasWebsite: ctx.hasWebsite, siteName: ctx.user.platformDomain ?? null,
    blog: blog as never, hub, isOwner, revision: destinationRevision(ctx.user.publishMethod, blog as never), pending,
  });
  const categories = waiting.some((w) => w.reason === "needs_category")
    ? await prisma.category.findMany({ where: { userId, source: ctx.user.publishMethod === "BLOG" ? "blog" : { not: "blog" } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  return json({ enabled: true, ...view, waiting, categories });
}

export async function POST(request: Request) {
  if (!destinationSwitchEnabled()) return json({ error: "Esta función todavía no está disponible.", code: "disabled" }, 404);
  const userId = await getCurrentUserId();
  if ((await headers()).get("x-acting-admin-id")) return json({ error: "Solo el dueño de la cuenta puede cambiar el destino.", code: "owner_only" }, 403);
  const body = (await request.json().catch(() => null)) as { action?: unknown; confirm?: unknown; revision?: unknown; runId?: unknown; categoryId?: unknown } | null;
  if (!body || body.confirm !== true) return json({ error: "Confirma el cambio para continuar.", code: "confirmation_required" }, 400);
  const requestId = randomUUID();
  try {
    if (body.action === "use_blog") {
      if (typeof body.revision !== "string" || !/^[a-f0-9]{64}$/.test(body.revision)) return json({ error: "Algo cambió, vuelve a intentar.", code: "destination_changed" }, 409);
      const ctx = await context(userId);
      const hub = await hubState(ctx?.user.hubUserId ?? null);
      if (!hub.ok) return json({ error: "No pudimos consultar BLOG IA ahora. Intenta de nuevo.", code: "hub_unavailable" }, 503);
      const result = await useBlog(prisma, { userId, state: hub.state, expectedRevision: body.revision, requestId: hub.state.requestId });
      return json({ ok: true, ...result });
    }
    if (body.action === "use_website") return json({ ok: true, ...(await useWebsite(prisma, { userId, requestId })) });
    if (body.action === "disconnect") return json({ ok: true, ...(await disconnectBlog(prisma, { userId, requestId })) });
    if (body.action === "choose_category" && typeof body.runId === "string" && typeof body.categoryId === "string") {
      return json(await chooseCategory(prisma, { userId, runId: body.runId, categoryId: body.categoryId }));
    }
    return json({ error: "Acción no válida.", code: "invalid_action" }, 400);
  } catch (e) {
    const known = friendlyError(e);
    if (known) return json({ error: known.error, code: known.code }, known.status);
    console.error("[DESTINO] fallo no esperado", requestId, e);
    return json({ error: "No pudimos completar el cambio. No se modificó nada; intenta de nuevo.", code: "unavailable" }, 503);
  }
}

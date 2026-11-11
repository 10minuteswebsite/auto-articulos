import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { fetchBlogState, DEFAULT_LAUNCH_URL, DEFAULT_LANDING_URL, type BlogHubState } from "@/lib/hub-blog-state";
import { blogChoiceView } from "@/lib/blog-ia-choice";
import { isPublishableBlogIa } from "@/lib/publishing-readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Solo lectura: ¿qué hay de BLOG IA para esta persona? Ante cualquier fallo del Hub responde con lo local, nunca con un error. */
export async function GET() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { hubUserId: true, blogIaBlog: true } });
  let hub: BlogHubState | null = null;
  if (user?.hubUserId) {
    try { hub = await fetchBlogState(user.hubUserId); } catch { hub = null; }
  }
  const blog = user?.blogIaBlog ?? null;
  const view = blogChoiceView(hub, { exists: Boolean(blog), publishable: isPublishableBlogIa(blog as never), hostname: blog?.hostname ?? null });
  return NextResponse.json(
    { ...view, launchUrl: hub?.launchUrl ?? DEFAULT_LAUNCH_URL, landingUrl: hub?.landingUrl ?? DEFAULT_LANDING_URL },
    { headers: { "cache-control": "no-store" } },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { composioInstagramPermalink } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredComposioApiKey } from "@/lib/composio";

export const dynamic = "force-dynamic";

/**
 * Enlace público de una publicación de Instagram hecha antes de que se guardara el enlace.
 * Solo lectura sobre la propia cuenta de la persona; el resultado se guarda para no volver a pedirlo.
 */
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  if (typeof body.id !== "string" || !body.id) return NextResponse.json({ error: "Falta indicar la publicación." }, { status: 400 });
  const opp = await prisma.socialOpportunity.findFirst({ where: { id: body.id, userId, status: "published" }, select: { id: true, platform: true, postId: true } });
  if (!opp || !opp.platform.startsWith("instagram") || !opp.postId) return NextResponse.json({ error: "No se encontró esa publicación." }, { status: 404 });
  if (/^https?:\/\//i.test(opp.postId)) return NextResponse.json({ url: opp.postId });
  const [connection, apiKey] = await Promise.all([
    prisma.composioConnection.findFirst({ where: { userId, app: "instagram", status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, select: { connectedAccountId: true } }),
    getStoredComposioApiKey(),
  ]);
  if (!connection || !apiKey) return NextResponse.json({ error: "No pudimos consultar Instagram ahora. Inténtalo más tarde." }, { status: 409 });
  const url = await composioInstagramPermalink({ apiKey, userId, connectedAccountId: connection.connectedAccountId }, opp.postId);
  if (!url) return NextResponse.json({ error: "Instagram no devolvió el enlace de esta publicación." }, { status: 502 });
  await prisma.socialOpportunity.update({ where: { id: opp.id }, data: { postId: url } });
  return NextResponse.json({ url });
}

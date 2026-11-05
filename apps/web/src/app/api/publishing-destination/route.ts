import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { DestinationError, switchToBlog, switchToWebsite } from "@/lib/publishing-destination";

export const dynamic = "force-dynamic";

/** El cliente vuelve a publicar en su sitio de 10minutesWebsite (sale del destino BLOG IA). Requiere confirmación explícita. */
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const body = (await request.json().catch(() => null)) as { destination?: unknown; confirm?: unknown } | null;
  if ((body?.destination !== "website" && body?.destination !== "blog") || body.confirm !== true) {
    return NextResponse.json({ error: "Confirma el destino donde quieres publicar." }, { status: 400 });
  }
  try {
    if (body.destination === "blog") {
      return NextResponse.json({ ok: true, ...(await switchToBlog(prisma as never, userId)) });
    }
    const credential = await prisma.credential.findUnique({ where: { userId_platform: { userId, platform: "10minutesWebsite" } }, select: { userId: true } });
    const result = await switchToWebsite(prisma as never, userId, Boolean(credential));
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof DestinationError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    throw e;
  }
}

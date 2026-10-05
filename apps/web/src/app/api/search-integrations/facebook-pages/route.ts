import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { hasProductAccess } from "@/lib/product-access";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!(await hasProductAccess(userId, "REDES")).allowed) return NextResponse.json({ connected: false });
  const integration = await prisma.facebookPageIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ connected: false });

  return NextResponse.json({
    connected: true,
    facebookPageId: integration.facebookPageId,
    facebookPageName: integration.facebookPageName,
    expiresAt: integration.expiresAt,
    isExpired: integration.expiresAt < new Date(),
  });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!(await hasProductAccess(userId, "REDES")).allowed) return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });
  await prisma.facebookPageIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, getInstagramAccountProfile } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const userId = await getCurrentUserId();
  const integration = await prisma.instagramIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ error: "Instagram no está conectado." }, { status: 400 });
  if (integration.expiresAt <= new Date()) return NextResponse.json({ error: "La autorización de Instagram venció. Conecta la cuenta nuevamente." }, { status: 400 });

  try {
    const profile = await getInstagramAccountProfile(
      decryptSecret(integration.accessTokenEncrypted),
      integration.instagramBusinessAccountId,
    );
    return NextResponse.json({ ok: true, account: `@${profile.username || integration.instagramUsername || profile.id}` });
  } catch (error) {
    console.error("Error al probar la conexión de Instagram:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Meta no pudo verificar la cuenta de Instagram. Puedes reconectarla e intentarlo de nuevo." }, { status: 502 });
  }
}

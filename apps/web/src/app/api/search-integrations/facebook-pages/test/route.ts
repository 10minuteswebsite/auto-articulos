import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, getFacebookPageProfile } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Prueba Facebook Pages sin publicar: valida el token y la Página guardada. */
export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const integration = await prisma.facebookPageIntegration.findUnique({ where: { userId } });
    if (!integration) return NextResponse.json({ error: "Facebook no está conectado." }, { status: 400 });
    if (integration.expiresAt <= new Date()) return NextResponse.json({ error: "La autorización de Facebook venció. Conecta la Página nuevamente." }, { status: 400 });

    const profile = await getFacebookPageProfile(
      decryptSecret(integration.accessTokenEncrypted),
      integration.facebookPageId,
    );
    return NextResponse.json({ ok: true, account: profile.name });
  } catch (error) {
    console.error("Error al probar la conexión de Facebook:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Meta no pudo verificar la Página de Facebook. Puedes reconectarla e intentarlo de nuevo." }, { status: 502 });
  }
}

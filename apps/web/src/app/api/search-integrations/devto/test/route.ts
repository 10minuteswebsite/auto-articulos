import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, verifyDevToApiKey } from "@auto-articulos/shared";
import { getCurrentUser } from "@/lib/current-user";
import { NOT_CONNECTED, runConnectionTest } from "@/lib/connection-test-route";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  const userId = user.id;
  if (!user.canConfigureRedes) {
    return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });
  }
  const integration = await prisma.devToIntegration.findUnique({ where: { userId }, select: { username: true, encryptedApiKey: true } });
  if (!integration) return NextResponse.json({ error: NOT_CONNECTED }, { status: 400 });
  return runConnectionTest("devto", async () => {
    await verifyDevToApiKey(decryptSecret(integration.encryptedApiKey));
    return integration.username ? (integration.username.includes("@") ? integration.username : `@${integration.username}`) : null;
  });
}

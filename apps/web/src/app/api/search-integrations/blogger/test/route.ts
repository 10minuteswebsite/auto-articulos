import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, getBloggerBlogs } from "@auto-articulos/shared";
import { getCurrentUser } from "@/lib/current-user";
import { NOT_CONNECTED, runConnectionTest } from "@/lib/connection-test-route";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  const userId = user.id;
  if (!user.canConfigureRedes) {
    return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });
  }
  const integration = await prisma.bloggerIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ error: NOT_CONNECTED }, { status: 400 });
  return runConnectionTest("blogger", async () => {
    await getBloggerBlogs(decryptSecret(integration.accessTokenEncrypted));
    return integration.blogName || integration.blogId;
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, getTumblrBlogs } from "@auto-articulos/shared";
import { getCurrentUser } from "@/lib/current-user";
import { NOT_CONNECTED, runConnectionTest } from "@/lib/connection-test-route";
import { getStoredTumblrAppCredentials } from "@/lib/tumblr-app-config";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  const userId = user.id;
  if (!user.canConfigureRedes) {
    return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });
  }
  const integration = await prisma.tumblrIntegration.findUnique({ where: { userId } });
  if (!integration) return NextResponse.json({ error: NOT_CONNECTED }, { status: 400 });
  return runConnectionTest("tumblr", async () => {
    if (integration.accessTokenSecretEncrypted) {
      await getTumblrBlogs(decryptSecret(integration.accessTokenEncrypted), decryptSecret(integration.accessTokenSecretEncrypted), await getStoredTumblrAppCredentials());
    } else {
      await getTumblrBlogs(decryptSecret(integration.accessTokenEncrypted));
    }
    return integration.blogTitle || integration.blogIdentifier;
  });
}

import { NextResponse } from "next/server";
import { getTumblrAuthUrl, requestTumblrRequestToken } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";
import { getStoredTumblrAppCredentials } from "@/lib/tumblr-app-config";
import { saveTumblrPending, tumblrReturnHost } from "@/lib/tumblr-pending";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "tumblr"))) return NextResponse.json({ error: "Tumblr no está habilitado para este usuario." }, { status: 403 });
  try {
    const credentials = await getStoredTumblrAppCredentials();
    // Tumblr OAuth1 usa el callback configurado en la aplicación de Tumblr;
    // su endpoint de token temporal rechaza oauth_callback dinámicos.
    // Tumblr vuelve a un dominio (.net) que puede no ser el de la persona (.com),
    // y las cookies no cruzan: el token temporal, su secreto y la persona se
    // guardan cifrados en el servidor (diez minutos) en vez de en cookies.
    const requestToken = await requestTumblrRequestToken(credentials);
    await saveTumblrPending(requestToken.oauthToken, {
      userId,
      oauthTokenSecret: requestToken.oauthTokenSecret,
      returnHost: tumblrReturnHost(new URL(request.url).host),
    });
    return NextResponse.redirect(getTumblrAuthUrl(requestToken.oauthToken));
  } catch (error) {
    console.error("Error iniciando Tumblr OAuth1:", {
      host: new URL(request.url).host,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(new URL("/dashboard/configuracion?tumblr=needs_config", request.url));
  }
}

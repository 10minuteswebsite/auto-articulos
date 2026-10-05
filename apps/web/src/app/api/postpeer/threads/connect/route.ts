import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { startPostPeerSocialConnection } from "@/lib/postpeer";
import { connectionReturnPath } from "@/lib/connection-return";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const origin = new URL(request.url).origin;
  const callback = new URL("/api/postpeer/threads/callback", origin);
  callback.searchParams.set("returnTo", "/dashboard/configuracion/conexiones?conexion=threads&vista=difusion");
  try {
    return NextResponse.redirect(await startPostPeerSocialConnection(user.id, "threads", callback.toString()));
  } catch (error) {
    console.error("PostPeer: no se pudo iniciar la conexión de Threads:", error);
    return NextResponse.redirect(new URL(connectionReturnPath("threads", "error"), origin));
  }
}

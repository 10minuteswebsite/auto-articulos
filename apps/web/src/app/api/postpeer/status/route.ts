import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUser } from "@/lib/current-user";
import { type PostPeerPlatform } from "@auto-articulos/shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const platform = new URL(request.url).searchParams.get("platform") as PostPeerPlatform | null;
  const connection = platform === "threads"
    ? await prisma.postPeerSocialConnection.findUnique({ where: { userId_platform: { userId: user.id, platform } }, select: { status: true, accountId: true, accountName: true, connectedAt: true, lastError: true } })
    : await prisma.postPeerConnection.findUnique({ where: { userId: user.id }, select: { status: true, accountId: true, accountName: true, connectedAt: true, lastError: true } });
  const value = connection ?? { status: "DISCONNECTED", accountId: null, accountName: null, connectedAt: null, lastError: null };
  return NextResponse.json({ ...value, connected: value.status === "ACTIVE" }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { disconnectPostPeerSocialConnection } from "@/lib/postpeer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const userId = await getCurrentUserId();
  const [postPeer, integration] = await Promise.all([
    prisma.postPeerSocialConnection.findUnique({
      where: { userId_platform: { userId, platform: "threads" } },
      select: { status: true, accountId: true, accountName: true, connectedAt: true },
    }),
    prisma.threadsIntegration.findUnique({ where: { userId } }),
  ]);

  if (postPeer?.status === "ACTIVE") {
    return NextResponse.json({
      connected: true,
      connectionSource: "managed",
      threadsUserId: postPeer.accountId,
      threadsUsername: postPeer.accountName?.replace(/^@/, "") ?? null,
      expiresAt: null,
      isExpired: false,
    });
  }

  if (!integration) {
    return NextResponse.json({ connected: false });
  }

  const isExpired = integration.expiresAt < new Date();

  return NextResponse.json({
    connected: true,
    threadsUserId: integration.threadsUserId,
    threadsUsername: integration.threadsUsername,
    expiresAt: integration.expiresAt,
    isExpired,
  });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  const postPeer = await prisma.postPeerSocialConnection.findUnique({
    where: { userId_platform: { userId, platform: "threads" } },
    select: { status: true },
  });

  // La tarjeta usa la conexión administrada cuando está activa. Al desconectar,
  // preservamos la conexión Meta histórica que queda como respaldo.
  if (postPeer?.status === "ACTIVE") {
    await disconnectPostPeerSocialConnection(userId, "threads");
  } else {
    await prisma.threadsIntegration.deleteMany({ where: { userId } });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" };

function pendingKey(userId: string) {
  return `instagram_oauth_pending:${userId}`;
}

type PendingInstagram = {
  expiresAt: string;
  accounts: Array<{
    instagramBusinessAccountId: string;
    instagramUsername: string;
    facebookPageId: string;
    facebookPageName: string;
    publishingAccessToken: string;
  }>;
};

async function readPending(userId: string): Promise<PendingInstagram | null> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: pendingKey(userId) } });
  if (!setting) return null;
  try {
    const pending = JSON.parse(decryptSecret(setting.encryptedValue)) as PendingInstagram;
    if (!pending.expiresAt || new Date(pending.expiresAt) <= new Date() || !Array.isArray(pending.accounts)) {
      await prisma.systemSetting.delete({ where: { key: pendingKey(userId) } }).catch(() => undefined);
      return null;
    }
    return pending;
  } catch {
    await prisma.systemSetting.delete({ where: { key: pendingKey(userId) } }).catch(() => undefined);
    return null;
  }
}

export async function GET() {
  const userId = await getCurrentUserId();
  const pending = await readPending(userId);
  if (pending) {
    return NextResponse.json({
      connected: false,
      pendingSelection: true,
      accounts: pending.accounts.map(({ publishingAccessToken: _token, ...account }) => account),
    }, { headers: NO_CACHE });
  }
  const integration = await prisma.instagramIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    return NextResponse.json({
      connected: false,
      pendingSelection: false,
      accounts: [],
    }, { headers: NO_CACHE });
  }

  const isExpired = integration.expiresAt < new Date();

  return NextResponse.json({
    connected: true,
    instagramBusinessAccountId: integration.instagramBusinessAccountId,
    instagramUsername: integration.instagramUsername,
    expiresAt: integration.expiresAt,
    isExpired,
  }, { headers: NO_CACHE });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const body = await request.json().catch(() => ({})) as { instagramBusinessAccountId?: unknown };
  if (typeof body.instagramBusinessAccountId !== "string" || !body.instagramBusinessAccountId.trim()) {
    return NextResponse.json({ error: "Selecciona una cuenta de Instagram." }, { status: 400, headers: NO_CACHE });
  }

  const pending = await readPending(userId);
  const account = pending?.accounts.find((item) => item.instagramBusinessAccountId === body.instagramBusinessAccountId);
  if (!pending || !account) {
    return NextResponse.json({ error: "La autorización de Instagram venció. Conecta la cuenta nuevamente." }, { status: 400, headers: NO_CACHE });
  }

  const expiresAt = new Date(pending.expiresAt);
  await prisma.instagramIntegration.upsert({
    where: { userId },
    create: {
      userId,
      instagramBusinessAccountId: account.instagramBusinessAccountId,
      instagramUsername: account.instagramUsername,
      accessTokenEncrypted: encryptSecret(account.publishingAccessToken),
      expiresAt,
    },
    update: {
      instagramBusinessAccountId: account.instagramBusinessAccountId,
      instagramUsername: account.instagramUsername,
      accessTokenEncrypted: encryptSecret(account.publishingAccessToken),
      expiresAt,
    },
  });

  if (await canUseSocialModule(userId)) {
    await prisma.facebookPageIntegration.upsert({
      where: { userId },
      create: {
        userId,
        facebookPageId: account.facebookPageId,
        facebookPageName: account.facebookPageName,
        accessTokenEncrypted: encryptSecret(account.publishingAccessToken),
        expiresAt,
      },
      update: {
        facebookPageId: account.facebookPageId,
        facebookPageName: account.facebookPageName,
        accessTokenEncrypted: encryptSecret(account.publishingAccessToken),
        expiresAt,
      },
    });
  }

  await prisma.systemSetting.delete({ where: { key: pendingKey(userId) } }).catch(() => undefined);
  return NextResponse.json({ ok: true, instagramUsername: account.instagramUsername, facebookPageName: account.facebookPageName }, { headers: NO_CACHE });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.instagramIntegration.deleteMany({ where: { userId } });
  await prisma.systemSetting.delete({ where: { key: pendingKey(userId) } }).catch(() => undefined);
  return NextResponse.json({ ok: true }, { headers: NO_CACHE });
}

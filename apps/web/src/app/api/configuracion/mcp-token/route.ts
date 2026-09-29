import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { generateMcpApiToken, hashMcpApiToken } from "@/lib/mcp/api-token";

export const dynamic = "force-dynamic";

/** Metadatos del token activo (nunca el valor real: ya no se puede leer tras generarlo). */
export async function GET() {
  const userId = await getCurrentUserId();
  const token = await prisma.mcpApiToken.findUnique({
    where: { userId },
    select: { name: true, createdAt: true, lastUsedAt: true, revokedAt: true },
  });
  if (!token || token.revokedAt) {
    return NextResponse.json({ active: false });
  }
  return NextResponse.json({
    active: true,
    name: token.name,
    createdAt: token.createdAt,
    lastUsedAt: token.lastUsedAt,
  });
}

/** Genera un token nuevo (revoca/reemplaza el anterior). Devuelve el valor una sola vez. */
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "Asistente IA";

  const token = generateMcpApiToken();
  const tokenHash = hashMcpApiToken(token);

  await prisma.mcpApiToken.upsert({
    where: { userId },
    create: { userId, tokenHash, name },
    update: { tokenHash, name, revokedAt: null, lastUsedAt: null },
  });

  return NextResponse.json({ token, name });
}

/** Revoca el token activo. */
export async function DELETE() {
  const userId = await getCurrentUserId();
  await prisma.mcpApiToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ active: false });
}

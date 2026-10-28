import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { hashMcpApiToken, MCP_API_TOKEN_PREFIX } from "@/lib/mcp/api-token";

/**
 * Resuelve un token personal de API (prefijo `sta_`) a su `userId`.
 *
 * Existe como ruta aparte, en vez de resolverse directo en `middleware.ts`,
 * porque este token se verifica contra la base (hash + revocado), y Prisma
 * usa binarios nativos que no corren en el Edge Runtime donde vive el
 * middleware. El middleware llama a esta ruta (nodejs) con un `fetch`
 * interno server-a-server — el patrón que Vercel recomienda para este split
 * edge/node — y con la respuesta arma el `x-user-id` como con cualquier
 * otra autenticación. No expone más de lo que ya expone `/api/mcp`: sin un
 * token válido no hay nada que ver.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer || !bearer.startsWith(MCP_API_TOKEN_PREFIX)) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const tokenHash = hashMcpApiToken(bearer);
  let token;
  try {
    token = await prisma.mcpApiToken.findFirst({
      where: { tokenHash, revokedAt: null },
      select: { id: true, userId: true },
    });
  } catch {
    console.warn("[mcp-auth] token_lookup_unavailable");
    return NextResponse.json({ error: "Validación de conexión temporalmente no disponible" }, { status: 503, headers: { "Retry-After": "5", "Cache-Control": "no-store" } });
  }
  if (!token) {
    return NextResponse.json({ error: "Token inválido o revocado" }, { status: 401 });
  }

  // Persistir antes de responder; el fallo de esta métrica no invalida una
  // credencial comprobada. No marcar como usado un reemplazo concurrente.
  await prisma.mcpApiToken.updateMany({
    where: { id: token.id, tokenHash, revokedAt: null },
    data: { lastUsedAt: new Date() },
  }).catch(() => console.warn("[mcp-auth] token_usage_unavailable"));

  return NextResponse.json({ userId: token.userId }, { headers: { "Cache-Control": "no-store" } });
}

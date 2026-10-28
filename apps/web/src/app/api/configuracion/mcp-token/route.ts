import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { getMcpCredentialState, issueMcpCredential, revokeMcpCredential, McpCredentialConflict } from "@/lib/mcp/credential-store";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "no-store" };

/** Metadatos del token activo (nunca el valor real: ya no se puede leer tras generarlo). */
export async function GET() {
  const userId = await getCurrentUserId();
  return NextResponse.json(await getMcpCredentialState(userId), { headers: privateHeaders });
}

/** Genera un token nuevo (revoca/reemplaza el anterior). Devuelve el valor una sola vez. */
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const raw: unknown = await request.json().catch(() => ({}));
  const body = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "Asistente IA";

  try {
    const result = await issueMcpCredential(userId, { name, replaceExisting: body.replaceExisting === true, expectedVersion: body.expectedVersion });
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof McpCredentialConflict) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409, headers: privateHeaders });
    }
    console.warn("[mcp-auth] credential_issue_unavailable");
    return NextResponse.json({ error: "No se pudo generar el token. Inténtalo de nuevo en un momento." }, { status: 503, headers: privateHeaders });
  }
}

/** Revoca el token activo. */
export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  const body = await request.json().catch(() => null) as { expectedVersion?: unknown } | null;
  try {
    await revokeMcpCredential(userId, body?.expectedVersion);
    return NextResponse.json({ active: false }, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof McpCredentialConflict) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409, headers: privateHeaders });
    }
    console.warn("[mcp-auth] credential_revoke_unavailable");
    return NextResponse.json({ error: "No se pudo revocar el token. Inténtalo de nuevo en un momento." }, { status: 503, headers: privateHeaders });
  }
}

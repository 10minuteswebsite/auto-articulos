import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { getStoredComposioApiKey } from "@/lib/composio";
import { callbackVerifierCandidates } from "@/lib/composio-project-status";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

/** Read-only diagnostic. It cannot change a shared project or return its values. */
export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403, headers }); }
  try {
    const apiKey = await getStoredComposioApiKey();
    if (!apiKey) return NextResponse.json({ state: "unavailable" }, { status: 503, headers });
    const response = await fetch("https://backend.composio.dev/api/v3/org/project/config", {
      headers: { "x-api-key": apiKey }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return NextResponse.json({ state: "unavailable" }, { status: 503, headers });
    return NextResponse.json({ candidates: callbackVerifierCandidates(await response.json()) }, { headers });
  } catch { return NextResponse.json({ state: "unavailable" }, { status: 503, headers }); }
}

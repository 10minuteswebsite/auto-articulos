import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { getStoredComposioApiKey } from "@/lib/composio";
import { readComposioProjectStatus } from "@/lib/composio-project-status";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

/** Read-only diagnostic. It cannot change a shared project or return its values. */
export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403, headers }); }
  try {
    const result = await readComposioProjectStatus(await getStoredComposioApiKey());
    return NextResponse.json(result, { status: result.state === "ok" ? 200 : 503, headers });
  } catch { return NextResponse.json({ state: "unavailable" }, { status: 503, headers }); }
}

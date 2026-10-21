import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { authorize } from "@/lib/blog-ia-wizard";
import { json, loadActor } from "@/lib/blog-ia-wizard-runtime";
import { analyzeSite, createThrottle } from "@/lib/blog-ia-site-analysis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// 10 análisis cada 10 minutos por persona.
const allow = createThrottle(10, 10 * 60_000);

/** Propone marca, logo, menú y pie leyendo la portada pública. NO guarda nada. */
export async function POST(request: Request) {
  const actor = await loadActor();
  const who = authorize(actor);
  if (!who.ok) return json(who);
  if (!allow(who.value)) {
    return NextResponse.json({ error: "Hiciste muchos análisis seguidos. Inténtalo en unos minutos o escribe los datos a mano.", retryable: true }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  if (typeof body?.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "Escribe la dirección de tu sitio." }, { status: 400 });
  }
  const result = await analyzeSite(body.url, {
    resolveHost: async (hostname) => (await lookup(hostname, { all: true })).map((r) => r.address),
  });
  if (!result.ok) return NextResponse.json({ error: result.error, manual: true }, { status: 422 });
  return NextResponse.json({ suggestions: result.value, finalUrl: result.finalUrl });
}

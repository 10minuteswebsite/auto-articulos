import { NextResponse } from "next/server";
import { resolveNs } from "node:dns/promises";
import { authorize, validateHostname } from "@/lib/blog-ia-wizard";
import { json, loadActor } from "@/lib/blog-ia-wizard-runtime";
import { detectProvider, splitHostname } from "@/lib/blog-ia-dns-help";
import { createThrottle } from "@/lib/blog-ia-site-analysis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const allow = createThrottle(30, 10 * 60_000);

/**
 * Detecta en qué proveedor está el DNS del dominio del cliente (consulta pública de
 * servidores de nombres). Solo lectura: no cambia nada. Si no se reconoce, la
 * pantalla ofrece la lista de proveedores y una guía genérica.
 */
export async function POST(request: Request) {
  const actor = await loadActor();
  const who = authorize(actor);
  if (!who.ok) return json(who);
  if (!allow(who.value)) return NextResponse.json({ error: "Demasiadas consultas seguidas; inténtalo en unos minutos." }, { status: 429 });
  const body = (await request.json().catch(() => null)) as { hostname?: unknown } | null;
  const host = validateHostname(body?.hostname);
  if (!host.ok) return json(host);
  const { registrable, label, full } = splitHostname(host.value);
  let nameservers: string[] = [];
  try {
    nameservers = await resolveNs(registrable);
  } catch {
    /* sin NS (dominio nuevo o sin delegar): la guía genérica sigue sirviendo */
  }
  const provider = detectProvider(nameservers);
  return NextResponse.json({ providerId: provider?.id ?? null, providerName: provider?.name ?? null, nameservers, registrable, label, full });
}

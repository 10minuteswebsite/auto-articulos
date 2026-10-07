import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";
import { requireProductAccess } from "@/lib/require-product-access";
import { POST as generateOpportunities } from "../generate/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const denied = await requireProductAccess(userId, "REDES", "/api/social-opportunities/generate-all");
    if (denied) return denied;
    if (!(await canUseSocialModule(userId))) {
      return NextResponse.json({ error: "Esta sección no está habilitada para tu cuenta. Pídele acceso al administrador." }, { status: 403 });
    }

    // Una sola ejecución coordinada. La ruta de generación autentica una vez,
    // carga las señales una vez y aplica los límites a todas las redes. X queda
    // fuera del producto actual; Google Business sí participa cuando aplica.
    const networks = ["threads", "linkedin", "instagram", "facebook-page", "pinterest", "tumblr", "bluesky", "blogger", "google-business"];
    // No hacer fetch contra la propia aplicación: en producción puede crear
    // una segunda ejecución de Vercel que queda esperando o agota el tiempo.
    // Reutilizamos la ruta directamente y conservamos la identidad del
    // usuario mediante los mismos headers de la petición original.
    const headers = new Headers(request.headers);
    headers.set("Content-Type", "application/json");
    const internalRequest = new Request(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ networks }),
    });
    const res = await generateOpportunities(internalRequest);
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error al generar oportunidades: ${errorMessage}` }, { status: 500 });
  }
}

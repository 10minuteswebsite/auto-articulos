import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { requireProductAccess } from "@/lib/require-product-access";
import { productOfHost } from "@/lib/product-routes";

/**
 * Log completo de un título (incluye capturas de diagnóstico en base64), a
 * diferencia de GET /api/runs que solo trae el último evento para no gastar
 * la cuota de transferencia de Neon en cada poll. Se llama bajo demanda,
 * solo cuando alguien expande "Ver todos los pasos" / "Ver log".
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  // Historial es compartido, pero conserva la compuerta del producto desde el
  // que se solicita para no ampliar acceso entre productos.
  const product = productOfHost(_request.nextUrl.hostname) === "REDES" ? "REDES" : "ARTICULOS";
  const denied = await requireProductAccess(userId, product, "/api/titles/[id]/events");
  if (denied) return denied;
  const { id } = await params;

  const title = await prisma.title.findFirst({
    where: { id, run: { userId } },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  if (!title) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ events: title.events });
}

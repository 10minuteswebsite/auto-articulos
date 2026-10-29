import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";

// Primera entrada de una cuenta creada desde el Hub: el Hub no manda el continente, así
// que se pregunta una sola vez. Europa -> servidor .site; resto del mundo -> .net.
// tagcrush.net no se elige aquí: se asigna a mano desde Administración.
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const body = (await request.json().catch(() => null)) as { region?: unknown } | null;
  const region = body?.region;
  if (region !== "europe" && region !== "other") {
    return NextResponse.json({ error: "Selecciona Europa u otra región." }, { status: 400 });
  }
  // Solo mientras la región siga sin confirmar: nunca cambia el servidor de una cuenta ya confirmada.
  const updated = await prisma.user.updateMany({
    where: { id: userId, platformDomainConfirmedAt: null },
    data: { platformDomain: region === "europe" ? "site" : "net", platformDomainConfirmedAt: new Date() },
  });
  return NextResponse.json({ ok: true, changed: updated.count > 0 });
}

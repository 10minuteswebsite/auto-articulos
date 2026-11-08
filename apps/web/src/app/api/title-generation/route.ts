import { NextRequest, NextResponse, after } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { runGuardShadow } from "@/lib/title-guard-shadow";
import { requireProductAccess } from "@/lib/require-product-access";
import {
  TitleGenerationError,
  generateTitlesForUser,
  getTitleGenerationStatus,
} from "@/lib/title-generation";
import { validateInputs } from "@/lib/title-generation-core";
import { prisma } from "@auto-articulos/db";
import { publishingReadiness } from "@/lib/publishing-readiness";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Hasta dos llamadas a la IA (la primera y un reintento), cada una con su
// propio tope de 40 s. Ninguna otra ruta de la app define maxDuration.
export const maxDuration = 60;

/** Estado para la pantalla: si la función está disponible y cuántas solicitudes le quedan hoy. */
export async function GET() {
  const userId = await getCurrentUserId();
  const denied = await requireProductAccess(userId, "ARTICULOS", "/api/title-generation");
  if (denied) return denied;
  const status = await getTitleGenerationStatus(userId);
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const denied = await requireProductAccess(userId, "ARTICULOS", "/api/title-generation");
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as {
    categoryId?: unknown;
    contentLanguage?: unknown;
    inputs?: unknown;
  };

  if (typeof body.categoryId !== "string" || !body.categoryId) {
    return NextResponse.json({ error: "Elige una categoría.", code: "NO_CATEGORY" }, { status: 400 });
  }
  const inputs = validateInputs(body.inputs);
  if (!inputs.ok) {
    return NextResponse.json({ error: inputs.error, code: "INVALID_INPUTS" }, { status: 400 });
  }

  // La guardia debe ejecutarse antes de generar títulos: un BLOG IA sin dominio
  // propio válido no puede consumir IA ni dejar un lote incompleto.
  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId, platform: "10minutesWebsite" } },
    select: { id: true },
  });
  const readiness = await publishingReadiness(prisma, userId, Boolean(credential));
  if (!readiness.ready) {
    return NextResponse.json({
      error: readiness.destination === "blog-ia"
        ? "Antes de escribir artículos debes crear BLOG IA y conectar y confirmar tu dominio propio. La dirección provisional no permite publicar. Abre BLOG IA para resolverlo."
        : "Antes de escribir artículos debes conectar un destino publicable.",
      code: "PUBLISHING_DESTINATION_UNAVAILABLE",
      actionUrl: "https://hub.lasolucionweb.net/api/product-launch?app=blog-ia",
    }, { status: 400 });
  }

  try {
    const result = await generateTitlesForUser({
      userId,
      categoryId: body.categoryId,
      languageValue: typeof body.contentLanguage === "string" ? body.contentLanguage : "",
      inputs: inputs.value,
      // Guardia de ángulos en modo sombra: corre DESPUÉS de responder y nunca cambia lo que se entrega.
      afterGenerated: (info) => after(() => runGuardShadow(info)),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TitleGenerationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[title-generation] error inesperado", error);
    return NextResponse.json(
      { error: "No se pudieron crear los títulos. No se descontó ninguna solicitud; inténtalo de nuevo.", code: "UNEXPECTED" },
      { status: 500 },
    );
  }
}

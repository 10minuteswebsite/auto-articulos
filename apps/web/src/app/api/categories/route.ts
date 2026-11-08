import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getCurrentUserId();

  // Las categorías pertenecen al destino de publicación activo. BLOG IA se
  // lee por el canal firmado del blog y se proyecta localmente con
  // `source="blog"`; nunca se mezcla con categorías de 10MWS que hayan
  // quedado de una configuración anterior.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publishMethod: true },
  });
  const categorySource = user?.publishMethod === "BLOG" ? "blog" : { notIn: ["blog", "archived"] };

  const [categories, lastSyncJob] = await Promise.all([
    prisma.category.findMany({
      where: { userId, platform: "10minutesWebsite", source: categorySource },
      orderBy: { name: "asc" },
    }),
    prisma.categorySyncJob.findFirst({
      where: { userId, mode: "sync" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ categories, lastSyncJob });
}

export async function POST(request: import("next/server").NextRequest) {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { publishMethod: true } });
  if (user?.publishMethod === "BLOG") {
    return NextResponse.json(
      { error: "Las categorías de BLOG IA se crean y administran en BLOG IA. Aquí solo se pueden traer para usarlas en Artículos." },
      { status: 409 },
    );
  }
  const body = await request.json().catch(() => ({}));
  const { name, externalId } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name es requerido" }, { status: 400 });
  }
  const cleanName = name.trim();
  const cleanId =
    typeof externalId === "string" && externalId.trim()
      ? externalId.trim()
      : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const category = await prisma.category.upsert({
    where: {
      userId_platform_panel_externalId: {
        userId,
        platform: "10minutesWebsite",
        // Sin selector de panel en este formulario todavía: las manuales
        // quedan en el panel "" (cuentas de un solo panel, el caso común).
        panel: "",
        externalId: cleanId,
      },
    },
    create: {
      userId,
      platform: "10minutesWebsite",
      externalId: cleanId,
      name: cleanName,
      isSequence: false,
      // "manual": la escribió la persona a mano, no viene del sitio. La
      // reconciliación de processNextCategorySync() (ver categorySync.ts en
      // el worker) solo reemplaza las de source "sync" — sin esta marca, el
      // próximo sync exitoso la borraría por no coincidir con el sitio real.
      source: "manual",
    },
    update: { name: cleanName },
  });

  return NextResponse.json({ ok: true, category });
}

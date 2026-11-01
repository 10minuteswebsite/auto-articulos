import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Solo administrador. Lo que la guardia decidiría (modo sombra), solicitud por solicitud.
/** Qué base usa la app: solo el servidor y el identificador del proyecto (jamás la contraseña ni la cadena completa). */
function databaseIdentity() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    const user = decodeURIComponent(url.username);
    const ref = user.startsWith("postgres.") ? user.slice("postgres.".length) : (url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1] ?? "desconocido");
    return { servidor: url.hostname, puerto: url.port || "5432", proyecto: ref };
  } catch {
    return { servidor: "desconocido", puerto: "", proyecto: "desconocido" };
  }
}

const TABLAS_DE_LA_GUARDIA = ["SiteArticleTitle", "ArticleTitleDiscard", "TitleOrigin", "TitleExplanation", "TitleGuardReport"];

async function tablasExistentes() {
  try {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('SiteArticleTitle','ArticleTitleDiscard','TitleOrigin','TitleExplanation','TitleGuardReport')`;
    const found = new Set(rows.map((r) => r.table_name));
    return Object.fromEntries(TABLAS_DE_LA_GUARDIA.map((t) => [t, found.has(t)]));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    // Filtro por cuenta: ?userId=... (solo lectura). Sin filtro, los 30 más recientes de todas las cuentas.
    const userId = request.nextUrl.searchParams.get("userId")?.trim() || undefined;
    const where = userId ? { userId } : undefined;
    const rows = await prisma.titleGuardReport.findMany({ where, orderBy: { createdAt: "desc" }, take: userId ? 60 : 30 });
    const total = await prisma.titleGuardReport.count({ where });
    // Cuentas con reportes (para el selector del panel): correo y cuántos reportes tiene cada una.
    const grouped = await prisma.titleGuardReport.groupBy({ by: ["userId"], _count: { _all: true }, orderBy: { _count: { userId: "desc" } }, take: 100 }).catch(() => []);
    const owners = grouped.length ? await prisma.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } }, select: { id: true, email: true } }) : [];
    const emailOf = new Map(owners.map((u) => [u.id, u.email] as const));
    const cuentas = grouped.map((g) => ({ userId: g.userId, correo: emailOf.get(g.userId) ?? g.userId, reportes: g._count._all }));
    return NextResponse.json({
      disponible: true,
      baseDeDatosDeLaApp: databaseIdentity(),
      total,
      cuentas,
      reportes: rows.map((r) => ({
        id: r.id,
        fecha: r.createdAt,
        categoria: r.categoryName,
        userId: r.userId,
        modo: r.mode,
        candidatos: r.candidates,
        entregadosHoy: r.legacyTitles.length,
        limpios: r.nClean,
        parecidos: r.nSimilar,
        completadosConNota: r.completedWithNotes,
        memoriaUsada: (r.details as { memoria?: unknown } | null)?.memoria ?? null,
        juez: r.judgeUsed ? `${r.judgeModel} (${r.judgePairs} pares, ${r.judgeMs ?? "?"} ms)` : r.judgePairs > 0 ? "no respondió" : "no hizo falta",
        error: r.errorMessage,
        detalle: r.details,
      })),
    });
  } catch (error) {
    // Solo lo ve un administrador: se muestra la causa real para no adivinar (tabla ausente, columna distinta, conexión…).
    const causa = error instanceof Error ? error.message.replace(/\s+/g, " ").slice(0, 400) : String(error);
    return NextResponse.json({
      disponible: false,
      mensaje: "No se pudo leer el registro de la guardia. Si la tabla TitleGuardReport no existe, aplica la migración antes de pasar a modo sombra.",
      causa,
      baseDeDatosDeLaApp: databaseIdentity(),
      tablasEnEsaBase: await tablasExistentes(),
    });
  }
}

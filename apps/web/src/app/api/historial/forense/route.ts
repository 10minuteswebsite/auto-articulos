import { NextRequest, NextResponse } from "next/server";
import { prisma, type Prisma } from "@auto-articulos/db";
import { getCurrentUser, getCurrentUserId, getActingAdmin } from "@/lib/current-user";
import { requireProductAccess } from "@/lib/require-product-access";

// Historial forense de Artículos (Fase 1, solo lectura, sin tablas nuevas).
// Devuelve cada título con TODOS sus datos para poder investigar qué pasó:
// no se pudo publicar, cancelado, en curso, propuestas de temas y la línea de
// tiempo de eventos. No toca el contrato de GET /api/runs (que sigue limitado
// a 20 ejecuciones): esta ruta pagina y no trae capturas de diagnóstico.

const SECCIONES = ["errores", "cancelados", "en-curso", "propuestos", "eventos"] as const;
type Seccion = (typeof SECCIONES)[number];

const PAGE_SIZE = 50;
const CSV_MAX = 5000;
const EVENT_MESSAGE_MAX = 600;

const ESTADOS: Partial<Record<Seccion, Prisma.TitleWhereInput["status"]>> = {
  errores: "error",
  cancelados: "cancelled",
  "en-curso": { in: ["pending", "processing"] },
};

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.join(" | ") : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "﻿sin datos\n";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvCell(row[h])).join(","));
  return "﻿" + lines.join("\n") + "\n";
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const denied = await requireProductAccess(userId, "ARTICULOS", "/api/historial/forense");
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const seccion = params.get("seccion") ?? "resumen";
  const todos = params.get("todos") === "1";
  const cursor = params.get("cursor") || undefined;
  const csv = params.get("formato") === "csv";

  const account = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { selectedSiteDomain: true },
  });
  const siteFilter = !todos && account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {};
  const runScope: Prisma.RunWhereInput = {
    userId,
    category: { name: { not: "FIX_PATRICIA" }, ...siteFilter },
  };

  if (seccion === "resumen") {
    const counts = await Promise.all([
      prisma.title.count({ where: { status: "error", run: runScope } }),
      prisma.title.count({ where: { status: "cancelled", run: runScope } }),
      prisma.title.count({ where: { status: { in: ["pending", "processing"] }, run: runScope } }),
      prisma.titleGenerationRequest.count({ where: { userId } }),
      prisma.titleEvent.count({ where: { title: { run: runScope } } }),
    ]);
    return NextResponse.json({
      resumen: Object.fromEntries(SECCIONES.map((name, index) => [name, counts[index]])),
    });
  }

  if (!SECCIONES.includes(seccion as Seccion)) {
    return NextResponse.json({ error: "Sección no válida." }, { status: 400 });
  }

  if (csv) {
    const user = await getCurrentUser();
    const acting = user.role === "admin" ? null : await getActingAdmin();
    if (user.role !== "admin" && !acting) {
      return NextResponse.json({ error: "La exportación está reservada al administrador." }, { status: 403 });
    }
  }
  const take = csv ? CSV_MAX : PAGE_SIZE + 1;
  const cursorArgs: { cursor?: { id: string }; skip?: number } = !csv && cursor ? { cursor: { id: cursor }, skip: 1 } : {};

  let rows: Array<Record<string, unknown> & { id: string }> = [];

  if (seccion === "propuestos") {
    const found = await prisma.titleGenerationRequest.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...cursorArgs,
    });
    rows = found.map((r) => ({
      id: r.id,
      fecha: r.createdAt,
      dia: r.dayKey,
      espacio: r.slot,
      categoria: r.categoryName,
      categoriaId: r.categoryId,
      titulosOfrecidos: r.offeredTitles,
      entradasDelUsuario: r.inputs,
    }));
  } else if (seccion === "eventos") {
    const found = await prisma.titleEvent.findMany({
      where: { title: { run: runScope } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...cursorArgs,
      include: {
        title: { select: { id: true, text: true, status: true, runId: true, run: { select: { category: { select: { name: true } } } } } },
      },
    });
    rows = found.map((e) => ({
      id: e.id,
      fecha: e.createdAt,
      titulo: e.title.text,
      estadoDelTitulo: e.title.status,
      categoria: e.title.run.category.name,
      tituloId: e.titleId,
      ejecucionId: e.title.runId,
      // Las capturas de diagnóstico pueden pesar cientos de KB (ver GET /api/runs).
      evento: e.message.length > EVENT_MESSAGE_MAX ? `${e.message.slice(0, EVENT_MESSAGE_MAX)}…` : e.message,
    }));
  } else {
    const found = await prisma.title.findMany({
      where: { status: ESTADOS[seccion as Seccion], run: runScope },
      orderBy: [{ run: { createdAt: "desc" } }, { id: "desc" }],
      take,
      ...cursorArgs,
      include: {
        run: { select: { id: true, status: true, createdAt: true, finishedAt: true, contentLanguage: true, disableIndexing: true, category: { select: { name: true, siteDomain: true } } } },
        events: { orderBy: { createdAt: "desc" }, take: 1, select: { message: true, createdAt: true } },
      },
    });
    rows = found.map((t) => ({
      id: t.id,
      titulo: t.text,
      tituloFinal: t.finalTitle,
      estado: t.status,
      intentos: t.attempts,
      motivo: t.errorMessage,
      categoria: t.run.category.name,
      sitio: t.run.category.siteDomain,
      ejecucionId: t.run.id,
      estadoEjecucion: t.run.status,
      ejecucionCreada: t.run.createdAt,
      ejecucionTerminada: t.run.finishedAt,
      idioma: t.run.contentLanguage,
      sinIndexar: t.run.disableIndexing,
      origenOportunidad: t.opportunityCreatedAt,
      procesado: t.processedAt,
      publicado: t.publishedAt,
      enlace: t.articleUrl,
      ultimoEvento: t.events[0] ? (t.events[0].message.length > EVENT_MESSAGE_MAX ? `${t.events[0].message.slice(0, EVENT_MESSAGE_MAX)}…` : t.events[0].message) : null,
      ultimoEventoFecha: t.events[0]?.createdAt ?? null,
    }));
  }

  if (csv) {
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="historial-${seccion}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return NextResponse.json({
    rows: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}

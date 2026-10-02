import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { hasProductAccess, PRODUCTS, type ProductKey } from "@/lib/product-access";
import { computeNextEntitlement } from "@/lib/product-entitlement-transition";

/*
 * ADMINISTRACIÓN DE DERECHOS POR PRODUCTO (proyecto «SEPARACION DE SEO TOTAL»,
 * Lote 1; Parte A §2.5).
 *
 *   GET  → los dos derechos de la cuenta, su acceso efectivo y los últimos
 *          eventos de la bitácora.
 *   PUT  → set_status (ACTIVE/INACTIVE), grant_grace (N días) o remove_grace.
 *
 * Toda escritura sube `version` y deja una fila en ProductEntitlementEvent
 * (bitácora de solo añadir). Solo administradores. Mientras el interruptor
 * `product_enforcement` esté en «off», cambiar un derecho NO bloquea a nadie:
 * solo prepara los datos.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };
const MAX_REASON_LEN = 300;

function isProduct(value: unknown): value is ProductKey {
  return typeof value === "string" && (PRODUCTS as readonly string[]).includes(value);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403, headers: NO_STORE });
  }
  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404, headers: NO_STORE });
    }
    const [entitlements, events, articulos, redes] = await Promise.all([
      prisma.productEntitlement.findMany({ where: { userId: id } }),
      prisma.productEntitlementEvent.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      hasProductAccess(id, "ARTICULOS"),
      hasProductAccess(id, "REDES"),
    ]);
    return NextResponse.json(
      { userId: id, entitlements, effective: { articulos, redes }, events },
      { headers: NO_STORE },
    );
  } catch (error) {
    // Lo más probable: la migración de derechos todavía no está aplicada.
    console.error("[admin/entitlements] GET falló:", error);
    return NextResponse.json(
      { error: "No se pudieron leer los derechos (¿migración pendiente?)" },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403, headers: NO_STORE });
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const product: unknown = body?.product;
  const action: unknown = body?.action;
  const reasonRaw: unknown = body?.reason;
  const reason =
    typeof reasonRaw === "string" && reasonRaw.trim()
      ? reasonRaw.trim().slice(0, MAX_REASON_LEN)
      : null;

  if (!isProduct(product)) {
    return NextResponse.json({ error: "product debe ser ARTICULOS o REDES" }, { status: 400, headers: NO_STORE });
  }
  if (action !== "set_status" && action !== "grant_grace" && action !== "remove_grace") {
    return NextResponse.json(
      { error: "action debe ser set_status, grant_grace o remove_grace" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404, headers: NO_STORE });
    }

    const current = await prisma.productEntitlement.findUnique({
      where: { userId_product: { userId: id, product } },
    });

    const transition = computeNextEntitlement(
      current ? { status: current.status, graceUntil: current.graceUntil } : null,
      action,
      { status: body?.status, days: body?.days },
      new Date(),
    );
    if (!transition.ok) return NextResponse.json({ error: transition.error }, { status: 400, headers: NO_STORE });
    const nextStatus = transition.status;
    const nextGraceUntil = transition.graceUntil;

    // Cambio + bitácora en una sola transacción: nunca uno sin el otro.
    const [entitlement] = await prisma.$transaction([
      prisma.productEntitlement.upsert({
        where: { userId_product: { userId: id, product } },
        create: {
          userId: id,
          product,
          status: nextStatus,
          graceUntil: nextGraceUntil,
          source: "ADMIN",
          note: reason,
          updatedBy: adminId,
        },
        update: {
          status: nextStatus,
          graceUntil: nextGraceUntil,
          source: "ADMIN",
          version: { increment: 1 },
          ...(reason ? { note: reason } : {}),
          updatedBy: adminId,
        },
      }),
      prisma.productEntitlementEvent.create({
        data: {
          userId: id,
          product,
          fromStatus: current?.status ?? null,
          toStatus: nextStatus,
          fromGraceUntil: current?.graceUntil ?? null,
          toGraceUntil: nextGraceUntil,
          source: "ADMIN",
          actorUserId: adminId,
          reason,
        },
      }),
    ]);

    auditLog("product_entitlement_changed", adminId, {
      targetUserId: id,
      product,
      action,
      from: current?.status ?? null,
      to: nextStatus,
      graceUntil: nextGraceUntil?.toISOString() ?? null,
    });

    const effective = await hasProductAccess(id, product);
    return NextResponse.json({ entitlement, effective }, { headers: NO_STORE });
  } catch (error) {
    console.error("[admin/entitlements] PUT falló:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el derecho (¿migración pendiente?)" },
      { status: 503, headers: NO_STORE },
    );
  }
}

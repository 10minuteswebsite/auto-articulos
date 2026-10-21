import { createHash } from "node:crypto";
import { resolveCname } from "node:dns/promises";
import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { BlogIaError, sendBlogIaEvent } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getEnforcementMode, decideEnforcement } from "@/lib/product-enforcement";
import { hasProductAccess } from "@/lib/product-access";
import {
  SendError,
  type Actor,
  type BlogRecord,
  type BlogStatus,
  type Result,
  type WizardConfig,
  type WizardDeps,
  type WizardStore,
} from "@/lib/blog-ia-wizard";

/*
 * Pegamento entre el núcleo del wizard (blog-ia-wizard.ts, sin Prisma ni red) y
 * el servidor real: tienda Prisma, envío firmado, DNS y sonda HTTPS.
 * Nada aquí se ejecuta en pruebas unitarias.
 */

type Row = NonNullable<Awaited<ReturnType<typeof prisma.blogIaBlog.findUnique>>>;

function toRecord(row: Row): BlogRecord {
  return {
    userId: row.userId,
    tenantId: row.tenantId,
    hostname: row.hostname,
    status: row.status as BlogStatus,
    config: (row.config as WizardConfig | null) ?? null,
    provisionedAt: row.provisionedAt,
    dnsVerified: row.dnsVerified,
    tlsReady: row.tlsReady,
    activatedAt: row.activatedAt,
    lastError: row.lastError,
  };
}

export const prismaWizardStore: WizardStore = {
  async get(userId) {
    const row = await prisma.blogIaBlog.findUnique({ where: { userId } });
    return row ? toRecord(row) : null;
  },
  async create(userId, tenantId) {
    // upsert: dos peticiones simultáneas no duplican ni fallan por la clave única.
    const row = await prisma.blogIaBlog.upsert({ where: { userId }, create: { userId, tenantId }, update: {} });
    return toRecord(row);
  },
  async update(userId, patch) {
    const { config, ...rest } = patch;
    const row = await prisma.blogIaBlog.update({
      where: { userId },
      data: { ...rest, ...(config !== undefined ? { config: config === null ? undefined : (config as object) } : {}) },
    });
    return toRecord(row);
  },
  async hostnameOwner(hostname) {
    const row = await prisma.blogIaBlog.findUnique({ where: { hostname }, select: { userId: true } });
    return row?.userId ?? null;
  },
  async activate(userId, at) {
    const [row] = await prisma.$transaction([
      prisma.blogIaBlog.update({ where: { userId }, data: { status: "active", activatedAt: at, lastError: null } }),
      prisma.user.update({ where: { id: userId }, data: { publishMethod: "BLOG" } }),
    ]);
    return toRecord(row);
  },
};

export function blogIaServerConfig() {
  return {
    apiUrl: process.env.BLOG_IA_API_URL ?? "",
    secret: process.env.BLOG_IA_SECRET ?? "",
    cnameTarget: (process.env.BLOG_IA_CNAME_TARGET ?? "").trim() || null,
  };
}

export function buildWizardDeps(): WizardDeps {
  const cfg = blogIaServerConfig();
  return {
    store: prismaWizardStore,
    apiConfigured: !!cfg.apiUrl && !!cfg.secret,
    cnameTarget: cfg.cnameTarget,
    now: () => new Date(),
    hash: (text) => createHash("sha256").update(text).digest("hex").slice(0, 16),
    async send(event) {
      try {
        await sendBlogIaEvent({ apiUrl: cfg.apiUrl, secret: cfg.secret }, event);
      } catch (e) {
        if (e instanceof BlogIaError) throw new SendError(e.message, e.retryable, e.status);
        throw new SendError(e instanceof Error ? e.message : String(e), true);
      }
    },
    async resolveCname(hostname) {
      try {
        return await resolveCname(hostname);
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        // Sin registro CNAME no es un fallo de consulta: es «todavía no apunta».
        if (code === "ENODATA" || code === "ENOTFOUND") return [];
        throw e;
      }
    },
    async probeTls(hostname) {
      try {
        const res = await fetch(`https://${hostname}/robots.txt`, { redirect: "manual", signal: AbortSignal.timeout(8_000) });
        return res.status < 500;
      } catch {
        return false; // certificado inválido, sin conexión o tiempo agotado: aún no está listo
      }
    },
  };
}

/** Identidad y permisos de la persona que llama. userId SIEMPRE de la sesión. */
export async function loadActor(): Promise<Actor> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return { userId: null, articulosAllowed: false };
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, disabledModules: true } });
  if (!user) return { userId: null, articulosAllowed: false };
  return { userId, role: user.role, disabledModules: user.disabledModules, articulosAllowed: await articulosAllowed(userId) };
}

/**
 * ¿Tiene derecho a ARTICULOS? Con la aplicación de derechos en «off» (hoy) no
 * se bloquea a nadie; si la consulta falla se permite (mismo criterio que
 * requireProductAccess: un fallo técnico no se convierte en «sin derechos»).
 */
async function articulosAllowed(userId: string): Promise<boolean> {
  try {
    const mode = await getEnforcementMode();
    if (mode === "off") return true;
    const access = await hasProductAccess(userId, "ARTICULOS");
    return !decideEnforcement(mode, access).block;
  } catch (error) {
    console.error("[blog-ia] No se pudo comprobar el acceso a ARTICULOS; se permite", error);
    return true;
  }
}

export function json<T>(result: Result<T>) {
  if (result.ok) return NextResponse.json(result.value);
  return NextResponse.json({ error: result.error, retryable: result.retryable ?? false }, { status: result.status });
}


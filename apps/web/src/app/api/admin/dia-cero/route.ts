import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { requireAdmin } from "@/lib/current-user";
import { auditLog } from "@/lib/audit";
import { redesProfile, REDES_PUBLISHING_FIELDS } from "@/lib/redes-profile";
import { diaCeroActive } from "@/lib/shared-cookies";
import { getTrialRuleEnabled, setTrialRuleEnabled } from "@/lib/trial-rule-setting";
import { getAccessRouterEnabled, setAccessRouterEnabled } from "@/lib/access-router-setting";

export const dynamic = "force-dynamic";

/*
 * BOTÓN «DÍA CERO» (Administración). Contrato en CONTROL_SEPARACION_SEO_TOTAL.md (C-035).
 *
 * GET  → estado + simulación (SOLO LECTURA).
 * POST {action:"apply", confirm:"DIA CERO"} → hace, con respaldo, TODO esto:
 *   1. Enciende los permisos de Redes (los 10 allow*Publishing + módulo oportunidades-redes) a los
 *      usuarios no administradores. NO toca a quien tiene el módulo deshabilitado A PROPÓSITO.
 *   2. Quita el indicador de «prueba de 7 días» (isTrialSignup=false, trialStartedAt=null,
 *      trialUnlocked=true) a los usuarios no administradores: quedan gratis.
 *   3. Apaga la regla de los 7 días y enciende el router de acceso.
 * POST {action:"revert"} → restaura TODO desde el respaldo.
 * El interruptor de derechos (product_enforcement) NO se toca: sigue Apagado.
 * El respaldo vive en SystemSetting `dia_cero_backup` (JSON cifrado), sin migraciones.
 */
const BACKUP_KEY = "dia_cero_backup";
const CONFIRM_WORD = "DIA CERO";

type RedesBackup = { id: string; disabledModules: string | null } & Record<string, boolean | string | null>;
type TrialBackup = { id: string; isTrialSignup: boolean; trialStartedAt: string | null; trialUnlocked: boolean };
type Backup = {
  savedAt: string;
  redes: RedesBackup[];
  trial: TrialBackup[];
  flags: { trialRuleEnabled: boolean; accessRouterEnabled: boolean };
};

/** true si el módulo de Redes está deshabilitado a propósito (objeto con "disabled" o array histórico que lo contiene). */
function moduleDisabledOnPurpose(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.includes("oportunidades-redes");
    if (parsed && typeof parsed === "object") return (parsed as Record<string, unknown>)["oportunidades-redes"] === "disabled";
  } catch {
    // JSON inválido: no se considera una decisión deliberada
  }
  return false;
}

async function readBackup(): Promise<Backup | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key: BACKUP_KEY } });
  if (!row?.encryptedValue) return null;
  let raw = row.encryptedValue;
  try {
    raw = decryptSecret(row.encryptedValue);
  } catch {
    // sin cifrar
  }
  return JSON.parse(raw) as Backup;
}

const redesSelect = {
  id: true,
  role: true,
  disabledModules: true,
  ...Object.fromEntries(REDES_PUBLISHING_FIELDS.map((f) => [f, true])),
} as const;

async function loadNonAdmins() {
  return prisma.user.findMany({
    where: { role: { not: "admin" } },
    select: { ...redesSelect, isTrialSignup: true, trialStartedAt: true, trialUnlocked: true },
  });
}

function planRedes(users: Awaited<ReturnType<typeof loadNonAdmins>>) {
  const toChange: typeof users = [];
  let disabledOnPurpose = 0;
  for (const user of users) {
    if (moduleDisabledOnPurpose(user.disabledModules)) {
      disabledOnPurpose++;
      continue;
    }
    const rec = user as unknown as Record<string, unknown>;
    if (REDES_PUBLISHING_FIELDS.some((f) => rec[f] !== true)) toChange.push(user);
  }
  return { toChange, disabledOnPurpose };
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const [users, adminsExcluded, backup, trialRuleEnabled, accessRouterEnabled] = await Promise.all([
      loadNonAdmins(),
      prisma.user.count({ where: { role: "admin" } }),
      readBackup(),
      getTrialRuleEnabled(),
      getAccessRouterEnabled(),
    ]);
    const { toChange, disabledOnPurpose } = planRedes(users);
    return NextResponse.json(
      {
        applied: Boolean(backup),
        backup: { exists: Boolean(backup), savedAt: backup?.savedAt ?? null },
        simulation: {
          redesUsersToChange: toChange.length,
          redesModuleDisabledOnPurpose: disabledOnPurpose,
          trialIndicatorUsers: users.filter((u) => u.isTrialSignup || u.trialStartedAt).length,
          adminsExcluded,
        },
        flags: { trialRuleEnabled, accessRouterEnabled, diaCeroEnv: diaCeroActive() },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[admin/dia-cero] GET error:", error);
    return NextResponse.json({ error: "No se pudo calcular la simulación" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const backup = await readBackup();

    if (body?.action === "apply") {
      if (!diaCeroActive()) {
        return NextResponse.json({ error: "Primero pon la variable DIA_CERO=on en Vercel y espera el Redeploy; después vuelve a pulsar Activar." }, { status: 409 });
      }
      if (typeof body.confirm !== "string" || body.confirm.trim().toUpperCase() !== CONFIRM_WORD) {
        return NextResponse.json({ error: `Para activar el Día Cero escribe «${CONFIRM_WORD}».` }, { status: 409 });
      }
      if (backup) return NextResponse.json({ error: "El Día Cero ya está aplicado. Si quieres repetirlo, primero pulsa Revertir." }, { status: 409 });

      const users = await loadNonAdmins();
      const { toChange } = planRedes(users);
      const trialUsers = users.filter((u) => u.isTrialSignup || u.trialStartedAt);
      const saved: Backup = {
        savedAt: new Date().toISOString(),
        redes: toChange.map((u) => {
          const rec = u as unknown as Record<string, boolean | string | null>;
          return { id: u.id, disabledModules: u.disabledModules, ...Object.fromEntries(REDES_PUBLISHING_FIELDS.map((f) => [f, rec[f] as boolean])) } as RedesBackup;
        }),
        trial: trialUsers.map((u) => ({ id: u.id, isTrialSignup: u.isTrialSignup, trialStartedAt: u.trialStartedAt ? u.trialStartedAt.toISOString() : null, trialUnlocked: u.trialUnlocked })),
        flags: { trialRuleEnabled: await getTrialRuleEnabled(), accessRouterEnabled: await getAccessRouterEnabled() },
      };
      // 1) Respaldo PRIMERO: si algo falla después, se puede revertir.
      const encryptedValue = encryptSecret(JSON.stringify(saved));
      await prisma.systemSetting.upsert({ where: { key: BACKUP_KEY }, create: { key: BACKUP_KEY, encryptedValue }, update: { encryptedValue } });
      // 2) Datos, en una sola transacción.
      await prisma.$transaction([
        ...toChange.map((u) => {
          const patch = redesProfile({ role: u.role, disabledModules: u.disabledModules });
          return prisma.user.update({ where: { id: u.id }, data: patch ?? {} });
        }),
        ...trialUsers.map((u) => prisma.user.update({ where: { id: u.id }, data: { isTrialSignup: false, trialStartedAt: null, trialUnlocked: true } })),
      ]);
      // 3) Interruptores.
      await setTrialRuleEnabled(false);
      await setAccessRouterEnabled(true);
      auditLog("dia_cero_applied", adminId, { redes: toChange.length, trial: trialUsers.length });
      return NextResponse.json({ ok: true, changed: { redes: toChange.length, trial: trialUsers.length } });
    }

    if (body?.action === "revert") {
      if (!backup) return NextResponse.json({ error: "No hay Día Cero aplicado que revertir." }, { status: 409 });
      await prisma.$transaction([
        ...backup.redes.map(({ id, disabledModules, ...fields }) =>
          prisma.user.update({ where: { id }, data: { ...(fields as Record<string, boolean>), disabledModules } }),
        ),
        ...backup.trial.map((t) =>
          prisma.user.update({
            where: { id: t.id },
            data: { isTrialSignup: t.isTrialSignup, trialStartedAt: t.trialStartedAt ? new Date(t.trialStartedAt) : null, trialUnlocked: t.trialUnlocked },
          }),
        ),
      ]);
      await setTrialRuleEnabled(backup.flags.trialRuleEnabled);
      await setAccessRouterEnabled(backup.flags.accessRouterEnabled);
      await prisma.systemSetting.delete({ where: { key: BACKUP_KEY } });
      auditLog("dia_cero_reverted", adminId, { redes: backup.redes.length, trial: backup.trial.length });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "action debe ser apply o revert" }, { status: 400 });
  } catch (error) {
    console.error("[admin/dia-cero] POST error:", error);
    return NextResponse.json({ error: "No se pudo completar la operación. Si el Día Cero quedó a medias, pulsa Revertir." }, { status: 500 });
  }
}

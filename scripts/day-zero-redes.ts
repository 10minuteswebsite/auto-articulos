/**
 * Día Cero de SEO Total Redes.
 *
 * Por seguridad, este comando solo simula por defecto. `--apply` exige una
 * ruta explícita de respaldo y `--revert <archivo>` restaura exactamente los
 * valores guardados; nunca se conecta a producción de forma implícita.
 */
import { PrismaClient } from "@prisma/client";
import { writeFile } from "node:fs/promises";

export const REDES_FIELDS = [
  "allowInstagramPublishing", "allowLinkedInPublishing",
  "allowThreadsPublishing", "allowFacebookPublishing",
  "allowPinterestPublishing", "allowTumblrPublishing",
  "allowBlueskyPublishing", "allowDevToPublishing",
  "allowBloggerPublishing", "allowGoogleBusinessPublishing",
] as const;

type Field = (typeof REDES_FIELDS)[number];
type UserRow = { id: string; role: string; } & Record<Field, boolean>;
export type RedesChange = { id: string; oldValues: Record<Field, boolean> };
export type RedesChangeWithModule = RedesChange & { oldDisabledModules: string | null; moduleDisabled: boolean };

export function planRedesChanges(users: UserRow[]): RedesChange[] {
  return users
    .filter((user) => user.role !== "admin")
    .filter((user) => REDES_FIELDS.some((field) => user[field] !== true))
    .map((user) => ({
      id: user.id,
      oldValues: Object.fromEntries(REDES_FIELDS.map((field) => [field, user[field]])) as Record<Field, boolean>,
    }));
}

export function planRedesChangesWithModule(users: Array<UserRow & { disabledModules: string | null }>): RedesChangeWithModule[] {
  return users
    .filter((user) => user.role !== "admin")
    .map((user) => {
      let moduleDisabled = false;
      try {
        const parsed = user.disabledModules ? JSON.parse(user.disabledModules) : null;
        moduleDisabled = Array.isArray(parsed) ? parsed.includes("oportunidades-redes") : parsed?.["oportunidades-redes"] === "disabled";
      } catch { /* se conserva el dato; no se interpreta como un bloqueo explícito */ }
      return { id: user.id, oldDisabledModules: user.disabledModules, moduleDisabled,
        oldValues: Object.fromEntries(REDES_FIELDS.map((field) => [field, user[field]])) as Record<Field, boolean> };
    })
    .filter((change) => !change.moduleDisabled && REDES_FIELDS.some((field) => change.oldValues[field] !== true));
}

function assertLocalOnly(): void {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    throw new Error("Día Cero está bloqueado en producción/Vercel; usa una base local o staging aislada.");
  }
}

async function main(): Promise<void> {
  assertLocalOnly();
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const revertIndex = args.indexOf("--revert");
  const revertPath = revertIndex >= 0 ? args[revertIndex + 1] : undefined;
  if (revertIndex >= 0 && !revertPath) throw new Error("--revert requiere un archivo de respaldo.");
  if (apply && !process.env.DAY_ZERO_BACKUP) {
    throw new Error("--apply requiere DAY_ZERO_BACKUP=/ruta/backup.json explícito.");
  }

  const prisma = new PrismaClient();
  try {
    if (revertPath) {
      const backup = JSON.parse(await (await import("node:fs/promises")).readFile(revertPath, "utf8")) as RedesChange[];
      for (const change of backup) await prisma.user.update({ where: { id: change.id }, data: change.oldValues });
      console.log(`Revertidos ${backup.length} usuarios desde ${revertPath}.`);
      return;
    }
    const users = await prisma.user.findMany({
      select: { id: true, role: true, ...Object.fromEntries(REDES_FIELDS.map((field) => [field, true])) },
    }) as UserRow[];
    const changes = planRedesChanges(users);
    console.log(`Simulación: ${changes.length} usuarios no-admin serían actualizados; admins excluidos.`);
    if (!apply) return;
    await writeFile(process.env.DAY_ZERO_BACKUP!, JSON.stringify(changes, null, 2) + "\n", "utf8");
    for (const change of changes) {
      await prisma.user.update({ where: { id: change.id }, data: Object.fromEntries(REDES_FIELDS.map((field) => [field, true])) });
    }
    console.log(`Aplicados ${changes.length} cambios. Respaldo: ${process.env.DAY_ZERO_BACKUP}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) void main();

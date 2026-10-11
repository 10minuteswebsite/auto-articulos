import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import { createHash } from "node:crypto";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { DIRECTOR_PROMPT_V2, mergeDirectorPrompt } from "./directorPromptV2";

// Aplica (o restaura) el prompt del Director Creativo de imágenes en el ajuste
// global `ai_social_image_prompt` (el mismo que se edita en Administración →
// «Prompts»). Reversible: antes de escribir, guarda una copia EXACTA del valor
// actual en `ai_social_image_prompt_backup` (si ya existe una copia, NO la
// sobrescribe: conserva siempre el original). «restaurar» vuelve a esa copia.
// Nunca borra nada que no sea el propio ajuste cuando no había prompt previo.

const KEY = "ai_social_image_prompt";
const BACKUP_KEY = "ai_social_image_prompt_backup";
const NONE_MARKER = "__SIN_PROMPT_PREVIO__";

function fingerprint(encryptedValue: string | undefined): string {
  if (!encryptedValue) return "(vacío)";
  let plain = encryptedValue;
  try {
    plain = decryptSecret(encryptedValue);
  } catch {
    // valor antiguo sin cifrar
  }
  return `${plain.length} caracteres, sha256 ${createHash("sha256").update(plain).digest("hex").slice(0, 12)}`;
}

async function main() {
  const mode = (process.env.DIRECTOR_MODE || "").trim();
  if (mode !== "aplicar" && mode !== "reemplazar" && mode !== "restaurar") {
    throw new Error('DIRECTOR_MODE debe ser "aplicar" (panel + guía), "reemplazar" (solo el v2 corto) o "restaurar".');
  }

  const current = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  const backup = await prisma.systemSetting.findUnique({ where: { key: BACKUP_KEY } });
  console.log(`Prompt actual en la base: ${fingerprint(current?.encryptedValue)}`);
  console.log(`Copia de respaldo existente: ${backup ? "sí" : "no"}`);

  if (mode === "aplicar" || mode === "reemplazar") {
    if (!backup) {
      await prisma.systemSetting.create({
        data: { key: BACKUP_KEY, encryptedValue: current?.encryptedValue ?? NONE_MARKER },
      });
      console.log("Respaldo del prompt anterior guardado en ai_social_image_prompt_backup.");
    } else {
      console.log("Ya había un respaldo: se conserva intacto (es el original).");
    }
    let plainCurrent = "";
    if (current?.encryptedValue) {
      try {
        plainCurrent = decryptSecret(current.encryptedValue);
      } catch {
        plainCurrent = current.encryptedValue;
      }
    }
    const nextPrompt = mode === "reemplazar" || !plainCurrent.trim() ? DIRECTOR_PROMPT_V2.trim() : mergeDirectorPrompt(plainCurrent);
    const encryptedValue = encryptSecret(nextPrompt);
    await prisma.systemSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, encryptedValue },
      update: { encryptedValue },
    });
    const after = await prisma.systemSetting.findUnique({ where: { key: KEY } });
    console.log(`Prompt NUEVO aplicado: ${fingerprint(after?.encryptedValue)}`);
    return;
  }

  if (!backup) throw new Error("No hay respaldo guardado: no se puede restaurar.");
  if (backup.encryptedValue === NONE_MARKER) {
    await prisma.systemSetting.deleteMany({ where: { key: KEY } });
    console.log("No había prompt previo: se quitó el ajuste (vuelve el prompt de respaldo del código).");
  } else {
    await prisma.systemSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, encryptedValue: backup.encryptedValue },
      update: { encryptedValue: backup.encryptedValue },
    });
    console.log(`Prompt ANTERIOR restaurado: ${fingerprint(backup.encryptedValue)}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

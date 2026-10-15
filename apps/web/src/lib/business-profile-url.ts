import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";

// Enlace público de la ficha de Google Business de cada cuenta. Google no
// devuelve un enlace por publicación, así que el Historial lleva a la ficha.
// Se guarda en SystemSetting (una llave por usuario) para no tocar el esquema.
const keyFor = (userId: string) => `gbp_profile_url:${userId}`;

export function normalizeBusinessProfileUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const ok = /(^|\.)google\.[a-z.]+$/.test(host) || host === "share.google" || host === "maps.app.goo.gl" || host === "g.page" || host === "goo.gl";
    return ok ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function getBusinessProfileUrl(userId: string): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key: keyFor(userId) } });
  if (!row) return null;
  try {
    return decryptSecret(row.encryptedValue) || null;
  } catch {
    return null;
  }
}

export async function setBusinessProfileUrl(userId: string, url: string | null) {
  if (!url) {
    await prisma.systemSetting.deleteMany({ where: { key: keyFor(userId) } });
    return;
  }
  const encryptedValue = encryptSecret(url);
  await prisma.systemSetting.upsert({
    where: { key: keyFor(userId) },
    create: { key: keyFor(userId), encryptedValue },
    update: { encryptedValue },
  });
}

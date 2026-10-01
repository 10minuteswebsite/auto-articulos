import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  evaluateProductAccess,
  hasLegacySocialModuleAccess,
  type EnforcementMode,
  type ProductKey,
} from "@auto-articulos/shared";

const PRODUCT_ENFORCEMENT_KEY = "product_enforcement";

async function getMode(): Promise<EnforcementMode> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: PRODUCT_ENFORCEMENT_KEY },
      select: { encryptedValue: true },
    });
    if (!setting?.encryptedValue) return "off";
    let value = setting.encryptedValue;
    try { value = decryptSecret(value); } catch { /* valores antiguos podían estar sin cifrar */ }
    return value === "shadow" || value === "enforce" ? value : "off";
  } catch (error) {
    console.error("[worker/product-access] No se pudo leer el interruptor; se usa off:", error);
    return "off";
  }
}

/** Comprueba el derecho justo antes de iniciar una publicación destino. */
export async function checkSocialProductAccess(userId: string, platform: string): Promise<boolean> {
  const mode = await getMode();
  if (mode === "off") return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      disabledModules: true,
      allowInstagramPublishing: true,
      allowFacebookPublishing: true,
      allowLinkedInPublishing: true,
      allowThreadsPublishing: true,
      allowPinterestPublishing: true,
      allowTumblrPublishing: true,
      allowBlueskyPublishing: true,
      allowDevToPublishing: true,
      allowBloggerPublishing: true,
      allowGoogleBusinessPublishing: true,
      productEntitlements: { where: { product: "REDES" }, select: { status: true, graceUntil: true } },
    },
  });
  if (!user) return mode === "shadow";

  const access = evaluateProductAccess({
    role: user.role,
    product: "REDES" satisfies ProductKey,
    entitlement: user.productEntitlements[0] ?? null,
    legacyAllowsRedes: hasLegacySocialModuleAccess({
      role: user.role,
      disabledModules: user.disabledModules,
      approvals: [
        user.allowInstagramPublishing, user.allowFacebookPublishing,
        user.allowLinkedInPublishing, user.allowThreadsPublishing,
        user.allowPinterestPublishing, user.allowTumblrPublishing,
        user.allowBlueskyPublishing, user.allowDevToPublishing,
        user.allowBloggerPublishing, user.allowGoogleBusinessPublishing,
      ],
    }),
    now: new Date(),
  });
  if (!access.allowed) console.warn(`[worker/product-access] ${mode}: se bloquearía ${platform} para ${userId} (${access.reason})`);
  return mode === "shadow" || access.allowed;
}

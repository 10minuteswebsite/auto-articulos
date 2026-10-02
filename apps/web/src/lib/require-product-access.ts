import { NextResponse } from "next/server";
import type { ProductKey } from "@auto-articulos/shared";
import { hasProductAccess } from "./product-access";
import { decideEnforcement, getEnforcementMode } from "./product-enforcement";

/**
 * Applies product access at an API boundary without making entitlement
 * failures or the default `off` mode alter existing behavior.
 * Returns a 403 response only when enforcement explicitly requires it.
 */
export async function requireProductAccess(
  userId: string,
  product: ProductKey,
  route: string,
): Promise<NextResponse | null> {
  const mode = await getEnforcementMode();
  if (mode === "off") return null;

  try {
    const access = await hasProductAccess(userId, product);
    const decision = decideEnforcement(mode, access);
    if (decision.wouldDeny) {
      console.warn("[product-access] product access denied", {
        userId,
        product,
        reason: access.reason,
        route,
        mode,
      });
    }
    if (!decision.block) return null;
    return NextResponse.json(
      { error: `Tu cuenta no tiene acceso al producto ${product}.` },
      { status: 403 },
    );
  } catch (error) {
    console.error("[product-access] access check failed; allowing request", {
      userId,
      product,
      route,
      error,
    });
    return null;
  }
}

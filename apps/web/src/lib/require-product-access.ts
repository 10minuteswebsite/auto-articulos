import { NextResponse } from "next/server";
import type { ProductAccess, ProductKey } from "@auto-articulos/shared";
import { hasProductAccess } from "./product-access";
import { decideEnforcement, getEnforcementMode, type EnforcementMode } from "./product-enforcement";

/**
 * Applies product access at an API boundary without making entitlement
 * failures or the default `off` mode alter existing behavior.
 * Returns a 403 response only when enforcement explicitly requires it.
 */
/** Dependencias inyectables: solo para poder probar el helper sin base de datos. */
export interface RequireProductAccessDeps {
  getMode: () => Promise<EnforcementMode>;
  checkAccess: (userId: string, product: ProductKey) => Promise<ProductAccess>;
}

const defaultDeps: RequireProductAccessDeps = {
  getMode: getEnforcementMode,
  checkAccess: (userId, product) => hasProductAccess(userId, product),
};

export async function requireProductAccess(
  userId: string,
  product: ProductKey,
  route: string,
  deps: RequireProductAccessDeps = defaultDeps,
): Promise<NextResponse | null> {
  const mode = await deps.getMode();
  if (mode === "off") return null;

  try {
    const access = await deps.checkAccess(userId, product);
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

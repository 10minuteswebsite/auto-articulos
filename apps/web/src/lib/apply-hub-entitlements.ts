/**
 * Traduce una respuesta de derechos del HUB a transiciones locales.
 *
 * Es deliberadamente pura: el adaptador que lee SystemSetting debe entregar
 * `appToProduct`; ningún appId del HUB se codifica en esta función. La
 * ausencia de un producto en la respuesta no revoca nada.
 */
export type EntitlementStatus = "ACTIVE" | "GRACE" | "INACTIVE";

export type LocalEntitlement = {
  product: ProductKey;
  status: EntitlementStatus;
  version: number;
};

export type HubEntitlement = {
  appId?: string;
  product?: string;
  allowed?: boolean;
  status?: string;
  products?: Record<string, { allowed?: boolean; status?: string }>;
};

export type EntitlementTransition = {
  product: ProductKey;
  from: EntitlementStatus | null;
  to: EntitlementStatus;
  source: "HUB";
  version: number;
  event: "activated" | "deactivated" | "unchanged";
};

export type ApplyHubResult = {
  transitions: EntitlementTransition[];
  unknown: HubEntitlement[];
};

function desiredStatus(item: HubEntitlement): EntitlementStatus | null {
  if (typeof item.allowed === "boolean") return item.allowed ? "ACTIVE" : "INACTIVE";
  if (["active", "ACTIVE", "trialing", "granted", "concession"].includes(item.status ?? "")) return "ACTIVE";
  if (["inactive", "INACTIVE", "denied", "cancelled", "expired", "revoked", "blocked"].includes(item.status ?? "")) return "INACTIVE";
  return null;
}

export function planHubTransition(
  current: LocalEntitlement | undefined,
  product: ProductKey,
  desired: EntitlementStatus,
): EntitlementTransition {
  const from = current?.status ?? null;
  const changed = from !== desired;
  return {
    product,
    from,
    to: desired,
    source: "HUB",
    version: (current?.version ?? 0) + 1,
    event: changed ? (desired === "ACTIVE" ? "activated" : "deactivated") : "unchanged",
  };
}

export function applyHubEntitlements(
  current: LocalEntitlement[],
  incoming: HubEntitlement[],
  appToProduct: Record<string, ProductKey>,
): ApplyHubResult {
  const byProduct = new Map(current.map((item) => [item.product, item]));
  const transitions: EntitlementTransition[] = [];
  const unknown: HubEntitlement[] = [];
  const expanded = incoming.flatMap((item) => {
    if (!item.products) return [item];
    return Object.entries(item.products).map(([product, value]) => ({ product, ...value }));
  });
  for (const item of expanded) {
    const rawProduct = item.product ?? (item.appId ? appToProduct[item.appId] : undefined);
    const product = rawProduct?.toUpperCase() as ProductKey | undefined;
    const status = desiredStatus(item);
    if ((product !== "articulos" && product !== "redes") || !status) {
      unknown.push(item);
      continue;
    }
    transitions.push(planHubTransition(byProduct.get(product), product, status));
  }
  return { transitions, unknown };
}
import type { ProductKey } from "@auto-articulos/shared";

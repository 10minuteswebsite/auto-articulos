import type { ProductKey } from "@auto-articulos/shared";

type Status = "ACTIVE" | "GRACE" | "INACTIVE";
type Entitlement = { product: ProductKey; status: Status; graceUntil?: Date | null };
type Config = { articulosHost: string; redesHost: string; canonicalHost: string; hubUrl: string };
export type AccessRoute = { kind: "stay" } | { kind: "redirect"; url: string };

function hostname(value: string): string {
  try { return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase(); }
  catch { return value.toLowerCase().replace(/\/$/, ""); }
}

function hasAccess(entitlement: Entitlement | undefined, now: Date): boolean {
  // Ausencia de fila conserva el acceso legacy hasta que el sistema decida lo contrario.
  if (!entitlement) return true;
  if (entitlement.status === "ACTIVE") return true;
  return entitlement.status === "GRACE" && !!entitlement.graceUntil && entitlement.graceUntil.getTime() > now.getTime();
}

export function routeAfterLogin(input: {
  entitlements: Entitlement[];
  role?: string | null;
  host: string;
  now: Date;
  config: Config;
}): AccessRoute {
  if (input.role === "admin") return { kind: "stay" };
  const host = hostname(input.host);
  const config = {
    articulosHost: hostname(input.config.articulosHost),
    redesHost: hostname(input.config.redesHost),
    canonicalHost: hostname(input.config.canonicalHost),
  };
  if (![config.articulosHost, config.redesHost, config.canonicalHost].includes(host)) return { kind: "stay" };
  const byProduct = new Map(input.entitlements.map((item) => [item.product, item]));
  const articles = hasAccess(byProduct.get("ARTICULOS"), input.now);
  const redes = hasAccess(byProduct.get("REDES"), input.now);
  if (!articles && !redes) return { kind: "redirect", url: input.config.hubUrl };
  if (host === config.canonicalHost) {
    if (articles && !redes) return { kind: "redirect", url: input.config.articulosHost };
    if (redes && !articles) return { kind: "redirect", url: input.config.redesHost };
    return { kind: "stay" };
  }
  if (host === config.articulosHost && !articles) return { kind: "redirect", url: redes ? input.config.redesHost : input.config.hubUrl };
  if (host === config.redesHost && !redes) return { kind: "redirect", url: articles ? input.config.articulosHost : input.config.hubUrl };
  return { kind: "stay" };
}

import { reasonText, type BlogHubStateName } from "./hub-blog-state";

/**
 * Lo que el asistente le cuenta a una persona nueva sobre su BLOG IA, en cinco casos claros.
 * El Hub (fuente de verdad) distingue cuatro estados; si no responde, se usa lo que ya sabemos localmente.
 * «ready» exige además que el blog sea publicable aquí: la acción «Usar mi blog» depende de eso.
 */
export type BlogChoiceKind = "ready" | "pending" | "none" | "not_purchased" | "unknown";
export type BlogChoiceView = { kind: BlogChoiceKind; hostname: string | null; detail: string | null };

export function blogChoiceView(
  hub: { state: BlogHubStateName; hostname: string | null; reason: string | null } | null,
  local: { exists: boolean; publishable: boolean; hostname: string | null },
): BlogChoiceView {
  if (hub) {
    if (hub.state === "not_purchased") return { kind: "not_purchased", hostname: null, detail: null };
    if (hub.state === "no_blog" && !local.exists) return { kind: "none", hostname: null, detail: null };
    if (hub.state === "blog_ready" && local.publishable) return { kind: "ready", hostname: hub.hostname ?? local.hostname, detail: null };
    if (hub.state === "blog_ready") {
      return { kind: "pending", hostname: hub.hostname, detail: "Tu blog ya existe y estamos terminando de vincularlo. Vuelve a comprobar en un momento." };
    }
    if (hub.state === "blog_pending") return { kind: "pending", hostname: hub.hostname, detail: reasonText(hub.reason) };
  }
  if (local.publishable) return { kind: "ready", hostname: local.hostname, detail: null };
  if (local.exists) return { kind: "pending", hostname: local.hostname, detail: reasonText(null) };
  return { kind: "unknown", hostname: null, detail: null };
}

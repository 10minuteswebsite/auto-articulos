export type EntitlementStatus = "ACTIVE" | "GRACE" | "INACTIVE";
export type EntitlementAction = "set_status" | "grant_grace" | "remove_grace";

export type TransitionResult =
  | { ok: true; status: EntitlementStatus; graceUntil: Date | null }
  | { ok: false; error: string };

export function computeNextEntitlement(
  current: { status: EntitlementStatus; graceUntil: Date | null } | null,
  action: EntitlementAction,
  input: { status?: unknown; days?: unknown },
  now: Date,
): TransitionResult {
  if (action === "set_status") {
    if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
      return { ok: false, error: "status debe ser ACTIVE o INACTIVE (para dar gracia use grant_grace)" };
    }
    return { ok: true, status: input.status, graceUntil: null };
  }
  if (action === "grant_grace") {
    if (typeof input.days !== "number" || !Number.isInteger(input.days) || input.days < 1 || input.days > 365) {
      return { ok: false, error: "days debe ser un entero entre 1 y 365" };
    }
    return { ok: true, status: "GRACE", graceUntil: new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000) };
  }
  if (!current || current.status !== "GRACE") {
    return { ok: false, error: "Este producto no está en gracia: no hay nada que quitar" };
  }
  return { ok: true, status: "INACTIVE", graceUntil: null };
}

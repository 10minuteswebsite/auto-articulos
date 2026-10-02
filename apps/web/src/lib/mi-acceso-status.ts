export type AccessStatus = {
  allowed: boolean;
  reason: string;
  graceUntil: string | null;
  graceDaysLeft: number | null;
};

export function accessStatusText(status: AccessStatus | null | undefined): string {
  if (!status) return "Sin información disponible";
  if (status.allowed && status.reason === "GRACE") {
    const date = status.graceUntil ? formatDate(status.graceUntil) : "fecha pendiente";
    const days = status.graceDaysLeft ?? 0;
    return `En gracia hasta ${date} (${days} ${days === 1 ? "día" : "días"})`;
  }
  if (status.allowed && status.reason === "ADMIN") return "Activo";
  if (status.allowed && status.reason === "NO_RECORD_LEGACY") return "Sin registro (se mantiene el acceso de siempre)";
  if (status.allowed) return "Activo";
  if (status.reason === "GRACE_EXPIRED" || status.reason === "INACTIVE" || status.reason === "NO_NETWORK_APPROVED") return "Sin acceso";
  return "Sin información disponible";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "fecha pendiente";
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

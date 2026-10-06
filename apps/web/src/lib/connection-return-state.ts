export type ConnectionReturnOutcome = "connected" | "error" | "forbidden" | null;

/**
 * Las conexiones que usan una tarjeta estándar deben volver a ella después del
 * OAuth para conservar Probar conexión, Cambiar y Desconectar. Google Business
 * Profile también usa esa tarjeta aunque la autorización la gestione PostPeer.
 */
const STANDARD_OAUTH_CONNECTIONS = new Set(["business-profile", "linkedin", "threads"]);

export function shouldShowStaticConnectionSuccess({
  conexion,
  resultado,
  choice,
}: {
  conexion: string | null;
  resultado: ConnectionReturnOutcome;
  choice: string | null | undefined;
}): boolean {
  return resultado === "connected"
    && conexion !== null
    && choice === null
    && !STANDARD_OAUTH_CONNECTIONS.has(conexion);
}

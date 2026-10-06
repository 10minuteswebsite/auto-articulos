export type ConnectionReturnOutcome = "connected" | "error" | "forbidden" | null;

/**
 * LinkedIn y Threads tienen una tarjeta estándar con acciones después del OAuth.
 * No deben quedar atrapados en la pantalla estática de retorno, porque esa pantalla
 * no ofrece Probar conexión ni Desconectar.
 */
const STANDARD_OAUTH_CONNECTIONS = new Set(["linkedin", "threads"]);

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

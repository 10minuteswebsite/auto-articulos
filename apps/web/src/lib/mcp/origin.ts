/**
 * Regla de `Origin` del endpoint MCP (sin imports: corre en Edge Runtime).
 *
 * Streamable HTTP pide bloquear Origins ajenos para que una web maliciosa no
 * use el navegador de alguien como puente. Esa defensa solo hace falta cuando
 * la petición no se autentica por sí misma. Una petición con `Authorization:
 * Bearer` ya demuestra que quien llama tiene el token: un navegador de
 * terceros no puede adjuntar el token de otra persona. Asistentes como Meta
 * MUSE llaman desde sus servidores mandando un `Origin` propio; rechazarlos
 * antes de mirar el token les daba un 403 aunque su token fuera válido.
 */
export function isMcpOriginAllowed(
  origin: string | null,
  ownOrigin: string,
  authorization: string | null,
): boolean {
  if (!origin || origin === ownOrigin) return true;
  return /^Bearer\s+\S+/i.test(authorization ?? "");
}

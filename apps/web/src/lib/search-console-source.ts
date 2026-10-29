export type SearchConsoleSource = "OWN" | "COMPOSIO" | "NONE";

/**
 * Oportunidades: caso «No hay evidencia disponible» (29/10/2026). Medido en
 * producción: para Search Console el resolvedor aún elige siempre la conexión
 * propia (COMPOSIO_CONSUMER_READY.google_search_console = false), así que quien
 * solo conectó Composio caía en NONE aunque su conexión estaba activa y con
 * datos (Carmen Aguilar, Ana), y quien tenía las dos seguía en una propia rota
 * (Sonia). Regla mínima: la propia sigue ganando mientras funciona; Composio
 * toma el relevo solo cuando no hay ninguna propia o la propia guardó un error.
 */
export function shouldUseComposioFallback(input: {
  source: SearchConsoleSource;
  composioUsable: boolean;
  ownHasError: boolean;
}): boolean {
  if (!input.composioUsable) return false;
  if (input.source === "NONE") return true;
  return input.source === "OWN" && input.ownHasError;
}

/** Mensaje de «sin evidencia» que dice qué pasó realmente, no uno genérico. */
export function describeNoEvidence(input: {
  hasSearchConsole: boolean;
  gscError: string | null;
  gaConnected: boolean;
  gaError?: string;
  bingConnected: boolean;
  bingError?: string;
}): string {
  if (input.gscError) {
    return `Google Search Console respondió con un error y no hay otra evidencia disponible (Google Analytics o Bing Webmaster Tools): ${input.gscError}`;
  }
  if (!input.hasSearchConsole && !input.gaConnected && !input.bingConnected) {
    return "Todavía no hay Google Search Console, Google Analytics ni Bing Webmaster Tools conectados. Conecta Search Console en Configuración → Conexiones y vuelve a analizar.";
  }
  if (input.hasSearchConsole) {
    return "Google Search Console está conectado, pero no devolvió datos de los últimos 45 días para la propiedad elegida. Si tu sitio tiene visitas, revisa en Conexiones que la propiedad elegida sea la correcta (la versión con https://, con www, o el dominio completo).";
  }
  const detail = [input.gaError, input.bingError].filter(Boolean).join(" | ");
  return `Google Analytics o Bing Webmaster Tools están conectados, pero no devolvieron datos.${detail ? ` Detalle: ${detail}` : ""} Conecta también Search Console en Configuración → Conexiones.`;
}

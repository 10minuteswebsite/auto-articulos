/** Apps de la migración GSC/GA: abiertas a toda cuenta activa (conectar, elegir, probar y desconectar). */
const MIGRATION_APPS = new Set(["google_search_console", "google_analytics"]);

/**
 * Redes sociales conectadas por Composio. Desde 2026-10-12 (pedido de Milton) la conexión es por
 * Composio para todas las cuentas: ya no hace falta el módulo «Conexión por Composio». El permiso
 * por red de cada cuenta (o el dominio redes) sigue decidiendo si puede conectarla.
 */
const SOCIAL_APPS = new Set(["facebook", "instagram", "pinterest"]);

export function isMigrationApp(app: unknown): boolean {
  return typeof app === "string" && MIGRATION_APPS.has(app);
}

/** Apps que cualquier cuenta activa puede conectar por Composio (sin el módulo opt-in). */
export function isOpenComposioApp(app: unknown): boolean {
  return isMigrationApp(app) || (typeof app === "string" && SOCIAL_APPS.has(app));
}

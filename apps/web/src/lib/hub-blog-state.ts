import { randomUUID } from "node:crypto";
import { BlogDestinationError, parseBlogDestination, type Destination } from "./hub-blog-destination";

/**
 * Consulta de SOLO LECTURA al Hub: ¿en qué punto está el BLOG IA de esta persona?
 * Contrato: POST {hub}/api/integrations/auto-articulos/blog-state (ver
 * docs/handoffs/PROMPT_ARTICULOS_SWITCH_DESTINO_20261110.md del repositorio la-solucion-ia).
 * Nunca asume un estado ante un error: cualquier respuesta rara es «no disponible».
 */
export type BlogHubStateName = "not_purchased" | "no_blog" | "blog_pending" | "blog_ready";
export type BlogHubContract = Omit<Destination, "operation" | "hub_user_id" | "expected_revision" | "confirm">;
export type BlogHubState = {
  state: BlogHubStateName;
  hostname: string | null;
  destination: BlogHubContract | null;
  reason: string | null;
  launchUrl: string;
  landingUrl: string;
  requestId: string;
  correlationId: string;
};

export class HubBlogStateError extends Error {
  constructor(readonly code: string, readonly retryable = true) {
    super(code);
  }
}

export const DEFAULT_LAUNCH_URL = "https://hub.lasolucionweb.net/api/product-launch?app=blog-ia";
export const DEFAULT_LANDING_URL = "https://hub.lasolucionweb.net/productos/blog-ia";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATES: readonly string[] = ["not_purchased", "no_blog", "blog_pending", "blog_ready"];

/** Textos amables; el código crudo nunca llega a la pantalla. */
export const PENDING_REASON_TEXT: Record<string, string> = {
  domain_not_confirmed: "Falta confirmar tu dominio en BLOG IA.",
  dns_not_confirmed: "Falta que tu dominio termine de apuntar a tu blog.",
  tls_not_ready: "Tu dominio ya casi está: falta terminar su conexión segura.",
  contract_incomplete: "A tu blog le faltan unos datos por completar en BLOG IA.",
};
export const reasonText = (reason: string | null) =>
  reason ? PENDING_REASON_TEXT[reason] ?? "Tu blog todavía no está listo para publicar." : null;

/** Solo se abren enlaces https de la plataforma; si el Hub manda otra cosa se usa la dirección conocida. */
function platformUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && (u.hostname === "lasolucionweb.net" || u.hostname.endsWith(".lasolucionweb.net")) ? u.toString() : fallback;
  } catch {
    return fallback;
  }
}

/** Valida la respuesta 200 del Hub. Lanza HubBlogStateError('invalid_response') ante cualquier incoherencia. */
export function parseBlogState(json: unknown, hubUserId: string, ids: { requestId: string; correlationId: string }): BlogHubState {
  const bad = () => new HubBlogStateError("invalid_response", true);
  const data = (json as { data?: Record<string, unknown> } | null)?.data;
  if (!data || typeof data !== "object" || typeof data.state !== "string" || !STATES.includes(data.state)) throw bad();
  const state = data.state as BlogHubStateName;
  const reason = typeof data.reason === "string" ? data.reason : null;
  let destination: BlogHubContract | null = null;
  let hostname: string | null = null;
  if (state === "blog_ready") {
    if (!data.destination || typeof data.destination !== "object" || typeof data.hostname !== "string") throw bad();
    try {
      // Mismo validador que usa el Hub para entregarnos el destino: dominio propio, 64 hex, https, etc.
      const parsed = parseBlogDestination({
        ...(data.destination as object),
        hub_user_id: hubUserId,
        operation: "status",
      });
      if (parsed.hostname !== data.hostname || parsed.contract_state !== "active" || parsed.can_publish !== true) throw bad();
      const { operation: _o, hub_user_id: _h, expected_revision: _e, confirm: _c, ...contract } = parsed;
      void _o; void _h; void _e; void _c;
      destination = contract;
      hostname = parsed.hostname ?? null;
    } catch (e) {
      if (e instanceof HubBlogStateError) throw e;
      if (e instanceof BlogDestinationError) throw bad();
      throw e;
    }
  } else if (data.destination != null) {
    throw bad();
  } else if (typeof data.hostname === "string") {
    hostname = data.hostname;
  }
  return {
    state,
    hostname,
    destination,
    reason: state === "blog_pending" ? reason : null,
    launchUrl: platformUrl(data.launch_url, DEFAULT_LAUNCH_URL),
    landingUrl: platformUrl(data.landing_url, DEFAULT_LANDING_URL),
    requestId: ids.requestId,
    correlationId: ids.correlationId,
  };
}

type Env = Record<string, string | undefined>;
export const destinationSwitchEnabled = (env: Env = process.env) => env.DESTINATION_SWITCH_ENABLED === "true";

export async function fetchBlogState(
  hubUserId: string,
  opts: { fetchImpl?: typeof fetch; env?: Env; requestId?: string; correlationId?: string } = {},
): Promise<BlogHubState> {
  const env = opts.env ?? process.env;
  const requestId = opts.requestId ?? randomUUID();
  const correlationId = opts.correlationId ?? randomUUID();
  const id = env.AUTO_ARTICULOS_HUB_CLIENT_ID, secret = env.AUTO_ARTICULOS_HUB_CLIENT_SECRET;
  // El puente compartido (broker) todavía no tiene esta ruta; sin ella no se inventa nada.
  if (!id || !secret || env.HUB_CREDENTIAL_TRANSPORT === "shared") throw new HubBlogStateError("transport_unavailable", false);
  const origin = env.HUB_BASE_URL || "https://hub.lasolucionweb.net";
  let response: Response;
  try {
    response = await (opts.fetchImpl ?? fetch)(`${origin}/api/integrations/auto-articulos/blog-state`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-platform-client-id": id,
        authorization: `Bearer ${secret}`,
        "x-request-id": requestId,
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({ hub_user_id: hubUserId }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    console.error(`[DESTINO] blog-state sin respuesta request_id=${requestId} correlation_id=${correlationId}`);
    throw new HubBlogStateError("hub_unreachable");
  }
  if (!response.ok) {
    let code = `http_${response.status}`;
    let retryable = response.status >= 500;
    try {
      const err = (await response.json()) as { error?: { code?: string; retryable?: boolean } };
      if (err.error?.code) code = String(err.error.code).slice(0, 64);
      if (typeof err.error?.retryable === "boolean") retryable = err.error.retryable;
    } catch { /* cuerpo sin JSON */ }
    console.error(`[DESTINO] blog-state ${response.status} ${code} request_id=${requestId} correlation_id=${correlationId}`);
    throw new HubBlogStateError(code, retryable);
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new HubBlogStateError("invalid_response");
  }
  const meta = (json as { meta?: { request_id?: string; correlation_id?: string } } | null)?.meta;
  const echoed = { requestId: meta?.request_id && UUID.test(meta.request_id) ? meta.request_id : requestId, correlationId: meta?.correlation_id && UUID.test(meta.correlation_id) ? meta.correlation_id : correlationId };
  console.info(`[DESTINO] blog-state ok request_id=${echoed.requestId} correlation_id=${echoed.correlationId}`);
  return parseBlogState(json, hubUserId, echoed);
}

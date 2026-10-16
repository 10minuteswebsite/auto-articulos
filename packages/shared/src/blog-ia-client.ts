// Cliente de la API de ingestión de BLOG IA (SEO Total → Cloudflare).
// Contrato: MASTER_BLUEPRINT_BLOG_IA_SEO_TOTAL.md §5 y apps/blog/src/ingest.ts.
//
//   POST {apiUrl}/api/ingest
//   x-blogia-timestamp: epoch en segundos
//   x-blogia-signature: hex(HMAC-SHA256(secret, `${timestamp}.${cuerpo}`))
//
// Solo Web Crypto y fetch: corre igual en Node (worker), Vercel y Cloudflare.

export interface BlogIaConfig {
  /** Origen de la API, p. ej. https://api.blog.ejemplo.com (sin barra final). */
  apiUrl: string;
  secret: string;
  timeoutMs?: number;
  /** Inyectable para pruebas. */
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export class BlogIaError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** true = reintentar con el MISMO event_id es seguro (red, 5xx); false = corregir primero. */
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "BlogIaError";
  }
}

export interface BlogIaEvent {
  /** Id estable del evento: reenviar el mismo id nunca duplica contenido. */
  eventId: string;
  type: string;
  tenantId: string;
  data: Record<string, unknown>;
}

export interface BlogIaResult {
  ok: true;
  result: "applied" | "duplicate" | "stale";
}

const enc = new TextEncoder();

export async function signBlogIaBody(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${body}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendBlogIaEvent(config: BlogIaConfig, event: BlogIaEvent): Promise<BlogIaResult> {
  const body = JSON.stringify({ event_id: event.eventId, type: event.type, tenant_id: event.tenantId, data: event.data });
  const ts = String(Math.floor((config.now?.() ?? new Date()).getTime() / 1000));
  const doFetch = config.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(`${config.apiUrl.replace(/\/$/, "")}/api/ingest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-blogia-timestamp": ts,
        "x-blogia-signature": await signBlogIaBody(config.secret, ts, body),
      },
      body,
      signal: AbortSignal.timeout(config.timeoutMs ?? 30_000),
    });
  } catch (e) {
    throw new BlogIaError(0, `No se pudo contactar con BLOG IA: ${e instanceof Error ? e.message : String(e)}`, true);
  }
  let payload: { ok?: boolean; result?: string; error?: string } = {};
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    /* cuerpo no JSON: se trata por el código HTTP */
  }
  if (res.ok && payload.ok) return payload as BlogIaResult;
  throw new BlogIaError(res.status, payload.error ?? `BLOG IA respondió ${res.status}`, res.status >= 500 || res.status === 429);
}

/** Slug legible, minúsculas y con guiones (mismo criterio que el blog). */
export function slugifyForBlogIa(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

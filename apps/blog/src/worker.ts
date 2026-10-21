// Punto de entrada de Cloudflare Workers.
// Bindings esperados (wrangler.toml, aún no desplegado): DB (D1), INGEST_SECRET, API_HOST.
import { handle } from "./app";
import { d1Adapter } from "./db";
import { FixedWindowRateLimit } from "./security";

interface WorkerEnv {
  DB: Parameters<typeof d1Adapter>[0];
  INGEST_SECRET: string;
  API_HOST: string;
  INGEST_RATE_LIMIT?: string;
  MEDIA?: Parameters<typeof handle>[0]["media"];
}

const rateLimiters = new Map<number, FixedWindowRateLimit>();
function rateLimiterFor(max: number): FixedWindowRateLimit {
  let limiter = rateLimiters.get(max);
  if (!limiter) {
    limiter = new FixedWindowRateLimit(max, 60_000);
    rateLimiters.set(max, limiter);
  }
  return limiter;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const limit = Number(env.INGEST_RATE_LIMIT ?? 60);
    return handle({ db: d1Adapter(env.DB), ingestSecret: env.INGEST_SECRET, apiHost: env.API_HOST, media: env.MEDIA, ingestRateLimit: rateLimiterFor(Number.isFinite(limit) && limit > 0 ? limit : 60) }, request);
  },
};

// Punto de entrada de Cloudflare Workers.
// Bindings esperados (wrangler.toml, aún no desplegado): DB (D1), INGEST_SECRET, API_HOST.
import { handle } from "./app";
import { d1Adapter } from "./db";

interface WorkerEnv {
  DB: Parameters<typeof d1Adapter>[0];
  INGEST_SECRET: string;
  API_HOST: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handle({ db: d1Adapter(env.DB), ingestSecret: env.INGEST_SECRET, apiHost: env.API_HOST }, request);
  },
};

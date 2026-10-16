// Servidor LOCAL de desarrollo (no es producción). Usa SQLite en archivo.
//   npm run seed --workspace=apps/blog   (crea datos de ejemplo)
//   npm run dev  --workspace=apps/blog   (sirve en http://localhost:8787)
// Los blogs de ejemplo se abren con *.localhost, que el navegador resuelve solo:
//   http://blog.demo-salud.localhost:8787   http://blog.demo-casa.localhost:8787
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { handle } from "../app";
import { sqliteAdapter } from "./sqlite-adapter";

const PORT = Number(process.env.PORT ?? 8787);
const DB_FILE = process.env.BLOG_DB ?? "/tmp/blog-ia-local.sqlite";
const db = sqliteAdapter(DB_FILE);
const env = {
  db,
  ingestSecret: process.env.INGEST_SECRET ?? "local-dev-secret",
  apiHost: process.env.API_HOST ?? "api.blog.localhost",
  originFor: (h: string) => `http://${h}:${PORT}`,
};

createServer(async (req, res) => {
  try {
    const host = req.headers.host ?? `localhost:${PORT}`;
    const chunks: Buffer[] = [];
    if (req.method !== "GET" && req.method !== "HEAD") for await (const c of Readable.from(req)) chunks.push(c as Buffer);
    const request = new Request(`http://${host}${req.url}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const response = await handle(env, request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error(e);
    res.writeHead(500).end("Error interno");
  }
}).listen(PORT, () => console.log(`BLOG IA local en http://localhost:${PORT}  (db: ${DB_FILE})`));

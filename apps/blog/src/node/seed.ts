// Datos de ejemplo para ver el blog en local. Pasa por la API firmada real.
import { sqliteAdapter } from "./sqlite-adapter";
import { send, provisionTenant, articleData } from "../test-helpers";
import type { Env } from "../types";

const PORT = Number(process.env.PORT ?? 8787);
const db = sqliteAdapter(process.env.BLOG_DB ?? "/tmp/blog-ia-local.sqlite");
// test-helpers firma con el secreto de pruebas; el seed escribe directo a la base local, así que solo importa que firma y verifica coincidan.
const env: Env = { db, ingestSecret: "test-secret", apiHost: "api.blog.test", originFor: (h) => `http://${h}:${PORT}` };

async function main() {
  await provisionTenant(env, "demo-salud", "blog.demo-salud.localhost", {
    name: "Seguros Demo Salud", accentColor: "#0e7490", tagline: "Guías y consejos sobre seguros de salud",
    whatsapp: "+1 305 555 0100", mainSiteUrl: "https://demo-salud.example.com",
    nav: [{ label: "Inicio", href: "https://demo-salud.example.com" }, { label: "Planes", href: "https://demo-salud.example.com/planes" }],
    footer: [{ title: "Empresa", links: [{ label: "Contacto", href: "https://demo-salud.example.com/contacto" }] }],
  });
  await provisionTenant(env, "demo-casa", "blog.demo-casa.localhost", { name: "Casa Propia Demo", accentColor: "#b45309", whatsapp: "34600111222" });

  for (const [id, slug, name, description] of [
    ["c1", "medicaid", "Medicaid en Florida", "Requisitos, plazos y cómo aplicar a Medicaid en Florida."],
    ["c2", "medicare", "Medicare", "Todo sobre Medicare: planes, costos y cobertura."],
    ["c3", "familias", "Seguros para familias", "Opciones de cobertura para toda la familia."],
  ]) await send(env, "demo-salud", "category.upsert", { id, slug, name, description });

  for (let n = 1; n <= 12; n++) {
    await send(env, "demo-salud", "article.publish", articleData(n, {
      cover_image_url: `https://picsum.photos/seed/salud${n}/1200/675`, category_ids: [n % 3 === 0 ? "c2" : n % 2 === 0 ? "c3" : "c1"],
    }));
  }
  await send(env, "demo-casa", "article.publish", articleData(1, { title: "Cómo comprar tu primera casa", slug: "como-comprar-tu-primera-casa", cover_image_url: "https://picsum.photos/seed/casa1/1200/675" }));
  console.log("Listo. Abre http://blog.demo-salud.localhost:%d  y  http://blog.demo-casa.localhost:%d", PORT, PORT);
}
main().catch((e) => { console.error(e); process.exit(1); });

// Tercera línea de publicación: BLOG IA (2026-10-16, "BLOG IA").
// Implementa `ArticlePublisher` enviando el artículo ya redactado por SEO Total
// a la API de ingestión del blog del cliente (Cloudflare), en vez de manejar un
// navegador (10minutesWebsite) o un servidor MCP.
//
// Decisión de Milton (2026-10-16): con BLOG IA activo el artículo se publica
// SOLO en el blog, no en 10minutesWebsite. Por eso este publisher reemplaza al
// de navegador para esa cuenta; no se ejecuta en paralelo.
//
// Igual que el publisher MCP, el contenido lo redacta SEO Total
// (`generateCustomArticle`): el flujo "estándar" de 10minutesWebsite no existe aquí.
//
// Dependencias INYECTADAS (`send`, `generate`): el módulo no importa el paquete
// compartido en tiempo de ejecución, así que se prueba de punta a punta contra
// el blog real (apps/blog/src/e2e.test.ts) sin servidores ni claves.

import { createHash } from "node:crypto";
import type { ArticlePublisher, PublishArticleInput, PublishResult, RemoteCategory } from "./publisher";
import { generateCustomArticle } from "./generateCustomArticle";

type SendFn = (event: { eventId: string; type: string; tenantId: string; data: Record<string, unknown> }) => Promise<{ result: string }>;
type GenerateFn = (title: string, prompt: string, language: string, author?: string | null) => Promise<{ title: string; summary: string; contentHtml: string }>;

export interface BlogIaPublisherContext {
  tenantId: string;
  /** Origen público del blog (https://blog.cliente.com): con él se arma la URL final. */
  blogBaseUrl: string;
  send: SendFn;
  promptText: string;
  contentLanguage: string;
  authorName?: string | null;
  /** Categoría de SEO Total del lote; el blog la recibe como categoría propia. */
  category: { id: string; name: string; description?: string };
  generate?: GenerateFn;
  now?: () => Date;
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

export function slugify(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

/** Error con causa clara para el historial; `retryable` decide si el lote reintenta. */
export class BlogIaPublishError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
    this.name = "BlogIaPublishError";
  }
}

export function createBlogIaPublisher(ctx: BlogIaPublisherContext): ArticlePublisher {
  const generate: GenerateFn = ctx.generate ?? generateCustomArticle;

  const send: SendFn = async (event) => {
    try {
      return await ctx.send(event);
    } catch (e) {
      const status = (e as { status?: number }).status ?? 0;
      const retryable = (e as { retryable?: boolean }).retryable ?? false;
      throw new BlogIaPublishError(
        status === 409 ? `BLOG IA rechazó el artículo por conflicto: ${(e as Error).message}` : `BLOG IA: ${(e as Error).message}`,
        retryable,
      );
    }
  };

  return {
    // El blog tiene categorías propias; no se leen del panel de 10minutesWebsite.
    async fetchCategories(): Promise<RemoteCategory[]> {
      return [];
    },

    async publishArticle(input: PublishArticleInput): Promise<PublishResult> {
      await input.onStep(`Generando contenido con el prompt de la cuenta para "${input.title}".`);
      const generated = await generate(input.title, ctx.promptText, ctx.contentLanguage, ctx.authorName);

      // Misma clave que usa el reintento de un título: nunca duplica el artículo.
      const sourceId = hash(`${ctx.category.id}:${input.title}`).slice(0, 24);
      const categoryId = ctx.category.id;
      const baseSlug = slugify(generated.title) || `articulo-${sourceId.slice(0, 8)}`;

      await send({
        eventId: `category:${categoryId}:${hash(ctx.category.name).slice(0, 8)}`,
        type: "category.upsert",
        tenantId: ctx.tenantId,
        data: { id: categoryId, slug: slugify(ctx.category.name) || categoryId.toLowerCase(), name: ctx.category.name, description: ctx.category.description ?? "" },
      });

      const publish = (slug: string) =>
        send({
          eventId: `publish:${sourceId}:1:${slug}`,
          type: "article.publish",
          tenantId: ctx.tenantId,
          data: {
            source_article_id: sourceId, revision: 1, slug, title: generated.title, excerpt: generated.summary,
            body_html: generated.contentHtml, category_ids: [categoryId], language: ctx.contentLanguage,
            author: ctx.authorName ?? undefined, published_at: (ctx.now?.() ?? new Date()).toISOString(),
            // Con `imageUrl` (imagen ya alojada) se envía portada; sin ella el blog muestra el marcador neutro.
            ...(input.imageUrl ? { cover_image_url: input.imageUrl, cover_alt: generated.title } : {}),
          },
        });

      let slug = baseSlug;
      try {
        await publish(slug);
      } catch (e) {
        // Otro artículo ya usa ese slug: se añade un sufijo estable derivado del id y se reintenta una vez.
        if (!(e instanceof BlogIaPublishError) || !/conflicto/.test(e.message)) throw e;
        slug = `${baseSlug.slice(0, 100)}-${sourceId.slice(0, 6)}`;
        await publish(slug);
      }

      const articleUrl = `${ctx.blogBaseUrl.replace(/\/$/, "")}/${slug}/`;
      await input.onStep(`Artículo publicado en BLOG IA: ${articleUrl}`);
      return { articleUrl, finalTitle: generated.title, summary: generated.summary };
    },

    async deleteArticle(externalId: string): Promise<void> {
      await send({ eventId: `unpublish:${externalId}`, type: "article.unpublish", tenantId: ctx.tenantId, data: { source_article_id: externalId } });
    },
  };
}

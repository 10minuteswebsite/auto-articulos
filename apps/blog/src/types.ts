import type { Db } from "./db";
import type { RateLimit } from "./security";
import type { R2BucketLike } from "./media";

export interface Env {
  db: Db;
  /** Secreto compartido con SEO Total para firmar la API de ingestión. */
  ingestSecret: string;
  /** Hostname (sin puerto) que sirve /api/*; el resto de hostnames sirven blogs. */
  apiHost: string;
  /** Hora actual (inyectable en pruebas). */
  now?: () => Date;
  /** Origen público de un hostname (por defecto https://hostname; en local, http + puerto). */
  originFor?: (hostname: string) => string;
  ingestRateLimit?: RateLimit;
  /** Almacén de imágenes (R2 en Cloudflare; memoria en local/pruebas). Sin él, media.upload responde 503. */
  media?: R2BucketLike;
}

export interface Brand {
  name?: string;
  logoUrl?: string;
  accentColor?: string;
  nav?: { label: string; href: string }[];
  footer?: { title?: string; links: { label: string; href: string }[] }[];
  whatsapp?: string;          // solo dígitos con código de país
  mainSiteUrl?: string;
  tagline?: string;
}

export interface TenantCtx {
  tenantId: string;
  hostname: string;
  baseUrl: string;            // https://blog.cliente.com (sin barra final)
  subscriptionState: string;
  blogStatus: string;
  language: string;
  brand: Brand;
}

export interface ArticleRow {
  id: string; tenant_id: string; source_article_id: string; slug: string; title: string; excerpt: string;
  body_html: string; cover_image_url: string | null; cover_alt: string | null; author: string | null;
  seo_title: string | null; meta_description: string | null; language: string; status: string;
  revision: number; published_at: string; updated_at: string;
}

export interface CategoryRow {
  id: string; tenant_id: string; slug: string; name: string; description: string; sort_order: number; status: string;
}

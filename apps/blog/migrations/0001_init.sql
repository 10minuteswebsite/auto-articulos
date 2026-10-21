-- BLOG IA — esquema multi-tenant (SQLite/D1). Blueprint §6.
-- REGLA: toda tabla de contenido lleva tenant_id y toda consulta lo filtra.
-- Los slugs son únicos DENTRO del tenant, nunca globalmente (blueprint §6).

CREATE TABLE IF NOT EXISTS tenants (
  id                 TEXT PRIMARY KEY,
  seo_total_account_id TEXT NOT NULL UNIQUE,   -- un blog por cuenta (blueprint §2)
  subscription_state TEXT NOT NULL DEFAULT 'active', -- active | suspended
  created_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blogs (
  tenant_id     TEXT PRIMARY KEY REFERENCES tenants(id),
  status        TEXT NOT NULL DEFAULT 'draft_setup',
  site_url      TEXT,
  language      TEXT NOT NULL DEFAULT 'es',
  brand_json    TEXT NOT NULL DEFAULT '{}',    -- nombre, logo, colores, menú, footer, whatsapp
  settings_json TEXT NOT NULL DEFAULT '{}'
);

-- El hostname es la ÚNICA forma de resolver el tenant en el sitio público.
CREATE TABLE IF NOT EXISTS domains (
  hostname            TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL REFERENCES tenants(id),
  verification_status TEXT NOT NULL DEFAULT 'pending', -- pending | verified
  tls_status          TEXT NOT NULL DEFAULT 'pending', -- pending | ready
  is_primary          INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_domains_tenant ON domains(tenant_id);

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active',
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS articles (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id),
  source_article_id TEXT NOT NULL,             -- id estable en SEO Total
  slug              TEXT NOT NULL,
  title             TEXT NOT NULL,
  excerpt           TEXT NOT NULL DEFAULT '',
  body_html         TEXT NOT NULL,             -- ya sanitizado al ingresar
  cover_image_url   TEXT,
  cover_alt         TEXT,
  author            TEXT,
  seo_title         TEXT,
  meta_description  TEXT,
  language          TEXT NOT NULL DEFAULT 'es',
  status            TEXT NOT NULL DEFAULT 'published', -- published | unpublished
  revision          INTEGER NOT NULL DEFAULT 1,
  published_at      TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE (tenant_id, source_article_id),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_articles_list ON articles(tenant_id, status, published_at DESC);

-- Metadatos de medios; el binario vive en R2, nunca en D1.
CREATE TABLE IF NOT EXISTS media (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  article_id  TEXT,
  r2_key      TEXT NOT NULL UNIQUE,
  mime        TEXT NOT NULL,
  byte_size   INTEGER NOT NULL,
  width       INTEGER,
  height      INTEGER,
  alt_text    TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_tenant_article ON media(tenant_id, article_id);

CREATE TABLE IF NOT EXISTS article_categories (
  tenant_id   TEXT NOT NULL,
  article_id  TEXT NOT NULL REFERENCES articles(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  PRIMARY KEY (article_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_artcat_cat ON article_categories(tenant_id, category_id);

-- Idempotencia (blueprint §5.3): un mismo event_id nunca se aplica dos veces.
CREATE TABLE IF NOT EXISTS publish_events (
  tenant_id       TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  type            TEXT NOT NULL,
  status          TEXT NOT NULL,               -- ok | error
  error           TEXT,
  created_at      TEXT NOT NULL,
  PRIMARY KEY (tenant_id, source_event_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  actor     TEXT NOT NULL,
  action    TEXT NOT NULL,
  result    TEXT NOT NULL,
  detail    TEXT,
  timestamp TEXT NOT NULL
);

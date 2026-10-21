-- BLOG IA · Fase 3 (2026-10-21): cuando un artículo cambia de slug, la URL
-- anterior responde 301 a la nueva (nunca 404). Aditiva e idempotente.
CREATE TABLE IF NOT EXISTS slug_redirects (
  tenant_id  TEXT NOT NULL,
  old_slug   TEXT NOT NULL,
  article_id TEXT NOT NULL REFERENCES articles(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, old_slug)
);
CREATE INDEX IF NOT EXISTS idx_slug_redirects_article ON slug_redirects(tenant_id, article_id);

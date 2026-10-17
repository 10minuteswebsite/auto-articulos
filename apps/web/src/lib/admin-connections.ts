import type { HostProductScope } from "@/lib/product-routes";

/**
 * Conexiones principales de la plataforma. Los administradores las manejan desde
 * el menú Admin (una entrada por conexión) y no desde Configuración → Conexiones,
 * que queda solo para usuarios ordinarios. Los ids son los de ConexionesView.
 *
 * `via`: las conexiones que pasan por Composio (Search Console, Analytics,
 * Instagram, Facebook, Pinterest) o por PostPeer (Business, Threads) se manejan
 * dentro de esos dos paneles de Admin; no llevan entrada propia en el menú.
 */
export const ADMIN_CONNECTIONS = [
  { id: "google-search-console", label: "Google Search Console", product: "ARTICULOS", via: "composio" },
  { id: "google-analytics", label: "Google Analytics", product: "ARTICULOS", via: "composio" },
  { id: "bing-webmaster", label: "Bing Webmaster Tools", product: "ARTICULOS", via: "propia" },
  { id: "business-profile", label: "Google Business Profile", product: "REDES", via: "postpeer" },
  { id: "instagram", label: "Instagram", product: "REDES", via: "composio" },
  { id: "facebook", label: "Facebook", product: "REDES", via: "composio" },
  { id: "threads", label: "Threads", product: "REDES", via: "postpeer" },
  { id: "linkedin", label: "LinkedIn", product: "REDES", via: "propia" },
  { id: "pinterest", label: "Pinterest", product: "REDES", via: "propia" },
  { id: "tumblr", label: "Tumblr", product: "REDES", via: "propia" },
  { id: "bluesky", label: "Bluesky", product: "REDES", via: "propia" },
] as const;

/** Pantallas de administrador propias (credenciales de la plataforma) por conexión. */
const ADMIN_PAGES: Record<string, string> = {
  "bing-webmaster": "/dashboard/bing",
  linkedin: "/dashboard/linkedin",
  tumblr: "/dashboard/tumblr",
  pinterest: "/dashboard/pinterest",
  bluesky: "/dashboard/bluesky",
};

/** Todas las conexiones con pantalla propia salen en el menú Admin de AMBOS productos (orden de Milton, 2026-10-17). */
export function adminConnectionItems(_host?: HostProductScope): { href: string; label: string }[] {
  return ADMIN_CONNECTIONS.filter((c) => c.via === "propia").map((c) => ({
    href: ADMIN_PAGES[c.id] ?? `/dashboard/configuracion/conexiones?conexion=${c.id}`,
    label: c.label,
  }));
}

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
  { id: "pinterest", label: "Pinterest", product: "REDES", via: "composio" },
  { id: "tumblr", label: "Tumblr", product: "REDES", via: "propia" },
  { id: "bluesky", label: "Bluesky", product: "REDES", via: "propia" },
  { id: "blogger", label: "Blogger", product: "REDES", via: "propia" },
] as const;

export function adminConnectionItems(host: HostProductScope): { href: string; label: string }[] {
  return ADMIN_CONNECTIONS.filter((c) => c.via === "propia" && (host === "COMPARTIDO" || c.product === host)).map((c) => ({
    href: `/dashboard/configuracion/conexiones?conexion=${c.id}`,
    label: c.label,
  }));
}

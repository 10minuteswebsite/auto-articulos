import type { HostProductScope } from "@/lib/product-routes";

/**
 * Conexiones principales de la plataforma. Los administradores las manejan desde
 * el menú Admin (una entrada por conexión) y no desde Configuración → Conexiones,
 * que queda solo para usuarios ordinarios. Los ids son los de ConexionesView.
 */
export const ADMIN_CONNECTIONS = [
  { id: "google-search-console", label: "Google Search Console", product: "ARTICULOS" },
  { id: "google-analytics", label: "Google Analytics", product: "ARTICULOS" },
  { id: "bing-webmaster", label: "Bing Webmaster Tools", product: "ARTICULOS" },
  { id: "business-profile", label: "Google Business Profile", product: "REDES" },
  { id: "instagram", label: "Instagram", product: "REDES" },
  { id: "facebook", label: "Facebook", product: "REDES" },
  { id: "threads", label: "Threads", product: "REDES" },
  { id: "linkedin", label: "LinkedIn", product: "REDES" },
  { id: "pinterest", label: "Pinterest", product: "REDES" },
  { id: "tumblr", label: "Tumblr", product: "REDES" },
  { id: "bluesky", label: "Bluesky", product: "REDES" },
  { id: "blogger", label: "Blogger", product: "REDES" },
] as const;

export function adminConnectionItems(host: HostProductScope): { href: string; label: string }[] {
  return ADMIN_CONNECTIONS.filter((c) => host === "COMPARTIDO" || c.product === host).map((c) => ({
    href: `/dashboard/configuracion/conexiones?conexion=${c.id}`,
    label: c.label,
  }));
}

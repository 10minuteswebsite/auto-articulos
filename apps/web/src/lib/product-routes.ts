/*
 * A QUÉ PRODUCTO PERTENECE CADA PANTALLA (proyecto «SEPARACION DE SEO TOTAL»,
 * Lote 2; Parte A §3.1).
 *
 * SEO Total se separa de cara al cliente en dos productos, pero NINGUNA URL
 * existente cambia: el producto de una pantalla se DEDUCE de su ruta con esta
 * tabla. Así los enlaces guardados, correos y favoritos siguen funcionando y
 * el menú puede mostrar solo lo que corresponde al producto en uso.
 *
 * Sin imports a propósito (ni Prisma ni nada de servidor): lo leen el menú
 * (componente de cliente), las pantallas y las pruebas.
 *
 * Reglas:
 *  - La coincidencia es por SEGMENTO de ruta y gana la más específica
 *    (misma idea que ModuleGuard): «/dashboard/oportunidades-redes» NO es
 *    «/dashboard/oportunidades».
 *  - Lo que no está en la tabla es COMPARTIDO: ante la duda, una pantalla
 *    nunca se esconde de un producto.
 */

export type ProductScope = "ARTICULOS" | "REDES" | "COMPARTIDO" | "ADMIN";
export type HostProductScope = Exclude<ProductScope, "ADMIN">;
export const HUB_URL = "https://hub.lasolucionweb.net";
/**
 * Public product origins used when a tenant launches a product from the Hub.
 * The old `seototal` origin remains available for backwards compatibility,
 * but must not be emitted as the MCP address for a Hub-launched session.
 */
export const HUB_PRODUCT_ORIGINS = {
  ARTICULOS: "https://articulos.lasolucionweb.net",
  REDES: "https://redes.lasolucionweb.net",
} as const;

export function mcpOriginForHost(hostname: string | null | undefined): string {
  const host = (hostname ?? "").toLowerCase().split(":")[0];
  const product = productOfHost(host);
  if (product === "REDES") return HUB_PRODUCT_ORIGINS.REDES;
  if (product === "ARTICULOS") return HUB_PRODUCT_ORIGINS.ARTICULOS;
  // `seototal.lasolucionweb.com` is the legacy human-facing alias. It is not
  // the public MCP address used after the Hub handoff; use the product host.
  return HUB_PRODUCT_ORIGINS.ARTICULOS;
}

/** Producto de la dirección pública desde la que el usuario está trabajando. */
export function productOfHost(hostname: string | null | undefined): HostProductScope {
  const host = (hostname ?? "").toLowerCase().split(":")[0];
  if (host === "articulos.lasolucionweb.com" || host === "articulos.lasolucionweb.net") return "ARTICULOS";
  if (host === "redes.lasolucionweb.com" || host === "redes.lasolucionweb.net") return "REDES";
  return "COMPARTIDO";
}

/** [prefijo de ruta, producto]. El orden no importa: gana el prefijo más largo. */
export const PRODUCT_ROUTES: ReadonlyArray<readonly [string, ProductScope]> = [
  // Inicios de cada producto (rutas nuevas, solo añadidas).
  ["/dashboard/articulos", "ARTICULOS"],
  ["/dashboard/redes", "REDES"],

  // Artículos.
  ["/dashboard/publicar", "ARTICULOS"],
  ["/dashboard/oportunidades", "ARTICULOS"],
  ["/dashboard/estadisticas", "ARTICULOS"], // hoy solo cuenta artículos (dashboard-stats)
  ["/dashboard/configuracion/inicial", "ARTICULOS"],
  ["/dashboard/configuracion/cuenta", "ARTICULOS"],
  ["/dashboard/configuracion/indexacion", "ARTICULOS"],

  // Redes.
  ["/dashboard/oportunidades-redes", "REDES"],
  ["/dashboard/configuracion/redes-sociales", "REDES"],

  // Pantallas que HOY mezclan los dos productos en la misma página
  // (historial y progreso consultan artículos y redes): son compartidas hasta
  // que se filtren por producto.
  ["/dashboard/historial", "COMPARTIDO"],
  ["/dashboard/publicaciones-en-curso", "COMPARTIDO"],

  // Compartidas: conexiones por cuenta, cuenta, app móvil, asistentes IA, ayuda.
  ["/dashboard/configuracion", "COMPARTIDO"],
  ["/dashboard/configuracion/contenido", "COMPARTIDO"],
  ["/dashboard/como-funciona", "COMPARTIDO"],
  ["/dashboard/actualizaciones", "COMPARTIDO"],
  ["/dashboard/vista-previa-bloqueo", "COMPARTIDO"],

  // Administración: fuera de ambos productos.
  ["/dashboard/usuarios", "ADMIN"],
  ["/dashboard/composio", "ADMIN"],
  ["/dashboard/postpeer", "ADMIN"],
];

/**
 * Producto de una API cuyo resultado pertenece a una sola pantalla.
 *
 * Las APIs compartidas (sesión, cuenta, conexiones generales y MCP) no
 * aparecen aquí. Esta tabla solo evita que una URL de un subdominio entregue
 * datos del producto contrario cuando alguien la escribe directamente.
 */
const PRODUCT_API_ROUTES: ReadonlyArray<readonly [string, HostProductScope]> = [
  ["/api/runs", "ARTICULOS"],
  ["/api/opportunities", "ARTICULOS"],
  ["/api/title-generation", "ARTICULOS"],
  ["/api/titles", "ARTICULOS"],
  ["/api/sitemap", "ARTICULOS"],
  ["/api/pre-validation", "ARTICULOS"],
  ["/api/dashboard-stats", "ARTICULOS"],
  ["/api/credentials", "ARTICULOS"],
  ["/api/categories", "ARTICULOS"],
  ["/api/languages", "ARTICULOS"],
  ["/api/google-analytics", "ARTICULOS"],
  ["/api/business-profile", "ARTICULOS"],
  ["/api/search-integrations/google", "ARTICULOS"],
  ["/api/search-integrations/bing", "ARTICULOS"],
  ["/api/social-opportunities", "REDES"],
  ["/api/search-integrations/instagram", "REDES"],
  ["/api/search-integrations/facebook-pages", "REDES"],
  ["/api/search-integrations/threads", "REDES"],
  ["/api/search-integrations/linkedin", "REDES"],
  ["/api/search-integrations/pinterest", "REDES"],
  ["/api/search-integrations/tumblr", "REDES"],
  ["/api/search-integrations/twitter", "REDES"],
  ["/api/search-integrations/bluesky", "REDES"],
  ["/api/search-integrations/devto", "REDES"],
  ["/api/search-integrations/blogger", "REDES"],
];

/** Id del módulo opt-in que actúa como interruptor de la vista por productos (ver modules.ts). */
export const PRODUCT_VIEW_MODULE_ID = "vista-productos";

/**
 * ¿Está activa la vista por productos para esta cuenta? Recibe la lista de
 * módulos deshabilitados que ya entrega /api/me (`disabledModules`, que incluye
 * los opt-in sin «Habilitado»). Mientras no se sepa (lista ausente o aún sin
 * cargar) la respuesta es NO: ante la duda, el menú y el inicio quedan como
 * hoy y nadie ve nada nuevo por accidente.
 */
export function isProductViewEnabled(disabledModules: readonly string[] | null | undefined): boolean {
  return Array.isArray(disabledModules) && !disabledModules.includes(PRODUCT_VIEW_MODULE_ID);
}

/** Producto de una ruta. Cualquier ruta desconocida (o el inicio) es COMPARTIDO. */
export function productOfPath(pathname: string | null | undefined): ProductScope {
  if (!pathname) return "COMPARTIDO";
  // Se ignoran la query y el hash por si llega una URL completa de la barra.
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  let best: readonly [string, ProductScope] | null = null;
  for (const entry of PRODUCT_ROUTES) {
    const [prefix] = entry;
    if (clean === prefix || clean.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best[0].length) best = entry;
    }
  }
  return best ? best[1] : "COMPARTIDO";
}

/** Producto de una API; lo desconocido queda compartido por seguridad. */
export function productOfApiPath(pathname: string | null | undefined): HostProductScope | "COMPARTIDO" {
  if (!pathname) return "COMPARTIDO";
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  let best: readonly [string, HostProductScope] | null = null;
  for (const entry of PRODUCT_API_ROUTES) {
    const [prefix] = entry;
    if (clean === prefix || clean.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best[0].length) best = entry;
    }
  }
  return best ? best[1] : "COMPARTIDO";
}

/** Clasifica novedades antiguas que no guardaban modulePath. */
export function productOfUpdate(update: {
  modulePath?: string | null;
  title: string;
  summary: string;
  example?: string | null;
}): ProductScope {
  const routeProduct = productOfPath(update.modulePath);
  if (routeProduct !== "COMPARTIDO") return routeProduct;

  const title = update.title.toLocaleLowerCase("es");
  const text = `${title} ${update.summary} ${update.example ?? ""}`.toLocaleLowerCase("es");
  const hablaDeRedes = /redes sociales|blogs públicos|instagram|facebook|threads|linkedin|pinterest|tumblr|bluesky|business profile|difusión social|publicaciones en redes|carruseles|reels/.test(text);
  const hablaDeArticulos = /artículos|artículo|títulos|categorías|google search console|google analytics|bing webmaster|oportunidades de contenido|redacción|blog de tu página/.test(text);
  const tituloExclusivoDeRedes = /redes sociales|nuevas redes|publicar en redes|publicaciones en redes|blogs públicos/.test(title);
  if (tituloExclusivoDeRedes) return "REDES";
  if (hablaDeRedes && !hablaDeArticulos) return "REDES";
  if (hablaDeArticulos && !hablaDeRedes) return "ARTICULOS";
  return "COMPARTIDO";
}

/** ¿Debe mostrarse una pantalla dentro de este producto? Lo compartido va en ambos. */
export function isVisibleInProduct(
  screen: ProductScope,
  product: "ARTICULOS" | "REDES",
): boolean {
  if (screen === "ADMIN") return false;
  return screen === "COMPARTIDO" || screen === product;
}

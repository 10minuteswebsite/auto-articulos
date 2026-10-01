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
  ["/dashboard/configuracion/contenido", "ARTICULOS"],
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
  ["/dashboard/como-funciona", "COMPARTIDO"],
  ["/dashboard/actualizaciones", "COMPARTIDO"],
  ["/dashboard/vista-previa-bloqueo", "COMPARTIDO"],

  // Administración: fuera de ambos productos.
  ["/dashboard/usuarios", "ADMIN"],
  ["/dashboard/composio", "ADMIN"],
  ["/dashboard/postpeer", "ADMIN"],
];

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

/** ¿Debe mostrarse una pantalla dentro de este producto? Lo compartido va en ambos. */
export function isVisibleInProduct(
  screen: ProductScope,
  product: "ARTICULOS" | "REDES",
): boolean {
  if (screen === "ADMIN") return false;
  return screen === "COMPARTIDO" || screen === product;
}

export type ProductView = "analiticas" | "difusion";
export type ProductFilter = "articulos" | "redes" | null;

/** Mantiene la selección de conexiones alineada con el producto de la URL. */
export function isProductViewAllowed(product: ProductFilter, view: ProductView): boolean {
  return product === null || (product === "articulos" ? view === "analiticas" : view === "difusion");
}

/** Search Console es la única conexión compartida y aparece también en Redes. */
export function isConnectionVisible(product: ProductFilter, view: ProductView, connectionId: string): boolean {
  return isProductViewAllowed(product, view) || (
    product === "redes" && view === "analiticas" && connectionId === "google-search-console"
  );
}

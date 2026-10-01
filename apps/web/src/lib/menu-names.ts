/*
 * NOMBRES EN EL MENU — fuente única de los nombres de las tres opciones
 * numeradas del grupo «Publicaciones».
 *
 * Sin imports de servidor (ni Prisma) a propósito: lo leen el menú, las
 * pantallas, los botones, el manual de usuario y el asistente. Si un nombre
 * cambia, se corrige aquí y queda corregido en todos esos sitios. No escribir
 * estos nombres a mano en ningún texto nuevo: importar MENU_NAMES.
 */
export const MENU_NAMES = {
  /** /dashboard/publicar — la persona escribe sus propios títulos. */
  propios: "CONTENIDO PROPIO",
  /** /dashboard/oportunidades — artículos creados con la IA avanzada. */
  ia: "CONTENIDO GENERADO POR IA",
  /** /dashboard/oportunidades-redes — difusión en redes con IA. */
  redes: "PUBLICA EN REDES SOCIALES Y EN BLOGS PÚBLICOS",
} as const;

/** Cómo se ven en el desplegable del menú, con su número de orden. */
export const MENU_LABELS_NUMBERED = {
  propios: `1) ${MENU_NAMES.propios}`,
  ia: `2) ${MENU_NAMES.ia}`,
  redes: `3) ${MENU_NAMES.redes}`,
} as const;

/**
 * Nombres que tuvieron antes estas mismas opciones. Solo se usan para que el
 * asistente entienda novedades antiguas (ProductUpdate) que aún los mencionan;
 * nunca se muestran como nombre actual.
 */
export const MENU_NAMES_ANTERIORES = {
  propios: ["Publica tus propios títulos", "Publicaciones propias", "Publicar"],
  ia: ["Publica contenido con ayuda de la IA avanzada", "Oportunidades SEO/AEO"],
  redes: ["Difunde tu contenido en blogs externos y redes sociales", "Oportunidades para Redes Sociales"],
} as const;

/**
 * Nombres de los dos productos en que se separa SEO Total de cara al cliente
 * (proyecto «SEPARACION DE SEO TOTAL», Lote 1). Misma regla que MENU_NAMES:
 * importar de aquí, no escribir estos nombres a mano. «Redes Totales» fue un
 * nombre provisional y NO se usa en ningún texto.
 * Para la marca blanca tagcrush el nombre visible se decide aparte
 * (decisión D4 de la Fase 0); cuando se decida, pasa por platformProductName().
 */
export const PRODUCT_NAMES = {
  ARTICULOS: "SEO Total Artículos",
  REDES: "SEO Total Redes",
} as const;

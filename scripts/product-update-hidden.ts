/*
 * Funciones que NO deben anunciarse a los clientes en «Actualizaciones».
 *
 * El gancho post-commit registra una novedad visible para los usuarios por cada
 * commit con cambios de interfaz. BLOG IA está en desarrollo, oculto (módulo
 * opt-in solo para administradores) y Milton ordenó (2026-10-21) que NINGÚN
 * cliente de SEO Total lo vea hasta que él lo abra. Mientras tanto, un commit
 * sobre BLOG IA nunca genera una entrada de «Actualizaciones».
 *
 * Para abrir BLOG IA a los clientes: quitar la marca `optIn` del módulo
 * «blog-ia» (modules.ts) y vaciar HIDDEN_FEATURES a propósito.
 */

const HIDDEN_FEATURES: { name: string; subject: RegExp; paths: RegExp }[] = [
  {
    name: "BLOG IA",
    subject: /\bblog[\s_-]?ia\b/i,
    paths: /(^|\/)(apps\/blog\/|.*blog-?ia|.*BlogIa|.*BLOG_IA|packages\/db\/prisma\/migrations\/\d+_(add_blog_ia|blog_ia_wizard))/i,
  },
];

/** Nombre de la función oculta a la que pertenece el commit, o null si puede anunciarse. */
export function hiddenFeatureOf(subject: string, changedFiles: string[]): string | null {
  for (const feature of HIDDEN_FEATURES) {
    if (feature.subject.test(subject)) return feature.name;
    if (changedFiles.length > 0 && changedFiles.every((file) => feature.paths.test(file))) return feature.name;
  }
  return null;
}

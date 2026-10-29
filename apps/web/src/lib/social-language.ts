/** Convierte el código persistido del idioma de contenido en el idioma del prompt social. */
export function describeSocialContentLanguage(contentLanguage?: string | null): string {
  return /^(en)(?:[_-]|$)/i.test(contentLanguage?.trim() || "") ? "inglés" : "español";
}

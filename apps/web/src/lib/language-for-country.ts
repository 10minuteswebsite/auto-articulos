/**
 * Idioma que se propone al elegir el idioma de redacción, a partir del país que la persona ya dio al empezar.
 * Solo es una sugerencia inicial (nada se guarda hasta que la persona pulsa «Guardar»); el resto de países queda en español.
 */
const ENGLISH_COUNTRIES = new Set(["US", "GB", "CA", "AU", "NZ", "IE", "ZA", "SG", "IN", "PH"]);

export function suggestedLanguageForCountry(country: string | null | undefined): "es" | "en" {
  return country && ENGLISH_COUNTRIES.has(country.toUpperCase()) ? "en" : "es";
}

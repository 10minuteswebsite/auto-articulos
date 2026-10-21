// Guardia anti-canibalización para el momento de PUBLICAR (no de proponer).
//
// Caso real 16/10/2026 (cuenta de Antonio Aguirre): el tema "Aspectos clave
// para comprar propiedades en Orlando desde Medellín" ya estaba publicado y,
// dos horas después, volvió a encolarse con el MISMO texto. El worker gastó
// tres generaciones, imágenes y FAQ antes de que el sitio lo rechazara.
//
// A propósito la coincidencia es EXACTA sobre el texto normalizado (sin
// mayúsculas, tildes ni puntuación), nunca por similitud de palabras: la
// similitud difusa contra lo ya publicado bloqueó de más en la cuenta de
// Lorena Álvarez (7/9/2026) porque los títulos long tail legítimos comparten
// casi todas sus palabras. Aquí solo se frena lo que es inequívocamente el
// mismo tema ya publicado.

export interface PublishedTitleRecord {
  text: string;
  finalTitle: string | null;
  articleUrl: string | null;
  publishedAt?: Date | null;
}

export function normalizeTitleKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Devuelve el artículo ya publicado cuyo texto pedido o título final coincide
 * (exacto, normalizado) con `candidate`, o null si el tema no está publicado.
 */
export function findPublishedTitleMatch<T extends PublishedTitleRecord>(
  candidate: string,
  published: readonly T[],
): T | null {
  const key = normalizeTitleKey(candidate);
  if (!key) return null;
  for (const record of published) {
    if (!record.articleUrl) continue;
    if (
      normalizeTitleKey(record.text) === key ||
      (record.finalTitle && normalizeTitleKey(record.finalTitle) === key)
    ) {
      return record;
    }
  }
  return null;
}

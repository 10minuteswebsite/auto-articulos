// Seguimiento de cada artículo para personas normales: del registro interno
// del robot (decenas de pasos técnicos) se extraen solo los hitos que le
// importan a quien paga: se escribió, se creó la imagen, se publicó, se avisó
// a Google. Pura y con pruebas; no toca la base de datos.

const HITOS: Array<[RegExp, string]> = [
  [/validando si el art.culo est. repetido/i, "Se revisó que no existiera ya un artículo igual"],
  [/(generando contenido del art.culo|art.culo generado con .xito)/i, "La inteligencia artificial escribió el artículo"],
  [/imagen generada/i, "Se creó la imagen de portada"],
  [/preguntas frecuentes/i, "Se añadieron preguntas frecuentes"],
  [/art.culo publicado con .xito/i, "Se publicó en tu sitio"],
  [/sitemap enviado a google/i, "Se avisó a Google de que hay contenido nuevo"],
];

/** Hitos reconocidos en los mensajes, en el orden natural del proceso y sin repetir. */
export function hitosDesdeEventos(mensajes: string[]): string[] {
  const found: string[] = [];
  for (const [patron, frase] of HITOS) {
    if (mensajes.some((m) => patron.test(m))) found.push(frase);
  }
  return found;
}

export type IconoEstado = "ok" | "error" | "cancelado" | "espera";

export function iconoDeEstado(status: string): IconoEstado {
  if (status === "success") return "ok";
  if (status === "error") return "error";
  if (status === "cancelled") return "cancelado";
  return "espera";
}

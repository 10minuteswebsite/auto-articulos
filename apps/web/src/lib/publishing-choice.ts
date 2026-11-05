/**
 * Elección «¿dónde se publican mis artículos?» que la persona hace al empezar el asistente.
 * Solo recuerda la respuesta en este navegador mientras se configura: el destino real vive en
 * `User.publishMethod` (+ `BlogIaBlog`) y lo manda el servidor. No es un campo nuevo de base de datos.
 */
export type PublishingChoice = "blog" | "website";

export const PUBLISHING_CHOICE_KEY = "articulos-destino-elegido";
export const PUBLISHING_CHOICE_EVENT = "articulos-destino-elegido-cambio";

export function readPublishingChoice(): PublishingChoice | null {
  try {
    const v = window.localStorage.getItem(PUBLISHING_CHOICE_KEY);
    return v === "blog" || v === "website" ? v : null;
  } catch {
    return null;
  }
}

export function writePublishingChoice(choice: PublishingChoice | null) {
  try {
    if (choice) window.localStorage.setItem(PUBLISHING_CHOICE_KEY, choice);
    else window.localStorage.removeItem(PUBLISHING_CHOICE_KEY);
  } catch {
    // Sin almacenamiento: la pregunta se repetirá en la próxima carga, nada más.
  }
  window.dispatchEvent(new Event(PUBLISHING_CHOICE_EVENT));
}

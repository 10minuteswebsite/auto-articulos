import type { EnforcementMode } from "./product-enforcement";

/*
 * REGLAS PARA CAMBIAR EL INTERRUPTOR DE DERECHOS (proyecto «SEPARACION DE SEO
 * TOTAL»). Función PURA: la usa la API de administración y se prueba entera.
 *
 * Pasar a «enforce» bloquea de verdad a toda cuenta sin derecho, así que no
 * puede ocurrir por un clic suelto ni saltándose la etapa de observación:
 *   1. Solo se puede pasar a «enforce» DESDE «shadow» (la semana de sombra con
 *      sus registros es el paso previo, Parte A §2.3).
 *   2. Hace falta una confirmación escrita explícita: la palabra ACTIVAR.
 * Volver atrás («off» o «shadow») es SIEMPRE libre y sin confirmación: es la
 * reversa de emergencia y no debe tener fricción.
 */
export const ENFORCE_CONFIRMATION_WORD = "ACTIVAR";

export type TransitionCheck = { ok: true } | { ok: false; error: string };

export function checkModeTransition(input: {
  current: EnforcementMode;
  next: EnforcementMode;
  confirmation?: unknown;
}): TransitionCheck {
  const { current, next, confirmation } = input;
  if (next !== "enforce") return { ok: true };
  if (current === "enforce") return { ok: true }; // ya estaba activo: nada que confirmar
  if (current !== "shadow") {
    return {
      ok: false,
      error: "Para pasar a «Activo» primero hay que estar en «Sombra» y revisar sus registros. Pasa a Sombra y espera al menos una semana.",
    };
  }
  if (confirmation !== ENFORCE_CONFIRMATION_WORD) {
    return {
      ok: false,
      error: `Falta la confirmación: escribe ${ENFORCE_CONFIRMATION_WORD} para activar el bloqueo real.`,
    };
  }
  return { ok: true };
}

/**
 * Alcance del asistente conectado por MCP. Un mismo texto para las
 * instrucciones del servidor, los flujos con nombre y los avisos de las
 * herramientas, para que no se contradigan.
 *
 * Caso real (14/10/2026, cuenta de Angel Quintela): el asistente vio
 * «Search Console: sin conectar» en `ver_integraciones` aunque la pantalla de
 * SEO TOTAL lo mostraba conectado, y en vez de seguir con lo que sí podía
 * hacer se puso a diagnosticar Google, a pedir herramientas que no existen y a
 * hablar de reautorizar. Conectar o reparar integraciones no es su trabajo.
 */
export const MCP_SCOPE_RULES =
  "TU ALCANCE: tu trabajo es manejar lo que SEO TOTAL te permite hacer (crear títulos, publicar, revisar el estado de la cuenta, explicar el manual). NO te corresponde conectar, autorizar, probar ni reparar Google Search Console, Google Analytics, Bing ni redes sociales: eso lo hace la persona desde Configuración → Conexiones en la web. " +
  "Si una integración aparece «sin conectar» o falla, díselo con claridad en una frase, indícale qué botón tocar y SIGUE con lo que sí puedes hacer (por ejemplo crear_titulos_con_ia si falta Search Console). " +
  "No investigues la causa por tu cuenta, no pidas herramientas que no tienes, no le pidas credenciales ni que vuelva a autorizar, y no te detengas por esto. Si la persona dice que ya lo conectó pero tú lo ves «sin conectar», no discutas ni lo pruebes: pídele que lo revise en Configuración → Conexiones.";

/** Aviso corto que se añade a la respuesta de `ver_integraciones` cuando falta alguna. */
export const MCP_UNCONNECTED_NOTE =
  "Esto es lo que SEO TOTAL registra ahora. Conectar o reparar integraciones se hace en la web (Configuración → Conexiones), no desde el chat: no lo diagnostiques ni pidas credenciales; avísale a la persona y continúa con lo que sí puedes hacer.";

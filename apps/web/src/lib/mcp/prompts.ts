/**
 * `prompts/list` / `prompts/get` — capacidad del protocolo MCP distinta de
 * `tools/list`: en vez de exponer piezas sueltas y dejar que el asistente
 * improvise el orden, publica "recetas" con nombre que ya traen el flujo de
 * trabajo completo (qué tool llamar, en qué orden, qué preguntar). Pedido de
 * Milton (30/9/2026, a partir de un documento de buenas prácticas de MCP):
 * el objetivo es que un asistente conectado por primera vez, sin conocer la
 * plataforma, pueda convertir un objetivo del usuario ("quiero publicar
 * contenido") en una secuencia concreta de acciones — no una lista de tools
 * para adivinar.
 *
 * Cada prompt mapea directo a un punto real donde el asistente de un
 * usuario (conectado con Meta MUSE) se perdió en una conversación real —
 * ver `MCP_ACCIONES_UNIVERSALES.md`, sección "Sumado 30/9/2026".
 *
 * Cómo sumar un prompt nuevo: agregar un objeto a `PROMPTS`. No hace falta
 * tocar `route.ts` — ya itera sobre este array.
 */

import { MCP_AUTOMATION_RULES, MCP_SOCIAL_AUTOMATION_RULES, MCP_SOCIAL_RULES } from "./automation";
import { MCP_SCOPE_RULES } from "./scope";

export type PromptArgument = { name: string; description: string; required?: boolean };

export type PromptDef = {
  name: string;
  title: string;
  description: string;
  arguments?: PromptArgument[];
  /** Texto único que se devuelve como mensaje de guía en `prompts/get`. */
  build: (args: Record<string, string>) => string;
  social?: boolean;
};

export const PROMPTS: PromptDef[] = [
  {
    name: "menu",
    title: "Menú de casos de uso",
    description:
      "Úsalo cuando la persona escriba MENU o pida ver qué puede hacer. Devuelve cinco opciones numeradas de Artículos y, si Redes está habilitado, cinco opciones separadas de Redes; ofrece ampliar cada lista.",
    social: true,
    build: () => `Cuando la persona escriba «MENU» (en cualquier combinación de mayúsculas/minúsculas), muestra exactamente este menú breve y separado:

ARTÍCULOS
1) Ver y publicar títulos propios.
2) Generar títulos con IA a partir del negocio y del cliente.
3) Crear oportunidades usando datos de Search Console.
4) Revisar publicaciones, estados y enlaces.
5) Consultar o cambiar preferencias de contenido.

REDES Y BLOGS
1) Ver redes conectadas, propuestas pendientes y cupo diario.
2) Generar propuestas para una o varias redes.
3) Editar una propuesta pendiente antes de publicarla.
4) Publicar propuestas con vista previa y confirmación.
5) Revisar estados, enlaces, errores y reintentos.

Elige un número indicando también la sección (Artículos o Redes). Si quieres más posibilidades, escribe «MÁS ARTÍCULOS» o «MÁS REDES» y ofrece la siguiente tanda de cinco. No mezcles las dos secciones ni muestres más de cinco opciones por sección en esta respuesta. Si Redes no aparece habilitado por el HUB, muestra solo ARTÍCULOS y explica que Redes debe activarse desde el HUB.`,
  },
  {
    name: "empezar",
    title: "Empezar / usuario no sabe qué hacer",
    description:
      "Úsalo apenas te conectes, o en cualquier momento en que el usuario diga algo genérico como 'no sé qué hacer', 'qué puedo hacer aquí', 'ayúdame'. Devuelve el mismo menú numerado del Home real de SEO Total.",
    build: () =>
      `El usuario acaba de conectar su asistente a SEO Total, o no sabe por dónde empezar. NO le hagas una pregunta abierta tipo "¿en qué te ayudo?". En vez de eso, salúdalo brevemente y ofrécele este menú numerado (el mismo que vería en su Inicio):

1) Contenido propio — escribir y publicar sus propios títulos.
2) Contenido generado por IA — que la IA proponga y publique artículos.
3) Publicar en redes sociales y blogs públicos.

Espera a que elija un número o lo diga con sus palabras. Si después de elegir sigue sin saber qué hacer, o pregunta cómo funciona algo puntual, llama a ver_manual_seo_total (con "tema" si es algo específico) en vez de inventar la respuesta.`,
  },

  {
    name: "publicar_contenido",
    title: "Publicar contenido (flujo completo)",
    description:
      "Úsalo cuando el usuario exprese la intención de publicar artículos, generar contenido, o diga algo como 'quiero publicar', 'crea artículos', 'genera contenido con IA' — sin importar si todavía no sabe con qué categoría o cómo. Es el flujo que resuelve la ambigüedad entre crear_oportunidades y crear_titulos_con_ia, que es donde más se pierden los asistentes.",
    arguments: [
      { name: "objetivo", description: "Lo que el usuario dijo que quiere, en sus palabras (opcional).", required: false },
    ],
    build: (args) =>
      `El usuario quiere publicar contenido${args.objetivo ? ` — dijo textualmente: "${args.objetivo}"` : ""}. Sigue este flujo EN ORDEN, sin saltar pasos, y sin pedirle al usuario que elija entre nombres técnicos de herramientas:

1. Llama ver_estado_configuracion. Si falta algo obligatorio (credenciales, categorías, idioma, créditos), explícaselo en lenguaje claro y detente ahí — no sigas el flujo hasta que esté resuelto.
2. Llama listar_categorias y pregúntale en cuál categoría quiere publicar (o usa la que ya mencionó).
3. Llama listar_oportunidades filtrando por esa categoría. Si ya hay títulos pendientes, ofrécele publicarlos directamente (salta al paso 5).
4. Si NO hay oportunidades pendientes, decide entre estas dos — no le preguntes cuál quiere por nombre técnico, decide vos con esta regla:
   - Si la cuenta tiene Google Search Console conectado (confírmalo con ver_integraciones) y el usuario quiere que la IA analice datos reales de su sitio: usa crear_oportunidades.
   - Si el usuario prefiere describir su negocio (a quién le vende, sobre qué tema, qué busca el cliente) o no tiene Search Console: usa crear_titulos_con_ia, pidiéndole cliente_tipo, tema y deseo_cliente antes de llamarla.
   - Si ver_integraciones muestra Search Console «sin conectar», no lo investigues ni intentes conectarlo: dile que se conecta en Configuración → Conexiones y sigue con crear_titulos_con_ia.
5. Si el usuario pidió un estilo de escritura (STANDARD, comparativos, estadísticos, guías, problema-solución), confirma el nombre con listar_estilos_escritura y pásalo en el parámetro estilo al publicar; si no pidió ninguno, no lo cambies.
6. Antes de publicar, llama la herramienta de publicación correspondiente (publicar_categoria, publicar_oportunidades_seleccionadas o publicar_titulos_en_categoria) SIEMPRE con confirmar=false primero. Muéstrale al usuario exactamente qué se va a publicar y espera su confirmación explícita.
7. Solo con un "sí" inequívoco, vuelve a llamar la misma herramienta con confirmar=true.
8. Después de publicar, llama estado_de_publicaciones para confirmarle que se completó y darle el enlace real del artículo (puede tardar un momento en aparecer si todavía se está generando).

${MCP_SCOPE_RULES}`,
  },

  {
    name: "programar_publicaciones",
    title: "Programar publicaciones automáticas",
    description:
      "Úsalo cuando el usuario pida publicar de forma recurrente o automática ('un artículo a las 7, otro a las 12 y otro a las 19', 'publica todos los días', 'que se publique solo') o quiera cambiar, pausar o detener esa programación. Trae el flujo completo de cada ejecución, incluida la reposición de oportunidades cuando se acaban.",
    arguments: [
      { name: "horarios", description: "Horarios o cantidad que dijo el usuario, en sus palabras (opcional; por defecto 07:00, 12:00 y 19:00).", required: false },
    ],
    build: (args) =>
      `${args.horarios ? `El usuario pidió esta programación, en sus palabras: "${args.horarios}". Aplícala exactamente.\n\n` : ""}${MCP_AUTOMATION_RULES}\n\n${MCP_SCOPE_RULES}`,
  },

  {
    name: "publicar_en_redes",
    social: true,
    title: "Publicar en redes sociales y blogs",
    description:
      "Úsalo cuando el usuario quiera publicar en redes sociales o blogs ('publica en Facebook', 'sube esto a LinkedIn e Instagram', 'publica en todas mis redes', 'genera propuestas para Pinterest'). Trae el orden exacto: ver redes, generar propuestas por nombre o en grupo, publicar con comprobante y confirmar el estado.",
    arguments: [
      { name: "redes", description: "Redes que dijo el usuario, en sus palabras (opcional; vacío = todas las conectadas).", required: false },
    ],
    build: (args) =>
      `${args.redes ? `El usuario quiere publicar en: "${args.redes}".\n\n` : ""}${MCP_SOCIAL_RULES}\n\n${MCP_SCOPE_RULES}`,
  },

  {
    name: "automatizar_redes",
    social: true,
    title: "Programar publicaciones automáticas en redes",
    description:
      "Úsalo cuando el usuario pida publicar en redes de forma recurrente o automática ('publica en Facebook a las 9 y en LinkedIn a las 12', 'todos los días en todas mis redes') o quiera cambiar, pausar o detener esa programación.",
    arguments: [
      { name: "programacion", description: "Redes y horarios que dijo el usuario, en sus palabras (opcional; por defecto todas las conectadas a las 10:00).", required: false },
    ],
    build: (args) =>
      `${args.programacion ? `El usuario pidió esta programación, en sus palabras: "${args.programacion}". Aplícala exactamente.\n\n` : ""}${MCP_SOCIAL_AUTOMATION_RULES}\n\n${MCP_SCOPE_RULES}`,
  },

  {
    name: "diagnosticar_cuenta",
    title: "Diagnosticar el estado de la cuenta",
    description:
      "Úsalo cuando el usuario pregunte algo general sobre su cuenta ('¿cómo voy?', '¿qué me falta?', '¿está todo bien configurado?') o cuando cualquier otra acción falle y necesites entender por qué antes de explicarle al usuario.",
    build: () =>
      `Junta un panorama completo de la cuenta antes de responder. Llama, en cualquier orden, y combina los resultados en una sola respuesta clara (no le muestres al usuario cuatro respuestas sueltas):

1. ver_resumen_cuenta — cuánto publicó, cupo restante, racha.
2. ver_estado_configuracion — qué le falta para poder publicar.
3. ver_integraciones — qué tiene conectado y qué no.
4. ver_limites_y_creditos — cupos y créditos de imagen.

Resume todo en lenguaje claro, priorizando lo que requiere acción del usuario sobre lo que ya está bien. Si algo obligatorio falta, dile el paso exacto para resolverlo (o remite a ver_manual_seo_total si no estás seguro del paso exacto en la web).

${MCP_SCOPE_RULES}`,
  },
];

export function findPrompt(name: string, socialEnabled = true) {
  return PROMPTS.find((p) => p.name === name && (socialEnabled || !p.social));
}

export function listPromptsPayload(socialEnabled = true) {
  return PROMPTS.filter((p) => socialEnabled || !p.social).map(({ name, title, description, arguments: args }) => ({
    name,
    title,
    description,
    arguments: args,
  }));
}

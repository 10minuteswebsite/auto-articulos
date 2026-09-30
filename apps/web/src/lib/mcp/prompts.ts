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

export type PromptArgument = { name: string; description: string; required?: boolean };

export type PromptDef = {
  name: string;
  title: string;
  description: string;
  arguments?: PromptArgument[];
  /** Texto único que se devuelve como mensaje de guía en `prompts/get`. */
  build: (args: Record<string, string>) => string;
};

export const PROMPTS: PromptDef[] = [
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
5. Antes de publicar, llama la herramienta de publicación correspondiente (publicar_categoria, publicar_oportunidades_seleccionadas o publicar_titulos_en_categoria) SIEMPRE con confirmar=false primero. Muéstrale al usuario exactamente qué se va a publicar y espera su confirmación explícita.
6. Solo con un "sí" inequívoco, vuelve a llamar la misma herramienta con confirmar=true.
7. Después de publicar, llama estado_de_publicaciones para confirmarle que se completó y darle el enlace real del artículo (puede tardar un momento en aparecer si todavía se está generando).`,
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

Resume todo en lenguaje claro, priorizando lo que requiere acción del usuario sobre lo que ya está bien. Si algo obligatorio falta, dile el paso exacto para resolverlo (o remite a ver_manual_seo_total si no estás seguro del paso exacto en la web).`,
  },
];

export function findPrompt(name: string) {
  return PROMPTS.find((p) => p.name === name);
}

export function listPromptsPayload() {
  return PROMPTS.map(({ name, title, description, arguments: args }) => ({
    name,
    title,
    description,
    arguments: args,
  }));
}

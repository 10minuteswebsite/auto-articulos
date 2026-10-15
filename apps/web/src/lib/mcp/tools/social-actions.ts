import { NextRequest } from "next/server";
import { startOfSocialDay } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { GET as socialHistoryRoute, DELETE as borrarSocialRoute } from "@/app/api/social-opportunities/route";
import { GET as redesConectadasRoute, POST as generarSocialRoute } from "@/app/api/social-opportunities/generate/route";
import { POST as cancelarSocialRoute } from "@/app/api/social-opportunities/cancel/route";
import { POST as publicarSocialRoute } from "@/app/api/social-opportunities/publish/route";
import { jsonRequest, readRoute, toolText, type ToolDef } from "./shared";
import { confirmOrPreview } from "./actions";
import { networkLabel, pickPendingProposal, resolveNetworks, SOCIAL_NETWORKS, type SocialProposalRow } from "../social-networks";

/**
 * Redes y blogs por asistente de IA: ver qué redes hay, generar propuestas por
 * nombre o en grupo, publicarlas (una o varias) y limpiar. Todo reusa las
 * rutas que ya usa la pantalla de Redes — mismas validaciones de permisos y de
 * cupo diario, mismo worker. Nada de esto publica sin comprobante.
 *
 * Reglas de Milton que se respetan: el cupo diario por red limita
 * PUBLICACIONES, no propuestas; se publica una propuesta por red en cada
 * pedido; los textos con anécdotas que inventa la IA están aprobados.
 */

const REDES_PROP = {
  type: "array",
  items: { type: "string" },
  description:
    "Redes por nombre: threads, linkedin, facebook, instagram, pinterest, tumblr, bluesky, blogger, google business. Escribe \"todas\" (o no envíes nada) para todas las conectadas.",
};

async function loadProposals(): Promise<{ ok: true; items: SocialProposalRow[] } | { ok: false; error: string }> {
  const { ok, data } = await readRoute(await socialHistoryRoute());
  if (!ok) return { ok: false, error: String(data.error ?? "No se pudieron consultar las propuestas sociales.") };
  return { ok: true, items: (data.opportunities ?? []) as SocialProposalRow[] };
}

function snippet(text: string | undefined, max = 140) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export const SOCIAL_ACTION_TOOLS: ToolDef[] = [
  {
    name: "ver_redes_sociales",
    title: "Ver redes y blogs",
    description:
      "Propósito: ver qué redes y blogs tiene conectados la cuenta, cuántas propuestas pendientes hay en cada una, cuántas se publicaron hoy y el cupo diario de publicaciones.\n" +
      "Cuándo usarla: ANTES de generar o publicar en redes, o cuando el usuario pregunta qué redes tiene o cuánto puede publicar hoy.\n" +
      "Cuándo NO usarla: para conectar una red (se hace en la web, Configuración → Conexiones; tú no puedes conectarla).\n" +
      "Contexto necesario: ninguno.\n" +
      "Siguiente paso típico: generar_propuestas_sociales para las redes conectadas que no tengan propuesta pendiente.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const { ok, data } = await readRoute(await redesConectadasRoute());
      if (!ok) return toolText(String(data.error ?? "No se pudieron consultar tus redes."), true);
      const proposals = await loadProposals();
      const items = proposals.ok ? proposals.items : [];
      const dayStart = startOfSocialDay().getTime();
      const limits = (data.dailyLimits ?? {}) as Record<string, unknown>;
      const lines = SOCIAL_NETWORKS.map((network) => {
        const connected = Boolean(data[network.connectedKey]);
        if (!connected) return `- ${network.label}: sin conectar`;
        const pending = items.filter((item) => item.status === "pending" && item.platform === network.platform).length;
        const today = items.filter((item) => item.status === "published" && item.platform === network.platform && item.publishedAt && new Date(item.publishedAt).getTime() >= dayStart).length;
        const limit = typeof limits[network.connectedKey] === "number" ? String(limits[network.connectedKey]) : "1";
        return `- ${network.label}: conectada · propuestas pendientes: ${pending} · publicadas hoy: ${today} de ${limit}`;
      });
      return toolText(`${lines.join("\n")}\n\nEl cupo limita publicaciones por día, no la cantidad de propuestas. Las redes «sin conectar» se conectan en la web (Configuración → Conexiones); no las diagnostiques ni pidas credenciales.`);
    },
  },

  {
    name: "generar_propuestas_sociales",
    title: "Generar propuestas para redes y blogs",
    description:
      "Propósito: crear propuestas de publicación (texto e imagen según la red) a partir de los artículos ya publicados, para las redes que indiques por nombre o para todas las conectadas. NO publica nada: solo deja propuestas pendientes.\n" +
      "Cuándo usarla: el usuario quiere publicar en redes y no hay una propuesta pendiente en esa red (revisa con ver_redes_sociales o listar_propuestas_sociales), o pide 'genera propuestas para Facebook y LinkedIn' / 'para todas'.\n" +
      "Cuándo NO usarla: si ya hay una propuesta pendiente en esa red (publícala en vez de crear otra), ni para redes sin conectar.\n" +
      "Contexto necesario: haber publicado al menos un artículo; las redes deben estar conectadas.\n" +
      "Siguiente paso típico: listar_propuestas_sociales para ver los textos y luego publicar_propuestas_sociales.",
    inputSchema: { type: "object", properties: { redes: REDES_PROP }, additionalProperties: false },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    handler: async (args) => {
      const { networks, unknown, all } = resolveNetworks(args.redes);
      if (unknown.length > 0) {
        return toolText(`No reconozco estas redes: ${unknown.join(", ")}. Las disponibles son: ${SOCIAL_NETWORKS.map((n) => n.label).join(", ")}.`, true);
      }
      const connectedRes = await readRoute(await redesConectadasRoute());
      if (!connectedRes.ok) return toolText(String(connectedRes.data.error ?? "No se pudieron consultar tus redes."), true);
      const connectedNetworks = networks.filter((network) => Boolean(connectedRes.data[network.connectedKey]));
      const missing = networks.filter((network) => !connectedNetworks.includes(network));
      if (connectedNetworks.length === 0) {
        return toolText(`Ninguna de las redes pedidas está conectada${all ? "" : ` (${missing.map((n) => n.label).join(", ")})`}. Se conectan en la web, en Configuración → Conexiones; tú no puedes conectarlas desde el chat.`, true);
      }
      const response = await generarSocialRoute(jsonRequest("/api/social-opportunities/generate", { networks: connectedNetworks.map((network) => network.generateId) }));
      const result = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) return toolText(String(result.error ?? "No se pudieron generar las propuestas."), true);
      const omitted = !all && missing.length > 0 ? `\nNo se generó para (sin conectar): ${missing.map((n) => n.label).join(", ")}.` : "";
      return toolText(`${result.message ?? "Propuestas generadas."} Redes: ${connectedNetworks.map((n) => n.label).join(", ")}.${omitted}\nSiguiente paso: listar_propuestas_sociales para ver los textos y publicar_propuestas_sociales para publicarlas.`);
    },
  },

  {
    name: "publicar_propuestas_sociales",
    title: "Publicar propuestas en una o varias redes",
    description:
      "Propósito: publicar propuestas sociales en grupo. Indica las redes por nombre (publica la propuesta pendiente más reciente de cada una) o una lista de IDs concretos. Respeta el cupo diario de cada red.\n" +
      "Cuándo usarla: el usuario pide publicar en varias redes a la vez ('publica en Facebook, LinkedIn e Instagram', 'publica en todas'). Para UNA sola propuesta puedes usar también publicar_propuesta_social.\n" +
      "Cuándo NO usarla: si no hay propuestas pendientes (genera antes con generar_propuestas_sociales).\n" +
      "Contexto necesario: propuestas pendientes (ver_redes_sociales muestra cuántas hay por red). Máximo 10 por llamada.\n" +
      "Siguiente paso típico: llamar primero con confirmar=false (vista previa con el texto de cada una), y con confirmar=true y el comprobante en el mismo turno si ya tienes autorización permanente de publicar. Después, listar_propuestas_sociales para confirmar el estado.",
    inputSchema: {
      type: "object",
      properties: {
        redes: REDES_PROP,
        ids: { type: "array", items: { type: "string" }, maxItems: 10, description: "IDs de propuestas devueltos por listar_propuestas_sociales (alternativa a redes)." },
        confirmar: { type: "boolean", description: "false para previsualizar; true solo con el comprobante de la vista previa." },
        confirmacion: { type: "string", description: "Comprobante de la vista previa. Obligatorio al confirmar=true." },
      },
      additionalProperties: false,
    },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    handler: async (args) => {
      const userId = await getCurrentUserId();
      const proposals = await loadProposals();
      if (!proposals.ok) return toolText(proposals.error, true);
      let targets: SocialProposalRow[] = [];
      const skipped: string[] = [];
      if (Array.isArray(args.ids) && args.ids.length > 0) {
        for (const id of args.ids.slice(0, 10)) {
          const found = proposals.items.find((item) => item.id === id);
          if (found) targets.push(found);
          else skipped.push(`No encontré la propuesta ${String(id)} en tu cuenta.`);
        }
      } else {
        const { networks, unknown } = resolveNetworks(args.redes);
        if (unknown.length > 0) return toolText(`No reconozco estas redes: ${unknown.join(", ")}.`, true);
        for (const network of networks) {
          const pending = pickPendingProposal(proposals.items, network);
          if (pending) targets.push(pending);
          else skipped.push(`${network.label}: no hay propuesta pendiente.`);
        }
      }
      targets = targets.slice(0, 10);
      if (targets.length === 0) {
        return toolText(`No hay nada que publicar. ${skipped.join(" ")} Genera propuestas antes con generar_propuestas_sociales.`, true);
      }
      const ids = targets.map((item) => String(item.id)).sort();
      const operation = { ids };
      const lines = targets.map((item) => `- ${networkLabel(String(item.platform))} · “${item.articleTitle ?? "sin título"}”\n  ${snippet(item.suggestedText)}`);
      const confirmation = await confirmOrPreview({
        userId,
        toolName: "publicar_propuestas_sociales",
        operation,
        confirmar: args.confirmar,
        confirmacion: args.confirmacion,
        preview: `Sin publicar todavía. Se publicaría esto (${targets.length}):\n${lines.join("\n")}${skipped.length ? `\nOmitidas: ${skipped.join(" ")}` : ""}`,
      });
      if (!confirmation.confirmed) return toolText(confirmation.text, args.confirmar === true);
      const results: string[] = [];
      let failed = 0;
      for (const item of targets) {
        const label = networkLabel(String(item.platform));
        const response = await publicarSocialRoute(jsonRequest("/api/social-opportunities/publish", { id: item.id }));
        const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
        if (response.ok) results.push(`✔ ${label}: ${data.message ?? "publicación enviada"}`);
        else {
          failed += 1;
          results.push(`✘ ${label}: ${data.error ?? "no se pudo publicar"}`);
        }
      }
      return toolText(`${results.join("\n")}${skipped.length ? `\nOmitidas: ${skipped.join(" ")}` : ""}\nPuede tardar un momento en salir; revisa con listar_propuestas_sociales.`, failed === targets.length);
    },
  },

  {
    name: "cancelar_propuesta_social",
    title: "Cancelar una propuesta social",
    description:
      "Propósito: cancelar una propuesta pendiente, en cola o en proceso para que no se publique.\n" +
      "Cuándo usarla: el usuario pide cancelar o detener una publicación social concreta.\n" +
      "Cuándo NO usarla: para borrar varias pendientes (usa eliminar_propuestas_sociales) ni para propuestas ya publicadas.\n" +
      "Contexto necesario: ID devuelto por listar_propuestas_sociales.\n" +
      "Siguiente paso típico: siempre confirmar=false primero y pedir confirmación explícita.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, confirmar: { type: "boolean" }, confirmacion: { type: "string" } }, required: ["id"], additionalProperties: false },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    handler: async (args) => {
      const userId = await getCurrentUserId();
      const id = typeof args.id === "string" ? args.id : "";
      const proposals = await loadProposals();
      if (!proposals.ok) return toolText(proposals.error, true);
      const item = proposals.items.find((candidate) => candidate.id === id);
      if (!item) return toolText("No encontré esa propuesta dentro de tu cuenta.", true);
      const confirmation = await confirmOrPreview({ userId, toolName: "cancelar_propuesta_social", operation: { id }, confirmar: args.confirmar, confirmacion: args.confirmacion, preview: `Sin cancelar todavía: ${networkLabel(String(item.platform))} · “${item.articleTitle ?? "sin título"}” (estado: ${item.status}).` });
      if (!confirmation.confirmed) return toolText(confirmation.text, args.confirmar === true);
      const response = await cancelarSocialRoute(jsonRequest("/api/social-opportunities/cancel", { id }) as unknown as NextRequest);
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return response.ok ? toolText("La propuesta fue cancelada.") : toolText(String(data.error ?? "No se pudo cancelar la propuesta."), true);
    },
  },

  {
    name: "eliminar_propuestas_sociales",
    title: "Eliminar propuestas sociales pendientes",
    description:
      "Propósito: borrar las propuestas PENDIENTES de las redes que indiques (o de todas). No toca el historial: lo ya publicado o con error se conserva.\n" +
      "Cuándo usarla: el usuario quiere limpiar propuestas que no va a usar ('borra las propuestas de Pinterest', 'borra todas las pendientes').\n" +
      "Cuándo NO usarla: para detener una publicación en curso (usa cancelar_propuesta_social).\n" +
      "Contexto necesario: opcionalmente las redes por nombre; sin redes se borran las pendientes de todas.\n" +
      "Siguiente paso típico: siempre confirmar=false primero y pedir confirmación explícita.",
    inputSchema: { type: "object", properties: { redes: REDES_PROP, confirmar: { type: "boolean" }, confirmacion: { type: "string" } }, additionalProperties: false },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    handler: async (args) => {
      const userId = await getCurrentUserId();
      const { networks, unknown, all } = resolveNetworks(args.redes);
      if (unknown.length > 0) return toolText(`No reconozco estas redes: ${unknown.join(", ")}.`, true);
      const proposals = await loadProposals();
      if (!proposals.ok) return toolText(proposals.error, true);
      const platforms = new Set(networks.flatMap((network) => network.platforms));
      const pending = proposals.items.filter((item) => item.status === "pending" && platforms.has(String(item.platform)));
      if (pending.length === 0) return toolText("No hay propuestas pendientes que borrar en esas redes.");
      const operation = { redes: networks.map((network) => network.key).sort(), count: pending.length };
      const confirmation = await confirmOrPreview({ userId, toolName: "eliminar_propuestas_sociales", operation, confirmar: args.confirmar, confirmacion: args.confirmacion, preview: `Sin borrar todavía: ${pending.length} propuesta(s) pendiente(s) de ${all ? "todas las redes" : networks.map((n) => n.label).join(", ")}. El historial no se toca.` });
      if (!confirmation.confirmed) return toolText(confirmation.text, args.confirmar === true);
      const query = all ? "scope=pending" : `scope=pending&platforms=${encodeURIComponent([...platforms].join(","))}`;
      const response = await borrarSocialRoute(new NextRequest(`https://interno.local/api/social-opportunities?${query}`, { method: "DELETE" }));
      return response.ok ? toolText(`Se borraron las propuestas pendientes de ${all ? "todas las redes" : networks.map((n) => n.label).join(", ")}.`) : toolText("No se pudieron borrar las propuestas.", true);
    },
  },
];

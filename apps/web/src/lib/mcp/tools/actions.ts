import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { POST as cancelarRunRoute } from "@/app/api/runs/[id]/cancel/route";
import { POST as reintentarRunRoute } from "@/app/api/runs/[id]/retry/route";
import { DELETE as borrarOpportunityTitleRoute } from "@/app/api/opportunities/titles/[id]/route";
import { DELETE as borrarOpportunityGroupRoute } from "@/app/api/opportunities/groups/[id]/route";
import { POST as publicarSocialRoute } from "@/app/api/social-opportunities/publish/route";
import { GET as socialHistoryRoute } from "@/app/api/social-opportunities/route";
import { consumeConfirmation, issueConfirmation } from "../confirmation";
import { jsonRequest, readRoute, toolText, type ToolDef } from "./shared";

async function confirmOrPreview(input: { userId: string; toolName: string; operation: unknown; confirmar: unknown; confirmacion: unknown; preview: string }) {
  if (input.confirmar !== true) {
    const token = await issueConfirmation({ userId: input.userId, toolName: input.toolName, operation: input.operation });
    return { confirmed: false, text: `${input.preview}\n\nPide confirmación explícita y vuelve a llamar con confirmar=true y confirmacion="${token}".` };
  }
  const confirmed = await consumeConfirmation({ userId: input.userId, toolName: input.toolName, operation: input.operation, token: input.confirmacion });
  return confirmed ? { confirmed: true, text: "" } : { confirmed: false, text: "La confirmación expiró, ya fue usada o no corresponde a esta vista previa. Genera una vista previa nueva." };
}

export const ACTION_TOOLS: ToolDef[] = [
  {
    name: "descartar_oportunidad",
    title: "Descartar una oportunidad",
    description: "Elimina un título de oportunidad. Siempre muestra primero la vista previa y requiere comprobante de confirmación.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, confirmar: { type: "boolean" }, confirmacion: { type: "string" } }, required: ["id"], additionalProperties: false },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    handler: async (args) => {
      const userId = await getCurrentUserId(); const id = typeof args.id === "string" ? args.id : "";
      const title = await prisma.opportunityTitle.findFirst({ where: { id, group: { userId } }, include: { group: { include: { category: true } } } });
      if (!title) return toolText("No encontré esa oportunidad dentro de tu cuenta.", true);
      const operation = { id };
      const confirmation = await confirmOrPreview({ userId, toolName: "descartar_oportunidad", operation, confirmar: args.confirmar, confirmacion: args.confirmacion, preview: `Sin descartar todavía: “${title.text}” de la categoría “${title.group.category.name}”.` });
      if (!confirmation.confirmed) return toolText(confirmation.text, args.confirmar === true);
      const response = await borrarOpportunityTitleRoute(jsonRequest(`/api/opportunities/titles/${id}`, {}), { params: Promise.resolve({ id }) });
      return response.ok ? toolText("La oportunidad fue descartada.") : toolText("No se pudo descartar la oportunidad.", true);
    },
  },
  {
    name: "descartar_categoria_oportunidades",
    title: "Descartar una categoría de oportunidades",
    description: "Elimina todas las oportunidades de una categoría. Acción irreversible, siempre requiere vista previa y comprobante.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, confirmar: { type: "boolean" }, confirmacion: { type: "string" } }, required: ["id"], additionalProperties: false },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    handler: async (args) => {
      const userId = await getCurrentUserId(); const id = typeof args.id === "string" ? args.id : "";
      const group = await prisma.opportunityGroup.findFirst({ where: { id, userId }, include: { category: true, titles: { select: { id: true } } } });
      if (!group) return toolText("No encontré esa categoría de oportunidades dentro de tu cuenta.", true);
      const operation = { id };
      const confirmation = await confirmOrPreview({ userId, toolName: "descartar_categoria_oportunidades", operation, confirmar: args.confirmar, confirmacion: args.confirmacion, preview: `Sin descartar todavía: la categoría “${group.category.name}” con ${group.titles.length} oportunidad(es).` });
      if (!confirmation.confirmed) return toolText(confirmation.text, args.confirmar === true);
      const response = await borrarOpportunityGroupRoute(jsonRequest(`/api/opportunities/groups/${id}`, {}), { params: Promise.resolve({ id }) });
      return response.ok ? toolText("La categoría de oportunidades fue descartada.") : toolText("No se pudo descartar la categoría.", true);
    },
  },
  {
    name: "cancelar_publicacion",
    title: "Cancelar publicación en curso",
    description: "Cancela los títulos pendientes de una ejecución. Los títulos que ya están procesándose no se interrumpen a mitad de camino. Requiere confirmación.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, confirmar: { type: "boolean" }, confirmacion: { type: "string" } }, required: ["id"], additionalProperties: false },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    handler: async (args) => {
      const userId = await getCurrentUserId(); const id = typeof args.id === "string" ? args.id : "";
      const run = await prisma.run.findFirst({ where: { id, userId }, include: { category: true, titles: { select: { status: true } } } });
      if (!run) return toolText("No encontré esa publicación dentro de tu cuenta.", true);
      const operation = { id };
      const pending = run.titles.filter((title) => title.status === "pending").length;
      const confirmation = await confirmOrPreview({ userId, toolName: "cancelar_publicacion", operation, confirmar: args.confirmar, confirmacion: args.confirmacion, preview: `Sin cancelar todavía: “${run.category.name}”, estado ${run.status}, ${pending} título(s) pendientes.` });
      if (!confirmation.confirmed) return toolText(confirmation.text, args.confirmar === true);
      const response = await cancelarRunRoute(jsonRequest(`/api/runs/${id}/cancel`, {}), { params: Promise.resolve({ id }) });
      return response.ok ? toolText("La publicación fue cancelada. Los artículos que ya estaban procesándose pueden terminar.") : toolText("No se pudo cancelar la publicación.", true);
    },
  },
  {
    name: "reintentar_publicacion",
    title: "Reintentar publicación",
    description: "Reabre los títulos con error o cancelados de una ejecución. Requiere vista previa y confirmación.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, confirmar: { type: "boolean" }, confirmacion: { type: "string" } }, required: ["id"], additionalProperties: false },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: async (args) => {
      const userId = await getCurrentUserId(); const id = typeof args.id === "string" ? args.id : "";
      const run = await prisma.run.findFirst({ where: { id, userId }, include: { category: true, titles: { select: { status: true } } } });
      if (!run) return toolText("No encontré esa publicación dentro de tu cuenta.", true);
      const retryable = run.titles.filter((title) => title.status === "error" || title.status === "cancelled").length;
      const operation = { id };
      const confirmation = await confirmOrPreview({ userId, toolName: "reintentar_publicacion", operation, confirmar: args.confirmar, confirmacion: args.confirmacion, preview: `Sin reintentar todavía: “${run.category.name}”, ${retryable} título(s) con error o cancelados.` });
      if (!confirmation.confirmed) return toolText(confirmation.text, args.confirmar === true);
      const response = await reintentarRunRoute(jsonRequest(`/api/runs/${id}/retry`, {}), { params: Promise.resolve({ id }) });
      const data = await response.json().catch(() => ({}));
      return response.ok ? toolText(`Reintento iniciado para ${data.retried ?? retryable} título(s).`) : toolText(String(data.error ?? "No se pudo reintentar."), true);
    },
  },
  {
    name: "publicar_propuesta_social",
    title: "Publicar propuesta en red social o blog",
    description: "Publica una propuesta social existente. Siempre muestra el destino y texto antes, y exige comprobante de confirmación.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, confirmar: { type: "boolean" }, confirmacion: { type: "string" } }, required: ["id"], additionalProperties: false },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    handler: async (args) => {
      const userId = await getCurrentUserId(); const id = typeof args.id === "string" ? args.id : "";
      const { ok, data } = await readRoute(await socialHistoryRoute());
      if (!ok) return toolText(String(data.error ?? "No se pudieron consultar las propuestas sociales."), true);
      const item = ((data.opportunities ?? []) as Array<{ id?: string; platform?: string; articleTitle?: string; suggestedText?: string; status?: string }>).find((candidate) => candidate.id === id);
      if (!item) return toolText("No encontré esa propuesta dentro de tu cuenta.", true);
      const operation = { id };
      const confirmation = await confirmOrPreview({ userId, toolName: "publicar_propuesta_social", operation, confirmar: args.confirmar, confirmacion: args.confirmacion, preview: `Sin publicar todavía en ${item.platform}: “${item.articleTitle ?? "sin título"}”.\n${item.suggestedText ?? ""}` });
      if (!confirmation.confirmed) return toolText(confirmation.text, args.confirmar === true);
      const response = await publicarSocialRoute(jsonRequest("/api/social-opportunities/publish", { id }));
      const result = await response.json().catch(() => ({}));
      return response.ok ? toolText(String(result.message ?? "Publicación social encolada.")) : toolText(String(result.error ?? "No se pudo publicar en la red social."), true);
    },
  },
];

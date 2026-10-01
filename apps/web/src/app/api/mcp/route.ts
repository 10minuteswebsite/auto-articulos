import { NextRequest, NextResponse } from "next/server";
import {
  MCP_PROTOCOL_VERSION,
  RPC_INVALID_PARAMS,
  RPC_INVALID_REQUEST,
  RPC_METHOD_NOT_FOUND,
  RPC_PARSE_ERROR,
  rpcError,
  rpcResult,
  type JsonRpcRequest,
} from "@/lib/mcp/protocol";
import { findTool, listToolsPayload } from "@/lib/mcp/tools";
import { findPrompt, listPromptsPayload } from "@/lib/mcp/prompts";

/**
 * Servidor MCP de SEO TOTAL — transporte "streamable HTTP".
 *
 * Es el endpoint al que se conecta un cliente MCP: Alexa+ (OAuth 2.1, exige
 * la versión 2025-11-25 de la spec y este transporte, no stdio), y también
 * cualquier otro asistente — Claude, ChatGPT, Meta MUSE, Gemini — con el
 * token personal que cada usuario genera en Configuración → Asistentes IA
 * (ver `apps/web/src/lib/mcp/api-token.ts`).
 *
 * La autenticación NO se hace acá: la resuelve el middleware, que valida el
 * Bearer (OAuth, sesión firmada, o token personal) y deja `x-user-id` en el
 * request. Si no hay token válido, el middleware corta con 401 antes de
 * llegar a esta ruta — que es justo lo que Alexa necesita para disparar el
 * account linking por su cuenta.
 */

// Prisma no corre en Edge; estas tools van contra la base.
export const runtime = "nodejs";
// Cada llamada consulta datos vivos del usuario: nunca cachear.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, RPC_PARSE_ERROR, "JSON inválido."), { status: 400 });
  }

  // La spec permite lotes. Se responde solo a los mensajes que traen `id`;
  // las notificaciones (sin `id`) no llevan respuesta.
  const mensajes = Array.isArray(body) ? body : [body];
  const scopes = request.headers.get("x-mcp-scopes")?.split(" ").filter(Boolean) ?? [];
  const respuestas = [];
  for (const mensaje of mensajes) {
    const respuesta = await manejar(mensaje, scopes);
    if (respuesta) respuestas.push(respuesta);
  }

  if (respuestas.length === 0) {
    // Solo había notificaciones (p. ej. notifications/initialized).
    return new NextResponse(null, { status: 202 });
  }
  return NextResponse.json(Array.isArray(body) ? respuestas : respuestas[0]);
}

async function manejar(mensaje: JsonRpcRequest, scopes: string[]) {
  const id = mensaje?.id ?? null;
  const esNotificacion = mensaje?.id === undefined;

  if (mensaje?.jsonrpc !== "2.0" || typeof mensaje.method !== "string") {
    return esNotificacion ? null : rpcError(id, RPC_INVALID_REQUEST, "Mensaje JSON-RPC inválido.");
  }

  switch (mensaje.method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
        serverInfo: { name: "auto-articulos", version: "0.1.0" },
        instructions:
          "Eres el asistente de SEO TOTAL, una plataforma diseñada para que la persona usuaria NUNCA tenga que adivinar qué escribir — todo se navega por opciones numeradas, igual que su panel web. Debes comportarte igual: proactivo, nunca reactivo.\n\n" +
          "Este servidor publica flujos de trabajo con nombre vía prompts/list (ej. 'empezar', 'publicar_contenido', 'diagnosticar_cuenta'). Antes de improvisar una secuencia de herramientas por tu cuenta, revisa si ya existe un prompt para lo que la persona quiere lograr y síguelo — resuelve automáticamente ambigüedades como cuál herramienta usar para generar contenido.\n\n" +
          "Al conectarte (primer mensaje de la conversación) o cuando la persona no sepa qué hacer, usa el prompt 'empezar': saluda brevemente y ofrece el mismo menú numerado que vería en su Inicio:\n" +
          "1) Contenido propio — escribir y publicar tus propios títulos.\n" +
          "2) Contenido generado por IA — que la IA proponga y publique artículos por ti.\n" +
          "3) Publicar en redes sociales y blogs públicos.\n" +
          "Deja que la persona elija un número o lo diga con sus palabras; en cada paso siguiente, sigue ofreciendo opciones numeradas concretas en vez de preguntas abiertas.\n\n" +
          "Si en cualquier momento no sabes cómo guiar a la persona, no tienes claro qué botón o pantalla corresponde, o necesitas explicar cómo funciona algo, llama a ver_manual_seo_total (sin argumentos para el índice, o con 'tema' para una sección) — es el manual real y siempre actualizado de la plataforma, no lo inventes de memoria.\n\n" +
          "NUNCA le hables a la persona en términos técnicos. La mayoría de las personas que usan SEO TOTAL no saben qué es un token, una API, un conector, una herramienta MCP, un JSON, un scope ni 'mi lado' de una conexión — y no deberían necesitar saberlo. Nunca menciones el nombre técnico de una herramienta (ej. 'listar_categorias', 'crear_oportunidades') ni digas frases como 'no tengo la conexión configurada de mi lado', 'necesito completar el flujo de credenciales' o 'mi conector no está activo'. Traduce siempre a lenguaje cotidiano: en vez de 'ejecutando listar_categorias', decí 'estas son tus categorías'; en vez de explicar por qué una herramienta falló técnicamente, explicá qué le falta a SU CUENTA y qué botón de la web tiene que tocar. Si en algún momento no puedes actuar porque tu propia conexión (la del asistente al servidor) todavía no está lista, no se lo eches en cara a la persona ni le pidas que 'te conecte' con lenguaje técnico — resuélvelo en silencio o decí simplemente algo como 'dame un momento' sin detallar el mecanismo interno.\n\n" +
          "Publicar tiene consecuencias públicas reales: usa siempre confirmar=false primero, muéstrale a la persona exactamente qué se va a publicar, y espera su confirmación explícita antes de volver a llamar con confirmar=true.",
      });

    // El cliente avisa que terminó el handshake. No espera respuesta.
    case "notifications/initialized":
      return null;

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, { tools: listToolsPayload(scopes) });

    case "prompts/list":
      return rpcResult(id, { prompts: listPromptsPayload() });

    case "prompts/get": {
      const nombrePrompt = mensaje.params?.name;
      if (typeof nombrePrompt !== "string") {
        return rpcError(id, RPC_INVALID_PARAMS, "Falta el nombre del prompt.");
      }
      const prompt = findPrompt(nombrePrompt);
      if (!prompt) {
        return rpcError(id, RPC_METHOD_NOT_FOUND, `No existe el prompt "${nombrePrompt}".`);
      }
      const argsPrompt = (mensaje.params?.arguments ?? {}) as Record<string, string>;
      return rpcResult(id, {
        description: prompt.description,
        messages: [
          {
            role: "user",
            content: { type: "text", text: prompt.build(argsPrompt) },
          },
        ],
      });
    }

    case "tools/call": {
      const nombre = mensaje.params?.name;
      if (typeof nombre !== "string") {
        return rpcError(id, RPC_INVALID_PARAMS, "Falta el nombre de la herramienta.");
      }
      const tool = findTool(nombre, scopes);
      if (!tool) {
        return rpcError(id, RPC_METHOD_NOT_FOUND, `No existe la herramienta "${nombre}".`);
      }
      try {
        const args = (mensaje.params?.arguments ?? {}) as Record<string, unknown>;
        return rpcResult(id, await tool.handler(args));
      } catch (error) {
        // Un fallo de la tool no debe tumbar la conversación: se reporta como
        // error de negocio para que el cliente lo lea en voz alta.
        console.error(`mcp: falló la herramienta ${nombre}`, error);
        return rpcResult(id, {
          content: [
            {
              type: "text",
              text: "Hubo un error interno al ejecutar esa acción. Inténtalo de nuevo en un momento.",
            },
          ],
          isError: true,
        });
      }
    }

    default:
      return esNotificacion
        ? null
        : rpcError(id, RPC_METHOD_NOT_FOUND, `Método no soportado: ${mensaje.method}`);
  }
}

/**
 * El transporte streamable HTTP contempla un GET para abrir un canal SSE de
 * mensajes iniciados por el servidor. Este servidor no envía nada por su
 * cuenta (no hay notificaciones ni sampling), así que se rechaza
 * explícitamente, que es la respuesta prevista por la spec para ese caso.
 */
export async function GET() {
  return new NextResponse("Este servidor MCP no ofrece stream SSE.", { status: 405 });
}

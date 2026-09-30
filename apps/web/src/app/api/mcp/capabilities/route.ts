import { NextResponse } from "next/server";
import { TOOLS } from "@/lib/mcp/tools";

/**
 * Resumen público (sin autenticar) de las herramientas MCP disponibles hoy.
 *
 * Existe para que la pantalla Configuración → Asistentes IA (y cualquier
 * otro texto, como el manual del asistente de ayuda) lea la lista real de
 * `TOOLS` en vez de mantener una copia escrita a mano que se desactualiza
 * cada vez que se agrega una herramienta nueva — pedido de Milton
 * (29-30/9/2026) de que el sistema sea dinámico. No expone datos de ninguna
 * cuenta: solo nombre/título/descripción de cada tool, igual que ve
 * cualquiera que lea el código.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    tools: TOOLS.map(({ name, title, description, annotations }) => ({
      name,
      title,
      description,
      soloLectura: annotations.readOnlyHint,
    })),
  });
}

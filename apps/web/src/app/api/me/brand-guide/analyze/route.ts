import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

const OPENAI_URL = "https://api.openai.com/v1/responses";

const FIELDS = [
  "identidad_y_esencia", "mision", "vision", "valores", "personalidad", "publico_objetivo",
  "propuesta_de_valor", "tono_y_estilo", "nivel_de_formalidad", "palabras_recomendadas",
  "palabras_prohibidas", "temas_relacionados", "temas_a_evitar", "reglas_titulos_subtitulos",
  "estructura_de_articulos", "llamadas_a_la_accion", "reglas_seo", "identidad_visual",
  "estilo_de_imagenes", "reglas_de_logotipo", "restricciones_legales", "ejemplos_aprobados",
] as const;

const schema = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(FIELDS.map((field) => [field, {
    type: "object",
    additionalProperties: false,
    properties: {
      valor: { type: "string" },
      paginas_o_seccion: { type: "string" },
      confianza: { type: "string", enum: ["alta", "media", "baja"] },
      estado: { type: "string", enum: ["confirmado", "incompleto", "no_especificado"] },
    },
    required: ["valor", "paginas_o_seccion", "confianza", "estado"],
  }])),
  resumen: { type: "string" },
};

export async function POST() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { brandGuidePdfUrl: true } });
  if (!user?.brandGuidePdfUrl) return NextResponse.json({ error: "Primero sube un PDF de manual de marca." }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "El análisis de manuales no está configurado." }, { status: 503 });

  await prisma.user.update({ where: { id: userId }, data: { brandGuideStatus: "analyzing" } });
  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.BRAND_GUIDE_MODEL ?? "gpt-5-mini",
        reasoning: { effort: "minimal" },
        max_output_tokens: 8_000,
        input: [
          { role: "developer", content: "Analiza exclusivamente el manual adjunto. No inventes información. Si un dato no aparece, usa exactamente 'No especificado' y estado 'no_especificado'. Devuelve una guía práctica para contenidos de blog." },
          { role: "user", content: [{ type: "input_text", text: "Extrae y clasifica todas las variables solicitadas." }, { type: "input_file", file_url: user.brandGuidePdfUrl }] },
        ],
        text: { format: { type: "json_schema", name: "brand_guide", strict: true, schema } },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI respondió ${response.status}`);
    const data = await response.json() as { output_text?: string };
    const analysis = JSON.parse(data.output_text ?? "");
    await prisma.user.update({ where: { id: userId }, data: { brandGuideAnalysis: analysis, brandGuideStatus: "completed", brandGuideAnalyzedAt: new Date() } });
    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    await prisma.user.update({ where: { id: userId }, data: { brandGuideStatus: "error" } });
    console.error("[brand-guide] analysis failed", error);
    return NextResponse.json({ error: "No se pudo analizar el manual. Puedes intentarlo nuevamente." }, { status: 502 });
  }
}

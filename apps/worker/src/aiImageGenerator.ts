// Generador de imágenes con IA para redes sociales ("Creador de Imágenes
// para Redes Sociales", 20/8/2026). Es un generador APARTE de los que ya
// existían (socialPublish.ts, businessProfilePublish.ts) — no los toca ni
// los reemplaza, por decisión explícita de Milton.
//
// El prompt del director creativo lo edita Milton desde el panel de admin
// (pestaña "Prompts", ver getCustomSystemPrompt más abajo) y CONTROLA de
// verdad la imagen final. Rediseño 22/8/2026: la salida ya no es JSON con
// un párrafo largo (`visualPrompt`) — es UNA SOLA LÍNEA de texto plano,
// "/etiqueta /etiqueta ... TEXT: mensaje exacto", tomada de un catálogo
// cerrado de etiquetas que define el propio prompt de Milton. Confirmado
// en vivo por Milton comparando contra una prueba manual en ChatGPT
// Images: el mismo mecanismo corto (tags + texto) dio resultados
// notablemente mejores que el prompt largo con instrucciones detalladas
// de posición/tamaño/porcentajes — menos instrucciones simultáneas,
// mejor resultado. Ese string de etiquetas ES la instrucción visual real
// que recibe el generador de imagen, sin que este código la expanda ni
// reescriba (ver buildEditPrompt).
//
// La imagen OG se le pasa DIRECTO a la IA como materia prima principal (no
// hace falta describirla en texto). Una sola generación por oportunidad: si
// algo falla en cualquier paso, devuelve null y quien llama debe cancelar la
// oportunidad — no hay reintento ni regeneración gratuita (decisión
// explícita, por costo).
//
// Usa una API key de OpenAI SEPARADA (OPENAI_IMAGE_API_KEY) de la que ya
// usa el resto de la plataforma — pero solo para decidir el mensaje/
// etiquetas (gpt-4o-mini, siempre). La generación de la imagen en sí usa
// el proveedor de IMAGE_PROVIDER (22/8/2026): "openai" (default) llama a
// gpt-image-1-mini vía images/edits (~$0.005-0.015/imagen); "fal" usa
// Ideogram V3 Remix vía fal.ai (~$0.03/imagen, TURBO) — adoptado porque
// gpt-image-1-mini corrompe letras en español incluso con prompts cortos
// y limpios, confirmado en vivo el 22/8/2026.

import sharp from "sharp";
import { list, put } from "@vercel/blob";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { DIRECTOR_PROMPT_V2 } from "./directorPromptV2";

const OPENAI_IMAGE_API_KEY = process.env.OPENAI_IMAGE_API_KEY;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EDIT_URL = "https://api.openai.com/v1/images/edits";

// Adaptador independiente del proveedor de generación de imágenes. Este
// archivo no depende de ningún pipeline experimental. Confirmado en vivo
// (22/8/2026, cuenta de Lorena) que
// gpt-image-1-mini corrompe letras en español incluso con un prompt
// corto y limpio — la misma falla de texto que llevó a adoptar fal.ai/
// Ideogram, así que se activa acá también.
const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_IDEOGRAM_REMIX_URL = "https://fal.run/fal-ai/ideogram/v3/remix";
const FAL_GPT_IMAGE_2_EDIT_URL = "https://fal.run/openai/gpt-image-2/edit";
// Fracción de piezas en las que aparece la persona (foto subida en Configuración →
// Contenido). 0 = apagado: se activa (p. ej. 0.2, «cada ~5 días» según la guía de
// estilo) solo tras comprobar con el diagnóstico que el rostro sale idéntico.
const PERSON_PHOTO_RATE = 0;
const IMAGE_PROVIDER = (process.env.IMAGE_PROVIDER || "openai").toLowerCase();

/** Referencias extra (logos y, si aplica, foto de la persona): una URL, varias o ninguna. */
function toUrlList(refs?: string | string[] | null): string[] {
  if (!refs) return [];
  return (Array.isArray(refs) ? refs : [refs]).filter((url): url is string => Boolean(url));
}

async function generateImageBufferFal(
  prompt: string,
  ogImageUrl: string,
  width: number,
  height: number,
  logoUrl?: string | string[] | null,
): Promise<Buffer | null> {
  if (!FAL_API_KEY) return null;
  const refUrls = toUrlList(logoUrl);
  const body: Record<string, unknown> = {
    prompt: prompt.slice(0, 4000),
    image_url: ogImageUrl,
    image_size: { width, height },
    rendering_speed: "TURBO",
    // Confirmado en la documentación oficial de fal.ai/Ideogram (22/8/2026),
    // tras una prueba real donde el texto salió minúsculo y deformado:
    // "expand_prompt" (MagicPrompt) reescribe el prompt antes de generar —
    // puede estar distorsionando el texto exacto entre comillas — así que
    // se apaga para tener control literal.
    expand_prompt: false,
  };
  // Pedido explícito de Milton (22/8/2026): en vez de reservarle espacio al
  // logo con una frase de texto aparte y pegarlo después con código, se le
  // manda el logo real como material de referencia (fal.ai lo trata como
  // "style reference", no como objeto exacto a calcar) y el propio modelo
  // decide cómo incorporarlo. Por eso este archivo YA NO compone el logo
  // con compositeLogo() cuando el proveedor es fal — ver generateAiSocialImage.
  //
  // "style: DESIGN" (el preset que Ideogram documenta para tipografía) solo
  // se manda cuando NO hay logo — la API de fal.ai la rechaza con error 422
  // cuando también se envían `image_urls`: "`style` cannot be 'DESIGN' when
  // `image_urls` are provided." Confirmado en vivo el 22/8/2026 (falló la
  // generación completa). Con logo, se deja sin `style` (default de fal.ai).
  if (refUrls.length > 0) {
    body.image_urls = refUrls;
  } else {
    body.style = "DESIGN";
  }
  const res = await fetch(FAL_IDEOGRAM_REMIX_URL, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`fal.ai HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as { images?: { url?: string }[] };
  const resultUrl = data.images?.[0]?.url;
  if (!resultUrl) throw new Error(`fal.ai: respuesta sin imagen: ${JSON.stringify(data).slice(0, 500)}`);
  const imgRes = await fetch(resultUrl, { signal: AbortSignal.timeout(30000) });
  if (!imgRes.ok) return null;
  return Buffer.from(await imgRes.arrayBuffer());
}

// Tercer proveedor (22/8/2026, pedido de Milton tras 3 fallas distintas de
// Ideogram en pruebas reales): Nano Banana (Gemini de Google) vía fal.ai.
// A diferencia de Ideogram (difusión pura, sin capa de lenguaje), Nano
// Banana es un modelo nativo de LLM multimodal — arquitectura más parecida
// a ChatGPT Images (donde el prompt de etiquetas SÍ funcionó bien en la
// prueba manual de Milton) que a un modelo de difusión clásico. Su endpoint
// de edición acepta varias imágenes de referencia a la vez, así que el OG y
// el logo van juntos en `image_urls` — mismo mecanismo de "el modelo decide
// cómo usarlas" que se le pidió a Ideogram, pero es el caso de uso nativo
// de este endpoint, no un uso secundario ("style reference").
const FAL_NANO_BANANA_EDIT_URL = "https://fal.run/fal-ai/nano-banana/edit";

async function generateImageBufferNanoBanana(
  prompt: string,
  ogImageUrl: string,
  width: number,
  height: number,
  logoUrl?: string | string[] | null,
): Promise<Buffer | null> {
  if (!FAL_API_KEY) return null;
  const imageUrls = [ogImageUrl, ...toUrlList(logoUrl)];
  // Nano Banana no acepta ancho/alto exactos como Ideogram, solo un preset
  // de relación de aspecto — se mapea desde las dimensiones reales del
  // formato (FORMAT_TARGET más abajo solo usa 9:16 y 4:5 hoy).
  const ratio = width / height;
  const aspectRatio =
    Math.abs(ratio - 1) < 0.02
      ? "1:1"
      : Math.abs(ratio - 9 / 16) < 0.02
        ? "9:16"
        : Math.abs(ratio - 4 / 5) < 0.02
          ? "4:5"
          : "auto";
  const res = await fetch(FAL_NANO_BANANA_EDIT_URL, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt.slice(0, 4000),
      image_urls: imageUrls,
      aspect_ratio: aspectRatio,
      output_format: "jpeg",
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`fal.ai (nano-banana) HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as { images?: { url?: string }[] };
  const resultUrl = data.images?.[0]?.url;
  if (!resultUrl) throw new Error(`fal.ai (nano-banana): respuesta sin imagen: ${JSON.stringify(data).slice(0, 500)}`);
  const imgRes = await fetch(resultUrl, { signal: AbortSignal.timeout(30000) });
  if (!imgRes.ok) return null;
  return Buffer.from(await imgRes.arrayBuffer());
}

async function generateImageBufferGptImage2(
  prompt: string,
  ogImageUrl: string,
  width: number,
  height: number,
  logoUrl?: string | string[] | null,
): Promise<Buffer | null> {
  if (!FAL_API_KEY) return null;
  const imageUrls = [ogImageUrl, ...toUrlList(logoUrl)];
  // GPT Image 2 requires custom dimensions to be multiples of 16. Keep the
  // requested social ratio while leaving only a minimal final normalization
  // crop for the platform's exact dimensions.
  const apiWidth = Math.ceil(width / 16) * 16;
  const apiHeight = Math.ceil(height / 16) * 16;
  const res = await fetch(FAL_GPT_IMAGE_2_EDIT_URL, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt.slice(0, 4000),
      image_urls: imageUrls,
      image_size: { width: apiWidth, height: apiHeight },
      quality: "medium",
      num_images: 1,
      output_format: "jpeg",
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`fal.ai (gpt-image-2) HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as { images?: { url?: string }[] };
  const resultUrl = data.images?.[0]?.url;
  if (!resultUrl) throw new Error(`fal.ai (gpt-image-2): respuesta sin imagen: ${JSON.stringify(data).slice(0, 500)}`);
  const imgRes = await fetch(resultUrl, { signal: AbortSignal.timeout(30000) });
  if (!imgRes.ok) return null;
  return Buffer.from(await imgRes.arrayBuffer());
}

/**
 * Lista, para el Director Creativo, de los materiales de marca que la persona
 * subió (Configuración → Contenido: hasta 2 logos y 3 fotos) y de cómo se
 * adjuntan al generador, en este orden: foto del artículo, logos, foto de la
 * persona. La decisión de si la persona aparece en la pieza la toma el código
 * (no el modelo) y se le comunica como un hecho.
 */
export function buildAssetBriefing(input: { logoCount: number; personPhotoCount: number; includePerson: boolean }): string {
  const attachments = ["foto del artículo (base de la imagen)"];
  if (input.logoCount > 0) {
    attachments.push(input.logoCount > 1 ? "logo principal" : "logo");
    if (input.logoCount > 1) attachments.push("logo alternativo (otra versión)");
  }
  if (input.includePerson && input.personPhotoCount > 0) attachments.push("foto de la persona (su rostro real)");
  const lines = [
    `Imágenes adjuntas al generador, en este orden: ${attachments.map((item, i) => `${i + 1}) ${item}`).join("; ")}.`,
    `Logos disponibles: ${input.logoCount}.`,
    `Fotos de la persona subidas: ${input.personPhotoCount}. Persona en ESTA pieza: ${input.includePerson && input.personPhotoCount > 0 ? "sí" : "no"}.`,
  ];
  return lines.join("\n");
}

export type AiImageFormat = "story" | "reel-image" | "post" | "facebook-story" | "pinterest";

// Tamaño que se le pide a gpt-image-1-mini (solo soporta 1024x1024,
// 1024x1536, 1536x1024) y tamaño final real al que se recorta después con
// sharp. "post" usa 4:5 (1080x1350), el formato de feed que más espacio
// ocupa en pantalla — recomendado hoy por Instagram. "facebook-story" es
// igual de vertical que la Historia de Instagram (9:16). Cuando este
// módulo cubra más redes, este mapa crece.
const FORMAT_TARGET: Record<AiImageFormat, { editSize: "1024x1536"; width: number; height: number }> = {
  story: { editSize: "1024x1536", width: 1080, height: 1920 },
  "reel-image": { editSize: "1024x1536", width: 1080, height: 1920 },
  post: { editSize: "1024x1536", width: 1080, height: 1350 },
  "facebook-story": { editSize: "1024x1536", width: 1080, height: 1920 },
  // Pin de Pinterest: 2:3 (1000x1500), el formato que Pinterest recomienda.
  pinterest: { editSize: "1024x1536", width: 1000, height: 1500 },
};

const FORMAT_LABEL: Record<AiImageFormat, string> = {
  story: "Instagram Story",
  "reel-image": "Instagram Reel cover",
  post: "Instagram feed post",
  "facebook-story": "Facebook Story",
  pinterest: "Pinterest Pin (vertical 2:3)",
};

// Rediseño 22/8/2026 (pedido explícito de Milton, tras comparar en vivo
// contra una prueba manual en ChatGPT Images): el prompt largo tipo JSON
// con `visualPrompt` de párrafo completo se abandona — un prompt corto de
// etiquetas + texto exacto dio resultados notablemente mejores. La Caja
// de Director Creativo ahora responde UNA SOLA LÍNEA de texto plano:
// "/etiqueta /etiqueta ... TEXT: mensaje exacto" — ni JSON ni párrafo.
interface CreativeDecision {
  /** La línea completa tal cual la devolvió el modelo: "/tag /tag ... TEXT: mensaje". */
  visualLine: string;
  /** Solo la parte de etiquetas, antes de "TEXT:" — usada nada más para logging. */
  tagString: string;
  /** Solo el mensaje exacto, después de "TEXT:". */
  message: string;
}

// Mismo key que apps/web/src/lib/ai-image-prompt.ts — Milton pidió (20/8/2026)
// poder editar el prompt del director creativo desde el panel de admin
// (pestaña "Prompts") sin depender de un redeploy de código. Guardado
// global (no por usuario) en SystemSetting, igual que otras settings
// globales del sistema.
const AI_IMAGE_PROMPT_KEY = "ai_social_image_prompt";

// Respaldo mínimo solo por si el admin borra el prompt personalizado sin
// querer — Milton siempre tiene uno guardado en el panel, este default
// prácticamente nunca se usa en la práctica. Debe mantener el mismo
// contrato de salida (una línea, tags + TEXT) que el prompt real.
const DEFAULT_SYSTEM_PROMPT = DIRECTOR_PROMPT_V2;

async function getCustomSystemPrompt(): Promise<string | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: AI_IMAGE_PROMPT_KEY } });
    if (!setting?.encryptedValue) return null;
    try {
      const decrypted = decryptSecret(setting.encryptedValue);
      return decrypted.trim() || null;
    } catch {
      return setting.encryptedValue.trim() || null;
    }
  } catch {
    return null;
  }
}

export async function fetchImageAsPng(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    return await sharp(raw).png().toBuffer();
  } catch {
    return null;
  }
}

/**
 * Muchos logos se suben con fondo blanco/casi blanco sólido en vez de
 * transparente de verdad. Vuelve transparente cualquier píxel casi blanco
 * (umbral alto: el logo en sí casi nunca usa blanco puro extensivamente).
 */
export async function removeNearWhiteBackground(png: Buffer, threshold = 245): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    if (data[i] >= threshold && data[i + 1] >= threshold && data[i + 2] >= threshold) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

/**
 * Pega el logo REAL sobre la imagen ya generada, con código determinístico
 * — nunca se le pide a la IA que lo dibuje. Probado en vivo el 20/8/2026:
 * pedirle al modelo que incorpore el logo como imagen de referencia lo
 * cortaba/deformaba de forma repetida pese a instrucciones explícitas. Esto
 * garantiza matemáticamente que nunca se corte, deforme ni rediseñe.
 */
export async function compositeLogo(base: Buffer, width: number, height: number, logoPng: Buffer): Promise<Buffer> {
  const logoTransparent = await removeNearWhiteBackground(logoPng);
  const padding = Math.round(width * 0.06);
  const logoMaxWidth = Math.round(width * 0.34);
  const logoResized = await sharp(logoTransparent)
    .resize({ width: logoMaxWidth, height: Math.round(height * 0.1), fit: "inside" })
    .toBuffer();
  const meta = await sharp(logoResized).metadata();
  return sharp(base)
    .composite([
      {
        input: logoResized,
        left: Math.max(padding, width - (meta.width ?? logoMaxWidth) - padding),
        top: Math.max(padding, height - (meta.height ?? 60) - padding),
      },
    ])
    .toBuffer();
}

/**
 * ANALIZAR → DECIDIR, en una sola llamada de visión barata (gpt-4o-mini),
 * con el prompt de Milton (editable en el panel admin) como system
 * message. El propio prompt de Milton dicta el formato de salida exacto
 * (una línea de texto plano: "/etiqueta /etiqueta ... TEXT: mensaje") —
 * el código ya NO le pide JSON ni le agrega instrucciones de formato
 * encima de las suyas. Rediseño 22/8/2026: el prompt anterior (JSON con
 * un campo `visualPrompt` de párrafo largo) daba resultados peores en
 * pruebas reales que un prompt corto de etiquetas — confirmado por Milton
 * comparando en vivo contra ChatGPT Images con el mismo mecanismo.
 */
async function decideCreativeDirection(
  articleTitle: string,
  articleSummary: string,
  ogImagePng: Buffer,
  assetBriefing: string,
  formatLabel: string,
  systemPromptOverride?: string | null,
): Promise<CreativeDecision | null> {
  if (!OPENAI_IMAGE_API_KEY) return null;
  try {
    const ogBase64 = ogImagePng.toString("base64");
    const customPrompt = systemPromptOverride?.trim() || (await getCustomSystemPrompt());
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_IMAGE_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: customPrompt || DEFAULT_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  // formatLabel ya incluye la red social correcta ("Instagram
                  // Story", "Facebook Story", etc.) — antes decía "Instagram"
                  // hardcodeado ADEMÁS del label, contradiciéndolo para
                  // Facebook Story ("Instagram, Facebook Story"). Mismo bug
                  // encontrado y corregido durante la auditoría del generador.
                  `Red social y formato: ${formatLabel}.\n` +
                  `Título del artículo: ${articleTitle}\n` +
                  `Resumen del artículo: ${articleSummary}\n` +
                  `${assetBriefing}\n\n` +
                  `Aquí está la imagen OG del artículo. Analízala y aplica tu metodología completa.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${ogBase64}` },
              },
            ],
          },
        ],
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    // Formato del prompt del admin (22/8/2026): "/tag /tag ... with
    // high-contrast [estilo] text that reads: "mensaje exacto"" — el
    // mensaje va citado, no después de "TEXT:". Se intenta ese patrón
    // primero; si el prompt vuelve a usar el formato viejo ("TEXT:
    // mensaje"), sigue funcionando como respaldo. Comillas rectas o
    // tipográficas, ambas válidas. Si ninguno matchea, se descarta en vez
    // de adivinar.
    const quotedMatch = raw.match(/^(.*?)text that reads:\s*["“]([^"”]+)["”]/is);
    const legacyMatch = quotedMatch ? null : raw.match(/^(.*?)\s*TEXT:\s*(.+)$/is);
    const match = quotedMatch || legacyMatch;
    if (!match) return null;
    const tagString = match[1].trim();
    const message = match[2].trim();
    if (!tagString || !message) return null;

    return { visualLine: raw, tagString, message };
  } catch {
    return null;
  }
}

/**
 * Toma la línea que armó el propio modelo ("/tag /tag ... TEXT: mensaje").
 *
 * Camino OpenAI: le agrega SOLO lo que el prompt de Milton no puede
 * cubrir porque depende de decisiones de este código — que no tape el
 * rostro, y que quede espacio para el logo real (que se pega después con
 * compositeLogo). Frases estables, siempre las mismas.
 *
 * Caminos fal.ai/Ideogram y fal.ai/Nano Banana (pedido explícito de
 * Milton, 22/8/2026): CERO capas encima del prompt del admin — se manda
 * `decision.visualLine` tal cual lo devolvió el modelo, sin agregar,
 * traducir ni reescribir nada desde código. Si el proveedor necesita otro
 * formato de texto, ese ajuste va en el prompt del admin, no acá. El logo
 * tampoco se resuelve con una frase de texto ni se compone después por
 * código: se manda como material de referencia (`image_urls`) y el
 * propio modelo decide cómo incorporarlo.
 */
function buildEditPrompt(
  decision: CreativeDecision,
  hasLogo: boolean,
  hasPhotoRef: boolean,
  provider: "openai" | "fal" | "nano" | "gpt-image-2",
): string {
  if (provider === "fal" || provider === "nano" || provider === "gpt-image-2") {
    return decision.visualLine;
  }
  return [
    decision.visualLine,
    "ABSOLUTE RULE: if the photo contains a person, the face is the highest-priority zone in the whole image — never cover eyes, nose, mouth or expression with text or anything else. Use empty/negative space instead.",
    hasLogo
      ? "Leave a clean, empty, uncluttered rectangular area in the bottom-right corner (roughly the bottom-right 30% width x 10% height of the frame) with nothing important there — no text, no busy detail, no headline text overlapping it. A real logo will be placed there afterward by separate exact compositing, so do not draw, sketch or invent any logo or brand text yourself in that corner."
      : "",
    hasPhotoRef
      ? "A person reference photo is also included — incorporate them naturally and tastefully where it fits."
      : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 4000);
}

/**
 * Genera la imagen (Instagram Story/Reel/Post o Facebook Story) con IA,
 * transformando (no copiando ni generando desconectado) la imagen OG del
 * artículo. Devuelve null si CUALQUIER paso falla — quien llama debe
 * cancelar la oportunidad, no publicar sin imagen ni reintentar.
 */
export interface AiImageResult {
  imageUrl: string;
  // Prompt exacto (línea cruda, sin modificar) que se le mandó al
  // generador de imagen — pedido explícito de Milton (22/8/2026) para
  // poder verlo en el histórico sin reconstruirlo desde los logs.
  prompt: string;
}

/**
 * Cuidado de tokens (CUIDADO_DE_TOKENS.md, regla 4): la imagen IA ya pagada se guarda junto con
 * su prompt apenas se genera, y un reintento la reutiliza en vez de pagarla otra vez. Antes
 * `imageUrl`/`aiImagePrompt` solo se guardaban si la publicación salía bien, así que un fallo
 * después de generar tiraba la imagen y el reintento la volvía a pagar.
 */
const REUSE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function isReusableAiImage(
  data: { imageUrl?: unknown; prompt?: unknown; createdAt?: unknown } | null | undefined,
  now: number,
): data is { imageUrl: string; prompt: string; createdAt: number } {
  return Boolean(
    data &&
      typeof data.imageUrl === "string" && data.imageUrl.startsWith("https://") &&
      typeof data.prompt === "string" && data.prompt.length > 0 &&
      typeof data.createdAt === "number" && now - data.createdAt >= 0 && now - data.createdAt <= REUSE_MAX_AGE_MS,
  );
}

async function findReusableAiImage(pathPrefix: string): Promise<AiImageResult | null> {
  try {
    const { blobs } = await list({ prefix: `${pathPrefix}/reuse.json`, limit: 1 });
    if (!blobs[0]) return null;
    const res = await fetch(blobs[0].url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { imageUrl?: unknown; prompt?: unknown; createdAt?: unknown };
    if (!isReusableAiImage(data, Date.now())) return null;
    const head = await fetch(data.imageUrl, { method: "HEAD", signal: AbortSignal.timeout(10000) });
    if (!head.ok) return null;
    console.log(`[AI Image] Reutilizada la imagen ya generada (sin gasto nuevo): ${data.imageUrl}`);
    return { imageUrl: data.imageUrl, prompt: data.prompt };
  } catch {
    return null;
  }
}

async function saveReusableAiImage(pathPrefix: string, imageUrl: string, prompt: string): Promise<void> {
  try {
    await put(`${pathPrefix}/reuse.json`, JSON.stringify({ imageUrl, prompt, createdAt: Date.now() }), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (err) {
    console.warn("[AI Image] No se pudo guardar el registro de reutilización (no es grave):", err);
  }
}

export async function generateAiSocialImage(params: {
  articleTitle: string;
  articleSummary: string;
  ogImageUrl: string;
  format: AiImageFormat;
  businessLogoUrl?: string | null;
  /** Segunda versión del logo (Configuración → Contenido). */
  businessLogoUrl2?: string | null;
  profilePhotoUrl?: string | null;
  profilePhotoUrl2?: string | null;
  profilePhotoUrl3?: string | null;
  pathPrefix: string;
  /** Solo diagnóstico: fuerza (true) o prohíbe (false) que aparezca la persona. */
  forcePerson?: boolean;
  /** Solo diagnóstico: prompt del director a probar en vez del guardado en el panel. */
  systemPromptOverride?: string | null;
}): Promise<AiImageResult | null> {
  if (!OPENAI_IMAGE_API_KEY) return null;

  // Las pruebas de diagnóstico (forcePerson / systemPromptOverride) siempre generan de nuevo.
  const canReuse = params.forcePerson === undefined && !params.systemPromptOverride;
  if (canReuse) {
    const reused = await findReusableAiImage(params.pathPrefix);
    if (reused) return reused;
  }

  const target = FORMAT_TARGET[params.format];
  const formatLabel = FORMAT_LABEL[params.format];

  const ogPng = await fetchImageAsPng(params.ogImageUrl);
  if (!ogPng) return null;

  const providerLabel: "openai" | "fal" | "nano" | "gpt-image-2" =
    IMAGE_PROVIDER === "fal"
      ? "fal"
      : IMAGE_PROVIDER === "nano"
        ? "nano"
        : IMAGE_PROVIDER === "gpt-image-2" || IMAGE_PROVIDER === "gpt2"
          ? "gpt-image-2"
          : "openai";

  // El logo es OBLIGATORIO usarlo cuando existe (regla explícita de Milton:
  // "si el logo existe, su uso es obligatorio, nunca debe omitirse"). La
  // persona puede subir hasta 2 logos y 3 fotos: el Director Creativo recibe
  // la lista de lo disponible. La foto de la persona sale en una fracción de
  // las piezas (PERSON_PHOTO_RATE; 0 = apagado hasta verificar que el
  // generador conserva su rostro) — esa decisión la toma el código.
  const logoUrls = [params.businessLogoUrl, params.businessLogoUrl2].filter((url): url is string => Boolean(url));
  const logoPng = params.businessLogoUrl ? await fetchImageAsPng(params.businessLogoUrl) : null;
  const personUrls = [params.profilePhotoUrl, params.profilePhotoUrl2, params.profilePhotoUrl3].filter((url): url is string => Boolean(url));
  const wantPerson = personUrls.length > 0 && (params.forcePerson ?? Math.random() < PERSON_PHOTO_RATE);
  const personUrl = wantPerson ? personUrls[Math.floor(Math.random() * personUrls.length)] : null;
  const photoPng = personUrl && providerLabel === "openai" ? await fetchImageAsPng(personUrl) : null;

  const decision = await decideCreativeDirection(
    params.articleTitle,
    params.articleSummary,
    ogPng,
    buildAssetBriefing({
      // En el camino OpenAI el logo se pega después por código: no se adjunta.
      logoCount: providerLabel === "openai" ? 0 : logoUrls.length,
      personPhotoCount: personUrls.length,
      includePerson: Boolean(personUrl),
    }),
    formatLabel,
    params.systemPromptOverride,
  );
  if (!decision) return null;

  // Camino OpenAI: el logo NUNCA se le pasa a la IA como referencia a
  // dibujar (probado en vivo: lo cortaba/deformaba pese a instrucciones
  // explícitas) — se pega aparte, después, con código exacto. Solo la OG
  // y la foto de perfil (cuando aplica) van como referencias reales.
  // Caminos fal.ai/Nano Banana/GPT Image 2: distinto a propósito (pedido de
  // Milton) — logos y foto de la persona SÍ se mandan como material de
  // referencia (en ese orden), y el modelo decide cómo usarlos.
  const refImages = [ogPng, photoPng].filter((b): b is Buffer => b !== null);
  const extraRefUrls = [...logoUrls, ...(personUrl ? [personUrl] : [])];
  const prompt = buildEditPrompt(decision, Boolean(logoPng), Boolean(photoPng), providerLabel);

  try {
    // Proveedor de generación de imagen (env var IMAGE_PROVIDER, ya configurada en los
    // 3 workflows). "fal" usa Ideogram V3 Remix; "nano" usa Nano Banana
    // (Gemini) — agregado 22/8/2026 tras 3 fallas distintas de Ideogram en
    // pruebas reales (sin texto, texto deforme, imagen sin relación con la
    // OG). Nano Banana es un modelo nativo de LLM multimodal, arquitectura
    // más parecida a ChatGPT Images (donde el prompt de etiquetas sí
    // funcionó en la prueba manual de Milton) que a un modelo de difusión
    // puro como Ideogram.
    let rawOutput: Buffer | null;
    if (providerLabel === "fal") {
      rawOutput = await generateImageBufferFal(prompt, params.ogImageUrl, target.width, target.height, extraRefUrls);
    } else if (providerLabel === "nano") {
      rawOutput = await generateImageBufferNanoBanana(prompt, params.ogImageUrl, target.width, target.height, extraRefUrls);
    } else if (providerLabel === "gpt-image-2") {
      rawOutput = await generateImageBufferGptImage2(prompt, params.ogImageUrl, target.width, target.height, extraRefUrls);
    } else {
      const form = new FormData();
      form.append("model", "gpt-image-1-mini");
      form.append("prompt", prompt);
      form.append("size", target.editSize);
      // Calidad explícita (pedido de Milton por costo, 20/8/2026): "auto"
      // default puede cobrar como "high" ($0.25). Ya se probaron "low"
      // (~$0.005) y "medium" (~$0.015) — de vuelta a "low" a pedido de
      // Milton, ahora que el texto ya no fuerza tamaño grande (el prompt de
      // Milton controla eso), puede ya alcanzar con menos calidad.
      form.append("quality", "low");
      form.append("n", "1");
      refImages.forEach((buf, i) => {
        form.append("image[]", new Blob([new Uint8Array(buf)], { type: "image/png" }), `ref${i}.png`);
      });

      const res = await fetch(OPENAI_EDIT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_IMAGE_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(`[AI Image] OpenAI images/edits falló: ${res.status} ${errText.slice(0, 300)}`);
        return null;
      }
      const data = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = data.data?.[0]?.b64_json;
      rawOutput = b64 ? Buffer.from(b64, "base64") : null;
    }
    if (!rawOutput) return null;

    const resized = await sharp(rawOutput)
      .resize(target.width, target.height, { fit: "cover", position: "attention" })
      .toBuffer();
    // Con fal.ai/Nano Banana el logo ya se le mandó al modelo como material
    // de referencia — no se vuelve a pegar por código encima, para no
    // terminar con dos logos superpuestos.
    const withLogo =
      logoPng && providerLabel === "openai" ? await compositeLogo(resized, target.width, target.height, logoPng) : resized;

    // JPEG en vez de PNG: los generadores devuelven PNG pesado, e Instagram
    // tarda en procesar el media proporcionalmente a su peso. JPEG calidad
    // 90 pesa una fracción de eso sin pérdida visible.
    const finalBuffer = await sharp(withLogo).jpeg({ quality: 90 }).toBuffer();

    const blob = await put(`${params.pathPrefix}/${Date.now()}.jpg`, finalBuffer, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });

    const checkRes = await fetch(blob.url, { method: "HEAD" });
    if (!checkRes.ok) return null;

    const modelLabel =
      providerLabel === "fal"
        ? "fal-ai/ideogram-v3-remix"
        : providerLabel === "nano"
          ? "fal-ai/nano-banana"
          : providerLabel === "gpt-image-2"
            ? "openai/gpt-image-2/edit"
            : "gpt-image-1-mini";
    console.log(
      `[AI Image] Generada con ${modelLabel}: ${blob.url} (${(finalBuffer.length / 1024).toFixed(0)}KB) — ` +
        `etiquetas: ${decision.tagString} — texto: "${decision.message}"` +
        `${logoUrls.length > 0 ? ` +logo(${logoUrls.length})` : ""}${personUrl ? " +persona" : ""}`,
    );
    if (canReuse) await saveReusableAiImage(params.pathPrefix, blob.url, prompt);
    return { imageUrl: blob.url, prompt };
  } catch (err) {
    console.warn("[AI Image] Fallo generando imagen con IA:", err);
    return null;
  }
}

// Portada de un artículo de BLOG IA (2026-10-21). A diferencia de
// `aiImageGenerator.ts` (redes sociales: edita la imagen OG de un artículo YA
// publicado), aquí no existe imagen de partida: se genera desde cero con el
// título y el resumen, SIN TEXTO en la imagen (los modelos deforman las letras
// en español). Una sola imagen por artículo, sin reintento gratuito: el costo
// es parte de la decisión de Milton.
//
// Proveedor intercambiable con BLOG_IA_IMAGE_PROVIDER ("openai" | "fal"):
//   openai → gpt-image-1-mini, calidad baja (≈ 0,005 USD) o media (≈ 0,015 USD) con BLOG_IA_IMAGE_QUALITY.
//   fal    → Ideogram V3 vía fal.ai (≈ 0,03 USD por imagen).
// Precios tomados de los comentarios de aiImageGenerator.ts (22/8/2026), no
// verificados en vivo. Endpoints no probados contra el proveedor real:
// configuración/código verificados; E2E pendiente.
//
// Dependencias inyectables (`fetchImpl`, claves): se prueba sin red ni gasto.

export type CoverProvider = "openai" | "fal";
export type CoverQuality = "low" | "medium";

/** Solo «medium» sube de nivel; cualquier otro valor es «low» (la más barata). La «high» no se admite por costo. */
export function resolveCoverQuality(raw: string | undefined): CoverQuality {
  return (raw ?? "").trim().toLowerCase() === "medium" ? "medium" : "low";
}

export interface CoverImage {
  bytes: Uint8Array;
  mime: "image/png" | "image/jpeg" | "image/webp";
  provider: CoverProvider;
  prompt: string;
}

export interface CoverOptions {
  title: string;
  summary: string;
  provider?: CoverProvider;
  /** Solo OpenAI: low ≈ 0,005 USD, medium ≈ 0,015 USD por imagen. */
  quality?: CoverQuality;
  openaiKey?: string;
  falKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const OPENAI_GENERATIONS_URL = "https://api.openai.com/v1/images/generations";
const FAL_IDEOGRAM_V3_URL = "https://fal.run/fal-ai/ideogram/v3";

export function resolveCoverProvider(raw: string | undefined): CoverProvider {
  return (raw ?? "").trim().toLowerCase() === "fal" ? "fal" : "openai";
}

/** Prompt editorial sin texto. Título y resumen solo orientan el tema. */
export function buildCoverPrompt(title: string, summary: string): string {
  const topic = `${title}. ${summary}`.replace(/\s+/g, " ").trim().slice(0, 500);
  return [
    "Editorial blog cover image, wide landscape composition, professional, clean and modern, natural lighting.",
    `Visual theme inspired by this article topic: ${topic}`,
    "Depict the theme with realistic photography or a tasteful illustration, with a clear focal subject and generous empty space.",
    "STRICTLY NO text, NO letters, NO numbers, NO words, NO logos, NO watermarks, NO captions, NO signs with writing anywhere in the image.",
  ].join(" ");
}

function sniffMime(bytes: Uint8Array): CoverImage["mime"] | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

/**
 * Devuelve la portada, o null si el proveedor no está configurado o falla.
 * Quien llama debe seguir publicando SIN imagen (el blog muestra el marcador
 * neutro): una portada fallida nunca bloquea un artículo.
 */
export async function generateBlogCover(opts: CoverOptions): Promise<CoverImage | null> {
  const provider = opts.provider ?? "openai";
  const doFetch = opts.fetchImpl ?? fetch;
  const prompt = buildCoverPrompt(opts.title, opts.summary);
  const signal = () => AbortSignal.timeout(opts.timeoutMs ?? 90_000);

  try {
    let bytes: Uint8Array | null = null;
    if (provider === "openai") {
      if (!opts.openaiKey) return null;
      const res = await doFetch(OPENAI_GENERATIONS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1-mini", prompt, size: "1536x1024", quality: opts.quality ?? "low", n: 1 }),
        signal: signal(),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = data.data?.[0]?.b64_json;
      bytes = b64 ? new Uint8Array(Buffer.from(b64, "base64")) : null;
    } else {
      if (!opts.falKey) return null;
      const res = await doFetch(FAL_IDEOGRAM_V3_URL, {
        method: "POST",
        headers: { Authorization: `Key ${opts.falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image_size: { width: 1536, height: 1024 }, rendering_speed: "TURBO", expand_prompt: false, num_images: 1 }),
        signal: signal(),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { images?: { url?: string }[] };
      const url = data.images?.[0]?.url;
      if (!url || !/^https:\/\//i.test(url)) return null;
      const img = await doFetch(url, { signal: signal() });
      if (!img.ok) return null;
      bytes = new Uint8Array(await img.arrayBuffer());
    }
    if (!bytes || bytes.length === 0) return null;
    const mime = sniffMime(bytes);
    return mime ? { bytes, mime, provider, prompt } : null; // nunca se acepta algo que no sea una imagen real
  } catch {
    return null;
  }
}

/**
 * Reduce la portada a WebP de 1200 px de ancho (unas decenas de KB): la API del
 * blog acepta cuerpos de hasta 2 MB y un PNG de IA puede pesar más.
 */
export async function optimizeCover(bytes: Uint8Array): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const { default: sharp } = await import("sharp");
    const out = await sharp(Buffer.from(bytes)).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    return out.length > 0 ? { bytes: new Uint8Array(out), mime: "image/webp" } : null;
  } catch {
    return null;
  }
}

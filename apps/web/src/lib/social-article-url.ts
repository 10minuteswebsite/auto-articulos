/**
 * Revisa la página pública de un artículo antes de ofrecerlo en Redes.
 *
 * - "gone": responde 404/410 (incidente del 28/10/2026: una propuesta
 *   apuntaba a un 404).
 * - "no-image": la página carga completa pero no declara `og:image`. Las redes
 *   no publican sin foto (el worker se detiene con «no se encontró la foto»),
 *   así que se avisa ANTES de crear una propuesta que va a fallar (caso
 *   realestatemov, 29/10/2026: artículos sin foto en su servidor).
 * - "ok" / "unknown": se ofrece. Un 403 anti-bot, un timeout, un 5xx o una
 *   página a medias NO prueban nada: antes de este criterio (27-29/10/2026)
 *   cualquiera de ellos —o un `selectedSiteDomain` vacío o con nombre de
 *   panel— dejaba la lista en cero y Redes respondía «ya tienen una propuesta».
 */
export type ArticlePageState = "ok" | "gone" | "no-image" | "unknown";

type FetchLike = (
  url: string,
  init: RequestInit,
) => Promise<{ status: number; text?: () => Promise<string>; body?: { cancel?: () => unknown } | null }>;

export function isFetchableArticleUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === "[::1]") return false;
  return true;
}

// Mismo criterio que el worker (getArticleOpenGraphImage): la foto es la og:image declarada.
export function declaresOgImage(html: string): boolean {
  return (
    /<meta\s+[^>]*(?:property|name)=["']og:image["'][^>]*content=["'][^"']+["'][^>]*>/i.test(html) ||
    /<meta\s+[^>]*content=["'][^"']+["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i.test(html)
  );
}

export async function inspectArticlePage(url: string, fetchImpl: FetchLike = fetch as unknown as FetchLike): Promise<ArticlePageState> {
  if (!isFetchableArticleUrl(url)) return "unknown";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Algunos hostings frenan pedidos sin User-Agent de navegador; el worker usa el mismo.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (response.status === 404 || response.status === 410) {
      await response.body?.cancel?.();
      return "gone";
    }
    if (response.status < 200 || response.status >= 300 || !response.text) {
      await response.body?.cancel?.();
      return "unknown";
    }
    const html = await response.text();
    if (declaresOgImage(html)) return "ok";
    // Solo una página completa (con su cierre de cabecera) prueba que no hay foto.
    return /<\/head\s*>/i.test(html) ? "no-image" : "unknown";
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timeout);
  }
}

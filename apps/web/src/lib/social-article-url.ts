/**
 * Decide si la URL pública de un artículo ya no existe, para no ofrecerla en
 * Redes (incidente del 28/10/2026: una propuesta apuntaba a un 404).
 *
 * Solo una respuesta definitiva de "no existe" (404/410) la descarta. Un
 * 403 por bloqueo anti-bot, un timeout, un 5xx o un error de red NO prueban
 * que el artículo no exista: antes de este criterio (27-29/10/2026) cualquiera
 * de ellos —o un `selectedSiteDomain` vacío o con nombre de panel— dejaba la
 * lista de candidatos en cero y Redes respondía «ya tienen una propuesta».
 */
type FetchLike = (url: string, init: RequestInit) => Promise<{ status: number; body?: { cancel?: () => unknown } | null }>;

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

export async function isArticleUrlGone(url: string, fetchImpl: FetchLike = fetch as unknown as FetchLike): Promise<boolean> {
  if (!isFetchableArticleUrl(url)) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    await response.body?.cancel?.();
    return response.status === 404 || response.status === 410;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

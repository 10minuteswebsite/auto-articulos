export type PersonalTokenLookup =
  | { kind: "authenticated"; userId: string }
  | { kind: "invalid"; status: 401 }
  | { kind: "unavailable"; status?: number };

/** Edge-safe: solo el lookup nodejs conoce Prisma. No seguir redirecciones
 * que puedan reenviar la credencial a otro host. */
export async function lookupPersonalMcpToken(url: URL, bearer: string, fetcher: typeof fetch = fetch): Promise<PersonalTokenLookup> {
  try {
    const response = await fetcher(url, {
      method: "POST",
      headers: { authorization: `Bearer ${bearer}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) return { kind: "invalid", status: 401 };
    if (!response.ok) return { kind: "unavailable", status: response.status };
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null || !("userId" in data) || typeof data.userId !== "string" || !data.userId.trim()) {
      return { kind: "unavailable", status: response.status };
    }
    return { kind: "authenticated", userId: data.userId };
  } catch {
    return { kind: "unavailable" };
  }
}

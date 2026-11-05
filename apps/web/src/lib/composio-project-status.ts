/** Only field names and booleans may leave the server; values may be secrets. */
export function callbackVerifierCandidates(value: unknown) {
  const found: Array<{ field: string; configured: boolean }> = [];
  function walk(input: unknown, depth: number) {
    if (!input || typeof input !== "object" || Array.isArray(input) || depth > 3) return;
    for (const [key, item] of Object.entries(input)) {
      if (!/^[a-zA-Z_]{1,80}$/.test(key)) continue;
      const compact = key.replace(/_/g, "").toLowerCase();
      if ((compact.includes("callback") && (compact.includes("verif") || compact.includes("ident")))
        || (compact.includes("oauth") && compact.includes("ident"))) {
        if (typeof item === "string") found.push({ field: key, configured: item.trim().length > 0 });
        else if (typeof item === "boolean") found.push({ field: key, configured: item });
        else if (item === null) found.push({ field: key, configured: false });
      }
      if (item && typeof item === "object" && !Array.isArray(item)) walk(item, depth + 1);
    }
  }
  walk(value, 0);
  return found;
}

export async function readComposioProjectStatus(apiKey: string | null, transport: typeof fetch = fetch) {
  if (!apiKey) return { state: "not_configured" as const };
  try {
    const response = await transport("https://backend.composio.dev/api/v3/org/project/config", {
      headers: { "x-api-key": apiKey }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { state: "provider_error" as const, provider_status: response.status };
    return { state: "ok" as const, candidates: callbackVerifierCandidates(await response.json()) };
  } catch { return { state: "unavailable" as const }; }
}

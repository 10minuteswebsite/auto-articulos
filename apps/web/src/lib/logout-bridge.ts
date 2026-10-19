const HUB_ORIGIN = "https://hub.lasolucionweb.net";
const HUB_LOGOUT_PATH = "/auth/logout";
const CLEARED_PARAM = "autoArticulosCleared";

export function getHubLogoutContinuation(rawReturnTo: string | null): URL {
  const fallback = new URL(HUB_LOGOUT_PATH, HUB_ORIGIN);
  fallback.searchParams.set(CLEARED_PARAM, "1");

  if (!rawReturnTo) return fallback;

  try {
    const candidate = new URL(rawReturnTo);
    if (candidate.origin !== HUB_ORIGIN || candidate.pathname !== HUB_LOGOUT_PATH) {
      return fallback;
    }
    candidate.searchParams.set(CLEARED_PARAM, "1");
    return candidate;
  } catch {
    return fallback;
  }
}

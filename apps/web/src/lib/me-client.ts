export type MeResponse = Record<string, unknown> | null;

type Fetcher = typeof fetch;

export interface MeClientOptions {
  force?: boolean;
}

export interface MeClientDependencies {
  now?: () => number;
  fetcher?: Fetcher;
  cacheMs?: number;
}

export function createMeClient({
  now = Date.now,
  fetcher = fetch,
  cacheMs = 3_000,
}: MeClientDependencies = {}) {
  let cached: { value: MeResponse; expiresAt: number } | null = null;
  let inFlight: Promise<MeResponse> | null = null;

  const request = () =>
    fetcher("/api/me", {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    }).then((response) => (response.ok ? response.json() : null));

  const fetchMe = ({ force = false }: MeClientOptions = {}): Promise<MeResponse> => {
    const currentTime = now();
    if (!force && cached && currentTime < cached.expiresAt) {
      return Promise.resolve(cached.value);
    }
    if (!force && inFlight) return inFlight;

    const pending = request().then((value) => {
      if (value !== null) cached = { value, expiresAt: now() + cacheMs };
      return value;
    });
    inFlight = pending;
    pending.finally(() => {
      if (inFlight === pending) inFlight = null;
    });
    return pending;
  };

  return { fetchMe };
}

export const { fetchMe } = createMeClient();

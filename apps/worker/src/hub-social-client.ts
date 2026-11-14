const ENDPOINT = "https://hub.lasolucionweb.net/api/resources/connections/v2/social";
const CONNECTION_ID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

type Provider = "threads" | "google-business-profile" | "bluesky" | "tumblr";
type Publication = {
  connection_id: string;
  idempotency_key: string;
  content: string;
  title?: string;
  target_id?: string;
  media?: { type: "image" | "video" | "gif"; url: string }[];
};

/** Uses an application token scoped to the job's tenant by the Hub. */
export function hubSocialClient(token: string, transport: typeof fetch = fetch) {
  async function request(query: URLSearchParams | null, publication?: Publication) {
    const response = await transport(query ? `${ENDPOINT}?${query}` : ENDPOINT, {
      method: publication ? "POST" : "GET",
      headers: {
        authorization: `Bearer ${token}`,
        ...(publication ? { "content-type": "application/json" } : {}),
      },
      body: publication ? JSON.stringify(publication) : undefined,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(59000),
    });
    if (!response.ok) throw new Error("hub_social_unavailable");
    const body = await response.json();
    if (!body?.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      throw new Error("hub_social_unavailable");
    }
    return body.data as Record<string, unknown>;
  }

  return {
    async resolve(provider: Provider): Promise<string | null> {
      const data = await request(new URLSearchParams({ provider }));
      if (data.connection_id === null) return null;
      if (typeof data.connection_id !== "string" || !CONNECTION_ID.test(data.connection_id)) {
        throw new Error("hub_social_unavailable");
      }
      return data.connection_id;
    },
    async publish(publication: Publication): Promise<string> {
      if (!CONNECTION_ID.test(publication.connection_id)) throw new Error("hub_social_unavailable");
      const data = await request(null, publication);
      if (typeof data.postId !== "string" || !data.postId || data.status !== "published") {
        throw new Error("hub_social_unconfirmed");
      }
      return data.postId;
    },
  };
}

/** Obtain a fresh token for one tenant using the Redes product identity. */
export async function hubSocialClientForTenant(tenantId: string, transport: typeof fetch = fetch) {
  const clientId = process.env.HUB_REDES_SOCIAL_CLIENT_ID;
  const clientSecret = process.env.HUB_REDES_SOCIAL_CLIENT_SECRET;
  if (!CONNECTION_ID.test(tenantId) || !clientId || !clientSecret) throw new Error("hub_social_unavailable");

  const response = await transport("https://hub.lasolucionweb.net/api/resources/context/v1/tokens?app=auto-redes", {
    method: "POST",
    headers: {
      authorization: `Bearer ${clientSecret}`,
      "x-platform-client-id": clientId,
      "x-platform-user-id": tenantId,
      "content-type": "application/json",
    },
    body: JSON.stringify({ resource: "connections", scopes: ["connections:publish"] }),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("hub_social_unavailable");
  const { data } = await response.json();
  if (typeof data?.access_token !== "string" || !data.access_token || data.audience !== "connections"
    || data.context?.tenant_id !== tenantId || data.context?.app_id !== "auto-redes"
    || !Array.isArray(data.context?.scopes) || !data.context.scopes.includes("connections:publish")) {
    throw new Error("hub_social_unavailable");
  }
  return hubSocialClient(data.access_token, transport);
}

export function hubSocialPilotEnabled(tenantId: string | null | undefined): tenantId is string {
  return Boolean(tenantId && CONNECTION_ID.test(tenantId)
    && process.env.HUB_SOCIAL_CONSUMER_PILOT_IDS?.split(",").some(id => id.trim() === tenantId));
}

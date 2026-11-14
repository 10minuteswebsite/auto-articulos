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

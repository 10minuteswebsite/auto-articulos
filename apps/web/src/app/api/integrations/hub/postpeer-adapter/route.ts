import { NextRequest, NextResponse } from "next/server";
import { createPostPeerProfile, getPostPeerOAuthUrl, listPostPeerIntegrations } from "@auto-articulos/shared";
import { validHubBackend } from "@/lib/hub-credential-transport";
import { getPostPeerApiKey } from "@/lib/postpeer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

const providers = {
  threads: "threads",
  "google-business-profile": "googlebusiness",
} as const;

export async function POST(request: NextRequest) {
  try {
    if (!(await validHubBackend(request))) return reply({ error: "unauthorized" }, 401);
    const body = await request.json().catch(() => null) as { operation?: unknown; provider?: unknown; origin?: unknown; profile_id?: unknown } | null;
    if (typeof body?.provider !== "string" || !(body.provider in providers)) return reply({ error: "invalid_provider" }, 400);
    const platform = providers[body.provider as keyof typeof providers];
    const apiKey = await getPostPeerApiKey();
    if (!apiKey) return reply({ error: "provider_not_configured" }, 409);

    if (body.operation === "start") {
      if (typeof body.origin !== "string" || !/^https:\/\//.test(body.origin)) return reply({ error: "invalid_origin" }, 400);
      const profileId = await createPostPeerProfile(apiKey, `HUB central - ${platform} - ${Date.now()}`);
      const callback = new URL(body.origin);
      callback.searchParams.set("profileId", profileId);
      const redirectUrl = await getPostPeerOAuthUrl(apiKey, platform, { profileId, redirectUri: callback.toString() });
      return reply({ redirectUrl });
    }

    if (body.operation === "complete") {
      if (typeof body.profile_id !== "string" || body.profile_id.length < 1 || body.profile_id.length > 200) return reply({ error: "invalid_profile" }, 400);
      const integration = (await listPostPeerIntegrations(apiKey, { platform, profileId: body.profile_id }))[0];
      if (!integration) return reply({ outcome: "invalid" }, 422);
      return reply({ outcome: "connected", accountId: integration.id, accountLabel: integration.displayName ?? null });
    }

    return reply({ error: "invalid_operation" }, 400);
  } catch {
    return reply({ error: "connection_unavailable" }, 503);
  }
}

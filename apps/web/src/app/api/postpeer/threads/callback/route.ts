import { NextRequest, NextResponse } from "next/server";
import { completePostPeerSocialConnection } from "@/lib/postpeer";
import { connectionReturnPath } from "@/lib/connection-return";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  const platform = request.nextUrl.searchParams.get("platform");
  const result = profileId && platform === "threads"
    ? await completePostPeerSocialConnection("threads", profileId)
    : "missing";
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL(connectionReturnPath("threads", result === "connected" ? "connected" : "error"), origin));
}

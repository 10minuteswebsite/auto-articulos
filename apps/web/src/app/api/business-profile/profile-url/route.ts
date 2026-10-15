import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { getBusinessProfileUrl, normalizeBusinessProfileUrl, setBusinessProfileUrl } from "@/lib/business-profile-url";

export async function GET() {
  const userId = await getCurrentUserId();
  return NextResponse.json({ url: await getBusinessProfileUrl(userId) });
}

export async function PUT(request: NextRequest) {
  const userId = await getCurrentUserId();
  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const raw = (body.url ?? "").trim();
  if (!raw) {
    await setBusinessProfileUrl(userId, null);
    return NextResponse.json({ url: null });
  }
  const url = normalizeBusinessProfileUrl(raw);
  if (!url) return NextResponse.json({ error: "Pega el enlace de tu ficha de Google (por ejemplo https://share.google/…)." }, { status: 400 });
  await setBusinessProfileUrl(userId, url);
  return NextResponse.json({ url });
}

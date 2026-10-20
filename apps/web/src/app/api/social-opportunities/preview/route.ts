import { NextRequest, NextResponse } from "next/server";
import { generateSocialImageRaw } from "@auto-articulos/shared";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { requireProductAccess } from "@/lib/require-product-access";
import sharp from "sharp";

export const runtime = "nodejs";

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}

export async function POST(request: NextRequest) {
  const { summary, platform } = await request.json();

  if (!summary || !platform) {
    return NextResponse.json({ error: "summary y platform son requeridos" }, { status: 400 });
  }

  let userPrompts: { imagePrompt: string | null; infographicPrompt: string | null; businessLogoUrl: string | null } | null = null;
  try {
    const userId = await getCurrentUserId();
    const denied = await requireProductAccess(userId, "REDES", "/api/social-opportunities/preview");
    if (denied) return denied;
    userPrompts = await prisma.user.findUnique({
      where: { id: userId },
      select: { imagePrompt: true, infographicPrompt: true, businessLogoUrl: true },
    });
  } catch {
    // Sin usuario autenticado, usar prompts por defecto
  }

  const extraStyle = platform === "linkedin"
    ? "Imagen profesional y limpia para LinkedIn. Colores corporativos azul oscuro y blanco, composición minimalista con texto claro y legible."
    : undefined;

  if (platform === "instagram-carousel") {
    const headline = String(summary).trim().slice(0, 140) || "Una idea importante para tu audiencia";
    const lines = headline.replace(/\s+/g, " ").match(/.{1,26}(?:\s|$)/g)?.map((line) => line.trim()).filter(Boolean) ?? [headline];
    const slides: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const label = String(index + 1).padStart(2, "0") + "/05";
      const foreground = index % 2 ? "#102A43" : "#F7F0E5";
      const background = index % 2 ? "#F7F0E5" : "#102A43";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="${background}"/><circle cx="950" cy="100" r="210" fill="#D9825B" opacity=".9"/><text x="72" y="100" font-family="Arial" font-size="30" font-weight="700" fill="${foreground}">${label}</text><text x="92" y="510" font-family="Arial" font-size="64" font-weight="700" fill="${foreground}">${escapeXml(lines[0] ?? headline)}</text><text x="92" y="590" font-family="Arial" font-size="64" font-weight="700" fill="${foreground}">${escapeXml(lines[1] ?? "")}</text><rect x="92" y="760" width="896" height="260" rx="30" fill="#D9825B" opacity=".18"/></svg>`;
      slides.push((await sharp(Buffer.from(svg, "utf8"), { density: 144 }).png().toBuffer()).toString("base64"));
    }
    return NextResponse.json({ imageBase64s: slides });
  }

  // 50% de probabilidad de incluir el logo del usuario si existe
  const logoUrl = userPrompts?.businessLogoUrl && Math.random() < 0.5 ? userPrompts.businessLogoUrl : null;

  const result = await generateSocialImageRaw(summary, userPrompts?.imagePrompt, extraStyle, logoUrl, platform);

  if (!result) {
    return NextResponse.json({ error: "No se pudo generar la imagen" }, { status: 500 });
  }

  if (result.url) {
    return NextResponse.json({ imageUrl: result.url });
  }

  if (result.b64) {
    return NextResponse.json({ imageBase64: result.b64 });
  }

  return NextResponse.json({ error: "No se pudo generar la imagen" }, { status: 500 });
}

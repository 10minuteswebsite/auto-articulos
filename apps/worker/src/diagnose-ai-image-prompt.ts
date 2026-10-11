import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import { generateAiSocialImage, type AiImageFormat } from "./aiImageGenerator";
import { DIRECTOR_PROMPT_V2, mergeDirectorPrompt } from "./directorPromptV2";
import { decryptSecret } from "@auto-articulos/shared";
import { getArticleOpenGraphImage } from "./socialPublish";

// Diagnóstico (11/10/2026) para comparar el Director Creativo ACTUAL (el prompt
// guardado en el panel de Administración) contra el NUEVO (directorPromptV2.ts)
// SIN publicar nada: solo genera imágenes de prueba en Vercel Blob
// (diagnostics/ai-image/...) y escribe las direcciones en el resumen del job.
// No modifica ninguna fila de la base de datos.
//
// Variables: DIAG_USER_EMAIL (obligatoria), DIAG_ARTICLE_URL (opcional),
// DIAG_FORMATS (story,reel-image,post,pinterest), DIAG_ARMS (actual,nuevo),
// DIAG_PERSON (no | si | ambos). Directores: actual (panel), hibrido (panel + guía), nuevo (v2 corto).

const VALID_FORMATS: AiImageFormat[] = ["story", "reel-image", "post", "facebook-story", "pinterest"];

async function main() {
  const email = (process.env.DIAG_USER_EMAIL || "").trim().toLowerCase();
  if (!email) throw new Error("Falta DIAG_USER_EMAIL.");
  const formats = (process.env.DIAG_FORMATS || "story,post,pinterest")
    .split(",")
    .map((f) => f.trim())
    .filter((f): f is AiImageFormat => (VALID_FORMATS as string[]).includes(f));
  const arms = (process.env.DIAG_ARMS || "actual,nuevo").split(",").map((a) => a.trim());
  const personMode = (process.env.DIAG_PERSON || "no").trim();
  const persons = personMode === "ambos" ? [false, true] : [personMode === "si"];

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      businessLogoUrl: true,
      businessLogoUrl2: true,
      profilePhotoUrl: true,
      profilePhotoUrl2: true,
      profilePhotoUrl3: true,
    },
  });
  if (!user) throw new Error(`No existe el usuario ${email}.`);

  const articleUrl = (process.env.DIAG_ARTICLE_URL || "").trim();
  const opportunity = await prisma.socialOpportunity.findFirst({
    where: { userId: user.id, ...(articleUrl ? { articleUrl } : {}) },
    orderBy: { createdAt: "desc" },
    select: { articleUrl: true, articleTitle: true, titleId: true },
  });
  if (!opportunity) throw new Error("No hay ninguna oportunidad de la cuenta para tomar un artículo.");
  const title = opportunity.titleId
    ? await prisma.title.findUnique({ where: { id: opportunity.titleId }, select: { summary: true } })
    : null;
  const ogImageUrl = await getArticleOpenGraphImage(opportunity.articleUrl);
  if (!ogImageUrl) throw new Error(`El artículo no tiene imagen OG: ${opportunity.articleUrl}`);

  console.log(`Artículo: ${opportunity.articleTitle}\n${opportunity.articleUrl}\nOG: ${ogImageUrl}`);
  console.log(
    `Materiales de la cuenta: logos=${[user.businessLogoUrl, user.businessLogoUrl2].filter(Boolean).length}, ` +
      `fotos=${[user.profilePhotoUrl, user.profilePhotoUrl2, user.profilePhotoUrl3].filter(Boolean).length}`,
  );

  const stored = await prisma.systemSetting.findUnique({ where: { key: "ai_social_image_prompt" } });
  let storedPrompt = "";
  if (stored?.encryptedValue) {
    try {
      storedPrompt = decryptSecret(stored.encryptedValue);
    } catch {
      storedPrompt = stored.encryptedValue;
    }
  }
  const overrideFor = (arm: string): string | null =>
    arm === "nuevo" ? DIRECTOR_PROMPT_V2 : arm === "hibrido" ? mergeDirectorPrompt(storedPrompt || DIRECTOR_PROMPT_V2) : null;

  const stamp = Date.now();
  const rows: string[] = [];
  for (const format of formats) {
    for (const arm of arms) {
      for (const person of persons) {
        const started = Date.now();
        const result = await generateAiSocialImage({
          articleTitle: opportunity.articleTitle,
          articleSummary: title?.summary || opportunity.articleTitle,
          ogImageUrl,
          format,
          businessLogoUrl: user.businessLogoUrl,
          businessLogoUrl2: user.businessLogoUrl2,
          profilePhotoUrl: user.profilePhotoUrl,
          profilePhotoUrl2: user.profilePhotoUrl2,
          profilePhotoUrl3: user.profilePhotoUrl3,
          pathPrefix: `diagnostics/ai-image/${stamp}/${format}-${arm}${person ? "-persona" : ""}`,
          forcePerson: person,
          systemPromptOverride: overrideFor(arm),
        });
        const seconds = ((Date.now() - started) / 1000).toFixed(0);
        const line = `${format} | ${arm}${person ? " + persona" : ""} | ${seconds}s | ${result ? result.imageUrl : "SIN IMAGEN (falló)"}`;
        console.log(line);
        if (result) console.log(`   prompt enviado al generador: ${result.prompt}`);
        rows.push(`| ${format} | ${arm}${person ? " + persona" : ""} | ${seconds}s | ${result ? `[ver imagen](${result.imageUrl})` : "falló"} |`);
      }
    }
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Comparación de imágenes (sin publicar)\n\n| Formato | Director | Tiempo | Imagen |\n|---|---|---|---|\n${rows.join("\n")}\n`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

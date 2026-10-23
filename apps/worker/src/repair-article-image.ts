import "dotenv/config";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, platformProductNameOrNeutral } from "@auto-articulos/shared";
import { generateImage, login, resolveBaseUrl } from "./automation/10minutesWebsite";

// Repara la foto de UN artículo ya publicado cuyo archivo de imagen no existe (404 en el sitio del
// cliente). Caso: Vicente Sánchez, 23/10/2026 — la imagen se generó en la vista previa pero el guardado
// dejó solo la referencia. Abre su pantalla de edición, regenera la imagen con el mismo flujo de
// creación, guarda y comprueba que la foto pública responde 200. Variables: USER_EMAIL, ARTICLE_ID,
// ARTICLE_URL (página pública del artículo, para comprobar su og:image). Capturas en repair-out/.
const OUT = "repair-out";

async function publicOgImageStatus(articleUrl: string): Promise<string> {
  const res = await fetch(articleUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();
  const match = html.match(/<meta[^>]+property=['"]og:image['"][^>]*content=['"]([^'"]+)['"]/i);
  if (!match?.[1]) return "la página no declara og:image";
  const img = await fetch(new URL(match[1], articleUrl).toString(), { headers: { "User-Agent": "Mozilla/5.0" } });
  return `${img.status} ${img.headers.get("content-type") ?? ""} ${match[1]}`;
}

async function main() {
  const email = process.env.USER_EMAIL?.trim();
  const articleId = process.env.ARTICLE_ID?.trim();
  const articleUrl = process.env.ARTICLE_URL?.trim();
  if (!email || !articleId || !articleUrl) throw new Error("Faltan USER_EMAIL, ARTICLE_ID y ARTICLE_URL.");
  mkdirSync(OUT, { recursive: true });
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, platformDomain: true } });
  if (!user) throw new Error(`No existe el usuario ${email}.`);
  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId: user.id, platform: "10minutesWebsite" } },
  });
  if (!credential) throw new Error("El usuario no tiene credencial de la plataforma.");
  const credentials = {
    username: decryptSecret(credential.encryptedUsername),
    password: decryptSecret(credential.encryptedPassword),
    platformDomain: user.platformDomain,
  };
  const onStep = async (m: string) => console.log(m);

  console.log(`ANTES: foto pública → ${await publicOgImageStatus(articleUrl)}`);
  const baseUrl = resolveBaseUrl(credentials.platformDomain);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    const dialogs: string[] = [];
    page.on("dialog", (d) => { dialogs.push(d.message()); void d.accept().catch(() => {}); });
    await login(page, baseUrl, credentials, onStep);
    await page.goto(`${baseUrl}/dashboard/direct-edit-articles?articles_id_=${encodeURIComponent(articleId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForSelector("#titlees", { timeout: 20_000 });
    await page.waitForTimeout(2500);
    const title = await page.inputValue("#titlees");
    const summary = await page.inputValue("#excerptes").catch(() => "");
    console.log(`Editando el artículo ${articleId}: "${title}"`);
    await generateImage(page, title, summary, onStep, platformProductNameOrNeutral(credentials.platformDomain));
    await page.screenshot({ path: `${OUT}/after-generate.png`, fullPage: true });
    const hidden = await page.evaluate(
      () => (document.querySelector("#hidden-image-data1") as HTMLInputElement | null)?.value?.length ?? -1,
    );
    console.log(`Imagen cargada en el formulario (hidden-image-data1: ${hidden} caracteres).`);
    await page.locator("#save_art").first().scrollIntoViewIfNeeded().catch(() => {});
    await page.locator("#save_art").first().click({ timeout: 15_000 });
    await page.waitForTimeout(25_000);
    await page.screenshot({ path: `${OUT}/after-save.png`, fullPage: true });
    const alerts = await page
      .locator('[role="alert"], .swal2-popup, .modal.in, .modal.show, .alert')
      .evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => (e.textContent ?? "").trim().slice(0, 200)))
      .catch(() => [] as string[]);
    console.log(`Tras guardar: url=${page.url()} mensajes=${alerts.join(" | ") || "ninguno"} diálogos=${dialogs.join(" | ") || "ninguno"}`);
  } finally {
    await browser.close();
  }
  const after = await publicOgImageStatus(articleUrl);
  console.log(`DESPUÉS: foto pública → ${after}`);
  if (!after.startsWith("200")) process.exitCode = 2;
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

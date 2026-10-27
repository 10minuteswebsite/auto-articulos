import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import sharp from "sharp";
import { sendBlogIaEvent } from "@auto-articulos/shared";

/**
 * Prueba de extremo a extremo de BLOG IA (2026-10-27, pedido de Milton):
 * crea un blog NUEVO para la cuenta de pruebas de Lorena en
 * blogia-lorena.lasolucionweb.net, lo vincula (`BlogIaBlog`) y pone
 * `publishMethod = BLOG` SOLO para esa cuenta.
 *
 * MODE=plan   (por defecto) no escribe nada: imprime qué haría.
 * MODE=link   envía los eventos firmados a BLOG IA y escribe en la base.
 * MODE=logo   recorta el margen vacío del logo y lo sube al blog (media.upload + settings.update).
 * MODE=unlink deshace el vínculo: publishMethod vuelve a PREVIOUS_METHOD
 *             (BROWSER por defecto) y el blog queda suspendido.
 */
const EMAIL = "lorenalvarez30@gmail.com";
const HOSTNAME = "blogia-lorena.lasolucionweb.net";
const MAIN_SITE = "https://www.segurosdesaludyvida.com";

const mode = (process.env.MODE ?? "plan").trim();
const previousMethod = (process.env.PREVIOUS_METHOD ?? "BROWSER").trim() as "BROWSER" | "MCP";

function brand() {
  return {
    name: "Seguros de Salud y Vida",
    accentColor: "#0e7490",
    tagline: "Guías y consejos sobre seguros de salud",
    whatsapp: "+1 786 608 8613",
    mainSiteUrl: MAIN_SITE,
    nav: [{ label: "Inicio", href: MAIN_SITE }],
    footer: [{ title: "Empresa", links: [{ label: "Contacto", href: MAIN_SITE }] }],
    logoUrl:
      "https://boa3xyc4q60bcauj.public.blob.vercel-storage.com/business-logos/cms8cv2f40000x3xauyqqeenc-yHi1UsA45PKYEB1wwCtF9XwOvMnOOH.png",
    owner: {
      name: "Lorena Álvarez",
      role: "Agente de seguros de salud y vida · Doral, Florida",
      photoUrl:
        "https://boa3xyc4q60bcauj.public.blob.vercel-storage.com/profile-photos/cms8cv2f40000x3xauyqqeenc-NBy3XARZd1wTZXQtMpUwS7F6Tnx6uw.jpg",
      bio: "Soy Lorena, agente de seguros licenciada en Doral, Florida. Desde hace más de diez años acompaño a familias hispanas a elegir su seguro de salud, Medicare y vida sin letra pequeña ni sorpresas. En este blog te explico en palabras simples lo que me preguntan cada día.",
      profileUrl: MAIN_SITE,
    },
  };
}

async function main() {
  console.log(`=== BLOG IA · vínculo de prueba · MODE=${mode} ===`);
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, email: true, publishMethod: true, contentLanguage: true },
  });
  if (!user) throw new Error(`No existe el usuario ${EMAIL}`);
  const existing = await prisma.blogIaBlog.findUnique({ where: { userId: user.id } });
  const tenantId = existing?.tenantId ?? `t_${user.id}`;
  console.log("Usuario:", JSON.stringify(user));
  console.log("Blog existente:", existing ? JSON.stringify({ tenantId: existing.tenantId, hostname: existing.hostname, status: existing.status }) : "ninguno");
  console.log(`Plan: tenant ${tenantId} · host ${HOSTNAME} · publishMethod ${user.publishMethod} -> ${mode === "unlink" ? previousMethod : "BLOG"}`);

  if (mode === "plan") {
    console.log("MODE=plan: no se escribió nada.");
    return;
  }

  const apiUrl = process.env.BLOG_IA_API_URL;
  const secret = process.env.BLOG_IA_SECRET;
  if (!apiUrl || !secret) throw new Error("Faltan BLOG_IA_API_URL / BLOG_IA_SECRET");
  const cfg = { apiUrl, secret };

  if (mode === "logo") {
    if (!existing) throw new Error("El blog aún no existe: ejecuta MODE=link primero");
    const source = brand().logoUrl;
    const res = await fetch(source);
    if (!res.ok) throw new Error(`No se pudo bajar el logo (${res.status})`);
    const input = Buffer.from(await res.arrayBuffer());
    // Recorta el margen transparente/blanco (el dibujo ocupaba ~58 % de la altura) y deja 6 px de aire.
    const trimmed = await sharp(input).trim({ threshold: 10 }).extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 255, g: 255, b: 255, alpha: 0 } }).resize({ width: 640, withoutEnlargement: true }).png().toBuffer();
    const meta = await sharp(trimmed).metadata();
    console.log(`Logo recortado: ${meta.width}x${meta.height} (${trimmed.length} bytes)`);
    const mediaId = `logo-${existing.userId}-v2`.toLowerCase();
    const up = await sendBlogIaEvent(cfg, {
      eventId: `logo-media-${mediaId}`,
      type: "media.upload",
      tenantId,
      data: { id: mediaId, mime: "image/png", data_base64: trimmed.toString("base64"), alt: "Logo de Seguros de Salud y Vida" },
    });
    console.log("media.upload:", up.result);
    const logoUrl = `https://${existing.hostname}/media/${mediaId}`;
    const set = await sendBlogIaEvent(cfg, { eventId: `logo-settings-${mediaId}`, type: "blog.settings.update", tenantId, data: { brand: { logoUrl } } });
    console.log("blog.settings.update:", set.result, logoUrl);
    await prisma.blogIaBlog.update({ where: { userId: user.id }, data: { config: { ...brand(), logoUrl } } });
    return;
  }

  if (mode === "unlink") {
    if (existing) {
      await sendBlogIaEvent(cfg, { eventId: `unlink-${Date.now()}`, type: "blog.subscription.suspend", tenantId, data: {} });
      await prisma.blogIaBlog.update({ where: { userId: user.id }, data: { status: "suspended" } });
    }
    await prisma.user.update({ where: { id: user.id }, data: { publishMethod: previousMethod } });
    console.log("Vínculo deshecho.");
    return;
  }
  if (mode !== "link") throw new Error(`MODE desconocido: ${mode}`);

  const language = user.contentLanguage?.trim() || "es";
  const provisioned = await sendBlogIaEvent(cfg, {
    eventId: `link-provision-${tenantId}`,
    type: "blog.provision",
    tenantId,
    data: { seo_total_account_id: user.id, hostname: HOSTNAME, site_url: MAIN_SITE, language, brand: brand() },
  });
  console.log("blog.provision:", provisioned.result);
  const domain = await sendBlogIaEvent(cfg, {
    eventId: `link-domain-${tenantId}`,
    type: "blog.domain.change",
    tenantId,
    data: { hostname: HOSTNAME, verification_status: "verified", tls_status: "ready", make_primary: true },
  });
  console.log("blog.domain.change:", domain.result);

  const now = new Date();
  await prisma.blogIaBlog.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tenantId, hostname: HOSTNAME, status: "active", config: brand(), provisionedAt: now, dnsVerified: true, tlsReady: true, activatedAt: now },
    update: { hostname: HOSTNAME, status: "active", config: brand(), provisionedAt: now, dnsVerified: true, tlsReady: true, activatedAt: now, lastError: null },
  });
  await prisma.user.update({ where: { id: user.id }, data: { publishMethod: "BLOG" } });
  console.log(`Listo. publishMethod anterior: ${user.publishMethod} (para deshacer: MODE=unlink PREVIOUS_METHOD=${user.publishMethod}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

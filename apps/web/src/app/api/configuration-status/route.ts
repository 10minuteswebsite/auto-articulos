import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { platformHelpUrl } from "@auto-articulos/shared";
import { resolveSearchConsoleForUser } from "@/lib/composio-search-console-consumer";
import { hasProductAccess } from "@/lib/product-access";

interface ConfigurationCheck {
  id: string;
  label: string;
  configured: boolean;
  required: boolean;
  section: "platform" | "seo" | "social" | "content";
  description: string;
  actionUrl: string;
  actionLabel: string;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const userId = await getCurrentUserId();
  const account = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true, platformDomain: true } });
  const productName = account.platformDomain === "tagcrush" ? "tu plataforma" : "10minutesWebsite";

  // Parallel queries for performance
  const [
    credential,
    categories,
    user,
    googleIntegration,
    googleAnalyticsIntegration,
    bingIntegration,
    businessProfile,
    postPeerBusinessProfile,
    threadsIntegration,
    postPeerThreads,
    twitterIntegration,
    linkedinIntegration,
    pinterestIntegration,
    tumblrIntegration,
    blueskyIntegration,
    devToIntegration,
    bloggerIntegration,
  ] = await Promise.all([
    // 1. Credenciales 10minutesWebsite
    prisma.credential.findUnique({
      where: { userId_platform: { userId, platform: "10minutesWebsite" } },
      select: { updatedAt: true },
    }),
    // 2. Categorías sincronizadas
    prisma.category.findMany({
      where: { userId, source: { not: "archived" } },
      select: { id: true },
    }),
    // 3. Datos del usuario (idioma, firma, teléfono)
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        contentLanguage: true,
        articleSignature: true,
        phone: true,
        imagePrompt: true,
        hasImageCredits: true,
        role: true,
        clientLocations: true,
        businessLocations: true,
        excludedTopics: true,
        allowPinterestPublishing: true,
        allowTumblrPublishing: true,
        allowBlueskyPublishing: true,
        allowDevToPublishing: true,
        allowBloggerPublishing: true,
      },
    }),
    // 4. Google Search Console
    prisma.searchIntegration.findFirst({
      where: { userId, provider: "google", ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}) },
      select: { siteUrl: true, sitemapUrl: true, lastAccessError: true },
    }),
    // 5. Google Analytics 4
    prisma.searchIntegration.findFirst({
      where: { userId, provider: "google-analytics", ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}) },
      select: { siteUrl: true, encryptedRefreshToken: true },
    }),
    // 6. Bing Webmaster Tools
    prisma.searchIntegration.findFirst({
      where: { userId, provider: "bing", ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}) },
      select: { siteUrl: true, sitemapUrl: true },
    }),
    // 6. Google Business Profile
    prisma.businessProfileIntegration.findUnique({
      where: { userId },
      select: { locationName: true },
    }),
    prisma.postPeerConnection.findUnique({
      where: { userId },
      select: { status: true },
    }),
    // 7. Meta Threads
    prisma.threadsIntegration.findUnique({
      where: { userId },
      select: { expiresAt: true },
    }),
    prisma.postPeerSocialConnection.findUnique({
      where: { userId_platform: { userId, platform: "threads" } },
      select: { status: true },
    }),
    // 8-9. Instagram/Facebook se consultan abajo exclusivamente por Composio.
    // Las integraciones Meta directas permanecen en sus rutas y en el worker
    // como legado, pero no deben marcar esta lista como conectada.
    // 10. X/Twitter
    prisma.twitterIntegration.findUnique({
      where: { userId },
      select: { expiresAt: true },
    }),
    // 9. LinkedIn
    prisma.linkedInIntegration.findUnique({
      where: { userId },
      select: { expiresAt: true },
    }),
    prisma.pinterestIntegration.findUnique({
      where: { userId },
      select: { expiresAt: true, boardId: true },
    }),
    prisma.tumblrIntegration.findUnique({
      where: { userId },
      select: { expiresAt: true, blogSelectionPending: true },
    }),
    prisma.blueskyIntegration.findUnique({
      where: { userId },
      select: { handle: true },
    }),
    prisma.devToIntegration.findUnique({
      where: { userId },
      select: { username: true },
    }),
    prisma.bloggerIntegration.findUnique({
      where: { userId },
      select: { blogName: true },
    }),
  ]);

  const [resolvedSearchConsole, analyticsComposioConnection, composioSocialConnections] = await Promise.all([
    resolveSearchConsoleForUser(userId, account.selectedSiteDomain ?? ""),
    prisma.composioConnection.findFirst({
      where: {
        userId,
        app: "google_analytics",
        status: "ACTIVE",
        ...(account.selectedSiteDomain ? { OR: [{ siteDomain: account.selectedSiteDomain }, { siteDomain: "" }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: { propertyId: true, siteUrl: true },
    }),
    prisma.composioConnection.findMany({
      where: { userId, app: { in: ["instagram", "facebook"] }, status: "ACTIVE", siteDomain: "" },
      orderBy: { updatedAt: "desc" },
      select: { app: true, pageId: true, igAccountId: true },
    }),
  ]);
  const redesAccess = (await hasProductAccess(userId, "REDES")).allowed;
  const searchConsoleConfigured = Boolean(googleIntegration?.siteUrl) || (
    resolvedSearchConsole.source === "COMPOSIO" && Boolean(resolvedSearchConsole.state.composio?.siteUrl)
  );
  const hasLegacyGoogleAnalytics = Boolean(googleAnalyticsIntegration?.siteUrl && googleAnalyticsIntegration.encryptedRefreshToken);
  const hasActiveComposioAnalytics = Boolean(analyticsComposioConnection?.propertyId || analyticsComposioConnection?.siteUrl);
  const composioInstagram = composioSocialConnections.find((connection) => connection.app === "instagram");
  const composioFacebook = composioSocialConnections.find((connection) => connection.app === "facebook");
  const hasActiveComposioInstagram = Boolean(composioInstagram?.igAccountId);
  const hasActiveComposioFacebook = Boolean(composioFacebook?.pageId);

  const checks: ConfigurationCheck[] = [
    // ━━━ MÍNIMO PARA PUBLICAR ━━━
    {
      id: "credentials",
      label: `Credenciales de ${productName}`,
      configured: Boolean(credential),
      required: true,
      section: "platform",
      description: `Tu usuario y contraseña de ${productName} para publicar artículos automáticamente.`,
      actionUrl: "/dashboard/configuracion?tab=platform#credentials",
      actionLabel: "Configurar credenciales",
    },
    {
      id: "categories",
      label: "Categorías sincronizadas",
      configured: categories.length > 0,
      required: true,
      section: "platform",
      description: `Al menos una categoría sincronizada desde ${productName} para clasificar tus artículos.`,
      actionUrl: "/dashboard/configuracion?tab=platform#categories",
      actionLabel: "Sincronizar categorías",
    },
    {
      id: "language",
      label: "Idioma de redacción",
      configured: Boolean(user?.contentLanguage),
      required: true,
      section: "platform",
      description: "El idioma en que la IA redactará tus artículos (español, inglés, etc.).",
      actionUrl: "/dashboard/configuracion?tab=platform#language",
      actionLabel: "Seleccionar idioma",
    },
    {
      id: "image-credits",
      label: "Créditos de imagen",
      configured: Boolean(user?.hasImageCredits ?? true),
      required: true,
      section: "platform",
      description: `Disponibilidad de créditos de generación de imágenes con IA en ${productName}.`,
      actionUrl: platformHelpUrl(account.platformDomain) ?? "#",
      actionLabel: "Solicitar créditos de imagen",
    },

    // ━━━ SEO ━━━
    {
      id: "google-search-console",
      label: "Google Search Console",
      configured: searchConsoleConfigured,
      required: false,
      section: "seo",
      description: "Conecta tu sitio a Google Search Console para indexar artículos y enviar sitemaps automáticamente.",
      actionUrl: "/dashboard/configuracion/conexiones?conexion=google-search-console",
      actionLabel: "Conectar Search Console",
    },
    {
      id: "google-analytics",
      label: "Google Analytics",
      configured: Boolean((googleAnalyticsIntegration?.siteUrl && googleAnalyticsIntegration.encryptedRefreshToken) || hasActiveComposioAnalytics),
      required: false,
      section: "seo",
      description: "Conecta Google Analytics para que SEO TOTAL use datos reales de visitas al proponer contenidos.",
      actionUrl: "/dashboard/configuracion/conexiones?conexion=google-analytics",
      actionLabel: "Configurar Google Analytics",
    },
    {
      id: "bing-webmaster",
      label: "Bing Webmaster Tools",
      configured: Boolean(bingIntegration?.siteUrl),
      required: false,
      section: "seo",
      description: "Conecta tu sitio a Bing Webmaster Tools para indexar artículos en Bing automáticamente.",
      actionUrl: "/dashboard/configuracion?tab=integrations#bing",
      actionLabel: "Conectar Bing",
    },

    // ━━━ REDES SOCIALES ━━━
    {
      id: "business-profile",
      label: "Google Business Profile",
      configured: Boolean(businessProfile?.locationName || postPeerBusinessProfile?.status === "ACTIVE"),
      required: false,
      section: "social",
      description: "Publica automáticamente tus artículos como posts en tu perfil de negocio de Google.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Business Profile",
    },
    {
      id: "instagram",
      label: "Instagram",
      configured: hasActiveComposioInstagram,
      required: false,
      section: "social",
      description: "Publica automáticamente artículos e imágenes en tu cuenta profesional de Instagram mediante Composio.",
      actionUrl: "/dashboard/configuracion/conexiones?conexion=instagram",
      actionLabel: "Conectar Instagram",
    },
    {
      id: "facebook",
      label: "Facebook",
      configured: hasActiveComposioFacebook,
      required: false,
      section: "social",
      description: "Publica automáticamente contenido en la Página de Facebook conectada mediante Composio.",
      actionUrl: "/dashboard/configuracion/conexiones?conexion=facebook",
      actionLabel: "Conectar Facebook",
    },
    {
      id: "threads",
      label: "Meta Threads",
      configured: Boolean((threadsIntegration && threadsIntegration.expiresAt > new Date()) || postPeerThreads?.status === "ACTIVE"),
      required: false,
      section: "social",
      description: "Publica automáticamente hilos en Threads con tus artículos.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Threads",
    },
    {
      id: "twitter",
      label: "X / Twitter",
      configured: Boolean(twitterIntegration && twitterIntegration.expiresAt > new Date()),
      required: false,
      section: "social",
      description: "Publica automáticamente tweets con tus artículos.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar X/Twitter",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      configured: Boolean(linkedinIntegration && linkedinIntegration.expiresAt > new Date()),
      required: false,
      section: "social",
      description: "Publica automáticamente artículos en tu perfil o página de LinkedIn.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar LinkedIn",
    },
    {
      id: "pinterest",
      label: "Pinterest",
      configured: Boolean(redesAccess && pinterestIntegration && pinterestIntegration.boardId && (!pinterestIntegration.expiresAt || pinterestIntegration.expiresAt > new Date())),
      required: false,
      section: "social",
      description: "Publica automáticamente tus artículos como Pins con imagen y enlace al artículo.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Pinterest",
    },
    {
      id: "tumblr",
      label: "Tumblr",
      configured: Boolean(tumblrIntegration && !tumblrIntegration.blogSelectionPending && (!tumblrIntegration.expiresAt || tumblrIntegration.expiresAt > new Date())),
      required: false,
      section: "social",
      description: "Publica automáticamente tus artículos con imagen, texto y enlace en Tumblr.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Tumblr",
    },
    {
      id: "bluesky",
      label: "Bluesky",
      configured: Boolean(blueskyIntegration?.handle),
      required: false,
      section: "social",
      description: "Publica automáticamente tus artículos en Bluesky.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Bluesky",
    },
    {
      id: "devto",
      label: "DEV.to",
      configured: Boolean(devToIntegration),
      required: false,
      section: "social",
      description: "Publica una versión adaptada del artículo con enlace canónico en DEV.to.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar DEV.to",
    },
    {
      id: "blogger",
      label: "Blogger",
      configured: Boolean(bloggerIntegration),
      required: false,
      section: "social",
      description: "Publica entradas de tus artículos en el blog de Blogger conectado.",
      actionUrl: "/dashboard/configuracion?tab=social",
      actionLabel: "Conectar Blogger",
    },

    // ━━━ CONTENIDO ━━━
    {
      id: "phone",
      label: "Teléfono de contacto",
      configured: Boolean(user?.phone),
      required: false,
      section: "content",
      description: "Número de teléfono que aparecerá en botones de WhatsApp y llamada en tus artículos.",
      actionUrl: "/dashboard/configuracion/contenido",
      actionLabel: "Agregar teléfono",
    },
    {
      id: "signature",
      label: "Footer / disclosure del artículo",
      configured: Boolean(user?.articleSignature),
      required: false,
      section: "content",
      description: "Texto que se agregará automáticamente al final de cada artículo.",
      actionUrl: "/dashboard/configuracion/contenido",
      actionLabel: "Crear firma",
    },
    {
      id: "excluded-topics",
      label: "Qué no decir en los artículos",
      configured: Boolean(user?.excludedTopics?.trim()),
      required: false,
      section: "content",
      description: "Temas o palabras que la publicación inteligente debe evitar al proponer artículos.",
      actionUrl: "/dashboard/configuracion/contenido",
      actionLabel: "Configurar temas a evitar",
    },
    {
      id: "geolocation",
      label: "Ubicaciones para geolocalización",
      configured: Boolean(user?.clientLocations?.trim() && user?.businessLocations?.trim()),
      required: false,
      section: "content",
      description: "Indica dónde están tus clientes y dónde opera tu negocio para crear títulos más relevantes por ubicación.",
      actionUrl: "/dashboard/configuracion/contenido",
      actionLabel: "Configurar ubicaciones",
    },
  ];

  const hasActiveComposioSearchConsole = Boolean(
    resolvedSearchConsole.state.composio?.status === "ACTIVE" &&
      resolvedSearchConsole.state.composio.hasSelection,
  );

  // Interruptor del aviso rojo de reconexión: apagado por defecto. "all" lo muestra a todos;
  // una lista de IDs separada por comas lo limita a un piloto. Se apaga quitando la variable.
  const reconnectNotice = (process.env.COMPOSIO_RECONNECT_NOTICE ?? "").trim();
  const showReconnectNotice =
    reconnectNotice === "all" ||
    reconnectNotice.split(",").map((id) => id.trim()).filter(Boolean).includes(userId);

  // El aviso es solo para quien YA tenía Search Console por la vía anterior; una cuenta nueva,
  // en su arranque inicial, conecta por el asistente y no debe ver «reconectar».
  const hasLegacyGoogleSearchConsole = Boolean(googleIntegration?.siteUrl);
  const needsSearchConsoleReconnect = hasLegacyGoogleSearchConsole && !hasActiveComposioSearchConsole;

  // Mismo aviso rojo de "Reconectar Search Console", segunda causa posible
  // (pedido de Milton, 1/10/2026: unificar protocolo): no es la migración a
  // Composio pendiente, es que el último uso REAL de la conexión actual
  // falló con un error concreto de Google (ver lastAccessError, grabado por
  // POST /api/opportunities). A diferencia del aviso de migración, este no
  // depende del interruptor piloto `showReconnectNotice`: es un estado roto
  // real, no una campaña de migración, y debe verlo cualquier cuenta
  // afectada.
  const hasRealAccessError = Boolean(googleIntegration?.lastAccessError);

  if (hasRealAccessError) {
    checks.push({
      id: "google-search-console-reconnect",
      label: "Reconectar Google Search Console",
      configured: false,
      required: false,
      section: "seo",
      description: `Google Search Console respondió con un error al usar esta conexión: ${googleIntegration!.lastAccessError}`,
      actionUrl: "/dashboard/configuracion/conexiones?conexion=google-search-console&reconectar=1",
      actionLabel: "Reconectar Search Console",
    });
  }

  if (!showReconnectNotice) {
    // Aviso de migración a Composio apagado: no se agrega otra solicitud.
  } else if (needsSearchConsoleReconnect) {
    if (!hasRealAccessError) {
      checks.push({
        id: "google-search-console-reconnect",
        label: "Reconectar Google Search Console",
        configured: false,
        required: false,
        section: "seo",
        description: "Debes reconectar Google Search Console mediante Conexiones.",
        actionUrl: "/dashboard/configuracion/conexiones?conexion=google-search-console&reconectar=1",
        actionLabel: "Reconectar Search Console",
      });
    }
  } else if (hasLegacyGoogleAnalytics && !hasActiveComposioAnalytics) {
    checks.push({
      id: "google-analytics-reconnect",
      label: "Reconectar Google Analytics",
      configured: false,
      required: false,
      section: "seo",
      description: "Debes reconectar Google Analytics mediante Conexiones.",
      actionUrl: "/dashboard/configuracion/conexiones?conexion=google-analytics&reconectar=1",
      actionLabel: "Reconectar Analytics",
    });
  }

  const requiredTotal = checks.filter((c) => c.required).length;
  const requiredConfigured = checks.filter((c) => c.required && c.configured).length;
  const totalConfigured = checks.filter((c) => c.configured).length;
  const isFullyConfigured = requiredConfigured === requiredTotal;

  return NextResponse.json({
    checks,
    summary: {
      requiredTotal,
      requiredConfigured,
      totalChecks: checks.length,
      totalConfigured,
      isFullyConfigured,
      percentage: Math.round((totalConfigured / checks.length) * 100),
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import {
  IMPERSONATION_COOKIE,
  HUB_SESSION_CONTEXT_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
  verifyMcpAccessToken,
  verifyImpersonationToken,
  verifyHubSessionContextToken,
  verifySessionToken,
} from "./lib/session";
import { applyCookie } from "./lib/shared-cookies";
import { MCP_API_TOKEN_PREFIX } from "./lib/mcp/api-token-prefix";
import { productOfApiPath, productOfHost, productOfPath, type HostProductScope } from "./lib/product-routes";

const PUBLIC_PATHS = [
  "/login",
  "/acerca-de",
  "/privacidad",
  "/terminos",
  "/api/auth/login",
  "/api/auth/trial-signup",
  "/auth/hub",
  "/api/debug/instagram-errors",
  "/api/debug/activate-instagram",
  "/api/oauth2/authorize",
  "/api/oauth2/token",
  "/.well-known/oauth-authorization-server",
  // Documento de descubrimiento OAuth del servidor MCP: por definición se
  // consulta SIN token (es lo que le dice al cliente dónde autenticarse).
  "/.well-known/oauth-protected-resource",
  // Ruta nodejs auxiliar que el propio middleware llama por `fetch` para
  // resolver tokens personales (ver handleMcpAuth) — no lleva cookie de
  // sesión, así que no puede pasar por el gate de abajo. No expone nada sin
  // un Bearer `sta_` válido.
  "/api/mcp/token-lookup",
];

/** Endpoint del servidor MCP; se autentica con Bearer, no con cookie. */
const MCP_PATH = "/api/mcp";
const TUMBLR_CALLBACK_PATH = "/api/search-integrations/tumblr/callback";
const TUMBLR_CANONICAL_ORIGIN = "https://redes.lasolucionweb.net";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
};

function hubProductSlugForHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "redes.lasolucionweb.net" || host === "redes.lasolucionweb.com"
    ? "auto-redes"
    : "seo-total";
}
const LEGACY_LOGIN_HOST = "auto-articulos-web.vercel.app";
const CANONICAL_LOGIN_URL = "https://www.seototal.lasolucionweb.com/login";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Tumblr OAuth1 puede devolver al callback predeterminado de Vercel. Solo
  // ese callback en un host no canónico puede pasar sin sesión para que la
  // ruta lo redirija al dominio del Hub; en el .net la autenticación normal
  // agrega x-user-id antes de ejecutar el callback.
  if (pathname === TUMBLR_CALLBACK_PATH && request.nextUrl.origin !== TUMBLR_CANONICAL_ORIGIN) {
    return NextResponse.next();
  }

  // El alias antiguo de Vercel sigue recibiendo enlaces guardados y marcadores.
  // Redirigir solo ese host evita afectar al login del dominio canónico y
  // conserva query params como `returnTo` para no perder el flujo de acceso.
  if (request.nextUrl.hostname === LEGACY_LOGIN_HOST && pathname === "/login") {
    const destination = new URL(CANONICAL_LOGIN_URL);
    destination.search = request.nextUrl.search;
    return NextResponse.redirect(destination, 308);
  }

  if (
    PUBLIC_PATHS.some((path) => pathname === path) ||
    pathname.startsWith("/_next") ||
    /\.(jpg|jpeg|png|webp|gif|svg|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // El servidor MCP lo consumen clientes sin navegador (Alexa+, Claude), que
  // no tienen cookies: mandan `Authorization: Bearer`. Se resuelve acá y no
  // dentro de la ruta para que la ruta reciba `x-user-id` igual que cualquier
  // ruta protegida — así los route handlers que reutiliza el MCP siguen
  // funcionando sin cambios.
  if (pathname === MCP_PATH) {
    if (!isAllowedMcpOrigin(request)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }
    return handleMcpAuth(request);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);

  if (!userId) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401, headers: NO_CACHE_HEADERS },
      );
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname === "/oauth/autorizar") {
      loginUrl.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
    }
    const response = NextResponse.redirect(loginUrl);
    Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }

  // Primero se autentica la petición. Sin sesión, una URL cruzada conserva la
  // respuesta 401 esperada por los clientes y por el smoke test; con sesión,
  // la frontera devuelve 404/redirección antes de que pueda leer o mutar datos
  // del otro producto.
  const productBoundary = productBoundaryResponse(request);
  if (productBoundary) return productBoundary;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", userId);
  requestHeaders.set("x-hub-product-slug", hubProductSlugForHost(request.nextUrl.hostname));

  const hubContext = await verifyHubSessionContextToken(
    request.cookies.get(HUB_SESSION_CONTEXT_COOKIE)?.value,
  );
  if (hubContext?.targetUserId === userId) {
    requestHeaders.set("x-hub-authenticated", "1");
    if (hubContext.actorUserId) requestHeaders.set("x-hub-acting-admin-id", hubContext.actorUserId);
    if (hubContext.actorEmail) requestHeaders.set("x-hub-acting-admin-email", hubContext.actorEmail);
    if (hubContext.actorName) requestHeaders.set("x-hub-acting-admin-name", hubContext.actorName);
  }

  const impersonationToken = request.cookies.get(IMPERSONATION_COOKIE)?.value;
  const impersonation = await verifyImpersonationToken(impersonationToken);
  if (impersonation && impersonation.adminUserId === userId) {
    requestHeaders.set("x-user-id", impersonation.targetUserId);
    requestHeaders.set("x-acting-admin-id", impersonation.adminUserId);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // El dashboard y sus datos son siempre sensibles al estado actual de la
  // cuenta. Impedir el almacenamiento en navegador, CDN y proxies evita que
  // una versión anterior del menú o de los permisos sobreviva a un despliegue.
  Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => response.headers.set(key, value));

  // Sliding session: si queda menos de la mitad del TTL, renueva expiración
  // para que sesiones activas no caduquen. Costo: una operación HMAC cada
  // ~3.5 días por sesión, irrelevante.
  // Sliding session con protección contra fallos en Edge Runtime
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const expiresStr = parts[1];
        const remaining = Number(expiresStr) - Date.now();
        if (remaining > 0 && remaining < SESSION_TTL_MS / 2) {
          const newToken = await createSessionToken(userId);
          applyCookie(response, SESSION_COOKIE, newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: Math.floor(SESSION_TTL_MS / 1000),
          });
        }
      }
    } catch {
      // Ignorar errores de renovación de sesión para no romper el request
    }
  }

  return response;
}

/** Bloquea fugas por URL directa entre los dos subdominios de producto. */
function productBoundaryResponse(request: NextRequest): NextResponse | null {
  const hostProduct = productOfHost(request.headers.get("host"));
  if (hostProduct === "COMPARTIDO") return null;

  const scope = request.nextUrl.pathname.startsWith("/api/")
    ? productOfApiPath(request.nextUrl.pathname)
    : productOfPath(request.nextUrl.pathname);
  if (scope === "COMPARTIDO" || scope === "ADMIN" || scope === hostProduct) return null;

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Esta ruta pertenece al otro producto." },
      { status: 404, headers: NO_CACHE_HEADERS },
    );
  }

  const target = new URL(hostProductDashboard(hostProduct), request.url);
  target.search = "";
  return NextResponse.redirect(target);
}

function hostProductDashboard(product: HostProductScope): string {
  return product === "REDES" ? "/dashboard/redes" : "/dashboard/articulos";
}

/**
 * Autenticación del endpoint MCP.
 *
 * FASE 1: sigue aceptando el Bearer de sesión firmado para pruebas manuales.
 * FASE 2: acepta access tokens OAuth `mcp.*` de vida corta para Alexa+.
 *
 * FASE 2 (pendiente): Alexa+ exige OAuth 2.1 con PKCE S256 y refresh tokens.
 * Cuando exista el authorization server, acá se cambia `verifySessionToken`
 * por la verificación del access token de OAuth. El resto del MCP no se
 * entera: sigue recibiendo `x-user-id`.
 *
 * Alexa+ exige que el 401 no incluya `WWW-Authenticate`; descubre el recurso
 * protegido mediante el documento `.well-known` de forma independiente. Por
 * eso esta respuesta se mantiene deliberadamente sin esa cabecera.
 */
async function handleMcpAuth(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  let userId: string | null = null;
  let scopes = ["oportunidades:leer", "oportunidades:publicar"];

  if (bearer?.startsWith(MCP_API_TOKEN_PREFIX)) {
    // Token personal de API (Configuración → Asistentes IA): es el propio
    // dueño de la cuenta operando sus propios datos con cualquier asistente
    // (Claude, ChatGPT, Meta MUSE, etc.), no un cliente de terceros con
    // permisos acotados — por eso lleva todos los scopes existentes.
    userId = await resolvePersonalToken(request, bearer);
  } else {
    const oauth = await verifyMcpAccessToken(bearer);
    const sessionUserId = oauth ? null : await verifySessionToken(bearer);
    userId = oauth?.userId ?? sessionUserId;
    // Los Bearer de sesión solo se mantienen para la prueba manual heredada;
    // conservan el comportamiento previo. Los OAuth quedan limitados a los
    // scopes firmados durante el account linking.
    if (oauth) scopes = oauth.scopes;
  }

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", userId);
  requestHeaders.set("x-mcp-scopes", scopes.join(" "));
  // Deliberadamente NO se propaga la suplantación de admin: un token de
  // máquina no debería poder operar la cuenta de otro usuario por voz.
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * El token personal se verifica por hash contra la base (para poder
 * revocarlo desde Configuración) y Prisma no corre en el Edge Runtime del
 * middleware — se resuelve con un `fetch` interno, server a server, a
 * `/api/mcp/token-lookup` (nodejs). Mismo patrón que recomienda Vercel para
 * este split edge/node.
 */
async function resolvePersonalToken(request: NextRequest, bearer: string): Promise<string | null> {
  try {
    const response = await fetch(new URL("/api/mcp/token-lookup", request.url), {
      method: "POST",
      headers: { authorization: `Bearer ${bearer}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { userId?: string };
    return data.userId ?? null;
  } catch {
    return null;
  }
}

/**
 * Streamable HTTP exige bloquear Origins ajenos cuando el header está presente
 * para evitar que una web maliciosa use el navegador como puente hacia el MCP.
 * Los clientes server-to-server, como Alexa+, no envían Origin y se permiten.
 */
function isAllowedMcpOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

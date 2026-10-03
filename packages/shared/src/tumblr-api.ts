import { truncatePlainCaption } from "./caption-limits";
import { createHmac, randomBytes } from "crypto";

const TUMBLR_API = "https://api.tumblr.com/v2";

// Límite oficial de un bloque de texto NPF: 4096 code points de Unicode.
// https://github.com/tumblr/docs/blob/master/npf-spec.md
const TUMBLR_TEXT_BLOCK_MAX_CHARS = 4096;

export interface TumblrAppCredentials {
  clientId: string;
  clientSecret: string;
}

export interface TumblrOAuth1Token {
  oauthToken: string;
  oauthTokenSecret: string;
}

export interface TumblrOAuth1AccessToken extends TumblrOAuth1Token {}

const TUMBLR_OAUTH1_REQUEST_TOKEN_URL = "https://www.tumblr.com/oauth/request_token";
const TUMBLR_OAUTH1_AUTHORIZE_URL = "https://www.tumblr.com/oauth/authorize";
const TUMBLR_OAUTH1_ACCESS_TOKEN_URL = "https://www.tumblr.com/oauth/access_token";
// Tumblr exige un User-Agent consistente para todas las llamadas de la API.
const TUMBLR_USER_AGENT = "La Solucion IA SEO TOTAL/1.0 (+https://hub.lasolucionweb.net)";

function encodeOAuth(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function parseFormEncoded(value: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(value).entries());
}

function normalizedRequestUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const port = url.port && !((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) ? `:${url.port}` : "";
  return `${url.protocol}//${url.hostname}${port}${url.pathname || "/"}`;
}

function signatureParameters(rawUrl: string, oauthParameters: Record<string, string>, bodyParameters: Record<string, string> = {}): string {
  const url = new URL(rawUrl);
  const pairs: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => pairs.push([key, value]));
  Object.entries(oauthParameters).forEach(([key, value]) => pairs.push([key, value]));
  Object.entries(bodyParameters).forEach(([key, value]) => pairs.push([key, value]));
  return pairs
    .map(([key, value]) => [encodeOAuth(key), encodeOAuth(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function oauthHeader(
  method: string,
  rawUrl: string,
  credentials: TumblrAppCredentials,
  token?: TumblrOAuth1Token,
  extraOAuthParameters: Record<string, string> = {},
  bodyParameters: Record<string, string> = {},
): string {
  const oauthParameters: Record<string, string> = {
    oauth_consumer_key: credentials.clientId,
    oauth_nonce: randomBytes(18).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
    ...(token ? { oauth_token: token.oauthToken } : {}),
    ...extraOAuthParameters,
  };
  const baseString = [
    method.toUpperCase(),
    encodeOAuth(normalizedRequestUrl(rawUrl)),
    encodeOAuth(signatureParameters(rawUrl, oauthParameters, bodyParameters)),
  ].join("&");
  const signingKey = `${encodeOAuth(credentials.clientSecret)}&${encodeOAuth(token?.oauthTokenSecret ?? "")}`;
  oauthParameters.oauth_signature = createHmac("sha1", signingKey).update(baseString).digest("base64");
  return `OAuth ${Object.entries(oauthParameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeOAuth(key)}="${encodeOAuth(value)}"`)
    .join(", ")}`;
}

function requireOAuth1Response(value: string, label: string): TumblrOAuth1Token {
  const parsed = parseFormEncoded(value);
  if (!parsed.oauth_token || !parsed.oauth_token_secret) throw new Error(`Tumblr no devolvió un token OAuth1 válido al ${label}.`);
  return { oauthToken: parsed.oauth_token, oauthTokenSecret: parsed.oauth_token_secret };
}

/** Solicita el token temporal OAuth1 que precede a la autorización del usuario. */
export async function requestTumblrRequestToken(credentials: TumblrAppCredentials): Promise<TumblrOAuth1Token> {
  const response = await fetch(TUMBLR_OAUTH1_REQUEST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: oauthHeader("POST", TUMBLR_OAUTH1_REQUEST_TOKEN_URL, credentials),
      "User-Agent": TUMBLR_USER_AGENT,
    },
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Tumblr no pudo iniciar OAuth1: ${responseText}`);
  return requireOAuth1Response(responseText, "solicitar autorización");
}

export function getTumblrAuthUrl(requestToken: string): string {
  const url = new URL(TUMBLR_OAUTH1_AUTHORIZE_URL);
  url.searchParams.set("oauth_token", requestToken);
  return url.toString();
}

/** Intercambia el token temporal y el verificador por las credenciales permanentes del usuario. */
export async function exchangeTumblrAccessToken(
  requestToken: TumblrOAuth1Token,
  verifier: string,
  credentials: TumblrAppCredentials,
): Promise<TumblrOAuth1AccessToken> {
  const parameters = { oauth_verifier: verifier };
  const response = await fetch(TUMBLR_OAUTH1_ACCESS_TOKEN_URL, {
    method: "GET",
    headers: {
      Authorization: oauthHeader("GET", TUMBLR_OAUTH1_ACCESS_TOKEN_URL, credentials, requestToken, parameters),
      "User-Agent": TUMBLR_USER_AGENT,
    },
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Tumblr no pudo completar OAuth1: ${responseText}`);
  return requireOAuth1Response(responseText, "intercambiar el token");
}

/** Renueva el token de Tumblr sin obligar al usuario a repetir OAuth. */
export async function refreshTumblrToken(
  refreshToken: string,
  credentials: TumblrAppCredentials,
) {
  const response = await fetch(`${TUMBLR_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });
  if (!response.ok) throw new Error(`Tumblr no pudo renovar la autorización: ${await response.text()}`);
  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  }>;
}

export async function getTumblrBlogs(accessToken: string, accessTokenSecret?: string, credentials?: TumblrAppCredentials) {
  const endpoint = `${TUMBLR_API}/user/info`;
  const headers = accessTokenSecret && credentials
    ? {
        Authorization: oauthHeader("GET", endpoint, credentials, { oauthToken: accessToken, oauthTokenSecret: accessTokenSecret }),
        "User-Agent": TUMBLR_USER_AGENT,
      }
    : { Authorization: `Bearer ${accessToken}`, "User-Agent": TUMBLR_USER_AGENT };
  const response = await fetch(endpoint, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudieron obtener los blogs de Tumblr: ${await response.text()}`);
  const json = await response.json() as { response?: { user?: { blogs?: Array<{ name: string; title?: string; url?: string }> } } };
  return (json.response?.user?.blogs ?? []).map((blog) => ({
    identifier: blog.name,
    title: blog.title || blog.name,
    url: blog.url || null,
  }));
}

export async function createTumblrPhotoPost(
  accessToken: string,
  blogIdentifier: string,
  payload: { caption: string; link: string; imageUrl: string },
  accessTokenSecret?: string,
  credentials?: TumblrAppCredentials,
) {
  // El link HTML se agrega siempre completo al final; el recorte (si hace
  // falta) se aplica solo al caption, nunca al link. Antes no había ningún
  // límite aplicado (auditoría 31/8/2026).
  const linkHtml = `\n\n<a href="${payload.link}">Leer el artículo completo</a>`;
  const safeCaption = truncatePlainCaption(payload.caption, TUMBLR_TEXT_BLOCK_MAX_CHARS - linkHtml.length);

  const endpoint = `${TUMBLR_API}/blog/${encodeURIComponent(blogIdentifier)}/post`;
  const body = new URLSearchParams({
    type: "photo",
    state: "published",
    source: payload.imageUrl,
    caption: `${safeCaption}${linkHtml}`,
    link: payload.link,
  });
  const headers = accessTokenSecret && credentials
    ? {
        Authorization: oauthHeader("POST", endpoint, credentials, { oauthToken: accessToken, oauthTokenSecret: accessTokenSecret }, {}, Object.fromEntries(body.entries())),
        "User-Agent": TUMBLR_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      }
    : {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": TUMBLR_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      };
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body,
  });
  if (!response.ok) throw new Error(`No se pudo crear el post de Tumblr: ${await response.text()}`);
  return response.json() as Promise<{ response?: { id?: string | number; post_url?: string } }>;
}

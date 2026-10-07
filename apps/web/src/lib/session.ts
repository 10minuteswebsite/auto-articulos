const SESSION_COOKIE = "auto_articulos_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

const IMPERSONATION_COOKIE = "auto_articulos_impersonation";
const HUB_SESSION_CONTEXT_COOKIE = "auto_articulos_hub_context";
// Más corta que la sesión normal: es un estado de acceso elevado (un admin
// operando la cuenta de otro usuario), así que conviene que expire sola
// aunque el admin no la cierre explícitamente.
const IMPERSONATION_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas
const MCP_ACCESS_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hora

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está configurada.");
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(getSecret());
  return crypto.subtle.importKey("raw", enc, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Usa Web Crypto (crypto.subtle) en lugar del módulo "crypto" de Node porque
 * este archivo se importa tanto desde el middleware (Edge Runtime) como desde
 * route handlers (Node runtime), y Web Crypto es la única API común a ambos.
 */
export async function createSessionToken(userId: string): Promise<string> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expires}`;
  const key = await getKey();
  const signatureBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(signatureBuf)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresStr, signature] = parts;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;

  const payload = `${userId}.${expiresStr}`;
  const key = await getKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signature).buffer as ArrayBuffer,
    new TextEncoder().encode(payload)
  );

  return valid ? userId : null;
}

/** Access token OAuth para el recurso MCP, separado del token de cookie web. */
export async function createMcpAccessToken(userId: string, scopes: string[]): Promise<string> {
  const expires = Date.now() + MCP_ACCESS_TOKEN_TTL_MS;
  // Los scopes viajan firmados para que el middleware pueda aplicar el mínimo
  // privilegio en Edge, sin una consulta extra a la base por cada tool call.
  const encodedScopes = toBase64Url(new TextEncoder().encode(scopes.join(" ")).buffer);
  const payload = `mcp.${userId}.${expires}.${encodedScopes}`;
  const signatureBuf = await crypto.subtle.sign("HMAC", await getKey(), new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(signatureBuf)}`;
}

export async function verifyMcpAccessToken(token: string | undefined | null): Promise<{ userId: string; scopes: string[] } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "mcp") return null;
  const [, userId, expiresStr, encodedScopes, signature] = parts;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;
  const payload = `mcp.${userId}.${expiresStr}.${encodedScopes}`;
  const valid = await crypto.subtle.verify("HMAC", await getKey(), fromBase64Url(signature).buffer as ArrayBuffer, new TextEncoder().encode(payload));
  if (!valid) return null;
  try {
    const scopes = new TextDecoder().decode(fromBase64Url(encodedScopes)).split(" ").filter(Boolean);
    return { userId, scopes };
  } catch {
    return null;
  }
}

/**
 * Token de suplantación: permite a un admin operar la cuenta de otro usuario
 * sin cerrar su propia sesión. Va en una cookie separada de SESSION_COOKIE
 * (que sigue identificando al admin real); ver proxy.ts para cómo se
 * combinan. Firmado igual que el token de sesión, pero atado también al
 * adminUserId para que no pueda reutilizarse desde otra cuenta.
 */
export async function createImpersonationToken(
  adminUserId: string,
  targetUserId: string,
): Promise<string> {
  const expires = Date.now() + IMPERSONATION_TTL_MS;
  const payload = `${adminUserId}.${targetUserId}.${expires}`;
  const key = await getKey();
  const signatureBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(signatureBuf)}`;
}

export async function verifyImpersonationToken(
  token: string | undefined | null,
): Promise<{ adminUserId: string; targetUserId: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [adminUserId, targetUserId, expiresStr, signature] = parts;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;

  const payload = `${adminUserId}.${targetUserId}.${expiresStr}`;
  const key = await getKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signature).buffer as ArrayBuffer,
    new TextEncoder().encode(payload)
  );

  return valid ? { adminUserId, targetUserId } : null;
}

export type HubSessionContext = {
  targetUserId: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorName: string | null;
};

/** Contexto firmado que distingue Hub de login nativo y conserva el aviso administrativo. */
export async function createHubSessionContextToken(context: HubSessionContext): Promise<string> {
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(context)).buffer);
  const payload = `hubctx.${encoded}`;
  const signatureBuf = await crypto.subtle.sign("HMAC", await getKey(), new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(signatureBuf)}`;
}

export async function verifyHubSessionContextToken(token: string | undefined | null): Promise<HubSessionContext | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "hubctx") return null;
  const [, encoded, signature] = parts;
  const payload = `hubctx.${encoded}`;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await getKey(),
    fromBase64Url(signature).buffer as ArrayBuffer,
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as Partial<HubSessionContext>;
    if (typeof parsed.targetUserId !== "string" || !parsed.targetUserId) return null;
    return {
      targetUserId: parsed.targetUserId,
      actorUserId: typeof parsed.actorUserId === "string" ? parsed.actorUserId : null,
      actorEmail: typeof parsed.actorEmail === "string" ? parsed.actorEmail : null,
      actorName: typeof parsed.actorName === "string" ? parsed.actorName : null,
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_TTL_MS, IMPERSONATION_COOKIE, IMPERSONATION_TTL_MS, HUB_SESSION_CONTEXT_COOKIE, MCP_ACCESS_TOKEN_TTL_MS };

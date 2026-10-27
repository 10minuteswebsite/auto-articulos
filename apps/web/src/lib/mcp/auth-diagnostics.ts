import { MCP_API_TOKEN_PREFIX } from "./api-token-prefix";

/** Server logs may describe a failed credential, never retain its value. */
export function mcpAuthDiagnostic(authorization: string | null, rayId: string | null) {
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const credential = !authorization
    ? "missing"
    : !bearer
      ? "unsupported_scheme"
      : bearer.startsWith(MCP_API_TOKEN_PREFIX)
        ? "personal"
        : bearer.startsWith("mcp.")
          ? "oauth"
          : "other_bearer";
  return {
    credential,
    ray_id: rayId && /^[a-f0-9]{16}(?:-[A-Z]{3})?$/.test(rayId) ? rayId : null,
  };
}

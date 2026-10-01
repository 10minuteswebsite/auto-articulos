import { createHash, randomBytes } from "crypto";

export const MCP_CONFIRMATION_PREFIX = "mcp_confirm_";
export const MCP_CONFIRMATION_TTL_MS = 10 * 60 * 1000;

export function hashConfirmationToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function operationHash(operation: unknown) {
  return createHash("sha256").update(JSON.stringify(operation)).digest("base64url");
}

export function generateConfirmationToken() {
  return `${MCP_CONFIRMATION_PREFIX}${randomBytes(32).toString("base64url")}`;
}

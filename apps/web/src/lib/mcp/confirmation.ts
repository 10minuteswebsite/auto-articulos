import { prisma } from "@auto-articulos/db";
import {
  generateConfirmationToken,
  hashConfirmationToken,
  MCP_CONFIRMATION_PREFIX,
  MCP_CONFIRMATION_TTL_MS,
  operationHash,
} from "./confirmation-crypto";

export { hashConfirmationToken, operationHash } from "./confirmation-crypto";

export async function issueConfirmation(input: {
  userId: string;
  toolName: string;
  operation: unknown;
}) {
  const token = generateConfirmationToken();
  await prisma.mcpPublishConfirmation.create({
    data: {
      userId: input.userId,
      tokenHash: hashConfirmationToken(token),
      toolName: input.toolName,
      operationHash: operationHash(input.operation),
      expiresAt: new Date(Date.now() + MCP_CONFIRMATION_TTL_MS),
    },
  });
  return token;
}

/**
 * Reclama el comprobante de forma atómica. Así dos llamadas concurrentes con
 * el mismo token no pueden iniciar dos publicaciones.
 */
export async function consumeConfirmation(input: {
  userId: string;
  toolName: string;
  operation: unknown;
  token: unknown;
}) {
  if (typeof input.token !== "string" || !input.token.startsWith(MCP_CONFIRMATION_PREFIX)) return false;
  const result = await prisma.mcpPublishConfirmation.updateMany({
    where: {
      userId: input.userId,
      toolName: input.toolName,
      operationHash: operationHash(input.operation),
      tokenHash: hashConfirmationToken(input.token),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });
  return result.count === 1;
}

export const MCP_CONFIRMATION_TTL_MINUTES = MCP_CONFIRMATION_TTL_MS / 60000;

import { randomUUID } from "crypto";
import { prisma } from "@auto-articulos/db";
import { generateMcpApiToken, hashMcpApiToken } from "./api-token";

type Revision = { id: string; credentialVersion: string | null };
const versionOf = (record: Revision) => record.credentialVersion ?? `${record.id}:legacy`;

export class McpCredentialConflict extends Error {
  constructor(public code: "TOKEN_REPLACEMENT_REQUIRED" | "TOKEN_STATE_CHANGED") {
    super(code === "TOKEN_REPLACEMENT_REQUIRED"
      ? "Ya tienes un token activo. Reemplazarlo desconecta los asistentes que lo usan en Artículos y Redes. Confirma el reemplazo."
      : "El estado del token cambió. Vuelve a consultarlo antes de generar o reemplazar uno.");
  }
}

export async function getMcpCredentialState(userId: string) {
  const record = await prisma.mcpApiToken.findUnique({
    where: { userId },
    select: { id: true, name: true, createdAt: true, issuedAt: true, credentialVersion: true, lastUsedAt: true, revokedAt: true },
  });
  if (!record) return { active: false, version: null };
  return {
    active: record.revokedAt === null,
    name: record.name,
    createdAt: record.createdAt,
    issuedAt: record.issuedAt,
    lastUsedAt: record.lastUsedAt,
    version: versionOf(record),
  };
}

export async function issueMcpCredential(userId: string, input: { name: string; replaceExisting: boolean; expectedVersion?: unknown }) {
  const current = await prisma.mcpApiToken.findUnique({
    where: { userId },
    select: { id: true, tokenHash: true, revokedAt: true, credentialVersion: true },
  });
  if (current && current.revokedAt === null) {
    if (!input.replaceExisting) throw new McpCredentialConflict("TOKEN_REPLACEMENT_REQUIRED");
    if (input.expectedVersion !== versionOf(current)) throw new McpCredentialConflict("TOKEN_STATE_CHANGED");
  }

  const token = generateMcpApiToken();
  const issuedAt = new Date();
  const version = randomUUID();
  const data = { tokenHash: hashMcpApiToken(token), name: input.name, issuedAt, credentialVersion: version, revokedAt: null, lastUsedAt: null };
  if (current) {
    // Compare-and-set: una pestaña o petición concurrente no sustituye una
    // credencial que cambió después de la lectura/confirmación.
    const result = await prisma.mcpApiToken.updateMany({
      where: { id: current.id, userId, tokenHash: current.tokenHash, revokedAt: current.revokedAt },
      data,
    });
    if (result.count !== 1) throw new McpCredentialConflict("TOKEN_STATE_CHANGED");
  } else {
    try {
      // CREATE (no upsert): dos primeras emisiones simultáneas no se pisan.
      await prisma.mcpApiToken.create({ data: { userId, ...data } });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        throw new McpCredentialConflict("TOKEN_STATE_CHANGED");
      }
      throw error;
    }
  }
  return { token, name: input.name, issuedAt, version };
}

export async function revokeMcpCredential(userId: string, expectedVersion: unknown) {
  const current = await prisma.mcpApiToken.findUnique({
    where: { userId },
    select: { id: true, tokenHash: true, revokedAt: true, credentialVersion: true },
  });
  if (!current || current.revokedAt !== null) return;
  if (expectedVersion !== versionOf(current)) throw new McpCredentialConflict("TOKEN_STATE_CHANGED");
  const result = await prisma.mcpApiToken.updateMany({
    where: { id: current.id, userId, tokenHash: current.tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count !== 1) throw new McpCredentialConflict("TOKEN_STATE_CHANGED");
}

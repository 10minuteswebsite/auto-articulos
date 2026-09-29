-- Token personal de API para conectar cualquier asistente de IA (Claude,
-- ChatGPT, Gemini, Meta MUSE, etc.) al servidor MCP propio sin pasar por
-- registro de cliente OAuth. Solo se guarda el hash del token.
CREATE TABLE "McpApiToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Asistente IA',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "McpApiToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "McpApiToken_userId_key" ON "McpApiToken"("userId");
CREATE UNIQUE INDEX "McpApiToken_tokenHash_key" ON "McpApiToken"("tokenHash");

ALTER TABLE "McpApiToken" ADD CONSTRAINT "McpApiToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "McpApiToken" ENABLE ROW LEVEL SECURITY;

-- Confirmaciones de vista previa MCP ligadas a usuario, tool y operación.
-- Solo se almacena el hash del comprobante de un solo uso.
CREATE TABLE "McpPublishConfirmation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "operationHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpPublishConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "McpPublishConfirmation_tokenHash_key" ON "McpPublishConfirmation"("tokenHash");
CREATE INDEX "McpPublishConfirmation_userId_expiresAt_idx" ON "McpPublishConfirmation"("userId", "expiresAt");
CREATE INDEX "McpPublishConfirmation_userId_toolName_operationHash_idx" ON "McpPublishConfirmation"("userId", "toolName", "operationHash");

ALTER TABLE "McpPublishConfirmation" ADD CONSTRAINT "McpPublishConfirmation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "McpPublishConfirmation" ENABLE ROW LEVEL SECURITY;

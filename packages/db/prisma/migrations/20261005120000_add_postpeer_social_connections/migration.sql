-- PostPeer social connections are additive. The existing PostPeerConnection
-- table for Google Business remains untouched so its users keep working.
CREATE TABLE IF NOT EXISTS "PostPeerSocialConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT,
    "status" "PostPeerConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "connectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostPeerSocialConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PostPeerSocialConnection_userId_platform_key"
  ON "PostPeerSocialConnection" ("userId", "platform");
CREATE UNIQUE INDEX IF NOT EXISTS "PostPeerSocialConnection_profileId_platform_key"
  ON "PostPeerSocialConnection" ("profileId", "platform");
CREATE UNIQUE INDEX IF NOT EXISTS "PostPeerSocialConnection_accountId_platform_key"
  ON "PostPeerSocialConnection" ("accountId", "platform");
CREATE INDEX IF NOT EXISTS "PostPeerSocialConnection_userId_idx"
  ON "PostPeerSocialConnection" ("userId");
CREATE INDEX IF NOT EXISTS "PostPeerSocialConnection_status_idx"
  ON "PostPeerSocialConnection" ("status");

DO $$
BEGIN
  ALTER TABLE "PostPeerSocialConnection" ADD CONSTRAINT "PostPeerSocialConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PostPeerSocialConnection" ENABLE ROW LEVEL SECURITY;

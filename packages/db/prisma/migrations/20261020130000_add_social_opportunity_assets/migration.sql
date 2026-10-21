CREATE TABLE "SocialOpportunityAsset" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "assetType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialOpportunityAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialOpportunityAsset_opportunityId_position_assetType_key" ON "SocialOpportunityAsset"("opportunityId", "position", "assetType");
CREATE INDEX "SocialOpportunityAsset_opportunityId_idx" ON "SocialOpportunityAsset"("opportunityId");

ALTER TABLE "SocialOpportunityAsset" ADD CONSTRAINT "SocialOpportunityAsset_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "SocialOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

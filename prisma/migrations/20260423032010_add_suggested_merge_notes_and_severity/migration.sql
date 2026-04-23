/*
  Warnings:

  - The `rawPayload` column on the `MergeBriefPacket` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "MergeBriefPacket" ADD COLUMN     "suggestedMergeNotes" JSONB,
DROP COLUMN "rawPayload",
ADD COLUMN     "rawPayload" JSONB;

-- AlterTable
ALTER TABLE "PacketProvenanceEvidence" ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "PacketRiskTag" ADD COLUMN     "severity" TEXT DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "PullRequest" ADD COLUMN     "latencySeconds" INTEGER,
ADD COLUMN     "reviewerIntent" JSONB;

-- CreateTable
CREATE TABLE "PacketLineRisk" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT,

    CONSTRAINT "PacketLineRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "status" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "stripeId" TEXT NOT NULL,
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_stripeId_key" ON "Plan"("stripeId");

-- AddForeignKey
ALTER TABLE "PacketLineRisk" ADD CONSTRAINT "PacketLineRisk_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "MergeBriefPacket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

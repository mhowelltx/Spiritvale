-- Social Psychology Sandbox pivot migration.
-- EventRecord and RelationshipEdge are altered to use experimentId instead of villageId.
-- All existing rows are stale (pre-pivot stone-age village data) and are cleared first.

-- DropForeignKey
ALTER TABLE "CultureState" DROP CONSTRAINT "CultureState_villageId_fkey";

-- DropForeignKey
ALTER TABLE "EventRecord" DROP CONSTRAINT "EventRecord_villageId_fkey";

-- DropForeignKey
ALTER TABLE "Household" DROP CONSTRAINT "Household_villageId_fkey";

-- DropForeignKey
ALTER TABLE "KinshipLink" DROP CONSTRAINT "KinshipLink_fromVillagerId_fkey";

-- DropForeignKey
ALTER TABLE "KinshipLink" DROP CONSTRAINT "KinshipLink_toVillagerId_fkey";

-- DropForeignKey
ALTER TABLE "KinshipLink" DROP CONSTRAINT "KinshipLink_villageId_fkey";

-- DropForeignKey
ALTER TABLE "RelationshipEdge" DROP CONSTRAINT "RelationshipEdge_fromVillagerId_fkey";

-- DropForeignKey
ALTER TABLE "RelationshipEdge" DROP CONSTRAINT "RelationshipEdge_toVillagerId_fkey";

-- DropForeignKey
ALTER TABLE "RelationshipEdge" DROP CONSTRAINT "RelationshipEdge_villageId_fkey";

-- DropForeignKey
ALTER TABLE "ResourceState" DROP CONSTRAINT "ResourceState_villageId_fkey";

-- DropForeignKey
ALTER TABLE "Villager" DROP CONSTRAINT "Villager_householdId_fkey";

-- DropForeignKey
ALTER TABLE "Villager" DROP CONSTRAINT "Villager_villageId_fkey";

-- DropIndex
DROP INDEX "EventRecord_villageId_day_idx";

-- DropIndex
DROP INDEX "RelationshipEdge_fromVillagerId_idx";

-- DropIndex
DROP INDEX "RelationshipEdge_villageId_idx";

-- Clear stale pre-pivot rows so NOT NULL columns can be added cleanly.
TRUNCATE TABLE "EventRecord";
TRUNCATE TABLE "RelationshipEdge";

-- AlterTable
ALTER TABLE "EventRecord" DROP COLUMN "day",
DROP COLUMN "villageId",
ADD COLUMN     "experimentId" TEXT NOT NULL,
ADD COLUMN     "tick" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RelationshipEdge" DROP COLUMN "fromVillagerId",
DROP COLUMN "lastInteractionDay",
DROP COLUMN "toVillagerId",
DROP COLUMN "villageId",
ADD COLUMN     "experimentId" TEXT NOT NULL,
ADD COLUMN     "fromAgentId" TEXT NOT NULL,
ADD COLUMN     "lastInteractionTick" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "toAgentId" TEXT NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'social',
ALTER COLUMN "strength" SET DEFAULT 0.3,
ALTER COLUMN "trust" SET DEFAULT 0.3;

-- DropTable
DROP TABLE "CultureState";

-- DropTable
DROP TABLE "Household";

-- DropTable
DROP TABLE "KinshipLink";

-- DropTable
DROP TABLE "ResourceState";

-- DropTable
DROP TABLE "Village";

-- DropTable
DROP TABLE "Villager";

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "hypothesis" TEXT NOT NULL DEFAULT '',
    "contextType" TEXT NOT NULL DEFAULT 'neutral',
    "status" TEXT NOT NULL DEFAULT 'setup',
    "tick" INTEGER NOT NULL DEFAULT 0,
    "seed" TEXT NOT NULL,
    "personalityDistribution" JSONB NOT NULL,
    "culture" JSONB NOT NULL,
    "scheduledInterventions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialGroup" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "assignmentRule" TEXT NOT NULL DEFAULT 'random',
    "inGroupBias" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "cohesionIndex" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "statusRank" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "SocialGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "groupId" TEXT,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "ageInTicks" INTEGER NOT NULL DEFAULT 0,
    "lifeStage" TEXT NOT NULL DEFAULT 'adult',
    "personality" JSONB NOT NULL,
    "attachmentStyle" TEXT NOT NULL DEFAULT 'secure',
    "needs" JSONB NOT NULL,
    "affect" JSONB NOT NULL,
    "statusScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "motives" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionRecord" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "targetGroupId" TEXT,
    "targetAgentId" TEXT,
    "magnitude" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "durationTicks" INTEGER NOT NULL DEFAULT 1,
    "remainingTicks" INTEGER NOT NULL DEFAULT 0,
    "params" JSONB NOT NULL DEFAULT '{}',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Village_legacy" (
    "id" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL DEFAULT 0,
    "season" TEXT NOT NULL DEFAULT 'spring',
    "population" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Village_legacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Villager_legacy" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "householdId" TEXT,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "ageInDays" INTEGER NOT NULL,
    "lifeStage" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "traits" JSONB NOT NULL,
    "needs" JSONB NOT NULL,
    "emotions" JSONB NOT NULL,
    "motives" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Villager_legacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household_legacy" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Household_legacy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");

-- CreateIndex
CREATE INDEX "SocialGroup_experimentId_idx" ON "SocialGroup"("experimentId");

-- CreateIndex
CREATE INDEX "Agent_experimentId_idx" ON "Agent"("experimentId");

-- CreateIndex
CREATE INDEX "Agent_groupId_idx" ON "Agent"("groupId");

-- CreateIndex
CREATE INDEX "MetricSnapshot_experimentId_tick_idx" ON "MetricSnapshot"("experimentId", "tick");

-- CreateIndex
CREATE INDEX "InterventionRecord_experimentId_tick_idx" ON "InterventionRecord"("experimentId", "tick");

-- CreateIndex
CREATE INDEX "InterventionRecord_experimentId_resolved_idx" ON "InterventionRecord"("experimentId", "resolved");

-- CreateIndex
CREATE INDEX "EventRecord_experimentId_tick_idx" ON "EventRecord"("experimentId", "tick");

-- CreateIndex
CREATE INDEX "RelationshipEdge_experimentId_idx" ON "RelationshipEdge"("experimentId");

-- CreateIndex
CREATE INDEX "RelationshipEdge_fromAgentId_idx" ON "RelationshipEdge"("fromAgentId");

-- CreateIndex
CREATE INDEX "RelationshipEdge_toAgentId_idx" ON "RelationshipEdge"("toAgentId");

-- AddForeignKey
ALTER TABLE "SocialGroup" ADD CONSTRAINT "SocialGroup_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SocialGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipEdge" ADD CONSTRAINT "RelationshipEdge_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipEdge" ADD CONSTRAINT "RelationshipEdge_fromAgentId_fkey" FOREIGN KEY ("fromAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipEdge" ADD CONSTRAINT "RelationshipEdge_toAgentId_fkey" FOREIGN KEY ("toAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionRecord" ADD CONSTRAINT "InterventionRecord_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRecord" ADD CONSTRAINT "EventRecord_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

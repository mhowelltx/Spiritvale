-- CreateTable: Household
CREATE TABLE "Household" (
    "id"        TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Household_villageId_idx" ON "Household"("villageId");

ALTER TABLE "Household"
    ADD CONSTRAINT "Household_villageId_fkey"
    FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Villager — add householdId, needs, emotions
ALTER TABLE "Villager"
    ADD COLUMN "householdId" TEXT,
    ADD COLUMN "needs"       JSONB NOT NULL DEFAULT '{"hunger":0,"safety":0.7,"belonging":0.5,"status":0.5}',
    ADD COLUMN "emotions"    JSONB NOT NULL DEFAULT '{"fear":0.1,"grief":0,"hope":0.5,"anger":0}';

CREATE INDEX "Villager_householdId_idx" ON "Villager"("householdId");

ALTER TABLE "Villager"
    ADD CONSTRAINT "Villager_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: KinshipLink
CREATE TABLE "KinshipLink" (
    "id"             TEXT NOT NULL,
    "villageId"      TEXT NOT NULL,
    "fromVillagerId" TEXT NOT NULL,
    "toVillagerId"   TEXT NOT NULL,
    "kind"           TEXT NOT NULL,
    "certainty"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    CONSTRAINT "KinshipLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KinshipLink_villageId_idx"      ON "KinshipLink"("villageId");
CREATE INDEX "KinshipLink_fromVillagerId_idx" ON "KinshipLink"("fromVillagerId");

ALTER TABLE "KinshipLink"
    ADD CONSTRAINT "KinshipLink_villageId_fkey"
    FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KinshipLink"
    ADD CONSTRAINT "KinshipLink_fromVillagerId_fkey"
    FOREIGN KEY ("fromVillagerId") REFERENCES "Villager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KinshipLink"
    ADD CONSTRAINT "KinshipLink_toVillagerId_fkey"
    FOREIGN KEY ("toVillagerId") REFERENCES "Villager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: RelationshipEdge
CREATE TABLE "RelationshipEdge" (
    "id"             TEXT NOT NULL,
    "villageId"      TEXT NOT NULL,
    "fromVillagerId" TEXT NOT NULL,
    "toVillagerId"   TEXT NOT NULL,
    "type"           TEXT NOT NULL,
    "strength"       DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "trust"          DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    CONSTRAINT "RelationshipEdge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RelationshipEdge_villageId_idx"      ON "RelationshipEdge"("villageId");
CREATE INDEX "RelationshipEdge_fromVillagerId_idx" ON "RelationshipEdge"("fromVillagerId");

ALTER TABLE "RelationshipEdge"
    ADD CONSTRAINT "RelationshipEdge_villageId_fkey"
    FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RelationshipEdge"
    ADD CONSTRAINT "RelationshipEdge_fromVillagerId_fkey"
    FOREIGN KEY ("fromVillagerId") REFERENCES "Villager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RelationshipEdge"
    ADD CONSTRAINT "RelationshipEdge_toVillagerId_fkey"
    FOREIGN KEY ("toVillagerId") REFERENCES "Villager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

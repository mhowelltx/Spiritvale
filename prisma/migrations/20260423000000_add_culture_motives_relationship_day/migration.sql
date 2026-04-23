-- AlterTable: Villager — add motives JSON column
ALTER TABLE "Villager"
    ADD COLUMN "motives" JSONB NOT NULL DEFAULT '[]';

-- AlterTable: RelationshipEdge — add lastInteractionDay
ALTER TABLE "RelationshipEdge"
    ADD COLUMN "lastInteractionDay" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: CultureState
CREATE TABLE "CultureState" (
    "id"                  TEXT NOT NULL,
    "villageId"           TEXT NOT NULL,
    "sharingNorm"         DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "punishmentSeverity"  DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "outsiderTolerance"   DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "prestigeByAge"       DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "prestigeBySkill"     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "ritualIntensity"     DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "spiritualFear"       DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "kinLoyaltyNorm"      DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    CONSTRAINT "CultureState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CultureState_villageId_key" ON "CultureState"("villageId");

ALTER TABLE "CultureState"
    ADD CONSTRAINT "CultureState_villageId_fkey"
    FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

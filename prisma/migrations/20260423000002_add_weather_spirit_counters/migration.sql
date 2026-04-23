-- AlterTable: ResourceState — add stormDaysRemaining and healthBlessingDaysRemaining
ALTER TABLE "ResourceState"
    ADD COLUMN "stormDaysRemaining"          INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "healthBlessingDaysRemaining" INTEGER NOT NULL DEFAULT 0;

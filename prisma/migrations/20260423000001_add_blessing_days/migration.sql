-- AlterTable: ResourceState — add blessingDaysRemaining
ALTER TABLE "ResourceState"
    ADD COLUMN "blessingDaysRemaining" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Villager" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "ageInDays" INTEGER NOT NULL,
    "lifeStage" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "traits" JSONB NOT NULL,

    CONSTRAINT "Villager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Villager_villageId_idx" ON "Villager"("villageId");

-- AddForeignKey
ALTER TABLE "Villager" ADD CONSTRAINT "Villager_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

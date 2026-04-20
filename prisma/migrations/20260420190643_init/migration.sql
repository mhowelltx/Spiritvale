-- CreateTable
CREATE TABLE "Village" (
    "id" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL DEFAULT 0,
    "season" TEXT NOT NULL DEFAULT 'spring',
    "population" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceState" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "food" DOUBLE PRECISION NOT NULL,
    "weatherHarsh" DOUBLE PRECISION NOT NULL,
    "diseaseRisk" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ResourceState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRecord" (
    "id" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Village_day_idx" ON "Village"("day");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceState_villageId_key" ON "ResourceState"("villageId");

-- CreateIndex
CREATE INDEX "EventRecord_villageId_day_idx" ON "EventRecord"("villageId", "day");

-- AddForeignKey
ALTER TABLE "ResourceState" ADD CONSTRAINT "ResourceState_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRecord" ADD CONSTRAINT "EventRecord_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

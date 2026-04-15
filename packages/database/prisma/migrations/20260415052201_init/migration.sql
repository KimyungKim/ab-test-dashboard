-- CreateTable
CREATE TABLE "AbtestManualAnnouncement" (
    "id" TEXT NOT NULL,
    "testKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "text" TEXT,
    "imageUrls" TEXT[],
    "ts" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbtestManualAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbtestManualAnalysisItem" (
    "id" TEXT NOT NULL,
    "testKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "text" TEXT,
    "imageUrls" TEXT[],
    "ts" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbtestManualAnalysisItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbtestManualOutcome" (
    "id" TEXT NOT NULL,
    "testKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "text" TEXT,
    "imageUrls" TEXT[],
    "ts" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbtestManualOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbtestConclusion" (
    "id" TEXT NOT NULL,
    "primaryId" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "decidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbtestConclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbtestProductConfig" (
    "id" TEXT NOT NULL,
    "testKey" TEXT NOT NULL,
    "productTypes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbtestProductConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbtestAnalysisCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbtestAnalysisCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbtestManualAnnouncement_testKey_key" ON "AbtestManualAnnouncement"("testKey");

-- CreateIndex
CREATE INDEX "AbtestManualAnalysisItem_testKey_idx" ON "AbtestManualAnalysisItem"("testKey");

-- CreateIndex
CREATE UNIQUE INDEX "AbtestManualOutcome_testKey_key" ON "AbtestManualOutcome"("testKey");

-- CreateIndex
CREATE UNIQUE INDEX "AbtestConclusion_primaryId_key" ON "AbtestConclusion"("primaryId");

-- CreateIndex
CREATE UNIQUE INDEX "AbtestProductConfig_testKey_key" ON "AbtestProductConfig"("testKey");

-- CreateIndex
CREATE UNIQUE INDEX "AbtestAnalysisCache_cacheKey_key" ON "AbtestAnalysisCache"("cacheKey");

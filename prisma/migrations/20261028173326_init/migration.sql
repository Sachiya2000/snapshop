-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'segmenting', 'imaging', 'writing', 'review', 'published', 'failed');

-- CreateTable
CREATE TABLE "ListingJob" (
    "id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "originalImage" TEXT NOT NULL,
    "cutoutImage" TEXT,
    "studioImages" TEXT[],
    "subjectPhrase" TEXT,
    "listing" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "stepStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingJob_status_idx" ON "ListingJob"("status");

-- Rename instead of drop/recreate, so existing jobs in "review" become "ready".
ALTER TYPE "JobStatus" RENAME VALUE 'review' TO 'ready';
ALTER TYPE "JobStatus" ADD VALUE 'identifying' BEFORE 'segmenting';
ALTER TYPE "JobStatus" ADD VALUE 'reviewing' BEFORE 'ready';

-- AlterTable
ALTER TABLE "ListingJob" ADD COLUMN "coverImage" TEXT,
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "qualityNotes" JSONB;

-- Storefront query: published listings, newest first.
DROP INDEX "ListingJob_status_idx";
CREATE INDEX "ListingJob_status_publishedAt_idx" ON "ListingJob"("status", "publishedAt");

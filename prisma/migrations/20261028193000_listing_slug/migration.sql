-- AlterTable
ALTER TABLE "ListingJob" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ListingJob_slug_key" ON "ListingJob"("slug");

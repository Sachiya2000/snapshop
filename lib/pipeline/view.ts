import type { JobStatus, ListingJob } from "@/lib/generated/prisma/client";
import type { Listing } from "@/lib/meta/listing";
import { storage } from "@/lib/storage";

// What GET /api/listing/:id returns. Safe to send to the browser.
export interface JobView {
  id: string;
  status: JobStatus;
  error: string | null;
  subjectPhrase: string | null;
  images: { original: string; cutout: string | null; studio: string[] };
  listing: Listing | null;
  updatedAt: string;
}

export function toJobView(job: ListingJob): JobView {
  return {
    id: job.id,
    status: job.status,
    error: job.error,
    subjectPhrase: job.subjectPhrase,
    images: {
      original: storage.publicUrl(job.originalImage),
      cutout: job.cutoutImage ? storage.publicUrl(job.cutoutImage) : null,
      studio: job.studioImages.map((key) => storage.publicUrl(key)),
    },
    listing: job.listing as Listing | null,
    updatedAt: job.updatedAt.toISOString(),
  };
}

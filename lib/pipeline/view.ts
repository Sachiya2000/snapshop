import type { JobStatus, ListingJob } from "@/lib/generated/prisma/client";
import { listingSchema, type Listing } from "@/lib/listing-schema";
import { storage } from "@/lib/storage";

// What GET /api/listing/:id returns. Safe to send to the browser.
export interface JobView {
  id: string;
  status: JobStatus;
  error: string | null;
  subjectPhrase: string | null;
  images: { original: string; cutout: string | null; studio: string[] };
  // URL of the storefront photo: the owner's pick, or the best default.
  cover: string;
  listing: Listing | null;
  publishedAt: string | null;
  // Storefront link (/store/<slug>), set on first publish.
  slug: string | null;
  updatedAt: string;
}

// All photos of a job, best storefront candidates first.
function photoKeys(job: ListingJob): string[] {
  return [...job.studioImages, ...(job.cutoutImage ? [job.cutoutImage] : []), job.originalImage];
}

export function coverKey(job: ListingJob): string {
  return job.coverImage ?? photoKeys(job)[0];
}

// Maps a photo URL from the browser back to one of this job's storage keys.
// Returns undefined for anything that isn't this job's photo.
export function photoKeyFromUrl(job: ListingJob, url: string): string | undefined {
  return photoKeys(job).find((key) => storage.publicUrl(key) === url);
}

// Old jobs saved with an earlier listing shape (e.g. bilingual) show no listing.
export function parseListing(job: ListingJob): Listing | null {
  return listingSchema.safeParse(job.listing).data ?? null;
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
    cover: storage.publicUrl(coverKey(job)),
    listing: parseListing(job),
    publishedAt: job.publishedAt?.toISOString() ?? null,
    slug: job.slug,
    updatedAt: job.updatedAt.toISOString(),
  };
}

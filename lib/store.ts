import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import type { ListingJob } from "@/lib/generated/prisma/client";
import type { Listing } from "@/lib/listing-schema";
import { coverKey, parseListing } from "@/lib/pipeline/view";
import { storage } from "@/lib/storage";

// A published listing as the public storefront sees it. Identified by slug,
// never by job id, and contains nothing owner-only (no pipeline state,
// errors or missing-detail hints).
export interface StoreItem {
  slug: string;
  title: string;
  description: string;
  category: Listing["category"];
  priceRange: Listing["priceRange"];
  cover: string;
  photos: string[];
  publishedAt: string;
}

// "Yellow Bananas - Fresh Bunch" -> "yellow-bananas-fresh-bunch-k3x9f2"
export function makeSlug(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
  const suffix = randomBytes(4).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
  return words ? `${words}-${suffix}` : `item-${suffix}`;
}

function toStoreItem(job: ListingJob): StoreItem | null {
  const listing = parseListing(job);
  if (!listing || !job.publishedAt || !job.slug) return null;
  const cover = coverKey(job);
  // Cover first, then the other studio photos. The raw original stays private.
  const photos = [cover, ...job.studioImages.filter((key) => key !== cover)];
  return {
    slug: job.slug,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    priceRange: listing.priceRange,
    cover: storage.publicUrl(cover),
    photos: photos.map((key) => storage.publicUrl(key)),
    publishedAt: job.publishedAt.toISOString(),
  };
}

export async function getPublishedListings(): Promise<StoreItem[]> {
  const jobs = await getDb().listingJob.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
  return jobs.map(toStoreItem).filter((item): item is StoreItem => item !== null);
}

export async function getPublishedListing(slug: string): Promise<StoreItem | null> {
  const job = await getDb().listingJob.findFirst({ where: { slug, status: "published" } });
  return job ? toStoreItem(job) : null;
}

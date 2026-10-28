import { z } from "zod";

// Shared by the server (Muse Spark output, API validation) and the browser
// (edit form). Keep this file free of server-only imports.

export const CATEGORIES = [
  "Clothing & Fashion",
  "Shoes",
  "Bags & Accessories",
  "Jewellery & Watches",
  "Home & Kitchen",
  "Furniture & Decor",
  "Electronics",
  "Mobile Phones & Accessories",
  "Toys & Games",
  "Books & Stationery",
  "Food & Groceries",
  "Sports & Outdoors",
  "Arts, Crafts & Handmade",
  "Garden & Tools",
  "Automotive",
  "Pet Supplies",
  "Other",
] as const;

const priceRange = z
  .object({ currency: z.string().length(3), min: z.number().nonnegative(), max: z.number().nonnegative() })
  .refine((p) => p.max >= p.min, "The highest price must be at least the lowest price");

// English only for now: Muse Spark's Sinhala output had made-up words in
// testing. Sinhala can return as an extra field once it's reliable.
export const listingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(CATEGORIES),
  priceRange,
  // Details a buyer would want that the photo can't show (size, material, ...).
  missingDetails: z.array(z.string()),
});

export type Listing = z.infer<typeof listingSchema>;

// What the owner can change on the review page (PATCH /api/listing/:id).
export const listingEditSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(120),
  description: z.string().trim().min(1, "Add a description").max(2000),
  category: z.enum(CATEGORIES),
  priceRange,
  // URL of the chosen photo, as returned in JobView.images.
  cover: z.string().nullable(),
});

export type ListingEdit = z.infer<typeof listingEditSchema>;

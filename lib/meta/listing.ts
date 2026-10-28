import { z } from "zod";
import { MetaApiError } from "./client";
import { getTextProvider } from "./text-provider";

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

// English only for now: Muse Spark's Sinhala output had made-up words in
// testing. Sinhala can return as an extra field once it's reliable.
export const listingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(CATEGORIES),
  priceRange: z
    .object({ currency: z.string().length(3), min: z.number().nonnegative(), max: z.number().nonnegative() })
    .refine((p) => p.max >= p.min, "priceRange.max must be >= min"),
  // Details a buyer would want that the photo can't show (size, material, ...).
  missingDetails: z.array(z.string()),
});

export type Listing = z.infer<typeof listingSchema>;

// Same shape as listingSchema, written out for strict structured output.
const LISTING_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    category: { type: "string", enum: [...CATEGORIES] },
    priceRange: {
      type: "object",
      properties: { currency: { type: "string" }, min: { type: "number" }, max: { type: "number" } },
      required: ["currency", "min", "max"],
      additionalProperties: false,
    },
    missingDetails: { type: "array", items: { type: "string" } },
  },
  required: ["title", "description", "category", "priceRange", "missingDetails"],
  additionalProperties: false,
};

const INSTRUCTIONS = `You write online-store product listings for small shops in Sri Lanka.
Look only at what the photo shows; never invent brand names, specs or claims you cannot see.
Write in clear, simple English.
Title: under 70 characters, product type first, then key visible attributes.
Description: 2-4 short sentences a buyer would find useful.
Category: pick the closest option from the allowed list.
priceRange: a realistic retail range in the given currency for a small local shop.
missingDetails: up to 4 short items the owner should add (e.g. size, material).`;

export interface GenerateListingInput {
  imageDataUrl: string;
  subjectPhrase?: string;
  ownerNotes?: string;
  currency?: string;
}

export async function generateListing(input: GenerateListingInput): Promise<Listing> {
  const currency = input.currency ?? "LKR";
  const prompt = [
    `Create the listing for the product in this photo. Currency: ${currency}.`,
    input.subjectPhrase && `The product appears to be: ${input.subjectPhrase}.`,
    input.ownerNotes && `Notes from the shop owner: ${input.ownerNotes}`,
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await getTextProvider().generateJson({
    name: "product_listing",
    instructions: INSTRUCTIONS,
    prompt,
    imageDataUrl: input.imageDataUrl,
    schema: LISTING_JSON_SCHEMA,
  });

  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    throw new MetaApiError(`listing failed validation: ${parsed.error.message}`, "generateListing", undefined, undefined, true);
  }
  return parsed.data;
}

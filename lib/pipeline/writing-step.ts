import { toDataUrl } from "@/lib/meta/client";
import { generateListing } from "@/lib/meta/listing";
import { storage } from "@/lib/storage";
import type { StepFn } from "./types";

export const writingStep: StepFn = async (job) => {
  // The original photo has more context (scale, setting) than the cutout.
  const original = await storage.read(job.originalImage);
  const listing = await generateListing({
    imageDataUrl: toDataUrl(original.data, original.mimeType),
    subjectPhrase: job.subjectPhrase ?? undefined,
  });
  return { listing };
};

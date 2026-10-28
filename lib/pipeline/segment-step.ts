import { segmentProduct } from "@/lib/meta/segment";
import { storage } from "@/lib/storage";
import type { StepFn } from "./types";

// Broader fallback if SAM finds nothing for the specific phrase.
const FALLBACK_PHRASE = "product";

export const segmentStep: StepFn = async (job) => {
  const original = await storage.read(job.originalImage);
  const prompts = job.subjectPhrase ? [job.subjectPhrase, FALLBACK_PHRASE] : [FALLBACK_PHRASE];

  for (const prompt of prompts) {
    const result = await segmentProduct(original.data, prompt);
    if (result) {
      const cutoutImage = await storage.save("cutout", result.cutoutPng, "image/png");
      return { cutoutImage };
    }
  }

  // No match: continue without a cutout; the imaging step falls back to the
  // original photo. The quality-check loop (planned) can flag this.
  return { cutoutImage: null };
};

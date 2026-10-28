import { toDataUrl } from "@/lib/meta/client";
import { segmentProduct } from "@/lib/meta/segment";
import { describeSubject } from "@/lib/meta/subject";
import { getDb } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { StepFn } from "./types";

// Broader fallback if SAM finds nothing for the specific phrase.
const FALLBACK_PHRASE = "product";

export const segmentStep: StepFn = async (job) => {
  const original = await storage.read(job.originalImage);

  let phrase = job.subjectPhrase;
  if (!phrase) {
    phrase = await describeSubject(toDataUrl(original.data, original.mimeType));
    // Save now so a retry of this step doesn't pay for it again.
    await getDb().listingJob.update({ where: { id: job.id }, data: { subjectPhrase: phrase } });
  }

  for (const prompt of [phrase, FALLBACK_PHRASE]) {
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

import { toDataUrl } from "@/lib/meta/client";
import { identifyProduct } from "@/lib/meta/identify";
import { storage } from "@/lib/storage";
import type { StepFn } from "./types";

export const identifyStep: StepFn = async (job) => {
  const original = await storage.read(job.originalImage);
  const subjectPhrase = await identifyProduct(toDataUrl(original.data, original.mimeType));
  return { subjectPhrase };
};

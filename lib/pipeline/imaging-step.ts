import { toDataUrl } from "@/lib/meta/client";
import { generateStudioImages } from "@/lib/meta/images";
import { cutoutOnWhite } from "@/lib/meta/segment";
import { storage } from "@/lib/storage";
import type { StepFn } from "./types";

export const imagingStep: StepFn = async (job) => {
  const source = job.cutoutImage
    ? toDataUrl(await cutoutOnWhite((await storage.read(job.cutoutImage)).data), "image/jpeg")
    : await storage.read(job.originalImage).then((img) => toDataUrl(img.data, img.mimeType));

  const images = await generateStudioImages(source, job.subjectPhrase ?? undefined);
  const studioImages = await Promise.all(images.map((img) => storage.save("studio", img.data, img.mimeType)));
  return { studioImages };
};

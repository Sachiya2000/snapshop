import { z } from "zod";
import { MetaApiError } from "./client";
import { getTextProvider } from "./text-provider";

const subjectSchema = z.object({ phrase: z.string().min(1).max(60) });

// SAM 3.1 works best with one short, concrete noun phrase ("red ceramic mug"),
// so we ask Muse Spark to name the product before segmenting.
// https://dev.meta.ai/docs/sam/segmenting
export async function describeSubject(imageDataUrl: string): Promise<string> {
  const raw = await getTextProvider().generateJson({
    name: "product_subject",
    instructions:
      "You name the main product in a shop owner's photo for an image segmentation model. " +
      'Reply with one concrete noun phrase of 1-4 words: colour or material plus the object, e.g. "red ceramic mug". ' +
      "No commands, lists, brand names, or words about position.",
    prompt: "What is the main product in this photo?",
    imageDataUrl,
    schema: {
      type: "object",
      properties: { phrase: { type: "string" } },
      required: ["phrase"],
      additionalProperties: false,
    },
  });

  const parsed = subjectSchema.safeParse(raw);
  if (!parsed.success) {
    throw new MetaApiError("subject phrase failed validation", "describeSubject", undefined, undefined, true);
  }
  return parsed.data.phrase.trim().toLowerCase();
}

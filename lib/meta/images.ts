import { MODELS, TIMEOUTS } from "./config";
import { MetaApiError, callMeta, getMetaClient } from "./client";

const KEEP_PRODUCT =
  "Keep the product exactly as it is: same shape, proportions, colours, materials, labels and printed text. " +
  "Do not add logos, text, hands, or other products.";

const STYLES = [
  "Professional e-commerce photo on a seamless pure white background, soft even studio lighting, subtle shadow under the product, centred, sharp focus.",
  "Premium catalogue photo on a light warm-grey backdrop, soft diffused key light from the left, gentle reflection on the surface, centred.",
  "Lifestyle product photo on a clean wooden tabletop with a softly blurred neutral background, natural window light, the product is the clear focus.",
];

// Response shape of POST /v1/images/edits.
// https://dev.meta.ai/docs/image-generation
interface ImagesResponse {
  data: { b64_json?: string; url?: string }[];
}

export interface StudioImage {
  data: Buffer;
  mimeType: "image/webp";
  style: number;
}

// Generates up to 3 studio-style photos from a product cutout (flattened onto
// white). Throws only if every style fails.
export async function generateStudioImages(cutoutDataUrl: string, subjectPhrase?: string): Promise<StudioImage[]> {
  const subject = subjectPhrase ? `The product is a ${subjectPhrase}. ` : "";

  const results = await Promise.allSettled(
    STYLES.map((style, i) => generateOne(cutoutDataUrl, `${subject}${style} ${KEEP_PRODUCT}`, i)),
  );

  const images = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (images.length === 0) {
    const first = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    throw first?.reason ?? new MetaApiError("no images generated", "generateStudioImages");
  }
  return images;
}

async function generateOne(imageDataUrl: string, prompt: string, style: number): Promise<StudioImage> {
  // JSON body with `images: [{ image_url }]`, as in the Meta edit-image reference.
  const res = await callMeta("muse-image:edit", () =>
    getMetaClient().post<ImagesResponse>("/images/edits", {
      body: {
        model: MODELS.image,
        prompt,
        images: [{ image_url: imageDataUrl }],
        n: 1,
        response_format: "b64_json",
        output_format: "webp",
      },
      timeout: TIMEOUTS.image,
    }),
  );

  const b64 = res.data[0]?.b64_json;
  if (!b64) throw new MetaApiError("response had no b64_json image", "muse-image:edit", undefined, undefined, true);
  return { data: Buffer.from(b64, "base64"), mimeType: "image/webp", style };
}

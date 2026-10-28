import { decodeMaskToRaster, parseImageStream, recordsOfKind, type SegmentationMaskRecord } from "@meta-sam/parser";
import type OpenAI from "openai";
import sharp from "sharp";
import { MODELS, TIMEOUTS } from "./config";
import { MetaApiError, callMeta, getMetaClient, toDataUrl } from "./client";

export interface SegmentResult {
  // Product on a transparent background, cropped to the product with padding.
  cutoutPng: Buffer;
  confidence?: number;
  matches: number;
}

// Segments `phrase` in the image with SAM 3.1 and cuts out the best match.
// Returns null when SAM finds no match, which the docs treat as a normal result.
// https://dev.meta.ai/docs/sam/overview
export async function segmentProduct(image: Buffer, phrase: string): Promise<SegmentResult | null> {
  // Bake EXIF rotation in, so the pixels we send match the ones we cut out.
  const { data: rgb, info } = await sharp(image).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const jpeg = await sharp(rgb, { raw: { width, height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();

  const masks = await runSam(jpeg, phrase);
  if (masks.length === 0) return null;

  const best = pickBest(masks);
  const alpha = await placeMask(best, width, height);

  const crop = paddedCrop(best.bounds, width, height, 0.06);
  const cutoutPng = await sharp(rgb, { raw: { width, height, channels: 3 } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .extract(crop)
    .png()
    .toBuffer();

  return { cutoutPng, confidence: best.confidence, matches: masks.length };
}

// Flattens a transparent cutout onto white with a margin, as input for Muse Image.
export async function cutoutOnWhite(cutoutPng: Buffer): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(cutoutPng).metadata();
  const margin = Math.round(Math.max(width, height) * 0.08);
  return sharp(cutoutPng)
    .flatten({ background: "#ffffff" })
    .extend({ top: margin, bottom: margin, left: margin, right: margin, background: "#ffffff" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function runSam(jpeg: Buffer, phrase: string): Promise<SegmentationMaskRecord[]> {
  return callMeta("sam:segment", async () => {
    const events = await getMetaClient().responses.create(
      {
        model: MODELS.sam,
        // Cast: the SDK types require `detail` on input_image, which the Meta docs don't define.
        input: [
          {
            type: "message",
            role: "user",
            content: [
              { type: "input_text", text: phrase },
              { type: "input_image", image_url: toDataUrl(jpeg, "image/jpeg") },
            ],
          },
        ] as unknown as OpenAI.Responses.ResponseInput,
        metadata: { include_confidence: "true" },
        stream: true,
      },
      { timeout: TIMEOUTS.sam },
    );

    const parsed = parseImageStream(events);
    for await (const _snapshot of parsed) {
      // Drain the stream; we only need the final result.
    }
    const result = await parsed.finalResult;
    if (result.outcome.status !== "completed") {
      const detail = "detail" in result.outcome ? result.outcome.detail : result.outcome.reason;
      throw new MetaApiError(`segmentation incomplete: ${detail ?? "unknown"}`, "sam:segment", undefined, undefined, true);
    }
    return [...recordsOfKind(result.records, "mask")];
  });
}

// Highest confidence wins; without confidence, the largest object wins.
function pickBest(masks: SegmentationMaskRecord[]): SegmentationMaskRecord {
  const area = (m: SegmentationMaskRecord) => (m.bounds.right - m.bounds.left) * (m.bounds.bottom - m.bounds.top);
  return [...masks].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0) || area(b) - area(a))[0];
}

// The mask raster covers the record's bounds (source pixels, half-open).
// Paint it into a full-size 0/255 alpha channel.
async function placeMask(record: SegmentationMaskRecord, width: number, height: number): Promise<Buffer> {
  const { left, top, right, bottom } = record.bounds;
  const boxW = right - left;
  const boxH = bottom - top;

  let raster = Buffer.from(decodeMaskToRaster(record.mask).map((v) => v * 255));
  if (record.mask.width !== boxW || record.mask.height !== boxH) {
    // Not expected per the parser docs, but scale defensively if sizes differ.
    raster = await sharp(raster, { raw: { width: record.mask.width, height: record.mask.height, channels: 1 } })
      .resize(boxW, boxH, { fit: "fill", kernel: "nearest" })
      .raw()
      .toBuffer();
  }

  const alpha = Buffer.alloc(width * height);
  for (let y = 0; y < boxH; y++) {
    const destY = top + y;
    if (destY < 0 || destY >= height) continue;
    for (let x = 0; x < boxW; x++) {
      const destX = left + x;
      if (destX < 0 || destX >= width) continue;
      alpha[destY * width + destX] = raster[y * boxW + x];
    }
  }
  return alpha;
}

function paddedCrop(
  b: { left: number; top: number; right: number; bottom: number },
  width: number,
  height: number,
  pad: number,
) {
  const px = Math.round((b.right - b.left) * pad);
  const py = Math.round((b.bottom - b.top) * pad);
  const left = Math.max(0, b.left - px);
  const top = Math.max(0, b.top - py);
  const right = Math.min(width, b.right + px);
  const bottom = Math.min(height, b.bottom + py);
  return { left, top, width: right - left, height: bottom - top };
}

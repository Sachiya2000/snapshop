import { after } from "next/server";
import sharp from "sharp";
import { getDb } from "@/lib/db";
import { advanceJob } from "@/lib/pipeline/runner";
import { storage } from "@/lib/storage";

// The first pipeline step runs in after() and counts toward this limit.
export const maxDuration = 300;

// The capture page downsizes photos before upload (Vercel caps bodies at 4.5 MB).
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) {
    return Response.json({ error: "Send the photo as multipart field 'photo'." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "The file must be an image." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "The photo is too large (max 4 MB)." }, { status: 413 });
  }

  // Normalise: apply EXIF rotation, cap the size, re-encode as JPEG.
  let normalized: Buffer;
  try {
    normalized = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    return Response.json({ error: "Could not read that image. Try a JPEG or PNG." }, { status: 422 });
  }

  const originalImage = await storage.save("original", normalized, "image/jpeg");
  const job = await getDb().listingJob.create({ data: { originalImage } });

  after(() => advanceJob(job.id));
  return Response.json({ id: job.id }, { status: 201 });
}

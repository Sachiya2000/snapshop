// Checks your MODEL_API_KEY and each Meta model wrapper against a sample photo.
//
//   npm run verify:meta -- path/to/photo.jpg [--steps=models,subject,sam,images,listing]
//
// Outputs go to scripts/output/. The "images" step costs about $0.03 (3 Muse Image calls).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MODELS } from "@/lib/meta/config";
import { MetaApiError, getMetaClient, toDataUrl } from "@/lib/meta/client";
import { generateStudioImages } from "@/lib/meta/images";
import { generateListing } from "@/lib/meta/listing";
import { cutoutOnWhite, segmentProduct } from "@/lib/meta/segment";
import { describeSubject } from "@/lib/meta/subject";

const ALL_STEPS = ["models", "subject", "sam", "images", "listing"] as const;
type Step = (typeof ALL_STEPS)[number];

const OUT_DIR = path.join(process.cwd(), "scripts", "output");

function parseArgs() {
  const args = process.argv.slice(2);
  const imagePath = args.find((a) => !a.startsWith("--"));
  const stepsArg = args.find((a) => a.startsWith("--steps="))?.slice("--steps=".length);
  const steps = stepsArg ? (stepsArg.split(",") as Step[]) : [...ALL_STEPS];
  const unknown = steps.filter((s) => !ALL_STEPS.includes(s));
  if (unknown.length) throw new Error(`Unknown steps: ${unknown.join(", ")}. Use: ${ALL_STEPS.join(",")}`);
  return { imagePath, steps };
}

function describeError(err: unknown): string {
  if (err instanceof MetaApiError) {
    const parts = [err.message, err.status && `status=${err.status}`, err.code && `code=${err.code}`];
    if (err.status === 401) parts.push("→ check MODEL_API_KEY");
    if (err.status === 404) parts.push("→ model not available to your team?");
    return parts.filter(Boolean).join(" ");
  }
  return err instanceof Error ? err.message : String(err);
}

async function main() {
  const { imagePath, steps } = parseArgs();
  if (!process.env.MODEL_API_KEY) throw new Error("MODEL_API_KEY is not set. Add it to .env.local.");
  const needsImage = steps.some((s) => s !== "models");
  if (needsImage && !imagePath) throw new Error("Pass a product photo: npm run verify:meta -- photo.jpg");

  await mkdir(OUT_DIR, { recursive: true });

  // Same normalisation as the upload route.
  const photo = imagePath
    ? await sharp(await readFile(imagePath))
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer()
    : null;
  const photoUrl = photo ? toDataUrl(photo, "image/jpeg") : "";

  let phrase: string | undefined;
  let cutout: Buffer | undefined;
  const results: { step: Step; ok: boolean; ms: number; note: string }[] = [];

  async function run(step: Step, fn: () => Promise<string>) {
    if (!steps.includes(step)) return;
    process.stdout.write(`→ ${step} … `);
    const start = Date.now();
    try {
      const note = await fn();
      results.push({ step, ok: true, ms: Date.now() - start, note });
      console.log(`ok (${Date.now() - start} ms) ${note}`);
    } catch (err) {
      const note = describeError(err);
      results.push({ step, ok: false, ms: Date.now() - start, note });
      console.log(`FAILED (${Date.now() - start} ms) ${note}`);
    }
  }

  await run("models", async () => {
    const ids: string[] = [];
    for await (const model of getMetaClient().models.list()) ids.push(model.id);
    const missing = Object.values(MODELS).filter((m) => !ids.includes(m));
    if (missing.length) throw new Error(`missing models: ${missing.join(", ")} (available: ${ids.join(", ")})`);
    return `found ${Object.values(MODELS).join(", ")}`;
  });

  await run("subject", async () => {
    phrase = await describeSubject(photoUrl);
    return `"${phrase}"`;
  });

  await run("sam", async () => {
    const prompts = phrase ? [phrase, "product"] : ["product"];
    for (const prompt of prompts) {
      const result = await segmentProduct(photo!, prompt);
      if (!result) continue;
      cutout = result.cutoutPng;
      await writeFile(path.join(OUT_DIR, "cutout.png"), cutout);
      const meta = await sharp(cutout).metadata();
      return `prompt="${prompt}" matches=${result.matches} confidence=${result.confidence ?? "n/a"} cutout=${meta.width}x${meta.height} → scripts/output/cutout.png`;
    }
    throw new Error(`no match for ${prompts.map((p) => `"${p}"`).join(" or ")}`);
  });

  await run("images", async () => {
    const source = cutout ? toDataUrl(await cutoutOnWhite(cutout), "image/jpeg") : photoUrl;
    const images = await generateStudioImages(source, phrase);
    await Promise.all(images.map((img) => writeFile(path.join(OUT_DIR, `studio-${img.style + 1}.webp`), img.data)));
    return `${images.length}/3 images${cutout ? "" : " (from original, no cutout)"} → scripts/output/studio-*.webp`;
  });

  await run("listing", async () => {
    const listing = await generateListing({ imageDataUrl: photoUrl, subjectPhrase: phrase });
    await writeFile(path.join(OUT_DIR, "listing.json"), JSON.stringify(listing, null, 2));
    console.log("\n" + JSON.stringify(listing, null, 2));
    return "→ scripts/output/listing.json";
  });

  console.log("\nSummary");
  for (const r of results) console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.step.padEnd(8)} ${String(r.ms).padStart(6)} ms  ${r.note}`);
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(describeError(err));
  process.exitCode = 1;
});

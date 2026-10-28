import { after } from "next/server";
import { getDb } from "@/lib/db";
import { listingEditSchema } from "@/lib/listing-schema";
import { advanceJob, needsAdvance } from "@/lib/pipeline/runner";
import { parseListing, photoKeyFromUrl, toJobView } from "@/lib/pipeline/view";

// Each poll may run one pipeline step in after(), which counts toward this limit.
export const maxDuration = 300;

export async function GET(_request: Request, ctx: RouteContext<"/api/listing/[id]">) {
  const { id } = await ctx.params;
  const job = await getDb().listingJob.findUnique({ where: { id } });
  if (!job) return Response.json({ error: "Not found" }, { status: 404 });

  // Polling drives the pipeline: start the next step if none is running
  // (or the running one has crashed). advanceJob re-checks the lock atomically.
  if (needsAdvance(job)) after(() => advanceJob(id));

  return Response.json(toJobView(job), { headers: { "Cache-Control": "no-store" } });
}

// Saves the owner's edits. Allowed once the draft is ready, and after
// publishing (changes then show on the storefront straight away).
export async function PATCH(request: Request, ctx: RouteContext<"/api/listing/[id]">) {
  const { id } = await ctx.params;
  const db = getDb();
  const job = await db.listingJob.findUnique({ where: { id } });
  if (!job) return Response.json({ error: "Not found" }, { status: 404 });

  if (job.status !== "ready" && job.status !== "published") {
    return Response.json({ error: "This listing isn't ready to edit yet." }, { status: 409 });
  }
  const current = parseListing(job);
  if (!current) {
    return Response.json({ error: "This listing was made with an older version. Create it again." }, { status: 409 });
  }

  const parsed = listingEditSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid listing" }, { status: 400 });
  }
  const { cover, ...edits } = parsed.data;

  let coverImage = job.coverImage;
  if (cover !== null) {
    const key = photoKeyFromUrl(job, cover);
    if (!key) return Response.json({ error: "Unknown photo" }, { status: 400 });
    coverImage = key;
  }

  const updated = await db.listingJob.update({
    where: { id },
    data: { listing: { ...current, ...edits }, coverImage },
  });
  return Response.json(toJobView(updated));
}

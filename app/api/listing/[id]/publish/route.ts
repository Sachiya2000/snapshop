import { getDb } from "@/lib/db";
import { coverKey, parseListing, toJobView } from "@/lib/pipeline/view";
import { makeSlug } from "@/lib/store";

// Publishes the listing to the storefront. Safe to repeat.
export async function POST(_request: Request, ctx: RouteContext<"/api/listing/[id]/publish">) {
  const { id } = await ctx.params;
  const db = getDb();
  const job = await db.listingJob.findUnique({ where: { id } });
  if (!job) return Response.json({ error: "Not found" }, { status: 404 });
  if (job.status === "published") return Response.json(toJobView(job));
  const listing = parseListing(job);
  if (job.status !== "ready" || !listing) {
    return Response.json({ error: "This listing isn't ready to publish yet." }, { status: 409 });
  }

  // Conditional on status, so a concurrent unpublish/publish can't interleave.
  // The slug is kept across unpublish/republish so shared links keep working.
  await db.listingJob.updateMany({
    where: { id, status: "ready" },
    data: {
      status: "published",
      publishedAt: new Date(),
      coverImage: coverKey(job),
      slug: job.slug ?? makeSlug(listing.title),
    },
  });
  return Response.json(toJobView(await db.listingJob.findUniqueOrThrow({ where: { id } })));
}

// Takes the listing off the storefront; it goes back to the editable draft.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/listing/[id]/publish">) {
  const { id } = await ctx.params;
  const db = getDb();
  const result = await db.listingJob.updateMany({
    where: { id, status: "published" },
    data: { status: "ready", publishedAt: null },
  });
  const job = await db.listingJob.findUnique({ where: { id } });
  if (!job) return Response.json({ error: "Not found" }, { status: 404 });
  if (result.count === 0 && job.status !== "ready") {
    return Response.json({ error: "This listing isn't published." }, { status: 409 });
  }
  return Response.json(toJobView(job));
}

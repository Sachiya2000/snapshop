import { after } from "next/server";
import { getDb } from "@/lib/db";
import { advanceJob, needsAdvance } from "@/lib/pipeline/runner";
import { toJobView } from "@/lib/pipeline/view";

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

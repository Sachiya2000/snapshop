import { getDb } from "@/lib/db";
import type { JobStatus, ListingJob } from "@/lib/generated/prisma/client";
import { MetaApiError } from "@/lib/meta/client";
import { imagingStep } from "./imaging-step";
import { segmentStep } from "./segment-step";
import type { StepFn } from "./types";
import { writingStep } from "./writing-step";

// Longer than the slowest step (Vercel maxDuration is 300s), so a live step is
// never taken over; a crashed one is retried by the next poll after this.
const STEP_LOCK_MS = 6 * 60_000;
const MAX_ATTEMPTS = 3;

const STEPS = {
  segmenting: { run: segmentStep, next: "imaging" },
  imaging: { run: imagingStep, next: "writing" },
  writing: { run: writingStep, next: "review" },
} satisfies Record<string, { run: StepFn; next: JobStatus }>;

type StepStatus = keyof typeof STEPS;
const ACTIVE: JobStatus[] = ["queued", "segmenting", "imaging", "writing"];

export function isActive(status: JobStatus): boolean {
  return ACTIVE.includes(status);
}

// True when the job has work left and no live step is running it.
export function needsAdvance(job: ListingJob): boolean {
  if (!isActive(job.status)) return false;
  return !job.stepStartedAt || Date.now() - job.stepStartedAt.getTime() > STEP_LOCK_MS;
}

// Runs at most one step of the job. Safe to call often and concurrently:
// only the caller that claims the step lock does any work.
export async function advanceJob(id: string): Promise<void> {
  const db = getDb();
  await db.listingJob.updateMany({ where: { id, status: "queued" }, data: { status: "segmenting" } });

  const now = new Date();
  const claimed = await db.listingJob.updateMany({
    where: {
      id,
      status: { in: Object.keys(STEPS) as StepStatus[] },
      OR: [{ stepStartedAt: null }, { stepStartedAt: { lt: new Date(now.getTime() - STEP_LOCK_MS) } }],
    },
    data: { stepStartedAt: now, attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return;

  const job = await db.listingJob.findUniqueOrThrow({ where: { id } });
  const status = job.status as StepStatus;
  const step = STEPS[status];
  // Only write if we still hold the lock.
  const ours = { id, status, stepStartedAt: now };

  try {
    const output = await step.run(job);
    await db.listingJob.updateMany({
      where: ours,
      data: { ...output, status: step.next, stepStartedAt: null, attempts: 0, error: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable = !(err instanceof MetaApiError) || err.retryable;
    console.error(`[pipeline] job ${id} step ${status} attempt ${job.attempts} failed:`, message);

    const giveUp = !retryable || job.attempts >= MAX_ATTEMPTS;
    await db.listingJob.updateMany({
      where: ours,
      // On retry, release the lock so the next poll runs the step again.
      data: giveUp ? { status: "failed", stepStartedAt: null, error: message } : { stepStartedAt: null, error: message },
    });
  }
}

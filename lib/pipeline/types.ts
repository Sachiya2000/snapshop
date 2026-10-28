import type { ListingJob, Prisma } from "@/lib/generated/prisma/client";

// A pipeline step reads the job and returns the fields it produced.
export type StepFn = (job: ListingJob) => Promise<Prisma.ListingJobUpdateManyMutationInput>;

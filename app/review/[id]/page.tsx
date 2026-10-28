import { Suspense } from "react";
import { JobProgress } from "./job-progress";

export default function ReviewPage({ params }: PageProps<"/review/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Your listing</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        {params.then(({ id }) => (
          <JobProgress id={id} />
        ))}
      </Suspense>
    </main>
  );
}

import { Suspense } from "react";
import { JobProgress } from "./job-progress";

export default function ReviewPage({ params }: PageProps<"/review/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Your listing</h1>
        <p className="mt-1 text-sm text-muted">The AI does the work. You can edit everything before it goes live.</p>
      </header>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        {params.then(({ id }) => (
          <JobProgress id={id} />
        ))}
      </Suspense>
    </main>
  );
}

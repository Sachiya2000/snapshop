"use client";

import { useEffect, useState } from "react";
import type { JobView } from "@/lib/pipeline/view";

const POLL_MS = 2000;

const STEPS = [
  { status: "segmenting", label: "Finding your product" },
  { status: "imaging", label: "Creating studio photos" },
  { status: "writing", label: "Writing title & description" },
  { status: "review", label: "Ready to review" },
] as const;

const ORDER = ["queued", "segmenting", "imaging", "writing", "review", "published"];

export function JobProgress({ id }: { id: string }) {
  const [job, setJob] = useState<JobView | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/listing/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(res.status === 404 ? "Listing not found" : `HTTP ${res.status}`);
        const next: JobView = await res.json();
        if (cancelled) return;
        setJob(next);
        setFetchError(null);
        if (next.status === "review" || next.status === "published" || next.status === "failed") return;
      } catch (err) {
        if (cancelled) return;
        setFetchError(err instanceof Error ? err.message : "Network error");
      }
      timer = setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (!job) return <p className="text-zinc-500">{fetchError ?? "Loading…"}</p>;

  const current = ORDER.indexOf(job.status);

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-col gap-2">
        {STEPS.map((step) => {
          const index = ORDER.indexOf(step.status);
          const state =
            job.status === "failed" ? "idle" : index < current || job.status === "review" ? "done" : index === current ? "active" : "idle";
          return (
            <li key={step.status} className="flex items-center gap-3">
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm " +
                  (state === "done"
                    ? "bg-emerald-600 text-white"
                    : state === "active"
                      ? "animate-pulse bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800")
                }
              >
                {state === "done" ? "✓" : ""}
              </span>
              <span className={state === "idle" ? "text-zinc-500" : "font-medium"}>{step.label}</span>
            </li>
          );
        })}
      </ol>

      {job.status === "failed" && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Something went wrong: {job.error}
        </p>
      )}
      {job.status !== "failed" && job.error && (
        <p className="text-sm text-amber-600">Retrying after an error…</p>
      )}
      {fetchError && <p className="text-sm text-amber-600">Connection problem, still trying…</p>}

      <div className="grid grid-cols-2 gap-2">
        {/* eslint-disable @next/next/no-img-element -- images come from our own API route */}
        <img src={job.images.original} alt="Original photo" className="aspect-square rounded-lg bg-zinc-100 object-cover" />
        {job.images.cutout && (
          <img
            src={job.images.cutout}
            alt="Product with background removed"
            className="aspect-square rounded-lg bg-[repeating-conic-gradient(#e4e4e7_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] object-contain"
          />
        )}
        {job.images.studio.map((src, i) => (
          <img key={src} src={src} alt={`Studio photo ${i + 1}`} className="aspect-square rounded-lg object-cover" />
        ))}
        {/* eslint-enable @next/next/no-img-element */}
      </div>

      {job.listing && (
        <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold">{job.listing.title.en}</h2>
            <p className="text-zinc-500" lang="si">{job.listing.title.si}</p>
          </div>
          <p className="text-sm">
            {job.listing.category.en} · {job.listing.category.si}
          </p>
          <p className="text-lg font-semibold">
            {job.listing.priceRange.currency} {job.listing.priceRange.min.toLocaleString()} –{" "}
            {job.listing.priceRange.max.toLocaleString()}
          </p>
          <p className="text-sm">{job.listing.description.en}</p>
          <p className="text-sm" lang="si">{job.listing.description.si}</p>
          {job.listing.missingDetails.length > 0 && (
            <p className="text-sm text-zinc-500">Consider adding: {job.listing.missingDetails.join(", ")}</p>
          )}
        </section>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { JobView } from "@/lib/pipeline/view";
import { AlertIcon, CheckIcon, SpinnerIcon } from "../../components/icons";
import { alertError, buttonSecondary, card } from "../../components/ui";
import { ListingEditor } from "./listing-editor";

const POLL_MS = 2000;

const STEPS = [
  { status: "identifying", label: "Identifying your product", hint: "Looking at what's in the photo" },
  { status: "segmenting", label: "Removing the background", hint: "Cutting the product out cleanly" },
  { status: "imaging", label: "Creating studio photos", hint: "Placing it in a professional scene" },
  { status: "writing", label: "Writing title & description", hint: "Plus a category and price suggestion" },
  { status: "ready", label: "Ready to review", hint: "Check it and publish" },
] as const;

const ORDER = ["queued", "identifying", "segmenting", "imaging", "writing", "reviewing", "ready", "published"];

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
        if (next.status === "ready" || next.status === "published" || next.status === "failed") return;
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

  if (!job) {
    return (
      <p className="flex items-center gap-2 text-muted">
        {!fetchError && <SpinnerIcon className="size-4" />}
        {fetchError ?? "Loading…"}
      </p>
    );
  }

  if (job.status === "ready" || job.status === "published") {
    const { listing } = job;
    if (!listing) {
      return <p className="text-muted">This listing was made with an older version of SnapShop. Please create it again.</p>;
    }
    // key: remount (fresh form state) if a different job is loaded.
    return <ListingEditor key={job.id} job={{ ...job, listing }} onUpdate={setJob} />;
  }

  const current = ORDER.indexOf(job.status);
  const failed = job.status === "failed";
  const done = STEPS.filter((step) => ORDER.indexOf(step.status) < current).length;
  const percent = Math.round((done / STEPS.length) * 100);

  return (
    <div className="flex flex-col gap-4">
      <section className={card}>
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold">{failed ? "Stopped" : "Building your listing"}</span>
          {!failed && <span className="font-mono text-muted">{percent}%</span>}
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={"h-full rounded-full transition-all duration-700 " + (failed ? "bg-red-500" : "bg-brand")}
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </div>

        <ol className="flex flex-col">
          {STEPS.map((step, i) => {
            const index = ORDER.indexOf(step.status);
            const state = failed ? "idle" : index < current ? "done" : index === current ? "active" : "idle";
            return (
              <li key={step.status} className="relative flex gap-3 pb-4 last:pb-0">
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={"absolute top-8 bottom-0 left-3.5 w-px " + (state === "done" ? "bg-brand" : "bg-border")}
                  />
                )}
                <span
                  className={
                    "relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition " +
                    (state === "done"
                      ? "bg-brand text-white dark:text-zinc-950"
                      : state === "active"
                        ? "bg-brand-soft text-brand ring-4 ring-brand/15"
                        : "bg-zinc-100 text-muted dark:bg-zinc-800")
                  }
                >
                  {state === "done" ? (
                    <CheckIcon className="size-4" />
                  ) : state === "active" ? (
                    <SpinnerIcon className="size-4" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="flex flex-col pt-0.5">
                  <span className={state === "idle" ? "text-muted" : "font-medium"}>{step.label}</span>
                  {state === "active" && <span className="animate-fade-in text-sm text-muted">{step.hint}…</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {failed && (
        <div className="flex flex-col gap-3">
          <p role="alert" className={alertError}>
            <AlertIcon className="mt-px size-4 shrink-0" />
            Something went wrong: {job.error}
          </p>
          <Link href="/capture" className={buttonSecondary}>
            Try another photo
          </Link>
        </div>
      )}
      {!failed && job.error && <p className="text-sm text-amber-600">Retrying after an error…</p>}
      {fetchError && <p className="text-sm text-amber-600">Connection problem, still trying…</p>}

      <section className="grid grid-cols-2 gap-2">
        {/* eslint-disable @next/next/no-img-element -- images come from our own API route */}
        <Tile label="Original">
          <img src={job.images.original} alt="Original photo" className="size-full animate-fade-in object-cover" />
        </Tile>
        {job.images.cutout ? (
          <Tile label="Cut-out">
            <img
              src={job.images.cutout}
              alt="Product with background removed"
              className="checkerboard size-full animate-fade-in object-contain"
            />
          </Tile>
        ) : (
          !failed && <Placeholder />
        )}
        {job.images.studio.map((src, i) => (
          <Tile key={src} label={`Studio ${i + 1}`}>
            <img src={src} alt={`Studio photo ${i + 1}`} className="size-full animate-fade-in object-cover" />
          </Tile>
        ))}
        {job.images.studio.length === 0 && !failed && (
          <>
            <Placeholder />
            <Placeholder />
          </>
        )}
        {/* eslint-enable @next/next/no-img-element */}
      </section>
    </div>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface">
      {children}
      <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
        {label}
      </figcaption>
    </figure>
  );
}

function Placeholder() {
  return <div aria-hidden="true" className="aspect-square animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />;
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, listingEditSchema, type Listing, type ListingEdit } from "@/lib/listing-schema";
import type { JobView } from "@/lib/pipeline/view";

interface Props {
  job: JobView & { listing: Listing };
  onUpdate: (job: JobView) => void;
}

interface FormState {
  title: string;
  description: string;
  category: Listing["category"];
  min: string;
  max: string;
  cover: string;
}

function fromJob(job: Props["job"]): FormState {
  return {
    title: job.listing.title,
    description: job.listing.description,
    category: job.listing.category,
    min: String(job.listing.priceRange.min),
    max: String(job.listing.priceRange.max),
    cover: job.cover,
  };
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700 focus:border-emerald-600 focus:outline-none";

export function ListingEditor({ job, onUpdate }: Props) {
  const [form, setForm] = useState<FormState>(() => fromJob(job));
  const [saved, setSaved] = useState<FormState>(() => fromJob(job));
  const [busy, setBusy] = useState<null | "save" | "publish" | "unpublish">(null);
  const [error, setError] = useState<string | null>(null);

  const published = job.status === "published";
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const currency = job.listing.priceRange.currency;

  const photos = [
    ...job.images.studio.map((src, i) => ({ src, label: `Studio ${i + 1}` })),
    ...(job.images.cutout ? [{ src: job.images.cutout, label: "Cut-out" }] : []),
    { src: job.images.original, label: "Original" },
  ];

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function toEdit(): ListingEdit | null {
    const parsed = listingEditSchema.safeParse({
      title: form.title,
      description: form.description,
      category: form.category,
      priceRange: { currency, min: Number(form.min), max: Number(form.max) },
      cover: form.cover,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the listing");
      return null;
    }
    return parsed.data;
  }

  async function request(url: string, init: RequestInit): Promise<JobView | null> {
    const res = await fetch(url, init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? `Something went wrong (HTTP ${res.status})`);
      return null;
    }
    return json as JobView;
  }

  async function save(): Promise<boolean> {
    if (!dirty) return true;
    const edit = toEdit();
    if (!edit) return false;
    const updated = await request(`/api/listing/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    if (!updated) return false;
    setSaved(form);
    onUpdate(updated);
    return true;
  }

  async function run(kind: "save" | "publish" | "unpublish") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "save") {
        await save();
      } else if (kind === "publish") {
        // Save pending edits first so the storefront shows what the owner sees.
        if (await save()) {
          const updated = await request(`/api/listing/${job.id}/publish`, { method: "POST" });
          if (updated) onUpdate(updated);
        }
      } else {
        const updated = await request(`/api/listing/${job.id}/publish`, { method: "DELETE" });
        if (updated) onUpdate(updated);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {published && job.slug && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <span className="font-medium">Live in your store</span>
          <Link href={`/store/${job.slug}`} className="font-semibold underline">
            View listing
          </Link>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Main photo</h2>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => {
            const selected = form.cover === photo.src;
            return (
              <button
                key={photo.src}
                type="button"
                onClick={() => set("cover", photo.src)}
                aria-pressed={selected}
                className={
                  "relative overflow-hidden rounded-lg ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 " +
                  (selected ? "ring-3 ring-emerald-600" : "ring-1 ring-zinc-200 dark:ring-zinc-800")
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- images come from our own API route */}
                <img
                  src={photo.src}
                  alt={photo.label}
                  className="aspect-square w-full bg-[repeating-conic-gradient(#e4e4e7_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                  {selected ? "✓ " : ""}
                  {photo.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">Title</span>
        <input className={inputClass} value={form.title} maxLength={120} onChange={(e) => set("title", e.target.value)} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">Description</span>
        <textarea
          className={inputClass}
          rows={5}
          maxLength={2000}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>

      {job.listing.missingDetails.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Buyers may also want to know: {job.listing.missingDetails.join(", ")}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-semibold">Category</span>
        <select
          className={inputClass}
          value={form.category}
          onChange={(e) => set("category", e.target.value as Listing["category"])}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-semibold">Price range ({currency})</legend>
        <div className="flex items-center gap-2">
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            min={0}
            aria-label="Lowest price"
            value={form.min}
            onChange={(e) => set("min", e.target.value)}
          />
          <span className="text-zinc-500">to</span>
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            min={0}
            aria-label="Highest price"
            value={form.max}
            onChange={(e) => set("max", e.target.value)}
          />
        </div>
        <p className="text-sm text-zinc-500">Suggested by AI. Set the price you actually sell at.</p>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-zinc-200 bg-background px-4 py-3 dark:border-zinc-800">
        {published ? (
          <>
            <button
              type="button"
              onClick={() => run("unpublish")}
              disabled={busy !== null}
              className="rounded-xl border border-zinc-300 px-4 py-3 font-medium disabled:opacity-50 dark:border-zinc-700"
            >
              {busy === "unpublish" ? "…" : "Unpublish"}
            </button>
            <button
              type="button"
              onClick={() => run("save")}
              disabled={busy !== null || !dirty}
              className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy === "save" ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => run("save")}
              disabled={busy !== null || !dirty}
              className="rounded-xl border border-zinc-300 px-4 py-3 font-medium disabled:opacity-50 dark:border-zinc-700"
            >
              {busy === "save" ? "Saving…" : dirty ? "Save draft" : "Saved"}
            </button>
            <button
              type="button"
              onClick={() => run("publish")}
              disabled={busy !== null}
              className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy === "publish" ? "Publishing…" : "Publish"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

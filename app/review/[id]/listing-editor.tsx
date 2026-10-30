"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, listingEditSchema, type Listing, type ListingEdit } from "@/lib/listing-schema";
import type { JobView } from "@/lib/pipeline/view";
import { AlertIcon, ArrowRightIcon, CheckIcon, SparklesIcon, SpinnerIcon } from "../../components/icons";
import { alertError, buttonPrimary, buttonSecondary, card, input } from "../../components/ui";

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

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

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
    <div className="flex animate-fade-in flex-col gap-4">
      {published && job.slug ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
          <span className="flex items-center gap-2 font-medium">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
            Live in your store
          </span>
          <Link href={`/store/${job.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
            View listing
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-strong">
          <SparklesIcon className="size-4 shrink-0" />
          Your listing is ready. Check the details, then publish.
        </div>
      )}

      <section className={`${card} flex flex-col gap-3`}>
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
                  "relative overflow-hidden rounded-xl transition " +
                  (selected ? "ring-3 ring-brand" : "opacity-80 ring-1 ring-border hover:opacity-100")
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- images come from our own API route */}
                <img src={photo.src} alt={photo.label} className="checkerboard aspect-square w-full object-cover" />
                {selected && (
                  <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-white shadow dark:text-zinc-950">
                    <CheckIcon className="size-3.5" />
                  </span>
                )}
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur">
                  {photo.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`${card} flex flex-col gap-4`}>
        <Field label="Title" count={form.title.length} max={TITLE_MAX}>
          <input className={input} value={form.title} maxLength={TITLE_MAX} onChange={(e) => set("title", e.target.value)} />
        </Field>

        <Field label="Description" count={form.description.length} max={DESCRIPTION_MAX}>
          <textarea
            className={`${input} resize-y leading-relaxed`}
            rows={6}
            maxLength={DESCRIPTION_MAX}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        {job.listing.missingDetails.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            <p className="mb-2 font-medium">Buyers may also want to know</p>
            <ul className="flex flex-wrap gap-1.5">
              {job.listing.missingDetails.map((detail) => (
                <li key={detail} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs dark:bg-amber-900/60">
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field label="Category">
          <select
            className={input}
            value={form.category}
            onChange={(e) => set("category", e.target.value as Listing["category"])}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <fieldset className={`${card} flex flex-col gap-2`}>
        <legend className="sr-only">Price range ({currency})</legend>
        <span aria-hidden="true" className="text-sm font-semibold">
          Price range
        </span>
        <div className="flex items-center gap-2">
          <PriceInput currency={currency} label="Lowest price" value={form.min} onChange={(v) => set("min", v)} />
          <span className="text-muted">–</span>
          <PriceInput currency={currency} label="Highest price" value={form.max} onChange={(v) => set("max", v)} />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <SparklesIcon className="size-3.5" />
          Suggested by AI. Set the price you actually sell at.
        </p>
      </fieldset>

      {error && (
        <p role="alert" className={alertError}>
          <AlertIcon className="mt-px size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-background/85 px-4 py-3 backdrop-blur-lg">
        {published ? (
          <>
            <button type="button" onClick={() => run("unpublish")} disabled={busy !== null} className={buttonSecondary}>
              {busy === "unpublish" ? <SpinnerIcon className="size-4" /> : "Unpublish"}
            </button>
            <button
              type="button"
              onClick={() => run("save")}
              disabled={busy !== null || !dirty}
              className={`${buttonPrimary} flex-1`}
            >
              {busy === "save" && <SpinnerIcon className="size-4" />}
              {busy === "save" ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => run("save")}
              disabled={busy !== null || !dirty}
              className={buttonSecondary}
            >
              {busy === "save" ? "Saving…" : dirty ? "Save draft" : "Saved"}
            </button>
            <button type="button" onClick={() => run("publish")} disabled={busy !== null} className={`${buttonPrimary} flex-1`}>
              {busy === "publish" ? <SpinnerIcon className="size-4" /> : <CheckIcon className="size-4" />}
              {busy === "publish" ? "Publishing…" : "Publish"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  count,
  max,
  children,
}: {
  label: string;
  count?: number;
  max?: number;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        {max !== undefined && (
          <span className={"font-mono text-xs " + (count! > max * 0.9 ? "text-amber-600" : "text-muted")}>
            {count}/{max}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function PriceInput({
  currency,
  label,
  value,
  onChange,
}: {
  currency: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative flex-1">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-muted">
        {currency}
      </span>
      <input
        className={`${input} pl-13 font-medium tabular-nums`}
        type="number"
        inputMode="decimal"
        min={0}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

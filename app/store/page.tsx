import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getPublishedListings } from "@/lib/store";
import { BagIcon, CameraIcon } from "../components/icons";
import { buttonPrimary } from "../components/ui";
import { formatPrice } from "./format";

export default function StorePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Store</h1>
        <p className="mt-1 text-muted">Fresh products, each listed from a single photo.</p>
      </header>
      <Suspense fallback={<GridSkeleton />}>
        <ProductGrid />
      </Suspense>
    </main>
  );
}

async function ProductGrid() {
  await connection();
  const items = await getPublishedListings();
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <BagIcon className="size-7" />
        </span>
        <div>
          <p className="font-semibold">No products yet</p>
          <p className="mt-1 text-sm text-muted">Add your first one with a single photo.</p>
        </div>
        <Link href="/capture" className={buttonPrimary}>
          <CameraIcon className="size-4.5" />
          Add a product
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item, i) => (
        <li key={item.slug} className="animate-fade-in" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
          <Link
            href={`/store/${item.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm shadow-black/[0.03] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element -- images come from our own API route */}
              <img
                src={item.cover}
                alt={item.title}
                loading="lazy"
                className="size-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <span className="text-xs text-muted">{item.category}</span>
              <span className="line-clamp-2 text-sm leading-snug font-medium">{item.title}</span>
              <span className="mt-auto pt-1 text-sm font-semibold text-brand-strong">{formatPrice(item.priceRange)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function GridSkeleton() {
  return (
    <ul aria-label="Loading products" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="aspect-square animate-pulse bg-zinc-200/70 dark:bg-zinc-800/70" />
          <div className="flex flex-col gap-2 p-3">
            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
            <div className="h-3.5 w-4/5 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
          </div>
        </li>
      ))}
    </ul>
  );
}

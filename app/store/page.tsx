import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getPublishedListings } from "@/lib/store";
import { formatPrice } from "./format";

export default function StorePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Store</h1>
        <Link href="/capture" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
          + Add product
        </Link>
      </header>
      <Suspense fallback={<p className="text-zinc-500">Loading products…</p>}>
        <ProductGrid />
      </Suspense>
    </main>
  );
}

async function ProductGrid() {
  await connection();
  const items = await getPublishedListings();
  if (items.length === 0) {
    return <p className="text-zinc-500">No products yet. Add your first one with a single photo.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <li key={item.slug}>
          <Link href={`/store/${item.slug}`} className="flex flex-col gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- images come from our own API route */}
            <img src={item.cover} alt={item.title} className="aspect-square w-full rounded-xl bg-zinc-100 object-cover" />
            <span className="line-clamp-2 text-sm font-medium">{item.title}</span>
            <span className="text-sm font-semibold">{formatPrice(item.priceRange)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
